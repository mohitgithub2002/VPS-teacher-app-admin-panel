"use client";

import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useState } from "react";

import { TeacherPicker } from "@/components/domain/Pickers";
import { PageHeader } from "@/components/layout/PageHeader";
import { AttendanceBadge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardBody, CardHead } from "@/components/ui/Card";
import { Input, Textarea } from "@/components/ui/Field";
import { Icon } from "@/components/ui/Icon";
import { Modal } from "@/components/ui/Modal";
import {
  Avatar,
  EmptyState,
  ErrorState,
  Skeleton,
  StatCard,
  Tabs,
  TableSkeleton,
} from "@/components/ui/Primitives";
import { useToast } from "@/components/ui/Toast";
import {
  useAttendance,
  useCorrectAttendance,
  useRecordAttendance,
  useTeachers,
} from "@/lib/api/queries";
import { addDaysIso, formatDate, toIsoDate, todayIso } from "@/lib/format";
import type { AttendanceRecord, AttendanceStatus } from "@/lib/api/types";

const STATUSES: { value: AttendanceStatus; label: string }[] = [
  { value: "PRESENT", label: "Present" },
  { value: "ABSENT", label: "Absent" },
  { value: "HALF_DAY", label: "Half day" },
  { value: "ON_LEAVE", label: "On leave" },
];

export default function AttendancePage() {
  return (
    <Suspense fallback={null}>
      <AttendanceView />
    </Suspense>
  );
}

function AttendanceView() {
  const params = useSearchParams();
  const initialTeacher = Number(params.get("teacherId"));

  const [tab, setTab] = useState<"mark" | "history">(
    Number.isFinite(initialTeacher) && initialTeacher > 0 ? "history" : "mark",
  );
  const [date, setDate] = useState(todayIso());

  return (
    <main className="wk-page wk-page--wide">
      <PageHeader
        title="Teacher attendance"
        lede="Recording attendance is an upsert — marking the same teacher and date again corrects the earlier entry. Absences feed the pacing calculation."
        actions={
          tab === "mark" ? (
            <Input
              label="Date"
              type="date"
              value={date}
              max={todayIso()}
              onChange={(event) => setDate(event.target.value || todayIso())}
              fieldClassName="wk-toolbar__field"
            />
          ) : null
        }
      />

      <div style={{ marginBottom: "var(--wk-space-6)" }}>
        <Tabs
          tabs={[
            { value: "mark" as const, label: "Mark a day" },
            { value: "history" as const, label: "History and corrections" },
          ]}
          value={tab}
          onChange={setTab}
          label="Attendance view"
        />
      </div>

      {tab === "mark" ? (
        <MarkDay date={date} />
      ) : (
        <History
          initialTeacherId={
            Number.isFinite(initialTeacher) && initialTeacher > 0 ? initialTeacher : ""
          }
        />
      )}
    </main>
  );
}

/* ── Mark a day ──────────────────────────────────────────────────────────── */

