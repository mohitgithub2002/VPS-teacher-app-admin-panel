"use client";

import Link from "next/link";
import { useState } from "react";

import {
  ClassroomPicker,
  SubjectPicker,
  TeacherPicker,
} from "@/components/domain/Pickers";
import { PageHeader } from "@/components/layout/PageHeader";
import { PacingBadge, pacingMeterClass } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardBody, CardHead } from "@/components/ui/Card";
import {
  Alert,
  ChipFilter,
  EmptyState,
  ErrorState,
  Meter,
  TableSkeleton,
} from "@/components/ui/Primitives";
import { useToast } from "@/components/ui/Toast";
import {
  useBehindPacing,
  usePacing,
  useRecalculatePacing,
} from "@/lib/api/queries";
import { percent } from "@/lib/format";
import type { PacingStatus } from "@/lib/api/types";

type StatusFilter = "BEHIND" | "ALL" | PacingStatus;

const FILTERS = [
  { value: "BEHIND" as const, label: "Behind" },
  { value: "ALL" as const, label: "All" },
  { value: "ON_TRACK" as const, label: "On track" },
  { value: "AHEAD" as const, label: "Ahead" },
  { value: "COMPLETED" as const, label: "Completed" },
];

export default function PacingPage() {
  const toast = useToast();
  const [status, setStatus] = useState<StatusFilter>("BEHIND");
  const [teacherId, setTeacherId] = useState<number | "">("");
  const [subjectId, setSubjectId] = useState<number | "">("");
  const [classroomId, setClassroomId] = useState<number | "">("");

  const hasFilters = teacherId !== "" || subjectId !== "" || classroomId !== "";

  // The dedicated /pacing/behind feed is already sorted by daysBehind, so use
  // it whenever we're looking at behind-schedule work with no other filters.
  const useBehindFeed = status === "BEHIND" && !hasFilters;

  const behind = useBehindPacing({ enabled: useBehindFeed });
  const filtered = usePacing(
    {
      ...(status === "ALL" ? {} : { status }),
      ...(teacherId === "" ? {} : { teacherId }),
      ...(subjectId === "" ? {} : { subjectId }),
      ...(classroomId === "" ? {} : { classroomId }),
    },
    { enabled: !useBehindFeed },
  );

  const query = useBehindFeed ? behind : filtered;
  const rows = (useBehindFeed ? behind.data : filtered.data) ?? [];

  const recalculate = useRecalculatePacing();

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
        title="Pacing alerts"
        lede="Chapter-level progress against the expected schedule. Behind-schedule work is the queue to act on — the rest is context."
        actions={
          <Button
            variant="primary"
            icon="refresh"
            onClick={onRecalculate}
            loading={recalculate.isPending}
          >
            Recalculate pacing
          </Button>
        }
      />

      <div className="wk-toolbar">
        <ChipFilter
          options={FILTERS}
          value={status}
          onChange={setStatus}
          label="Filter by pacing status"
        />
      </div>

      <div className="wk-toolbar">
        <TeacherPicker
          value={teacherId}
          onChange={setTeacherId}
          className="wk-toolbar__field"
        />
        <SubjectPicker
          value={subjectId}
          onChange={setSubjectId}
          className="wk-toolbar__field"
        />
        <ClassroomPicker
          value={classroomId}
          onChange={setClassroomId}
          className="wk-toolbar__field"
        />
      </div>

      {status === "BEHIND" && rows.length > 0 ? (
        <div style={{ marginBottom: "var(--wk-space-5)" }}>
          <Alert tone="danger" title={`${rows.length} chapters are behind schedule`}>
            Check whether the teacher is logging sessions at all before treating this
            as a pacing problem — the activity and attendance views usually explain it.
          </Alert>
        </div>
      ) : null}

      <Card>
        <CardHead
          title="Chapters"
          subtitle={
            query.isLoading
              ? "Loading"
              : `${rows.length} chapters${status === "ALL" ? "" : ` · ${status.toLowerCase().replace("_", " ")}`}`
          }
        />
        <CardBody padding="flush">
          {query.isLoading ? (
            <TableSkeleton rows={8} columns={5} />
          ) : query.isError ? (
            <ErrorState error={query.error} onRetry={() => query.refetch()} />
          ) : rows.length === 0 ? (
            <EmptyState
              icon="check-circle"
              title={
                status === "BEHIND"
                  ? "Nothing is behind schedule"
                  : "No chapters match these filters"
              }
              body={
                status === "BEHIND"
                  ? "Every tracked chapter is on track, ahead or complete."
                  : "Try a different status or clear the teacher, subject and classroom filters."
              }
            />
          ) : (
            <div className="wk-table-wrap">
              <table className="wk-table">
                <thead>
                  <tr>
                    <th>Chapter</th>
                    <th>Class · subject</th>
                    <th>Teacher</th>
                    <th style={{ width: 190 }}>Completion</th>
                    <th>Status</th>
                    <th className="wk-table__num">Behind</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr key={row.id}>
                      <td>
                        <div className="wk-table__primary">{row.chapter?.name}</div>
                        <div className="wk-caption">
                          Chapter {row.chapter?.displayOrder}
                        </div>
                      </td>
                      <td>
                        {row.assignment?.classroom?.class?.name} ·{" "}
                        {row.assignment?.subject?.name}
                      </td>
                      <td>
                        {row.assignment?.teacher ? (
                          <Link
                            href={`/teachers/${row.assignment.teacher.id}`}
                            className="wk-text-brand"
                          >
                            {row.assignment.teacher.name}
                          </Link>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td>
                        <div className="wk-row" style={{ gap: 8 }}>
                          <Meter
                            value={row.completionPercent}
                            fillClassName={pacingMeterClass(row.status)}
                            className="wk-grow"
                            label={`${row.chapter?.name} ${row.completionPercent}% complete`}
                          />
                          <span className="wk-num wk-caption" style={{ width: 38 }}>
                            {percent(row.completionPercent)}
                          </span>
                        </div>
                      </td>
                      <td>
                        <PacingBadge status={row.status} />
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
    </main>
  );
}
