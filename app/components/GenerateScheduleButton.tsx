'use client'

import { useState } from 'react'
import { generateTestDataAction } from '@/lib/actions'

interface Props {
  gradeId: string
  gradeName: string
}

export default function GenerateScheduleButton({ gradeId, gradeName }: Props) {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<{ assigned: number; unassigned: number } | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function handleGenerate() {
    setLoading(true)
    setResult(null)
    setError(null)
    try {
      const res = await generateTestDataAction(gradeId)
      setResult({ assigned: res.assigned.length, unassigned: res.unassigned.length })
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-2">
      <button
        onClick={handleGenerate}
        disabled={loading}
        className="w-full text-xs text-center rounded px-3 py-1.5 bg-[#2d5a1b] text-white hover:bg-[#234815] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {loading ? 'Generating…' : `Generate ${gradeName} Schedule`}
      </button>
      {result && (
        <p className="text-xs text-center text-gray-600">
          ✓ {result.assigned} assigned, {result.unassigned} unassigned
        </p>
      )}
      {error && (
        <p className="text-xs text-center text-red-600 truncate" title={error}>
          Error: {error}
        </p>
      )}
    </div>
  )
}
