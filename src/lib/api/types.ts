/**
 * Types mirroring the Admin API contract (api/v1/admin).
 * Field names and nesting follow the API documentation exactly.
 */

export interface Pagination {
  page: number;
  pageSize: number;
  total: number;
  pages: number;
}

/* ── Reference entities ──────────────────────────────────────────────────── */

export interface AcademicSession {
  id: number;
  name: string;
  isCurrent?: boolean;
  startDate?: string;
  endDate?: string;
}

export interface SchoolClass {
  id: number;
  name: string;
}

export interface Subject {
  id: number;
  name: string;
  code: string | null;
  displayOrder: number;
  isActive: boolean;
}

export interface Classroom {
  id: number;
  section?: string | null;
  class: SchoolClass;
  session: AcademicSession;
}

/* ── Teachers ────────────────────────────────────────────────────────────── */

export interface Teacher {
  id: number;
  employeeId: string;
  name: string;
  phone: string;
  email: string | null;
  qualification: string | null;
  isActive: boolean;
  lastLoginAt: string | null;
  createdAt: string;
  updatedAt?: string;
  _count?: { assignments: number };
}

export interface TeacherListResponse {
  teachers: Teacher[];
  pagination: Pagination;
}

export interface TeacherDetail extends Teacher {
  assignments: TeacherDetailAssignment[];
}

export interface TeacherDetailAssignment {
  id: number;
  subject: Pick<Subject, "id" | "name">;
  classroom: Classroom;
}

export interface CreateTeacherResponse {
  teacher: Teacher;
  temporaryPassword?: string;
}

export interface PasswordResetResponse {
  teacherId: number;
  employeeId: string;
  temporaryPassword: string;
}

export interface CreateTeacherInput {
  employeeId: string;
  name: string;
  phone: string;
  email?: string;
  qualification?: string;
  password?: string;
}

export interface UpdateTeacherInput {
  name?: string;
  phone?: string;
  email?: string | null;
  qualification?: string | null;
}

export interface TeacherListParams {
  search?: string;
  active?: "true" | "false";
  page?: number;
  pageSize?: number;
}

/* ── Assignments ─────────────────────────────────────────────────────────── */

export interface Assignment {
  id: number;
  teacherId: number;
  classroomId: number;
  subjectId: number;
  isActive: boolean;
  teacher: Pick<Teacher, "id" | "name" | "employeeId">;
  subject: Pick<Subject, "id" | "name">;
  classroom: Classroom;
}

export interface AssignmentParams {
  classroomId?: number;
  teacherId?: number;
  sessionId?: number;
  active?: "true" | "false" | "all";
}

/* ── Syllabus ────────────────────────────────────────────────────────────── */

export interface Chapter {
  id: number;
  name: string;
  subjectId: number;
  classId: number;
  displayOrder: number;
  periodsRequired: number | null;
  isActive: boolean;
  subject: Pick<Subject, "id" | "name">;
  class: SchoolClass;
  _count?: { subtopics: number };
}

export interface Subtopic {
  id: number;
  chapterId: number;
  name: string;
  displayOrder: number;
  isActive: boolean;
}

/* ── Calendar ────────────────────────────────────────────────────────────── */

export type CalendarEventType = "HOLIDAY" | "EXAM" | "EVENT";

export interface CalendarEvent {
  id: number;
  sessionId: number;
  title: string;
  type: CalendarEventType;
  startDate: string;
  endDate: string;
  description: string | null;
  createdAt: string;
}

export interface EffectiveDays {
  from: string;
  to: string;
  effectiveDays: number;
}

/* ── Dashboard ───────────────────────────────────────────────────────────── */

export type PacingStatus = "ON_TRACK" | "BEHIND" | "AHEAD" | "COMPLETED";

export interface DashboardOverview {
  session: { id: number; name: string } | null;
  totalTeachers: number;
  totalAssignments: number;
  totalSubjects: number;
  totalChapters: number;
  sessionsLoggedToday: number;
  sessionsLoggedThisWeek: number;
  overallCompletionPercent: number;
  pacingBreakdown: Record<PacingStatus, number>;
}

export interface ClassroomProgress {
  classroomId: number;
  className: string;
  section: string | null;
  subjectId: number;
  subjectName: string;
  teacherName: string | null;
  totalChapters: number;
  completedChapters: number;
  behindChapters: number;
  completionPercent: number;
}

