import { supabase } from './supabase'
import { getScheduleTemplate } from './supabase'
import { Student } from './types'
import { StudentTrack, CourseChoice, StudentSchedule, UnassignedStudent, SchedulingResult } from './schedule-types'

export async function categorizeStudentsForGrade(gradeId: string): Promise<void> {
  // Fetch all students in grade
  const { data: students, error } = await supabase
    .from('students')
    .select('*')
    .eq('grade_id', gradeId)

  if (error) throw error
  if (!students || students.length === 0) return

  const total = students.length
  const honorCount = Math.ceil(total * 0.15)
  const mixedCount = Math.ceil(total * 0.05)

  const updates = []

  // Mark honors students
  for (let i = 0; i < honorCount && i < students.length; i++) {
    updates.push({ id: students[i].id, track: 'honors' as StudentTrack })
  }

  // Mark mixed students
  for (let i = honorCount; i < honorCount + mixedCount && i < students.length; i++) {
    updates.push({ id: students[i].id, track: 'mixed' as StudentTrack })
  }

  // Mark regular students
  for (let i = honorCount + mixedCount; i < students.length; i++) {
    updates.push({ id: students[i].id, track: 'regular' as StudentTrack })
  }

  // Batch update students
  for (const update of updates) {
    const { error: updateError } = await supabase
      .from('students')
      .update({ track: update.track })
      .eq('id', update.id)

    if (updateError) throw updateError
  }
}

export async function assignRandomElectives(gradeId: string): Promise<void> {
  // Fetch all students in grade
  const { data: students, error: studentsError } = await supabase
    .from('students')
    .select('*')
    .eq('grade_id', gradeId)

  if (studentsError) throw studentsError
  if (!students || students.length === 0) return

  // Fetch available electives
  const { data: tthElectives, error: tthError } = await supabase
    .from('courses')
    .select('*')
    .eq('grade_id', gradeId)
    .eq('slot_type', 'elective_tth')

  const { data: mwfElectives, error: mwfError } = await supabase
    .from('courses')
    .select('*')
    .eq('grade_id', gradeId)
    .eq('slot_type', 'elective_mwf')

  if (tthError || mwfError) throw tthError || mwfError
  if (!tthElectives || tthElectives.length === 0) throw new Error('No T/Th electives found')
  if (!mwfElectives || mwfElectives.length === 0) throw new Error('No M/W/F electives found')

  // Assign random electives to each student
  for (const student of students) {
    const randomTth = tthElectives[Math.floor(Math.random() * tthElectives.length)]
    const randomMwf = mwfElectives[Math.floor(Math.random() * mwfElectives.length)]

    const { error: updateError } = await supabase
      .from('students')
      .update({
        elective_tth_id: randomTth.id,
        elective_mwf_id: randomMwf.id,
      })
      .eq('id', student.id)

    if (updateError) throw updateError
  }
}

export async function getStudentCourseChoices(
  student: Student,
  gradeId: string
): Promise<CourseChoice[]> {
  const choices: CourseChoice[] = []

  // Fetch all courses for the grade
  const { data: allCourses, error: courseError } = await supabase
    .from('courses')
    .select('*')
    .eq('grade_id', gradeId)

  if (courseError) throw courseError
  if (!allCourses) return []

  // Helper to find course by slot_type and level
  const findCourse = (slotType: string, level?: 'honors' | 'regular' | 'ap') => {
    return allCourses.find(c => {
      if (c.slot_type !== slotType) return false
      if (level === 'honors') return c.name.toLowerCase().includes('honors')
      if (level === 'ap') return c.name.toLowerCase().includes('ap')
      if (level === 'regular') return !c.name.toLowerCase().includes('honors') && !c.name.toLowerCase().includes('ap')
      return true
    })
  }

  // Period 1: History (fixed)
  const history = findCourse('history')
  if (history) choices.push({ period: 1, course_id: history.id })

  // Period 2: Science (track-dependent)
  let science
  if (student.track === 'honors') {
    science = findCourse('science', 'honors') || findCourse('science', 'ap')
  } else {
    science = findCourse('science', 'regular')
  }
  if (science) choices.push({ period: 2, course_id: science.id })

  // Period 3: Literature (fixed)
  const literature = findCourse('literature')
  if (literature) choices.push({ period: 3, course_id: literature.id })

  // Period 4: Rhetoric (fixed)
  const rhetoric = findCourse('rhetoric')
  if (rhetoric) choices.push({ period: 4, course_id: rhetoric.id })

  // Period 5: Math (track-dependent)
  let math
  if (student.track === 'honors') {
    math = findCourse('math', 'honors')
  } else {
    math = findCourse('math', 'regular')
  }
  if (math) choices.push({ period: 5, course_id: math.id })

  // Period 6: Language (fixed)
  const language = findCourse('language')
  if (language) choices.push({ period: 6, course_id: language.id })

  // Period 7: Elective (randomly choose between T/Th and M/W/F)
  const usesTth = Math.random() > 0.5
  const electiveId = usesTth ? student.elective_tth_id : student.elective_mwf_id
  if (electiveId) choices.push({ period: 7, course_id: electiveId })

  return choices
}

export function detectConflict(
  period1: number,
  period2: number,
  scheduleTemplate: any[]
): boolean {
  // Periods 1-7 all conflict with each other (same day, can't be in two places)
  // Period 8 (athletics) doesn't conflict with anything
  if (period1 === 8 || period2 === 8) return false
  return period1 !== period2 // any two different class periods conflict
}

