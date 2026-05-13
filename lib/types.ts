export type SlotType = 'science' | 'math' | 'elective_tth' | 'elective_mwf'
export type AllSlotType = SlotType | 'athletics'

export interface Grade {
  id: string
  code: string
  name: string
  has_morning_athletics: boolean
  sort_order: number
}

export interface PeriodTemplate {
  id: string
  grade_id: string
  period_number: number
  start_time: string
  end_time: string
  label: string
  is_choice_slot: boolean
  slot_type: AllSlotType | null
}

export interface Course {
  id: string
  grade_id: string
  slot_type: SlotType
  name: string
  teacher_name: string | null
  max_capacity: number
  created_at: string
  enrollment_count?: number
}

export interface Student {
  id: string
  first_name: string
  last_name: string
  grade_id: string | null
  parents: string | null
  phone: string | null
  address: string | null
  city: string | null
  state: string | null
  zip: string | null
  created_at: string
  grade?: Grade
}

export interface StudentAssignment {
  id: string
  student_id: string
  course_id: string
  slot_type: SlotType
  created_at: string
  course?: Course
}

export const SLOT_LABELS: Record<SlotType, string> = {
  science: 'Science',
  math: 'Math',
  elective_tth: 'Elective (T/Th)',
  elective_mwf: 'Elective (M/W/F)',
}

export const SLOT_TYPES: SlotType[] = ['science', 'math', 'elective_tth', 'elective_mwf']
