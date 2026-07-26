/**
 * Formatting helpers. Dates render in a fixed locale so server and client
 * markup agree (no hydration mismatch on first paint).
 */

import type { Classroom } from "./api/types";

const DATE = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  year: "numeric",
});

const DATE_TIME = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

const DAY_MONTH = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
});

export function formatDate(value?: string | null): string {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : DATE.format(date);
}

export function formatDateTime(value?: string | null): string {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : DATE_TIME.format(date);
}

export function formatDayMonth(value?: string | null): string {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : DAY_MONTH.format(date);
}

export function formatDateRange(start: string, end: string): string {
  const from = new Date(start);
  const to = new Date(end);
  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) return "—";
  if (from.toDateString() === to.toDateString()) return formatDate(start);
  const sameYear = from.getFullYear() === to.getFullYear();
  return `${sameYear ? DAY_MONTH.format(from) : DATE.format(from)} – ${DATE.format(to)}`;
}

/** Whole days between a date and today, positive for the past. */
export function daysSince(value?: string | null): number | null {
  if (!value) return null;
  const then = new Date(value);
  if (Number.isNaN(then.getTime())) return null;
  const diff = Date.now() - then.getTime();
  return Math.floor(diff / 86_400_000);
}

export function relativeDays(value?: string | null): string {
  const days = daysSince(value);
  if (days === null) return "Never";
  if (days <= 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days} days ago`;
  if (days < 14) return "Last week";
  if (days < 60) return `${Math.floor(days / 7)} weeks ago`;
  return `${Math.floor(days / 30)} months ago`;
}

/** Today's date as `YYYY-MM-DD` in the viewer's timezone. */
export function todayIso(): string {
  const now = new Date();
  const offset = now.getTimezoneOffset() * 60_000;
  return new Date(now.getTime() - offset).toISOString().slice(0, 10);
}

export function toIsoDate(value?: string | null): string {
  if (!value) return "";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" : date.toISOString().slice(0, 10);
}

export function addDaysIso(iso: string, days: number): string {
  const date = new Date(`${iso}T00:00:00`);
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/** Stable swatch per person so an avatar never changes colour between views. */
export function avatarTone(seed: string | number): 0 | 1 | 2 | 3 | 4 {
  const text = String(seed);
  let hash = 0;
  for (let i = 0; i < text.length; i += 1) {
    hash = (hash * 31 + text.charCodeAt(i)) % 997;
  }
  return (hash % 5) as 0 | 1 | 2 | 3 | 4;
}

/** "Class 8-A · 2026-27" — the classroom identity used across every screen. */
export function classroomLabel(classroom?: Classroom | null): string {
  if (!classroom) return "—";
  const section = classroom.section ? `-${classroom.section}` : "";
  return `${classroom.class?.name ?? "Class"}${section}`;
}

export function classroomLongLabel(classroom?: Classroom | null): string {
  if (!classroom) return "—";
  const session = classroom.session?.name ? ` · ${classroom.session.name}` : "";
  return `${classroomLabel(classroom)}${session}`;
}

export function percent(value?: number | null): string {
  if (value === null || value === undefined || Number.isNaN(value)) return "—";
  return `${Math.round(value)}%`;
}

export function pluralise(count: number, singular: string, plural?: string) {
  return `${count} ${count === 1 ? singular : (plural ?? `${singular}s`)}`;
}

export const DAY_NAMES = [
  "",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
] as const;

export const DAY_SHORT = ["", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;

export function dayName(dayOfWeek: number): string {
  return DAY_NAMES[dayOfWeek] ?? `Day ${dayOfWeek}`;
}

/** `TEACHER_PASSWORD_RESET` → `Teacher password reset` */
export function humaniseAction(action: string): string {
  const words = action.toLowerCase().replace(/_/g, " ");
  return words.charAt(0).toUpperCase() + words.slice(1);
}
