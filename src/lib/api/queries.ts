"use client";

/**
 * React Query bindings for the Admin API.
 * Query keys are structured so that a mutation can invalidate a whole
 * resource family with one call: ["teachers"], ["pacing"], and so on.
 */

import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseQueryOptions,
} from "@tanstack/react-query";

import { adminApi, ApiError } from "./client";
import type {
  AcademicSession,
  Assignment,
  AssignmentParams,
  AttendanceStatus,
  AuditLogParams,
  CalendarEventType,
  Classroom,
  CreateTeacherInput,
  PacingParams,
  SchoolClass,
  SessionListParams,
  TeacherListParams,
  UpdateTeacherInput,
} from "./types";

export const keys = {
  me: ["me"] as const,
  teachers: (params?: TeacherListParams) => ["teachers", params ?? {}] as const,
  teacher: (id: number) => ["teachers", id] as const,
  assignments: (params?: AssignmentParams) =>
    ["assignments", params ?? {}] as const,
  subjects: (active?: string) => ["subjects", active ?? "true"] as const,
  chapters: (params?: object) => ["chapters", params ?? {}] as const,
  subtopics: (chapterId?: number) => ["subtopics", chapterId ?? null] as const,
  calendar: (sessionId?: number, params?: object) =>
    ["calendar", sessionId ?? null, params ?? {}] as const,
  effectiveDays: (from: string, to: string) =>
    ["calendar", "effective-days", from, to] as const,
  overview: (sessionId?: number) => ["dashboard", "overview", sessionId ?? null] as const,
  progress: (sessionId?: number) => ["dashboard", "progress", sessionId ?? null] as const,
  activity: ["dashboard", "activity"] as const,
  testCoverage: (subjectId?: number) =>
    ["dashboard", "test-coverage", subjectId ?? null] as const,
  unmarked: (params?: object) => ["dashboard", "unmarked", params ?? {}] as const,
  sessions: (params?: SessionListParams) => ["sessions", params ?? {}] as const,
  session: (id: number) => ["sessions", id] as const,
  pacing: (params?: PacingParams) => ["pacing", params ?? {}] as const,
  pacingBehind: ["pacing", "behind"] as const,
  attendance: (params?: object) => ["attendance", params ?? {}] as const,
  timetable: (params?: object) => ["timetable", params ?? {}] as const,
  auditLogs: (params?: AuditLogParams) => ["audit-logs", params ?? {}] as const,
  auditLog: (id: number) => ["audit-logs", id] as const,
  lookups: ["lookups"] as const,
};

/** Anything that changes syllabus coverage, the calendar or attendance moves
 *  pacing, which in turn moves the dashboard. Invalidate the lot. */
const PACING_DEPENDENTS = ["pacing", "dashboard"];

function useInvalidate() {
  const client = useQueryClient();
  return (...families: string[]) => {
    for (const family of families) {
      void client.invalidateQueries({ queryKey: [family] });
    }
  };
}

/* ── Auth ────────────────────────────────────────────────────────────────── */

export function useMe() {
  return useQuery({
    queryKey: keys.me,
    queryFn: () => adminApi.me(),
    retry: false,
    staleTime: 5 * 60_000,
  });
}

export function useLogin() {
  return useMutation({
    mutationFn: (creds: { phone: string; password: string }) =>
      adminApi.login(creds),
  });
}

export function useLogout() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: () => adminApi.logout(),
    onSettled: () => client.clear(),
  });
}

/* ── Teachers ────────────────────────────────────────────────────────────── */

export function useTeachers(params: TeacherListParams) {
  return useQuery({
    queryKey: keys.teachers(params),
    queryFn: () => adminApi.listTeachers(params),
    placeholderData: (previous) => previous,
  });
}

export function useTeacher(id: number, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: keys.teacher(id),
    queryFn: () => adminApi.getTeacher(id),
    enabled: options?.enabled ?? Number.isFinite(id),
  });
}

export function useCreateTeacher() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: (input: CreateTeacherInput) => adminApi.createTeacher(input),
    onSuccess: () => invalidate("teachers", "audit-logs", "dashboard"),
  });
}

export function useUpdateTeacher() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: UpdateTeacherInput }) =>
      adminApi.updateTeacher(id, data),
    onSuccess: () => invalidate("teachers", "audit-logs"),
  });
}

export function useSetTeacherActive() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: ({ id, active }: { id: number; active: boolean }) =>
      active ? adminApi.activateTeacher(id) : adminApi.deactivateTeacher(id),
    onSuccess: () => invalidate("teachers", "audit-logs", "dashboard"),
  });
}

