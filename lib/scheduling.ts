import { supabase } from './supabase'
import { Student } from './types'
import { StudentTrack } from './schedule-types'

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
