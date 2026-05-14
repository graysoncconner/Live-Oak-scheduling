import { supabase } from './supabase'
import { Student, SlotType } from './types'
import { StudentTrack, CourseChoice, StudentSchedule, UnassignedStudent, SchedulingResult, SectionOption } from './schedule-types'

function sectionBaseName(name: string): string {
  return name.replace(/\s*\(Section \d+\)\s*$/i, '').trim()
}

export async function categorizeStudentsForGrade(gradeId: string): Promise<void> {
  const { data: students, error } = await supabase
    .from('students')
    .select('id')
    .eq('grade_id', gradeId)

  if (error) throw error
  if (!students || students.length === 0) return

  const total = students.length
  const honorCount = Math.ceil(total * 0.15)
  const mixedCount = Math.ceil(total * 0.05)

  for (let i = 0; i < students.length; i++) {
    let track: StudentTrack
    if (i < honorCount) track = 'honors'
    else if (i < honorCount + mixedCount) track = 'mixed'
    else track = 'regular'

    const { error: updateError } = await supabase
      .from('students')
      .update({ track })
      .eq('id', students[i].id)

    if (updateError) throw updateError
  }
}

// Balanced round-robin assignment prevents all students piling into one elective.
export async function assignRandomElectives(gradeId: string): Promise<void> {
  const { data: students, error: studentsError } = await supabase
    .from('students')
    .select('id')
    .eq('grade_id', gradeId)

  if (studentsError) throw studentsError
  if (!students || students.length === 0) return

  const { data: tthElectives, error: tthError } = await supabase
    .from('courses')
    .select('id')
    .eq('grade_id', gradeId)
    .eq('slot_type', 'elective_tth')

  const { data: mwfElectives, error: mwfError } = await supabase
    .from('courses')
    .select('id')
    .eq('grade_id', gradeId)
    .eq('slot_type', 'elective_mwf')

  if (tthError) throw tthError
  if (mwfError) throw mwfError
  if (!tthElectives || tthElectives.length === 0) throw new Error('No T/Th electives found for this grade')
  if (!mwfElectives || mwfElectives.length === 0) throw new Error('No M/W/F electives found for this grade')

  // Shuffle first so the cycled distribution is random, not front-loaded
  const shuffled = [...students].sort(() => Math.random() - 0.5)

  for (let i = 0; i < shuffled.length; i++) {
    const tth = tthElectives[i % tthElectives.length]
    const mwf = mwfElectives[i % mwfElectives.length]

    const { error } = await supabase
      .from('students')
      .update({ elective_tth_id: tth.id, elective_mwf_id: mwf.id })
      .eq('id', shuffled[i].id)

    if (error) throw error
  }
}

