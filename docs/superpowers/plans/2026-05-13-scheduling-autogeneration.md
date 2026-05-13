# Scheduling Auto-Generation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a deterministic logic-based system that auto-assigns students to course sections for all 7 periods, balancing section sizes while avoiding conflicts.

**Architecture:** Three-phase approach — (1) categorize students into tracks, (2) randomly assign electives, (3) sequentially assign courses to sections using greedy balance algorithm. All logic in `lib/scheduling.ts`, exposed via server actions and API routes.

**Tech Stack:** Next.js, TypeScript, Supabase, Server Actions

---

## File Structure

**New files:**
- `lib/scheduling.ts` — Core scheduling algorithm and utility functions
- `lib/schedule-types.ts` — Type definitions for scheduling

**Modified files:**
- `lib/types.ts` — Add `track`, `elective_tth_id`, `elective_mwf_id` to Student
- `lib/actions.ts` — Add server actions for schedule generation
- `lib/supabase.ts` — Add queries for schedule operations (if needed)

---

## Task 1: Extend Student Type with Track and Electives

**Files:**
- Modify: `lib/types.ts`

- [ ] **Step 1: Add new fields to Student type**

Open `lib/types.ts` and update the Student interface:

```typescript
export interface Student {
  id: string
  first_name: string
  last_name: string
  grade_id: string | null
  parents: string | null
  phone: string | null
  address: string | null
  city: string | null
  state: string | null
  zip: string | null
  created_at: string
  grade?: Grade
  // NEW FIELDS:
  track?: 'honors' | 'mixed' | 'regular' | null
  elective_tth_id?: string | null
  elective_mwf_id?: string | null
}
```

- [ ] **Step 2: Commit**

```bash
cd /Users/graysonconner/Live\ Oak/scheduling
git add lib/types.ts
git commit -m "feat: add track and elective fields to Student type"
```

---

## Task 2: Create Schedule Types

**Files:**
- Create: `lib/schedule-types.ts`

- [ ] **Step 1: Write schedule type definitions**

```typescript
// lib/schedule-types.ts
export type StudentTrack = 'honors' | 'mixed' | 'regular'

export interface StudentSchedule {
  student_id: string
  period_1_course_id: string
  period_2_course_id: string
  period_3_course_id: string
  period_4_course_id: string
  period_5_course_id: string
  period_6_course_id: string
  period_7_course_id: string
  period_8_course_id?: string
}

export interface SchedulingResult {
  assigned: StudentSchedule[]
  unassigned: UnassignedStudent[]
}

export interface UnassignedStudent {
  student_id: string
  student_name: string
  reason: string
  failed_course?: string
}

export interface CourseChoice {
  period: number
  course_id: string
}

export interface SectionInfo {
  course_id: string
  period: number
  enrollment: number
  max_capacity: number
}
```

- [ ] **Step 2: Commit**

```bash
git add lib/schedule-types.ts
git commit -m "feat: add schedule type definitions"
```

---

## Task 3: Implement Schedule Template Query

**Files:**
- Modify: `lib/supabase.ts`

- [ ] **Step 1: Add query helper for schedule template**

Open `lib/supabase.ts` and add at the end:

```typescript
export async function getScheduleTemplate(gradeId: string) {
  const { data, error } = await supabase
    .from('period_templates')
    .select('*')
    .eq('grade_id', gradeId)
    .order('period_number')

  if (error) throw error
  return data || []
}

export async function getCoursesBySlotType(gradeId: string, slotType: string) {
  const { data, error } = await supabase
    .from('courses')
    .select('*')
    .eq('grade_id', gradeId)
    .eq('slot_type', slotType)

  if (error) throw error
  return data || []
}
```

- [ ] **Step 2: Commit**

```bash
git add lib/supabase.ts
git commit -m "feat: add schedule template query helpers"
```

---

## Task 4: Implement Core Scheduling Functions

**Files:**
- Create: `lib/scheduling.ts`

- [ ] **Step 1: Write categorizeStudentsForGrade function**

