import type { IconName } from "@/components/ui/Icon";

export interface NavItem {
  href: string;
  label: string;
  icon: IconName;
  /** Shows the behind-schedule count from GET /pacing/behind. */
  badge?: "behind";
  /** Breadcrumb trail shown in the topbar. */
  section: string;
}

export interface NavGroup {
  label: string;
  items: NavItem[];
}

export const NAV: NavGroup[] = [
  {
    label: "Overview",
    items: [
      { href: "/", label: "Dashboard", icon: "dashboard", section: "Overview" },
      {
        href: "/pacing",
        label: "Pacing alerts",
        icon: "alert",
        badge: "behind",
        section: "Overview",
      },
    ],
  },
  {
    label: "People",
    items: [
      { href: "/teachers", label: "Teachers", icon: "teachers", section: "People" },
      {
        href: "/assignments",
        label: "Assignments",
        icon: "assignment",
        section: "People",
      },
      {
        href: "/attendance",
        label: "Attendance",
        icon: "check-circle",
        section: "People",
      },
    ],
  },
  {
    label: "Syllabus",
    items: [
      { href: "/syllabus", label: "Syllabus builder", icon: "layers", section: "Syllabus" },
      { href: "/progress", label: "Progress matrix", icon: "chart", section: "Syllabus" },
      {
        href: "/test-coverage",
        label: "Test coverage",
        icon: "clipboard",
        section: "Syllabus",
      },
      { href: "/unmarked", label: "Unmarked topics", icon: "inbox", section: "Syllabus" },
    ],
  },
  {
    label: "Schedule",
    items: [
      { href: "/calendar", label: "Calendar", icon: "calendar", section: "Schedule" },
      { href: "/timetable", label: "Timetable", icon: "grid", section: "Schedule" },
    ],
  },
  {
    label: "Records",
    items: [
      { href: "/sessions", label: "Session logs", icon: "book", section: "Records" },
      { href: "/activity", label: "Teacher activity", icon: "activity", section: "Records" },
      { href: "/audit-logs", label: "Audit trail", icon: "shield", section: "Records" },
    ],
  },
];

export const NAV_ITEMS = NAV.flatMap((group) => group.items);

/** Longest-prefix match so /teachers/12 still highlights Teachers. */
export function matchNavItem(pathname: string): NavItem | undefined {
  if (pathname === "/") return NAV_ITEMS[0];
  return NAV_ITEMS.filter((item) => item.href !== "/" && pathname.startsWith(item.href)).sort(
    (a, b) => b.href.length - a.href.length,
  )[0];
}
