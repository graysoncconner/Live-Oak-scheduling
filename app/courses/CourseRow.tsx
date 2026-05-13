'use client'

import { useState, useTransition } from 'react'
import { updateCourse, deleteCourse } from '@/lib/actions'
import type { Course } from '@/lib/types'

export function CourseRow({ course }: { course: Course }) {
  const [editing, setEditing] = useState(false)
  const [pending, startTransition] = useTransition()

  const pct = Math.round(((course.enrollment_count ?? 0) / course.max_capacity) * 100)
  const full = (course.enrollment_count ?? 0) >= course.max_capacity

  function handleSave(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    startTransition(async () => {
      await updateCourse(course.id, {
        name: fd.get('name') as string,
        teacher_name: fd.get('teacher_name') as string,
        max_capacity: Number(fd.get('max_capacity')),
      })
      setEditing(false)
    })
  }

  function handleDelete() {
    if ((course.enrollment_count ?? 0) > 0) {
      if (!confirm(`${course.name} has ${course.enrollment_count} students assigned. Delete anyway?`)) return
    }
    startTransition(async () => { await deleteCourse(course.id) })
  }

  if (editing) {
    return (
      <form onSubmit={handleSave} className="px-4 py-3 flex items-center gap-3 bg-green-50">
        <input name="name" defaultValue={course.name} className="input flex-1" required />
        <input name="teacher_name" defaultValue={course.teacher_name ?? ''} placeholder="Teacher" className="input w-36" />
        <input name="max_capacity" type="number" min={1} defaultValue={course.max_capacity} className="input w-20" required />
        <button type="submit" className="btn-primary" disabled={pending}>Save</button>
        <button type="button" onClick={() => setEditing(false)} className="btn-secondary">Cancel</button>
      </form>
    )
  }

  return (
    <div className="px-4 py-3 flex items-center gap-4">
      <div className="flex-1 min-w-0">
        <span className="font-medium text-sm">{course.name}</span>
        {course.teacher_name && course.teacher_name !== 'TBD' && (
          <span className="text-gray-400 text-sm"> · {course.teacher_name}</span>
        )}
      </div>
      <div className="flex items-center gap-3">
        <div className="text-xs text-gray-500 w-20 text-right">
          {course.enrollment_count ?? 0} / {course.max_capacity}
        </div>
        <div className="w-20 h-1.5 bg-gray-100 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full ${full ? 'bg-red-500' : pct > 80 ? 'bg-amber-400' : 'bg-green-500'}`}
            style={{ width: `${Math.min(pct, 100)}%` }}
          />
        </div>
        {full && <span className="badge-red">Full</span>}
      </div>
      <button onClick={() => setEditing(true)} className="text-xs text-gray-400 hover:text-gray-700">Edit</button>
      <button onClick={handleDelete} className="text-xs text-red-400 hover:text-red-700" disabled={pending}>Delete</button>
    </div>
  )
}
