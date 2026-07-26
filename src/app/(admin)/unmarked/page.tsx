"use client";

import { useMemo, useState } from "react";

import { ClassPicker, SubjectPicker } from "@/components/domain/Pickers";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardBody, CardHead } from "@/components/ui/Card";
import {
  Alert,
  EmptyState,
  ErrorState,
  StatCard,
  TableSkeleton,
} from "@/components/ui/Primitives";
import { useUnmarkedSubtopics } from "@/lib/api/queries";
import { pluralise } from "@/lib/format";

export default function UnmarkedPage() {
  const [classId, setClassId] = useState<number | "">("");
  const [subjectId, setSubjectId] = useState<number | "">("");

  const unmarked = useUnmarkedSubtopics({
    ...(classId === "" ? {} : { classId }),
    ...(subjectId === "" ? {} : { subjectId }),
  });

  const rows = unmarked.data ?? [];

  /* Group by chapter so the list reads as gaps in the syllabus, not a flat dump. */
  const groups = useMemo(() => {
    const map = new Map<
      number,
      {
        chapterName: string;
        subjectName: string;
        className: string;
        subtopics: { id: number; name: string; displayOrder: number }[];
      }
    >();

    for (const row of unmarked.data ?? []) {
      const key = row.chapter.id;
      const entry = map.get(key) ?? {
        chapterName: row.chapter.name,
        subjectName: row.chapter.subject?.name ?? "—",
        className: row.chapter.class?.name ?? "—",
        subtopics: [],
      };
      entry.subtopics.push({
        id: row.id,
        name: row.name,
        displayOrder: row.displayOrder,
      });
      map.set(key, entry);
    }

    return [...map.entries()]
      .map(([id, value]) => ({
        id,
        ...value,
        subtopics: value.subtopics.sort((a, b) => a.displayOrder - b.displayOrder),
      }))
      .sort(
        (a, b) =>
          b.subtopics.length - a.subtopics.length ||
          a.chapterName.localeCompare(b.chapterName),
      );
  }, [unmarked.data]);

  return (
    <main className="wk-page wk-page--wide">
      <PageHeader
        title="Unmarked topics"
        lede="Subtopics that have never been completed in any session, anywhere in the school. Either they haven't been taught yet, or nobody is ticking them off."
      />

      <div className="wk-toolbar">
        <ClassPicker value={classId} onChange={setClassId} className="wk-toolbar__field" />
        <SubjectPicker
          value={subjectId}
          onChange={setSubjectId}
          className="wk-toolbar__field"
        />
      </div>

      <div className="wk-stats" style={{ marginBottom: "var(--wk-space-6)" }}>
        <StatCard
          label="Unmarked subtopics"
          value={unmarked.isLoading ? "—" : rows.length}
          meta="Never completed in any session"
          icon="inbox"
          tone="brand"
        />
        <StatCard
          label="Chapters affected"
          value={unmarked.isLoading ? "—" : groups.length}
          meta="Across the current filters"
          icon="book"
        />
      </div>

      {!unmarked.isLoading && rows.length > 0 ? (
        <div style={{ marginBottom: "var(--wk-space-5)" }}>
          <Alert tone="info" title="Not necessarily a problem">
            Late-in-the-year chapters will legitimately appear here. Compare against
            pacing before chasing anyone — a subtopic that should have been covered
            weeks ago is the signal worth acting on.
          </Alert>
        </div>
      ) : null}

      <Card>
        <CardHead
          title="Grouped by chapter"
          subtitle="Largest gaps first"
        />
        <CardBody padding="flush">
          {unmarked.isLoading ? (
            <TableSkeleton rows={6} columns={3} />
          ) : unmarked.isError ? (
            <ErrorState error={unmarked.error} onRetry={() => unmarked.refetch()} />
          ) : groups.length === 0 ? (
            <EmptyState
              icon="check-circle"
              title="Every subtopic has been covered"
              body="No active subtopic is missing a completed session in this scope."
            />
          ) : (
            <ul>
              {groups.map((group) => (
                <li
                  key={group.id}
                  style={{
                    padding: "var(--wk-space-5) var(--wk-space-6)",
                    borderBottom: "1px solid var(--wk-border-subtle)",
                  }}
                >
                  <div className="wk-spread" style={{ marginBottom: "var(--wk-space-3)" }}>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontWeight: 600 }} className="wk-truncate">
                        {group.chapterName}
                      </div>
                      <div className="wk-body-sm wk-text-secondary">
                        {group.subjectName} · {group.className}
                      </div>
                    </div>
                    <span className="wk-body-sm wk-num wk-text-secondary" style={{ flex: "none" }}>
                      {pluralise(group.subtopics.length, "subtopic")}
                    </span>
                  </div>
                  <div className="wk-chip-set">
                    {group.subtopics.map((subtopic) => (
                      <span
                        key={subtopic.id}
                        className="wk-chip"
                        style={{ cursor: "default", fontWeight: 400 }}
                      >
                        <span className="wk-num wk-text-muted">{subtopic.displayOrder}</span>
                        {subtopic.name}
                      </span>
                    ))}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardBody>
      </Card>
    </main>
  );
}
