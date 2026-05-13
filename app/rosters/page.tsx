import { supabase } from '@/lib/supabase'
import { SLOT_LABELS, type SlotType } from '@/lib/types'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

export default async function RostersPage() {
  const [{ data: grades }, { data: courses }, { data: assignments }] = await Promise.all([
    supabase.from('grades').select('*').order('sort_order'),
    supabase.from('courses').select('*').order('name'),
    supabase
      .from('student_assignments')
      .select('*, student:students(id, first_name, last_name)')
      .order('slot_type'),
  ])

  const studentsByCourse = new Map<string, Array<{ id: string; first_name: string; last_name: string }>>()
  for (const a of assignments ?? []) {
    if (!studentsByCourse.has(a.course_id)) studentsByCourse.set(a.course_id, [])
    if (a.student) {
      studentsByCourse.get(a.course_id)!.push(a.student as { id: string; first_name: string; last_name: string })
    }
  }

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold">Class Rosters</h1>

      {(grades ?? []).map(grade => {
        const gradeCourses = (courses ?? []).filter(c => c.grade_id === grade.id)
        if (gradeCourses.length === 0) return null
        return (
          <section key={grade.id}>
            <h2 className="text-lg font-semibold text-gray-700 mb-4">
              {grade.code} — {grade.name}
            </h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {gradeCourses.map(c => {
                const enrolled = (studentsByCourse.get(c.id) ?? []).sort((a, b) =>
                  a.last_name.localeCompare(b.last_name)
                )
                const full = enrolled.length >= c.max_capacity
                return (
                  <div key={c.id} className="card">
                    <div className="px-4 py-3 border-b border-gray-100">
                      <div className="font-semibold text-sm">{c.name}</div>
                      <div className="flex items-center justify-between mt-1">
                        <span className="text-xs text-gray-400">{SLOT_LABELS[c.slot_type as SlotType]}</span>
                        <span className={`text-xs font-medium ${full ? 'text-red-600' : 'text-gray-500'}`}>
                          {enrolled.length} / {c.max_capacity}
                          {full ? ' · FULL' : ''}
                        </span>
                      </div>
                      {c.teacher_name && c.teacher_name !== 'TBD' && (
                        <div className="text-xs text-gray-400 mt-1">{c.teacher_name}</div>
                      )}
                    </div>
                    <div className="divide-y divide-gray-50 max-h-60 overflow-y-auto">
                      {enrolled.length === 0 ? (
                        <div className="px-4 py-3 text-sm text-gray-400 italic">No students assigned</div>
                      ) : (
                        enrolled.map((s, i) => (
                          <Link
                            key={s.id}
                            href={`/students/${s.id}`}
                            className="flex items-center gap-3 px-4 py-2 hover:bg-gray-50"
                          >
                            <span className="text-xs text-gray-300 w-5">{i + 1}.</span>
                            <span className="text-sm">{s.last_name}, {s.first_name}</span>
                          </Link>
                        ))
                      )}
                    </div>
                    <div className="px-4 py-2 border-t border-gray-100 bg-gray-50">
                      <a
                        href={`/rosters/${c.id}/roster.pdf`}
                        target="_blank"
                        className="text-xs text-[#2d5a1b] hover:underline"
                      >
                        Export PDF →
                      </a>
                    </div>
                  </div>
                )
              })}
            </div>
          </section>
        )
      })}
    </div>
  )
}
