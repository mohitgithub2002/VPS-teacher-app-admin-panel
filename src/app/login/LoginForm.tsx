"use client";

import { useSearchParams } from "next/navigation";
import { useState, type FormEvent } from "react";

import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Field";
import { Alert } from "@/components/ui/Primitives";
import { useLogin } from "@/lib/api/queries";
import { ApiError } from "@/lib/api/client";

export function LoginForm() {
  const params = useSearchParams();
  const login = useLogin();

  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  const next = params.get("next") ?? "/";

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    setError(null);

    if (!phone.trim() || !password) {
      setError("Enter your phone number and password.");
      return;
    }

    login.mutate(
      { phone: phone.trim(), password },
      {
        onSuccess: () => {
          // Full navigation so middleware sees the fresh session cookie.
          window.location.assign(next.startsWith("/") ? next : "/");
        },
        onError: (cause) => {
          setError(
            cause instanceof ApiError
              ? cause.message
              : "Could not sign in. Please try again.",
          );
        },
      },
    );
  };

  return (
    <form className="wk-stack-lg" onSubmit={onSubmit} noValidate>
      <div>
        <h2 className="wk-h4">Sign in</h2>
        <p className="wk-body-sm wk-text-secondary" style={{ marginTop: 4 }}>
          Administrator access only. Teacher accounts use the mobile app.
        </p>
      </div>

      {error ? <Alert tone="danger">{error}</Alert> : null}

      <div className="wk-stack">
        <Input
          label="Phone number"
          name="phone"
          type="tel"
          autoComplete="tel"
          value={phone}
          onChange={(event) => setPhone(event.target.value)}
          placeholder="9876543210"
          required
        />
        <Input
          label="Password"
          name="password"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          placeholder="••••••••"
          required
        />
      </div>

      <Button type="submit" variant="primary" block loading={login.isPending}>
        Sign in
      </Button>

      <p className="wk-caption">
        Sessions are held in an httpOnly cookie and expire automatically. If a
        request comes back unauthorised you will be returned here.
      </p>

      {!process.env.NEXT_PUBLIC_HIDE_DEMO_HINT ? (
        <p className="wk-caption">
          Demo data mode: any phone number and password will sign you in.
        </p>
      ) : null}
    </form>
  );
}
