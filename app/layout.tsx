import type { Metadata } from 'next'
import './globals.css'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Live Oak Scheduling',
  description: 'Student schedule assignment for Live Oak Classical School',
}

const nav = [
  { href: '/', label: 'Dashboard' },
  { href: '/students', label: 'Students' },
  { href: '/courses', label: 'Courses' },
  { href: '/rosters', label: 'Rosters' },
  { href: '/schedule-template', label: 'Schedule Template' },
]

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-gray-50 text-gray-900">
        <header className="bg-[#2d5a1b] text-white shadow">
          <div className="max-w-7xl mx-auto px-4 py-3 flex items-center gap-8">
            <span className="font-bold text-lg tracking-tight">Live Oak Scheduling</span>
            <nav className="flex gap-6 text-sm">
              {nav.map(n => (
                <Link key={n.href} href={n.href} className="hover:text-green-200 transition-colors">
                  {n.label}
                </Link>
              ))}
            </nav>
          </div>
        </header>
        <main className="max-w-7xl mx-auto px-4 py-8">{children}</main>
      </body>
    </html>
  )
}
