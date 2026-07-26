"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";

import { AssignmentFormModal } from "@/components/domain/AssignmentFormModal";
import { CredentialModal } from "@/components/domain/CredentialModal";
import { TeacherFormModal } from "@/components/domain/TeacherFormModal";
import { PageHeader } from "@/components/layout/PageHeader";
import {
  ActiveBadge,
  AttendanceBadge,
  PacingBadge,
  SessionTypeBadge,
  pacingMeterClass,
} from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardBody, CardFoot, CardHead } from "@/components/ui/Card";
import { Icon } from "@/components/ui/Icon";
import { ConfirmDialog } from "@/components/ui/Modal";
import {
  Avatar,
  Alert,
  EmptyState,
  ErrorState,
  Meter,
  Skeleton,
  TableSkeleton,
} from "@/components/ui/Primitives";
import { useToast } from "@/components/ui/Toast";
import {
  useAttendance,
  useDeactivateAssignment,
  usePacing,
  useResetTeacherPassword,
  useSessions,
  useSetTeacherActive,
  useTeacher,
} from "@/lib/api/queries";
import {
  addDaysIso,
  classroomLongLabel,
  formatDate,
  formatDateTime,
  percent,
  relativeDays,
  todayIso,
} from "@/lib/format";
import type { AttendanceStatus } from "@/lib/api/types";

const ATTENDANCE_WINDOW_DAYS = 30;

