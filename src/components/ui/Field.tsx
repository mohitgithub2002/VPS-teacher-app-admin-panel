"use client";

import {
  useId,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from "react";

import { Icon } from "./Icon";

interface FieldShellProps {
  label?: string;
  hint?: string;
  error?: string | null;
  required?: boolean;
  className?: string;
  children: (props: { id: string; describedBy?: string; invalid: boolean }) => ReactNode;
}

function FieldShell({
  label,
  hint,
  error,
  required,
  className,
  children,
}: FieldShellProps) {
  const id = useId();
  const hintId = `${id}-hint`;
  const message = error ?? hint;

  return (
    <div
      className={["wk-field", error ? "wk-field--error" : null, className]
        .filter(Boolean)
        .join(" ")}
    >
      {label ? (
        <label className="wk-field__label" htmlFor={id}>
          {label}
          {required ? (
            <span className="wk-field__req" aria-hidden="true">
              *
            </span>
          ) : null}
        </label>
      ) : null}
      {children({
        id,
        describedBy: message ? hintId : undefined,
        invalid: Boolean(error),
      })}
      {message ? (
        <p className="wk-field__hint" id={hintId} role={error ? "alert" : undefined}>
          {message}
        </p>
      ) : null}
    </div>
  );
}

type InputProps = Omit<InputHTMLAttributes<HTMLInputElement>, "id"> & {
  label?: string;
  hint?: string;
  error?: string | null;
  fieldClassName?: string;
};

export function Input({
  label,
  hint,
  error,
  required,
  fieldClassName,
  ...rest
}: InputProps) {
  return (
    <FieldShell
      label={label}
      hint={hint}
      error={error}
      required={required}
      className={fieldClassName}
    >
      {({ id, describedBy, invalid }) => (
        <input
          id={id}
          className="wk-input"
          aria-describedby={describedBy}
          aria-invalid={invalid || undefined}
          required={required}
          {...rest}
        />
      )}
    </FieldShell>
  );
}

type SelectProps = Omit<SelectHTMLAttributes<HTMLSelectElement>, "id"> & {
  label?: string;
  hint?: string;
  error?: string | null;
  fieldClassName?: string;
  children: ReactNode;
};

export function Select({
  label,
  hint,
  error,
  required,
  fieldClassName,
  children,
  ...rest
}: SelectProps) {
  return (
    <FieldShell
      label={label}
      hint={hint}
      error={error}
      required={required}
      className={fieldClassName}
    >
      {({ id, describedBy, invalid }) => (
        <select
          id={id}
          className="wk-select"
          aria-describedby={describedBy}
          aria-invalid={invalid || undefined}
          required={required}
          {...rest}
        >
          {children}
        </select>
      )}
    </FieldShell>
  );
}

type TextareaProps = Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, "id"> & {
  label?: string;
  hint?: string;
  error?: string | null;
  fieldClassName?: string;
};

export function Textarea({
  label,
  hint,
  error,
  required,
  fieldClassName,
  ...rest
}: TextareaProps) {
  return (
    <FieldShell
      label={label}
      hint={hint}
      error={error}
      required={required}
      className={fieldClassName}
    >
      {({ id, describedBy, invalid }) => (
        <textarea
          id={id}
          className="wk-textarea"
          aria-describedby={describedBy}
          aria-invalid={invalid || undefined}
          required={required}
          {...rest}
        />
      )}
    </FieldShell>
  );
}

interface SearchInputProps {
  value: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  label?: string;
  className?: string;
}

export function SearchInput({
  value,
  onValueChange,
  placeholder = "Search",
  label,
  className,
}: SearchInputProps) {
  const id = useId();
  return (
    <div className={className}>
      <label className="wk-sr-only" htmlFor={id}>
        {label ?? placeholder}
      </label>
      <div className="wk-search">
        <span className="wk-search__icon">
          <Icon name="search" size={17} />
        </span>
        <input
          id={id}
          className="wk-input"
          type="search"
          value={value}
          placeholder={placeholder}
          onChange={(event) => onValueChange(event.target.value)}
        />
      </div>
    </div>
  );
}
