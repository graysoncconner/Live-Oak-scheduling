import { supabase } from '@/lib/supabase'
import { SLOT_TYPES, SLOT_LABELS, type SlotType } from '@/lib/types'
import { CourseForm } from './CourseForm'
import { CourseRow } from './CourseRow'

export const dynamic = 'force-dynamic'

export default async function CoursesPage() {
  const [{ data: grades }, { data: courses }, { data: enrollmentRaw }] = await Promise.all([
    supabase.from('grades').select('*').order('sort_order'),
    supabase.from('courses').select('*').order('name'),
    supabase.from('student_assignments').select('course_id'),
  ])

  const enrollmentCounts = new Map<string, number>()
  for (const e of enrollmentRaw ?? []) {
    enrollmentCounts.set(e.course_id, (enrollmentCounts.get(e.course_id) ?? 0) + 1)
  }

  const coursesWithCount = (courses ?? []).map(c => ({
    ...c,
    enrollment_count: enrollmentCounts.get(c.id) ?? 0,
  }))

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold">Courses</h1>

      {(grades ?? []).map(grade => (
        <section key={grade.id} className="space-y-3">
          <h2 className="text-lg font-semibold text-gray-700">
            {grade.code} — {grade.name}
          </h2>

          {SLOT_TYPES.map(slot => {
            const slotCourses = coursesWithCount.filter(
              c => c.grade_id === grade.id && c.slot_type === slot
            )
            return (
              <div key={slot} className="card">
                <div className="px-4 py-2 bg-gray-50 border-b border-gray-100 flex items-center justify-between">
                  <span className="text-sm font-semibold text-gray-600">{SLOT_LABELS[slot]}</span>
                  <span className="text-xs text-gray-400">{slotCourses.length} courses</span>
                </div>
                <div className="divide-y divide-gray-50">
                  {slotCourses.map(c => (
                    <CourseRow key={c.id} course={c} />
                  ))}
                  {slotCourses.length === 0 && (
                    <div className="px-4 py-3 text-sm text-gray-400 italic">No courses yet</div>
                  )}
                </div>
                <div className="px-4 py-3 border-t border-gray-100 bg-gray-50">
                  <CourseForm gradeId={grade.id} slotType={slot as SlotType} />
                </div>
              </div>
            )
          })}
        </section>
      ))}
    </div>
  )
}
