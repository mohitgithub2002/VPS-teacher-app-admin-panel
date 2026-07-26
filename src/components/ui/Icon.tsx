/**
 * Inline icon set — no icon dependency, so the bundle stays small and every
 * glyph inherits currentColor and the 1.75px stroke weight the system uses.
 */

export type IconName =
  | "dashboard"
  | "teachers"
  | "assignment"
  | "book"
  | "layers"
  | "calendar"
  | "grid"
  | "check-circle"
  | "chart"
  | "alert"
  | "activity"
  | "clipboard"
  | "list"
  | "shield"
  | "search"
  | "plus"
  | "close"
  | "chevron-left"
  | "chevron-right"
  | "chevron-down"
  | "check"
  | "refresh"
  | "trash"
  | "edit"
  | "key"
  | "copy"
  | "moon"
  | "sun"
  | "menu"
  | "logout"
  | "user-check"
  | "user-x"
  | "clock"
  | "filter"
  | "inbox"
  | "external";

const PATHS: Record<IconName, string> = {
  dashboard: "M4 13h7V4H4v9Zm0 7h7v-4H4v4Zm9 0h7V11h-7v9Zm0-16v4h7V4h-7Z",
  teachers:
    "M16 20v-1.5a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4V20M9.5 10.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7ZM21 20v-1.5a4 4 0 0 0-3-3.87M16.5 3.63a4 4 0 0 1 0 7.75",
  assignment:
    "M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2M9 5a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2 2 2 0 0 0-2-2h-2a2 2 0 0 0-2 2Zm-1 8h8m-8 4h5",
  book: "M4 19.5A2.5 2.5 0 0 1 6.5 17H20M4 19.5A2.5 2.5 0 0 1 6.5 22H20V2H6.5A2.5 2.5 0 0 0 4 4.5v15Z",
  layers: "M12 2 2 7l10 5 10-5-10-5Zm10 10-10 5-10-5m20 5-10 5-10-5",
  calendar:
    "M8 2v4m8-4v4M3 10h18M5 6h14a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2Z",
  grid: "M4 4h7v7H4V4Zm9 0h7v7h-7V4ZM4 13h7v7H4v-7Zm9 0h7v7h-7v-7Z",
  "check-circle": "M22 11.1V12a10 10 0 1 1-5.9-9.1M22 4 12 14.01l-3-3",
  chart: "M4 20V10m6 10V4m6 16v-7m-12 7h18",
  alert: "M12 9v4m0 4h.01M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z",
  activity: "M22 12h-4l-3 9L9 3l-3 9H2",
  clipboard:
    "M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2m1-2h6a1 1 0 0 1 1 1v2a1 1 0 0 1-1 1H9a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1Z",
  list: "M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01",
  shield: "M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z",
  search: "M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16Zm10 2-4.35-4.35",
  plus: "M12 5v14M5 12h14",
  close: "M18 6 6 18M6 6l12 12",
  "chevron-left": "M15 18l-6-6 6-6",
  "chevron-right": "M9 18l6-6-6-6",
  "chevron-down": "M6 9l6 6 6-6",
  check: "M20 6 9 17l-5-5",
  refresh:
    "M21 12a9 9 0 1 1-3.2-6.9M21 3v6h-6",
  trash: "M3 6h18M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2m3 0-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6h14ZM10 11v6m4-6v6",
  edit: "M11 4H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-5m-1.5-9.5a2.1 2.1 0 0 1 3 3L12 16l-4 1 1-4 9.5-9.5Z",
  key: "M15 7a4 4 0 1 0 3.9 5H21v3h-2v3h-3v-2.1A4 4 0 0 1 15 7Zm-1.5 5.5L3 23m0 0H7v-4",
  copy: "M20 9h-9a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h9a2 2 0 0 0 2-2v-9a2 2 0 0 0-2-2ZM5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1",
  moon: "M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8Z",
  sun: "M12 17a5 5 0 1 0 0-10 5 5 0 0 0 0 10Zm0-15v2m0 18v2M4.2 4.2l1.4 1.4m12.8 12.8 1.4 1.4M2 12h2m18 0h2M4.2 19.8l1.4-1.4M18.4 5.6l1.4-1.4",
  menu: "M3 6h18M3 12h18M3 18h18",
  logout: "M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4m7 14 5-5-5-5m5 5H9",
  "user-check": "M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm7 2 2 2 4-4",
  "user-x": "M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm8 0 4 4m0-4-4 4",
  clock: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Zm0-14v5l3 2",
  filter: "M21 4H3l7 8.5V19l4 2v-8.5L21 4Z",
  inbox:
    "M21 12h-6l-2 3h-2l-2-3H3m18 0-3.2-6.4A2 2 0 0 0 16 4.5H8a2 2 0 0 0-1.8 1.1L3 12v6a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-6Z",
  external: "M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6m4-3h6v6m-11 5L21 3",
};

interface IconProps {
  name: IconName;
  size?: number;
  className?: string;
  strokeWidth?: number;
}

export function Icon({ name, size = 18, className, strokeWidth = 1.75 }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      className={className}
    >
      <path d={PATHS[name]} />
    </svg>
  );
}
