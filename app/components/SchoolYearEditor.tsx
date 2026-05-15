'use client'

import { useState, useTransition } from 'react'
import { updateSetting } from '@/lib/actions'
import toast from 'react-hot-toast'

export function SchoolYearEditor({ initialValue }: { initialValue: string }) {
  const [editing, setEditing] = useState(false)
  const [value, setValue] = useState(initialValue)
  const [isPending, startTransition] = useTransition()

  function handleSave() {
    startTransition(async () => {
      try {
        await updateSetting('school_year', value)
        toast.success('School year updated')
        setEditing(false)
      } catch {
        toast.error('Failed to update school year')
      }
    })
  }

  if (editing) {
    return (
      <span className="inline-flex items-center gap-2">
        <input
          className="border rounded px-2 py-0.5 text-sm text-gray-700 w-20"
          value={value}
          onChange={e => setValue(e.target.value)}
          autoFocus
          onKeyDown={e => { if (e.key === 'Enter') handleSave(); if (e.key === 'Escape') { setValue(initialValue); setEditing(false) } }}
        />
        <button onClick={handleSave} disabled={isPending} className="text-xs text-[#2d5a1b] hover:underline">Save</button>
        <button onClick={() => { setValue(initialValue); setEditing(false) }} className="text-xs text-gray-400 hover:underline">Cancel</button>
      </span>
    )
  }

  return (
    <span className="inline-flex items-center gap-1">
      <span>Live Oak Classical School — {value} Schedule</span>
      <button
        onClick={() => setEditing(true)}
        className="text-gray-300 hover:text-gray-500 ml-1"
        title="Edit school year"
        aria-label="Edit school year"
      >
        ✏
      </button>
    </span>
  )
}
