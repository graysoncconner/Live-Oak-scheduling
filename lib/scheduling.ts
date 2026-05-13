import { supabase } from './supabase'
import { Student } from './types'
import { StudentTrack, CourseChoice, StudentSchedule, UnassignedStudent, SchedulingResult, SectionOption } from './schedule-types'

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

  for (const student of students) {
    const tth = tthElectives[Math.floor(Math.random() * tthElectives.length)]
    const mwf = mwfElectives[Math.floor(Math.random() * mwfElectives.length)]

    const { error } = await supabase
      .from('students')
      .update({ elective_tth_id: tth.id, elective_mwf_id: mwf.id })
      .eq('id', student.id)

    if (error) throw error
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

  const findBySlot = (slotType: string, preferHonors = false) => {
    const pool = courses.filter(c => c.slot_type === slotType)
    if (preferHonors) {
      const honors = pool.find(
        c => c.name.toLowerCase().includes('honors') || c.name.toLowerCase().includes('ap')
      )
      if (honors) return honors
    }
    return pool[0] ?? null
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

export async function findAvailableSections(courseId: string): Promise<SectionOption[]> {
  const { data: course, error } = await supabase
    .from('courses')
    .select('*')
    .eq('id', courseId)
    .single()

  if (error || !course) return []

  const enrollment = await getSectionEnrollment(courseId)
  if (enrollment >= course.max_capacity) return []

  return [{ course_id: courseId, slot_type: course.slot_type, current_enrollment: enrollment, max_capacity: course.max_capacity }]
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
