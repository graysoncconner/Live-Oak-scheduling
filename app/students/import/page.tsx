'use client'

import { useState, useTransition } from 'react'
import { importStudents } from '@/lib/actions'
import Link from 'next/link'
import toast from 'react-hot-toast'

interface ParsedRow {
  first_name: string
  last_name: string
  grade_code: string
  parents?: string
  phone?: string
}

function parseCSV(text: string): { rows: ParsedRow[]; errors: string[] } {
  const lines = text.trim().split('\n').filter(l => l.trim())
  if (lines.length === 0) return { rows: [], errors: ['File is empty'] }

  const headers = lines[0].split(',').map(h => h.trim().toLowerCase())
  const required = ['first_name', 'last_name', 'grade_code']
  const missing = required.filter(r => !headers.includes(r))
  if (missing.length > 0) return { rows: [], errors: [`Missing required columns: ${missing.join(', ')}`] }

  const rows: ParsedRow[] = []
  const errors: string[] = []

  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',').map(v => v.trim())
    const row: Record<string, string> = {}
    headers.forEach((h, idx) => { row[h] = values[idx] ?? '' })

    if (!row.first_name || !row.last_name || !row.grade_code) {
      errors.push(`Row ${i + 1}: missing required field(s)`)
      continue
    }

    rows.push({
      first_name: row.first_name,
      last_name: row.last_name,
      grade_code: row.grade_code,
      parents: row.parents || undefined,
      phone: row.phone || undefined,
    })
  }

  return { rows, errors }
}

const TEMPLATE = 'first_name,last_name,grade_code,parents,phone\nJohn,Smith,7TH,Jane Smith,555-1234\n'

function downloadTemplate() {
  const blob = new Blob([TEMPLATE], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'students-template.csv'
  a.click()
  URL.revokeObjectURL(url)
}

export default function ImportStudentsPage() {
  const [rows, setRows] = useState<ParsedRow[]>([])
  const [parseErrors, setParseErrors] = useState<string[]>([])
  const [result, setResult] = useState<{ imported: number; failed: number; errors: string[] } | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = ev => {
      const text = ev.target?.result as string
      const { rows: parsed, errors } = parseCSV(text)
      setRows(parsed)
      setParseErrors(errors)
      setResult(null)
    }
    reader.readAsText(file)
  }

  function handleImport() {
    if (rows.length === 0) return
    startTransition(async () => {
      try {
        const res = await importStudents(rows)
        setResult(res)
        if (res.imported > 0) {
          toast.success(`${res.imported} student${res.imported !== 1 ? 's' : ''} imported`)
        }
        if (res.failed > 0) {
          toast.error(`${res.failed} row${res.failed !== 1 ? 's' : ''} failed`)
        }
        if (res.imported > 0) setRows([])
      } catch {
        toast.error('Import failed')
      }
    })
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center gap-4">
        <Link href="/students" className="text-gray-400 hover:text-gray-600 text-sm">← Students</Link>
        <h1 className="text-2xl font-bold">Import Students</h1>
      </div>

      <div className="card p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-semibold">Upload CSV</h2>
            <p className="text-sm text-gray-500 mt-0.5">
              Required columns: <code className="text-xs bg-gray-100 px-1 rounded">first_name</code>,{' '}
              <code className="text-xs bg-gray-100 px-1 rounded">last_name</code>,{' '}
              <code className="text-xs bg-gray-100 px-1 rounded">grade_code</code>
            </p>
          </div>
          <button
            type="button"
            onClick={downloadTemplate}
            className="btn-secondary text-sm"
          >
            Download Template
          </button>
        </div>

        <input
          type="file"
          accept=".csv,text/csv"
          onChange={handleFile}
          className="block text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-medium file:bg-[#2d5a1b] file:text-white hover:file:bg-[#234815] cursor-pointer"
        />

        {parseErrors.length > 0 && (
          <div className="bg-red-50 border border-red-200 rounded p-3 space-y-1">
            {parseErrors.map((e, i) => (
              <p key={i} className="text-sm text-red-700">{e}</p>
            ))}
          </div>
        )}
      </div>

      {rows.length > 0 && (
        <div className="card space-y-4">
          <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
            <h2 className="font-semibold">Preview — {rows.length} student{rows.length !== 1 ? 's' : ''}</h2>
            <button
              onClick={handleImport}
              disabled={isPending}
              className="btn-primary text-sm"
            >
              {isPending ? 'Importing…' : `Import ${rows.length} Student${rows.length !== 1 ? 's' : ''}`}
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-gray-500 border-b">
                  <th className="px-4 pb-2">First Name</th>
                  <th className="px-4 pb-2">Last Name</th>
                  <th className="px-4 pb-2">Grade</th>
                  <th className="px-4 pb-2">Parents</th>
                  <th className="px-4 pb-2">Phone</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {rows.map((r, i) => (
                  <tr key={i} className="hover:bg-gray-50">
                    <td className="px-4 py-2">{r.first_name}</td>
                    <td className="px-4 py-2">{r.last_name}</td>
                    <td className="px-4 py-2">{r.grade_code}</td>
                    <td className="px-4 py-2 text-gray-500">{r.parents || '—'}</td>
                    <td className="px-4 py-2 text-gray-500">{r.phone || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {result && (
        <div className={`card p-4 space-y-2 ${result.failed > 0 ? 'border-amber-300' : 'border-green-300'}`}>
          <p className="font-semibold">
            {result.imported} imported, {result.failed} failed
          </p>
          {result.errors.length > 0 && (
            <ul className="space-y-1">
              {result.errors.map((e, i) => (
                <li key={i} className="text-sm text-red-600">{e}</li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}
