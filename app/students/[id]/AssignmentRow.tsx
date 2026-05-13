'use client'

import { useState, useTransition } from 'react'
import { assignStudentToCourse, removeAssignment } from '@/lib/actions'
import type { SlotType, Course } from '@/lib/types'

interface Props {
  studentId: string
  period: { period_number: number; start_time: string; end_time: string; label: string }
  slotType: SlotType
  slotLabel: string
  courses: Course[]
  currentAssignment: { id: string; course_id: string; course?: Course } | null
}

export function AssignmentRow({ studentId, period, slotType, courses, currentAssignment }: Props) {
  const [pending, startTransition] = useTransition()
  const [editing, setEditing] = useState(false)

  const current = currentAssignment?.course
  const atCapacity = (c: Course) =>
    (c.enrollment_count ?? 0) >= c.max_capacity && c.id !== currentAssignment?.course_id

  function handleSelect(courseId: string) {
    if (!courseId) {
      startTransition(async () => {
        await removeAssignment(studentId, slotType)
        setEditing(false)
      })
    } else {
      startTransition(async () => {
        await assignStudentToCourse(studentId, courseId, slotType)
        setEditing(false)
      })
    }
  }

  return (
    <div className="px-4 py-3 flex items-center gap-4">
      <span className="w-8 text-xs text-gray-400 font-mono">{period.period_number}</span>
      <span className="w-28 text-xs text-gray-400 shrink-0">{period.start_time}–{period.end_time}</span>
      <span className="text-sm text-gray-500 w-32 shrink-0">{period.label}</span>

      <div className="flex-1">
        {editing ? (
          <select
            className="input"
            defaultValue={currentAssignment?.course_id ?? ''}
            onChange={e => handleSelect(e.target.value)}
            disabled={pending}
            autoFocus
            onBlur={() => setEditing(false)}
          >
            <option value="">— Unassigned —</option>
            {courses.map(c => {
              const full = atCapacity(c)
              const count = c.enrollment_count ?? 0
              return (
                <option key={c.id} value={c.id} disabled={full}>
                  {c.name}
                  {c.teacher_name && c.teacher_name !== 'TBD' ? ` · ${c.teacher_name}` : ''}
                  {' '}({count}/{c.max_capacity}){full ? ' FULL' : ''}
                </option>
              )
            })}
          </select>
        ) : (
          <button
            onClick={() => setEditing(true)}
            className="text-left w-full group"
            disabled={pending}
          >
            {current ? (
              <span className="text-sm font-medium text-gray-900 group-hover:text-[#2d5a1b]">
                {current.name}
                {current.teacher_name && current.teacher_name !== 'TBD'
                  ? <span className="text-gray-400 font-normal"> · {current.teacher_name}</span>
                  : null}
                <span className="ml-2 text-xs text-gray-400">
                  ({(current.enrollment_count ?? 0)}/{current.max_capacity})
                </span>
              </span>
            ) : (
              <span className="text-sm text-gray-400 italic group-hover:text-[#2d5a1b]">
                Click to assign…
              </span>
            )}
          </button>
        )}
      </div>

      <div className="flex items-center gap-2 ml-auto">
        {current
          ? <span className="badge-green">Assigned</span>
          : <span className="badge-gray">Unassigned</span>}
        {pending && <span className="text-xs text-gray-400">Saving…</span>}
      </div>
    </div>
  )
}
