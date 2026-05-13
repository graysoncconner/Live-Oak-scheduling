import { supabase } from '@/lib/supabase'
import { addStudent } from '@/lib/actions'
import { redirect } from 'next/navigation'
import Link from 'next/link'

export default async function NewStudentPage() {
  const { data: grades } = await supabase.from('grades').select('*').order('sort_order')

  async function handleAdd(fd: FormData) {
    'use server'
    await addStudent({
      first_name: fd.get('first_name') as string,
      last_name: fd.get('last_name') as string,
      grade_id: fd.get('grade_id') as string,
      parents: fd.get('parents') as string,
      phone: fd.get('phone') as string,
      address: fd.get('address') as string,
      city: fd.get('city') as string,
      state: (fd.get('state') as string) || 'TX',
      zip: fd.get('zip') as string,
    })
    redirect('/students')
  }

  return (
    <div className="max-w-xl space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/students" className="text-gray-400 hover:text-gray-600 text-sm">← Students</Link>
        <h1 className="text-2xl font-bold">Add Student</h1>
      </div>

      <form action={handleAdd} className="card p-6 space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">First Name *</label>
            <input name="first_name" className="input" required />
          </div>
          <div>
            <label className="label">Last Name *</label>
            <input name="last_name" className="input" required />
          </div>
        </div>
        <div>
          <label className="label">Grade *</label>
          <select name="grade_id" className="input" required>
            <option value="">Select grade…</option>
            {(grades ?? []).map(g => (
              <option key={g.id} value={g.id}>{g.code} — {g.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">Parents</label>
          <input name="parents" className="input" placeholder="Last, First and First" />
        </div>
        <div>
          <label className="label">Phone</label>
          <input name="phone" className="input" placeholder="254-555-0000" />
        </div>
        <div>
          <label className="label">Address</label>
          <input name="address" className="input" />
        </div>
        <div className="grid grid-cols-3 gap-4">
          <div className="col-span-1">
            <label className="label">City</label>
            <input name="city" className="input" defaultValue="Waco" />
          </div>
          <div>
            <label className="label">State</label>
            <input name="state" className="input" defaultValue="TX" />
          </div>
          <div>
            <label className="label">Zip</label>
            <input name="zip" className="input" />
          </div>
        </div>
        <div className="flex gap-2 pt-2">
          <button type="submit" className="btn-primary">Add Student</button>
          <Link href="/students" className="btn-secondary">Cancel</Link>
        </div>
      </form>
    </div>
  )
}
