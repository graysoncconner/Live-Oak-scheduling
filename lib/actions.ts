'use server'

import { supabase } from './supabase'
import { revalidatePath } from 'next/cache'
import { SlotType } from './types'

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
  revalidatePath('/students')
  revalidatePath(`/students/${id}`)
}

export async function deleteStudent(id: string) {
  const { error } = await supabase.from('students').delete().eq('id', id)
  if (error) throw new Error(error.message)
  revalidatePath('/students')
}

export async function addCourse(data: {
  grade_id: string
  slot_type: SlotType
  name: string
  teacher_name?: string
  max_capacity: number
}) {
  const { error } = await supabase.from('courses').insert(data)
  if (error) throw new Error(error.message)
  revalidatePath('/courses')
}

export async function updateCourse(id: string, data: Partial<{
  name: string
  teacher_name: string
  max_capacity: number
}>) {
  const { error } = await supabase.from('courses').update(data).eq('id', id)
  if (error) throw new Error(error.message)
  revalidatePath('/courses')
  revalidatePath('/students')
  revalidatePath('/rosters')
}

export async function deleteCourse(id: string) {
  const { error } = await supabase.from('courses').delete().eq('id', id)
  if (error) throw new Error(error.message)
  revalidatePath('/courses')
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
