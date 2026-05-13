import { supabase } from '@/lib/supabase'
import { PeriodTemplateRow } from './PeriodTemplateRow'

export const dynamic = 'force-dynamic'

export default async function ScheduleTemplatePage() {
  const [{ data: grades }, { data: periods }] = await Promise.all([
    supabase.from('grades').select('*').order('sort_order'),
    supabase.from('period_templates').select('*').order('period_number'),
  ])

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Schedule Template</h1>
        <p className="text-gray-500 text-sm mt-1">
          Edit period labels and times. Choice slots drive the assignment dropdowns.
        </p>
      </div>

      {(grades ?? []).map(grade => {
        const gradePeriods = (periods ?? []).filter(p => p.grade_id === grade.id)
        return (
          <section key={grade.id}>
            <h2 className="text-lg font-semibold text-gray-700 mb-3">
              {grade.code} — {grade.name}
              {grade.has_morning_athletics
                ? <span className="ml-2 text-xs font-normal text-[#2d5a1b]">Morning Athletics</span>
                : <span className="ml-2 text-xs font-normal text-gray-400">Afternoon Athletics</span>}
            </h2>
            <div className="card divide-y divide-gray-100">
              <div className="px-4 py-2 grid grid-cols-12 gap-3 text-xs font-semibold text-gray-400 uppercase tracking-wide bg-gray-50">
                <div className="col-span-1">Per.</div>
                <div className="col-span-2">Start</div>
                <div className="col-span-2">End</div>
                <div className="col-span-4">Label</div>
                <div className="col-span-2">Type</div>
                <div className="col-span-1"></div>
              </div>
              {gradePeriods.map(p => (
                <PeriodTemplateRow key={p.id} period={p} />
              ))}
            </div>
          </section>
        )
      })}
    </div>
  )
}
