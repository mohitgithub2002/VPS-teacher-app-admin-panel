import type { ReactNode } from "react";

import { avatarTone, initials, percent } from "@/lib/format";
import { Icon, type IconName } from "./Icon";

/* ── Avatar ──────────────────────────────────────────────────────────────── */

export function Avatar({
  name,
  seed,
  size = "md",
  className,
}: {
  name: string;
  seed?: string | number;
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const tone = avatarTone(seed ?? name);
  return (
    <span
      className={[
        "wk-avatar",
        size === "sm" ? "wk-avatar--sm" : size === "lg" ? "wk-avatar--lg" : null,
        `wk-avatar--t${tone}`,
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      aria-hidden="true"
    >
      {initials(name)}
    </span>
  );
}

/* ── Meter ───────────────────────────────────────────────────────────────── */

export function Meter({
  value,
  fillClassName,
  label,
  className,
}: {
  value: number;
  fillClassName?: string;
  label?: string;
  className?: string;
}) {
  const clamped = Math.max(0, Math.min(100, Math.round(value)));
  return (
    <div
      className={["wk-meter", className].filter(Boolean).join(" ")}
      role="progressbar"
      aria-valuenow={clamped}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={label ?? `${clamped}% complete`}
    >
      <div
        className={["wk-meter__fill", fillClassName].filter(Boolean).join(" ")}
        style={{ width: `${clamped}%` }}
      />
    </div>
  );
}

/* ── Stat card ───────────────────────────────────────────────────────────── */

export function StatCard({
  label,
  value,
  meta,
  icon,
  tone,
}: {
  label: string;
  value: ReactNode;
  meta?: ReactNode;
  icon?: IconName;
  tone?: "brand" | "accent";
}) {
  return (
    <article className="wk-stat">
      <div className="wk-stat__top">
        <span className="wk-stat__label">{label}</span>
        {icon ? (
          <span
            className={[
              "wk-stat__icon",
              tone === "brand"
                ? "wk-stat__icon--brand"
                : tone === "accent"
                  ? "wk-stat__icon--accent"
                  : null,
            ]
              .filter(Boolean)
              .join(" ")}
          >
            <Icon name={icon} size={18} />
          </span>
        ) : null}
      </div>
      <div className="wk-stat__value">{value}</div>
      {meta ? <div className="wk-stat__meta">{meta}</div> : null}
    </article>
  );
}

/* ── Chips ───────────────────────────────────────────────────────────────── */

export interface ChipOption<T extends string> {
  value: T;
  label: string;
  count?: number;
}

export function ChipFilter<T extends string>({
  options,
  value,
  onChange,
  label,
}: {
  options: ChipOption<T>[];
  value: T;
  onChange: (value: T) => void;
  label: string;
}) {
  return (
    <div className="wk-chip-set" role="group" aria-label={label}>
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          className="wk-chip"
          aria-pressed={option.value === value}
          onClick={() => onChange(option.value)}
        >
          {option.label}
          {option.count !== undefined ? (
            <span className="wk-chip__count wk-num">{option.count}</span>
          ) : null}
        </button>
      ))}
    </div>
  );
}

/* ── Tabs ────────────────────────────────────────────────────────────────── */

