"use client";

import Link from "next/link";
import { useState } from "react";

import { PageHeader } from "@/components/layout/PageHeader";
import { Badge } from "@/components/ui/Badge";
import { Card, CardBody, CardHead } from "@/components/ui/Card";
import { Icon } from "@/components/ui/Icon";
import {
  Avatar,
  ChipFilter,
  EmptyState,
  ErrorState,
  StatCard,
  TableSkeleton,
} from "@/components/ui/Primitives";
import { useTeacherActivity } from "@/lib/api/queries";
import { daysSince, formatDate, relativeDays } from "@/lib/format";

type Filter = "all" | "never" | "stale";

const STALE_DAYS = 7;

const FILTERS = [
  { value: "all" as const, label: "Everyone" },
  { value: "never" as const, label: "Never logged" },
  { value: "stale" as const, label: `Quiet ${STALE_DAYS}+ days` },
];

export default function ActivityPage() {
  const [filter, setFilter] = useState<Filter>("all");
  const activity = useTeacherActivity();
  const all = activity.data ?? [];

  const never = all.filter((row) => row.lastSessionDate === null);
  const stale = all.filter((row) => {
    const days = daysSince(row.lastSessionDate);
    return days !== null && days >= STALE_DAYS;
  });

  const rows =
    filter === "never" ? never : filter === "stale" ? stale : all;

  return (
    <main className="wk-page wk-page--wide">
      <PageHeader
        title="Teacher activity"
        lede="Who is logging sessions and who isn't. Teachers who have never logged one are listed first — that usually means onboarding, not workload."
      />

      <div className="wk-stats" style={{ marginBottom: "var(--wk-space-6)" }}>
        <StatCard
          label="Active teachers"
          value={activity.isLoading ? "—" : all.length}
          meta="With at least one assignment or account"
          icon="teachers"
        />
        <StatCard
          label="Never logged a session"
          value={activity.isLoading ? "—" : never.length}
          meta="Needs a follow-up"
          icon="user-x"
          tone="brand"
        />
        <StatCard
          label={`Quiet for ${STALE_DAYS}+ days`}
          value={activity.isLoading ? "—" : stale.length}
          meta="Logged something, but not recently"
          icon="clock"
          tone="accent"
        />
      </div>

      <div className="wk-toolbar">
        <ChipFilter
          options={FILTERS}
          value={filter}
          onChange={setFilter}
          label="Filter activity"
        />
      </div>

      <Card>
        <CardHead
          title="Last session logged"
          subtitle="Never-logged first, then oldest to most recent"
        />
        <CardBody padding="flush">
          {activity.isLoading ? (
            <TableSkeleton rows={8} columns={4} />
          ) : activity.isError ? (
            <ErrorState error={activity.error} onRetry={() => activity.refetch()} />
          ) : rows.length === 0 ? (
            <EmptyState
              icon="check-circle"
              title="Nobody in this bucket"
              body="Every teacher has logged a session recently."
            />
          ) : (
            <div className="wk-table-wrap">
              <table className="wk-table">
                <thead>
                  <tr>
                    <th>Teacher</th>
                    <th>Employee ID</th>
                    <th>Last session</th>
                    <th>Age</th>
                    <th aria-label="Actions" />
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => {
                    const days = daysSince(row.lastSessionDate);
                    return (
                      <tr key={row.id}>
                        <td>
                          <div className="wk-row">
                            <Avatar name={row.name} seed={row.id} size="sm" />
                            <Link href={`/teachers/${row.id}`} className="wk-table__primary">
                              {row.name}
                            </Link>
                          </div>
                        </td>
                        <td className="wk-num">{row.employeeId}</td>
                        <td>
                          {row.lastSessionDate === null ? (
                            <Badge tone="danger" dot>
                              Never logged
                            </Badge>
                          ) : (
                            <>
                              <div className="wk-num">{formatDate(row.lastSessionDate)}</div>
                              <div className="wk-caption">
                                {relativeDays(row.lastSessionDate)}
                              </div>
                            </>
                          )}
                        </td>
                        <td>
                          {days === null ? (
                            "—"
                          ) : days >= STALE_DAYS ? (
                            <Badge tone="pending" dot>
                              {days} days
                            </Badge>
                          ) : (
                            <Badge tone="success" dot>
                              {days <= 0 ? "Today" : `${days} days`}
                            </Badge>
                          )}
                        </td>
                        <td>
                          <div className="wk-table__actions">
                            <Link
                              href={`/sessions?teacherId=${row.id}`}
                              className="wk-btn wk-btn--outline wk-btn--sm"
                            >
                              Sessions
                              <Icon name="chevron-right" size={15} />
                            </Link>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardBody>
      </Card>
    </main>
  );
}