```typescript
// lib/scheduling.ts
import { supabase } from './supabase'
import { Student } from './types'
import { StudentTrack } from './schedule-types'

export async function categorizeStudentsForGrade(gradeId: string): Promise<void> {
  // Fetch all students in grade
  const { data: students, error } = await supabase
    .from('students')
    .select('*')
    .eq('grade_id', gradeId)

  if (error) throw error
  if (!students || students.length === 0) return

  const total = students.length
  const honorCount = Math.ceil(total * 0.15)
  const mixedCount = Math.ceil(total * 0.05)

  const updates = []

  // Mark honors students
  for (let i = 0; i < honorCount && i < students.length; i++) {
    updates.push({ id: students[i].id, track: 'honors' as StudentTrack })
  }

  // Mark mixed students
  for (let i = honorCount; i < honorCount + mixedCount && i < students.length; i++) {
    updates.push({ id: students[i].id, track: 'mixed' as StudentTrack })
  }

  // Mark regular students
  for (let i = honorCount + mixedCount; i < students.length; i++) {
    updates.push({ id: students[i].id, track: 'regular' as StudentTrack })
  }

  // Batch update students
  for (const update of updates) {
    const { error: updateError } = await supabase
      .from('students')
      .update({ track: update.track })
      .eq('id', update.id)

    if (updateError) throw updateError
  }
}
```

- [ ] **Step 2: Run a quick test by importing it**

```bash
node -e "import('./lib/scheduling.ts').then(() => console.log('Import successful'))"
```

Expected: No errors (TypeScript should compile)

- [ ] **Step 3: Commit**

```bash
git add lib/scheduling.ts
git commit -m "feat: implement categorizeStudentsForGrade function"
```

---

## Task 5: Implement Elective Assignment

**Files:**
- Modify: `lib/scheduling.ts`

- [ ] **Step 1: Add assignRandomElectives function**

Add to `lib/scheduling.ts`:

```typescript
export async function assignRandomElectives(gradeId: string): Promise<void> {
  // Fetch all students in grade
  const { data: students, error: studentsError } = await supabase
    .from('students')
    .select('*')
    .eq('grade_id', gradeId)

  if (studentsError) throw studentsError
  if (!students || students.length === 0) return

  // Fetch available electives
  const { data: tthElectives, error: tthError } = await supabase
    .from('courses')
    .select('*')
    .eq('grade_id', gradeId)
    .eq('slot_type', 'elective_tth')

  const { data: mwfElectives, error: mwfError } = await supabase
    .from('courses')
    .select('*')
    .eq('grade_id', gradeId)
    .eq('slot_type', 'elective_mwf')

  if (tthError || mwfError) throw tthError || mwfError
  if (!tthElectives || tthElectives.length === 0) throw new Error('No T/Th electives found')
  if (!mwfElectives || mwfElectives.length === 0) throw new Error('No M/W/F electives found')

  // Assign random electives to each student
  for (const student of students) {
    const randomTth = tthElectives[Math.floor(Math.random() * tthElectives.length)]
    const randomMwf = mwfElectives[Math.floor(Math.random() * mwfElectives.length)]

    const { error: updateError } = await supabase
      .from('students')
      .update({
        elective_tth_id: randomTth.id,
        elective_mwf_id: randomMwf.id,
      })
      .eq('id', student.id)

    if (updateError) throw updateError
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add lib/scheduling.ts
git commit -m "feat: implement assignRandomElectives function"
```

---

## Task 6: Implement Course Choice Logic

**Files:**
- Modify: `lib/scheduling.ts`

- [ ] **Step 1: Add getStudentCourseChoices function**

Add to `lib/scheduling.ts`:

