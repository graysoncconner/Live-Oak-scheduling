import { generateTestData } from '@/lib/scheduling'
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const { gradeId, testData } = await request.json()

    if (!gradeId) {
      return NextResponse.json({ error: 'Missing gradeId' }, { status: 400 })
    }

    if (testData) {
      const result = await generateTestData(gradeId)
      return NextResponse.json(result)
    } else {
      const { generateScheduleForGrade } = await import('@/lib/scheduling')
      const result = await generateScheduleForGrade(gradeId)
      return NextResponse.json(result)
    }
  } catch (error) {
    console.error('Schedule generation error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