// Before generating a schedule, ensure every course group has enough sections to
// seat all students who need it. Creates additional "(Section N)" rows as needed.
export async function ensureSectionCapacity(gradeId: string): Promise<void> {
  const { data: students } = await supabase
    .from('students')
    .select('id, track, elective_tth_id, elective_mwf_id')
    .eq('grade_id', gradeId)

  if (!students || students.length === 0) return

  const studentCount = students.length
  const honorsMixedCount = students.filter(s => s.track === 'honors' || s.track === 'mixed').length
  const regularCount = studentCount - honorsMixedCount

  const { data: courses } = await supabase
    .from('courses')
    .select('*')
    .eq('grade_id', gradeId)

  if (!courses || courses.length === 0) return

  // Group courses by slot_type + base name (e.g., "science::History" holds all History sections)
  type CourseRow = typeof courses[0]
  const groups = new Map<string, CourseRow[]>()
  for (const c of courses) {
    const key = `${c.slot_type}::${sectionBaseName(c.name)}`
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key)!.push(c)
  }

  const sectionsToCreate: Array<{
    grade_id: string
    slot_type: string
    name: string
    teacher_name: null
    max_capacity: number
  }> = []

  for (const [key, group] of groups) {
    const separatorIdx = key.indexOf('::')
    const slotType = key.slice(0, separatorIdx)
    const base = key.slice(separatorIdx + 2)

    const totalCapacity = group.reduce((sum, c) => sum + c.max_capacity, 0)
    const isHonors = base.toLowerCase().includes('honors') || base.toLowerCase().includes('ap')
    const isElective = slotType === 'elective_tth' || slotType === 'elective_mwf'

    let studentsNeeding: number

    if (isElective) {
      // Count students actually assigned to any course in this section group
      const groupIds = new Set(group.map(c => c.id))
      const field = slotType === 'elective_tth' ? 'elective_tth_id' : 'elective_mwf_id'
      studentsNeeding = students.filter(s => groupIds.has((s as any)[field])).length
      if (studentsNeeding === 0) continue
    } else if (isHonors) {
      studentsNeeding = honorsMixedCount
    } else {
      // Regular core course: if an honors sibling exists, only regular-track students need this
      const hasHonorsSibling = [...groups.keys()].some(k => {
        if (k === key) return false
        const kSlot = k.slice(0, k.indexOf('::'))
        const kBase = k.slice(k.indexOf('::') + 2)
        return kSlot === slotType && (kBase.toLowerCase().includes('honors') || kBase.toLowerCase().includes('ap'))
      })
      studentsNeeding = hasHonorsSibling ? regularCount : studentCount
    }

    if (totalCapacity >= studentsNeeding) continue

    const maxCap = group[0].max_capacity
    const additionalNeeded = Math.ceil((studentsNeeding - totalCapacity) / maxCap)

    for (let i = 0; i < additionalNeeded; i++) {
      sectionsToCreate.push({
        grade_id: gradeId,
        slot_type: slotType,
        name: `${base} (Section ${group.length + i + 1})`,
        teacher_name: null,
        max_capacity: maxCap,
      })
    }
  }

  if (sectionsToCreate.length > 0) {
    const { error } = await supabase.from('courses').insert(sectionsToCreate)
    if (error) console.error('Failed to create additional sections:', error.message)
  }
}

export async function getStudentCourseChoices(
  student: Student,
  gradeId: string
): Promise<CourseChoice[]> {
  const choices: CourseChoice[] = []

  const { data: courses, error } = await supabase
    .from('courses')
    .select('*')
    .eq('grade_id', gradeId)

  if (error) throw error
  if (!courses) return []

  const isHonorsCourse = (name: string) =>
    name.toLowerCase().includes('honors') || name.toLowerCase().includes('ap')

  const findBySlot = (slotType: string, preferHonors = false) => {
    const pool = courses.filter(c => c.slot_type === slotType)
    if (preferHonors) {
      const honors = pool.find(c => isHonorsCourse(c.name))
      if (honors) return honors
    }
    // For non-honors preference, exclude honors/AP courses; fall back to any if none exist
    const regular = pool.filter(c => !isHonorsCourse(c.name))
    return regular[0] ?? pool[0] ?? null
  }

  // Science: honors/mixed → prefer honors course; regular → first available
  const science = findBySlot('science', student.track === 'honors' || student.track === 'mixed')
  if (science) choices.push({ slot_type: 'science', course_id: science.id })

  // Math: honors only → prefer honors course; mixed/regular → first available
  const math = findBySlot('math', student.track === 'honors')
  if (math) choices.push({ slot_type: 'math', course_id: math.id })

  // Electives: use whatever the student already has assigned
  if (student.elective_tth_id) choices.push({ slot_type: 'elective_tth', course_id: student.elective_tth_id })
  if (student.elective_mwf_id) choices.push({ slot_type: 'elective_mwf', course_id: student.elective_mwf_id })

  return choices
}

export async function getSectionEnrollment(courseId: string): Promise<number> {
  const { data, error } = await supabase
    .from('student_assignments')
    .select('id')
    .eq('course_id', courseId)

  if (error) throw error
  return data?.length ?? 0
}

