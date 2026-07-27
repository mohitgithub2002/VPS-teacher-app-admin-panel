/**
 * Deterministic in-memory dataset for the demo backend.
 *
 * This exists so the panel can be developed, reviewed and demoed before the
 * real Admin API is reachable. It is only ever used when
 * `ADMIN_API_BASE_URL` is unset — see src/app/api/admin/[...path]/route.ts.
 * Nothing outside src/server/mock imports it.
 */

import type {
  AcademicSession,
  AttendanceStatus,
  AuditActorType,
  CalendarEventType,
  PacingStatus,
  SessionLogType,
} from "@/lib/api/types";

export interface MockTeacher {
  id: number;
  employeeId: string;
  name: string;
  phone: string;
  email: string | null;
  qualification: string | null;
  isActive: boolean;
  lastLoginAt: string | null;
  createdAt: string;
  updatedAt: string;
  password: string;
}

export interface MockClass {
  id: number;
  name: string;
}

export interface MockClassroom {
  id: number;
  classId: number;
  sessionId: number;
  section: string;
}

export interface MockSubject {
  id: number;
  name: string;
  code: string | null;
  displayOrder: number;
  isActive: boolean;
}

export interface MockAssignment {
  id: number;
  teacherId: number;
  classroomId: number;
  subjectId: number;
  isActive: boolean;
}

export interface MockChapter {
  id: number;
  name: string;
  subjectId: number;
  classId: number;
  displayOrder: number;
  periodsRequired: number | null;
  isActive: boolean;
}

