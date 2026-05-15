# Auth + Student Portal + Option C Design

**Date:** 2026-05-14
**Scope:** Authentication (admin + student), student-facing portal, and eight admin UX improvements for Live Oak Classical School scheduling app

---

## Overview

The app currently has no authentication and no student-facing interface. This spec adds:
1. Admin auth (Supabase email/password + Google OAuth)
2. Student auth (name-based lookup, cookie session — testing mode)
3. A student portal where students view their schedule and choose electives
4. Eight admin-side improvements (Option C)

---

## Authentication

### Admin
- Route: `/login`
- Methods: email/password AND Google OAuth (via Supabase Auth)
- Admin account: `graysonconner@gmail.com` / `password` (created in Supabase Auth)
- All existing routes protected by middleware — unauthenticated visitors redirected to `/login`
- Sign-out button in the nav header (calls `/auth/signout` POST route)

### Student
- Route: `/student-login`
- Method: enter first name + last name → matched case-insensitively against the `students` table
- On match: `student_id` stored in an httpOnly cookie (`student_id`); redirected to `/portal`
- On no match: error message shown, no account created
- Student session expires after 7 days
- `/portal` and all sub-routes protected by middleware; redirect to `/student-login` if no cookie

### Middleware
- `/login`, `/student-login`, `/auth/*` → public
- `/portal/*` → requires `student_id` cookie
- Everything else → requires Supabase Auth session

### Google OAuth dependency
Enabling Google login requires pasting OAuth credentials from Google Cloud Console into the Supabase dashboard (Auth → Providers → Google). Code is fully implemented; credentials are a one-time manual step.

---

## Student Portal (`/portal`)

A read-only + preference-setting view for the logged-in student:

- Header: student name, grade, school year
- Schedule section: period-by-period view (read-only), shows assigned courses or "Not yet assigned"
- Elective Preferences section: two dropdowns (T/Th elective, M/W/F elective) from available courses for their grade
- "Save My Preferences" button — writes to `elective_tth_id` and `elective_mwf_id` on student record
- Disclaimer: "Your preferences will be applied when the admin generates the schedule"
- Sign Out link at top right

Students cannot change name, grade, track, or any other field.

---

## Option C: Admin Improvements

### 1. Student Track + Elective Preferences (student detail page)
Inline section above the student info card on `/students/[id]`:
- Track dropdown: Honors / Mixed / Regular
- T/Th Elective dropdown: filtered to student's grade
- M/W/F Elective dropdown: filtered to student's grade
- Saves immediately on change (no extra Save button)
- Uses existing `track`, `elective_tth_id`, `elective_mwf_id` columns — no schema change

### 2. Clear Schedule Per Grade
On each grade card on the dashboard:
- "Clear Schedule" button (amber, below the two generate buttons)
- Triggers a confirmation dialog before deleting all `student_assignments` for that grade
- Enables the iterate-and-regenerate workflow

### 3. Confirmation Dialogs
A reusable `ConfirmDialog` component replaces all existing `window.confirm()` calls and guards new destructive actions:
- Delete student
- Delete course
- Clear grade schedule
- Component: modal overlay, item name, description of consequence, Cancel + Confirm (red) buttons

### 4. Bulk CSV Student Import (`/students/import`)
- Upload CSV: columns `first_name`, `last_name`, `grade_code`, `parents` (optional), `phone` (optional)
- Client-side parse (no library needed — split by newline/comma)
- Preview table before import
- Server action inserts all rows, resolves `grade_code` → `grade_id`
- Summary: "X imported, Y failed" with per-row error reasons
- "Download template" link generates a sample CSV

### 5. Toast Notifications
`react-hot-toast` is already installed. Add `<Toaster />` to root layout. Client components that call server actions emit `toast.success()` / `toast.error()`:
- GenerateScheduleButton (already handles state — add toast)
- Clear schedule
- Save student preferences
- CSV import result
- Save track/elective preferences on student detail

### 6. Grade Schedule Grid (`/schedule-grid`)
- Grade selector tabs at top
- Full-width table: rows = students in grade, columns = Science, Math, Elective T/Th, Elective M/W/F, Track
- Empty/unassigned cells: amber background
- Fully assigned students: row has subtle green tint
- Click any student row → links to `/students/[id]`
- Shows enrollment numbers for each column header

### 7. Print All Schedules (`/students/print-all?grade=[id]`)
- Print-optimized page rendering all student schedules for a grade
- Reuses existing `SchedulePDF` component from `components/SchedulePDF.tsx`
- Each student: `page-break-after: always` in print CSS
- "Print All" button triggers `window.print()`
- Accessible from schedule grid page

### 8. Dashboard Polish
- **School year label**: read from `settings` table (`key='school_year'`). Inline edit: click pencil icon, text input, save button. Defaults to `2025-26`.
- **Capacity alerts**: if any course in a grade has enrollment ≥ 90% of max_capacity, show a yellow ⚠ badge on that grade card
- **Student notes field**: `notes text` column on students table. Shown as a collapsible textarea in the student info card. Useful for "needs aide", "IEP accommodation" etc.

---

## Schema Changes

| Table | Change |
|---|---|
| `students` | `ADD COLUMN notes text` |
| `settings` (new) | `key text PRIMARY KEY, value text NOT NULL` |
| Supabase Auth | Enable email/password + Google OAuth; create admin user |

---

## Key Constraints

- No student accounts are created in Supabase Auth — students use cookie-based sessions (testing mode)
- All existing routes remain on the same paths — no restructuring
- `lib/supabase.ts` (existing) unchanged for data queries; new `lib/supabase-auth.ts` for auth-aware client
- Middleware handles both auth types (Supabase session for admin, cookie for student)
