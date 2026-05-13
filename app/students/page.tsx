import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import { SLOT_TYPES, SLOT_LABELS } from '@/lib/types'

export const dynamic = 'force-dynamic'

export default async function StudentsPage({
  searchParams,
}: {
  searchParams: Promise<{ grade?: string; q?: string }>
}) {
  const { grade: gradeFilter, q: query } = await searchParams

  const [{ data: grades }, { data: students }, { data: assignments }] = await Promise.all([
    supabase.from('grades').select('*').order('sort_order'),
    supabase.from('students').select('*, grade:grades(*)').order('last_name').order('first_name'),
    supabase.from('student_assignments').select('student_id, slot_type'),
  ])

  const filtered = (students ?? []).filter(s => {
    const matchGrade = gradeFilter ? s.grade?.code === gradeFilter : true
    const matchQuery = query
      ? `${s.first_name} ${s.last_name}`.toLowerCase().includes(query.toLowerCase())
      : true
    return matchGrade && matchQuery
  })

  const assignmentMap = new Map<string, Set<string>>()
  for (const a of assignments ?? []) {
    if (!assignmentMap.has(a.student_id)) assignmentMap.set(a.student_id, new Set())
    assignmentMap.get(a.student_id)!.add(a.slot_type)
  }

  const grouped = (grades ?? []).map(g => ({
    grade: g,
    students: filtered.filter(s => s.grade_id === g.id),
  }))

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Students</h1>
        <Link href="/students/new" className="btn-primary">+ Add Student</Link>
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <form className="flex gap-2">
          <input
            name="q"
            defaultValue={query}
            placeholder="Search name..."
            className="input w-56"
          />
          <input type="hidden" name="grade" value={gradeFilter ?? ''} />
          <button type="submit" className="btn-secondary">Search</button>
        </form>
        <div className="flex gap-2">
          <Link href="/students" className={`btn-secondary ${!gradeFilter ? 'ring-2 ring-[#2d5a1b]' : ''}`}>All</Link>
          {(grades ?? []).map(g => (
            <Link
              key={g.id}
              href={`/students?grade=${g.code}${query ? `&q=${query}` : ''}`}
              className={`btn-secondary ${gradeFilter === g.code ? 'ring-2 ring-[#2d5a1b]' : ''}`}
            >
              {g.code}
            </Link>
          ))}
        </div>
      </div>

      {grouped.map(({ grade, students: gradeStudents }) => {
        if (gradeStudents.length === 0) return null
        return (
          <section key={grade.id}>
            <h2 className="text-lg font-semibold text-gray-700 mb-3">
              {grade.code} — {grade.name}
              <span className="ml-2 text-sm font-normal text-gray-400">({gradeStudents.length} students)</span>
            </h2>
            <div className="card divide-y divide-gray-100">
              {gradeStudents.map(s => {
                const assigned = assignmentMap.get(s.id) ?? new Set()
                const complete = SLOT_TYPES.every(t => assigned.has(t))
                const partial = assigned.size > 0 && !complete
                return (
                  <Link
                    key={s.id}
                    href={`/students/${s.id}`}
                    className="flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors"
                  >
                    <div>
                      <span className="font-medium">{s.last_name}, {s.first_name}</span>
                      {s.parents && <span className="ml-3 text-sm text-gray-400">{s.parents}</span>}
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="flex gap-1">
                        {SLOT_TYPES.map(t => (
                          <span
                            key={t}
                            title={SLOT_LABELS[t]}
                            className={`w-2 h-2 rounded-full ${assigned.has(t) ? 'bg-green-500' : 'bg-gray-200'}`}
                          />
                        ))}
                      </div>
                      {complete
                        ? <span className="badge-green">Complete</span>
                        : partial
                        ? <span className="badge-yellow">Partial</span>
                        : <span className="badge-gray">Unassigned</span>}
                      <span className="text-gray-400 text-sm">→</span>
                    </div>
                  </Link>
                )
              })}
            </div>
          </section>
        )
      })}
    </div>
  )
}
