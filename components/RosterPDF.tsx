import { Document, Page, View, Text, StyleSheet } from '@react-pdf/renderer'

const GREEN = '#2d5a1b'
const GRAY = '#6b7280'
const BORDER = '#e5e7eb'
const LIGHT_GRAY = '#f9fafb'

const styles = StyleSheet.create({
  page: { fontFamily: 'Helvetica', fontSize: 10, padding: 36, backgroundColor: '#fff' },
  header: { marginBottom: 16 },
  schoolName: { fontSize: 18, fontFamily: 'Helvetica-Bold', color: GREEN, marginBottom: 2 },
  subtitle: { fontSize: 10, color: GRAY },
  divider: { borderBottomWidth: 2, borderBottomColor: GREEN, marginBottom: 14 },
  courseTitle: { fontSize: 15, fontFamily: 'Helvetica-Bold', color: '#111827', marginBottom: 2 },
  meta: { fontSize: 9.5, color: GRAY, marginBottom: 3 },
  metaRow: { flexDirection: 'row', gap: 20, marginBottom: 14 },
  table: { borderWidth: 1, borderColor: BORDER, borderRadius: 4, overflow: 'hidden' },
  tableHeader: {
    flexDirection: 'row', backgroundColor: GREEN, paddingVertical: 6, paddingHorizontal: 10,
  },
  tableHeaderCell: { color: '#fff', fontFamily: 'Helvetica-Bold', fontSize: 9 },
  row: { flexDirection: 'row', paddingVertical: 8, paddingHorizontal: 10, borderBottomWidth: 1, borderBottomColor: BORDER },
  rowAlt: { backgroundColor: LIGHT_GRAY },
  colNum: { width: 28 },
  colName: { flex: 1 },
  colGrade: { width: 80 },
  colAttendance: { width: 200 },
  cellText: { color: '#1f2937', fontSize: 9.5 },
  cellGray: { color: GRAY, fontSize: 9 },
  attendanceDot: {
    width: 14, height: 14, borderRadius: 7, borderWidth: 1, borderColor: '#d1d5db', marginRight: 4,
  },
  footer: { marginTop: 16, fontSize: 8, color: GRAY, textAlign: 'center' },
  emptyMsg: { padding: 20, color: GRAY, textAlign: 'center', fontSize: 10 },
})

interface Student { first_name: string; last_name: string; grade?: { code: string } }

interface Props {
  course: { name: string; teacher_name: string | null; max_capacity: number }
  grade: { code: string; name: string }
  slotLabel: string
  students: Student[]
  schoolYear?: string
}

export function RosterPDF({ course, grade, slotLabel, students, schoolYear = '2025–2026' }: Props) {
  const sorted = [...students].sort((a, b) => a.last_name.localeCompare(b.last_name))

  return (
    <Document>
      <Page size="LETTER" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.schoolName}>Live Oak Classical School</Text>
          <Text style={styles.subtitle}>Class Roster — {schoolYear}</Text>
        </View>
        <View style={styles.divider} />

        <Text style={styles.courseTitle}>{course.name}</Text>
        <View style={styles.metaRow}>
          <Text style={styles.meta}>Grade: {grade.code} — {grade.name}</Text>
          <Text style={styles.meta}>Slot: {slotLabel}</Text>
          {course.teacher_name && course.teacher_name !== 'TBD' && (
            <Text style={styles.meta}>Teacher: {course.teacher_name}</Text>
          )}
          <Text style={styles.meta}>Enrolled: {students.length} / {course.max_capacity}</Text>
        </View>

        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={[styles.tableHeaderCell, styles.colNum]}>#</Text>
            <Text style={[styles.tableHeaderCell, styles.colName]}>Student Name</Text>
            <Text style={[styles.tableHeaderCell, styles.colAttendance]}>Attendance</Text>
          </View>

          {sorted.length === 0 ? (
            <Text style={styles.emptyMsg}>No students enrolled in this course.</Text>
          ) : (
            sorted.map((s, i) => (
              <View key={i} style={[styles.row, i % 2 === 1 ? styles.rowAlt : {}]}>
                <View style={styles.colNum}>
                  <Text style={styles.cellGray}>{i + 1}.</Text>
                </View>
                <View style={styles.colName}>
                  <Text style={styles.cellText}>{s.last_name}, {s.first_name}</Text>
                </View>
                <View style={[styles.colAttendance, { flexDirection: 'row', alignItems: 'center' }]}>
                  {Array.from({ length: 10 }).map((_, d) => (
                    <View key={d} style={styles.attendanceDot} />
                  ))}
                </View>
              </View>
            ))
          )}
        </View>

        <Text style={styles.footer}>
          Live Oak Classical School · Waco, TX · Generated {new Date().toLocaleDateString()}
        </Text>
      </Page>
    </Document>
  )
}