export function Tabs<T extends string>({
  tabs,
  value,
  onChange,
  label,
}: {
  tabs: { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
  label: string;
}) {
  return (
    <div className="wk-tabs" role="tablist" aria-label={label}>
      {tabs.map((tab) => (
        <button
          key={tab.value}
          type="button"
          role="tab"
          className="wk-tab"
          aria-selected={tab.value === value}
          onClick={() => onChange(tab.value)}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}

/* ── Alert ───────────────────────────────────────────────────────────────── */

export function Alert({
  tone = "info",
  title,
  children,
  actions,
}: {
  tone?: "info" | "danger" | "pending" | "success";
  title?: string;
  children?: ReactNode;
  actions?: ReactNode;
}) {
  const icon: IconName =
    tone === "danger" ? "alert" : tone === "success" ? "check-circle" : "alert";
  return (
    <div className={`wk-alert wk-alert--${tone}`} role={tone === "danger" ? "alert" : undefined}>
      <Icon name={icon} size={18} />
      <div className="wk-grow">
        {title ? <div className="wk-alert__title">{title}</div> : null}
        {children}
      </div>
      {actions}
    </div>
  );
}

/* ── Empty & loading states ──────────────────────────────────────────────── */

export function EmptyState({
  icon = "inbox",
  title,
  body,
  action,
}: {
  icon?: IconName;
  title: string;
  body?: string;
  action?: ReactNode;
}) {
  return (
    <div className="wk-empty">
      <span className="wk-empty__icon">
        <Icon name={icon} size={24} />
      </span>
      <h3 className="wk-empty__title">{title}</h3>
      {body ? <p className="wk-empty__body">{body}</p> : null}
      {action ? <div style={{ marginTop: "var(--wk-space-2)" }}>{action}</div> : null}
    </div>
  );
}

export function Skeleton({
  width = "100%",
  height = 16,
  radius,
  className,
}: {
  width?: number | string;
  height?: number | string;
  radius?: string;
  className?: string;
}) {
  return (
    <span
      className={["wk-skeleton", className].filter(Boolean).join(" ")}
      style={{
        display: "block",
        width,
        height,
        borderRadius: radius ?? "var(--wk-radius-xs)",
      }}
      aria-hidden="true"
    />
  );
}

export function TableSkeleton({
  rows = 6,
  columns = 4,
}: {
  rows?: number;
  columns?: number;
}) {
  return (
    <div className="wk-stack-sm" style={{ padding: "var(--wk-space-5)" }} aria-hidden="true">
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div
          key={rowIndex}
          style={{
            display: "grid",
            gridTemplateColumns: `1.6fr repeat(${Math.max(columns - 1, 1)}, 1fr)`,
            gap: "var(--wk-space-4)",
            alignItems: "center",
            paddingBlock: "var(--wk-space-2)",
          }}
        >
          {Array.from({ length: columns }).map((__, colIndex) => (
            <Skeleton
              key={colIndex}
              height={colIndex === 0 ? 20 : 14}
              width={colIndex === 0 ? "72%" : "48%"}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

export function ErrorState({
  error,
  onRetry,
}: {
  error: unknown;
  onRetry?: () => void;
}) {
  const message =
    error instanceof Error ? error.message : "Something went wrong loading this view.";
  return (
    <div className="wk-empty">
      <span className="wk-empty__icon" style={{ color: "var(--wk-red-500)" }}>
        <Icon name="alert" size={24} />
      </span>
      <h3 className="wk-empty__title">Couldn&apos;t load this</h3>
      <p className="wk-empty__body">{message}</p>
      {onRetry ? (
        <button type="button" className="wk-btn wk-btn--outline wk-btn--sm" onClick={onRetry}>
          <Icon name="refresh" size={15} />
          Try again
        </button>
      ) : null}
    </div>
  );
}

/* ── Pagination ──────────────────────────────────────────────────────────── */

export function Pagination({
  page,
  pageSize,
  total,
  pages,
  onPageChange,
  noun = "records",
}: {
  page: number;
  pageSize: number;
  total: number;
  pages: number;
  onPageChange: (page: number) => void;
  noun?: string;
}) {
  const first = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const last = Math.min(page * pageSize, total);

  return (
    <div className="wk-pager">
      <p className="wk-pager__info">
        {total === 0
          ? `No ${noun}`
          : `Showing ${first}–${last} of ${total} ${noun}`}
      </p>
      <div className="wk-row">
        <button
          type="button"
          className="wk-btn wk-btn--outline wk-btn--sm"
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}
        >
          <Icon name="chevron-left" size={15} />
          Previous
        </button>
        <span className="wk-body-sm wk-num wk-text-secondary">
          {page} / {Math.max(pages, 1)}
        </span>
        <button
          type="button"
          className="wk-btn wk-btn--outline wk-btn--sm"
          onClick={() => onPageChange(page + 1)}
          disabled={page >= pages}
        >
          Next
          <Icon name="chevron-right" size={15} />
        </button>
      </div>
    </div>
  );
}

/* ── Misc ────────────────────────────────────────────────────────────────── */

export function PercentCell({ value }: { value: number }) {
  return <span className="wk-num">{percent(value)}</span>;
}
