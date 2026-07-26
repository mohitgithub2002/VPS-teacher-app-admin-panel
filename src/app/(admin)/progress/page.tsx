"use client";

import { useMemo, useState } from "react";

import { SessionPicker } from "@/components/domain/Pickers";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardBody, CardHead } from "@/components/ui/Card";
import {
  EmptyState,
  ErrorState,
  Meter,
  TableSkeleton,
  Tabs,
} from "@/components/ui/Primitives";
import { useProgress } from "@/lib/api/queries";
import { percent } from "@/lib/format";
import type { ClassroomProgress } from "@/lib/api/types";

/** Four bands, warm-to-cool, so a row reads at a glance without a legend. */
function heatStyle(value: number): React.CSSProperties {
  if (value >= 90) return { background: "var(--wk-green-50)", color: "#0F7A37" };
  if (value >= 70) return { background: "var(--wk-blue-50)", color: "#1D4FD8" };
  if (value >= 40)
    return { background: "var(--wk-amber-50)", color: "var(--wk-amber-700)" };
  return { background: "var(--wk-red-50)", color: "var(--wk-red-700)" };
}

function classroomKey(row: ClassroomProgress) {
  return `${row.className}${row.section ? `-${row.section}` : ""}`;
}

export default function ProgressPage() {
  const [sessionId, setSessionId] = useState<number | "">("");
  const [view, setView] = useState<"matrix" | "detail">("matrix");

  const progress = useProgress(sessionId === "" ? undefined : sessionId);
  const rows = progress.data ?? [];

  const { subjects, classrooms, cells } = useMemo(() => {
    const rows = progress.data ?? [];
    const subjectNames = [...new Set(rows.map((row) => row.subjectName))].sort((a, b) =>
      a.localeCompare(b),
    );
    const classroomNames = [...new Set(rows.map(classroomKey))].sort((a, b) =>
      a.localeCompare(b, undefined, { numeric: true }),
    );
    const map = new Map<string, ClassroomProgress>();
    for (const row of rows) map.set(`${classroomKey(row)}::${row.subjectName}`, row);
    return { subjects: subjectNames, classrooms: classroomNames, cells: map };
  }, [progress.data]);

  const average = rows.length
    ? rows.reduce((sum, row) => sum + row.completionPercent, 0) / rows.length
    : 0;

  return (
    <main className="wk-page wk-page--wide">
      <PageHeader
        title="Progress matrix"
        lede="Syllabus completion for every classroom and subject in the session, with the teacher who owns it."
      />

      <div className="wk-toolbar" style={{ alignItems: "flex-end" }}>
        <SessionPicker
          value={sessionId}
          onChange={setSessionId}
          className="wk-toolbar__field"
          allLabel="Current session"
        />
        <Tabs
          tabs={[
            { value: "matrix" as const, label: "Matrix" },
            { value: "detail" as const, label: "Detail" },
          ]}
          value={view}
          onChange={setView}
          label="Progress view"
        />
      </div>

      <Card>
        <CardHead
          title={view === "matrix" ? "Classroom × subject" : "Every assignment"}
          subtitle={
            progress.isLoading
              ? "Loading"
              : `${rows.length} classroom–subject pairs · ${percent(average)} average completion`
          }
        />
        <CardBody padding={view === "matrix" ? "tight" : "flush"}>
          {progress.isLoading ? (
            <TableSkeleton rows={7} columns={6} />
          ) : progress.isError ? (
            <ErrorState error={progress.error} onRetry={() => progress.refetch()} />
          ) : rows.length === 0 ? (
            <EmptyState
              icon="chart"
              title="No progress data"
              body="Progress appears once teachers are assigned to classrooms and chapters exist for those subjects."
            />
          ) : view === "matrix" ? (
            <div className="wk-scroll-x">
              <table className="wk-table" style={{ minWidth: 720 }}>
                <caption className="wk-sr-only">
                  Completion percentage per classroom and subject
                </caption>
                <thead>
                  <tr>
                    <th scope="col">Classroom</th>
                    {subjects.map((subject) => (
                      <th key={subject} scope="col" className="wk-table__num">
                        {subject}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {classrooms.map((classroom) => (
                    <tr key={classroom}>
                      <th scope="row" className="wk-table__primary" style={{ textAlign: "left" }}>
                        {classroom}
                      </th>
                      {subjects.map((subject) => {
                        const cell = cells.get(`${classroom}::${subject}`);
                        return (
                          <td key={subject} className="wk-table__num">
                            {cell ? (
                              <span
                                className="wk-heat"
                                style={heatStyle(cell.completionPercent)}
                                title={`${cell.teacherName ?? "Unassigned"} · ${cell.completedChapters}/${cell.totalChapters} chapters complete${
                                  cell.behindChapters
                                    ? ` · ${cell.behindChapters} behind`
                                    : ""
                                }`}
                              >
                                {cell.completionPercent}%
                              </span>
                            ) : (
                              <span className="wk-text-muted">—</span>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="wk-table-wrap">
              <table className="wk-table">
                <thead>
                  <tr>
                    <th>Classroom</th>
                    <th>Subject</th>
                    <th>Teacher</th>
                    <th style={{ width: 180 }}>Completion</th>
                    <th className="wk-table__num">Chapters</th>
                    <th className="wk-table__num">Behind</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr key={`${row.classroomId}-${row.subjectId}`}>
                      <td className="wk-table__primary">{classroomKey(row)}</td>
                      <td>{row.subjectName}</td>
                      <td>{row.teacherName ?? "—"}</td>
                      <td>
                        <div className="wk-row" style={{ gap: 8 }}>
                          <Meter
                            value={row.completionPercent}
                            fillClassName={
                              row.behindChapters > 0
                                ? "wk-meter__fill--danger"
                                : "wk-meter__fill--success"
                            }
                            className="wk-grow"
                          />
                          <span className="wk-num wk-caption" style={{ width: 38 }}>
                            {percent(row.completionPercent)}
                          </span>
                        </div>
                      </td>
                      <td className="wk-table__num">
                        {row.completedChapters} / {row.totalChapters}
                      </td>
                      <td className="wk-table__num">
                        {row.behindChapters > 0 ? (
                          <span style={{ color: "var(--wk-red-600)", fontWeight: 600 }}>
                            {row.behindChapters}
                          </span>
                        ) : (
                          "—"
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardBody>
      </Card>

      <div className="wk-row-wrap" style={{ marginTop: "var(--wk-space-4)" }}>
        <span className="wk-caption">Bands:</span>
        {[
          { label: "Under 40%", value: 20 },
          { label: "40–69%", value: 50 },
          { label: "70–89%", value: 80 },
          { label: "90%+", value: 95 },
        ].map((band) => (
          <span key={band.label} className="wk-heat" style={heatStyle(band.value)}>
            {band.label}
          </span>
        ))}
      </div>
    </main>
  );
}