export async function getSectionEnrollment(courseId: string): Promise<number> {
  const { data, error } = await supabase
    .from('student_assignments')
    .select('id')
    .eq('course_id', courseId)

  if (error) throw error
  return data?.length || 0
}

export interface AssignedSection {
  course_id: string
  period: number
}

export function hasConflict(
  assignedSections: AssignedSection[],
  newPeriod: number,
  scheduleTemplate: any[]
): boolean {
  return assignedSections.some(section =>
    detectConflict(section.period, newPeriod, scheduleTemplate)
  )
}

export interface SectionOption {
  course_id: string
  period: number
  current_enrollment: number
  max_capacity: number
}

export async function findAvailableSections(
  courseId: string,
  period: number,
  assignedSections: AssignedSection[],
  scheduleTemplate: any[]
): Promise<SectionOption[]> {
  // Get the course
  const { data: course, error: courseError } = await supabase
    .from('courses')
    .select('*')
    .eq('id', courseId)
    .single()

  if (courseError || !course) return []

  // For simplicity, treat each course as one "section" per period
  // (In a fuller implementation, you might have multiple sections of the same course)
  const enrollment = await getSectionEnrollment(courseId)

  // Check if assigning to this period would create a conflict
  if (hasConflict(assignedSections, period, scheduleTemplate)) {
    return [] // Conflict, can't use this section
  }

  // Check if section is full
  if (enrollment >= course.max_capacity) {
    return [] // Full
  }

  return [
    {
      course_id: courseId,
      period: period,
      current_enrollment: enrollment,
      max_capacity: course.max_capacity,
    },
  ]
}

export async function assignStudentToSchedule(
  student: Student,
  gradeId: string,
  scheduleTemplate: any[]
): Promise<{ schedule: StudentSchedule | null; unassigned: UnassignedStudent[] }> {
  const unassignedReasons: UnassignedStudent[] = []
  const schedule: Partial<StudentSchedule> = { student_id: student.id }
  const assignedSections: AssignedSection[] = []

  try {
    // Get student's course choices
    const choices = await getStudentCourseChoices(student, gradeId)

    // For each course choice, find and assign the best section
    for (const choice of choices) {
      const availableSections = await findAvailableSections(
        choice.course_id,
        choice.period,
        assignedSections,
        scheduleTemplate
      )

      if (availableSections.length === 0) {
        unassignedReasons.push({
          student_id: student.id,
          student_name: `${student.first_name} ${student.last_name}`,
          reason: 'no_available_sections',
          failed_course: choice.course_id,
        })
        continue
      }

      // Pick section with lowest enrollment (greedy balance)
      const bestSection = availableSections.reduce((prev, current) =>
        prev.current_enrollment < current.current_enrollment ? prev : current
      )

      // Assign to this section
      ;(schedule as any)[`period_${choice.period}_course_id`] = bestSection.course_id
      assignedSections.push({ course_id: bestSection.course_id, period: choice.period })

      // Update enrollment in database
      const { error: assignError } = await supabase
        .from('student_assignments')
        .insert({
          student_id: student.id,
          course_id: bestSection.course_id,
          slot_type: 'assignment', // placeholder
        })

      if (assignError) {
        console.error(`Failed to assign ${student.id} to ${bestSection.course_id}:`, assignError)
      }
    }

    // Check if student got all required periods
    const requiredPeriods = [1, 2, 3, 4, 5, 6, 7]
    const missingPeriods = requiredPeriods.filter(
      p => !(schedule as any)[`period_${p}_course_id`]
    )

    if (missingPeriods.length > 0) {
      return { schedule: null, unassigned: unassignedReasons }
    }

    return {
      schedule: schedule as StudentSchedule,
      unassigned: unassignedReasons,
    }
  } catch (error) {
    console.error(`Error assigning schedule for student ${student.id}:`, error)
    return { schedule: null, unassigned: unassignedReasons }
  }
}

export async function generateScheduleForGrade(gradeId: string): Promise<SchedulingResult> {
  const assigned: StudentSchedule[] = []
  const unassigned: UnassignedStudent[] = []

  try {
    // Get schedule template for grade
    const scheduleTemplate = await getScheduleTemplate(gradeId)
    if (scheduleTemplate.length === 0) {
      throw new Error(`No schedule template found for grade ${gradeId}`)
    }

    // Get all students in grade
    const { data: students, error: studentError } = await supabase
      .from('students')
      .select('*')
      .eq('grade_id', gradeId)

    if (studentError || !students) {
      throw new Error('Failed to fetch students')
    }

    // Process each student sequentially
    for (const student of students) {
      const { schedule, unassigned: studentUnassigned } = await assignStudentToSchedule(
        student,
        gradeId,
        scheduleTemplate
      )

      if (schedule) {
        assigned.push(schedule)
      }

      unassigned.push(...studentUnassigned)
    }

    return { assigned, unassigned }
  } catch (error) {
    console.error(`Error generating schedule for grade ${gradeId}:`, error)
    throw error
  }
}

export async function generateTestData(gradeId: string): Promise<SchedulingResult> {
  try {
    // Step 1: Categorize students into tracks
    await categorizeStudentsForGrade(gradeId)

    // Step 2: Assign random electives
    await assignRandomElectives(gradeId)

    // Step 3: Generate schedules
    const result = await generateScheduleForGrade(gradeId)

    return result
  } catch (error) {
    console.error(`Error generating test data for grade ${gradeId}:`, error)
    throw error
  }
}
