'use client'

import { useState, useTransition } from 'react'
import { updatePeriodTemplate } from '@/lib/actions'

const SLOT_TYPE_LABELS: Record<string, string> = {
  athletics: 'Athletics',
  science: 'Science choice',
  math: 'Math choice',
  elective_tth: 'Elective T/Th',
  elective_mwf: 'Elective M/W/F',
}

export function PeriodTemplateRow({ period }: { period: {
  id: string; period_number: number; start_time: string; end_time: string;
  label: string; is_choice_slot: boolean; slot_type: string | null
}}) {
  const [editing, setEditing] = useState(false)
  const [pending, startTransition] = useTransition()

  function handleSave(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    startTransition(async () => {
      await updatePeriodTemplate(period.id, {
        label: fd.get('label') as string,
        start_time: fd.get('start_time') as string,
        end_time: fd.get('end_time') as string,
      })
      setEditing(false)
    })
  }

  if (editing) {
    return (
      <form onSubmit={handleSave} className="px-4 py-2 grid grid-cols-12 gap-3 items-center bg-green-50">
        <div className="col-span-1 text-xs text-gray-400">{period.period_number}</div>
        <input name="start_time" defaultValue={period.start_time} className="input col-span-2 text-xs" />
        <input name="end_time" defaultValue={period.end_time} className="input col-span-2 text-xs" />
        <input name="label" defaultValue={period.label} className="input col-span-4 text-xs" required />
        <div className="col-span-2 text-xs text-gray-400">
          {period.slot_type ? SLOT_TYPE_LABELS[period.slot_type] : 'Fixed'}
        </div>
        <div className="col-span-1 flex gap-1">
          <button type="submit" className="btn-primary text-xs px-2 py-1" disabled={pending}>✓</button>
          <button type="button" onClick={() => setEditing(false)} className="btn-secondary text-xs px-2 py-1">✕</button>
        </div>
      </form>
    )
  }

  return (
    <div className="px-4 py-2 grid grid-cols-12 gap-3 items-center hover:bg-gray-50">
      <div className="col-span-1 text-xs font-mono text-gray-400">{period.period_number}</div>
      <div className="col-span-2 text-xs text-gray-600">{period.start_time}</div>
      <div className="col-span-2 text-xs text-gray-600">{period.end_time}</div>
      <div className="col-span-4 text-sm font-medium text-gray-800">{period.label}</div>
      <div className="col-span-2">
        {period.slot_type ? (
          <span className="badge-green text-xs">{SLOT_TYPE_LABELS[period.slot_type]}</span>
        ) : (
          <span className="badge-gray text-xs">Fixed</span>
        )}
      </div>
      <div className="col-span-1">
        <button onClick={() => setEditing(true)} className="text-xs text-gray-400 hover:text-gray-700">Edit</button>
      </div>
    </div>
  )
}