export function useResetTeacherPassword() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: (id: number) => adminApi.resetTeacherPassword(id),
    onSuccess: () => invalidate("audit-logs"),
  });
}

/* ── Assignments ─────────────────────────────────────────────────────────── */

export function useAssignments(
  params?: AssignmentParams,
  options?: { enabled?: boolean },
) {
  return useQuery({
    queryKey: keys.assignments(params),
    queryFn: () => adminApi.listAssignments(params),
    enabled: options?.enabled ?? true,
  });
}

export function useCreateAssignment() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: (data: {
      teacherId: number;
      classroomId: number;
      subjectId: number;
    }) => adminApi.createAssignment(data),
    onSuccess: () =>
      invalidate("assignments", "teachers", "audit-logs", ...PACING_DEPENDENTS),
  });
}

export function useDeactivateAssignment() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: (id: number) => adminApi.deactivateAssignment(id),
    onSuccess: () =>
      invalidate(
        "assignments",
        "teachers",
        "timetable",
        "audit-logs",
        ...PACING_DEPENDENTS,
      ),
  });
}

/* ── Subjects ────────────────────────────────────────────────────────────── */

export function useSubjects(active: "true" | "false" | "all" = "all") {
  return useQuery({
    queryKey: keys.subjects(active),
    queryFn: () => adminApi.listSubjects(active),
    staleTime: 60_000,
  });
}

export function useCreateSubject() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: (data: { name: string; code?: string; displayOrder?: number }) =>
      adminApi.createSubject(data),
    onSuccess: () => invalidate("subjects", "dashboard"),
  });
}

export function useUpdateSubject() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: number;
      data: {
        name?: string;
        code?: string | null;
        displayOrder?: number;
        isActive?: boolean;
      };
    }) => adminApi.updateSubject(id, data),
    onSuccess: () => invalidate("subjects", "dashboard"),
  });
}

export function useDeleteSubject() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: (id: number) => adminApi.deleteSubject(id),
    onSuccess: () => invalidate("subjects", "chapters", "dashboard"),
  });
}

/* ── Chapters ────────────────────────────────────────────────────────────── */

export function useChapters(
  params: { subjectId?: number; classId?: number; active?: "true" | "false" | "all" },
  options?: { enabled?: boolean },
) {
  return useQuery({
    queryKey: keys.chapters(params),
    queryFn: () => adminApi.listChapters(params),
    enabled: options?.enabled ?? true,
  });
}

export function useCreateChapter() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: (data: {
      subjectId: number;
      classId: number;
      name: string;
      displayOrder?: number;
      periodsRequired?: number;
    }) => adminApi.createChapter(data),
    onSuccess: () => invalidate("chapters", ...PACING_DEPENDENTS),
  });
}

export function useUpdateChapter() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: number;
      data: {
        name?: string;
        displayOrder?: number;
        periodsRequired?: number | null;
        isActive?: boolean;
      };
    }) => adminApi.updateChapter(id, data),
    onSuccess: () => invalidate("chapters", ...PACING_DEPENDENTS),
  });
}

export function useDeleteChapter() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: (id: number) => adminApi.deleteChapter(id),
    onSuccess: () => invalidate("chapters", "subtopics", ...PACING_DEPENDENTS),
  });
}

/* ── Subtopics ───────────────────────────────────────────────────────────── */

export function useSubtopics(chapterId?: number) {
  return useQuery({
    queryKey: keys.subtopics(chapterId),
    queryFn: () => adminApi.listSubtopics(chapterId as number, "all"),
    enabled: typeof chapterId === "number",
  });
}

export function useCreateSubtopic() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: (data: {
      chapterId: number;
      name: string;
      displayOrder?: number;
    }) => adminApi.createSubtopic(data),
    onSuccess: () => invalidate("subtopics", "chapters", ...PACING_DEPENDENTS),
  });
}

export function useUpdateSubtopic() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: number;
      data: { name?: string; displayOrder?: number; isActive?: boolean };
    }) => adminApi.updateSubtopic(id, data),
    onSuccess: () => invalidate("subtopics", "chapters", ...PACING_DEPENDENTS),
  });
}

export function useDeleteSubtopic() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: (id: number) => adminApi.deleteSubtopic(id),
    onSuccess: () => invalidate("subtopics", "chapters", ...PACING_DEPENDENTS),
  });
}

/* ── Calendar ────────────────────────────────────────────────────────────── */

export function useCalendarEvents(
  sessionId: number | undefined,
  params?: { type?: CalendarEventType; from?: string; to?: string },
) {
  return useQuery({
    queryKey: keys.calendar(sessionId, params),
    queryFn: () => adminApi.listCalendarEvents(sessionId as number, params),
    enabled: typeof sessionId === "number",
  });
}

