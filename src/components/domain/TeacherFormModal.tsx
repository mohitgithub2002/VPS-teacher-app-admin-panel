"use client";

import { useEffect, useState } from "react";

import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Field";
import { Modal } from "@/components/ui/Modal";
import { Alert } from "@/components/ui/Primitives";
import { useToast } from "@/components/ui/Toast";
import { useCreateTeacher, useUpdateTeacher } from "@/lib/api/queries";
import type { Teacher } from "@/lib/api/types";

interface FormState {
  employeeId: string;
  name: string;
  phone: string;
  email: string;
  qualification: string;
  password: string;
}

const EMPTY: FormState = {
  employeeId: "",
  name: "",
  phone: "",
  email: "",
  qualification: "",
  password: "",
};

const PHONE_PATTERN = /^\+?\d[\d\s-]{7,14}$/;

/** Client-side mirror of the documented server validation, so the obvious
 *  mistakes never cost a round-trip. The server stays the authority. */
function validate(state: FormState, mode: "create" | "edit") {
  const errors: Partial<Record<keyof FormState, string>> = {};

  if (mode === "create" && !state.employeeId.trim()) {
    errors.employeeId = "Employee ID is required and must be unique.";
  }
  if (!state.name.trim()) errors.name = "Name is required.";
  if (!PHONE_PATTERN.test(state.phone.trim())) {
    errors.phone = "Enter a valid phone number.";
  }
  if (state.email.trim() && !state.email.includes("@")) {
    errors.email = "Enter a valid email address, or leave it empty.";
  }
  if (mode === "create" && state.password && state.password.length < 8) {
    errors.password = "Password must be at least 8 characters.";
  }

  return errors;
}

interface TeacherFormModalProps {
  open: boolean;
  onClose: () => void;
  teacher?: Teacher | null;
  /** Fired after a create with a server-generated temporary password. */
  onCredential?: (payload: {
    name: string;
    employeeId: string;
    password: string;
  }) => void;
}

export function TeacherFormModal({
  open,
  onClose,
  teacher,
  onCredential,
}: TeacherFormModalProps) {
  const toast = useToast();
  const mode = teacher ? "edit" : "create";
  const create = useCreateTeacher();
  const update = useUpdateTeacher();

  const [state, setState] = useState<FormState>(EMPTY);
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({});

  useEffect(() => {
    if (!open) return;
    setErrors({});
    setState(
      teacher
        ? {
            employeeId: teacher.employeeId,
            name: teacher.name,
            phone: teacher.phone,
            email: teacher.email ?? "",
            qualification: teacher.qualification ?? "",
            password: "",
          }
        : EMPTY,
    );
  }, [open, teacher]);

  const set = (key: keyof FormState) => (value: string) =>
    setState((current) => ({ ...current, [key]: value }));

  const pending = create.isPending || update.isPending;

  const onSubmit = () => {
    const found = validate(state, mode);
    setErrors(found);
    if (Object.keys(found).length > 0) return;

    if (teacher) {
      update.mutate(
        {
          id: teacher.id,
          data: {
            name: state.name.trim(),
            phone: state.phone.trim(),
            email: state.email.trim() ? state.email.trim() : null,
            qualification: state.qualification.trim()
              ? state.qualification.trim()
              : null,
          },
        },
        {
          onSuccess: () => {
            toast.success("Teacher updated", state.name.trim());
            onClose();
          },
          onError: (error) => toast.fromError(error, "Could not update the teacher"),
        },
      );
      return;
    }

    create.mutate(
      {
        employeeId: state.employeeId.trim(),
        name: state.name.trim(),
        phone: state.phone.trim(),
        ...(state.email.trim() ? { email: state.email.trim() } : {}),
        ...(state.qualification.trim() ? { qualification: state.qualification.trim() } : {}),
        ...(state.password ? { password: state.password } : {}),
      },
      {
        onSuccess: (result) => {
          toast.success("Teacher created", result.teacher.name);
          onClose();
          if (result.temporaryPassword) {
            onCredential?.({
              name: result.teacher.name,
              employeeId: result.teacher.employeeId,
              password: result.temporaryPassword,
            });
          }
        },
        onError: (error) => toast.fromError(error, "Could not create the teacher"),
      },
    );
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={teacher ? "Edit teacher" : "Add teacher"}
      description={
        teacher
          ? "Employee ID cannot be changed. Leave a field empty to clear it."
          : "Leave the password empty and the server generates a temporary one you can share."
      }
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={pending}>
            Cancel
          </Button>
          <Button variant="primary" onClick={onSubmit} loading={pending}>
            {teacher ? "Save changes" : "Create teacher"}
          </Button>
        </>
      }
    >
      <div className="wk-stack">
        {mode === "create" ? (
          <Input
            label="Employee ID"
            required
            value={state.employeeId}
            onChange={(event) => set("employeeId")(event.target.value)}
            error={errors.employeeId}
            placeholder="EMP016"
            autoComplete="off"
          />
        ) : (
          <Input label="Employee ID" value={state.employeeId} disabled readOnly />
        )}

        <Input
          label="Full name"
          required
          value={state.name}
          onChange={(event) => set("name")(event.target.value)}
          error={errors.name}
          placeholder="Priya Sharma"
          autoComplete="off"
        />

        <Input
          label="Phone"
          required
          value={state.phone}
          onChange={(event) => set("phone")(event.target.value)}
          error={errors.phone}
          hint="Used as the teacher's contact number. Digits only."
          placeholder="9876543211"
          inputMode="tel"
          autoComplete="off"
        />

        <Input
          label="Email"
          type="email"
          value={state.email}
          onChange={(event) => set("email")(event.target.value)}
          error={errors.email}
          placeholder="priya@school.com"
          autoComplete="off"
        />

        <Input
          label="Qualification"
          value={state.qualification}
          onChange={(event) => set("qualification")(event.target.value)}
          placeholder="M.A English"
          autoComplete="off"
        />

        {mode === "create" ? (
          <>
            <Input
              label="Password"
              type="password"
              value={state.password}
              onChange={(event) => set("password")(event.target.value)}
              error={errors.password}
              hint="Optional. Minimum 8 characters if you set one yourself."
              autoComplete="new-password"
            />
            <Alert tone="info">
              A generated password is shown once, immediately after creation. Copy it
              before closing that dialog.
            </Alert>
          </>
        ) : null}
      </div>
    </Modal>
  );
}
