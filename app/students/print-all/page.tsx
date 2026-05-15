import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import type { Grade, PeriodTemplate } from '@/lib/types'
import { PrintButton } from './PrintButton'

export const dynamic = 'force-dynamic'

export default async function PrintAllPage({
  searchParams,
}: {
  searchParams: Promise<{ grade?: string }>
}) {
  const { grade: gradeId } = await searchParams

  if (!gradeId) {
    return (
      <div className="p-8 space-y-2">
        <p className="text-gray-500">
          No grade selected.{' '}
          <Link href="/schedule-grid" className="text-[#2d5a1b] underline">
            Go to Schedule Grid
          </Link>{' '}
          to select a grade.
        </p>
      </div>
    )
  }

  const [{ data: grade }, { data: students }, { data: periods }] = await Promise.all([
    supabase.from('grades').select('*').eq('id', gradeId).single(),
    supabase
      .from('students')
      .select('id, first_name, last_name')
      .eq('grade_id', gradeId)
      .order('last_name'),
    supabase
      .from('period_templates')
      .select('*')
      .eq('grade_id', gradeId)
      .order('period_number'),
  ])

  if (!grade || !students || students.length === 0) {
    return <p className="text-gray-500 p-8">No students found for this grade.</p>
  }

  const studentIds = students.map((s) => s.id)
  const { data: assignments } = await supabase
    .from('student_assignments')
    .select('student_id, slot_type, course:courses(id, name, teacher_name)')
    .in('student_id', studentIds)

  type CourseRow = { id: string; name: string; teacher_name: string | null }
  type AssignmentWithCourse = {
    student_id: string
    slot_type: string
    course: CourseRow[] | CourseRow | null
  }

  const assignmentsByStudent = new Map<string, Map<string, AssignmentWithCourse>>()
  for (const a of (assignments ?? []) as unknown as AssignmentWithCourse[]) {
    if (!assignmentsByStudent.has(a.student_id)) {
      assignmentsByStudent.set(a.student_id, new Map())
    }
    assignmentsByStudent.get(a.student_id)!.set(a.slot_type, a)
  }

  const allPeriods = (periods ?? []) as PeriodTemplate[]

  return (
    <div>
      {/* Screen-only header */}
      <div className="print:hidden p-6 flex items-center gap-4 border-b">
        <Link
          href={`/schedule-grid?grade=${gradeId}`}
          className="text-gray-400 hover:text-gray-600 text-sm"
        >
          ← Schedule Grid
        </Link>
        <h1 className="text-xl font-bold">
          {(grade as Grade).code} — {(grade as Grade).name} Schedules
        </h1>
        <span className="text-gray-500 text-sm">({students.length} students)</span>
        <PrintButton />
      </div>

      {/* Student schedule cards */}
      <div>
        {students.map((student, idx) => {
          const studentAssignments = assignmentsByStudent.get(student.id) ?? new Map()
          return (
            <div
              key={student.id}
              className={`p-8 ${idx < students.length - 1 ? 'print:break-after-page' : ''}`}
              style={idx < students.length - 1 ? { pageBreakAfter: 'always' } : undefined}
            >
              <div className="max-w-2xl mx-auto space-y-4">
                <div className="border-b pb-3">
                  <h2 className="text-2xl font-bold">
                    {student.last_name}, {student.first_name}
                  </h2>
                  <p className="text-gray-500">
                    {(grade as Grade).code} — {(grade as Grade).name}
                  </p>
                </div>
                <table className="w-full text-sm border-collapse">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2 pr-4 text-gray-500 font-normal w-8">#</th>
                      <th className="text-left py-2 pr-4 text-gray-500 font-normal">Time</th>
                      <th className="text-left py-2 pr-4 text-gray-500 font-normal">Period</th>
                      <th className="text-left py-2 text-gray-500 font-normal">Course</th>
                    </tr>
                  </thead>
                  <tbody>
                    {allPeriods.map((p) => {
                      const assignment =
                        p.slot_type && p.is_choice_slot
                          ? studentAssignments.get(p.slot_type)
                          : null
                      return (
                        <tr key={p.id} className="border-b border-gray-100">
                          <td className="py-2 pr-4 text-gray-400 font-mono text-xs">
                            {p.period_number}
                          </td>
                          <td className="py-2 pr-4 text-gray-500 text-xs">
                            {p.start_time}–{p.end_time}
                          </td>
                          <td className="py-2 pr-4">{p.label}</td>
                          <td className="py-2">
                            {assignment?.course ? (() => {
                              const c = Array.isArray(assignment.course) ? assignment.course[0] : assignment.course
                              return c ? (
                                <span>
                                  {c.name}
                                  {c.teacher_name ? ` (${c.teacher_name})` : ''}
                                </span>
                              ) : null
                            })() : p.is_choice_slot ? (
                              <span className="text-gray-400 italic">Not assigned</span>
                            ) : null}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
