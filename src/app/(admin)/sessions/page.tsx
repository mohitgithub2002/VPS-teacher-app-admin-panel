"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";

import { ClassroomPicker, TeacherPicker } from "@/components/domain/Pickers";
import { PageHeader } from "@/components/layout/PageHeader";
import { Badge, SessionTypeBadge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardBody } from "@/components/ui/Card";
import { Input, Select } from "@/components/ui/Field";
import { ConfirmDialog, Drawer } from "@/components/ui/Modal";
import {
  EmptyState,
  ErrorState,
  Pagination,
  Skeleton,
  TableSkeleton,
} from "@/components/ui/Primitives";
import { useToast } from "@/components/ui/Toast";
import { useDeleteSession, useSessionDetail, useSessions } from "@/lib/api/queries";
import { addDaysIso, formatDate, formatDateTime, relativeDays, todayIso } from "@/lib/format";
import type { SessionLogType } from "@/lib/api/types";

const PAGE_SIZE = 25;

const TYPES: { value: "" | SessionLogType; label: string }[] = [
  { value: "", label: "All types" },
  { value: "TEACHING", label: "Teaching" },
  { value: "REVISION", label: "Revision" },
  { value: "QA", label: "Q&A" },
  { value: "TEST", label: "Test" },
];

export default function SessionsPage() {
  return (
    <Suspense fallback={null}>
      <SessionsView />
    </Suspense>
  );
}

