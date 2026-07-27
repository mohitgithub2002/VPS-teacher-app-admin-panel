"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";

import { Avatar } from "@/components/ui/Primitives";
import { Icon } from "@/components/ui/Icon";
import { useToast } from "@/components/ui/Toast";
import { useTheme } from "@/components/layout/ThemeProvider";
import { useBehindPacing, useLogout, useMe } from "@/lib/api/queries";

import { NAV, matchNavItem } from "./nav";

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const toast = useToast();
  const { theme, toggleTheme } = useTheme();
  const [navOpen, setNavOpen] = useState(false);

  const me = useMe();
  const behind = useBehindPacing({ refetchOnWindowFocus: true });
  const logout = useLogout();

  const behindCount = behind.data?.length ?? 0;
  const active = matchNavItem(pathname);

  // Close the mobile drawer whenever the route changes.
  useEffect(() => setNavOpen(false), [pathname]);

  const onLogout = () => {
    logout.mutate(undefined, {
      onSuccess: () => router.replace("/login"),
      onError: (error) => toast.fromError(error, "Could not sign out"),
    });
  };

  return (
    <div className="wk-shell">
      {navOpen ? (
        <div className="wk-side__scrim" onClick={() => setNavOpen(false)} aria-hidden="true" />
      ) : null}

      <aside className="wk-side" data-open={navOpen} aria-label="Admin sections">
        <div className="wk-side__brand">
          <span className="wk-logo" aria-hidden="true">
            V
          </span>
          <div className="wk-grow">
            <div className="wk-side__name">VPS School</div>
            <div className="wk-side__role">Teacher management</div>
          </div>
          <button
            type="button"
            className="wk-close wk-side__close"
            onClick={() => setNavOpen(false)}
            aria-label="Close navigation"
          >
            <Icon name="close" size={18} />
          </button>
        </div>

        <nav className="wk-side__nav">
          {NAV.map((group) => (
            <div key={group.label}>
              <div className="wk-side__group">{group.label}</div>
              {group.items.map((item) => {
                const isCurrent = active?.href === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="wk-navlink"
                    aria-current={isCurrent ? "page" : undefined}
                  >
                    <span className="wk-navlink__icon">
                      <Icon name={item.icon} size={18} />
                    </span>
                    {item.label}
                    {item.badge === "behind" && behindCount > 0 ? (
                      <span className="wk-navlink__badge">{behindCount}</span>
                    ) : null}
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>

        <div className="wk-side__foot">
          <Avatar name={me.data?.name ?? "Admin"} size="sm" />
          <div className="wk-grow" style={{ minWidth: 0 }}>
            <div className="wk-side__name wk-truncate">{me.data?.name ?? "Admin"}</div>
            <div className="wk-side__role">
              {me.data?.role === "SUPERUSER" ? "Superuser" : "Administrator"}
            </div>
          </div>
          <button
            type="button"
            className="wk-close"
            style={{ color: "var(--wk-ink-300)" }}
            onClick={onLogout}
            aria-label="Sign out"
            title="Sign out"
          >
            <Icon name="logout" size={18} />
          </button>
        </div>
      </aside>

      <div className="wk-main">
        <header className="wk-topbar">
          <button
            type="button"
            className="wk-iconbtn wk-topbar__menu"
            onClick={() => setNavOpen(true)}
            aria-label="Open navigation"
          >
            <Icon name="menu" size={18} />
          </button>

          <nav className="wk-topbar__crumbs" aria-label="Breadcrumb">
            <span>{active?.section ?? "Admin"}</span>
            <span className="wk-topbar__sep" aria-hidden="true">
              /
            </span>
            <b className="wk-truncate">{active?.label ?? "Dashboard"}</b>
          </nav>

          <div className="wk-topbar__actions">
            <button
              type="button"
              className="wk-iconbtn"
              onClick={toggleTheme}
              aria-label={theme === "dark" ? "Switch to light theme" : "Switch to dark theme"}
              title={theme === "dark" ? "Light theme" : "Dark theme"}
            >
              <Icon name={theme === "dark" ? "sun" : "moon"} size={18} />
            </button>
          </div>
        </header>

        {children}
      </div>
    </div>
  );
}