```typescript
import { CourseChoice } from './schedule-types'

export async function getStudentCourseChoices(
  student: Student,
  gradeId: string
): Promise<CourseChoice[]> {
  const choices: CourseChoice[] = []

  // Fetch all courses for the grade
  const { data: allCourses, error: courseError } = await supabase
    .from('courses')
    .select('*')
    .eq('grade_id', gradeId)

  if (courseError) throw courseError
  if (!allCourses) return []

  // Helper to find course by slot_type and level
  const findCourse = (slotType: string, level?: 'honors' | 'regular' | 'ap') => {
    return allCourses.find(c => {
      if (c.slot_type !== slotType) return false
      if (level === 'honors') return c.name.toLowerCase().includes('honors')
      if (level === 'ap') return c.name.toLowerCase().includes('ap')
      if (level === 'regular') return !c.name.toLowerCase().includes('honors') && !c.name.toLowerCase().includes('ap')
      return true
    })
  }

  // Period 1: History (fixed)
  const history = findCourse('history')
  if (history) choices.push({ period: 1, course_id: history.id })

  // Period 2: Science (track-dependent)
  let science
  if (student.track === 'honors') {
    science = findCourse('science', 'honors') || findCourse('science', 'ap')
  } else {
    science = findCourse('science', 'regular')
  }
  if (science) choices.push({ period: 2, course_id: science.id })

  // Period 3: Literature (fixed)
  const literature = findCourse('literature')
  if (literature) choices.push({ period: 3, course_id: literature.id })

  // Period 4: Rhetoric (fixed)
  const rhetoric = findCourse('rhetoric')
  if (rhetoric) choices.push({ period: 4, course_id: rhetoric.id })

  // Period 5: Math (track-dependent)
  let math
  if (student.track === 'honors') {
    math = findCourse('math', 'honors')
  } else {
    math = findCourse('math', 'regular')
  }
  if (math) choices.push({ period: 5, course_id: math.id })

  // Period 6: Language (fixed)
  const language = findCourse('language')
  if (language) choices.push({ period: 6, course_id: language.id })

  // Period 7: Elective (randomly choose between T/Th and M/W/F)
  const usesTth = Math.random() > 0.5
  const electiveId = usesTth ? student.elective_tth_id : student.elective_mwf_id
  if (electiveId) choices.push({ period: 7, course_id: electiveId })

  return choices
}
```

- [ ] **Step 2: Commit**

```bash
git add lib/scheduling.ts
git commit -m "feat: implement getStudentCourseChoices function"
```

---

## Task 7: Implement Conflict Detection

**Files:**
- Modify: `lib/scheduling.ts`

- [ ] **Step 1: Add detectConflict and helper functions**

Add to `lib/scheduling.ts`:

```typescript
export function detectConflict(
  period1: number,
  period2: number,
  scheduleTemplate: any[]
): boolean {
  // Periods 1-7 all conflict with each other (same day, can't be in two places)
  // Period 8 (athletics) doesn't conflict with anything
  if (period1 === 8 || period2 === 8) return false
  return period1 !== period2 // any two different class periods conflict
}

export async function getSectionEnrollment(courseId: string): Promise<number> {
  const { data, error } = await supabase
    .from('student_assignments')
    .select('id')
    .eq('course_id', courseId)

  if (error) throw error
  return data?.length || 0
}

export interface AssignedSection {
  course_id: string
  period: number
}

export function hasConflict(
  assignedSections: AssignedSection[],
  newPeriod: number,
  scheduleTemplate: any[]
): boolean {
  return assignedSections.some(section =>
    detectConflict(section.period, newPeriod, scheduleTemplate)
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add lib/scheduling.ts
git commit -m "feat: implement conflict detection functions"
```

---

## Task 8: Implement Section Finding

**Files:**
- Modify: `lib/scheduling.ts`

- [ ] **Step 1: Add findAvailableSections function**

Add to `lib/scheduling.ts`:

```typescript
export interface SectionOption {
  course_id: string
  period: number
  current_enrollment: number
  max_capacity: number
}

export async function findAvailableSections(
  courseId: string,
  period: number,
  assignedSections: AssignedSection[],
  scheduleTemplate: any[]
): Promise<SectionOption[]> {
  // Get the course
  const { data: course, error: courseError } = await supabase
    .from('courses')
    .select('*')
    .eq('id', courseId)
    .single()

  if (courseError || !course) return []

  // For simplicity, treat each course as one "section" per period
  // (In a fuller implementation, you might have multiple sections of the same course)
  const enrollment = await getSectionEnrollment(courseId)

  // Check if assigning to this period would create a conflict
  if (hasConflict(assignedSections, period, scheduleTemplate)) {
    return [] // Conflict, can't use this section
  }

  // Check if section is full
  if (enrollment >= course.max_capacity) {
    return [] // Full
  }

  return [
    {
      course_id: courseId,
      period: period,
      current_enrollment: enrollment,
      max_capacity: course.max_capacity,
    },
  ]
}
```

