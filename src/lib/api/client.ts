/**
 * Admin API client.
 *
 * Requests go to a same-origin path (`/api/admin/...`) which the Next.js route
 * handler forwards to the real Admin API, passing the `session` cookie through
 * in both directions. Same-origin keeps the httpOnly cookie usable from the
 * browser without third-party-cookie or CORS problems.
 *
 * Every response follows the documented envelope: `{ data }` or `{ error }`.
 */

import type {
  Assignment,
  AssignmentParams,
  AttendanceRecord,
  AttendanceStatus,
  AuditLogDetail,
  AuditLogListResponse,
  AuditLogParams,
  AcademicSession,
  CalendarEvent,
  CalendarEventType,
  Chapter,
  ClassroomProgress,
  Classroom,
  CreateTeacherInput,
  CreateTeacherResponse,
  DashboardOverview,
  EffectiveDays,
  Pacing,
  PacingParams,
  PasswordResetResponse,
  SchoolClass,
  SessionListParams,
  SessionListResponse,
  SessionLogDetail,
  Subject,
  Subtopic,
  Teacher,
  TeacherActivity,
  TeacherDetail,
  TeacherListParams,
  TeacherListResponse,
  TestCoverageRow,
  TimetableSlot,
  UnmarkedSubtopic,
  UpdateTeacherInput,
  AdminUser,
} from "./types";

export const API_PREFIX = process.env.NEXT_PUBLIC_API_PREFIX ?? "/api/admin";

export class ApiError extends Error {
  constructor(
    message: string,
    public statusCode: number,
  ) {
    super(message);
    this.name = "ApiError";
  }

  get isAuth() {
    return this.statusCode === 401;
  }

  get isConflict() {
    return this.statusCode === 409;
  }
}

type QueryValue = string | number | boolean | undefined | null;

function toQuery(params?: Record<string, QueryValue>): string {
  if (!params) return "";
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === "") continue;
    query.set(key, String(value));
  }
  const serialised = query.toString();
  return serialised ? `?${serialised}` : "";
}

class AdminApiClient {
  private async request<T>(path: string, init: RequestInit = {}): Promise<T> {
    let response: Response;

    try {
      response = await fetch(`${API_PREFIX}${path}`, {
        ...init,
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          ...(init.headers as Record<string, string> | undefined),
        },
      });
    } catch {
      throw new ApiError(
        "Could not reach the server. Check your connection and try again.",
        0,
      );
    }

    const json = await response
      .json()
      .catch(() => ({ error: "The server returned an unreadable response." }));

    if (json?.error || !response.ok) {
      const message =
        json?.error ?? `Request failed with status ${response.status}`;
      if (response.status === 401 && typeof window !== "undefined") {
        const here = window.location.pathname + window.location.search;
        if (!window.location.pathname.startsWith("/login")) {
          window.location.href = `/login?next=${encodeURIComponent(here)}`;
        }
      }
      throw new ApiError(message, response.status);
    }

