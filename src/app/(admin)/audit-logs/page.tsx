"use client";

import { useState } from "react";

import { PageHeader } from "@/components/layout/PageHeader";
import { Badge } from "@/components/ui/Badge";
import { Card, CardBody } from "@/components/ui/Card";
import { Input, Select } from "@/components/ui/Field";
import { Drawer } from "@/components/ui/Modal";
import {
  Avatar,
  ChipFilter,
  EmptyState,
  ErrorState,
  Pagination,
  Skeleton,
  TableSkeleton,
} from "@/components/ui/Primitives";
import { useAuditLogDetail, useAuditLogs } from "@/lib/api/queries";
import { addDaysIso, formatDateTime, humaniseAction, todayIso } from "@/lib/format";
import type { AuditActorType } from "@/lib/api/types";

const PAGE_SIZE = 25;

const ACTOR_FILTERS = [
  { value: "all" as const, label: "Everyone" },
  { value: "ADMIN" as const, label: "Admins" },
  { value: "TEACHER" as const, label: "Teachers" },
];

/** The documented action vocabulary, grouped the way admins think about it. */
const ACTIONS: { group: string; values: string[] }[] = [
  {
    group: "Teachers",
    values: [
      "TEACHER_CREATED",
      "TEACHER_UPDATED",
      "TEACHER_ACTIVATED",
      "TEACHER_DEACTIVATED",
      "TEACHER_PASSWORD_RESET",
    ],
  },
  { group: "Assignments", values: ["ASSIGNMENT_CREATED", "ASSIGNMENT_DEACTIVATED"] },
  {
    group: "Calendar",
    values: [
      "CALENDAR_EVENT_CREATED",
      "CALENDAR_EVENT_UPDATED",
      "CALENDAR_EVENT_DELETED",
    ],
  },
  { group: "Attendance", values: ["ATTENDANCE_RECORDED", "ATTENDANCE_CORRECTED"] },
  {
    group: "Sessions",
    values: [
      "SESSION_LOGGED",
      "SESSION_UPDATED",
      "SESSION_DELETED",
      "SESSION_TOPICS_ADDED",
      "SESSION_TOPIC_UPDATED",
      "SESSION_TOPIC_REMOVED",
    ],
  },
];

function actionTone(action: string) {
  if (action.includes("DELETED") || action.includes("DEACTIVATED")) return "danger";
  if (action.includes("CREATED") || action.includes("LOGGED")) return "success";
  if (action.includes("PASSWORD")) return "pending";
  return "neutral";
}

