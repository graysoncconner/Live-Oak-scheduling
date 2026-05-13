import {
  Document, Page, View, Text, StyleSheet, Font,
} from '@react-pdf/renderer'

const GREEN = '#2d5a1b'
const LIGHT_GREEN = '#edf5e9'
const GRAY = '#6b7280'
const LIGHT_GRAY = '#f3f4f6'
const BORDER = '#e5e7eb'

const styles = StyleSheet.create({
  page: { fontFamily: 'Helvetica', fontSize: 10, padding: 36, backgroundColor: '#fff' },
  header: { marginBottom: 20 },
  schoolName: { fontSize: 18, fontFamily: 'Helvetica-Bold', color: GREEN, marginBottom: 2 },
  subtitle: { fontSize: 10, color: GRAY },
  divider: { borderBottomWidth: 2, borderBottomColor: GREEN, marginBottom: 14 },
  studentName: { fontSize: 15, fontFamily: 'Helvetica-Bold', color: '#111827', marginBottom: 2 },
  gradeLabel: { fontSize: 10, color: GRAY, marginBottom: 14 },
  table: { borderWidth: 1, borderColor: BORDER, borderRadius: 4, overflow: 'hidden' },
  tableHeader: {
    flexDirection: 'row', backgroundColor: GREEN, paddingVertical: 6, paddingHorizontal: 8,
  },
  tableHeaderCell: { color: '#fff', fontFamily: 'Helvetica-Bold', fontSize: 9 },
  row: { flexDirection: 'row', paddingVertical: 7, paddingHorizontal: 8, borderBottomWidth: 1, borderBottomColor: BORDER },
  rowAlt: { backgroundColor: LIGHT_GRAY },
  rowChoice: { backgroundColor: LIGHT_GREEN },
  colPeriod: { width: 30 },
  colTime: { width: 110 },
  colCourse: { flex: 1 },
  colTeacher: { width: 120 },
  cellText: { color: '#1f2937', fontSize: 9.5 },
  cellGray: { color: GRAY, fontSize: 9 },
  choiceBadge: {
    backgroundColor: GREEN, color: '#fff', fontSize: 7, fontFamily: 'Helvetica-Bold',
    paddingHorizontal: 4, paddingVertical: 1, borderRadius: 3, marginLeft: 5,
  },
  footer: { marginTop: 16, fontSize: 8, color: GRAY, textAlign: 'center' },
})

interface Period {
  period_number: number
  start_time: string
  end_time: string
  label: string
  is_choice_slot: boolean
  slot_type: string | null
}

interface AssignedCourse {
  slot_type: string
  course: { name: string; teacher_name: string | null } | null
}

interface Props {
  student: { first_name: string; last_name: string }
  grade: { code: string; name: string }
  periods: Period[]
  assignments: AssignedCourse[]
  schoolYear?: string
}

export function SchedulePDF({ student, grade, periods, assignments, schoolYear = '2025–2026' }: Props) {
  const assignmentMap = new Map(assignments.map(a => [a.slot_type, a.course]))

  return (
    <Document>
      <Page size="LETTER" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.schoolName}>Live Oak Classical School</Text>
          <Text style={styles.subtitle}>Student Schedule — {schoolYear}</Text>
        </View>
        <View style={styles.divider} />

        <Text style={styles.studentName}>{student.last_name}, {student.first_name}</Text>
        <Text style={styles.gradeLabel}>{grade.code} — {grade.name}</Text>

        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={[styles.tableHeaderCell, styles.colPeriod]}>#</Text>
            <Text style={[styles.tableHeaderCell, styles.colTime]}>Time</Text>
            <Text style={[styles.tableHeaderCell, styles.colCourse]}>Course</Text>
            <Text style={[styles.tableHeaderCell, styles.colTeacher]}>Teacher</Text>
          </View>

          {periods.map((p, i) => {
            const isChoice = p.is_choice_slot && p.slot_type !== 'athletics'
            const course = p.slot_type ? assignmentMap.get(p.slot_type) : null
            const courseName = isChoice
              ? (course?.name ?? 'Unassigned')
              : p.label
            const teacher = course?.teacher_name && course.teacher_name !== 'TBD'
              ? course.teacher_name
              : (isChoice ? '' : '')

            return (
              <View
                key={i}
                style={[
                  styles.row,
                  i % 2 === 1 && !isChoice ? styles.rowAlt : {},
                  isChoice ? styles.rowChoice : {},
                ]}
              >
                <View style={styles.colPeriod}>
                  <Text style={styles.cellText}>{p.period_number}</Text>
                </View>
                <View style={styles.colTime}>
                  <Text style={styles.cellGray}>{p.start_time} – {p.end_time}</Text>
                </View>
                <View style={[styles.colCourse, { flexDirection: 'row', alignItems: 'center' }]}>
                  <Text style={[styles.cellText, !course && isChoice ? { color: '#ef4444' } : {}]}>
                    {courseName}
                  </Text>
                  {isChoice && (
                    <Text style={styles.choiceBadge}>CHOICE</Text>
                  )}
                </View>
                <View style={styles.colTeacher}>
                  <Text style={styles.cellGray}>{teacher}</Text>
                </View>
              </View>
            )
          })}
        </View>

        <Text style={styles.footer}>
          Live Oak Classical School · Waco, TX · Generated {new Date().toLocaleDateString()}
        </Text>
      </Page>
    </Document>
  )
}
