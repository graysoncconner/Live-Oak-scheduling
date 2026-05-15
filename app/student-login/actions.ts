'use server'

import { supabase } from '@/lib/supabase'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'

export async function studentLogin(formData: FormData) {
  const firstName = (formData.get('first_name') as string)?.trim()
  const lastName = (formData.get('last_name') as string)?.trim()

  if (!firstName || !lastName) {
    return { error: 'Please enter your first and last name.' }
  }

  const { data: students, error } = await supabase
    .from('students')
    .select('id, first_name, last_name')
    .ilike('first_name', firstName)
    .ilike('last_name', lastName)

  if (error || !students || students.length === 0) {
    return { error: 'No student found with that name. Please check your spelling.' }
  }

  const student = students[0]
  const cookieStore = await cookies()
  cookieStore.set('student_id', student.id, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 7, // 7 days
    path: '/',
  })

  redirect('/portal')
}
