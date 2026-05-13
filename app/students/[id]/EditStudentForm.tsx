'use client'

import { useState, useTransition } from 'react'
import { updateStudent, deleteStudent } from '@/lib/actions'
import { useRouter } from 'next/navigation'
import type { Student, Grade } from '@/lib/types'

export function EditStudentForm({ student, grades }: { student: Student; grades: Grade[] }) {
  const [editing, setEditing] = useState(false)
  const [pending, startTransition] = useTransition()
  const router = useRouter()

  function handleSave(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    startTransition(async () => {
      await updateStudent(student.id, {
        first_name: fd.get('first_name') as string,
        last_name: fd.get('last_name') as string,
        grade_id: fd.get('grade_id') as string,
        parents: fd.get('parents') as string,
        phone: fd.get('phone') as string,
        address: fd.get('address') as string,
        city: fd.get('city') as string,
        state: fd.get('state') as string,
        zip: fd.get('zip') as string,
      })
      setEditing(false)
    })
  }

  function handleDelete() {
    if (!confirm(`Delete ${student.first_name} ${student.last_name}? This cannot be undone.`)) return
    startTransition(async () => {
      await deleteStudent(student.id)
      router.push('/students')
    })
  }

  if (!editing) {
    return (
      <div className="p-4 space-y-2">
        <InfoRow label="Parents" value={student.parents} />
        <InfoRow label="Phone" value={student.phone} />
        <InfoRow label="Address" value={[student.address, student.city, student.state, student.zip].filter(Boolean).join(', ')} />
        <div className="flex gap-2 pt-2">
          <button onClick={() => setEditing(true)} className="btn-secondary">Edit</button>
          <button onClick={handleDelete} className="btn-danger" disabled={pending}>Delete</button>
        </div>
      </div>
    )
  }

  return (
    <form onSubmit={handleSave} className="p-4 space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="label">First Name</label>
          <input name="first_name" defaultValue={student.first_name} className="input" required />
        </div>
        <div>
          <label className="label">Last Name</label>
          <input name="last_name" defaultValue={student.last_name} className="input" required />
        </div>
      </div>
      <div>
        <label className="label">Grade</label>
        <select name="grade_id" defaultValue={student.grade_id ?? ''} className="input">
          {grades.map(g => <option key={g.id} value={g.id}>{g.code} — {g.name}</option>)}
        </select>
      </div>
      <div>
        <label className="label">Parents</label>
        <input name="parents" defaultValue={student.parents ?? ''} className="input" />
      </div>
      <div>
        <label className="label">Phone</label>
        <input name="phone" defaultValue={student.phone ?? ''} className="input" />
      </div>
      <div className="grid grid-cols-3 gap-4">
        <div className="col-span-3 sm:col-span-1">
          <label className="label">Address</label>
          <input name="address" defaultValue={student.address ?? ''} className="input" />
        </div>
        <div>
          <label className="label">City</label>
          <input name="city" defaultValue={student.city ?? ''} className="input" />
        </div>
        <div>
          <label className="label">Zip</label>
          <input name="zip" defaultValue={student.zip ?? ''} className="input" />
        </div>
      </div>
      <div className="flex gap-2">
        <button type="submit" className="btn-primary" disabled={pending}>Save</button>
        <button type="button" onClick={() => setEditing(false)} className="btn-secondary">Cancel</button>
      </div>
    </form>
  )
}

function InfoRow({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div className="flex gap-4 text-sm">
      <span className="text-gray-400 w-20 shrink-0">{label}</span>
      <span className="text-gray-900">{value || <span className="italic text-gray-300">—</span>}</span>
    </div>
  )
}