function MarkDay({ date }: { date: string }) {
  const toast = useToast();
  const teachers = useTeachers({ active: "true", pageSize: 200 });
  const records = useAttendance({ from: date, to: date });
  const record = useRecordAttendance();
  const [remarksFor, setRemarksFor] = useState<{
    teacherId: number;
    name: string;
    status: AttendanceStatus;
    remarks: string;
  } | null>(null);
  const [pendingId, setPendingId] = useState<number | null>(null);

  const byTeacher = useMemo(() => {
    const map = new Map<number, AttendanceRecord>();
    for (const row of records.data ?? []) map.set(row.teacherId, row);
    return map;
  }, [records.data]);

  const rows = teachers.data?.teachers ?? [];
  const marked = rows.filter((teacher) => byTeacher.has(teacher.id)).length;

  const counts = STATUSES.map((status) => ({
    ...status,
    count: (records.data ?? []).filter((row) => row.status === status.value).length,
  }));

  const save = (
    teacherId: number,
    status: AttendanceStatus,
    remarks: string | undefined,
    onDone?: () => void,
  ) => {
    setPendingId(teacherId);
    record.mutate(
      { teacherId, date, status, ...(remarks ? { remarks } : {}) },
      {
        onSuccess: () => {
          onDone?.();
          setPendingId(null);
        },
        onError: (error) => {
          toast.fromError(error, "Could not record attendance");
          setPendingId(null);
        },
      },
    );
  };

  return (
    <div className="wk-stack-lg">
      <div className="wk-stats">
        <StatCard
          label="Marked"
          value={`${marked} / ${rows.length}`}
          meta={formatDate(date)}
          icon="check-circle"
          tone={marked === rows.length && rows.length > 0 ? undefined : "brand"}
        />
        {counts
          .filter((entry) => entry.count > 0)
          .map((entry) => (
            <StatCard
              key={entry.value}
              label={entry.label}
              value={entry.count}
              meta="Teachers on this date"
            />
          ))}
      </div>

      <Card>
        <CardHead
          title="Active teachers"
          subtitle="Tap a status to record it. Marking again corrects the entry."
        />
        <CardBody padding="flush">
          {teachers.isLoading || records.isLoading ? (
            <TableSkeleton rows={8} columns={3} />
          ) : teachers.isError ? (
            <ErrorState error={teachers.error} onRetry={() => teachers.refetch()} />
          ) : rows.length === 0 ? (
            <EmptyState
              icon="teachers"
              title="No active teachers"
              body="Activate a teacher account to record attendance."
            />
          ) : (
            <div className="wk-table-wrap">
              <table className="wk-table">
                <thead>
                  <tr>
                    <th>Teacher</th>
                    <th>Status</th>
                    <th>Remarks</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((teacher) => {
                    const existing = byTeacher.get(teacher.id);
                    const busy = pendingId === teacher.id;
                    return (
                      <tr key={teacher.id}>
                        <td>
                          <div className="wk-row">
                            <Avatar name={teacher.name} seed={teacher.id} size="sm" />
                            <div>
                              <div className="wk-table__primary">{teacher.name}</div>
                              <div className="wk-caption wk-num">{teacher.employeeId}</div>
                            </div>
                          </div>
                        </td>
                        <td>
                          <div className="wk-chip-set" role="group" aria-label={`Status for ${teacher.name}`}>
                            {STATUSES.map((status) => (
                              <button
                                key={status.value}
                                type="button"
                                className="wk-chip"
                                aria-pressed={existing?.status === status.value}
                                disabled={busy}
                                onClick={() =>
                                  save(
                                    teacher.id,
                                    status.value,
                                    existing?.remarks ?? undefined,
                                  )
                                }
                              >
                                {status.label}
                              </button>
                            ))}
                          </div>
                        </td>
                        <td>
                          <div className="wk-row">
                            <span className="wk-body-sm wk-text-secondary wk-truncate" style={{ maxWidth: 220 }}>
                              {existing?.remarks ?? "—"}
                            </span>
                            <button
                              type="button"
                              className="wk-close"
                              style={{ width: 36, minWidth: 36, height: 36 }}
                              aria-label={`Add remarks for ${teacher.name}`}
                              onClick={() =>
                                setRemarksFor({
                                  teacherId: teacher.id,
                                  name: teacher.name,
                                  status: existing?.status ?? "PRESENT",
                                  remarks: existing?.remarks ?? "",
                                })
                              }
                            >
                              <Icon name="edit" size={15} />
                            </button>
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

      <RemarksModal
        open={remarksFor !== null}
        name={remarksFor?.name ?? ""}
        date={date}
        status={remarksFor?.status ?? "PRESENT"}
        remarks={remarksFor?.remarks ?? ""}
        loading={record.isPending}
        onClose={() => setRemarksFor(null)}
        onSubmit={(status, remarks) => {
          if (!remarksFor) return;
          save(remarksFor.teacherId, status, remarks || undefined, () => {
            setRemarksFor(null);
            toast.success("Attendance recorded", `${remarksFor.name} · ${formatDate(date)}`);
          });
        }}
      />
    </div>
  );
}

/* ── History and corrections ─────────────────────────────────────────────── */

function History({ initialTeacherId }: { initialTeacherId: number | "" }) {
  const toast = useToast();
  const [teacherId, setTeacherId] = useState<number | "">(initialTeacherId);
  const [from, setFrom] = useState(addDaysIso(todayIso(), -30));
  const [to, setTo] = useState(todayIso());
  const [correcting, setCorrecting] = useState<AttendanceRecord | null>(null);

  const records = useAttendance({
    ...(teacherId === "" ? {} : { teacherId }),
    from,
    to,
  });
  const correct = useCorrectAttendance();

  const rows = records.data ?? [];

  return (
    <div className="wk-stack-lg">
      <div className="wk-toolbar">
        <TeacherPicker
          value={teacherId}
          onChange={setTeacherId}
          className="wk-toolbar__field"
          activeOnly={false}
        />
        <Input
          label="From"
          type="date"
          value={from}
          max={to}
          onChange={(event) => setFrom(event.target.value)}
          fieldClassName="wk-toolbar__field"
        />
        <Input
          label="To"
          type="date"
          value={to}
          min={from}
          onChange={(event) => setTo(event.target.value)}
          fieldClassName="wk-toolbar__field"
        />
      </div>

      <Card>
        <CardHead
          title="Recorded attendance"
          subtitle={`${rows.length} records between ${formatDate(from)} and ${formatDate(to)}`}
        />
        <CardBody padding="flush">
          {records.isLoading ? (
            <TableSkeleton rows={8} columns={4} />
          ) : records.isError ? (
            <ErrorState error={records.error} onRetry={() => records.refetch()} />
          ) : rows.length === 0 ? (
            <EmptyState
              icon="check-circle"
              title="Nothing recorded in this range"
              body="Pick a wider range, or mark attendance on the other tab."
            />
          ) : (
            <div className="wk-table-wrap">
              <table className="wk-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Teacher</th>
                    <th>Status</th>
                    <th>Remarks</th>
                    <th aria-label="Actions" />
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr key={row.id}>
                      <td className="wk-num">{formatDate(row.date)}</td>
                      <td>
                        <div className="wk-table__primary">{row.teacher?.name}</div>
                        <div className="wk-caption wk-num">{row.teacher?.employeeId}</div>
                      </td>
                      <td>
                        <AttendanceBadge status={row.status} />
                      </td>
                      <td className="wk-truncate" style={{ maxWidth: 260 }}>
                        {row.remarks ?? "—"}
                      </td>
                      <td>
                        <div className="wk-table__actions">
                          <Button
                            variant="ghost"
                            size="sm"
                            icon="edit"
                            onClick={() => setCorrecting(row)}
                          >
                            Correct
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

      <RemarksModal
        open={correcting !== null}
        name={correcting?.teacher?.name ?? ""}
        date={toIsoDate(correcting?.date)}
        status={correcting?.status ?? "PRESENT"}
        remarks={correcting?.remarks ?? ""}
        loading={correct.isPending}
        title="Correct attendance"
        onClose={() => setCorrecting(null)}
        onSubmit={(status, remarks) => {
          if (!correcting) return;
          correct.mutate(
            { id: correcting.id, data: { status, remarks: remarks ? remarks : null } },
            {
              onSuccess: () => {
                toast.success("Attendance corrected", correcting.teacher?.name);
                setCorrecting(null);
              },
              onError: (error) => toast.fromError(error, "Could not correct the record"),
            },
          );
        }}
      />
    </div>
  );
}

function RemarksModal({
  open,
  name,
  date,
  status,
  remarks,
  loading,
  title = "Record attendance",
  onClose,
  onSubmit,
}: {
  open: boolean;
  name: string;
  date: string;
  status: AttendanceStatus;
  remarks: string;
  loading: boolean;
  title?: string;
  onClose: () => void;
  onSubmit: (status: AttendanceStatus, remarks: string) => void;
}) {
  const [nextStatus, setNextStatus] = useState<AttendanceStatus>(status);
  const [nextRemarks, setNextRemarks] = useState(remarks);

  useEffect(() => {
    if (!open) return;
    setNextStatus(status);
    setNextRemarks(remarks);
  }, [open, status, remarks]);

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      description={`${name} · ${formatDate(date)}`}
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={() => onSubmit(nextStatus, nextRemarks.trim())}
            loading={loading}
          >
            Save
          </Button>
        </>
      }
    >
      <div className="wk-stack">
        <div>
          <span className="wk-field__label">Status</span>
          <div className="wk-chip-set" role="group" aria-label="Attendance status">
            {STATUSES.map((option) => (
              <button
                key={option.value}
                type="button"
                className="wk-chip"
                aria-pressed={nextStatus === option.value}
                onClick={() => setNextStatus(option.value)}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
        <Textarea
          label="Remarks"
          value={nextRemarks}
          onChange={(event) => setNextRemarks(event.target.value)}
          placeholder="Approved leave, arrived late, left after lunch…"
        />
        {loading ? <Skeleton height={4} /> : null}
      </div>
    </Modal>
  );
}