export default function TeacherDetailPage() {
  const params = useParams<{ id: string }>();
  const teacherId = Number(params.id);
  const toast = useToast();

  const teacher = useTeacher(teacherId);
  const from = addDaysIso(todayIso(), -ATTENDANCE_WINDOW_DAYS);
  const attendance = useAttendance({ teacherId, from, to: todayIso() });
  const sessions = useSessions({ teacherId, pageSize: 8 });
  const pacing = usePacing({ teacherId });

  const setActive = useSetTeacherActive();
  const resetPassword = useResetTeacherPassword();
  const removeAssignment = useDeactivateAssignment();

  const [editOpen, setEditOpen] = useState(false);
  const [assignOpen, setAssignOpen] = useState(false);
  const [confirm, setConfirm] = useState<
    | { kind: "toggle-active" }
    | { kind: "reset-password" }
    | { kind: "remove-assignment"; id: number; label: string }
    | null
  >(null);
  const [credential, setCredential] = useState<{
    name: string;
    employeeId: string;
    password: string;
  } | null>(null);

  if (Number.isNaN(teacherId)) {
    return (
      <main className="wk-page">
        <Card>
          <EmptyState title="Invalid teacher" body="That teacher ID isn't a number." />
        </Card>
      </main>
    );
  }

  if (teacher.isLoading) {
    return (
      <main className="wk-page">
        <div className="wk-stack-lg">
          <Skeleton width="40%" height={34} />
          <Card>
            <CardBody>
              <div className="wk-stack">
                <Skeleton height={64} width={64} radius="var(--wk-radius-pill)" />
                <Skeleton width="60%" height={18} />
                <Skeleton width="35%" height={14} />
              </div>
            </CardBody>
          </Card>
        </div>
      </main>
    );
  }

  if (teacher.isError || !teacher.data) {
    return (
      <main className="wk-page">
        <Card>
          <ErrorState error={teacher.error} onRetry={() => teacher.refetch()} />
        </Card>
      </main>
    );
  }

  const data = teacher.data;

  const attendanceCounts = (attendance.data ?? []).reduce(
    (totals, record) => {
      totals[record.status] = (totals[record.status] ?? 0) + 1;
      return totals;
    },
    {} as Record<AttendanceStatus, number>,
  );

  const behindChapters = (pacing.data ?? []).filter((row) => row.status === "BEHIND");

  const onToggleActive = () => {
    setActive.mutate(
      { id: data.id, active: !data.isActive },
      {
        onSuccess: () => {
          toast.success(
            data.isActive ? "Teacher deactivated" : "Teacher activated",
            data.isActive
              ? "Their next API call will fail with 401 — sessions stop resolving immediately."
              : "They can sign in again from the teacher app.",
          );
          setConfirm(null);
        },
        onError: (error) => toast.fromError(error, "Could not change the account status"),
      },
    );
  };

  const onResetPassword = () => {
    resetPassword.mutate(data.id, {
      onSuccess: (result) => {
        setConfirm(null);
        setCredential({
          name: data.name,
          employeeId: result.employeeId,
          password: result.temporaryPassword,
        });
      },
      onError: (error) => toast.fromError(error, "Could not reset the password"),
    });
  };

  const onRemoveAssignment = (id: number) => {
    removeAssignment.mutate(id, {
      onSuccess: () => {
        toast.success("Assignment removed", "Historical session logs are preserved.");
        setConfirm(null);
      },
      onError: (error) => toast.fromError(error, "Could not remove the assignment"),
    });
  };

  return (
    <main className="wk-page wk-page--wide">
      <div className="wk-row" style={{ marginBottom: "var(--wk-space-4)" }}>
        <Link href="/teachers" className="wk-btn wk-btn--ghost wk-btn--sm">
          <Icon name="chevron-left" size={15} />
          All teachers
        </Link>
      </div>

      <PageHeader
        title={data.name}
        lede={`${data.employeeId} · ${data.qualification ?? "No qualification recorded"}`}
        actions={
          <>
            <Button variant="primary" icon="edit" onClick={() => setEditOpen(true)}>
              Edit profile
            </Button>
            <Button icon="key" onClick={() => setConfirm({ kind: "reset-password" })}>
              Reset password
            </Button>
            <Button
              variant="danger"
              icon={data.isActive ? "user-x" : "user-check"}
              onClick={() => setConfirm({ kind: "toggle-active" })}
            >
              {data.isActive ? "Deactivate" : "Activate"}
            </Button>
          </>
        }
      />

      {!data.isActive ? (
        <div style={{ marginBottom: "var(--wk-space-5)" }}>
          <Alert tone="danger" title="This account is deactivated">
            The teacher cannot sign in, and any existing session stops resolving on
            their next request. Assignments and history are untouched.
          </Alert>
        </div>
      ) : null}

      <div className="wk-split">
        <div className="wk-stack-lg">
          <Card>
            <CardBody>
              <div className="wk-row" style={{ marginBottom: "var(--wk-space-5)" }}>
                <Avatar name={data.name} seed={data.id} size="lg" />
                <div className="wk-grow">
                  <h2 className="wk-h5">{data.name}</h2>
                  <div className="wk-row" style={{ marginTop: 6 }}>
                    <ActiveBadge active={data.isActive} />
                  </div>
                </div>
              </div>

              <dl className="wk-kv">
                <dt>Employee ID</dt>
                <dd className="wk-num">{data.employeeId}</dd>
                <dt>Phone</dt>
                <dd className="wk-num">{data.phone}</dd>
                <dt>Email</dt>
                <dd>{data.email ?? "—"}</dd>
                <dt>Qualification</dt>
                <dd>{data.qualification ?? "—"}</dd>
                <dt>Last sign-in</dt>
                <dd>
                  {data.lastLoginAt ? formatDateTime(data.lastLoginAt) : "Never signed in"}
                </dd>
                <dt>Created</dt>
                <dd>{formatDate(data.createdAt)}</dd>
                {data.updatedAt ? (
                  <>
                    <dt>Last updated</dt>
                    <dd>{formatDate(data.updatedAt)}</dd>
                  </>
                ) : null}
              </dl>
            </CardBody>
          </Card>

          <Card>
            <CardHead
              title="Attendance"
              subtitle={`Last ${ATTENDANCE_WINDOW_DAYS} days`}
            />
            <CardBody>
              {attendance.isLoading ? (
                <Skeleton height={56} />
              ) : (attendance.data ?? []).length === 0 ? (
                <p className="wk-body-sm wk-text-secondary">
                  No attendance recorded in this window.
                </p>
              ) : (
                <div className="wk-stack">
                  <div className="wk-row-wrap">
                    {(["PRESENT", "ABSENT", "HALF_DAY", "ON_LEAVE"] as AttendanceStatus[])
                      .filter((status) => attendanceCounts[status])
                      .map((status) => (
                        <span key={status} className="wk-row" style={{ gap: 6 }}>
                          <AttendanceBadge status={status} />
                          <span className="wk-body-sm wk-num">
                            {attendanceCounts[status]}
                          </span>
                        </span>
                      ))}
                  </div>
                  <ul className="wk-stack-sm">
                    {(attendance.data ?? []).slice(0, 5).map((record) => (
                      <li key={record.id} className="wk-spread wk-body-sm">
                        <span>{formatDate(record.date)}</span>
                        <AttendanceBadge status={record.status} />
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </CardBody>
            <CardFoot>
              <Link
                href={`/attendance?teacherId=${data.id}`}
                className="wk-btn wk-btn--ghost wk-btn--sm"
              >
                Open attendance
                <Icon name="chevron-right" size={15} />
              </Link>
            </CardFoot>
          </Card>
        </div>

        <div className="wk-stack-lg">
          <Card>
            <CardHead
              title="Assignments"
              subtitle="Active subject and classroom pairings"
              actions={
                <Button size="sm" icon="plus" onClick={() => setAssignOpen(true)}>
                  Assign class
                </Button>
              }
            />
            <CardBody padding="flush">
              {data.assignments.length === 0 ? (
                <EmptyState
                  icon="assignment"
                  title="No assignments"
                  body="Assign a subject and classroom so this teacher can log sessions."
                  action={
                    <Button size="sm" icon="plus" onClick={() => setAssignOpen(true)}>
                      Assign class
                    </Button>
                  }
                />
              ) : (
                <div className="wk-table-wrap">
                  <table className="wk-table">
                    <thead>
                      <tr>
                        <th>Subject</th>
                        <th>Classroom</th>
                        <th aria-label="Actions" />
                      </tr>
                    </thead>
                    <tbody>
                      {data.assignments.map((assignment) => (
                        <tr key={assignment.id}>
                          <td className="wk-table__primary">{assignment.subject?.name}</td>
                          <td>{classroomLongLabel(assignment.classroom)}</td>
                          <td>
                            <div className="wk-table__actions">
                              <Button
                                variant="ghost"
                                size="sm"
                                icon="trash"
                                onClick={() =>
                                  setConfirm({
                                    kind: "remove-assignment",
                                    id: assignment.id,
                                    label: `${assignment.subject?.name} · ${classroomLongLabel(assignment.classroom)}`,
                                  })
                                }
                              >
                                Remove
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
          </Card>

          <Card>
            <CardHead
              title="Chapters behind schedule"
              subtitle={
                behindChapters.length > 0
                  ? `${behindChapters.length} of ${(pacing.data ?? []).length} tracked chapters`
                  : "Nothing behind for this teacher"
              }
            />
            <CardBody padding={behindChapters.length > 0 ? "flush" : "default"}>
              {pacing.isLoading ? (
                <TableSkeleton rows={3} columns={3} />
              ) : behindChapters.length === 0 ? (
                <p className="wk-body-sm wk-text-secondary">
                  Every chapter this teacher owns is on track, ahead or complete.
                </p>
              ) : (
                <div className="wk-table-wrap">
                  <table className="wk-table">
                    <thead>
                      <tr>
                        <th>Chapter</th>
                        <th>Class · subject</th>
                        <th style={{ width: 160 }}>Completion</th>
                        <th className="wk-table__num">Behind</th>
                      </tr>
                    </thead>
                    <tbody>
                      {behindChapters.map((row) => (
                        <tr key={row.id}>
                          <td className="wk-table__primary">{row.chapter?.name}</td>
                          <td>
                            {row.assignment?.classroom?.class?.name} ·{" "}
                            {row.assignment?.subject?.name}
                          </td>
                          <td>
                            <div className="wk-row" style={{ gap: 8 }}>
                              <Meter
                                value={row.completionPercent}
                                fillClassName={pacingMeterClass(row.status)}
                                className="wk-grow"
                              />
                              <span className="wk-num wk-caption">
                                {percent(row.completionPercent)}
                              </span>
                            </div>
                          </td>
                          <td className="wk-table__num">
                            {row.daysBehind ? `${row.daysBehind}d` : "—"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardBody>
          </Card>

          <Card>
            <CardHead
              title="Recent sessions"
              subtitle="Most recent teaching, revision, Q&A and test logs"
            />
            <CardBody padding="flush">
              {sessions.isLoading ? (
                <TableSkeleton rows={4} columns={4} />
              ) : (sessions.data?.sessions ?? []).length === 0 ? (
                <EmptyState
                  icon="book"
                  title="No sessions logged"
                  body="This teacher has not logged a single session — worth a follow-up."
                />
              ) : (
                <div className="wk-table-wrap">
                  <table className="wk-table">
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>Type</th>
                        <th>Class · subject</th>
                        <th className="wk-table__num">Topics</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sessions.data!.sessions.map((log) => (
                        <tr key={log.id}>
                          <td>
                            <div>{formatDate(log.sessionDate)}</div>
                            <div className="wk-caption">{relativeDays(log.sessionDate)}</div>
                          </td>
                          <td>
                            <SessionTypeBadge type={log.type} />
                          </td>
                          <td>
                            {log.assignment?.classroom?.class?.name} ·{" "}
                            {log.assignment?.subject?.name}
                          </td>
                          <td className="wk-table__num">{log._count?.topics ?? 0}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardBody>
            <CardFoot>
              <Link
                href={`/sessions?teacherId=${data.id}`}
                className="wk-btn wk-btn--ghost wk-btn--sm"
              >
                All sessions for this teacher
                <Icon name="chevron-right" size={15} />
              </Link>
            </CardFoot>
          </Card>

          {(pacing.data ?? []).length > 0 ? (
            <div className="wk-row-wrap">
              {(["ON_TRACK", "AHEAD", "COMPLETED"] as const).map((status) => {
                const count = (pacing.data ?? []).filter((row) => row.status === status)
                  .length;
                if (count === 0) return null;
                return (
                  <span key={status} className="wk-row" style={{ gap: 6 }}>
                    <PacingBadge status={status} />
                    <span className="wk-body-sm wk-num">{count}</span>
                  </span>
                );
              })}
            </div>
          ) : null}
        </div>
      </div>

      <TeacherFormModal
        open={editOpen}
        onClose={() => setEditOpen(false)}
        teacher={data}
      />

      <AssignmentFormModal
        open={assignOpen}
        onClose={() => setAssignOpen(false)}
        teacherId={data.id}
        teacherName={data.name}
      />

      <ConfirmDialog
        open={confirm?.kind === "toggle-active"}
        onClose={() => setConfirm(null)}
        onConfirm={onToggleActive}
        loading={setActive.isPending}
        destructive={data.isActive}
        title={data.isActive ? "Deactivate this teacher?" : "Activate this teacher?"}
        description={
          data.isActive
            ? "They lose access immediately — the next request from the teacher app returns 401. You can reactivate at any time."
            : "They will be able to sign in again with their existing password."
        }
        confirmLabel={data.isActive ? "Deactivate" : "Activate"}
      />

      <ConfirmDialog
        open={confirm?.kind === "reset-password"}
        onClose={() => setConfirm(null)}
        onConfirm={onResetPassword}
        loading={resetPassword.isPending}
        title="Reset this teacher's password?"
        description="The current password stops working straight away. A new temporary password is generated and shown once."
        confirmLabel="Reset password"
      />

      <ConfirmDialog
        open={confirm?.kind === "remove-assignment"}
        onClose={() => setConfirm(null)}
        onConfirm={() =>
          confirm?.kind === "remove-assignment" && onRemoveAssignment(confirm.id)
        }
        loading={removeAssignment.isPending}
        destructive
        title="Remove this assignment?"
        description={
          confirm?.kind === "remove-assignment"
            ? `${confirm.label} will be deactivated. Session logs already recorded against it are preserved.`
            : undefined
        }
        confirmLabel="Remove assignment"
      />

      {credential ? (
        <CredentialModal
          open
          onClose={() => setCredential(null)}
          name={credential.name}
          employeeId={credential.employeeId}
          password={credential.password}
        />
      ) : null}
    </main>
  );
}
