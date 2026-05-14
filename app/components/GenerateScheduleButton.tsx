'use client'

import { useState } from 'react'
import { generateTestDataAction, generateScheduleAction } from '@/lib/actions'

interface Props {
  gradeId: string
  gradeName: string
}

type Result = { assigned: number; unassigned: number }

export default function GenerateScheduleButton({ gradeId, gradeName }: Props) {
  const [loading, setLoading] = useState<'reset' | 'regen' | null>(null)
  const [result, setResult] = useState<Result | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function run(mode: 'reset' | 'regen') {
    setLoading(mode)
    setResult(null)
    setError(null)
    try {
      const res = mode === 'reset'
        ? await generateTestDataAction(gradeId)
        : await generateScheduleAction(gradeId)
      setResult({ assigned: res.assigned.length, unassigned: res.unassigned.length })
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unknown error')
    } finally {
      setLoading(null)
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <button
          onClick={() => run('reset')}
          disabled={loading !== null}
          title="Re-randomizes tracks and electives, then generates schedule"
          className="flex-1 text-xs text-center rounded px-3 py-1.5 bg-amber-600 text-white hover:bg-amber-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {loading === 'reset' ? 'Resetting…' : 'Reset & Generate'}
        </button>
        <button
          onClick={() => run('regen')}
          disabled={loading !== null}
          title="Keeps existing tracks and electives, reruns placement only"
          className="flex-1 text-xs text-center rounded px-3 py-1.5 bg-[#2d5a1b] text-white hover:bg-[#234815] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {loading === 'regen' ? 'Generating…' : 'Regenerate'}
        </button>
      </div>
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
