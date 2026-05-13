import { NextResponse } from 'next/server'
import { renderToBuffer } from '@react-pdf/renderer'
import { supabase } from '@/lib/supabase'
import { SchedulePDF } from '@/components/SchedulePDF'
import React from 'react'

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  const [{ data: student }, { data: assignments }] = await Promise.all([
    supabase.from('students').select('*, grade:grades(*)').eq('id', id).single(),
    supabase
      .from('student_assignments')
      .select('slot_type, course:courses(name, teacher_name)')
      .eq('student_id', id),
  ])

  if (!student) return new NextResponse('Student not found', { status: 404 })

  const { data: periods } = await supabase
    .from('period_templates')
    .select('*')
    .eq('grade_id', student.grade_id)
    .order('period_number')

  const element = React.createElement(SchedulePDF, {
    student: { first_name: student.first_name, last_name: student.last_name },
    grade: student.grade as { code: string; name: string },
    periods: (periods ?? []) as Array<{
      period_number: number; start_time: string; end_time: string
      label: string; is_choice_slot: boolean; slot_type: string | null
    }>,
    assignments: (assignments ?? []) as unknown as Array<{
      slot_type: string
      course: { name: string; teacher_name: string | null } | null
    }>,
  })

  // renderToBuffer returns a Node Buffer; convert to Uint8Array for the Web Response API
  const nodeBuffer = await renderToBuffer(element as Parameters<typeof renderToBuffer>[0])
  const bytes = new Uint8Array(nodeBuffer)

  return new NextResponse(bytes, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="schedule-${student.last_name}-${student.first_name}.pdf"`,
    },
  })
}