- [ ] **Step 2: Commit**

```bash
git add lib/scheduling.ts
git commit -m "feat: implement findAvailableSections function"
```

---

## Task 9: Implement Student Schedule Assignment

**Files:**
- Modify: `lib/scheduling.ts`

- [ ] **Step 1: Add assignStudentToSchedule function**

Add to `lib/scheduling.ts`:

```typescript
import { StudentSchedule, UnassignedStudent } from './schedule-types'

export async function assignStudentToSchedule(
  student: Student,
  gradeId: string,
  scheduleTemplate: any[]
): Promise<{ schedule: StudentSchedule | null; unassigned: UnassignedStudent[] }> {
  const unassignedReasons: UnassignedStudent[] = []
  const schedule: Partial<StudentSchedule> = { student_id: student.id }
  const assignedSections: AssignedSection[] = []

  try {
    // Get student's course choices
    const choices = await getStudentCourseChoices(student, gradeId)

    // For each course choice, find and assign the best section
    for (const choice of choices) {
      const availableSections = await findAvailableSections(
        choice.course_id,
        choice.period,
        assignedSections,
        scheduleTemplate
      )

      if (availableSections.length === 0) {
        unassignedReasons.push({
          student_id: student.id,
          student_name: `${student.first_name} ${student.last_name}`,
          reason: 'no_available_sections',
          failed_course: choice.course_id,
        })
        continue
      }

      // Pick section with lowest enrollment (greedy balance)
      const bestSection = availableSections.reduce((prev, current) =>
        prev.current_enrollment < current.current_enrollment ? prev : current
      )

      // Assign to this section
      ;(schedule as any)[`period_${choice.period}_course_id`] = bestSection.course_id
      assignedSections.push({ course_id: bestSection.course_id, period: choice.period })

      // Update enrollment in database
      const { error: assignError } = await supabase
        .from('student_assignments')
        .insert({
          student_id: student.id,
          course_id: bestSection.course_id,
          slot_type: 'assignment', // placeholder
        })

      if (assignError) {
        console.error(`Failed to assign ${student.id} to ${bestSection.course_id}:`, assignError)
      }
    }

    // Check if student got all required periods
    const requiredPeriods = [1, 2, 3, 4, 5, 6, 7]
    const missingPeriods = requiredPeriods.filter(
      p => !(schedule as any)[`period_${p}_course_id`]
    )

    if (missingPeriods.length > 0) {
      return { schedule: null, unassigned: unassignedReasons }
    }

    return {
      schedule: schedule as StudentSchedule,
      unassigned: unassignedReasons,
    }
  } catch (error) {
    console.error(`Error assigning schedule for student ${student.id}:`, error)
    return { schedule: null, unassigned: unassignedReasons }
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add lib/scheduling.ts
git commit -m "feat: implement assignStudentToSchedule function"
```

---

## Task 10: Implement Grade-Wide Scheduling

**Files:**
- Modify: `lib/scheduling.ts`

- [ ] **Step 1: Add generateScheduleForGrade function**

Add to `lib/scheduling.ts`:

```typescript
import { SchedulingResult } from './schedule-types'

export async function generateScheduleForGrade(gradeId: string): Promise<SchedulingResult> {
  const assigned: StudentSchedule[] = []
  const unassigned: UnassignedStudent[] = []

  try {
    // Get schedule template for grade
    const scheduleTemplate = await getScheduleTemplate(gradeId)
    if (scheduleTemplate.length === 0) {
      throw new Error(`No schedule template found for grade ${gradeId}`)
    }

    // Get all students in grade
    const { data: students, error: studentError } = await supabase
      .from('students')
      .select('*')
      .eq('grade_id', gradeId)

    if (studentError || !students) {
      throw new Error('Failed to fetch students')
    }

    // Process each student sequentially
    for (const student of students) {
      const { schedule, unassigned: studentUnassigned } = await assignStudentToSchedule(
        student,
        gradeId,
        scheduleTemplate
      )

      if (schedule) {
        assigned.push(schedule)
      }

      unassigned.push(...studentUnassigned)
    }

    return { assigned, unassigned }
  } catch (error) {
    console.error(`Error generating schedule for grade ${gradeId}:`, error)
    throw error
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add lib/scheduling.ts
git commit -m "feat: implement generateScheduleForGrade function"
```

