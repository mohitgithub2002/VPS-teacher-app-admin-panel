/**
 * Demo backend: implements the documented Admin API surface against the
 * in-memory dataset, including the `{ data }` / `{ error }` envelope, the
 * documented status codes, clash detection, soft deletes and audit writes.
 *
 * Only reached when ADMIN_API_BASE_URL is unset.
 */

import {
  computePacing,
  getDb,
  nextSequence,
  type MockAssignment,
  type MockChapter,
  type MockClassroom,
  type MockDb,
  type MockSessionLog,
  type MockTeacher,
  type MockTopic,
} from "./db";
import type {
  AttendanceStatus,
  CalendarEventType,
  PacingStatus,
  SessionLogType,
} from "@/lib/api/types";

export interface MockResponse {
  status: number;
  data?: unknown;
  error?: string;
  setSession?: boolean;
  clearSession?: boolean;
}

const ok = (data: unknown): MockResponse => ({ status: 200, data });
const created = (data: unknown): MockResponse => ({ status: 201, data });
const bad = (error: string): MockResponse => ({ status: 400, error });
const notFound = (error = "not found"): MockResponse => ({ status: 404, error });
const conflict = (error: string): MockResponse => ({ status: 409, error });

const ATTENDANCE_STATUSES: AttendanceStatus[] = [
  "PRESENT",
  "ABSENT",
  "HALF_DAY",
  "ON_LEAVE",
];
const EVENT_TYPES: CalendarEventType[] = ["HOLIDAY", "EXAM", "EVENT"];
const SESSION_TYPES: SessionLogType[] = ["TEACHING", "REVISION", "QA", "TEST"];

/* ── shaping ─────────────────────────────────────────────────────────────── */

function shapeTeacher(db: MockDb, teacher: MockTeacher, withCount = false) {
  const { password: _password, ...rest } = teacher;
  if (!withCount) return rest;
  return {
    ...rest,
    _count: {
      assignments: db.assignments.filter(
        (a) => a.teacherId === teacher.id && a.isActive,
      ).length,
    },
  };
}

function shapeClassroom(db: MockDb, classroom?: MockClassroom) {
  if (!classroom) return null;
  const cls = db.classes.find((c) => c.id === classroom.classId);
  const session = db.academicSessions.find((s) => s.id === classroom.sessionId);
  return {
    id: classroom.id,
    section: classroom.section,
    class: cls ? { id: cls.id, name: cls.name } : null,
    session: session
      ? { id: session.id, name: session.name, isCurrent: session.isCurrent }
      : null,
  };
}

function shapeAssignment(db: MockDb, assignment: MockAssignment) {
  const teacher = db.teachers.find((t) => t.id === assignment.teacherId);
  const subject = db.subjects.find((s) => s.id === assignment.subjectId);
  const classroom = db.classrooms.find((c) => c.id === assignment.classroomId);
  return {
    id: assignment.id,
    teacherId: assignment.teacherId,
    classroomId: assignment.classroomId,
    subjectId: assignment.subjectId,
    isActive: assignment.isActive,
    teacher: teacher
      ? { id: teacher.id, name: teacher.name, employeeId: teacher.employeeId }
      : null,
    subject: subject ? { id: subject.id, name: subject.name } : null,
    classroom: shapeClassroom(db, classroom),
  };
}

function shapeChapter(db: MockDb, chapter: MockChapter) {
  const subject = db.subjects.find((s) => s.id === chapter.subjectId);
  const cls = db.classes.find((c) => c.id === chapter.classId);
  return {
    ...chapter,
    subject: subject ? { id: subject.id, name: subject.name } : null,
    class: cls ? { id: cls.id, name: cls.name } : null,
    _count: {
      topics: db.topics.filter((t) => t.chapterId === chapter.id && t.isActive)
        .length,
    },
  };
}

function shapeTopic(db: MockDb, topic: MockTopic) {
  return {
    ...topic,
    _count: {
      subtopics: db.subtopics.filter((s) => s.topicId === topic.id && s.isActive)
        .length,
    },
  };
}

/** Session logs carry the classroom label as "Class 8-A" in the API examples. */
function shapeSessionAssignment(db: MockDb, assignment?: MockAssignment) {
  if (!assignment) return null;
  const teacher = db.teachers.find((t) => t.id === assignment.teacherId);
  const subject = db.subjects.find((s) => s.id === assignment.subjectId);
  const classroom = db.classrooms.find((c) => c.id === assignment.classroomId);
  const cls = db.classes.find((c) => c.id === classroom?.classId);
  return {
    id: assignment.id,
    teacher: teacher
      ? { id: teacher.id, name: teacher.name, employeeId: teacher.employeeId }
      : null,
    subject: subject ? { id: subject.id, name: subject.name } : null,
    classroom: classroom
      ? {
          id: classroom.id,
          class: cls
            ? { id: cls.id, name: `${cls.name}-${classroom.section}` }
            : null,
        }
      : null,
  };
}

function shapeSessionLog(db: MockDb, log: MockSessionLog) {
  const assignment = db.assignments.find((a) => a.id === log.assignmentId);
  return {
    ...log,
    assignment: shapeSessionAssignment(db, assignment),
    _count: {
      topics: db.sessionTopics.filter((t) => t.sessionLogId === log.id).length,
    },
  };
}

function shapePacing(db: MockDb, row: MockDb["pacing"][number]) {
  const chapter = db.chapters.find((c) => c.id === row.chapterId);
  const assignment = db.assignments.find((a) => a.id === row.assignmentId);
  return {
    id: row.id,
    assignmentId: row.assignmentId,
    chapterId: row.chapterId,
    completionPercent: row.completionPercent,
    status: row.status,
    daysBehind: row.daysBehind,
    chapter: chapter
      ? { id: chapter.id, name: chapter.name, displayOrder: chapter.displayOrder }
      : null,
    assignment: shapeSessionAssignment(db, assignment),
  };
}

function shapeAttendance(db: MockDb, record: MockDb["attendance"][number]) {
  const teacher = db.teachers.find((t) => t.id === record.teacherId);
  return {
    ...record,
    teacher: teacher
      ? { id: teacher.id, name: teacher.name, employeeId: teacher.employeeId }
      : null,
  };
}

function shapeTimetableSlot(db: MockDb, slot: MockDb["timetable"][number]) {
  const assignment = db.assignments.find((a) => a.id === slot.assignmentId);
  return { ...slot, assignment: shapeSessionAssignment(db, assignment) };
}

/* ── helpers ─────────────────────────────────────────────────────────────── */

