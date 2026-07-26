"use client";

import { useState } from "react";

import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { Modal } from "@/components/ui/Modal";
import { Alert } from "@/components/ui/Primitives";

/**
 * The API returns a temporary password exactly once, on create and on reset.
 * This is the only place it will ever be visible, so the copy says so plainly.
 */
export function CredentialModal({
  open,
  onClose,
  name,
  employeeId,
  password,
}: {
  open: boolean;
  onClose: () => void;
  name: string;
  employeeId: string;
  password: string;
}) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(password);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Temporary password"
      description={`Share this with ${name} (${employeeId}) securely. They should change it after their first sign-in.`}
      footer={
        <Button variant="primary" onClick={onClose}>
          I&apos;ve saved it
        </Button>
      }
    >
      <div className="wk-stack">
        <div className="wk-cred">
          <span className="wk-cred__value">{password}</span>
          <Button variant="outline" size="sm" icon={copied ? "check" : "copy"} onClick={copy}>
            {copied ? "Copied" : "Copy"}
          </Button>
        </div>

        <Alert tone="pending" title="Shown once">
          This password is not stored anywhere in the panel. Close this dialog and
          it is gone — you would have to reset the password again.
        </Alert>

        <p className="wk-body-sm wk-text-secondary">
          <Icon name="key" size={15} /> The teacher signs in with employee ID{" "}
          <b>{employeeId}</b> and this password in the teacher app.
        </p>
      </div>
    </Modal>
  );
}