export default function AuditLogsPage() {
  const [actorType, setActorType] = useState<"all" | AuditActorType>("all");
  const [action, setAction] = useState("");
  const [entityType, setEntityType] = useState("");
  const [from, setFrom] = useState(addDaysIso(todayIso(), -14));
  const [to, setTo] = useState(todayIso());
  const [page, setPage] = useState(1);
  const [openId, setOpenId] = useState<number | null>(null);

  const logs = useAuditLogs({
    page,
    pageSize: PAGE_SIZE,
    ...(actorType === "all" ? {} : { actorType }),
    ...(action ? { action } : {}),
    ...(entityType ? { entityType } : {}),
    from,
    to,
  });

  const detail = useAuditLogDetail(openId);

  const rows = logs.data?.logs ?? [];
  const pagination = logs.data?.pagination;

  return (
    <main className="wk-page wk-page--wide">
      <PageHeader
        title="Audit trail"
        lede="Every admin and teacher action, with the before and after values. Read-only by design."
      />

      <div className="wk-toolbar">
        <ChipFilter
          options={ACTOR_FILTERS}
          value={actorType}
          onChange={(value) => {
            setActorType(value);
            setPage(1);
          }}
          label="Filter by actor"
        />
      </div>

      <div className="wk-toolbar">
        <Select
          label="Action"
          value={action}
          onChange={(event) => {
            setAction(event.target.value);
            setPage(1);
          }}
          fieldClassName="wk-toolbar__field"
        >
          <option value="">All actions</option>
          {ACTIONS.map((group) => (
            <optgroup key={group.group} label={group.group}>
              {group.values.map((value) => (
                <option key={value} value={value}>
                  {humaniseAction(value)}
                </option>
              ))}
            </optgroup>
          ))}
        </Select>
        <Select
          label="Entity"
          value={entityType}
          onChange={(event) => {
            setEntityType(event.target.value);
            setPage(1);
          }}
          fieldClassName="wk-toolbar__field"
        >
          <option value="">All entities</option>
          {["Teacher", "TeacherAssignment", "CalendarEvent", "TeacherAttendance", "SessionLog", "Subject", "Chapter", "Topic", "Subtopic", "TimetableSlot"].map(
            (value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ),
          )}
        </Select>
        <Input
          label="From"
          type="date"
          value={from}
          max={to}
          onChange={(event) => {
            setFrom(event.target.value);
            setPage(1);
          }}
          fieldClassName="wk-toolbar__field"
        />
        <Input
          label="To"
          type="date"
          value={to}
          min={from}
          onChange={(event) => {
            setTo(event.target.value);
            setPage(1);
          }}
          fieldClassName="wk-toolbar__field"
        />
      </div>

      <Card>
        <CardBody padding="flush">
          {logs.isLoading ? (
            <TableSkeleton rows={9} columns={4} />
          ) : logs.isError ? (
            <ErrorState error={logs.error} onRetry={() => logs.refetch()} />
          ) : rows.length === 0 ? (
            <EmptyState
              icon="shield"
              title="No matching entries"
              body="Widen the date range or clear the action and entity filters."
            />
          ) : (
            <div className="wk-table-wrap">
              <table className="wk-table wk-table--clickable">
                <thead>
                  <tr>
                    <th>When</th>
                    <th>Actor</th>
                    <th>Action</th>
                    <th>Entity</th>
                    <th aria-label="Actions" />
                  </tr>
                </thead>
                <tbody>
                  {rows.map((log) => (
                    <tr key={log.id} onClick={() => setOpenId(log.id)}>
                      <td>
                        <div className="wk-num">{formatDateTime(log.createdAt)}</div>
                      </td>
                      <td>
                        <div className="wk-row">
                          <Avatar name={log.actorName} seed={`${log.actorType}${log.actorId}`} size="sm" />
                          <div>
                            <div className="wk-table__primary">{log.actorName}</div>
                            <div className="wk-caption">
                              {log.actorType === "ADMIN" ? "Admin" : "Teacher"}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td>
                        <Badge tone={actionTone(log.action)} dot>
                          {humaniseAction(log.action)}
                        </Badge>
                      </td>
                      <td>
                        <div>{log.entityType}</div>
                        <div className="wk-caption wk-num">#{log.entityId}</div>
                      </td>
                      <td>
                        <div className="wk-table__actions">
                          <button
                            type="button"
                            className="wk-btn wk-btn--ghost wk-btn--sm"
                            onClick={(event) => {
                              event.stopPropagation();
                              setOpenId(log.id);
                            }}
                          >
                            Diff
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardBody>

        {pagination && rows.length > 0 ? (
          <Pagination
            page={pagination.page}
            pageSize={pagination.pageSize}
            total={pagination.total}
            pages={pagination.pages}
            onPageChange={setPage}
            noun="entries"
          />
        ) : null}
      </Card>

      <Drawer
        open={openId !== null}
        onClose={() => setOpenId(null)}
        title="Audit entry"
        description={
          detail.data
            ? `${humaniseAction(detail.data.action)} · ${formatDateTime(detail.data.createdAt)}`
            : undefined
        }
      >
        {detail.isLoading ? (
          <div className="wk-stack">
            <Skeleton height={18} width="50%" />
            <Skeleton height={120} />
          </div>
        ) : detail.isError ? (
          <ErrorState error={detail.error} onRetry={() => detail.refetch()} />
        ) : detail.data ? (
          <div className="wk-stack-lg">
            <dl className="wk-kv">
              <dt>Actor</dt>
              <dd>
                {detail.data.actorName} ·{" "}
                {detail.data.actorType === "ADMIN" ? "Admin" : "Teacher"} #
                {detail.data.actorId}
              </dd>
              <dt>Action</dt>
              <dd>{humaniseAction(detail.data.action)}</dd>
              <dt>Entity</dt>
              <dd className="wk-num">
                {detail.data.entityType} #{detail.data.entityId}
              </dd>
              <dt>Recorded</dt>
              <dd>{formatDateTime(detail.data.createdAt)}</dd>
            </dl>

            <ValueDiff
              oldValue={detail.data.oldValue}
              newValue={detail.data.newValue}
            />
          </div>
        ) : null}
      </Drawer>
    </main>
  );
}

/** Field-by-field before/after, so a change reads as a change. */
function ValueDiff({
  oldValue,
  newValue,
}: {
  oldValue: Record<string, unknown> | null;
  newValue: Record<string, unknown> | null;
}) {
  const fields = [
    ...new Set([...Object.keys(oldValue ?? {}), ...Object.keys(newValue ?? {})]),
  ].sort();

  if (fields.length === 0) {
    return (
      <p className="wk-body-sm wk-text-secondary">
        This action recorded no field-level values — the action itself is the record.
      </p>
    );
  }

  const render = (value: unknown) => {
    if (value === undefined) return <span className="wk-text-muted">—</span>;
    if (value === null) return <span className="wk-text-muted">null</span>;
    if (typeof value === "object") return JSON.stringify(value);
    return String(value);
  };

  return (
    <div>
      <h3 className="wk-overline wk-text-muted" style={{ marginBottom: 10 }}>
        Changes
      </h3>
      <div className="wk-table-wrap">
        <table className="wk-table">
          <thead>
            <tr>
              <th>Field</th>
              <th>Before</th>
              <th>After</th>
            </tr>
          </thead>
          <tbody>
            {fields.map((field) => {
              const before = oldValue?.[field];
              const after = newValue?.[field];
              const changed = JSON.stringify(before) !== JSON.stringify(after);
              return (
                <tr key={field}>
                  <td className="wk-table__primary">{field}</td>
                  <td>{render(before)}</td>
                  <td style={changed ? { color: "var(--wk-red-600)", fontWeight: 600 } : undefined}>
                    {render(after)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
