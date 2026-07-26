"use client";

import {
  useCallback,
  useEffect,
  useId,
  useRef,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";

import { Button } from "./Button";
import { Icon } from "./Icon";

function useDismissable(open: boolean, onClose: () => void) {
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKeyDown);
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previous;
    };
  }, [open, onClose]);
}

/** Keeps tab focus inside the overlay while it is open. */
function useFocusTrap(open: boolean) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open || !ref.current) return;
    const root = ref.current;
    const selector =
      'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

    const focusables = () => Array.from(root.querySelectorAll<HTMLElement>(selector));
    const first = focusables()[0];
    first?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Tab") return;
      const items = focusables();
      if (items.length === 0) return;
      const start = items[0];
      const end = items[items.length - 1];
      if (event.shiftKey && document.activeElement === start) {
        event.preventDefault();
        end.focus();
      } else if (!event.shiftKey && document.activeElement === end) {
        event.preventDefault();
        start.focus();
      }
    };

    root.addEventListener("keydown", onKeyDown);
    return () => root.removeEventListener("keydown", onKeyDown);
  }, [open]);

  return ref;
}

interface OverlayProps {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  variant?: "center" | "right";
  labelledBy?: string;
}

function Overlay({ open, onClose, children, variant = "center", labelledBy }: OverlayProps) {
  useDismissable(open, onClose);
  const trapRef = useFocusTrap(open);

  const onBackdrop = useCallback(
    (event: React.MouseEvent<HTMLDivElement>) => {
      if (event.target === event.currentTarget) onClose();
    },
    [onClose],
  );

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div
      className={["wk-overlay", variant === "right" ? "wk-overlay--right" : null]
        .filter(Boolean)
        .join(" ")}
      onMouseDown={onBackdrop}
    >
      <div ref={trapRef} role="dialog" aria-modal="true" aria-labelledby={labelledBy}>
        {children}
      </div>
    </div>,
    document.body,
  );
}

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children?: ReactNode;
  footer?: ReactNode;
  wide?: boolean;
}

export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  wide,
}: ModalProps) {
  const titleId = useId();

  return (
    <Overlay open={open} onClose={onClose} labelledBy={titleId}>
      <div className={["wk-modal", wide ? "wk-modal--wide" : null].filter(Boolean).join(" ")}>
        <header className="wk-modal__head">
          <div className="wk-grow">
            <h2 className="wk-modal__title" id={titleId}>
              {title}
            </h2>
            {description ? <p className="wk-modal__desc">{description}</p> : null}
          </div>
          <button type="button" className="wk-close" onClick={onClose} aria-label="Close">
            <Icon name="close" size={18} />
          </button>
        </header>
        <div className="wk-modal__body">{children}</div>
        {footer ? <footer className="wk-modal__foot">{footer}</footer> : null}
      </div>
    </Overlay>
  );
}

interface DrawerProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children?: ReactNode;
  footer?: ReactNode;
}

export function Drawer({
  open,
  onClose,
  title,
  description,
  children,
  footer,
}: DrawerProps) {
  const titleId = useId();

  return (
    <Overlay open={open} onClose={onClose} variant="right" labelledBy={titleId}>
      <div className="wk-drawer">
        <header className="wk-modal__head">
          <div className="wk-grow">
            <h2 className="wk-modal__title" id={titleId}>
              {title}
            </h2>
            {description ? <p className="wk-modal__desc">{description}</p> : null}
          </div>
          <button type="button" className="wk-close" onClick={onClose} aria-label="Close">
            <Icon name="close" size={18} />
          </button>
        </header>
        <div className="wk-modal__body wk-grow">{children}</div>
        {footer ? <footer className="wk-modal__foot">{footer}</footer> : null}
      </div>
    </Overlay>
  );
}

interface ConfirmDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  loading?: boolean;
  destructive?: boolean;
  children?: ReactNode;
}

export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  loading,
  destructive,
  children,
}: ConfirmDialogProps) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      description={description}
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={loading}>
            {cancelLabel}
          </Button>
          <Button
            variant={destructive ? "danger" : "primary"}
            onClick={onConfirm}
            loading={loading}
          >
            {confirmLabel}
          </Button>
        </>
      }
    >
      {children}
    </Modal>
  );
}
