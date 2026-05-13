export type StudentTrack = 'honors' | 'mixed' | 'regular'

export interface StudentSchedule {
  student_id: string
  science_course_id: string
  math_course_id: string
  elective_tth_course_id: string
  elective_mwf_course_id: string
}

export interface SchedulingResult {
  assigned: StudentSchedule[]
  unassigned: UnassignedStudent[]
}

export interface UnassignedStudent {
  student_id: string
  student_name: string
  reason: string
  failed_slot?: string
}

export interface CourseChoice {
  slot_type: string
  course_id: string
}

export interface SectionOption {
  course_id: string
  slot_type: string
  current_enrollment: number
  max_capacity: number
}
