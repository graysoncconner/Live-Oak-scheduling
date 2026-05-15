'use client'

import { useState, useTransition } from 'react'
import { studentLogin } from './actions'

export default function StudentLoginPage() {
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    const formData = new FormData(e.currentTarget)
    startTransition(async () => {
      const result = await studentLogin(formData)
      if (result?.error) setError(result.error)
    })
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-[#2d5a1b] text-white text-xl font-bold mb-3">L</div>
          <h1 className="text-xl font-bold text-gray-900">Live Oak Scheduling</h1>
          <p className="text-sm text-gray-500 mt-1">Student Sign In</p>
        </div>
        <div className="bg-white rounded-lg border p-6 space-y-4">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="first_name" className="label">First Name</label>
              <input
                id="first_name"
                name="first_name"
                className="input"
                required
                autoComplete="given-name"
                autoFocus
              />
            </div>
            <div>
              <label htmlFor="last_name" className="label">Last Name</label>
              <input
                id="last_name"
                name="last_name"
                className="input"
                required
                autoComplete="family-name"
              />
            </div>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <button
              type="submit"
              className="btn-primary w-full"
              disabled={isPending}
            >
              {isPending ? 'Looking you up…' : 'Sign In'}
            </button>
          </form>
          <p className="text-xs text-gray-400 text-center">
            Enter your name exactly as your teacher has it.
          </p>
        </div>
        <p className="text-center mt-4 text-sm text-gray-400">
          Are you an admin?{' '}
          <a href="/login" className="text-[#2d5a1b] hover:underline">Sign in here</a>
        </p>
      </div>
    </div>
  )
}
