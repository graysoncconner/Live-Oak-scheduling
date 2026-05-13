import { createClient } from '@supabase/supabase-js'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(url, key)

export async function getScheduleTemplate(gradeId: string) {
  const { data, error } = await supabase
    .from('period_templates')
    .select('*')
    .eq('grade_id', gradeId)
    .order('period_number')

  if (error) throw error
  return data || []
}

export async function getCoursesBySlotType(gradeId: string, slotType: string) {
  const { data, error } = await supabase
    .from('courses')
    .select('*')
    .eq('grade_id', gradeId)
    .eq('slot_type', slotType)

  if (error) throw error
  return data || []
}
