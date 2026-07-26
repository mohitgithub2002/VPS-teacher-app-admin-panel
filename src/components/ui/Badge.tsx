import type { ReactNode } from "react";

import type {
  AttendanceStatus,
  CalendarEventType,
  PacingStatus,
  SessionLogType,
} from "@/lib/api/types";

export type BadgeTone =
  | "success"
  | "pending"
  | "active"
  | "danger"
  | "neutral"
  | "strong";

interface BadgeProps {
  tone?: BadgeTone;
  dot?: boolean;
  children: ReactNode;
  className?: string;
}

export function Badge({ tone = "neutral", dot, children, className }: BadgeProps) {
  return (
    <span
      className={["wk-badge", `wk-badge--${tone}`, className].filter(Boolean).join(" ")}
    >
      {dot ? <i className="wk-badge__dot" /> : null}
      {children}
    </span>
  );
}

/* Pacing — green on track, red behind, blue ahead, dark green completed. */
const PACING: Record<PacingStatus, { tone: BadgeTone; label: string }> = {
  ON_TRACK: { tone: "success", label: "On track" },
  BEHIND: { tone: "danger", label: "Behind" },
  AHEAD: { tone: "active", label: "Ahead" },
  COMPLETED: { tone: "strong", label: "Completed" },
};

export function PacingBadge({ status }: { status: PacingStatus }) {
  const meta = PACING[status] ?? { tone: "neutral" as BadgeTone, label: status };
  return (
    <Badge tone={meta.tone} dot={status !== "COMPLETED"}>
      {status === "COMPLETED" ? "✓ " : null}
      {meta.label}
    </Badge>
  );
}

export function pacingMeterClass(status: PacingStatus): string {
  switch (status) {
    case "BEHIND":
      return "wk-meter__fill--danger";
    case "AHEAD":
      return "wk-meter__fill--active";
    case "COMPLETED":
      return "wk-meter__fill--success";
    default:
      return "wk-meter__fill--success";
  }
}

const ATTENDANCE: Record<AttendanceStatus, { tone: BadgeTone; label: string }> = {
  PRESENT: { tone: "success", label: "Present" },
  ABSENT: { tone: "danger", label: "Absent" },
  HALF_DAY: { tone: "pending", label: "Half day" },
  ON_LEAVE: { tone: "active", label: "On leave" },
};

export function AttendanceBadge({ status }: { status: AttendanceStatus }) {
  const meta = ATTENDANCE[status] ?? { tone: "neutral" as BadgeTone, label: status };
  return (
    <Badge tone={meta.tone} dot>
      {meta.label}
    </Badge>
  );
}

export const ATTENDANCE_LABELS = ATTENDANCE;

const SESSION_TYPE: Record<SessionLogType, { tone: BadgeTone; label: string }> = {
  TEACHING: { tone: "active", label: "Teaching" },
  REVISION: { tone: "pending", label: "Revision" },
  QA: { tone: "neutral", label: "Q&A" },
  TEST: { tone: "success", label: "Test" },
};

export function SessionTypeBadge({ type }: { type: SessionLogType }) {
  const meta = SESSION_TYPE[type] ?? { tone: "neutral" as BadgeTone, label: type };
  return <Badge tone={meta.tone}>{meta.label}</Badge>;
}

const EVENT_TYPE: Record<CalendarEventType, { tone: BadgeTone; label: string }> = {
  HOLIDAY: { tone: "success", label: "Holiday" },
  EXAM: { tone: "danger", label: "Exam" },
  EVENT: { tone: "pending", label: "Event" },
};

export function EventTypeBadge({ type }: { type: CalendarEventType }) {
  const meta = EVENT_TYPE[type] ?? { tone: "neutral" as BadgeTone, label: type };
  return <Badge tone={meta.tone} dot>{meta.label}</Badge>;
}

export function ActiveBadge({ active }: { active: boolean }) {
  return active ? (
    <Badge tone="success" dot>
      Active
    </Badge>
  ) : (
    <Badge tone="neutral" dot>
      Inactive
    </Badge>
  );
}
