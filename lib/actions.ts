'use server'

import { supabase } from './supabase'
import { revalidatePath } from 'next/cache'
import { SlotType } from './types'
import { generateTestData } from './scheduling'
import { SchedulingResult } from './schedule-types'

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