export function useEffectiveDays(
  from: string,
  to: string,
  options?: { enabled?: boolean },
) {
  return useQuery({
    queryKey: keys.effectiveDays(from, to),
    queryFn: () => adminApi.getEffectiveDays(from, to),
    enabled: options?.enabled ?? Boolean(from && to),
  });
}

export function useCreateCalendarEvent() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: (data: {
      sessionId: number;
      title: string;
      type: CalendarEventType;
      startDate: string;
      endDate: string;
      description?: string;
    }) => adminApi.createCalendarEvent(data),
    onSuccess: () => invalidate("calendar", "audit-logs", ...PACING_DEPENDENTS),
  });
}

export function useUpdateCalendarEvent() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: number;
      data: {
        title?: string;
        type?: CalendarEventType;
        startDate?: string;
        endDate?: string;
        description?: string | null;
      };
    }) => adminApi.updateCalendarEvent(id, data),
    onSuccess: () => invalidate("calendar", "audit-logs", ...PACING_DEPENDENTS),
  });
}

export function useDeleteCalendarEvent() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: (id: number) => adminApi.deleteCalendarEvent(id),
    onSuccess: () => invalidate("calendar", "audit-logs", ...PACING_DEPENDENTS),
  });
}

/* ── Dashboard ───────────────────────────────────────────────────────────── */

export function useOverview(sessionId?: number) {
  return useQuery({
    queryKey: keys.overview(sessionId),
    queryFn: () => adminApi.getDashboardOverview(sessionId),
  });
}

export function useProgress(sessionId?: number) {
  return useQuery({
    queryKey: keys.progress(sessionId),
    queryFn: () => adminApi.getDashboardProgress(sessionId),
  });
}

export function useTeacherActivity() {
  return useQuery({
    queryKey: keys.activity,
    queryFn: () => adminApi.getTeacherActivity(),
  });
}

export function useTestCoverage(subjectId?: number) {
  return useQuery({
    queryKey: keys.testCoverage(subjectId),
    queryFn: () => adminApi.getTestCoverage(subjectId),
  });
}

export function useUnmarkedSubtopics(params?: {
  classId?: number;
  subjectId?: number;
}) {
  return useQuery({
    queryKey: keys.unmarked(params),
    queryFn: () => adminApi.getUnmarkedSubtopics(params),
  });
}

/* ── Session logs ────────────────────────────────────────────────────────── */

export function useSessions(params: SessionListParams) {
  return useQuery({
    queryKey: keys.sessions(params),
    queryFn: () => adminApi.listSessions(params),
    placeholderData: (previous) => previous,
  });
}

export function useSessionDetail(id: number | null) {
  return useQuery({
    queryKey: keys.session(id ?? -1),
    queryFn: () => adminApi.getSession(id as number),
    enabled: typeof id === "number",
  });
}

export function useDeleteSession() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: (id: number) => adminApi.deleteSession(id),
    onSuccess: () => invalidate("sessions", "audit-logs", ...PACING_DEPENDENTS),
  });
}

/* ── Pacing ──────────────────────────────────────────────────────────────── */

export function usePacing(
  params?: PacingParams,
  options?: { enabled?: boolean },
) {
  return useQuery({
    queryKey: keys.pacing(params),
    queryFn: () => adminApi.listPacing(params),
    enabled: options?.enabled ?? true,
  });
}

export function useBehindPacing(
  options?: Partial<UseQueryOptions<Awaited<ReturnType<typeof adminApi.getBehindPacing>>>>,
) {
  return useQuery({
    queryKey: keys.pacingBehind,
    queryFn: () => adminApi.getBehindPacing(),
    ...options,
  });
}

export function useRecalculatePacing() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: (params?: { assignmentId?: number; sessionId?: number }) =>
      adminApi.recalculatePacing(params),
    onSuccess: () => invalidate(...PACING_DEPENDENTS),
  });
}

/* ── Attendance ──────────────────────────────────────────────────────────── */

export function useAttendance(params?: {
  teacherId?: number;
  from?: string;
  to?: string;
}) {
  return useQuery({
    queryKey: keys.attendance(params),
    queryFn: () => adminApi.listAttendance(params),
  });
}

export function useRecordAttendance() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: (data: {
      teacherId: number;
      date: string;
      status: AttendanceStatus;
      remarks?: string;
    }) => adminApi.recordAttendance(data),
    onSuccess: () => invalidate("attendance", "audit-logs", ...PACING_DEPENDENTS),
  });
}