function paginate<T>(items: T[], page = 1, pageSize = 50) {
  const size = Math.min(Math.max(pageSize, 1), 200);
  const current = Math.max(page, 1);
  const start = (current - 1) * size;
  return {
    slice: items.slice(start, start + size),
    pagination: {
      page: current,
      pageSize: size,
      total: items.length,
      pages: Math.max(1, Math.ceil(items.length / size)),
    },
  };
}

function num(value: string | null): number | undefined {
  if (value === null || value.trim() === "") return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function dayStart(value: string): number {
  return new Date(`${value.slice(0, 10)}T00:00:00.000Z`).getTime();
}

function audit(
  db: MockDb,
  action: string,
  entityType: string,
  entityId: number,
  oldValue: Record<string, unknown> | null,
  newValue: Record<string, unknown> | null,
) {
  db.auditLogs.unshift({
    id: nextSequence(db, "auditLogs"),
    actorType: "ADMIN",
    actorId: db.admin.id,
    actorName: db.admin.name,
    action,
    entityType,
    entityId,
    oldValue,
    newValue,
    createdAt: new Date().toISOString(),
  });
}

function tempPassword(): string {
  const alphabet = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let out = "";
  for (let i = 0; i < 8; i += 1) {
    out += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return out;
}

function isTeachingDay(db: MockDb, time: number): boolean {
  const date = new Date(time);
  if (date.getUTCDay() === 0) return false;
  return !db.calendarEvents.some(
    (event) => time >= dayStart(event.startDate) && time <= dayStart(event.endDate),
  );
}

function currentSessionId(db: MockDb): number {
  return (
    db.academicSessions.find((s) => s.isCurrent)?.id ??
    db.academicSessions[0]?.id ??
    1
  );
}

function recalcPacing(db: MockDb) {
  db.pacing = computePacing(db);
}

/* ── router ──────────────────────────────────────────────────────────────── */

export function handleMockRequest(
  method: string,
  segments: string[],
  search: URLSearchParams,
  body: Record<string, unknown> | null,
  authenticated: boolean,
): MockResponse {
  const db = getDb();
  const [resource, second, third] = segments;

  /* ── auth ─────────────────────────────────────────────────────────────── */

  if (resource === "auth") {
    if (second === "login" && method === "POST") {
      const username = String(body?.username ?? "").trim();
      const password = String(body?.password ?? "");
      if (!username || !password) {
        return bad("username and password are required");
      }
      // Demo backend: any non-empty credentials are accepted.
      return { ...ok({ admin: db.admin }), setSession: true };
    }
    if (second === "logout" && method === "POST") {
      return { ...ok({ success: true }), clearSession: true };
    }
    if (second === "me" && method === "GET") {
      if (!authenticated) return { status: 401, error: "unauthorized" };
      return ok(db.admin);
    }
    return notFound("unknown auth route");
  }

  if (!authenticated) {
    return { status: 401, error: "admin session required" };
  }

  /* ── reference data ───────────────────────────────────────────────────── */

  if (resource === "academic-sessions" && method === "GET") {
    return ok(db.academicSessions);
  }

  if (resource === "classes" && method === "GET") {
    return ok(db.classes);
  }

  if (resource === "classrooms" && method === "GET") {
    const sessionId = num(search.get("sessionId"));
    return ok(
      db.classrooms
        .filter((c) => sessionId === undefined || c.sessionId === sessionId)
        .map((c) => shapeClassroom(db, c)),
    );
  }

  /* ── teachers ─────────────────────────────────────────────────────────── */

  if (resource === "teachers") {
    const id = num(second ?? null);

    if (!second && method === "GET") {
      const searchTerm = (search.get("search") ?? "").trim().toLowerCase();
      const active = search.get("active");
      let rows = [...db.teachers];
      if (searchTerm) {
        rows = rows.filter(
          (t) =>
            t.name.toLowerCase().includes(searchTerm) ||
            t.employeeId.toLowerCase().includes(searchTerm),
        );
      }
      if (active === "true") rows = rows.filter((t) => t.isActive);
      if (active === "false") rows = rows.filter((t) => !t.isActive);
      rows.sort((a, b) => a.name.localeCompare(b.name));
      const { slice, pagination } = paginate(
        rows,
        num(search.get("page")) ?? 1,
        num(search.get("pageSize")) ?? 50,
      );
      return ok({
        teachers: slice.map((t) => shapeTeacher(db, t, true)),
        pagination,
      });
    }

    if (!second && method === "POST") {
      const employeeId = String(body?.employeeId ?? "").trim();
      const name = String(body?.name ?? "").trim();
      const phone = String(body?.phone ?? "").trim();
      if (!employeeId) return bad("employeeId is required");
      if (!name) return bad("name is required");
      if (!/^\+?\d[\d\s-]{7,14}$/.test(phone)) {
        return bad("a valid phone number is required");
      }
      const custom = body?.password ? String(body.password) : undefined;
      if (custom && custom.length < 8) {
        return bad("password must be at least 8 characters");
      }
      const normalisedPhone = phone.replace(/[\s-]/g, "");
      if (
        db.teachers.some(
          (t) =>
            t.employeeId.toLowerCase() === employeeId.toLowerCase() ||
            t.phone === normalisedPhone,
        )
      ) {
        return conflict("a record with these values already exists");
      }

      const generated = custom ? undefined : tempPassword();
      const teacher: MockTeacher = {
        id: nextSequence(db, "teachers"),
        employeeId,
        name,
        phone: normalisedPhone,
        email: body?.email ? String(body.email) : null,
        qualification: body?.qualification ? String(body.qualification) : null,
        isActive: true,
        lastLoginAt: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        password: custom ?? (generated as string),
      };
      db.teachers.push(teacher);
      audit(db, "TEACHER_CREATED", "Teacher", teacher.id, null, {
        employeeId,
        name,
      });
      return created({
        teacher: shapeTeacher(db, teacher),
        ...(generated ? { temporaryPassword: generated } : {}),
      });
    }

    if (id === undefined) return notFound("teacher not found");
    const teacher = db.teachers.find((t) => t.id === id);
    if (!teacher) return notFound("teacher not found");

    if (!third && method === "GET") {
      const assignments = db.assignments
        .filter((a) => a.teacherId === teacher.id && a.isActive)
        .map((a) => {
          const subject = db.subjects.find((s) => s.id === a.subjectId);
          const classroom = db.classrooms.find((c) => c.id === a.classroomId);
          return {
            id: a.id,
            subject: subject ? { id: subject.id, name: subject.name } : null,
            classroom: shapeClassroom(db, classroom),
          };
        });
      return ok({ ...shapeTeacher(db, teacher), assignments });
    }

    if (!third && method === "PATCH") {
      const patch: Record<string, unknown> = {};
      if (body?.name !== undefined) {
        const name = String(body.name).trim();
        if (!name) return bad("name cannot be empty");
        patch.name = name;
      }
      if (body?.phone !== undefined) {
        const phone = String(body.phone).trim();
        if (!/^\+?\d[\d\s-]{7,14}$/.test(phone)) {
          return bad("a valid phone number is required");
        }
        patch.phone = phone.replace(/[\s-]/g, "");
      }
      if (body?.email !== undefined) {
        patch.email = body.email === null ? null : String(body.email);
      }
      if (body?.qualification !== undefined) {
        patch.qualification =
          body.qualification === null ? null : String(body.qualification);
      }
      if (Object.keys(patch).length === 0) return bad("nothing to update");

      const before = {
        name: teacher.name,
        phone: teacher.phone,
        email: teacher.email,
        qualification: teacher.qualification,
      };
      Object.assign(teacher, patch, { updatedAt: new Date().toISOString() });
      audit(db, "TEACHER_UPDATED", "Teacher", teacher.id, before, patch);
      return ok(shapeTeacher(db, teacher));
    }

    if (third === "activate" && method === "POST") {
      teacher.isActive = true;
      teacher.updatedAt = new Date().toISOString();
      audit(db, "TEACHER_ACTIVATED", "Teacher", teacher.id, { isActive: false }, {
        isActive: true,
      });
      return ok({
        id: teacher.id,
        employeeId: teacher.employeeId,
        name: teacher.name,
        isActive: true,
      });
    }

    if (third === "deactivate" && method === "POST") {
      teacher.isActive = false;
      teacher.updatedAt = new Date().toISOString();
      audit(db, "TEACHER_DEACTIVATED", "Teacher", teacher.id, { isActive: true }, {
        isActive: false,
      });
      return ok({
        id: teacher.id,
        employeeId: teacher.employeeId,
        name: teacher.name,
        isActive: false,
      });
    }

    if (third === "password" && method === "POST") {
      const password = tempPassword();
      teacher.password = password;
      teacher.updatedAt = new Date().toISOString();
      audit(db, "TEACHER_PASSWORD_RESET", "Teacher", teacher.id, null, null);
      return ok({
        teacherId: teacher.id,
        employeeId: teacher.employeeId,
        temporaryPassword: password,
      });
    }

    return notFound("unknown teacher route");
  }

  /* ── assignments ──────────────────────────────────────────────────────── */

  if (resource === "assignments") {
    if (!second && method === "GET") {
      const classroomId = num(search.get("classroomId"));
      const teacherId = num(search.get("teacherId"));
      const sessionId = num(search.get("sessionId"));
      const active = search.get("active") ?? "true";
      let rows = [...db.assignments];
      if (active !== "all") rows = rows.filter((a) => a.isActive === (active === "true"));
      if (classroomId !== undefined) rows = rows.filter((a) => a.classroomId === classroomId);
      if (teacherId !== undefined) rows = rows.filter((a) => a.teacherId === teacherId);
      if (sessionId !== undefined) {
        rows = rows.filter((a) => {
          const classroom = db.classrooms.find((c) => c.id === a.classroomId);
          return classroom?.sessionId === sessionId;
        });
      }
      return ok(rows.map((a) => shapeAssignment(db, a)));
    }

    if (!second && method === "POST") {
      const teacherId = Number(body?.teacherId);
      const classroomId = Number(body?.classroomId);
      const subjectId = Number(body?.subjectId);
      if (!Number.isFinite(teacherId)) return bad("teacherId is required");
      if (!Number.isFinite(classroomId)) return bad("classroomId is required");
      if (!Number.isFinite(subjectId)) return bad("subjectId is required");
      if (!db.teachers.some((t) => t.id === teacherId)) return notFound("teacher not found");
      if (!db.classrooms.some((c) => c.id === classroomId)) return notFound("classroom not found");
      if (!db.subjects.some((s) => s.id === subjectId)) return notFound("subject not found");
      if (
        db.assignments.some(
          (a) =>
            a.isActive &&
            a.classroomId === classroomId &&
            a.subjectId === subjectId,
        )
      ) {
        return conflict("a record with these values already exists");
      }
      const assignment: MockAssignment = {
        id: nextSequence(db, "assignments"),
        teacherId,
        classroomId,
        subjectId,
        isActive: true,
      };
      db.assignments.push(assignment);
      audit(db, "ASSIGNMENT_CREATED", "TeacherAssignment", assignment.id, null, {
        teacherId,
        classroomId,
        subjectId,
      });
      recalcPacing(db);
      return created(shapeAssignment(db, assignment));
    }

    const id = num(second ?? null);
    const assignment = db.assignments.find((a) => a.id === id);
    if (!assignment) return notFound("assignment not found");

    if (method === "DELETE") {
      assignment.isActive = false;
      audit(
        db,
        "ASSIGNMENT_DEACTIVATED",
        "TeacherAssignment",
        assignment.id,
        { isActive: true },
        { isActive: false },
      );
      recalcPacing(db);
      return ok(shapeAssignment(db, assignment));
    }

    return notFound("unknown assignment route");
  }

  /* ── subjects ─────────────────────────────────────────────────────────── */

  if (resource === "subjects") {
    if (!second && method === "GET") {
      const active = search.get("active") ?? "true";
      const rows = db.subjects
        .filter((s) => active === "all" || s.isActive === (active === "true"))
        .sort((a, b) => a.displayOrder - b.displayOrder || a.name.localeCompare(b.name));
      return ok(rows);
    }

    if (!second && method === "POST") {
      const name = String(body?.name ?? "").trim();
      if (!name) return bad("name is required");
      if (db.subjects.some((s) => s.name.toLowerCase() === name.toLowerCase())) {
        return conflict("a record with these values already exists");
      }
      const subject = {
        id: nextSequence(db, "subjects"),
        name,
        code: body?.code ? String(body.code) : null,
        displayOrder: Number(body?.displayOrder ?? 0) || 0,
        isActive: true,
      };
      db.subjects.push(subject);
      audit(db, "SUBJECT_CREATED", "Subject", subject.id, null, { name });
      return created(subject);
    }

    const id = num(second ?? null);
    const subject = db.subjects.find((s) => s.id === id);
    if (!subject) return notFound("subject not found");

    if (method === "PATCH") {
      const before = { ...subject };
      if (body?.name !== undefined) {
        const name = String(body.name).trim();
        if (!name) return bad("name cannot be empty");
        subject.name = name;
      }
      if (body?.code !== undefined) {
        subject.code = body.code === null ? null : String(body.code);
      }
      if (body?.displayOrder !== undefined) {
        subject.displayOrder = Number(body.displayOrder) || 0;
      }
      if (body?.isActive !== undefined) subject.isActive = Boolean(body.isActive);
      audit(db, "SUBJECT_UPDATED", "Subject", subject.id, before, { ...subject });
      return ok(subject);
    }

    if (method === "DELETE") {
      subject.isActive = false;
      audit(db, "SUBJECT_DELETED", "Subject", subject.id, { isActive: true }, {
        isActive: false,
      });
      return ok(subject);
    }

    return notFound("unknown subject route");
  }

  /* ── chapters ─────────────────────────────────────────────────────────── */

  if (resource === "chapters") {
    if (!second && method === "GET") {
      const subjectId = num(search.get("subjectId"));
      const classId = num(search.get("classId"));
      const active = search.get("active") ?? "true";
      const rows = db.chapters
        .filter((c) => (active === "all" ? true : c.isActive === (active === "true")))
        .filter((c) => subjectId === undefined || c.subjectId === subjectId)
        .filter((c) => classId === undefined || c.classId === classId)
        .sort((a, b) => a.displayOrder - b.displayOrder || a.id - b.id);
      return ok(rows.map((c) => shapeChapter(db, c)));
    }

    if (!second && method === "POST") {
      const subjectId = Number(body?.subjectId);
      const classId = Number(body?.classId);
      const name = String(body?.name ?? "").trim();
      if (!Number.isFinite(subjectId)) return bad("subjectId is required");
      if (!Number.isFinite(classId)) return bad("classId is required");
      if (!name) return bad("name is required");
      const chapter: MockChapter = {
        id: nextSequence(db, "chapters"),
        name,
        subjectId,
        classId,
        displayOrder: Number(body?.displayOrder ?? 0) || 0,
        periodsRequired:
          body?.periodsRequired === undefined || body.periodsRequired === null
            ? null
            : Number(body.periodsRequired),
        isActive: true,
      };
      db.chapters.push(chapter);
      audit(db, "CHAPTER_CREATED", "Chapter", chapter.id, null, { name });
      recalcPacing(db);
      return created(shapeChapter(db, chapter));
    }

    const id = num(second ?? null);
    const chapter = db.chapters.find((c) => c.id === id);
    if (!chapter) return notFound("chapter not found");

    if (method === "PATCH") {
      const before = { ...chapter };
      if (body?.name !== undefined) {
        const name = String(body.name).trim();
        if (!name) return bad("name cannot be empty");
        chapter.name = name;
      }
      if (body?.displayOrder !== undefined) {
        chapter.displayOrder = Number(body.displayOrder) || 0;
      }
      if (body?.periodsRequired !== undefined) {
        chapter.periodsRequired =
          body.periodsRequired === null ? null : Number(body.periodsRequired);
      }
      if (body?.isActive !== undefined) chapter.isActive = Boolean(body.isActive);
      audit(db, "CHAPTER_UPDATED", "Chapter", chapter.id, before, { ...chapter });
      recalcPacing(db);
      return ok(shapeChapter(db, chapter));
    }

    if (method === "DELETE") {
      chapter.isActive = false;
      audit(db, "CHAPTER_DELETED", "Chapter", chapter.id, { isActive: true }, {
        isActive: false,
      });
      recalcPacing(db);
      return ok(shapeChapter(db, chapter));
    }

    return notFound("unknown chapter route");
  }

  /* ── topics ───────────────────────────────────────────────────────────── */

  if (resource === "topics") {
    if (!second && method === "GET") {
      const chapterId = num(search.get("chapterId"));
      if (chapterId === undefined) return bad("chapterId is required");
      const active = search.get("active") ?? "true";
      const rows = db.topics
        .filter((t) => t.chapterId === chapterId)
        .filter((t) => (active === "all" ? true : t.isActive === (active === "true")))
        .sort((a, b) => a.displayOrder - b.displayOrder || a.id - b.id);
      return ok(rows.map((t) => shapeTopic(db, t)));
    }

    if (!second && method === "POST") {
      const chapterId = Number(body?.chapterId);
      const name = String(body?.name ?? "").trim();
      if (!Number.isFinite(chapterId)) return bad("chapterId is required");
      if (!name) return bad("name is required");
      if (!db.chapters.some((c) => c.id === chapterId)) return notFound("chapter not found");
      const now = new Date().toISOString();
      const topic: MockTopic = {
        id: nextSequence(db, "topics"),
        chapterId,
        name,
        displayOrder: Number(body?.displayOrder ?? 0) || 0,
        isActive: true,
        createdAt: now,
        updatedAt: now,
      };
      db.topics.push(topic);
      audit(db, "TOPIC_CREATED", "Topic", topic.id, null, { name });
      recalcPacing(db);
      return created(topic);
    }

    const id = num(second ?? null);
    const topic = db.topics.find((t) => t.id === id);
    if (!topic) return notFound("topic not found");

    if (method === "PATCH") {
      const before = { ...topic };
      if (body?.name !== undefined) {
        const name = String(body.name).trim();
        if (!name) return bad("name cannot be empty");
        topic.name = name;
      }
      if (body?.displayOrder !== undefined) {
        topic.displayOrder = Number(body.displayOrder) || 0;
      }
      if (body?.isActive !== undefined) topic.isActive = Boolean(body.isActive);
      topic.updatedAt = new Date().toISOString();
      audit(db, "TOPIC_UPDATED", "Topic", topic.id, before, { ...topic });
      recalcPacing(db);
      return ok(topic);
    }

    if (method === "DELETE") {
      topic.isActive = false;
      topic.updatedAt = new Date().toISOString();
      audit(db, "TOPIC_DELETED", "Topic", topic.id, { isActive: true }, {
        isActive: false,
      });
      recalcPacing(db);
      return ok(topic);
    }

    return notFound("unknown topic route");
  }

  /* ── subtopics ────────────────────────────────────────────────────────── */

  if (resource === "subtopics") {
    if (!second && method === "GET") {
      const topicId = num(search.get("topicId"));
      if (topicId === undefined) return bad("topicId is required");
      const active = search.get("active") ?? "true";
      const rows = db.subtopics
        .filter((s) => s.topicId === topicId)
        .filter((s) => (active === "all" ? true : s.isActive === (active === "true")))
        .sort((a, b) => a.displayOrder - b.displayOrder || a.id - b.id);
      return ok(rows);
    }

    if (!second && method === "POST") {
      const topicId = Number(body?.topicId);
      const name = String(body?.name ?? "").trim();
      if (!Number.isFinite(topicId)) return bad("topicId is required");
      if (!name) return bad("name is required");
      if (!db.topics.some((t) => t.id === topicId)) return notFound("topic not found");
      const now = new Date().toISOString();
      const subtopic = {
        id: nextSequence(db, "subtopics"),
        topicId,
        name,
        displayOrder: Number(body?.displayOrder ?? 0) || 0,
        isActive: true,
        createdAt: now,
        updatedAt: now,
      };
      db.subtopics.push(subtopic);
      audit(db, "SUBTOPIC_CREATED", "Subtopic", subtopic.id, null, { name });
      recalcPacing(db);
      return created(subtopic);
    }

    const id = num(second ?? null);
    const subtopic = db.subtopics.find((s) => s.id === id);
    if (!subtopic) return notFound("subtopic not found");

    if (method === "PATCH") {
      const before = { ...subtopic };
      if (body?.name !== undefined) {
        const name = String(body.name).trim();
        if (!name) return bad("name cannot be empty");
        subtopic.name = name;
      }
      if (body?.displayOrder !== undefined) {
        subtopic.displayOrder = Number(body.displayOrder) || 0;
      }
      if (body?.isActive !== undefined) subtopic.isActive = Boolean(body.isActive);
      subtopic.updatedAt = new Date().toISOString();
      audit(db, "SUBTOPIC_UPDATED", "Subtopic", subtopic.id, before, { ...subtopic });
      recalcPacing(db);
      return ok(subtopic);
    }

    if (method === "DELETE") {
      subtopic.isActive = false;
      subtopic.updatedAt = new Date().toISOString();
      audit(db, "SUBTOPIC_DELETED", "Subtopic", subtopic.id, { isActive: true }, {
        isActive: false,
      });
      recalcPacing(db);
      return ok(subtopic);
    }

    return notFound("unknown subtopic route");
  }

  /* ── calendar ─────────────────────────────────────────────────────────── */

  if (resource === "calendar") {
    if (second === "effective-days" && method === "GET") {
      const from = search.get("from");
      const to = search.get("to");
      if (!from || !to) return bad("from and to are required");
      let cursor = dayStart(from);
      const end = dayStart(to);
      if (Number.isNaN(cursor) || Number.isNaN(end)) return bad("invalid date range");
      let effectiveDays = 0;
      while (cursor <= end) {
        if (isTeachingDay(db, cursor)) effectiveDays += 1;
        cursor += 86_400_000;
      }
      return ok({ from, to, effectiveDays });
    }

    if (!second && method === "GET") {
      const sessionId = num(search.get("sessionId"));
      if (sessionId === undefined) return bad("sessionId is required");
      const type = search.get("type");
      const from = search.get("from");
      const to = search.get("to");
      let rows = db.calendarEvents.filter((e) => e.sessionId === sessionId);
      if (type) rows = rows.filter((e) => e.type === type);
      if (from) rows = rows.filter((e) => dayStart(e.endDate) >= dayStart(from));
      if (to) rows = rows.filter((e) => dayStart(e.startDate) <= dayStart(to));
      rows.sort((a, b) => dayStart(a.startDate) - dayStart(b.startDate));
      return ok(rows);
    }

    if (!second && method === "POST") {
      const sessionId = Number(body?.sessionId);
      const title = String(body?.title ?? "").trim();
      const type = String(body?.type ?? "") as CalendarEventType;
      const startDate = String(body?.startDate ?? "");
      const endDate = String(body?.endDate ?? "");
      if (!Number.isFinite(sessionId)) return bad("sessionId is required");
      if (!title) return bad("title is required");
      if (!EVENT_TYPES.includes(type)) return bad("type must be HOLIDAY, EXAM or EVENT");
      if (!startDate || !endDate) return bad("startDate and endDate are required");
      if (dayStart(endDate) < dayStart(startDate)) {
        return bad("endDate cannot be before startDate");
      }
      const event = {
        id: nextSequence(db, "calendarEvents"),
        sessionId,
        title,
        type,
        startDate: new Date(`${startDate.slice(0, 10)}T00:00:00.000Z`).toISOString(),
        endDate: new Date(`${endDate.slice(0, 10)}T00:00:00.000Z`).toISOString(),
        description: body?.description ? String(body.description) : null,
        createdAt: new Date().toISOString(),
      };
      db.calendarEvents.push(event);
      audit(db, "CALENDAR_EVENT_CREATED", "CalendarEvent", event.id, null, {
        title,
        type,
      });
      recalcPacing(db);
      return created(event);
    }

    const id = num(second ?? null);
    const event = db.calendarEvents.find((e) => e.id === id);
    if (!event) return notFound("calendar event not found");

    if (method === "PATCH") {
      const before = { ...event };
      if (body?.title !== undefined) {
        const title = String(body.title).trim();
        if (!title) return bad("title cannot be empty");
        event.title = title;
      }
      if (body?.type !== undefined) {
        const type = String(body.type) as CalendarEventType;
        if (!EVENT_TYPES.includes(type)) return bad("type must be HOLIDAY, EXAM or EVENT");
        event.type = type;
      }
      if (body?.startDate !== undefined) {
        event.startDate = new Date(
          `${String(body.startDate).slice(0, 10)}T00:00:00.000Z`,
        ).toISOString();
      }
      if (body?.endDate !== undefined) {
        event.endDate = new Date(
          `${String(body.endDate).slice(0, 10)}T00:00:00.000Z`,
        ).toISOString();
      }
      if (dayStart(event.endDate) < dayStart(event.startDate)) {
        Object.assign(event, before);
        return bad("endDate cannot be before startDate");
      }
      if (body?.description !== undefined) {
        event.description = body.description === null ? null : String(body.description);
      }
      audit(db, "CALENDAR_EVENT_UPDATED", "CalendarEvent", event.id, before, {
        ...event,
      });
      recalcPacing(db);
      return ok(event);
    }

    if (method === "DELETE") {
      db.calendarEvents = db.calendarEvents.filter((e) => e.id !== event.id);
      audit(db, "CALENDAR_EVENT_DELETED", "CalendarEvent", event.id, { ...event }, null);
      recalcPacing(db);
      return ok({ deleted: true });
    }

    return notFound("unknown calendar route");
  }

  /* ── dashboard ────────────────────────────────────────────────────────── */

  if (resource === "dashboard") {
    const sessionId = num(search.get("sessionId")) ?? currentSessionId(db);
    const classroomIdsInSession = new Set(
      db.classrooms.filter((c) => c.sessionId === sessionId).map((c) => c.id),
    );
    const sessionAssignments = db.assignments.filter(
      (a) => a.isActive && classroomIdsInSession.has(a.classroomId),
    );
    const assignmentIds = new Set(sessionAssignments.map((a) => a.id));

    if (second === "overview") {
      const todayStart = dayStart(new Date().toISOString());
      const weekStart = todayStart - 6 * 86_400_000;
      const logs = db.sessionLogs.filter((l) => assignmentIds.has(l.assignmentId));
      const pacingRows = db.pacing.filter((p) => assignmentIds.has(p.assignmentId));
      const breakdown: Record<PacingStatus, number> = {
        ON_TRACK: 0,
        BEHIND: 0,
        AHEAD: 0,
        COMPLETED: 0,
      };
      for (const row of pacingRows) breakdown[row.status] += 1;
      const session = db.academicSessions.find((s) => s.id === sessionId);

      return ok({
        session: session ? { id: session.id, name: session.name } : null,
        totalTeachers: db.teachers.filter((t) => t.isActive).length,
        totalAssignments: sessionAssignments.length,
        totalSubjects: db.subjects.filter((s) => s.isActive).length,
        totalChapters: db.chapters.filter((c) => c.isActive).length,
        sessionsLoggedToday: logs.filter((l) => dayStart(l.sessionDate) === todayStart)
          .length,
        sessionsLoggedThisWeek: logs.filter(
          (l) => dayStart(l.sessionDate) >= weekStart,
        ).length,
        overallCompletionPercent: pacingRows.length
          ? Math.round(
              pacingRows.reduce((sum, r) => sum + r.completionPercent, 0) /
                pacingRows.length,
            )
          : 0,
        pacingBreakdown: breakdown,
      });
    }

    if (second === "progress") {
      const rows = sessionAssignments.map((assignment) => {
        const classroom = db.classrooms.find((c) => c.id === assignment.classroomId)!;
        const cls = db.classes.find((c) => c.id === classroom.classId);
        const subject = db.subjects.find((s) => s.id === assignment.subjectId);
        const teacher = db.teachers.find((t) => t.id === assignment.teacherId);
        const pacingRows = db.pacing.filter((p) => p.assignmentId === assignment.id);
        const completed = pacingRows.filter((p) => p.status === "COMPLETED").length;
        const behind = pacingRows.filter((p) => p.status === "BEHIND").length;
        return {
          classroomId: classroom.id,
          className: cls?.name ?? "—",
          section: classroom.section,
          subjectId: assignment.subjectId,
          subjectName: subject?.name ?? "—",
          teacherName: teacher?.name ?? null,
          totalChapters: pacingRows.length,
          completedChapters: completed,
          behindChapters: behind,
          completionPercent: pacingRows.length
            ? Math.round(
                pacingRows.reduce((sum, r) => sum + r.completionPercent, 0) /
                  pacingRows.length,
              )
            : 0,
        };
      });
      rows.sort(
        (a, b) =>
          a.className.localeCompare(b.className, undefined, { numeric: true }) ||
          (a.section ?? "").localeCompare(b.section ?? "") ||
          a.subjectName.localeCompare(b.subjectName),
      );
      return ok(rows);
    }

    if (second === "activity") {
      const rows = db.teachers
        .filter((t) => t.isActive)
        .map((teacher) => {
          const ids = new Set(
            db.assignments.filter((a) => a.teacherId === teacher.id).map((a) => a.id),
          );
          const dates = db.sessionLogs
            .filter((l) => ids.has(l.assignmentId))
            .map((l) => dayStart(l.sessionDate));
          return {
            id: teacher.id,
            name: teacher.name,
            employeeId: teacher.employeeId,
            lastSessionDate: dates.length
              ? new Date(Math.max(...dates)).toISOString()
              : null,
          };
        });
      rows.sort((a, b) => {
        if (a.lastSessionDate === null && b.lastSessionDate === null) return 0;
        if (a.lastSessionDate === null) return -1;
        if (b.lastSessionDate === null) return 1;
        return dayStart(a.lastSessionDate) - dayStart(b.lastSessionDate);
      });
      return ok(rows);
    }

    if (second === "test-coverage") {
      const subjectId = num(search.get("subjectId"));
      const topicChapter = new Map(db.topics.map((t) => [t.id, t.chapterId]));
      const subtopicChapter = new Map(
        db.subtopics.map((s) => [s.id, topicChapter.get(s.topicId)]),
      );
      const counts = new Map<number, { testCount: number; revisionCount: number }>();

      for (const log of db.sessionLogs) {
        if (log.type !== "TEST" && log.type !== "REVISION") continue;
        const topics = db.sessionTopics.filter((t) => t.sessionLogId === log.id);
        const chapterIds = new Set<number>();
        for (const topic of topics) {
          const chapterId =
            topic.chapterId ??
            (topic.subtopicId ? subtopicChapter.get(topic.subtopicId) : undefined);
          if (chapterId) chapterIds.add(chapterId);
        }
        for (const chapterId of chapterIds) {
          const entry = counts.get(chapterId) ?? { testCount: 0, revisionCount: 0 };
          if (log.type === "TEST") entry.testCount += 1;
          else entry.revisionCount += 1;
          counts.set(chapterId, entry);
        }
      }

      const rows = db.chapters
        .filter((c) => c.isActive)
        .filter((c) => subjectId === undefined || c.subjectId === subjectId)
        .map((chapter) => {
          const subject = db.subjects.find((s) => s.id === chapter.subjectId);
          const cls = db.classes.find((c) => c.id === chapter.classId);
          const entry = counts.get(chapter.id) ?? { testCount: 0, revisionCount: 0 };
          return {
            chapterId: chapter.id,
            chapterName: chapter.name,
            subjectId: chapter.subjectId,
            subjectName: subject?.name ?? "—",
            className: cls?.name ?? "—",
            testCount: entry.testCount,
            revisionCount: entry.revisionCount,
          };
        })
        .sort(
          (a, b) =>
            a.testCount + a.revisionCount - (b.testCount + b.revisionCount) ||
            a.chapterName.localeCompare(b.chapterName),
        );
      return ok(rows);
    }

    if (second === "unmarked") {
      const classId = num(search.get("classId"));
      const subjectId = num(search.get("subjectId"));
      const completed = new Set(
        db.sessionTopics
          .filter((t) => t.status === "COMPLETE" && t.subtopicId)
          .map((t) => t.subtopicId as number),
      );
      const rows = db.subtopics
        .filter((s) => s.isActive && !completed.has(s.id))
        .map((subtopic) => {
          const topic = db.topics.find((t) => t.id === subtopic.topicId);
          if (!topic || !topic.isActive) return null;
          const chapter = db.chapters.find((c) => c.id === topic.chapterId);
          if (!chapter || !chapter.isActive) return null;
          if (classId !== undefined && chapter.classId !== classId) return null;
          if (subjectId !== undefined && chapter.subjectId !== subjectId) return null;
          const subject = db.subjects.find((s) => s.id === chapter.subjectId);
          const cls = db.classes.find((c) => c.id === chapter.classId);
          return {
            id: subtopic.id,
            name: subtopic.name,
            displayOrder: subtopic.displayOrder,
            topic: {
              id: topic.id,
              name: topic.name,
              chapter: {
                id: chapter.id,
                name: chapter.name,
                subject: subject ? { id: subject.id, name: subject.name } : null,
                class: cls ? { id: cls.id, name: cls.name } : null,
              },
            },
          };
        })
        .filter(Boolean);
      return ok(rows);
    }

    return notFound("unknown dashboard route");
  }

  /* ── session logs ─────────────────────────────────────────────────────── */

  if (resource === "sessions") {
    if (!second && method === "GET") {
      const teacherId = num(search.get("teacherId"));
      const classroomId = num(search.get("classroomId"));
      const type = search.get("type");
      const from = search.get("from");
      const to = search.get("to");

      let rows = [...db.sessionLogs];
      if (teacherId !== undefined || classroomId !== undefined) {
        const ids = new Set(
          db.assignments
            .filter(
              (a) =>
                (teacherId === undefined || a.teacherId === teacherId) &&
                (classroomId === undefined || a.classroomId === classroomId),
            )
            .map((a) => a.id),
        );
        rows = rows.filter((l) => ids.has(l.assignmentId));
      }
      if (type && SESSION_TYPES.includes(type as SessionLogType)) {
        rows = rows.filter((l) => l.type === type);
      }
      if (from) rows = rows.filter((l) => dayStart(l.sessionDate) >= dayStart(from));
      if (to) rows = rows.filter((l) => dayStart(l.sessionDate) <= dayStart(to));
      rows.sort(
        (a, b) =>
          dayStart(b.sessionDate) - dayStart(a.sessionDate) || b.id - a.id,
      );
      const { slice, pagination } = paginate(
        rows,
        num(search.get("page")) ?? 1,
        num(search.get("pageSize")) ?? 50,
      );
      return ok({ sessions: slice.map((l) => shapeSessionLog(db, l)), pagination });
    }

    const id = num(second ?? null);
    const log = db.sessionLogs.find((l) => l.id === id);
    if (!log) return notFound("session not found");

    if (method === "GET") {
      const topics = db.sessionTopics
        .filter((t) => t.sessionLogId === log.id)
        .map((topic) => {
          const subtopic = db.subtopics.find((s) => s.id === topic.subtopicId);
          const chapter = db.chapters.find((c) => c.id === topic.chapterId);
          return {
            id: topic.id,
            subtopicId: topic.subtopicId,
            chapterId: topic.chapterId,
            status: topic.status,
            notes: topic.notes,
            subtopic: subtopic ? { id: subtopic.id, name: subtopic.name } : null,
            chapter: chapter ? { id: chapter.id, name: chapter.name } : null,
          };
        });
      const assignment = db.assignments.find((a) => a.id === log.assignmentId);
      return ok({
        ...log,
        assignment: shapeSessionAssignment(db, assignment),
        topics,
      });
    }

    if (method === "DELETE") {
      db.sessionLogs = db.sessionLogs.filter((l) => l.id !== log.id);
      db.sessionTopics = db.sessionTopics.filter((t) => t.sessionLogId !== log.id);
      audit(db, "SESSION_DELETED", "SessionLog", log.id, { ...log }, null);
      recalcPacing(db);
      return ok({ deleted: true });
    }

    return notFound("unknown session route");
  }

  /* ── pacing ───────────────────────────────────────────────────────────── */

  if (resource === "pacing") {
    if (second === "behind" && method === "GET") {
      const rows = db.pacing
        .filter((p) => p.status === "BEHIND")
        .sort((a, b) => (b.daysBehind ?? 0) - (a.daysBehind ?? 0))
        .map((p) => shapePacing(db, p));
      return ok(rows);
    }

    if (second === "recalculate" && method === "POST") {
      recalcPacing(db);
      const assignmentId = num(search.get("assignmentId"));
      const sessionId = num(search.get("sessionId"));
      if (assignmentId !== undefined) {
        return ok({ recalculated: 1, scope: "assignment" });
      }
      if (sessionId !== undefined) return ok({ scope: "session" });
      return ok({
        recalculated: db.assignments.filter((a) => a.isActive).length,
        scope: "all",
      });
    }

    if (!second && method === "GET") {
      const classroomId = num(search.get("classroomId"));
      const teacherId = num(search.get("teacherId"));
      const subjectId = num(search.get("subjectId"));
      const status = search.get("status");
      const assignmentById = new Map(db.assignments.map((a) => [a.id, a]));

      const rows = db.pacing
        .filter((p) => {
          const assignment = assignmentById.get(p.assignmentId);
          if (!assignment) return false;
          if (classroomId !== undefined && assignment.classroomId !== classroomId) return false;
          if (teacherId !== undefined && assignment.teacherId !== teacherId) return false;
          if (subjectId !== undefined && assignment.subjectId !== subjectId) return false;
          if (status && p.status !== status) return false;
          return true;
        })
        .map((p) => shapePacing(db, p));
      return ok(rows);
    }

    return notFound("unknown pacing route");
  }

  /* ── attendance ───────────────────────────────────────────────────────── */

  if (resource === "attendance") {
    if (!second && method === "GET") {
      const teacherId = num(search.get("teacherId"));
      const from = search.get("from");
      const to = search.get("to");
      let rows = [...db.attendance];
      if (teacherId !== undefined) rows = rows.filter((r) => r.teacherId === teacherId);
      if (from) rows = rows.filter((r) => dayStart(r.date) >= dayStart(from));
      if (to) rows = rows.filter((r) => dayStart(r.date) <= dayStart(to));
      rows.sort((a, b) => dayStart(b.date) - dayStart(a.date) || a.teacherId - b.teacherId);
      return ok(rows.map((r) => shapeAttendance(db, r)));
    }

    if (!second && method === "POST") {
      const teacherId = Number(body?.teacherId);
      const date = String(body?.date ?? "");
      const status = String(body?.status ?? "") as AttendanceStatus;
      if (!Number.isFinite(teacherId)) return bad("teacherId is required");
      if (!date) return bad("date is required");
      if (!ATTENDANCE_STATUSES.includes(status)) {
        return bad("status must be PRESENT, ABSENT, HALF_DAY or ON_LEAVE");
      }
      if (!db.teachers.some((t) => t.id === teacherId)) return notFound("teacher not found");

      const iso = new Date(`${date.slice(0, 10)}T00:00:00.000Z`).toISOString();
      const existing = db.attendance.find(
        (r) => r.teacherId === teacherId && dayStart(r.date) === dayStart(iso),
      );
      const remarks = body?.remarks ? String(body.remarks) : null;

      if (existing) {
        const before = { ...existing };
        existing.status = status;
        existing.remarks = remarks;
        audit(db, "ATTENDANCE_CORRECTED", "TeacherAttendance", existing.id, before, {
          status,
          remarks,
        });
        recalcPacing(db);
        return ok(shapeAttendance(db, existing));
      }

      const record = {
        id: nextSequence(db, "attendance"),
        teacherId,
        date: iso,
        status,
        remarks,
      };
      db.attendance.push(record);
      audit(db, "ATTENDANCE_RECORDED", "TeacherAttendance", record.id, null, {
        status,
        date: iso,
      });
      recalcPacing(db);
      return created(shapeAttendance(db, record));
    }

    const id = num(second ?? null);
    const record = db.attendance.find((r) => r.id === id);
    if (!record) return notFound("attendance record not found");

    if (method === "PATCH") {
      const before = { ...record };
      if (body?.status !== undefined) {
        const status = String(body.status) as AttendanceStatus;
        if (!ATTENDANCE_STATUSES.includes(status)) {
          return bad("status must be PRESENT, ABSENT, HALF_DAY or ON_LEAVE");
        }
        record.status = status;
      }
      if (body?.remarks !== undefined) {
        record.remarks = body.remarks === null ? null : String(body.remarks);
      }
      audit(db, "ATTENDANCE_CORRECTED", "TeacherAttendance", record.id, before, {
        ...record,
      });
      recalcPacing(db);
      return ok(shapeAttendance(db, record));
    }

    return notFound("unknown attendance route");
  }

  /* ── timetable ────────────────────────────────────────────────────────── */

  if (resource === "timetable") {
    if (!second && method === "GET") {
      const dayOfWeek = num(search.get("dayOfWeek"));
      const classroomId = num(search.get("classroomId"));
      const teacherId = num(search.get("teacherId"));
      const assignmentById = new Map(db.assignments.map((a) => [a.id, a]));

      const rows = db.timetable
        .filter((slot) => {
          const assignment = assignmentById.get(slot.assignmentId);
          if (!assignment) return false;
          if (dayOfWeek !== undefined && slot.dayOfWeek !== dayOfWeek) return false;
          if (classroomId !== undefined && assignment.classroomId !== classroomId) return false;
          if (teacherId !== undefined && assignment.teacherId !== teacherId) return false;
          return true;
        })
        .sort((a, b) => a.dayOfWeek - b.dayOfWeek || a.periodNumber - b.periodNumber)
        .map((slot) => shapeTimetableSlot(db, slot));
      return ok(rows);
    }

    if (!second && method === "POST") {
      const assignmentId = Number(body?.assignmentId);
      const dayOfWeek = Number(body?.dayOfWeek);
      const periodNumber = Number(body?.periodNumber);
      const startTime = String(body?.startTime ?? "");
      const endTime = String(body?.endTime ?? "");
      if (!Number.isFinite(assignmentId)) return bad("assignmentId is required");
      if (!Number.isFinite(dayOfWeek) || dayOfWeek < 1 || dayOfWeek > 6) {
        return bad("dayOfWeek must be between 1 (Mon) and 6 (Sat)");
      }
      if (!Number.isFinite(periodNumber) || periodNumber < 1) {
        return bad("periodNumber must be 1 or greater");
      }
      if (!startTime || !endTime) return bad("startTime and endTime are required");

      const assignment = db.assignments.find((a) => a.id === assignmentId);
      if (!assignment) return notFound("assignment not found");
      if (!assignment.isActive) return bad("assignment is not active");

      const clash = db.timetable.filter(
        (s) => s.dayOfWeek === dayOfWeek && s.periodNumber === periodNumber,
      );
      for (const slot of clash) {
        const other = db.assignments.find((a) => a.id === slot.assignmentId);
        if (!other) continue;
        if (other.teacherId === assignment.teacherId) {
          return conflict(
            "this period clashes with an existing slot for the same teacher",
          );
        }
        if (other.classroomId === assignment.classroomId) {
          return conflict(
            "this period clashes with an existing slot for the same classroom",
          );
        }
      }

      const slot = {
        id: nextSequence(db, "timetable"),
        assignmentId,
        dayOfWeek,
        periodNumber,
        startTime,
        endTime,
        roomLabel: body?.roomLabel ? String(body.roomLabel) : null,
      };
      db.timetable.push(slot);
      audit(db, "TIMETABLE_SLOT_CREATED", "TimetableSlot", slot.id, null, {
        dayOfWeek,
        periodNumber,
      });
      return created(shapeTimetableSlot(db, slot));
    }

    const id = num(second ?? null);
    const slot = db.timetable.find((s) => s.id === id);
    if (!slot) return notFound("timetable slot not found");

    if (method === "PATCH") {
      const before = { ...slot };
      if (body?.startTime !== undefined) slot.startTime = String(body.startTime);
      if (body?.endTime !== undefined) slot.endTime = String(body.endTime);
      if (body?.roomLabel !== undefined) {
        slot.roomLabel = body.roomLabel === null ? null : String(body.roomLabel);
      }
      audit(db, "TIMETABLE_SLOT_UPDATED", "TimetableSlot", slot.id, before, {
        ...slot,
      });
      return ok(shapeTimetableSlot(db, slot));
    }

    if (method === "DELETE") {
      db.timetable = db.timetable.filter((s) => s.id !== slot.id);
      audit(db, "TIMETABLE_SLOT_DELETED", "TimetableSlot", slot.id, { ...slot }, null);
      return ok({ deleted: true });
    }

    return notFound("unknown timetable route");
  }

  /* ── audit logs ───────────────────────────────────────────────────────── */

  if (resource === "audit-logs" && method === "GET") {
    if (!second) {
      const actorType = search.get("actorType");
      const actorId = num(search.get("actorId"));
      const entityType = search.get("entityType");
      const entityId = num(search.get("entityId"));
      const action = search.get("action");
      const from = search.get("from");
      const to = search.get("to");

      let rows = [...db.auditLogs];
      if (actorType) rows = rows.filter((l) => l.actorType === actorType);
      if (actorId !== undefined) rows = rows.filter((l) => l.actorId === actorId);
      if (entityType) rows = rows.filter((l) => l.entityType === entityType);
      if (entityId !== undefined) rows = rows.filter((l) => l.entityId === entityId);
      if (action) rows = rows.filter((l) => l.action === action);
      if (from) rows = rows.filter((l) => dayStart(l.createdAt) >= dayStart(from));
      if (to) rows = rows.filter((l) => dayStart(l.createdAt) <= dayStart(to));
      rows.sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime() ||
          b.id - a.id,
      );

      const { slice, pagination } = paginate(
        rows,
        num(search.get("page")) ?? 1,
        num(search.get("pageSize")) ?? 50,
      );
      return ok({
        logs: slice.map(({ oldValue: _o, newValue: _n, ...rest }) => rest),
        pagination,
      });
    }

    const id = num(second);
    const log = db.auditLogs.find((l) => l.id === id);
    if (!log) return notFound("audit log not found");
    return ok(log);
  }

  return notFound("unknown route");
}
