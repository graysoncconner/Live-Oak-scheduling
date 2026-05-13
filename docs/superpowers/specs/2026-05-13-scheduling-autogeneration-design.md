# Scheduling Auto-Generation Design

**Date:** 2026-05-13  
**Scope:** Logic-based automatic schedule generation for students based on course track selection and elective choices

---

## Overview

The scheduling auto-generation system assigns students to specific course sections for all 7 periods of the day. Students are categorized into three tracks (Honors, Mixed, Regular) based on their Math/Science course choices. The system uses deterministic sequential assignment to avoid conflicts and balance section sizes around 20 students per section.

---

## Data Model

### Student Properties (New/Modified)

```typescript
student.track: 'honors' | 'mixed' | 'regular'
  - 'honors': takes Honors/AP Science + Honors Math
  - 'mixed': takes Honors Science + Regular Math
  - 'regular': takes Regular Science + Regular Math

student.elective_tth_id: string | null  // Course ID for Tuesday/Thursday elective
student.elective_mwf_id: string | null  // Course ID for Monday/Wednesday/Friday elective
```

### Course Assignment Model

Each student needs assignments to specific course **sections** for all periods:

```typescript
interface StudentSchedule {
  student_id: string
  period_1_course_id: string    // History (fixed)
  period_2_course_id: string    // Science (Honors or Regular)
  period_3_course_id: string    // Literature (fixed)
  period_4_course_id: string    // Rhetoric (fixed)
  period_5_course_id: string    // Math (Honors or Regular)
  // lunch
  period_6_course_id: string    // Language (fixed)
  period_7_course_id: string    // Elective (T/Th or M/W/F)
  period_8_course_id?: string   // Athletics (optional)
}
```

### Schedule Template

Each grade has a `PeriodTemplate` that defines:
- Period 1-7: which slot_type (science, math, elective_tth, etc.)
- Which periods are "choice" slots vs "fixed"
- Which periods conflict (no student in two places at same time)

---

## Algorithm: Sequential Assignment

### Phase 1: Categorize Students

```
For grade in grades:
  students = get_students_by_grade(grade)
  
  # Distribute into tracks
  honor_count = ceil(students.length * 0.15)  # ~15% or ~15 students
  mixed_count = ceil(students.length * 0.05)  # ~5% or ~5 students
  
  students[0..honor_count-1].track = 'honors'
  students[honor_count..honor_count+mixed_count-1].track = 'mixed'
  students[honor_count+mixed_count..].track = 'regular'
```

### Phase 2: Assign Electives (Test Data Only)

For each student:
```
student.elective_tth_id = random_course(available_tth_electives)
student.elective_mwf_id = random_course(available_mwf_electives)
```

### Phase 3: Sequential Course Assignment

For each student in order:

1. **Determine course choices** based on track:
   ```
   # Core courses are the same for all students in a grade (one section per period)
   courses = {
     period_1: history_course_id (grade has only one),
     period_3: literature_course_id (grade has only one),
     period_4: rhetoric_course_id (grade has only one),
     period_6: language_course_id (grade has only one),
     
     # Choice courses vary by track
     period_2: student.track == 'honors' ? honors_science_id : regular_science_id,
     period_5: student.track in ['honors', 'mixed'] ? honors_math_id : regular_math_id,
     
     # Electives
     period_7: student.elective_tth_id or student.elective_mwf_id (chosen randomly from pair),
     
     # Optional
     period_8: athletics_course_id (if available)
   }
   ```

2. **For each course**, find and assign a section:
   ```
   For each (period, course_id) in courses:
     available_sections = find_sections(course_id)
       .filter(s => s.period == period)
       .filter(s => s.capacity > s.enrollment)
       .filter(s => NO conflict with already-assigned periods)
     
     if available_sections.empty:
       flag_student_as_unassigned(student, course_id, reason)
       continue
     
     # Pick section with lowest current enrollment (for balance)
     best_section = min(available_sections, by: enrollment)
     assign_student(student, best_section)
     best_section.enrollment += 1
   ```

### Phase 4: Handle Unassigned Students

- Log students who couldn't be scheduled
- Return list for manual review
- Do NOT block the grade—continue scheduling others

---

## Test Data Generation

When user triggers "Generate test data for grade X":

1. Get all students in grade
2. Distribute into tracks (15% Honors, 5% Mixed, rest Regular)
3. Assign random electives to all students
4. Run scheduling algorithm
5. Display results (assigned vs unassigned)

---

## Key Functions

### Core Scheduling
- `categorizeStudentsForGrade(gradeId: string)` → assigns track to each student
- `getStudentCourseChoices(student: Student, electives: Course[])` → returns map of period → course_id
- `findAvailableSections(courseId: string, period: number, conflicts: Set<number>)` → returns Section[]
- `assignStudentToSchedule(student: Student)` → orchestrates assignment for one student
- `generateScheduleForGrade(gradeId: string)` → runs entire algorithm for a grade
- `generateTestData(gradeId: string)` → creates tracks and random electives

### Utilities
- `getScheduleTemplate(gradeId: string)` → returns PeriodTemplate[] for grade
- `detectConflict(period1: number, period2: number, template: PeriodTemplate[])` → boolean
- `getSectionEnrollment(sectionId: string)` → returns current count

---

## Error Handling

**Unschedulable Student:**
- Occurs when no section is available (full or conflicts with fixed courses)
- Log: student name, course, reason (full | conflict)
- Return in `unassigned` list
- User can manually adjust via UI

**Empty Elective Pool:**
- If a student's random elective pick has no availability, pick next random
- If all electives full, flag as unassigned

---

## Testing Strategy

**Test Case 1: Small Grade (20 students)**
- 3 Honors, 1 Mixed, 16 Regular
- Verify: all assigned, sections ~evenly balanced

**Test Case 2: Large Grade (100 students)**
- 15 Honors, 5 Mixed, 80 Regular
- Verify: most assigned, some unassigned if sections too small

**Test Case 3: Conflict Scenario**
- Create sections with very low capacity
- Verify: unassigned list includes expected students
- Verify: other students still scheduled

---

## Future Enhancements (Out of Scope)

- User preferences ("keep me with my friend", "same teacher preference")
- Weighted balancing (e.g., prefer earlier periods for Honors students)
- Batch reassignment algorithm for unscheduled students
- UI for editing individual student schedules post-generation