export function useCorrectAttendance() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: number;
      data: { status?: AttendanceStatus; remarks?: string | null };
    }) => adminApi.correctAttendance(id, data),
    onSuccess: () => invalidate("attendance", "audit-logs", ...PACING_DEPENDENTS),
  });
}

/* ── Timetable ───────────────────────────────────────────────────────────── */

export function useTimetable(params?: {
  dayOfWeek?: number;
  classroomId?: number;
  teacherId?: number;
}) {
  return useQuery({
    queryKey: keys.timetable(params),
    queryFn: () => adminApi.listTimetable(params),
  });
}

export function useCreateTimetableSlot() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: (data: {
      assignmentId: number;
      dayOfWeek: number;
      periodNumber: number;
      startTime: string;
      endTime: string;
      roomLabel?: string;
    }) => adminApi.createTimetableSlot(data),
    onSuccess: () => invalidate("timetable"),
  });
}

export function useUpdateTimetableSlot() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: number;
      data: { startTime?: string; endTime?: string; roomLabel?: string | null };
    }) => adminApi.updateTimetableSlot(id, data),
    onSuccess: () => invalidate("timetable"),
  });
}

export function useDeleteTimetableSlot() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: (id: number) => adminApi.deleteTimetableSlot(id),
    onSuccess: () => invalidate("timetable"),
  });
}

/* ── Audit logs ──────────────────────────────────────────────────────────── */

export function useAuditLogs(params: AuditLogParams) {
  return useQuery({
    queryKey: keys.auditLogs(params),
    queryFn: () => adminApi.listAuditLogs(params),
    placeholderData: (previous) => previous,
  });
}

export function useAuditLogDetail(id: number | null) {
  return useQuery({
    queryKey: keys.auditLog(id ?? -1),
    queryFn: () => adminApi.getAuditLog(id as number),
    enabled: typeof id === "number",
  });
}

/* ── Reference data ──────────────────────────────────────────────────────────
 * Academic sessions / classes / classrooms are not part of the documented
 * resource surface. We ask for them, and if the deployment does not expose
 * them we fall back to deriving the options from the assignment list so the
 * pickers still work.
 */

export function useLookups() {
  const assignments = useAssignments({ active: "all" });

  const remote = useQuery({
    queryKey: keys.lookups,
    queryFn: async () => {
      const [sessions, classes, classrooms] = await Promise.all([
        adminApi
          .listAcademicSessions()
          .catch((error) => swallowMissing<AcademicSession>(error)),
        adminApi.listClasses().catch((error) => swallowMissing<SchoolClass>(error)),
        adminApi.listClassrooms().catch((error) => swallowMissing<Classroom>(error)),
      ]);
      return { sessions, classes, classrooms };
    },
    staleTime: 5 * 60_000,
  });

  const derived = deriveLookups(assignments.data ?? []);

  return {
    isLoading: remote.isLoading || assignments.isLoading,
    sessions: remote.data?.sessions?.length
      ? remote.data.sessions
      : derived.sessions,
    classes: remote.data?.classes?.length ? remote.data.classes : derived.classes,
    classrooms: remote.data?.classrooms?.length
      ? remote.data.classrooms
      : derived.classrooms,
    currentSessionId:
      (remote.data?.sessions ?? derived.sessions).find((s) => s.isCurrent)?.id ??
      (remote.data?.sessions ?? derived.sessions)[0]?.id,
  };
}

function swallowMissing<T>(error: unknown): T[] {
  if (error instanceof ApiError && (error.statusCode === 404 || error.statusCode === 400)) {
    return [];
  }
  if (error instanceof ApiError && error.statusCode === 401) throw error;
  return [];
}

function deriveLookups(assignments: Assignment[]) {
  const sessions = new Map<number, AcademicSession>();
  const classes = new Map<number, SchoolClass>();
  const classrooms = new Map<number, Classroom>();

  for (const assignment of assignments) {
    const { classroom } = assignment;
    if (classroom?.session) sessions.set(classroom.session.id, classroom.session);
    if (classroom?.class) classes.set(classroom.class.id, classroom.class);
    if (classroom) classrooms.set(classroom.id, classroom);
  }

  return {
    sessions: [...sessions.values()].sort((a, b) => a.id - b.id),
    classes: [...classes.values()].sort((a, b) =>
      a.name.localeCompare(b.name, undefined, { numeric: true }),
    ),
    classrooms: [...classrooms.values()].sort((a, b) =>
      `${a.class.name}${a.section ?? ""}`.localeCompare(
        `${b.class.name}${b.section ?? ""}`,
        undefined,
        { numeric: true },
      ),
    ),
  };
}