    return json.data as T;
  }

  /* ── Auth ──────────────────────────────────────────────────────────────
   * Login/logout live on the admin auth routes, outside the documented
   * admin resource surface. Paths are configurable via env in case the
   * deployment names them differently.
   */

  login(credentials: { username: string; password: string }) {
    return this.request<{ admin: AdminUser }>("/auth/login", {
      method: "POST",
      body: JSON.stringify(credentials),
    });
  }

  logout() {
    return this.request<{ success: boolean }>("/auth/logout", {
      method: "POST",
    });
  }

  me() {
    return this.request<AdminUser>("/auth/me");
  }

  /* ── Teachers ─────────────────────────────────────────────────────────── */

  listTeachers(params?: TeacherListParams) {
    return this.request<TeacherListResponse>(
      `/teachers${toQuery(params as Record<string, QueryValue>)}`,
    );
  }

  createTeacher(data: CreateTeacherInput) {
    return this.request<CreateTeacherResponse>("/teachers", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  getTeacher(id: number) {
    return this.request<TeacherDetail>(`/teachers/${id}`);
  }

  updateTeacher(id: number, data: UpdateTeacherInput) {
    return this.request<Teacher>(`/teachers/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    });
  }

  activateTeacher(id: number) {
    return this.request<Teacher>(`/teachers/${id}/activate`, {
      method: "POST",
    });
  }

  deactivateTeacher(id: number) {
    return this.request<Teacher>(`/teachers/${id}/deactivate`, {
      method: "POST",
    });
  }

  resetTeacherPassword(id: number) {
    return this.request<PasswordResetResponse>(`/teachers/${id}/password`, {
      method: "POST",
    });
  }

  /* ── Assignments ──────────────────────────────────────────────────────── */

  listAssignments(params?: AssignmentParams) {
    return this.request<Assignment[]>(
      `/assignments${toQuery(params as Record<string, QueryValue>)}`,
    );
  }

  createAssignment(data: {
    teacherId: number;
    classroomId: number;
    subjectId: number;
  }) {
    return this.request<Assignment>("/assignments", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  deactivateAssignment(id: number) {
    return this.request<Assignment>(`/assignments/${id}`, { method: "DELETE" });
  }

  /* ── Subjects ─────────────────────────────────────────────────────────── */

  listSubjects(active?: "true" | "false" | "all") {
    return this.request<Subject[]>(`/subjects${toQuery({ active })}`);
  }

  createSubject(data: { name: string; code?: string; displayOrder?: number }) {
    return this.request<Subject>("/subjects", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  updateSubject(
    id: number,
    data: {
      name?: string;
      code?: string | null;
      displayOrder?: number;
      isActive?: boolean;
    },
  ) {
    return this.request<Subject>(`/subjects/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    });
  }

  deleteSubject(id: number) {
    return this.request<Subject>(`/subjects/${id}`, { method: "DELETE" });
  }

  /* ── Chapters ─────────────────────────────────────────────────────────── */

  listChapters(params?: {
    subjectId?: number;
    classId?: number;
    active?: "true" | "false" | "all";
  }) {
    return this.request<Chapter[]>(`/chapters${toQuery(params)}`);
  }

  createChapter(data: {
    subjectId: number;
    classId: number;
    name: string;
    displayOrder?: number;
    periodsRequired?: number;
  }) {
    return this.request<Chapter>("/chapters", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  updateChapter(
    id: number,
    data: {
      name?: string;
      displayOrder?: number;
      periodsRequired?: number | null;
      isActive?: boolean;
    },
  ) {
    return this.request<Chapter>(`/chapters/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    });
  }

  deleteChapter(id: number) {
    return this.request<Chapter>(`/chapters/${id}`, { method: "DELETE" });
  }

  /* ── Subtopics ────────────────────────────────────────────────────────── */

  listSubtopics(chapterId: number, active?: "true" | "false" | "all") {
    return this.request<Subtopic[]>(`/subtopics${toQuery({ chapterId, active })}`);
  }

  createSubtopic(data: {
    chapterId: number;
    name: string;
    displayOrder?: number;
  }) {
    return this.request<Subtopic>("/subtopics", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  updateSubtopic(
    id: number,
    data: { name?: string; displayOrder?: number; isActive?: boolean },
  ) {
    return this.request<Subtopic>(`/subtopics/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    });
  }

  deleteSubtopic(id: number) {
    return this.request<Subtopic>(`/subtopics/${id}`, { method: "DELETE" });
  }

  /* ── Calendar ─────────────────────────────────────────────────────────── */

  listCalendarEvents(
    sessionId: number,
    params?: { type?: CalendarEventType; from?: string; to?: string },
  ) {
    return this.request<CalendarEvent[]>(
      `/calendar${toQuery({ sessionId, ...params })}`,
    );
  }

  createCalendarEvent(data: {
    sessionId: number;
    title: string;
    type: CalendarEventType;
    startDate: string;
    endDate: string;
    description?: string;
  }) {
    return this.request<CalendarEvent>("/calendar", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  updateCalendarEvent(
    id: number,
    data: {
      title?: string;
      type?: CalendarEventType;
      startDate?: string;
      endDate?: string;
      description?: string | null;
    },
  ) {
    return this.request<CalendarEvent>(`/calendar/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    });
  }

  deleteCalendarEvent(id: number) {
    return this.request<{ deleted: boolean }>(`/calendar/${id}`, {
      method: "DELETE",
    });
  }

  getEffectiveDays(from: string, to: string) {
    return this.request<EffectiveDays>(
      `/calendar/effective-days${toQuery({ from, to })}`,
    );
  }

  /* ── Dashboard ────────────────────────────────────────────────────────── */

  getDashboardOverview(sessionId?: number) {
    return this.request<DashboardOverview>(
      `/dashboard/overview${toQuery({ sessionId })}`,
    );
  }

  getDashboardProgress(sessionId?: number) {
    return this.request<ClassroomProgress[]>(
      `/dashboard/progress${toQuery({ sessionId })}`,
    );
  }

  getTeacherActivity() {
    return this.request<TeacherActivity[]>("/dashboard/activity");
  }

  getTestCoverage(subjectId?: number) {
    return this.request<TestCoverageRow[]>(
      `/dashboard/test-coverage${toQuery({ subjectId })}`,
    );
  }

  getUnmarkedSubtopics(params?: { classId?: number; subjectId?: number }) {
    return this.request<UnmarkedSubtopic[]>(
      `/dashboard/unmarked${toQuery(params)}`,
    );
  }

  /* ── Session logs ─────────────────────────────────────────────────────── */

  listSessions(params?: SessionListParams) {
    return this.request<SessionListResponse>(
      `/sessions${toQuery(params as Record<string, QueryValue>)}`,
    );
  }

  getSession(id: number) {
    return this.request<SessionLogDetail>(`/sessions/${id}`);
  }

  deleteSession(id: number) {
    return this.request<{ deleted: boolean }>(`/sessions/${id}`, {
      method: "DELETE",
    });
  }

  /* ── Pacing ───────────────────────────────────────────────────────────── */

  listPacing(params?: PacingParams) {
    return this.request<Pacing[]>(
      `/pacing${toQuery(params as Record<string, QueryValue>)}`,
    );
  }

  getBehindPacing() {
    return this.request<Pacing[]>("/pacing/behind");
  }

  recalculatePacing(params?: { assignmentId?: number; sessionId?: number }) {
    return this.request<{ recalculated?: number; scope: string }>(
      `/pacing/recalculate${toQuery(params)}`,
      { method: "POST" },
    );
  }

  /* ── Attendance ───────────────────────────────────────────────────────── */

  listAttendance(params?: {
    teacherId?: number;
    from?: string;
    to?: string;
  }) {
    return this.request<AttendanceRecord[]>(`/attendance${toQuery(params)}`);
  }

  recordAttendance(data: {
    teacherId: number;
    date: string;
    status: AttendanceStatus;
    remarks?: string;
  }) {
    return this.request<AttendanceRecord>("/attendance", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  correctAttendance(
    id: number,
    data: { status?: AttendanceStatus; remarks?: string | null },
  ) {
    return this.request<AttendanceRecord>(`/attendance/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    });
  }

  /* ── Timetable ────────────────────────────────────────────────────────── */

  listTimetable(params?: {
    dayOfWeek?: number;
    classroomId?: number;
    teacherId?: number;
  }) {
    return this.request<TimetableSlot[]>(`/timetable${toQuery(params)}`);
  }

  createTimetableSlot(data: {
    assignmentId: number;
    dayOfWeek: number;
    periodNumber: number;
    startTime: string;
    endTime: string;
    roomLabel?: string;
  }) {
    return this.request<TimetableSlot>("/timetable", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  updateTimetableSlot(
    id: number,
    data: { startTime?: string; endTime?: string; roomLabel?: string | null },
  ) {
    return this.request<TimetableSlot>(`/timetable/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    });
  }

  deleteTimetableSlot(id: number) {
    return this.request<{ deleted: boolean }>(`/timetable/${id}`, {
      method: "DELETE",
    });
  }

  /* ── Audit logs ───────────────────────────────────────────────────────── */

  listAuditLogs(params?: AuditLogParams) {
    return this.request<AuditLogListResponse>(
      `/audit-logs${toQuery(params as Record<string, QueryValue>)}`,
    );
  }

  getAuditLog(id: number) {
    return this.request<AuditLogDetail>(`/audit-logs/${id}`);
  }

  /* ── Reference data ───────────────────────────────────────────────────────
   * Academic sessions, classes and classrooms are created outside the
   * documented admin resource surface, so these read endpoints are an
   * assumption. Callers treat a 404 as "no lookup available" and degrade to
   * deriving options from the assignment list.
   */

  listAcademicSessions() {
    return this.request<AcademicSession[]>("/academic-sessions");
  }

  listClasses() {
    return this.request<SchoolClass[]>("/classes");
  }

  listClassrooms(sessionId?: number) {
    return this.request<Classroom[]>(`/classrooms${toQuery({ sessionId })}`);
  }
}

export const adminApi = new AdminApiClient();