export interface TeacherActivity {
  id: number;
  name: string;
  employeeId: string;
  lastSessionDate: string | null;
}

export interface TestCoverageRow {
  chapterId: number;
  chapterName: string;
  subjectId: number;
  subjectName: string;
  className: string;
  testCount: number;
  revisionCount: number;
}

export interface UnmarkedSubtopic {
  id: number;
  name: string;
  displayOrder: number;
  chapter: {
    id: number;
    name: string;
    subject: Pick<Subject, "id" | "name">;
    class: SchoolClass;
  };
}

/* ── Session logs ────────────────────────────────────────────────────────── */

export type SessionLogType = "TEACHING" | "REVISION" | "QA" | "TEST";

export interface SessionLog {
  id: number;
  assignmentId: number;
  sessionDate: string;
  type: SessionLogType;
  notes: string | null;
  createdAt?: string;
  assignment: {
    id?: number;
    teacher: Pick<Teacher, "id" | "name" | "employeeId">;
    subject: Pick<Subject, "id" | "name">;
    classroom: { id: number; class: SchoolClass };
  };
  _count?: { topics: number };
}

export interface SessionTopicDetail {
  id: number;
  subtopicId: number | null;
  chapterId: number | null;
  status: string;
  notes: string | null;
  subtopic: { id: number; name: string } | null;
  chapter: { id: number; name: string } | null;
}

export interface SessionLogDetail extends SessionLog {
  topics: SessionTopicDetail[];
}

export interface SessionListResponse {
  sessions: SessionLog[];
  pagination: Pagination;
}

export interface SessionListParams {
  teacherId?: number;
  classroomId?: number;
  type?: SessionLogType;
  from?: string;
  to?: string;
  page?: number;
  pageSize?: number;
}

/* ── Pacing ──────────────────────────────────────────────────────────────── */

export interface Pacing {
  id: number;
  assignmentId: number;
  chapterId: number;
  completionPercent: number;
  status: PacingStatus;
  daysBehind?: number | null;
  chapter: { id: number; name: string; displayOrder: number };
  assignment: {
    teacher: Pick<Teacher, "id" | "name" | "employeeId">;
    subject: Pick<Subject, "id" | "name">;
    classroom: { id: number; class: SchoolClass };
  };
}

export interface PacingParams {
  classroomId?: number;
  teacherId?: number;
  subjectId?: number;
  status?: PacingStatus;
}

/* ── Attendance ──────────────────────────────────────────────────────────── */

export type AttendanceStatus = "PRESENT" | "ABSENT" | "HALF_DAY" | "ON_LEAVE";

export interface AttendanceRecord {
  id: number;
  teacherId: number;
  date: string;
  status: AttendanceStatus;
  remarks: string | null;
  teacher: Pick<Teacher, "id" | "name" | "employeeId">;
}

/* ── Timetable ───────────────────────────────────────────────────────────── */

export interface TimetableSlot {
  id: number;
  assignmentId: number;
  dayOfWeek: number;
  periodNumber: number;
  startTime: string;
  endTime: string;
  roomLabel: string | null;
  assignment: {
    teacher: Pick<Teacher, "id" | "name" | "employeeId">;
    subject: Pick<Subject, "id" | "name">;
    classroom: { id: number; class: SchoolClass };
  };
}

/* ── Audit logs ──────────────────────────────────────────────────────────── */

export type AuditActorType = "ADMIN" | "TEACHER";

export interface AuditLog {
  id: number;
  actorType: AuditActorType;
  actorId: number;
  actorName: string;
  action: string;
  entityType: string;
  entityId: number;
  createdAt: string;
}

export interface AuditLogDetail extends AuditLog {
  oldValue: Record<string, unknown> | null;
  newValue: Record<string, unknown> | null;
}

export interface AuditLogListResponse {
  logs: AuditLog[];
  pagination: Pagination;
}

export interface AuditLogParams {
  actorType?: AuditActorType;
  actorId?: number;
  entityType?: string;
  entityId?: number;
  action?: string;
  from?: string;
  to?: string;
  page?: number;
  pageSize?: number;
}

/* ── Auth ────────────────────────────────────────────────────────────────── */

export interface AdminUser {
  id: number;
  name: string;
  phone?: string;
  email?: string | null;
  role: "SUPERUSER" | "ADMIN";
}
