import { supabase } from '@/lib/supabase'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { SLOT_TYPES, SLOT_LABELS, type SlotType, type Course } from '@/lib/types'
import { AssignmentRow } from './AssignmentRow'
import { EditStudentForm } from './EditStudentForm'

export const dynamic = 'force-dynamic'

export default async function StudentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  const [{ data: student }, { data: grades }] = await Promise.all([
    supabase.from('students').select('*, grade:grades(*)').eq('id', id).single(),
    supabase.from('grades').select('*').order('sort_order'),
  ])

  if (!student) notFound()

  const [{ data: assignments }, { data: courses }, { data: periods }] = await Promise.all([
    supabase
      .from('student_assignments')
      .select('*, course:courses(*)')
      .eq('student_id', id),
    supabase
      .from('courses')
      .select('*')
      .eq('grade_id', student.grade_id),
    supabase
      .from('period_templates')
      .select('*')
      .eq('grade_id', student.grade_id)
      .order('period_number'),
  ])

  // Enrollment counts per course
  const { data: enrollmentRaw } = await supabase
    .from('student_assignments')
    .select('course_id')
  const enrollmentCounts = new Map<string, number>()
  for (const e of enrollmentRaw ?? []) {
    enrollmentCounts.set(e.course_id, (enrollmentCounts.get(e.course_id) ?? 0) + 1)
  }

  type Assignment = NonNullable<typeof assignments>[number]
  const assignmentBySlot = new Map<string, Assignment>()
  for (const a of assignments ?? []) {
    assignmentBySlot.set(a.slot_type, a)
  }

  const coursesBySlot = new Map<SlotType, Course[]>()
  for (const c of courses ?? []) {
    const arr = coursesBySlot.get(c.slot_type as SlotType) ?? []
    arr.push({ ...c, enrollment_count: enrollmentCounts.get(c.id) ?? 0 })
    coursesBySlot.set(c.slot_type as SlotType, arr)
  }

  return (
    <div className="space-y-8 max-w-3xl">
      <div className="flex items-center gap-4">
        <Link href="/students" className="text-gray-400 hover:text-gray-600 text-sm">← Students</Link>
        <h1 className="text-2xl font-bold">{student.last_name}, {student.first_name}</h1>
        <span className="badge-gray">{student.grade?.code} — {student.grade?.name}</span>
      </div>

      {/* Schedule assignments */}
      <section className="card">
        <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
          <h2 className="font-semibold">Schedule Assignments</h2>
          <a
            href={`/students/${id}/schedule.pdf`}
            target="_blank"
            className="btn-secondary text-xs"
          >
            Export PDF
          </a>
        </div>

        {/* Full period view */}
        <div className="divide-y divide-gray-50">
          {(periods ?? []).map(p => {
            if (p.slot_type === 'athletics') {
              return (
                <div key={p.id} className="px-4 py-3 flex items-center gap-4">
                  <span className="w-8 text-xs text-gray-400 font-mono">{p.period_number}</span>
                  <span className="w-28 text-xs text-gray-400">{p.start_time}–{p.end_time}</span>
                  <span className="text-sm text-gray-700">{p.label}</span>
                  <span className="ml-auto badge-green">Fixed</span>
                </div>
              )
            }
            if (!p.is_choice_slot) {
              return (
                <div key={p.id} className="px-4 py-3 flex items-center gap-4">
                  <span className="w-8 text-xs text-gray-400 font-mono">{p.period_number}</span>
                  <span className="w-28 text-xs text-gray-400">{p.start_time}–{p.end_time}</span>
                  <span className="text-sm text-gray-700">{p.label}</span>
                  <span className="ml-auto badge-gray">Fixed</span>
                </div>
              )
            }
            const slotType = p.slot_type as SlotType
            const options = coursesBySlot.get(slotType) ?? []
            const current = assignmentBySlot.get(slotType)
            return (
              <AssignmentRow
                key={p.id}
                studentId={id}
                period={p}
                slotType={slotType}
                slotLabel={SLOT_LABELS[slotType]}
                courses={options}
                currentAssignment={current ?? null}
              />
            )
          })}
        </div>
      </section>

      {/* Student info */}
      <section className="card">
        <div className="px-4 py-3 border-b border-gray-100">
          <h2 className="font-semibold">Student Info</h2>
        </div>
        <EditStudentForm student={student} grades={grades ?? []} />
      </section>
    </div>
  )
}
