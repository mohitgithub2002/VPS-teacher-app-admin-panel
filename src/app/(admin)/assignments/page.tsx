"use client";

import Link from "next/link";
import { useState } from "react";

import { AssignmentFormModal } from "@/components/domain/AssignmentFormModal";
import {
  ClassroomPicker,
  SessionPicker,
  TeacherPicker,
} from "@/components/domain/Pickers";
import { PageHeader } from "@/components/layout/PageHeader";
import { ActiveBadge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardBody } from "@/components/ui/Card";
import { ConfirmDialog } from "@/components/ui/Modal";
import {
  Avatar,
  ChipFilter,
  EmptyState,
  ErrorState,
  TableSkeleton,
} from "@/components/ui/Primitives";
import { useToast } from "@/components/ui/Toast";
import { useAssignments, useDeactivateAssignment } from "@/lib/api/queries";
import { classroomLabel } from "@/lib/format";

type ActiveFilter = "true" | "false" | "all";

const FILTERS = [
  { value: "true" as const, label: "Active" },
  { value: "all" as const, label: "All" },
  { value: "false" as const, label: "Removed" },
];

export default function AssignmentsPage() {
  const toast = useToast();
  const [teacherId, setTeacherId] = useState<number | "">("");
  const [classroomId, setClassroomId] = useState<number | "">("");
  const [sessionId, setSessionId] = useState<number | "">("");
  const [active, setActive] = useState<ActiveFilter>("true");
  const [createOpen, setCreateOpen] = useState(false);
  const [confirm, setConfirm] = useState<{ id: number; label: string } | null>(null);

  const assignments = useAssignments({
    active,
    ...(teacherId === "" ? {} : { teacherId }),
    ...(classroomId === "" ? {} : { classroomId }),
    ...(sessionId === "" ? {} : { sessionId }),
  });

  const remove = useDeactivateAssignment();
  const rows = assignments.data ?? [];

  const onRemove = () => {
    if (!confirm) return;
    remove.mutate(confirm.id, {
      onSuccess: () => {
        toast.success("Assignment removed", "Session history is preserved.");
        setConfirm(null);
      },
      onError: (error) => toast.fromError(error, "Could not remove the assignment"),
    });
  };

  const hasFilters =
    teacherId !== "" || classroomId !== "" || sessionId !== "" || active !== "true";

  return (
    <main className="wk-page wk-page--wide">
      <PageHeader
        title="Assignments"
        lede="Which teacher owns which subject in which classroom. Creating or removing an assignment recalculates pacing."
        actions={
          <Button variant="primary" icon="plus" onClick={() => setCreateOpen(true)}>
            Assign a class
          </Button>
        }
      />

      <div className="wk-toolbar">
        <TeacherPicker
          value={teacherId}
          onChange={setTeacherId}
          className="wk-toolbar__field"
          activeOnly={false}
        />
        <ClassroomPicker
          value={classroomId}
          onChange={setClassroomId}
          className="wk-toolbar__field"
        />
        <SessionPicker
          value={sessionId}
          onChange={setSessionId}
          className="wk-toolbar__field"
        />
        <div style={{ alignSelf: "flex-end", paddingBottom: 2 }}>
          <ChipFilter
            options={FILTERS}
            value={active}
            onChange={setActive}
            label="Filter by status"
          />
        </div>
      </div>

      <Card>
        <CardBody padding="flush">
          {assignments.isLoading ? (
            <TableSkeleton rows={6} columns={4} />
          ) : assignments.isError ? (
            <ErrorState error={assignments.error} onRetry={() => assignments.refetch()} />
          ) : rows.length === 0 ? (
            <EmptyState
              icon="assignment"
              title={hasFilters ? "No assignments match these filters" : "No assignments yet"}
              body={
                hasFilters
                  ? "Widen the filters, or create the assignment you were looking for."
                  : "Assign teachers to classrooms so they can log teaching sessions."
              }
              action={
                <Button
                  variant="primary"
                  size="sm"
                  icon="plus"
                  onClick={() => setCreateOpen(true)}
                >
                  Assign a class
                </Button>
              }
            />
          ) : (
            <div className="wk-table-wrap">
              <table className="wk-table">
                <thead>
                  <tr>
                    <th>Teacher</th>
                    <th>Subject</th>
                    <th>Classroom</th>
                    <th>Session</th>
                    <th>Status</th>
                    <th aria-label="Actions" />
                  </tr>
                </thead>
                <tbody>
                  {rows.map((assignment) => (
                    <tr key={assignment.id}>
                      <td>
                        <div className="wk-row">
                          <Avatar
                            name={assignment.teacher?.name ?? "?"}
                            seed={assignment.teacherId}
                            size="sm"
                          />
                          <div>
                            <Link
                              href={`/teachers/${assignment.teacherId}`}
                              className="wk-table__primary"
                            >
                              {assignment.teacher?.name}
                            </Link>
                            <div className="wk-caption wk-num">
                              {assignment.teacher?.employeeId}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td>{assignment.subject?.name}</td>
                      <td>{classroomLabel(assignment.classroom)}</td>
                      <td className="wk-num">{assignment.classroom?.session?.name ?? "—"}</td>
                      <td>
                        <ActiveBadge active={assignment.isActive} />
                      </td>
                      <td>
                        <div className="wk-table__actions">
                          {assignment.isActive ? (
                            <Button
                              variant="ghost"
                              size="sm"
                              icon="trash"
                              onClick={() =>
                                setConfirm({
                                  id: assignment.id,
                                  label: `${assignment.teacher?.name} · ${assignment.subject?.name} · ${classroomLabel(assignment.classroom)}`,
                                })
                              }
                            >
                              Remove
                            </Button>
                          ) : null}
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

      <AssignmentFormModal open={createOpen} onClose={() => setCreateOpen(false)} />

      <ConfirmDialog
        open={confirm !== null}
        onClose={() => setConfirm(null)}
        onConfirm={onRemove}
        loading={remove.isPending}
        destructive
        title="Remove this assignment?"
        description={
          confirm
            ? `${confirm.label} will be deactivated. Timetable slots for it stop being meaningful, and pacing is recalculated.`
            : undefined
        }
        confirmLabel="Remove assignment"
      />
    </main>
  );
}