---

## Task 11: Implement Test Data Generation

**Files:**
- Modify: `lib/scheduling.ts`

- [ ] **Step 1: Add generateTestData function**

Add to `lib/scheduling.ts`:

```typescript
export async function generateTestData(gradeId: string): Promise<SchedulingResult> {
  try {
    // Step 1: Categorize students into tracks
    await categorizeStudentsForGrade(gradeId)

    // Step 2: Assign random electives
    await assignRandomElectives(gradeId)

    // Step 3: Generate schedules
    const result = await generateScheduleForGrade(gradeId)

    return result
  } catch (error) {
    console.error(`Error generating test data for grade ${gradeId}:`, error)
    throw error
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add lib/scheduling.ts
git commit -m "feat: implement generateTestData function"
```

---

## Task 12: Create Server Action for Schedule Generation

**Files:**
- Modify: `lib/actions.ts`

- [ ] **Step 1: Add server action for test data generation**

Open `lib/actions.ts` and add:

```typescript
'use server'

import { generateTestData } from './scheduling'
import { SchedulingResult } from './schedule-types'

export async function generateTestDataAction(gradeId: string): Promise<SchedulingResult> {
  try {
    const result = await generateTestData(gradeId)
    return result
  } catch (error) {
    console.error('Server action error:', error)
    throw new Error(`Failed to generate test data: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

export async function generateScheduleAction(gradeId: string): Promise<SchedulingResult> {
  try {
    const { generateScheduleForGrade } = await import('./scheduling')
    const result = await generateScheduleForGrade(gradeId)
    return result
  } catch (error) {
    console.error('Server action error:', error)
    throw new Error(`Failed to generate schedule: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add lib/actions.ts
git commit -m "feat: add server actions for schedule generation"
```

---

## Task 13: Create API Route for Schedule Generation

**Files:**
- Create: `app/api/schedule/generate/route.ts`

- [ ] **Step 1: Write the API route**

```typescript
// app/api/schedule/generate/route.ts
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
```

- [ ] **Step 2: Commit**

```bash
git add app/api/schedule/generate/route.ts
git commit -m "feat: add API route for schedule generation"
```

---

## Task 14: Self-Review and Testing

**Files:**
- All files from previous tasks

- [ ] **Step 1: Verify all types are correct**

Check that function signatures match across:
- `lib/scheduling.ts` function implementations
- `lib/schedule-types.ts` type definitions
- `lib/actions.ts` server action signatures

Expected: No mismatches in function names, parameter types, or return types

- [ ] **Step 2: Check for missing imports**

Verify each file has necessary imports. Run TypeScript check:

```bash
cd /Users/graysonconner/Live\ Oak/scheduling
npm run build 2>&1 | head -50
```

Expected: No TypeScript errors (may have unused variable warnings, that's OK)

- [ ] **Step 3: Manual code review checklist**

- [ ] All functions in spec are implemented: ✓
  - categorizeStudentsForGrade ✓
  - assignRandomElectives ✓
  - getStudentCourseChoices ✓
  - findAvailableSections ✓
  - assignStudentToSchedule ✓
  - generateScheduleForGrade ✓
  - generateTestData ✓
  - (Plus utilities) ✓

- [ ] Error handling is in place for:
  - Missing courses/electives ✓
  - Full sections ✓
  - Conflicts ✓
  - Database errors ✓

- [ ] Test data generation matches spec:
  - ~15% Honors track ✓
  - ~5% Mixed track ✓
  - Rest Regular ✓
  - Random electives assigned ✓

- [ ] **Step 4: Final commit summary**

```bash
git log --oneline | head -15
```

Expected: 13 commits for this feature (Tasks 1-13)

---

## Next Steps

Once these tasks are complete:

1. **Test the API manually** with a test grade
2. **Add UI button** to trigger test data generation on dashboard
3. **Display results** (assigned vs unassigned students)
4. **Manual adjustment UI** for unassigned students (out of scope for this plan)
