'use client'

import { useTransition } from 'react'
import { saveStudentPreferences } from '@/lib/actions'
import toast from 'react-hot-toast'
import type { Course, Student } from '@/lib/types'

interface Props {
  student: Student
  electiveTthCourses: Course[]
  electiveMwfCourses: Course[]
}

export function StudentPreferencesSection({ student, electiveTthCourses, electiveMwfCourses }: Props) {
  const [isPending, startTransition] = useTransition()

  function buildUpdate(
    field: 'track' | 'elective_tth_id' | 'elective_mwf_id',
    value: string | null
  ): Parameters<typeof saveStudentPreferences>[1] {
    if (field === 'track') return { track: value as 'honors' | 'mixed' | 'regular' | null }
    if (field === 'elective_tth_id') return { elective_tth_id: value }
    return { elective_mwf_id: value }
  }

  function handleChange(field: 'track' | 'elective_tth_id' | 'elective_mwf_id', rawValue: string) {
    const value = rawValue === '' ? null : rawValue
    startTransition(async () => {
      try {
        await saveStudentPreferences(student.id, buildUpdate(field, value))
        toast.success('Saved')
      } catch {
        toast.error('Failed to save')
      }
    })
  }

  return (
    <section className="card">
      <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
        <h2 className="font-semibold">Track & Elective Preferences</h2>
        {isPending && <span className="text-xs text-gray-400">Saving…</span>}
      </div>
      <div className="p-4 grid grid-cols-3 gap-4">
        <div>
          <label htmlFor="track" className="label">Track</label>
          <select
            id="track"
            className="input"
            defaultValue={student.track ?? ''}
            onChange={e => handleChange('track', e.target.value)}
            disabled={isPending}
          >
            <option value="">— Not set —</option>
            <option value="honors">Honors</option>
            <option value="mixed">Mixed</option>
            <option value="regular">Regular</option>
          </select>
        </div>
        <div>
          <label htmlFor="elective_tth_id" className="label">T/Th Elective</label>
          <select
            id="elective_tth_id"
            className="input"
            defaultValue={student.elective_tth_id ?? ''}
            onChange={e => handleChange('elective_tth_id', e.target.value)}
            disabled={isPending}
          >
            <option value="">— No preference —</option>
            {electiveTthCourses.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="elective_mwf_id" className="label">M/W/F Elective</label>
          <select
            id="elective_mwf_id"
            className="input"
            defaultValue={student.elective_mwf_id ?? ''}
            onChange={e => handleChange('elective_mwf_id', e.target.value)}
            disabled={isPending}
          >
            <option value="">— No preference —</option>
            {electiveMwfCourses.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>
      </div>
    </section>
  )
}
