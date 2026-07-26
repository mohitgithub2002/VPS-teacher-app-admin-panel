"use client";

import { Select } from "@/components/ui/Field";
import { classroomLabel } from "@/lib/format";
import { useLookups, useSubjects, useTeachers } from "@/lib/api/queries";

/** A single shared shape for every "filter by X" select on every screen. */
interface PickerProps {
  value: number | "";
  onChange: (value: number | "") => void;
  label?: string;
  allLabel?: string;
  required?: boolean;
  hint?: string;
  error?: string | null;
  className?: string;
  disabled?: boolean;
}

function toValue(raw: string): number | "" {
  return raw === "" ? "" : Number(raw);
}

export function TeacherPicker({
  value,
  onChange,
  label = "Teacher",
  allLabel = "All teachers",
  activeOnly = true,
  ...rest
}: PickerProps & { activeOnly?: boolean }) {
  const teachers = useTeachers({
    pageSize: 200,
    ...(activeOnly ? { active: "true" as const } : {}),
  });

  return (
    <Select
      label={label}
      value={value === "" ? "" : String(value)}
      onChange={(event) => onChange(toValue(event.target.value))}
      fieldClassName={rest.className}
      hint={rest.hint}
      error={rest.error}
      required={rest.required}
      disabled={rest.disabled || teachers.isLoading}
    >
      <option value="">{allLabel}</option>
      {teachers.data?.teachers.map((teacher) => (
        <option key={teacher.id} value={teacher.id}>
          {teacher.name} · {teacher.employeeId}
        </option>
      ))}
    </Select>
  );
}

export function SubjectPicker({
  value,
  onChange,
  label = "Subject",
  allLabel = "All subjects",
  activeOnly = true,
  ...rest
}: PickerProps & { activeOnly?: boolean }) {
  const subjects = useSubjects(activeOnly ? "true" : "all");

  return (
    <Select
      label={label}
      value={value === "" ? "" : String(value)}
      onChange={(event) => onChange(toValue(event.target.value))}
      fieldClassName={rest.className}
      hint={rest.hint}
      error={rest.error}
      required={rest.required}
      disabled={rest.disabled || subjects.isLoading}
    >
      <option value="">{allLabel}</option>
      {subjects.data?.map((subject) => (
        <option key={subject.id} value={subject.id}>
          {subject.name}
          {subject.code ? ` (${subject.code})` : ""}
        </option>
      ))}
    </Select>
  );
}

export function ClassPicker({
  value,
  onChange,
  label = "Class",
  allLabel = "All classes",
  ...rest
}: PickerProps) {
  const { classes, isLoading } = useLookups();

  return (
    <Select
      label={label}
      value={value === "" ? "" : String(value)}
      onChange={(event) => onChange(toValue(event.target.value))}
      fieldClassName={rest.className}
      hint={rest.hint}
      error={rest.error}
      required={rest.required}
      disabled={rest.disabled || isLoading}
    >
      <option value="">{allLabel}</option>
      {classes.map((cls) => (
        <option key={cls.id} value={cls.id}>
          {cls.name}
        </option>
      ))}
    </Select>
  );
}

export function ClassroomPicker({
  value,
  onChange,
  label = "Classroom",
  allLabel = "All classrooms",
  sessionId,
  ...rest
}: PickerProps & { sessionId?: number }) {
  const { classrooms, isLoading } = useLookups();
  const options = sessionId
    ? classrooms.filter((room) => room.session?.id === sessionId)
    : classrooms;

  return (
    <Select
      label={label}
      value={value === "" ? "" : String(value)}
      onChange={(event) => onChange(toValue(event.target.value))}
      fieldClassName={rest.className}
      hint={rest.hint}
      error={rest.error}
      required={rest.required}
      disabled={rest.disabled || isLoading}
    >
      <option value="">{allLabel}</option>
      {options.map((room) => (
        <option key={room.id} value={room.id}>
          {classroomLabel(room)}
          {room.session?.name ? ` · ${room.session.name}` : ""}
        </option>
      ))}
    </Select>
  );
}

export function SessionPicker({
  value,
  onChange,
  label = "Academic session",
  allLabel = "All sessions",
  ...rest
}: PickerProps) {
  const { sessions, isLoading } = useLookups();

  return (
    <Select
      label={label}
      value={value === "" ? "" : String(value)}
      onChange={(event) => onChange(toValue(event.target.value))}
      fieldClassName={rest.className}
      hint={rest.hint}
      error={rest.error}
      required={rest.required}
      disabled={rest.disabled || isLoading}
    >
      {rest.required ? null : <option value="">{allLabel}</option>}
      {sessions.map((session) => (
        <option key={session.id} value={session.id}>
          {session.name}
          {session.isCurrent ? " · current" : ""}
        </option>
      ))}
    </Select>
  );
}
