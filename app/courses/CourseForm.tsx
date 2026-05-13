'use client'

import { useState, useTransition, useRef } from 'react'
import { addCourse } from '@/lib/actions'
import type { SlotType } from '@/lib/types'

export function CourseForm({ gradeId, slotType }: { gradeId: string; slotType: SlotType }) {
  const [open, setOpen] = useState(false)
  const [pending, startTransition] = useTransition()
  const formRef = useRef<HTMLFormElement>(null)

  function handleAdd(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    startTransition(async () => {
      await addCourse({
        grade_id: gradeId,
        slot_type: slotType,
        name: fd.get('name') as string,
        teacher_name: fd.get('teacher_name') as string,
        max_capacity: Number(fd.get('max_capacity')),
      })
      formRef.current?.reset()
      setOpen(false)
    })
  }

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="text-sm text-[#2d5a1b] hover:underline">
        + Add course
      </button>
    )
  }

  return (
    <form ref={formRef} onSubmit={handleAdd} className="flex items-center gap-3">
      <input name="name" placeholder="Course name" className="input flex-1" required autoFocus />
      <input name="teacher_name" placeholder="Teacher (optional)" className="input w-36" />
      <input name="max_capacity" type="number" min={1} defaultValue={20} placeholder="Cap" className="input w-20" required />
      <button type="submit" className="btn-primary" disabled={pending}>Add</button>
      <button type="button" onClick={() => setOpen(false)} className="btn-secondary">Cancel</button>
    </form>
  )
}
