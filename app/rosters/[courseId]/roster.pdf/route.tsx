import { NextResponse } from 'next/server'
import { renderToBuffer } from '@react-pdf/renderer'
import { supabase } from '@/lib/supabase'
import { RosterPDF } from '@/components/RosterPDF'
import { SLOT_LABELS, type SlotType } from '@/lib/types'
import React from 'react'

export async function GET(_req: Request, { params }: { params: Promise<{ courseId: string }> }) {
  const { courseId } = await params

  const { data: course } = await supabase
    .from('courses')
    .select('*, grade:grades(*)')
    .eq('id', courseId)
    .single()

  if (!course) return new NextResponse('Course not found', { status: 404 })

  const { data: assignments } = await supabase
    .from('student_assignments')
    .select('student:students(first_name, last_name)')
    .eq('course_id', courseId)

  const students = ((assignments ?? [])
    .map((a: { student: unknown }) => a.student)
    .filter(Boolean)) as Array<{ first_name: string; last_name: string }>

  const element = React.createElement(RosterPDF, {
    course: { name: course.name, teacher_name: course.teacher_name, max_capacity: course.max_capacity },
    grade: course.grade as { code: string; name: string },
    slotLabel: SLOT_LABELS[course.slot_type as SlotType] ?? course.slot_type,
    students,
  })

  const nodeBuffer = await renderToBuffer(element as Parameters<typeof renderToBuffer>[0])
  const bytes = new Uint8Array(nodeBuffer)

  return new NextResponse(bytes, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="roster-${course.name.replace(/\s+/g, '-')}.pdf"`,
    },
  })
}
