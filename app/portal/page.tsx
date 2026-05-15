import { supabase } from '@/lib/supabase'
import { Course, PeriodTemplate, StudentAssignment } from '@/lib/types'
import { cookies } from 'next/headers'
import { notFound, redirect } from 'next/navigation'
import { saveElectivePreferences, studentSignOut } from './actions'

export const dynamic = 'force-dynamic'

export default async function PortalPage() {
  const cookieStore = await cookies()
  const studentId = cookieStore.get('student_id')?.value
  if (!studentId) redirect('/student-login')

  const { data: student } = await supabase
    .from('students')
    .select('*, grade:grades(*)')
    .eq('id', studentId)
    .single()

  if (!student) notFound()

  const [{ data: assignments }, { data: periods }, { data: electiveCourses }] = await Promise.all([
    supabase
      .from('student_assignments')
      .select('*, course:courses(*)')
      .eq('student_id', studentId),
    student.grade_id
      ? supabase
          .from('period_templates')
          .select('*')
          .eq('grade_id', student.grade_id)
          .order('period_number')
      : Promise.resolve({ data: [] }),
    student.grade_id
      ? supabase
          .from('courses')
          .select('*')
          .eq('grade_id', student.grade_id)
          .in('slot_type', ['elective_tth', 'elective_mwf'])
      : Promise.resolve({ data: [] }),
  ])

  const assignmentBySlot = new Map<string, StudentAssignment>()
  for (const a of assignments ?? []) {
    assignmentBySlot.set(a.slot_type, a)
  }

  const tthCourses = (electiveCourses ?? []).filter(
    (c: Course) => c.slot_type === 'elective_tth'
  )
  const mwfCourses = (electiveCourses ?? []).filter(
    (c: Course) => c.slot_type === 'elective_mwf'
  )

  return (
    <div className="space-y-8 max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {student.first_name} {student.last_name}
          </h1>
          <p className="text-gray-500 mt-0.5">
            {student.grade?.code} — {student.grade?.name}
          </p>
        </div>
        <form action={studentSignOut}>
          <button
            type="submit"
            className="text-sm text-gray-400 hover:text-gray-600 transition-colors"
          >
            Sign Out
          </button>
        </form>
      </div>

      {/* My Schedule */}
      <section className="card">
        <div className="px-4 py-3 border-b border-gray-100">
          <h2 className="font-semibold">My Schedule</h2>
        </div>
        <div className="divide-y divide-gray-50">
          {(periods ?? []).map((p: PeriodTemplate) => {
            if (!p.is_choice_slot) {
              return (
                <div key={p.id} className="px-4 py-3 flex items-center gap-4">
                  <span className="w-8 text-xs text-gray-400 font-mono">
                    {p.period_number}
                  </span>
                  <span className="w-24 text-xs text-gray-400">
                    {p.start_time}–{p.end_time}
                  </span>
                  <span className="text-sm text-gray-700">{p.label}</span>
                  <span className="ml-auto badge-gray">Fixed</span>
                </div>
              )
            }

            const assignment = p.slot_type
              ? assignmentBySlot.get(p.slot_type)
              : null

            return (
              <div key={p.id} className="px-4 py-3 flex items-center gap-4">
                <span className="w-8 text-xs text-gray-400 font-mono">
                  {p.period_number}
                </span>
                <span className="w-24 text-xs text-gray-400">
                  {p.start_time}–{p.end_time}
                </span>
                <div className="flex-1">
                  <span className="text-sm text-gray-700">{p.label}</span>
                  {assignment ? (
                    <p className="text-xs text-gray-500 mt-0.5">
                      {assignment.course?.name}
                      {assignment.course?.teacher_name
                        ? ` — ${assignment.course.teacher_name}`
                        : ''}
                    </p>
                  ) : (
                    <p className="text-xs text-amber-600 mt-0.5">
                      Not yet assigned
                    </p>
                  )}
                </div>
              </div>
            )
          })}
          {(periods ?? []).length === 0 && (
            <div className="px-4 py-6 text-center text-sm text-gray-400">
              No schedule template configured yet.
            </div>
          )}
        </div>
      </section>

      {/* Elective Preferences */}
      <section className="card">
        <div className="px-4 py-3 border-b border-gray-100">
          <h2 className="font-semibold">My Elective Preferences</h2>
          <p className="text-xs text-gray-400 mt-0.5">
            Your preferences will be applied when the admin generates the
            schedule.
          </p>
        </div>
        <form action={saveElectivePreferences} className="p-4 space-y-4">
          <div>
            <label htmlFor="elective_tth_id" className="label">
              T/Th Elective
            </label>
            <select
              id="elective_tth_id"
              name="elective_tth_id"
              className="input"
              defaultValue={student.elective_tth_id ?? ''}
            >
              <option value="">— No preference —</option>
              {tthCourses.map((c: Course) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="elective_mwf_id" className="label">
              M/W/F Elective
            </label>
            <select
              id="elective_mwf_id"
              name="elective_mwf_id"
              className="input"
              defaultValue={student.elective_mwf_id ?? ''}
            >
              <option value="">— No preference —</option>
              {mwfCourses.map((c: Course) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <button type="submit" className="btn-primary">
            Save My Preferences
          </button>
        </form>
      </section>
    </div>
  )
}
