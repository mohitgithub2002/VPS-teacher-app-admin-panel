"use client";

import { useEffect, useState } from "react";

import { ClassroomPicker, SubjectPicker, TeacherPicker } from "@/components/domain/Pickers";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Alert } from "@/components/ui/Primitives";
import { useToast } from "@/components/ui/Toast";
import { useCreateAssignment } from "@/lib/api/queries";

export function AssignmentFormModal({
  open,
  onClose,
  teacherId,
  teacherName,
}: {
  open: boolean;
  onClose: () => void;
  /** Preselected and locked when opened from a teacher's page. */
  teacherId?: number;
  teacherName?: string;
}) {
  const toast = useToast();
  const create = useCreateAssignment();

  const [teacher, setTeacher] = useState<number | "">(teacherId ?? "");
  const [classroom, setClassroom] = useState<number | "">("");
  const [subject, setSubject] = useState<number | "">("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setTeacher(teacherId ?? "");
    setClassroom("");
    setSubject("");
    setError(null);
  }, [open, teacherId]);

  const onSubmit = () => {
    if (teacher === "" || classroom === "" || subject === "") {
      setError("Pick a teacher, a classroom and a subject.");
      return;
    }
    setError(null);

    create.mutate(
      { teacherId: teacher, classroomId: classroom, subjectId: subject },
      {
        onSuccess: (assignment) => {
          toast.success(
            "Assignment created",
            `${assignment.teacher?.name} · ${assignment.subject?.name}. Pacing has been recalculated.`,
          );
          onClose();
        },
        onError: (cause) => toast.fromError(cause, "Could not create the assignment"),
      },
    );
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Assign a class"
      description="A teacher is assigned to one subject in one classroom. Creating an assignment triggers pacing recalculation."
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={create.isPending}>
            Cancel
          </Button>
          <Button variant="primary" onClick={onSubmit} loading={create.isPending}>
            Create assignment
          </Button>
        </>
      }
    >
      <div className="wk-stack">
        {error ? <Alert tone="danger">{error}</Alert> : null}

        {teacherId ? (
          <div className="wk-field">
            <span className="wk-field__label">Teacher</span>
            <p className="wk-body">{teacherName}</p>
          </div>
        ) : (
          <TeacherPicker
            value={teacher}
            onChange={setTeacher}
            allLabel="Select a teacher"
            required
          />
        )}

        <ClassroomPicker
          value={classroom}
          onChange={setClassroom}
          allLabel="Select a classroom"
          required
        />

        <SubjectPicker
          value={subject}
          onChange={setSubject}
          allLabel="Select a subject"
          required
        />

        <p className="wk-caption">
          A classroom can only have one active teacher per subject — the server
          rejects a duplicate with a conflict.
        </p>
      </div>
    </Modal>
  );
}