// Returns all available sections for the same course (matched by base name + slot_type),
// with the preferred section listed first, then lowest enrollment.
export async function findAvailableSections(courseId: string): Promise<SectionOption[]> {
  const { data: course, error } = await supabase
    .from('courses')
    .select('*')
    .eq('id', courseId)
    .single()

  if (error || !course) return []

  const base = sectionBaseName(course.name)

  // Fetch sibling sections: same grade + slot_type, name starts with the base name
  const { data: candidates, error: candidatesError } = await supabase
    .from('courses')
    .select('*')
    .eq('grade_id', course.grade_id)
    .eq('slot_type', course.slot_type)
    .ilike('name', `${base}%`)

  if (candidatesError || !candidates) return []

  const options: SectionOption[] = []
  for (const candidate of candidates) {
    // Exact base-name match only ("Art" must not fall through to "Art History")
    if (sectionBaseName(candidate.name) !== base) continue

    const enrollment = await getSectionEnrollment(candidate.id)
    if (enrollment < candidate.max_capacity) {
      options.push({
        course_id: candidate.id,
        slot_type: candidate.slot_type,
        current_enrollment: enrollment,
        max_capacity: candidate.max_capacity,
      })
    }
  }

  // Preferred section first; then sort by lowest enrollment for greedy balance
  return options.sort((a, b) => {
    if (a.course_id === courseId && b.course_id !== courseId) return -1
    if (b.course_id === courseId && a.course_id !== courseId) return 1
    return a.current_enrollment - b.current_enrollment
  })
}

export async function assignStudentToSchedule(
  student: Student,
  gradeId: string
): Promise<{ schedule: StudentSchedule | null; unassigned: UnassignedStudent[] }> {
  const unassigned: UnassignedStudent[] = []
  const schedule: Partial<StudentSchedule> = { student_id: student.id }

  const slotToField: Record<string, keyof StudentSchedule> = {
    science: 'science_course_id',
    math: 'math_course_id',
    elective_tth: 'elective_tth_course_id',
    elective_mwf: 'elective_mwf_course_id',
  }

  try {
    const choices = await getStudentCourseChoices(student, gradeId)

    for (const choice of choices) {
      const sections = await findAvailableSections(choice.course_id)

      if (sections.length === 0) {
        unassigned.push({
          student_id: student.id,
          student_name: `${student.first_name} ${student.last_name}`,
          reason: 'section_full',
          failed_slot: choice.slot_type,
        })
        continue
      }

      // Pick lowest-enrollment section (greedy balance)
      const best = sections.reduce((a, b) => a.current_enrollment < b.current_enrollment ? a : b)

      const field = slotToField[choice.slot_type]
      if (field) (schedule as any)[field] = best.course_id

      // Upsert so re-running doesn't create duplicates
      const { error } = await supabase
        .from('student_assignments')
        .upsert(
          { student_id: student.id, course_id: best.course_id, slot_type: choice.slot_type },
          { onConflict: 'student_id,slot_type' }
        )

      if (error) console.error(`Failed to assign ${student.id} → ${choice.slot_type}:`, error.message)
    }

    const requiredSlots = ['science', 'math', 'elective_tth', 'elective_mwf']
    const missing = requiredSlots.filter(s => !(schedule as any)[slotToField[s]])

    if (missing.length > 0) return { schedule: null, unassigned }

    return { schedule: schedule as StudentSchedule, unassigned }
  } catch (error) {
    console.error(`Error scheduling student ${student.id}:`, error)
    return { schedule: null, unassigned }
  }
}

export async function generateScheduleForGrade(gradeId: string): Promise<SchedulingResult> {
  // Ensure sufficient sections exist before assigning anyone
  await ensureSectionCapacity(gradeId)

  const assigned: StudentSchedule[] = []
  const unassigned: UnassignedStudent[] = []

  const { data: students, error } = await supabase
    .from('students')
    .select('*')
    .eq('grade_id', gradeId)

  if (error || !students) throw new Error('Failed to fetch students')

  for (const student of students) {
    const { schedule, unassigned: studentUnassigned } = await assignStudentToSchedule(student, gradeId)
    if (schedule) assigned.push(schedule)
    unassigned.push(...studentUnassigned)
  }

  return { assigned, unassigned }
}

export async function generateTestData(gradeId: string): Promise<SchedulingResult> {
  await categorizeStudentsForGrade(gradeId)
  await assignRandomElectives(gradeId)
  return generateScheduleForGrade(gradeId)
}
