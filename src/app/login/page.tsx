import { Suspense } from "react";
import type { Metadata } from "next";

import { LoginForm } from "./LoginForm";

export const metadata: Metadata = { title: "Sign in" };

export default function LoginPage() {
  return (
    <main className="wk-auth">
      <section className="wk-auth__brand">
        <div className="wk-row">
          <span className="wk-logo" aria-hidden="true">
            W
          </span>
          <span style={{ fontWeight: 600, letterSpacing: "-0.01em" }}>Wokka Schools</span>
        </div>

        <div>
          <p className="wk-overline" style={{ color: "var(--wk-amber-400)" }}>
            Admin console · v1.0
          </p>
          <h1 className="wk-auth__headline" style={{ marginTop: "var(--wk-space-5)" }}>
            Every class,
            <br />
            <em>every chapter,</em>
            <br />
            accounted for.
          </h1>
          <p className="wk-auth__copy">
            Manage teacher accounts, build the timetable, and see exactly which
            chapters are running behind — before the term runs out.
          </p>
        </div>

        <div className="wk-auth__meta">
          <span>Teacher accounts</span>
          <span>Syllabus pacing</span>
          <span>Clash-free timetable</span>
          <span>Full audit trail</span>
        </div>
      </section>

      <section className="wk-auth__form">
        <div className="wk-auth__card">
          <Suspense fallback={null}>
            <LoginForm />
          </Suspense>
        </div>
      </section>
    </main>
  );
}
