'use server'

import { supabase } from '@/lib/supabase'
import { cookies } from 'next/headers'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

export async function saveElectivePreferences(formData: FormData) {
  const cookieStore = await cookies()
  const studentId = cookieStore.get('student_id')?.value
  if (!studentId) redirect('/student-login')

  const electiveTthId = formData.get('elective_tth_id') as string | null
  const electiveMwfId = formData.get('elective_mwf_id') as string | null

  await supabase
    .from('students')
    .update({
      elective_tth_id: electiveTthId || null,
      elective_mwf_id: electiveMwfId || null,
    })
    .eq('id', studentId)

  revalidatePath('/portal')
}

export async function studentSignOut() {
  const cookieStore = await cookies()
  cookieStore.delete('student_id')
  redirect('/student-login')
}