function SessionsView() {
  const toast = useToast();
  const params = useSearchParams();
  const initialTeacher = Number(params.get("teacherId"));

  const [teacherId, setTeacherId] = useState<number | "">(
    Number.isFinite(initialTeacher) && initialTeacher > 0 ? initialTeacher : "",
  );
  const [classroomId, setClassroomId] = useState<number | "">("");
  const [type, setType] = useState<"" | SessionLogType>("");
  const [from, setFrom] = useState(addDaysIso(todayIso(), -30));
  const [to, setTo] = useState(todayIso());
  const [page, setPage] = useState(1);
  const [openId, setOpenId] = useState<number | null>(null);
  const [deleting, setDeleting] = useState<number | null>(null);

  const sessions = useSessions({
    page,
    pageSize: PAGE_SIZE,
    ...(teacherId === "" ? {} : { teacherId }),
    ...(classroomId === "" ? {} : { classroomId }),
    ...(type === "" ? {} : { type }),
    from,
    to,
  });

  const detail = useSessionDetail(openId);
  const remove = useDeleteSession();

  const rows = sessions.data?.sessions ?? [];
  const pagination = sessions.data?.pagination;

  const resetPage = <T,>(setter: (value: T) => void) => (value: T) => {
    setter(value);
    setPage(1);
  };

  const onDelete = () => {
    if (deleting === null) return;
    remove.mutate(deleting, {
      onSuccess: () => {
        toast.success("Session deleted", "Pacing has been recalculated for the assignment.");
        setDeleting(null);
        setOpenId(null);
      },
      onError: (error) => toast.fromError(error, "Could not delete the session"),
    });
  };

  return (
    <main className="wk-page wk-page--wide">
      <PageHeader
        title="Session logs"
        lede="Every session logged by every teacher. Admins can delete an erroneous entry at any time — it is recorded in the audit trail."
      />

      <div className="wk-toolbar">
        <TeacherPicker
          value={teacherId}
          onChange={resetPage(setTeacherId)}
          className="wk-toolbar__field"
          activeOnly={false}
        />
        <ClassroomPicker
          value={classroomId}
          onChange={resetPage(setClassroomId)}
          className="wk-toolbar__field"
        />
        <Select
          label="Type"
          value={type}
          onChange={(event) => {
            setType(event.target.value as "" | SessionLogType);
            setPage(1);
          }}
          fieldClassName="wk-toolbar__field"
        >
          {TYPES.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
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
          {sessions.isLoading ? (
            <TableSkeleton rows={8} columns={5} />
          ) : sessions.isError ? (
            <ErrorState error={sessions.error} onRetry={() => sessions.refetch()} />
          ) : rows.length === 0 ? (
            <EmptyState
              icon="book"
              title="No sessions in this range"
              body="Widen the dates, or clear the teacher and classroom filters."
            />
          ) : (
            <div className="wk-table-wrap">
              <table className="wk-table wk-table--clickable">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Teacher</th>
                    <th>Class · subject</th>
                    <th>Type</th>
                    <th className="wk-table__num">Topics</th>
                    <th>Notes</th>
                    <th aria-label="Actions" />
                  </tr>
                </thead>
                <tbody>
                  {rows.map((log) => (
                    <tr key={log.id} onClick={() => setOpenId(log.id)}>
                      <td>
                        <div className="wk-num">{formatDate(log.sessionDate)}</div>
                        <div className="wk-caption">{relativeDays(log.sessionDate)}</div>
                      </td>
                      <td>
                        <div className="wk-table__primary">{log.assignment?.teacher?.name}</div>
                        <div className="wk-caption wk-num">
                          {log.assignment?.teacher?.employeeId}
                        </div>
                      </td>
                      <td>
                        {log.assignment?.classroom?.class?.name} ·{" "}
                        {log.assignment?.subject?.name}
                      </td>
                      <td>
                        <SessionTypeBadge type={log.type} />
                      </td>
                      <td className="wk-table__num">{log._count?.topics ?? 0}</td>
                      <td className="wk-truncate" style={{ maxWidth: 240 }}>
                        {log.notes ?? "—"}
                      </td>
                      <td>
                        <div className="wk-table__actions">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(event) => {
                              event.stopPropagation();
                              setOpenId(log.id);
                            }}
                          >
                            View
                          </Button>
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
            noun="sessions"
          />
        ) : null}
      </Card>

      <Drawer
        open={openId !== null}
        onClose={() => setOpenId(null)}
        title="Session detail"
        description={
          detail.data
            ? `${formatDate(detail.data.sessionDate)} · ${detail.data.assignment?.teacher?.name}`
            : undefined
        }
        footer={
          detail.data ? (
            <>
              <Button
                variant="danger"
                icon="trash"
                onClick={() => setDeleting(detail.data!.id)}
              >
                Delete session
              </Button>
              <div className="wk-grow" />
              <Button variant="ghost" onClick={() => setOpenId(null)}>
                Close
              </Button>
            </>
          ) : null
        }
      >
        {detail.isLoading ? (
          <div className="wk-stack">
            <Skeleton height={20} width="60%" />
            <Skeleton height={14} width="40%" />
            <Skeleton height={90} />
          </div>
        ) : detail.isError ? (
          <ErrorState error={detail.error} onRetry={() => detail.refetch()} />
        ) : detail.data ? (
          <div className="wk-stack-lg">
            <dl className="wk-kv">
              <dt>Date</dt>
              <dd className="wk-num">{formatDate(detail.data.sessionDate)}</dd>
              <dt>Type</dt>
              <dd>
                <SessionTypeBadge type={detail.data.type} />
              </dd>
              <dt>Teacher</dt>
              <dd>
                {detail.data.assignment?.teacher ? (
                  <Link
                    href={`/teachers/${detail.data.assignment.teacher.id}`}
                    className="wk-text-brand"
                  >
                    {detail.data.assignment.teacher.name}
                  </Link>
                ) : (
                  "—"
                )}
              </dd>
              <dt>Class · subject</dt>
              <dd>
                {detail.data.assignment?.classroom?.class?.name} ·{" "}
                {detail.data.assignment?.subject?.name}
              </dd>
              {detail.data.createdAt ? (
                <>
                  <dt>Logged at</dt>
                  <dd>{formatDateTime(detail.data.createdAt)}</dd>
                </>
              ) : null}
              <dt>Notes</dt>
              <dd>{detail.data.notes ?? "—"}</dd>
            </dl>

            <div>
              <h3 className="wk-overline wk-text-muted" style={{ marginBottom: 10 }}>
                Topics covered
              </h3>
              {detail.data.topics.length === 0 ? (
                <p className="wk-body-sm wk-text-secondary">
                  No topic rows on this session.
                </p>
              ) : (
                <ul className="wk-stack-sm">
                  {detail.data.topics.map((topic) => (
                    <li
                      key={topic.id}
                      className="wk-spread"
                      style={{
                        border: "1px solid var(--wk-border-subtle)",
                        borderRadius: "var(--wk-radius-sm)",
                        padding: "var(--wk-space-3) var(--wk-space-4)",
                      }}
                    >
                      <div style={{ minWidth: 0 }}>
                        <div className="wk-body-sm" style={{ fontWeight: 600 }}>
                          {topic.subtopic?.name ?? topic.chapter?.name ?? "Untitled topic"}
                        </div>
                        <div className="wk-caption">
                          {topic.subtopic ? "Subtopic" : "Chapter"}
                          {topic.notes ? ` · ${topic.notes}` : ""}
                        </div>
                      </div>
                      <Badge
                        tone={
                          topic.status === "COMPLETE"
                            ? "success"
                            : topic.status === "PARTIAL"
                              ? "pending"
                              : "neutral"
                        }
                      >
                        {topic.status.toLowerCase()}
                      </Badge>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        ) : null}
      </Drawer>

      <ConfirmDialog
        open={deleting !== null}
        onClose={() => setDeleting(null)}
        onConfirm={onDelete}
        loading={remove.isPending}
        destructive
        title="Delete this session?"
        description="The session and its topic rows are permanently removed, pacing is recalculated, and the deletion is written to the audit log."
        confirmLabel="Delete session"
      />
    </main>
  );
}
