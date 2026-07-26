"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import { ApiError } from "@/lib/api/client";
import { Icon } from "./Icon";

type ToastTone = "success" | "error" | "info";

interface Toast {
  id: number;
  tone: ToastTone;
  title: string;
  message?: string;
}

interface ToastApi {
  success: (title: string, message?: string) => void;
  error: (title: string, message?: string) => void;
  info: (title: string, message?: string) => void;
  /** Turns an API rejection into a toast, using the server's own wording. */
  fromError: (error: unknown, fallback?: string) => void;
}

const ToastContext = createContext<ToastApi | null>(null);

let sequence = 0;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const dismiss = useCallback((id: number) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const push = useCallback(
    (tone: ToastTone, title: string, message?: string) => {
      sequence += 1;
      const id = sequence;
      setToasts((current) => [...current, { id, tone, title, message }]);
      window.setTimeout(() => dismiss(id), tone === "error" ? 7000 : 4500);
    },
    [dismiss],
  );

  const api = useMemo<ToastApi>(
    () => ({
      success: (title, message) => push("success", title, message),
      error: (title, message) => push("error", title, message),
      info: (title, message) => push("info", title, message),
      fromError: (error, fallback = "Something went wrong") => {
        if (error instanceof ApiError) {
          // 401 already redirects to login; no need to shout about it.
          if (error.isAuth) return;
          push("error", error.isConflict ? "Conflict" : "Request failed", error.message);
          return;
        }
        push("error", fallback, error instanceof Error ? error.message : undefined);
      },
    }),
    [push],
  );

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div className="wk-toasts" role="status" aria-live="polite">
        {toasts.map((toast) => (
          <div key={toast.id} className={`wk-toast wk-toast--${toast.tone}`}>
            <span className="wk-toast__bar" />
            <div className="wk-grow">
              <div className="wk-toast__title">{toast.title}</div>
              {toast.message ? <div className="wk-toast__msg">{toast.message}</div> : null}
            </div>
            <button
              type="button"
              className="wk-close"
              style={{ color: "var(--wk-ink-300)", width: 28, minWidth: 28, height: 28 }}
              onClick={() => dismiss(toast.id)}
              aria-label="Dismiss"
            >
              <Icon name="close" size={14} />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastApi {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used inside <ToastProvider>");
  }
  return context;
}
