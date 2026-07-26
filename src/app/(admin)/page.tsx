"use client";

import Link from "next/link";

import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/Button";
import { Card, CardBody, CardFoot, CardHead } from "@/components/ui/Card";
import { Icon } from "@/components/ui/Icon";
import {
  Alert,
  EmptyState,
  ErrorState,
  Meter,
  Skeleton,
  StatCard,
} from "@/components/ui/Primitives";
import { Badge, PacingBadge, pacingMeterClass } from "@/components/ui/Badge";
import { useToast } from "@/components/ui/Toast";
import {
  useBehindPacing,
  useEffectiveDays,
  useOverview,
  useRecalculatePacing,
  useTeacherActivity,
} from "@/lib/api/queries";
import { addDaysIso, percent, relativeDays, todayIso } from "@/lib/format";
import type { PacingStatus } from "@/lib/api/types";

const PACING_ORDER: PacingStatus[] = ["BEHIND", "ON_TRACK", "AHEAD", "COMPLETED"];
const HORIZON_DAYS = 90;

export default function DashboardPage() {
  const toast = useToast();
  const overview = useOverview();
  const behind = useBehindPacing();
  const activity = useTeacherActivity();
  const recalculate = useRecalculatePacing();

  const from = todayIso();
  const to = addDaysIso(from, HORIZON_DAYS);
  const effectiveDays = useEffectiveDays(from, to);

  const data = overview.data;
  const breakdownTotal = data
    ? PACING_ORDER.reduce((sum, key) => sum + (data.pacingBreakdown[key] ?? 0), 0)
    : 0;

  const silent = (activity.data ?? []).filter(
    (row) => row.lastSessionDate === null,
  ).length;

  const onRecalculate = () => {
    recalculate.mutate(undefined, {
      onSuccess: (result) =>
        toast.success(
          "Pacing recalculated",
          result.recalculated
            ? `${result.recalculated} assignments refreshed.`
            : `Scope: ${result.scope}.`,
        ),
      onError: (error) => toast.fromError(error, "Recalculation failed"),
    });
  };

  return (
    <main className="wk-page wk-page--wide">
      <PageHeader
        title={
          data?.session ? `Dashboard · ${data.session.name}` : "Dashboard"
        }
        lede="Headline numbers for the current academic session, and the chapters that need a conversation this week."
        actions={
          <Button
            icon="refresh"
            onClick={onRecalculate}
            loading={recalculate.isPending}
            title="Recalculate pacing for every active assignment"
          >
            Recalculate pacing
          </Button>
        }
      />

      {overview.isError ? (
        <Card>
          <ErrorState error={overview.error} onRetry={() => overview.refetch()} />
        </Card>
      ) : (
        <div className="wk-stack-lg">
          <section className="wk-stats" aria-label="Key figures">
            {overview.isLoading || !data ? (
              Array.from({ length: 4 }).map((_, index) => (
                <div className="wk-stat" key={index}>
                  <Skeleton width="45%" height={12} />
                  <Skeleton width="35%" height={34} />
                  <Skeleton width="60%" height={12} />
                </div>
              ))
            ) : (
              <>
                <StatCard
                  label="Active teachers"
                  value={data.totalTeachers}
                  meta={`${data.totalAssignments} active assignments`}
                  icon="teachers"
                />
                <StatCard
                  label="Syllabus completion"
                  value={percent(data.overallCompletionPercent)}
                  meta={`${data.totalChapters} chapters across ${data.totalSubjects} subjects`}
                  icon="chart"
                  tone="accent"
                />
                <StatCard
                  label="Sessions today"
                  value={data.sessionsLoggedToday}
                  meta={`${data.sessionsLoggedThisWeek} logged in the last 7 days`}
                  icon="book"
                />
                <StatCard
                  label="Behind schedule"
                  value={data.pacingBreakdown.BEHIND ?? 0}
                  meta={
                    silent > 0
                      ? `${silent} teachers have never logged a session`
                      : "Every teacher has logged at least once"
                  }
                  icon="alert"
                  tone="brand"
                />
              </>
            )}
          </section>

          {silent > 0 ? (
            <Alert tone="pending" title={`${silent} teachers have never logged a session`}>
              A teacher with no sessions at all usually means an onboarding gap, not
              a pacing problem.{" "}
              <Link href="/activity" className="wk-text-brand">
                Review teacher activity →
              </Link>
            </Alert>
          ) : null}

          <div className="wk-cols">
            <Card>
              <CardHead
                title="Behind schedule"
                subtitle="Sorted by how far behind each chapter has slipped"
                actions={
                  behind.data && behind.data.length > 0 ? (
                    <Badge tone="danger">{behind.data.length}</Badge>
                  ) : null
                }
              />
              <CardBody padding="flush">
                {behind.isLoading ? (
                  <div className="wk-stack" style={{ padding: "var(--wk-space-5)" }}>
                    {Array.from({ length: 4 }).map((_, index) => (
                      <Skeleton key={index} height={44} radius="var(--wk-radius-sm)" />
                    ))}
                  </div>
                ) : behind.isError ? (
                  <ErrorState error={behind.error} onRetry={() => behind.refetch()} />
                ) : (behind.data ?? []).length === 0 ? (
                  <EmptyState
                    icon="check-circle"
                    title="Nothing is behind"
                    body="Every chapter with an active assignment is on track or better."
                  />
                ) : (
                  <ul>
                    {behind.data!.slice(0, 6).map((row) => (
                      <li
                        key={row.id}
                        style={{
                          padding: "var(--wk-space-4) var(--wk-space-6)",
                          borderBottom: "1px solid var(--wk-border-subtle)",
                        }}
                      >
                        <div className="wk-spread" style={{ marginBottom: 8 }}>
                          <div style={{ minWidth: 0 }}>
                            <div className="wk-truncate" style={{ fontWeight: 600 }}>
                              {row.chapter?.name ?? "Chapter"}
                            </div>
                            <div className="wk-body-sm wk-text-secondary wk-truncate">
                              {row.assignment?.subject?.name} ·{" "}
                              {row.assignment?.classroom?.class?.name} ·{" "}
                              {row.assignment?.teacher?.name}
                            </div>
                          </div>
                          <div style={{ textAlign: "right", flex: "none" }}>
                            <div className="wk-num" style={{ fontWeight: 600 }}>
                              {percent(row.completionPercent)}
                            </div>
                            {row.daysBehind ? (
                              <div className="wk-caption">{row.daysBehind}d behind</div>
                            ) : null}
                          </div>
                        </div>
                        <Meter
                          value={row.completionPercent}
                          fillClassName={pacingMeterClass("BEHIND")}
                          label={`${row.chapter?.name} ${row.completionPercent}% complete`}
                        />
                      </li>
                    ))}
                  </ul>
                )}
              </CardBody>
              {(behind.data ?? []).length > 0 ? (
                <CardFoot>
                  <Link href="/pacing" className="wk-btn wk-btn--primary wk-btn--sm">
                    Open pacing alerts
                    <Icon name="chevron-right" size={15} />
                  </Link>
                </CardFoot>
              ) : null}
            </Card>

            <div className="wk-stack-lg">
              <Card>
                <CardHead
                  title="Pacing mix"
                  subtitle={
                    breakdownTotal > 0
                      ? `${breakdownTotal} tracked chapters`
                      : "No pacing rows yet"
                  }
                />
                <CardBody>
                  {overview.isLoading || !data ? (
                    <div className="wk-stack">
                      {Array.from({ length: 4 }).map((_, index) => (
                        <Skeleton key={index} height={28} />
                      ))}
                    </div>
                  ) : breakdownTotal === 0 ? (
                    <p className="wk-body-sm wk-text-secondary">
                      Pacing appears once assignments and chapters exist for this
                      session.
                    </p>
                  ) : (
                    <div className="wk-stack">
                      {PACING_ORDER.map((status) => {
                        const count = data.pacingBreakdown[status] ?? 0;
                        const share = (count / breakdownTotal) * 100;
                        return (
                          <div key={status}>
                            <div className="wk-spread" style={{ marginBottom: 6 }}>
                              <PacingBadge status={status} />
                              <span className="wk-body-sm wk-num wk-text-secondary">
                                {count} · {percent(share)}
                              </span>
                            </div>
                            <Meter
                              value={share}
                              fillClassName={pacingMeterClass(status)}
                              label={`${status} ${Math.round(share)}%`}
                            />
                          </div>
                        );
                      })}
                    </div>
                  )}
                </CardBody>
              </Card>

              <Card>
                <CardHead
                  title="Teaching days ahead"
                  subtitle={`Next ${HORIZON_DAYS} days, after Sundays, holidays and exam blocks`}
                />
                <CardBody>
                  {effectiveDays.isLoading ? (
                    <Skeleton width="40%" height={38} />
                  ) : effectiveDays.isError ? (
                    <p className="wk-body-sm wk-text-secondary">
                      Effective days are unavailable right now.
                    </p>
                  ) : (
                    <div className="wk-row" style={{ alignItems: "baseline", gap: 12 }}>
                      <span className="wk-h2 wk-num">
                        {effectiveDays.data?.effectiveDays ?? 0}
                      </span>
                      <span className="wk-body-sm wk-text-secondary">
                        teaching days left in the window
                      </span>
                    </div>
                  )}
                </CardBody>
                <CardFoot>
                  <Link href="/calendar" className="wk-btn wk-btn--ghost wk-btn--sm">
                    Manage calendar
                    <Icon name="chevron-right" size={15} />
                  </Link>
                </CardFoot>
              </Card>
            </div>
          </div>

          <Card>
            <CardHead
              title="Quietest teachers"
              subtitle="Longest since a session was logged — never-logged first"
            />
            <CardBody padding="flush">
              {activity.isLoading ? (
                <div className="wk-stack" style={{ padding: "var(--wk-space-5)" }}>
                  {Array.from({ length: 5 }).map((_, index) => (
                    <Skeleton key={index} height={24} />
                  ))}
                </div>
              ) : activity.isError ? (
                <ErrorState error={activity.error} onRetry={() => activity.refetch()} />
              ) : (activity.data ?? []).length === 0 ? (
                <EmptyState title="No teachers yet" body="Create a teacher account to begin." />
              ) : (
                <div className="wk-table-wrap">
                  <table className="wk-table">
                    <thead>
                      <tr>
                        <th>Teacher</th>
                        <th>Employee ID</th>
                        <th>Last session</th>
                      </tr>
                    </thead>
                    <tbody>
                      {activity.data!.slice(0, 8).map((row) => (
                        <tr key={row.id}>
                          <td className="wk-table__primary">
                            <Link href={`/teachers/${row.id}`}>{row.name}</Link>
                          </td>
                          <td className="wk-num">{row.employeeId}</td>
                          <td>
                            {row.lastSessionDate === null ? (
                              <Badge tone="danger" dot>
                                Never logged
                              </Badge>
                            ) : (
                              relativeDays(row.lastSessionDate)
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardBody>
            <CardFoot>
              <Link href="/activity" className="wk-btn wk-btn--ghost wk-btn--sm">
                All teacher activity
                <Icon name="chevron-right" size={15} />
              </Link>
            </CardFoot>
          </Card>
        </div>
      )}
    </main>
  );
}
