'use server'

import { supabase } from './supabase'
import { createSupabaseServerClient } from './supabase-auth'
import { revalidatePath } from 'next/cache'
import { SlotType } from './types'
import { generateTestData } from './scheduling'
import { SchedulingResult } from './schedule-types'

async function requireAdminUser() {
  const client = await createSupabaseServerClient()
  const { data: { user } } = await client.auth.getUser()
  if (!user) throw new Error('Unauthorized')
}

export async function assignStudentToCourse(
  studentId: string,
  courseId: string,
  slotType: SlotType
) {
  const { error } = await supabase
    .from('student_assignments')
    .upsert({ student_id: studentId, course_id: courseId, slot_type: slotType },
             { onConflict: 'student_id,slot_type' })
  if (error) throw new Error(error.message)
  revalidatePath('/students')
  revalidatePath(`/students/${studentId}`)
  revalidatePath('/rosters')
}

export async function removeAssignment(studentId: string, slotType: SlotType) {
  const { error } = await supabase
    .from('student_assignments')
    .delete()
    .eq('student_id', studentId)
    .eq('slot_type', slotType)
  if (error) throw new Error(error.message)
  revalidatePath('/students')
  revalidatePath(`/students/${studentId}`)
  revalidatePath('/rosters')
}

export async function addStudent(data: {
  first_name: string
  last_name: string
  grade_id: string
  parents?: string
  phone?: string
  address?: string
  city?: string
  state?: string
  zip?: string
}) {
  const { error } = await supabase.from('students').insert(data)
  if (error) throw new Error(error.message)
  revalidatePath('/')
  revalidatePath('/students')
}

export async function updateStudent(id: string, data: Partial<{
  first_name: string
  last_name: string
  grade_id: string
  parents: string
  phone: string
  address: string
  city: string
  state: string
  zip: string
}>) {
  const { error } = await supabase.from('students').update(data).eq('id', id)
  if (error) throw new Error(error.message)
  revalidatePath('/')
  revalidatePath('/students')
  revalidatePath(`/students/${id}`)
}

export async function deleteStudent(id: string) {
  const { error } = await supabase.from('students').delete().eq('id', id)
  if (error) throw new Error(error.message)
  revalidatePath('/')
  revalidatePath('/students')
  revalidatePath('/courses')
  revalidatePath('/rosters')
}

export async function addCourse(data: {
  grade_id: string
  slot_type: SlotType
  name: string
  teacher_name?: string | null
  max_capacity: number
}) {
  const payload = { ...data, teacher_name: data.teacher_name || null }
  const { error } = await supabase.from('courses').insert(payload)
  if (error) throw new Error(error.message)
  revalidatePath('/courses')
  revalidatePath('/students')
  revalidatePath('/rosters')
}

export async function updateCourse(id: string, data: Partial<{
  name: string
  teacher_name: string | null
  max_capacity: number
}>) {
  const payload = { ...data, teacher_name: data.teacher_name || null }
  const { error } = await supabase.from('courses').update(payload).eq('id', id)
  if (error) throw new Error(error.message)
  revalidatePath('/courses')
  revalidatePath('/students')
  revalidatePath('/rosters')
}

export async function deleteCourse(id: string) {
  const { error } = await supabase.from('courses').delete().eq('id', id)
  if (error) throw new Error(error.message)
  revalidatePath('/')
  revalidatePath('/courses')
  revalidatePath('/students')
  revalidatePath('/rosters')
}

export async function updatePeriodTemplate(id: string, data: Partial<{
  label: string
  start_time: string
  end_time: string
}>) {
  const { error } = await supabase.from('period_templates').update(data).eq('id', id)
  if (error) throw new Error(error.message)
  revalidatePath('/schedule-template')
}

export async function generateTestDataAction(gradeId: string): Promise<SchedulingResult> {
  try {
    const result = await generateTestData(gradeId)
    revalidatePath('/')
    revalidatePath('/students')
    revalidatePath('/rosters')
    revalidatePath('/courses')
    return result
  } catch (error) {
    console.error('Server action error:', error)
    throw new Error(`Failed to generate test data: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

export async function generateScheduleAction(gradeId: string): Promise<SchedulingResult> {
  try {
    const { generateScheduleForGrade } = await import('./scheduling')
    const result = await generateScheduleForGrade(gradeId)
    revalidatePath('/')
    revalidatePath('/students')
    revalidatePath('/rosters')
    revalidatePath('/courses')
    return result
  } catch (error) {
    console.error('Server action error:', error)
    throw new Error(`Failed to generate schedule: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

export async function clearGradeSchedule(gradeId: string) {
  await requireAdminUser()
  const { data: students } = await supabase.from('students').select('id').eq('grade_id', gradeId)
  if (!students || students.length === 0) return

  const studentIds = students.map(s => s.id)
  const { error } = await supabase
    .from('student_assignments')
    .delete()
    .in('student_id', studentIds)

  if (error) throw new Error(error.message)
  revalidatePath('/')
  revalidatePath('/students')
  revalidatePath('/rosters')
}

export async function saveStudentPreferences(
  studentId: string,
  data: {
    track?: 'honors' | 'mixed' | 'regular' | null
    elective_tth_id?: string | null
    elective_mwf_id?: string | null
  }
) {
  await requireAdminUser()
  const { error } = await supabase.from('students').update(data).eq('id', studentId)
  if (error) throw new Error(error.message)
  revalidatePath(`/students/${studentId}`)
  revalidatePath('/')
}

export async function importStudents(
  rows: Array<{
    first_name: string
    last_name: string
    grade_code: string
    parents?: string
    phone?: string
  }>
): Promise<{ imported: number; failed: number; errors: string[] }> {
  await requireAdminUser()
  const { data: grades } = await supabase.from('grades').select('id, code')
  const gradeMap = new Map<string, string>()
  for (const g of grades ?? []) {
    gradeMap.set(g.code.toUpperCase(), g.id)
  }

  let imported = 0
  let failed = 0
  const errors: string[] = []

  for (const row of rows) {
    const gradeId = gradeMap.get(row.grade_code.toUpperCase())
    if (!gradeId) {
      errors.push(`Row for ${row.first_name} ${row.last_name}: unknown grade code "${row.grade_code}"`)
      failed++
      continue
    }
    const { error } = await supabase.from('students').insert({
      first_name: row.first_name.trim(),
      last_name: row.last_name.trim(),
      grade_id: gradeId,
      parents: row.parents?.trim() || null,
      phone: row.phone?.trim() || null,
    })
    if (error) {
      errors.push(`Row for ${row.first_name} ${row.last_name}: ${error.message}`)
      failed++
    } else {
      imported++
    }
  }

  revalidatePath('/')
  revalidatePath('/students')
  return { imported, failed, errors }
}

export async function updateSetting(key: string, value: string) {
  await requireAdminUser()
  const { error } = await supabase
    .from('settings')
    .upsert({ key, value }, { onConflict: 'key' })
  if (error) throw new Error(error.message)
  revalidatePath('/')
}

export async function updateStudentNotes(studentId: string, notes: string) {
  await requireAdminUser()
  const { error } = await supabase.from('students').update({ notes }).eq('id', studentId)
  if (error) throw new Error(error.message)
  revalidatePath(`/students/${studentId}`)
  revalidatePath('/')
}
