export type StudentTrack = 'honors' | 'mixed' | 'regular'

export interface StudentSchedule {
  student_id: string
  period_1_course_id: string
  period_2_course_id: string
  period_3_course_id: string
  period_4_course_id: string
  period_5_course_id: string
  period_6_course_id: string
  period_7_course_id: string
  period_8_course_id?: string
}

export interface SchedulingResult {
  assigned: StudentSchedule[]
  unassigned: UnassignedStudent[]
}

export interface UnassignedStudent {
  student_id: string
  student_name: string
  reason: string
  failed_course?: string
}

export interface CourseChoice {
  period: number
  course_id: string
}

export interface SectionInfo {
  course_id: string
  period: number
  enrollment: number
  max_capacity: number
}
