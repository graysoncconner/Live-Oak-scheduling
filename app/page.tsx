import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import GenerateScheduleButton from './components/GenerateScheduleButton'

export const dynamic = 'force-dynamic'

export default async function Dashboard() {
  const [{ data: grades }, { data: students }, { data: assignments }, { data: courses }] =
    await Promise.all([
      supabase.from('grades').select('*').order('sort_order'),
      supabase.from('students').select('id, grade_id'),
      supabase.from('student_assignments').select('student_id, slot_type'),
      supabase.from('courses').select('id, grade_id, slot_type, max_capacity'),
    ])

  const gradeStats = (grades ?? []).map(g => {
    const gradeStudents = (students ?? []).filter(s => s.grade_id === g.id)
    const totalSlots = gradeStudents.length * 7
    const filled = (assignments ?? []).filter(a =>
      gradeStudents.some(s => s.id === a.student_id)
    ).length
    return { grade: g, studentCount: gradeStudents.length, filled, totalSlots }
  })

  const unassignedCount = (students ?? []).filter(s =>
    !(assignments ?? []).some(a => a.student_id === s.id)
  ).length

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-500 mt-1">Live Oak Classical School — 2025–26 Schedule</p>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard label="Total Students" value={(students ?? []).length} />
        <StatCard label="Fully Unassigned" value={unassignedCount} warn={unassignedCount > 0} />
        <StatCard label="Total Courses" value={(courses ?? []).length} />
        <StatCard label="Assignments Made" value={(assignments ?? []).length} />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {gradeStats.map(({ grade, studentCount, filled, totalSlots }) => {
          const pct = totalSlots > 0 ? Math.round((filled / totalSlots) * 100) : 0
          return (
            <div key={grade.id} className="bg-white rounded-lg border p-5 space-y-3">
              <div className="flex justify-between items-start">
                <div>
                  <div className="text-xs font-semibold text-[#2d5a1b] uppercase tracking-wide">{grade.code}</div>
                  <div className="font-semibold text-gray-900">{grade.name}</div>
                </div>
                <span className="text-2xl font-bold text-gray-700">{studentCount}</span>
              </div>
              <div>
                <div className="flex justify-between text-xs text-gray-500 mb-1">
                  <span>Assignments</span>
                  <span>{filled} / {totalSlots}</span>
                </div>
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[#2d5a1b] rounded-full transition-all"
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
              <Link
                href={`/students?grade=${grade.code}`}
                className="block text-center text-xs text-[#2d5a1b] hover:underline"
              >
                View {grade.name}s →
              </Link>
              <GenerateScheduleButton gradeId={grade.id} gradeName={grade.name} />
            </div>
          )
        })}
      </div>

      <div className="flex gap-4">
        <Link href="/students/new" className="btn-primary">+ Add Student</Link>
        <Link href="/students" className="btn-secondary">Manage Assignments</Link>
        <Link href="/rosters" className="btn-secondary">View Rosters</Link>
      </div>
    </div>
  )
}

function StatCard({ label, value, warn }: { label: string; value: number; warn?: boolean }) {
  return (
    <div className={`bg-white rounded-lg border p-5 ${warn ? 'border-amber-400' : ''}`}>
      <div className="text-2xl font-bold text-gray-900">{value}</div>
      <div className={`text-sm mt-1 ${warn ? 'text-amber-600' : 'text-gray-500'}`}>{label}</div>
    </div>
  )
}
