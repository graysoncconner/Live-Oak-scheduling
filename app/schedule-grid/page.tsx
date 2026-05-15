import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import type { Grade, Course, Student, StudentAssignment } from '@/lib/types'

export const dynamic = 'force-dynamic'

export default async function ScheduleGridPage({
  searchParams,
}: {
  searchParams: Promise<{ grade?: string }>
}) {
  const { grade: gradeId } = await searchParams

  const [{ data: grades }, { data: courses }, { data: students }, { data: assignments }] =
    await Promise.all([
      supabase.from('grades').select('*').order('sort_order'),
      supabase.from('courses').select('*'),
      supabase.from('students').select('id, first_name, last_name, grade_id, track'),
      supabase.from('student_assignments').select('student_id, course_id, slot_type'),
    ])

  const allGrades = (grades ?? []) as Grade[]
  const selectedGrade = gradeId
    ? allGrades.find(g => g.id === gradeId)
    : allGrades[0]

  if (!selectedGrade) {
    return <p className="text-gray-500">No grades configured.</p>
  }

  const gradeStudents = ((students ?? []) as Student[])
    .filter(s => s.grade_id === selectedGrade.id)
    .sort((a, b) => a.last_name.localeCompare(b.last_name))

  const gradeCourses = ((courses ?? []) as Course[]).filter(c => c.grade_id === selectedGrade.id)

  // Map: studentId -> slotType -> assignment
  type AssignmentRow = { student_id: string; course_id: string; slot_type: string }
  const assignmentMap = new Map<string, Map<string, AssignmentRow>>()
  for (const a of (assignments ?? []) as AssignmentRow[]) {
    if (!assignmentMap.has(a.student_id)) assignmentMap.set(a.student_id, new Map())
    assignmentMap.get(a.student_id)!.set(a.slot_type, a)
  }

  // Enrollment counts per course
  const enrollmentCounts = new Map<string, number>()
  for (const a of assignments ?? []) {
    enrollmentCounts.set(a.course_id, (enrollmentCounts.get(a.course_id) ?? 0) + 1)
  }

  // Course maps by id
  const courseById = new Map<string, Course>()
  for (const c of gradeCourses) courseById.set(c.id, c)

  const slots = [
    { key: 'science', label: 'Science' },
    { key: 'math', label: 'Math' },
    { key: 'elective_tth', label: 'Elective T/Th' },
    { key: 'elective_mwf', label: 'Elective M/W/F' },
  ]

  // Enrollment header counts per slot (sum across all courses in grade for that slot)
  const slotEnrollment = (slotKey: string) => {
    const slotCourses = gradeCourses.filter(c => c.slot_type === slotKey)
    return slotCourses.reduce((sum, c) => sum + (enrollmentCounts.get(c.id) ?? 0), 0)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Schedule Grid</h1>
        <Link
          href={`/students/print-all?grade=${selectedGrade.id}`}
          className="btn-secondary text-sm"
          target="_blank"
        >
          Print All Schedules
        </Link>
      </div>

      {/* Grade tabs */}
      <div className="flex gap-1 border-b border-gray-200">
        {allGrades.map(g => (
          <Link
            key={g.id}
            href={`/schedule-grid?grade=${g.id}`}
            className={`px-4 py-2 text-sm font-medium rounded-t transition-colors ${
              g.id === selectedGrade.id
                ? 'bg-[#2d5a1b] text-white'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            {g.code}
          </Link>
        ))}
      </div>

      {/* Grid table */}
      {gradeStudents.length === 0 ? (
        <p className="text-gray-400 text-sm">No students in this grade.</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-gray-200">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left px-4 py-2 font-semibold text-gray-700">Student</th>
                {slots.map(s => (
                  <th key={s.key} className="text-left px-4 py-2 font-semibold text-gray-700">
                    {s.label}
                    <span className="ml-1 text-xs font-normal text-gray-400">
                      ({slotEnrollment(s.key)})
                    </span>
                  </th>
                ))}
                <th className="text-left px-4 py-2 font-semibold text-gray-700">Track</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {gradeStudents.map(student => {
                const studentAssignments = assignmentMap.get(student.id) ?? new Map()
                const fullyAssigned = studentAssignments.size === 4
                return (
                  <tr
                    key={student.id}
                    className={`hover:bg-gray-50 transition-colors ${fullyAssigned ? 'bg-green-50' : ''}`}
                  >
                    <td className="px-4 py-2">
                      <Link
                        href={`/students/${student.id}`}
                        className="font-medium text-gray-900 hover:text-[#2d5a1b] hover:underline"
                      >
                        {student.last_name}, {student.first_name}
                      </Link>
                    </td>
                    {slots.map(s => {
                      const assignment = studentAssignments.get(s.key)
                      const course = assignment ? courseById.get(assignment.course_id) : null
                      return (
                        <td
                          key={s.key}
                          className={`px-4 py-2 ${!assignment ? 'bg-amber-50' : ''}`}
                        >
                          {course ? (
                            <span className="text-gray-800">{course.name}</span>
                          ) : (
                            <span className="text-amber-600 text-xs">Unassigned</span>
                          )}
                        </td>
                      )
                    })}
                    <td className="px-4 py-2 text-gray-500 capitalize">
                      {student.track ?? <span className="text-gray-300">—</span>}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