export interface MockTopic {
  id: number;
  chapterId: number;
  name: string;
  displayOrder: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface MockSubtopic {
  id: number;
  topicId: number;
  name: string;
  displayOrder: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface MockCalendarEvent {
  id: number;
  sessionId: number;
  title: string;
  type: CalendarEventType;
  startDate: string;
  endDate: string;
  description: string | null;
  createdAt: string;
}

export interface MockSessionLog {
  id: number;
  assignmentId: number;
  sessionDate: string;
  type: SessionLogType;
  notes: string | null;
  createdAt: string;
}

export interface MockSessionTopic {
  id: number;
  sessionLogId: number;
  subtopicId: number | null;
  chapterId: number | null;
  status: "COMPLETE" | "PARTIAL" | "PLANNED";
  notes: string | null;
}

export interface MockPacing {
  id: number;
  assignmentId: number;
  chapterId: number;
  completionPercent: number;
  status: PacingStatus;
  daysBehind: number | null;
}

export interface MockAttendance {
  id: number;
  teacherId: number;
  date: string;
  status: AttendanceStatus;
  remarks: string | null;
}

export interface MockTimetableSlot {
  id: number;
  assignmentId: number;
  dayOfWeek: number;
  periodNumber: number;
  startTime: string;
  endTime: string;
  roomLabel: string | null;
}

export interface MockAuditLog {
  id: number;
  actorType: AuditActorType;
  actorId: number;
  actorName: string;
  action: string;
  entityType: string;
  entityId: number;
  oldValue: Record<string, unknown> | null;
  newValue: Record<string, unknown> | null;
  createdAt: string;
}

export interface MockDb {
  sequences: Record<string, number>;
  admin: { id: number; name: string; username: string; role: "SUPERUSER" };
  academicSessions: AcademicSession[];
  classes: MockClass[];
  classrooms: MockClassroom[];
  subjects: MockSubject[];
  teachers: MockTeacher[];
  assignments: MockAssignment[];
  chapters: MockChapter[];
  topics: MockTopic[];
  subtopics: MockSubtopic[];
  calendarEvents: MockCalendarEvent[];
  sessionLogs: MockSessionLog[];
  sessionTopics: MockSessionTopic[];
  pacing: MockPacing[];
  attendance: MockAttendance[];
  timetable: MockTimetableSlot[];
  auditLogs: MockAuditLog[];
}

/* ── deterministic pseudo-randomness ─────────────────────────────────────── */

function makeRandom(seed: number) {
  let state = seed;
  return () => {
    state = (state * 1103515245 + 12345) % 2147483648;
    return state / 2147483648;
  };
}

const rand = makeRandom(20260726);
const pick = <T,>(items: readonly T[]): T =>
  items[Math.floor(rand() * items.length)];
const between = (min: number, max: number) =>
  min + Math.floor(rand() * (max - min + 1));

function isoDate(offsetDays: number): string {
  const date = new Date();
  date.setUTCHours(0, 0, 0, 0);
  date.setUTCDate(date.getUTCDate() + offsetDays);
  return date.toISOString();
}

function isoDateTime(offsetDays: number, hour = 9, minute = 15): string {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() + offsetDays);
  date.setUTCHours(hour, minute, 0, 0);
  return date.toISOString();
}

/* ── seed content ────────────────────────────────────────────────────────── */

const TEACHER_SEED: Array<
  [name: string, qualification: string | null, active: boolean, lastLogin: number | null]
> = [
  ["Rajesh Kumar", "M.Sc Mathematics", true, 0],
  ["Priya Sharma", "M.A English", true, 0],
  ["Anil Deshpande", "M.Sc Physics, B.Ed", true, -1],
  ["Meera Iyer", "M.Sc Chemistry", true, -1],
  ["Faisal Ahmed", "M.A History", true, -2],
  ["Sunita Rao", "M.Com", true, -3],
  ["Vikram Patil", "B.Tech, B.Ed", true, -6],
  ["Kavita Nair", "M.Sc Biology", true, -8],
  ["Joseph Mathew", "M.A Political Science", true, -14],
  ["Deepa Krishnan", "M.Sc Computer Science", true, -21],
  ["Arjun Menon", "M.A Hindi", true, -34],
  ["Lakshmi Pillai", "B.P.Ed", true, null],
  ["Ravi Shankar", "M.A Sanskrit", false, -96],
  ["Neha Gupta", "M.Sc Statistics", false, -140],
  ["Tanvi Joshi", "M.F.A", true, null],
];

const CLASS_NAMES = ["Class 6", "Class 7", "Class 8", "Class 9", "Class 10"];

const SUBJECT_SEED: Array<[name: string, code: string, active: boolean]> = [
  ["Mathematics", "MATH", true],
  ["Science", "SCI", true],
  ["English", "ENG", true],
  ["Social Studies", "SST", true],
  ["Hindi", "HIN", true],
  ["Computer Science", "CS", true],
  ["Physical Education", "PE", true],
  ["General Knowledge", "GK", false],
];

const CHAPTER_SEED: Record<string, string[]> = {
  MATH: [
    "Rational Numbers",
    "Linear Equations",
    "Algebraic Expressions",
    "Quadrilaterals",
    "Data Handling",
    "Mensuration",
    "Exponents and Powers",
  ],
  SCI: [
    "Crop Production",
    "Microorganisms",
    "Synthetic Fibres",
    "Metals and Non-metals",
    "Combustion and Flame",
    "Force and Pressure",
    "Light",
  ],
  ENG: [
    "The Best Christmas Present",
    "The Tsunami",
    "Glimpses of the Past",
    "Bepin Choudhury's Lapse of Memory",
    "Grammar: Tenses",
    "Writing: Formal Letters",
  ],
  SST: [
    "Resources",
    "Land, Soil and Water",
    "Mineral Resources",
    "The Indian Constitution",
    "Understanding Secularism",
    "Colonialism and Rural Society",
  ],
  HIN: ["ध्वनि", "लाख की चूड़ियाँ", "बस की यात्रा", "दीवानों की हस्ती", "व्याकरण: संधि"],
  CS: [
    "Computer Fundamentals",
    "Spreadsheets",
    "Introduction to Python",
    "Loops and Conditionals",
    "Internet and Safety",
  ],
  PE: ["Fitness Basics", "Athletics", "Team Games", "Yoga and Wellness"],
  GK: ["Current Affairs", "World Geography"],
};

const TOPIC_SUFFIX = ["Fundamentals", "Applications", "Practice and revision"];

const SUBTOPIC_SUFFIX = [
  "Introduction",
  "Core concepts",
  "Worked examples",
  "Practice set A",
  "Practice set B",
  "Revision and doubts",
];

const SESSION_NOTES = [
  "Covered the board work and set homework",
  "Class was slow — repeated the worked examples",
  "Finished the chapter, quick recap next period",
  "Group activity, good participation",
  "Half the class on a field trip, took revision only",
  null,
  null,
];

const CALENDAR_SEED: Array<
  [title: string, type: CalendarEventType, from: number, to: number, description: string | null]
> = [
  ["Independence Day", "HOLIDAY", 20, 20, "National holiday"],
  ["Unit Test I", "EXAM", 34, 39, "First unit test block"],
  ["Ganesh Chaturthi", "HOLIDAY", 48, 49, null],
  ["Annual Sports Day", "EVENT", 58, 59, "Whole-school event, no periods"],
  ["Diwali Break", "HOLIDAY", 86, 91, "Diwali vacation"],
  ["Half-yearly Examinations", "EXAM", 110, 120, "Half-yearly exam block"],
  ["Founder's Day", "EVENT", -12, -12, "Assembly and cultural programme"],
  ["Mid-term Test", "EXAM", -30, -26, "Mid-term assessment block"],
];

/* ── builder ─────────────────────────────────────────────────────────────── */

function seed(): MockDb {
  const sequences: Record<string, number> = {};
  const nextId = (table: string) => {
    sequences[table] = (sequences[table] ?? 0) + 1;
    return sequences[table];
  };

  const academicSessions: AcademicSession[] = [
    { id: 1, name: "2025-26", isCurrent: false },
    { id: 2, name: "2026-27", isCurrent: true },
  ];
  sequences.academicSessions = 2;

  const classes: MockClass[] = CLASS_NAMES.map((name) => ({
    id: nextId("classes"),
    name,
  }));

  const classrooms: MockClassroom[] = [];
  for (const cls of classes) {
    const sections = cls.name === "Class 10" ? ["A"] : ["A", "B"];
    for (const section of sections) {
      classrooms.push({
        id: nextId("classrooms"),
        classId: cls.id,
        sessionId: 2,
        section,
      });
    }
  }

  const subjects: MockSubject[] = SUBJECT_SEED.map(([name, code, isActive], i) => ({
    id: nextId("subjects"),
    name,
    code,
    displayOrder: i + 1,
    isActive,
  }));

  const teachers: MockTeacher[] = TEACHER_SEED.map(
    ([name, qualification, isActive, lastLogin], i) => {
      const id = nextId("teachers");
      const handle = name.split(" ")[0].toLowerCase();
      return {
        id,
        employeeId: `EMP${String(id).padStart(3, "0")}`,
        name,
        phone: `98765${String(43200 + id).slice(-5)}`,
        email: i % 5 === 4 ? null : `${handle}@school.com`,
        qualification,
        isActive,
        lastLoginAt: lastLogin === null ? null : isoDateTime(lastLogin, 8, 30),
        createdAt: isoDateTime(-200 + i * 4, 6, 0),
        updatedAt: isoDateTime(-30 + i, 9, 15),
        password: "changeme123",
      };
    },
  );

  /* Chapters — scoped to subject + class. */
  const chapters: MockChapter[] = [];
  for (const subject of subjects) {
    const names = CHAPTER_SEED[subject.code ?? ""] ?? [];
    for (const cls of classes) {
      names.forEach((name, index) => {
        chapters.push({
          id: nextId("chapters"),
          name,
          subjectId: subject.id,
          classId: cls.id,
          displayOrder: index + 1,
          periodsRequired: between(6, 20),
          isActive: subject.isActive,
        });
      });
    }
  }

  /* Topics sit between a chapter and its subtopics. */
  const topics: MockTopic[] = [];
  const subtopics: MockSubtopic[] = [];
  for (const chapter of chapters) {
    const topicCount = between(2, 3);
    // Subtopic names stay unique inside a chapter by walking the suffix list.
    let suffixCursor = 0;
    for (let t = 0; t < topicCount; t += 1) {
      const topic: MockTopic = {
        id: nextId("topics"),
        chapterId: chapter.id,
        name: `${chapter.name} — ${TOPIC_SUFFIX[t]}`,
        displayOrder: t + 1,
        isActive: true,
        createdAt: isoDateTime(-180, 7, 0),
        updatedAt: isoDateTime(-180, 7, 0),
      };
      topics.push(topic);

      const count = between(1, 2);
      for (let i = 0; i < count; i += 1) {
        subtopics.push({
          id: nextId("subtopics"),
          topicId: topic.id,
          name: `${chapter.name} — ${SUBTOPIC_SUFFIX[suffixCursor % SUBTOPIC_SUFFIX.length]}`,
          displayOrder: i + 1,
          isActive: true,
          createdAt: isoDateTime(-180, 7, 30),
          updatedAt: isoDateTime(-180, 7, 30),
        });
        suffixCursor += 1;
      }
    }
  }

  /* Assignments — every active classroom gets a teacher per core subject. */
  const coreSubjects = subjects.filter(
    (s) => s.isActive && s.code !== "PE" && s.code !== "GK",
  );
  const activeTeachers = teachers.filter((t) => t.isActive);
  const assignments: MockAssignment[] = [];
  let cursor = 0;
  for (const classroom of classrooms) {
    for (const subject of coreSubjects) {
      const teacher = activeTeachers[cursor % activeTeachers.length];
      cursor += 1;
      assignments.push({
        id: nextId("assignments"),
        teacherId: teacher.id,
        classroomId: classroom.id,
        subjectId: subject.id,
        isActive: true,
      });
    }
  }
  // One historical assignment that was reassigned mid-session.
  assignments.push({
    id: nextId("assignments"),
    teacherId: teachers[12].id,
    classroomId: classrooms[0].id,
    subjectId: subjects[4].id,
    isActive: false,
  });

  /* Timetable — 6 periods a day, Mon–Sat, filled without clashes. */
  const PERIODS = [
    ["08:00", "08:45"],
    ["08:50", "09:35"],
    ["09:55", "10:40"],
    ["10:45", "11:30"],
    ["12:10", "12:55"],
    ["13:00", "13:45"],
  ];
  const timetable: MockTimetableSlot[] = [];
  const takenTeacher = new Set<string>();
  const slotCount = new Map<number, number>();

  const assignmentsByClassroom = new Map<number, MockAssignment[]>();
  for (const assignment of assignments) {
    if (!assignment.isActive) continue;
    const list = assignmentsByClassroom.get(assignment.classroomId) ?? [];
    list.push(assignment);
    assignmentsByClassroom.set(assignment.classroomId, list);
  }

  /* Every classroom gets every period filled where possible. Subjects rotate
     across the day, and a teacher can only be in one room at a time. */
  for (let day = 1; day <= 6; day += 1) {
    for (let period = 1; period <= PERIODS.length; period += 1) {
      for (const classroom of classrooms) {
        const candidates = assignmentsByClassroom.get(classroom.id) ?? [];
        if (candidates.length === 0) continue;

        const offset = (day * 3 + period + classroom.id) % candidates.length;
        for (let step = 0; step < candidates.length; step += 1) {
          const assignment = candidates[(offset + step) % candidates.length];
          const teacherKey = `${day}:${period}:t${assignment.teacherId}`;
          if (takenTeacher.has(teacherKey)) continue;
          // Roughly five periods a week per subject.
          if ((slotCount.get(assignment.id) ?? 0) >= 5) continue;

          takenTeacher.add(teacherKey);
          slotCount.set(assignment.id, (slotCount.get(assignment.id) ?? 0) + 1);
          const [startTime, endTime] = PERIODS[period - 1];
          timetable.push({
            id: nextId("timetable"),
            assignmentId: assignment.id,
            dayOfWeek: day,
            periodNumber: period,
            startTime,
            endTime,
            roomLabel: `Room ${100 + classroom.id * 7}`,
          });
          break;
        }
      }
    }
  }

  const calendarEvents: MockCalendarEvent[] = CALENDAR_SEED.map(
    ([title, type, from, to, description]) => ({
      id: nextId("calendarEvents"),
      sessionId: 2,
      title,
      type,
      startDate: isoDate(from),
      endDate: isoDate(to),
      description,
      createdAt: isoDateTime(-150, 10, 0),
    }),
  );

  /* Session logs — 45 days of history, denser for engaged teachers. */
  const sessionLogs: MockSessionLog[] = [];
  const sessionTopics: MockSessionTopic[] = [];
  const chapterByKey = new Map<string, MockChapter[]>();
  for (const chapter of chapters) {
    const key = `${chapter.subjectId}:${chapter.classId}`;
    const list = chapterByKey.get(key) ?? [];
    list.push(chapter);
    chapterByKey.set(key, list);
  }
  /* Chapter → subtopics, in teaching order: topic by topic, and within a topic
     by the subtopic's own display order. */
  const topicChapter = new Map(topics.map((t) => [t.id, t.chapterId]));
  const subtopicsByTopic = new Map<number, MockSubtopic[]>();
  for (const subtopic of subtopics) {
    const list = subtopicsByTopic.get(subtopic.topicId) ?? [];
    list.push(subtopic);
    subtopicsByTopic.set(subtopic.topicId, list);
  }
  const subtopicsByChapter = new Map<number, MockSubtopic[]>();
  for (const topic of [...topics].sort(
    (a, b) => a.displayOrder - b.displayOrder || a.id - b.id,
  )) {
    const list = subtopicsByChapter.get(topic.chapterId) ?? [];
    list.push(
      ...(subtopicsByTopic.get(topic.id) ?? [])
        .slice()
        .sort((a, b) => a.displayOrder - b.displayOrder || a.id - b.id),
    );
    subtopicsByChapter.set(topic.chapterId, list);
  }

  const silentTeacherIds = new Set([
    teachers[10].id,
    teachers[11].id,
    teachers[14].id,
  ]);

  /**
   * Each assignment walks its own syllabus as one flat ordered list of
   * subtopics, so coverage is cumulative the way a real class is: early
   * chapters finished, the current chapter part-done, later chapters untouched.
   * A per-assignment head start models teachers who began before this window.
   */
  const flatSyllabus = new Map<number, MockSubtopic[]>();
  const syllabusCursor = new Map<number, number>();
  /* How reliably each assignment gets logged — spreads the pacing mix out. */
  const diligence = new Map<number, number>();
  for (const assignment of assignments) {
    const classroom = classrooms.find((c) => c.id === assignment.classroomId);
    if (!classroom) continue;
    const pool = chapterByKey.get(`${assignment.subjectId}:${classroom.classId}`) ?? [];
    const flat = pool
      .slice()
      .sort((a, b) => a.displayOrder - b.displayOrder)
      .flatMap((chapter) => subtopicsByChapter.get(chapter.id) ?? []);
    flatSyllabus.set(assignment.id, flat);
    // Head start: some of the syllabus was covered before this log window.
    syllabusCursor.set(
      assignment.id,
      silentTeacherIds.has(assignment.teacherId)
        ? 0
        : Math.floor(flat.length * (0.05 + rand() * 0.14)),
    );
    diligence.set(assignment.id, 0.1 + rand() * 0.24);
  }

  // Everything before the cursor is already complete — recorded as one
  // back-dated catch-up session per assignment so the history is consistent.
  for (const assignment of assignments) {
    if (!assignment.isActive) continue;
    const flat = flatSyllabus.get(assignment.id) ?? [];
    const covered = syllabusCursor.get(assignment.id) ?? 0;
    if (covered === 0) continue;

    const log: MockSessionLog = {
      id: nextId("sessionLogs"),
      assignmentId: assignment.id,
      sessionDate: isoDate(-46),
      type: "TEACHING",
      notes: "Term-to-date coverage recorded in bulk",
      createdAt: isoDateTime(-46, 17, 0),
    };
    sessionLogs.push(log);
    for (let i = 0; i < covered; i += 1) {
      sessionTopics.push({
        id: nextId("sessionTopics"),
        sessionLogId: log.id,
        subtopicId: flat[i].id,
        chapterId: null,
        status: "COMPLETE",
        notes: null,
      });
    }
  }

  for (let dayOffset = -44; dayOffset <= 0; dayOffset += 1) {
    const date = new Date();
    date.setUTCDate(date.getUTCDate() + dayOffset);
    if (date.getUTCDay() === 0) continue; // Sundays are not teaching days

    for (const assignment of assignments) {
      if (!assignment.isActive) continue;
      if (silentTeacherIds.has(assignment.teacherId)) continue;
      if (rand() > (diligence.get(assignment.id) ?? 0.2)) continue;

      const flat = flatSyllabus.get(assignment.id) ?? [];
      if (flat.length === 0) continue;
      const at = syllabusCursor.get(assignment.id) ?? 0;

      const type: SessionLogType =
        rand() < 0.72
          ? "TEACHING"
          : rand() < 0.6
            ? "REVISION"
            : rand() < 0.6
              ? "QA"
              : "TEST";

      const log: MockSessionLog = {
        id: nextId("sessionLogs"),
        assignmentId: assignment.id,
        sessionDate: isoDate(dayOffset),
        type,
        notes: pick(SESSION_NOTES),
        createdAt: isoDateTime(dayOffset, between(9, 16), between(0, 59)),
      };
      sessionLogs.push(log);

      if (type === "TEACHING") {
        // Push the frontier forward by one to three subtopics.
        const count = Math.min(flat.length - at, between(1, 2));
        for (let i = 0; i < count; i += 1) {
          sessionTopics.push({
            id: nextId("sessionTopics"),
            sessionLogId: log.id,
            subtopicId: flat[at + i].id,
            chapterId: null,
            status: rand() < 0.82 ? "COMPLETE" : "PARTIAL",
            notes: null,
          });
        }
        syllabusCursor.set(assignment.id, Math.min(flat.length, at + count));
      } else if (type === "REVISION") {
        // Revisit ground already covered — no forward movement.
        const start = Math.max(0, at - between(1, 4));
        for (let i = start; i < Math.min(at, start + 2); i += 1) {
          sessionTopics.push({
            id: nextId("sessionTopics"),
            sessionLogId: log.id,
            subtopicId: flat[i].id,
            chapterId: null,
            status: "COMPLETE",
            notes: null,
          });
        }
      } else {
        // Q&A and tests are recorded against the chapter, not a subtopic.
        const anchor = flat[Math.max(0, Math.min(flat.length - 1, at - 1))];
        sessionTopics.push({
          id: nextId("sessionTopics"),
          sessionLogId: log.id,
          subtopicId: null,
          chapterId: topicChapter.get(anchor.topicId) ?? null,
          status: "COMPLETE",
          notes: type === "TEST" ? "Chapter test conducted" : null,
        });
      }
    }
  }

  const attendance: MockAttendance[] = [];
  for (let dayOffset = -24; dayOffset <= 0; dayOffset += 1) {
    const date = new Date();
    date.setUTCDate(date.getUTCDate() + dayOffset);
    if (date.getUTCDay() === 0) continue;
    for (const teacher of teachers) {
      if (!teacher.isActive) continue;
      const roll = rand();
      const status: AttendanceStatus =
        roll < 0.88
          ? "PRESENT"
          : roll < 0.93
            ? "ON_LEAVE"
            : roll < 0.97
              ? "ABSENT"
              : "HALF_DAY";
      attendance.push({
        id: nextId("attendance"),
        teacherId: teacher.id,
        date: isoDate(dayOffset),
        status,
        remarks:
          status === "ON_LEAVE"
            ? "Approved leave"
            : status === "HALF_DAY"
              ? "Left after lunch"
              : null,
      });
    }
  }

  const db: MockDb = {
    sequences,
    admin: { id: 1, name: "Aparna Desai", username: "admin", role: "SUPERUSER" },
    academicSessions,
    classes,
    classrooms,
    subjects,
    teachers,
    assignments,
    chapters,
    topics,
    subtopics,
    calendarEvents,
    sessionLogs,
    sessionTopics,
    pacing: [],
    attendance,
    timetable,
    auditLogs: [],
  };

  db.pacing = computePacing(db);
  db.auditLogs = seedAuditLogs(db, nextId);
  return db;
}

/* ── derived data ────────────────────────────────────────────────────────── */

/** Assumed share of the academic session already elapsed. */
const SESSION_PROGRESS = 0.45;

/**
 * Pacing = subtopics completed for a chapter vs. subtopics that exist, compared
 * against how far through the session we are. Crude on purpose — the real
 * calculation lives on the server; this only needs to be plausible.
 */
export function computePacing(db: MockDb): MockPacing[] {
  const completedSubtopics = new Set<number>();
  const chapterTouches = new Map<number, number>();
  const logById = new Map(db.sessionLogs.map((l) => [l.id, l]));

  for (const topic of db.sessionTopics) {
    if (topic.status !== "COMPLETE") continue;
    if (topic.subtopicId) completedSubtopics.add(topic.subtopicId);
    if (topic.chapterId) {
      const log = logById.get(topic.sessionLogId);
      if (!log) continue;
      chapterTouches.set(topic.chapterId, (chapterTouches.get(topic.chapterId) ?? 0) + 1);
    }
  }

  /* Subtopics hang off a topic now, so a chapter's subtopics are the subtopics
     of its active topics. */
  const chapterOfTopic = new Map(
    db.topics.filter((t) => t.isActive).map((t) => [t.id, t.chapterId]),
  );
  const subtopicsByChapter = new Map<number, MockSubtopic[]>();
  for (const subtopic of db.subtopics) {
    if (!subtopic.isActive) continue;
    const chapterId = chapterOfTopic.get(subtopic.topicId);
    if (chapterId === undefined) continue;
    const list = subtopicsByChapter.get(chapterId) ?? [];
    list.push(subtopic);
    subtopicsByChapter.set(chapterId, list);
  }

  const rows: MockPacing[] = [];
  let id = 0;

  for (const assignment of db.assignments) {
    if (!assignment.isActive) continue;
    const classroom = db.classrooms.find((c) => c.id === assignment.classroomId);
    if (!classroom) continue;
    const chapters = db.chapters
      .filter(
        (c) =>
          c.isActive &&
          c.subjectId === assignment.subjectId &&
          c.classId === classroom.classId,
      )
      .sort((a, b) => a.displayOrder - b.displayOrder);

    chapters.forEach((chapter, index) => {
      const all = subtopicsByChapter.get(chapter.id) ?? [];
      const done = all.filter((s) => completedSubtopics.has(s.id)).length;
      const completionPercent =
        all.length === 0
          ? chapterTouches.get(chapter.id)
            ? 100
            : 0
          : Math.round((done / all.length) * 100);

      /* Chapters are meant to run in order, and the session is part-way
         through, so the first SESSION_PROGRESS share of them should be done. */
      const expectedChaptersDone = chapters.length * SESSION_PROGRESS;
      const expectedPercent = Math.max(
        0,
        Math.min(100, Math.round((expectedChaptersDone - index) * 100)),
      );

      let status: PacingStatus;
      let daysBehind: number | null = null;
      if (completionPercent >= 100) {
        status = "COMPLETED";
      } else if (expectedPercent < 100 && completionPercent >= expectedPercent + 20) {
        status = "AHEAD";
      } else if (completionPercent <= expectedPercent - 25) {
        status = "BEHIND";
        daysBehind = Math.max(
          1,
          Math.round(((expectedPercent - completionPercent) / 100) * 24),
        );
      } else {
        status = "ON_TRACK";
      }

      id += 1;
      rows.push({
        id,
        assignmentId: assignment.id,
        chapterId: chapter.id,
        completionPercent,
        status,
        daysBehind,
      });
    });
  }

  db.sequences.pacing = id;
  return rows;
}

function seedAuditLogs(db: MockDb, nextId: (table: string) => number): MockAuditLog[] {
  const logs: MockAuditLog[] = [];
  const admin = db.admin;

  db.teachers.forEach((teacher, index) => {
    logs.push({
      id: nextId("auditLogs"),
      actorType: "ADMIN",
      actorId: admin.id,
      actorName: admin.name,
      action: "TEACHER_CREATED",
      entityType: "Teacher",
      entityId: teacher.id,
      oldValue: null,
      newValue: { employeeId: teacher.employeeId, name: teacher.name },
      createdAt: teacher.createdAt,
    });
    if (!teacher.isActive) {
      logs.push({
        id: nextId("auditLogs"),
        actorType: "ADMIN",
        actorId: admin.id,
        actorName: admin.name,
        action: "TEACHER_DEACTIVATED",
        entityType: "Teacher",
        entityId: teacher.id,
        oldValue: { isActive: true },
        newValue: { isActive: false },
        createdAt: isoDateTime(-60 + index, 11, 20),
      });
    }
  });

  db.calendarEvents.forEach((event) => {
    logs.push({
      id: nextId("auditLogs"),
      actorType: "ADMIN",
      actorId: admin.id,
      actorName: admin.name,
      action: "CALENDAR_EVENT_CREATED",
      entityType: "CalendarEvent",
      entityId: event.id,
      oldValue: null,
      newValue: { title: event.title, type: event.type },
      createdAt: event.createdAt,
    });
  });

  db.sessionLogs.slice(-160).forEach((log) => {
    const assignment = db.assignments.find((a) => a.id === log.assignmentId);
    const teacher = db.teachers.find((t) => t.id === assignment?.teacherId);
    logs.push({
      id: nextId("auditLogs"),
      actorType: "TEACHER",
      actorId: teacher?.id ?? 0,
      actorName: teacher?.name ?? "Unknown teacher",
      action: "SESSION_LOGGED",
      entityType: "SessionLog",
      entityId: log.id,
      oldValue: null,
      newValue: { type: log.type, sessionDate: log.sessionDate },
      createdAt: log.createdAt,
    });
  });

  db.teachers.slice(0, 3).forEach((teacher, i) => {
    logs.push({
      id: nextId("auditLogs"),
      actorType: "ADMIN",
      actorId: admin.id,
      actorName: admin.name,
      action: "TEACHER_UPDATED",
      entityType: "Teacher",
      entityId: teacher.id,
      oldValue: { qualification: "M.A", phone: teacher.phone },
      newValue: { qualification: teacher.qualification, phone: teacher.phone },
      createdAt: isoDateTime(-9 + i, 14, 5),
    });
  });

  return logs.sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
}

/* ── singleton (survives hot reload in dev) ──────────────────────────────── */

const globalStore = globalThis as unknown as { __wokkaMockDb?: MockDb };

export function getDb(): MockDb {
  if (!globalStore.__wokkaMockDb) {
    globalStore.__wokkaMockDb = seed();
  }
  return globalStore.__wokkaMockDb;
}

export function nextSequence(db: MockDb, table: string): number {
  db.sequences[table] = (db.sequences[table] ?? 0) + 1;
  return db.sequences[table];
}
