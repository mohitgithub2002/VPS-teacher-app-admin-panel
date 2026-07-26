"use client";

import { useState } from "react";

import { SubjectPicker } from "@/components/domain/Pickers";
import { PageHeader } from "@/components/layout/PageHeader";
import { Badge } from "@/components/ui/Badge";
import { Card, CardBody, CardHead } from "@/components/ui/Card";
import {
  ChipFilter,
  EmptyState,
  ErrorState,
  StatCard,
  TableSkeleton,
} from "@/components/ui/Primitives";
import { useTestCoverage } from "@/lib/api/queries";

type Filter = "all" | "untested" | "unrevised";

const FILTERS = [
  { value: "all" as const, label: "All chapters" },
  { value: "untested" as const, label: "Never tested" },
  { value: "unrevised" as const, label: "Never revised" },
];

export default function TestCoveragePage() {
  const [subjectId, setSubjectId] = useState<number | "">("");
  const [filter, setFilter] = useState<Filter>("all");

  const coverage = useTestCoverage(subjectId === "" ? undefined : subjectId);
  const all = coverage.data ?? [];

  const rows = all.filter((row) => {
    if (filter === "untested") return row.testCount === 0;
    if (filter === "unrevised") return row.revisionCount === 0;
    return true;
  });

  const untested = all.filter((row) => row.testCount === 0).length;
  const unrevised = all.filter((row) => row.revisionCount === 0).length;

  return (
    <main className="wk-page wk-page--wide">
      <PageHeader
        title="Test coverage"
        lede="How often each chapter has been tested or revised. A chapter taught but never tested is the usual gap."
      />

      <div className="wk-toolbar" style={{ alignItems: "flex-end" }}>
        <SubjectPicker
          value={subjectId}
          onChange={setSubjectId}
          className="wk-toolbar__field"
        />
        <ChipFilter
          options={FILTERS}
          value={filter}
          onChange={setFilter}
          label="Filter coverage"
        />
      </div>

      <div className="wk-stats" style={{ marginBottom: "var(--wk-space-6)" }}>
        <StatCard
          label="Chapters"
          value={coverage.isLoading ? "—" : all.length}
          meta="Active chapters in scope"
          icon="book"
        />
        <StatCard
          label="Never tested"
          value={coverage.isLoading ? "—" : untested}
          meta={all.length ? `${Math.round((untested / all.length) * 100)}% of chapters` : "—"}
          icon="clipboard"
          tone="brand"
        />
        <StatCard
          label="Never revised"
          value={coverage.isLoading ? "—" : unrevised}
          meta={all.length ? `${Math.round((unrevised / all.length) * 100)}% of chapters` : "—"}
          icon="refresh"
          tone="accent"
        />
      </div>

      <Card>
        <CardHead
          title="Chapters by coverage"
          subtitle="Least covered first"
        />
        <CardBody padding="flush">
          {coverage.isLoading ? (
            <TableSkeleton rows={8} columns={5} />
          ) : coverage.isError ? (
            <ErrorState error={coverage.error} onRetry={() => coverage.refetch()} />
          ) : rows.length === 0 ? (
            <EmptyState
              icon="clipboard"
              title={
                filter === "all"
                  ? "No chapters in scope"
                  : "Nothing matches that filter"
              }
              body={
                filter === "all"
                  ? "Create chapters for this subject to track test coverage."
                  : "Every chapter in scope has at least one session of this kind."
              }
            />
          ) : (
            <div className="wk-table-wrap">
              <table className="wk-table">
                <thead>
                  <tr>
                    <th>Chapter</th>
                    <th>Class</th>
                    <th>Subject</th>
                    <th className="wk-table__num">Tests</th>
                    <th className="wk-table__num">Revisions</th>
                    <th>Flag</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr key={row.chapterId}>
                      <td className="wk-table__primary">{row.chapterName}</td>
                      <td>{row.className}</td>
                      <td>{row.subjectName}</td>
                      <td className="wk-table__num">{row.testCount}</td>
                      <td className="wk-table__num">{row.revisionCount}</td>
                      <td>
                        {row.testCount === 0 && row.revisionCount === 0 ? (
                          <Badge tone="danger" dot>
                            No test or revision
                          </Badge>
                        ) : row.testCount === 0 ? (
                          <Badge tone="pending" dot>
                            Never tested
                          </Badge>
                        ) : (
                          <Badge tone="success" dot>
                            Covered
                          </Badge>
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
    </main>
  );
}
