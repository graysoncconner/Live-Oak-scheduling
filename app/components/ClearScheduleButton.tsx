'use client'

import { useState, useTransition } from 'react'
import { clearGradeSchedule } from '@/lib/actions'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import toast from 'react-hot-toast'

interface Props {
  gradeId: string
  gradeName: string
}

export function ClearScheduleButton({ gradeId, gradeName }: Props) {
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [isPending, startTransition] = useTransition()

  function handleConfirm() {
    setConfirmOpen(false)
    startTransition(async () => {
      try {
        await clearGradeSchedule(gradeId)
        toast.success(`${gradeName} schedule cleared`)
      } catch {
        toast.error('Failed to clear schedule')
      }
    })
  }

  return (
    <>
      <button
        onClick={() => setConfirmOpen(true)}
        disabled={isPending}
        className="w-full text-xs text-center rounded px-3 py-1.5 bg-white border border-amber-400 text-amber-700 hover:bg-amber-50 disabled:opacity-50 transition-colors"
      >
        {isPending ? 'Clearing…' : 'Clear Schedule'}
      </button>
      <ConfirmDialog
        open={confirmOpen}
        title={`Clear ${gradeName} schedule?`}
        description="This will delete all course assignments for this grade. The students and courses will remain. This cannot be undone."
        onConfirm={handleConfirm}
        onCancel={() => setConfirmOpen(false)}
        confirmLabel="Clear Schedule"
        confirmClassName="px-4 py-2 rounded text-sm font-medium bg-amber-600 text-white hover:bg-amber-700"
      />
    </>
  )
}
