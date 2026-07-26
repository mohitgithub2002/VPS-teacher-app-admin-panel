"use client";

import { useEffect, useMemo, useState } from "react";

import { ClassroomPicker, TeacherPicker } from "@/components/domain/Pickers";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/Button";
import { Card, CardBody, CardHead } from "@/components/ui/Card";
import { Input, Select } from "@/components/ui/Field";
import { Icon } from "@/components/ui/Icon";
import { ConfirmDialog, Modal } from "@/components/ui/Modal";
import {
  Alert,
  EmptyState,
  ErrorState,
  Skeleton,
  Tabs,
} from "@/components/ui/Primitives";
import { useToast } from "@/components/ui/Toast";
import {
  useAssignments,
  useCreateTimetableSlot,
  useDeleteTimetableSlot,
  useLookups,
  useTimetable,
  useUpdateTimetableSlot,
} from "@/lib/api/queries";
import { DAY_SHORT, classroomLabel } from "@/lib/format";
import type { TimetableSlot } from "@/lib/api/types";

type Mode = "classroom" | "teacher";

const DAYS = [1, 2, 3, 4, 5, 6];
const MIN_PERIODS = 6;

/** Sensible defaults so adding a period is two clicks, not six fields. */
const PERIOD_TIMES: Record<number, [string, string]> = {
  1: ["08:00", "08:45"],
  2: ["08:50", "09:35"],
  3: ["09:55", "10:40"],
  4: ["10:45", "11:30"],
  5: ["12:10", "12:55"],
  6: ["13:00", "13:45"],
  7: ["13:50", "14:35"],
  8: ["14:40", "15:25"],
};

export default function TimetablePage() {
  const toast = useToast();
  const { classrooms, currentSessionId } = useLookups();

  const [mode, setMode] = useState<Mode>("classroom");
  const [classroomId, setClassroomId] = useState<number | "">("");
  const [teacherId, setTeacherId] = useState<number | "">("");
  const [creating, setCreating] = useState<{ day: number; period: number } | null>(null);
  const [editing, setEditing] = useState<TimetableSlot | null>(null);
  const [deleting, setDeleting] = useState<TimetableSlot | null>(null);

  // Land on a real classroom rather than an empty grid.
  useEffect(() => {
    if (mode !== "classroom" || classroomId !== "" || classrooms.length === 0) return;
    const inSession = classrooms.find((room) => room.session?.id === currentSessionId);
    setClassroomId((inSession ?? classrooms[0]).id);
  }, [mode, classroomId, classrooms, currentSessionId]);

  const filter =
    mode === "classroom"
      ? classroomId === ""
        ? undefined
        : { classroomId }
      : teacherId === ""
        ? undefined
        : { teacherId };

  const timetable = useTimetable(filter);
  const slots = timetable.data ?? [];

  const periodCount = Math.max(
    MIN_PERIODS,
    slots.reduce((max, slot) => Math.max(max, slot.periodNumber), 0),
  );
  const periods = Array.from({ length: periodCount }, (_, index) => index + 1);

  const byCell = useMemo(() => {
    const map = new Map<string, TimetableSlot>();
    for (const slot of timetable.data ?? []) {
      map.set(`${slot.dayOfWeek}:${slot.periodNumber}`, slot);
    }
    return map;
  }, [timetable.data]);

  const selectionMade =
    mode === "classroom" ? classroomId !== "" : teacherId !== "";

  const create = useCreateTimetableSlot();
  const update = useUpdateTimetableSlot();
  const remove = useDeleteTimetableSlot();

  const onDelete = () => {
    if (!deleting) return;
    remove.mutate(deleting.id, {
      onSuccess: () => {
        toast.success("Period removed");
        setDeleting(null);
        setEditing(null);
      },
      onError: (error) => toast.fromError(error, "Could not remove the period"),
    });
  };

  return (
    <main className="wk-page wk-page--wide">
      <PageHeader
        title="Timetable"
        lede="Six days, one grid. The server rejects a period that double-books a teacher or a classroom, so clashes cannot be saved."
        actions={
          <Button
            variant="primary"
            icon="plus"
            onClick={() => setCreating({ day: 1, period: 1 })}
            disabled={!selectionMade}
          >
            Add period
          </Button>
        }
      />

      <div className="wk-toolbar" style={{ alignItems: "flex-end" }}>
        <Tabs
          tabs={[
            { value: "classroom" as const, label: "By classroom" },
            { value: "teacher" as const, label: "By teacher" },
          ]}
          value={mode}
          onChange={setMode}
          label="Timetable view"
        />
        {mode === "classroom" ? (
          <ClassroomPicker
            value={classroomId}
            onChange={setClassroomId}
            className="wk-toolbar__field"
            allLabel="Choose a classroom"
          />
        ) : (
          <TeacherPicker
            value={teacherId}
            onChange={setTeacherId}
            className="wk-toolbar__field"
            allLabel="Choose a teacher"
          />
        )}
      </div>

      <Card>
        <CardHead
          title={
            mode === "classroom"
              ? classroomId === ""
                ? "Weekly grid"
                : `Weekly grid · ${classroomLabel(
                    classrooms.find((room) => room.id === classroomId),
                  )}`
              : "Weekly grid · selected teacher"
          }
          subtitle={`${slots.length} periods scheduled · ${periodCount} periods a day`}
        />
        <CardBody padding="tight">
          {!selectionMade ? (
            <EmptyState
              icon="grid"
              title={mode === "classroom" ? "Pick a classroom" : "Pick a teacher"}
              body="The grid shows one classroom's week, or one teacher's week — whichever you are building."
            />
          ) : timetable.isLoading ? (
            <div className="wk-stack">
              {DAYS.map((day) => (
                <Skeleton key={day} height={76} radius="var(--wk-radius-sm)" />
              ))}
            </div>
          ) : timetable.isError ? (
            <ErrorState error={timetable.error} onRetry={() => timetable.refetch()} />
          ) : (
            <div className="wk-scroll-x">
              <table className="wk-tt">
                <caption className="wk-sr-only">
                  Weekly timetable, days as rows and periods as columns
                </caption>
                <thead>
                  <tr>
                    <th scope="col">Day</th>
                    {periods.map((period) => (
                      <th key={period} scope="col">
                        Period {period}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {DAYS.map((day) => (
                    <tr key={day}>
                      <th scope="row" className="wk-tt__day">
                        {DAY_SHORT[day]}
                      </th>
                      {periods.map((period) => {
                        const slot = byCell.get(`${day}:${period}`);
                        return (
                          <td key={period} className="wk-tt__cell">
                            {slot ? (
                              <button
                                type="button"
                                className="wk-slot wk-slot--filled"
                                onClick={() => setEditing(slot)}
                              >
                                <span className="wk-slot__subject">
                                  {slot.assignment?.subject?.name}
                                </span>
                                <span className="wk-slot__line">
                                  {mode === "classroom"
                                    ? slot.assignment?.teacher?.name
                                    : slot.assignment?.classroom?.class?.name}
                                </span>
                                {slot.roomLabel ? (
                                  <span className="wk-slot__line">{slot.roomLabel}</span>
                                ) : null}
                                <span className="wk-slot__time">
                                  {slot.startTime}–{slot.endTime}
                                </span>
                              </button>
                            ) : (
                              <button
                                type="button"
                                className="wk-slot wk-slot--empty"
                                onClick={() => setCreating({ day, period })}
                                aria-label={`Add a period on ${DAY_SHORT[day]}, period ${period}`}
                              >
                                <Icon name="plus" size={16} />
                              </button>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardBody>
      </Card>

      <CreateSlotModal
        open={creating !== null}
        day={creating?.day ?? 1}
        period={creating?.period ?? 1}
        classroomId={mode === "classroom" && classroomId !== "" ? classroomId : undefined}
        teacherId={mode === "teacher" && teacherId !== "" ? teacherId : undefined}
        maxPeriods={Math.max(periodCount + 1, MIN_PERIODS)}
        loading={create.isPending}
        onClose={() => setCreating(null)}
        onSubmit={(payload, close) => {
          create.mutate(payload, {
            onSuccess: () => {
              toast.success("Period added");
              close();
            },
            onError: (error) => toast.fromError(error, "Could not add the period"),
          });
        }}
      />

      <EditSlotModal
        slot={editing}
        loading={update.isPending}
        onClose={() => setEditing(null)}
        onDelete={() => editing && setDeleting(editing)}
        onSubmit={(payload, close) => {
          if (!editing) return;
          update.mutate(
            { id: editing.id, data: payload },
            {
              onSuccess: () => {
                toast.success("Period updated");
                close();
              },
              onError: (error) => toast.fromError(error, "Could not update the period"),
            },
          );
        }}
      />

      <ConfirmDialog
        open={deleting !== null}
        onClose={() => setDeleting(null)}
        onConfirm={onDelete}
        loading={remove.isPending}
        destructive
        title="Remove this period?"
        description={
          deleting
            ? `${deleting.assignment?.subject?.name} on ${DAY_SHORT[deleting.dayOfWeek]}, period ${deleting.periodNumber}. Timetable slots are hard-deleted.`
            : undefined
        }
        confirmLabel="Remove period"
      />
    </main>
  );
}

function CreateSlotModal({
  open,
  day,
  period,
  classroomId,
  teacherId,
  maxPeriods,
  loading,
  onClose,
  onSubmit,
}: {
  open: boolean;
  day: number;
  period: number;
  classroomId?: number;
  teacherId?: number;
  maxPeriods: number;
  loading: boolean;
  onClose: () => void;
  onSubmit: (
    payload: {
      assignmentId: number;
      dayOfWeek: number;
      periodNumber: number;
      startTime: string;
      endTime: string;
      roomLabel?: string;
    },
    close: () => void,
  ) => void;
}) {
  const assignments = useAssignments(
    {
      active: "true",
      ...(classroomId ? { classroomId } : {}),
      ...(teacherId ? { teacherId } : {}),
    },
    { enabled: open },
  );

  const [assignmentId, setAssignmentId] = useState<number | "">("");
  const [dayOfWeek, setDayOfWeek] = useState(day);
  const [periodNumber, setPeriodNumber] = useState(period);
  const [startTime, setStartTime] = useState(PERIOD_TIMES[period]?.[0] ?? "08:00");
  const [endTime, setEndTime] = useState(PERIOD_TIMES[period]?.[1] ?? "08:45");
  const [roomLabel, setRoomLabel] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setAssignmentId("");
    setDayOfWeek(day);
    setPeriodNumber(period);
    setStartTime(PERIOD_TIMES[period]?.[0] ?? "08:00");
    setEndTime(PERIOD_TIMES[period]?.[1] ?? "08:45");
    setRoomLabel("");
    setError(null);
  }, [open, day, period]);

  const onPeriodChange = (value: number) => {
    setPeriodNumber(value);
    const times = PERIOD_TIMES[value];
    if (times) {
      setStartTime(times[0]);
      setEndTime(times[1]);
    }
  };

  const submit = () => {
    if (assignmentId === "") {
      setError("Pick the assignment this period teaches.");
      return;
    }
    if (!startTime || !endTime) {
      setError("Start and end times are required.");
      return;
    }
    if (endTime <= startTime) {
      setError("The end time must be after the start time.");
      return;
    }
    setError(null);
    onSubmit(
      {
        assignmentId,
        dayOfWeek,
        periodNumber,
        startTime,
        endTime,
        ...(roomLabel.trim() ? { roomLabel: roomLabel.trim() } : {}),
      },
      onClose,
    );
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Add a period"
      description="Only active assignments can be scheduled. A clash with the same teacher or classroom is rejected with a conflict."
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button variant="primary" onClick={submit} loading={loading}>
            Add period
          </Button>
        </>
      }
    >
      <div className="wk-stack">
        {error ? <Alert tone="danger">{error}</Alert> : null}

        <Select
          label="Assignment"
          required
          value={assignmentId === "" ? "" : String(assignmentId)}
          onChange={(event) =>
            setAssignmentId(event.target.value === "" ? "" : Number(event.target.value))
          }
          disabled={assignments.isLoading}
          hint={
            (assignments.data ?? []).length === 0 && !assignments.isLoading
              ? "No active assignments match this view — create one first."
              : undefined
          }
        >
          <option value="">Select an assignment</option>
          {(assignments.data ?? []).map((assignment) => (
            <option key={assignment.id} value={assignment.id}>
              {assignment.subject?.name} · {classroomLabel(assignment.classroom)} ·{" "}
              {assignment.teacher?.name}
            </option>
          ))}
        </Select>

        <div className="wk-row" style={{ gap: "var(--wk-space-4)", alignItems: "flex-start" }}>
          <Select
            label="Day"
            required
            value={String(dayOfWeek)}
            onChange={(event) => setDayOfWeek(Number(event.target.value))}
            fieldClassName="wk-grow"
          >
            {DAYS.map((value) => (
              <option key={value} value={value}>
                {DAY_SHORT[value]}
              </option>
            ))}
          </Select>
          <Select
            label="Period"
            required
            value={String(periodNumber)}
            onChange={(event) => onPeriodChange(Number(event.target.value))}
            fieldClassName="wk-grow"
          >
            {Array.from({ length: maxPeriods }, (_, index) => index + 1).map((value) => (
              <option key={value} value={value}>
                Period {value}
              </option>
            ))}
          </Select>
        </div>

        <div className="wk-row" style={{ gap: "var(--wk-space-4)", alignItems: "flex-start" }}>
          <Input
            label="Start time"
            type="time"
            required
            value={startTime}
            onChange={(event) => setStartTime(event.target.value)}
            fieldClassName="wk-grow"
          />
          <Input
            label="End time"
            type="time"
            required
            value={endTime}
            onChange={(event) => setEndTime(event.target.value)}
            fieldClassName="wk-grow"
          />
        </div>

        <Input
          label="Room"
          value={roomLabel}
          onChange={(event) => setRoomLabel(event.target.value)}
          placeholder="Room 201"
        />
      </div>
    </Modal>
  );
}

function EditSlotModal({
  slot,
  loading,
  onClose,
  onDelete,
  onSubmit,
}: {
  slot: TimetableSlot | null;
  loading: boolean;
  onClose: () => void;
  onDelete: () => void;
  onSubmit: (
    payload: { startTime?: string; endTime?: string; roomLabel?: string | null },
    close: () => void,
  ) => void;
}) {
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [roomLabel, setRoomLabel] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!slot) return;
    setStartTime(slot.startTime);
    setEndTime(slot.endTime);
    setRoomLabel(slot.roomLabel ?? "");
    setError(null);
  }, [slot]);

  const submit = () => {
    if (endTime <= startTime) {
      setError("The end time must be after the start time.");
      return;
    }
    setError(null);
    onSubmit(
      {
        startTime,
        endTime,
        roomLabel: roomLabel.trim() ? roomLabel.trim() : null,
      },
      onClose,
    );
  };

  return (
    <Modal
      open={slot !== null}
      onClose={onClose}
      title="Edit period"
      description={
        slot
          ? `${slot.assignment?.subject?.name} · ${slot.assignment?.teacher?.name} · ${DAY_SHORT[slot.dayOfWeek]} period ${slot.periodNumber}`
          : undefined
      }
      footer={
        <>
          <Button variant="danger" icon="trash" onClick={onDelete} disabled={loading}>
            Remove
          </Button>
          <div className="wk-grow" />
          <Button variant="ghost" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button variant="primary" onClick={submit} loading={loading}>
            Save changes
          </Button>
        </>
      }
    >
      <div className="wk-stack">
        {error ? <Alert tone="danger">{error}</Alert> : null}
        <p className="wk-body-sm wk-text-secondary">
          Day and period are fixed once a slot exists — remove it and add it again to
          move it, so clash detection runs on the new position.
        </p>
        <div className="wk-row" style={{ gap: "var(--wk-space-4)", alignItems: "flex-start" }}>
          <Input
            label="Start time"
            type="time"
            value={startTime}
            onChange={(event) => setStartTime(event.target.value)}
            fieldClassName="wk-grow"
          />
          <Input
            label="End time"
            type="time"
            value={endTime}
            onChange={(event) => setEndTime(event.target.value)}
            fieldClassName="wk-grow"
          />
        </div>
        <Input
          label="Room"
          value={roomLabel}
          onChange={(event) => setRoomLabel(event.target.value)}
          placeholder="Room 201"
        />
      </div>
    </Modal>
  );
}
