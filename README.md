# Teacher Management — Admin Panel

Next.js admin panel for the teacher management API: teacher accounts, class
assignments, the syllabus tree, the academic calendar, a clash-checked
timetable, attendance, syllabus pacing, and a full audit trail.

Built on the **Wokka design system v1.0** — Lexend throughout, signal red for
actions, work amber for earned signals, a warm ink neutral ramp, 4pt spacing,
and a 48px minimum tap target.

---

## Getting started

```bash
npm install
npm run dev          # http://localhost:3000
```

The panel starts in **demo data mode**: a bundled in-memory dataset serves the
whole documented API surface, so every screen is usable before the real backend
is reachable. Sign in with any username and password.

Point it at the real API by setting one variable:

```bash
cp .env.example .env.local
# then in .env.local:
ADMIN_API_BASE_URL=https://your-domain.com/api/v1/admin
```

| Script | Purpose |
|---|---|
| `npm run dev` | Dev server with Turbopack |
| `npm run build` | Production build |
| `npm start` | Serve the production build |
| `npm run lint` | ESLint |
| `npx tsc --noEmit` | Type check |

---

## How it talks to the API

The API uses an **httpOnly `session` cookie**. A browser on a different origin
to the API cannot use that cookie reliably, so the panel never calls the API
directly. Instead:

```
browser ──► /api/admin/*  (same origin, Next route handler)
                │
                ├── ADMIN_API_BASE_URL set   ──► real Admin API, cookies passed both ways
                └── ADMIN_API_BASE_URL unset ──► bundled demo dataset
```

That single hop means no CORS preflights, no third-party-cookie problems, and
one place to swap the backend — `src/app/api/admin/[...path]/route.ts`.

- `src/lib/api/types.ts` — types mirroring the documented payloads exactly.
- `src/lib/api/client.ts` — one method per documented endpoint. Unwraps the
  `{ data }` / `{ error }` envelope and throws `ApiError` carrying the server's
  own message; a `401` from any endpoint returns the user to `/login`.
- `src/lib/api/queries.ts` — React Query hooks and the invalidation graph.
  Anything that moves syllabus coverage, the calendar or attendance also
  invalidates `pacing` and `dashboard`, because the API recalculates pacing on
  those writes.
- `src/middleware.ts` — edge gate: no session cookie, no admin screens.

### Error handling

Server messages are shown verbatim rather than reworded, so what an admin reads
matches what the backend actually said:

| Status | Behaviour |
|---|---|
| `400` | Inline field error, or an error toast for form-level problems |
| `401` | Redirect to `/login?next=…`, no toast |
| `404` | Empty state on the affected panel |
| `409` | "Conflict" toast with the server's text (duplicate record, timetable clash) |
| `5xx` | Error state with a retry action; up to two automatic retries |

---

## Screens

| Route | Endpoints | What it's for |
|---|---|---|
| `/` | `dashboard/overview`, `pacing/behind`, `dashboard/activity`, `calendar/effective-days` | KPIs, the behind-schedule queue, quietest teachers, teaching days left |
| `/pacing` | `pacing`, `pacing/behind`, `pacing/recalculate` | The actionable alert feed, filterable by teacher, subject and classroom |
| `/teachers` | `teachers` | Searchable directory with workload and last sign-in |
| `/teachers/[id]` | `teachers/{id}`, `assignments`, `attendance`, `sessions`, `pacing` | Profile, activate/deactivate, password reset, assignments, recent sessions |
| `/assignments` | `assignments` | Teacher × classroom × subject, create and deactivate |
| `/attendance` | `attendance` | Mark a whole day, then correct records from history |
| `/syllabus` | `subjects`, `chapters`, `subtopics` | Three-pane subject → chapter → subtopic builder with full CRUD |
| `/progress` | `dashboard/progress` | Classroom × subject completion matrix, plus a detail table |
| `/test-coverage` | `dashboard/test-coverage` | Test and revision frequency; flags never-tested chapters |
| `/unmarked` | `dashboard/unmarked` | Subtopics never completed anywhere, grouped by chapter |
| `/calendar` | `calendar`, `calendar/effective-days` | Holiday/exam/event editor and a teaching-days calculator |
| `/timetable` | `timetable`, `assignments` | Weekly grid by classroom or by teacher; clashes rejected upstream |
| `/sessions` | `sessions`, `sessions/{id}` | Cross-teacher session browser, topic detail drawer, admin delete |
| `/activity` | `dashboard/activity` | Who is logging sessions and who never has |
| `/audit-logs` | `audit-logs`, `audit-logs/{id}` | Filterable trail with a field-level before/after diff |

The one-time `temporaryPassword` from teacher creation and password reset is
shown in a dedicated dialog with a copy button and a plain warning that it will
not be shown again.

---

## Design system

Tokens are copied verbatim from `wokka-tokens.css` into
`src/styles/tokens.css`. Nothing in the app hard-codes a colour, radius, shadow
or duration — every value comes from a token.

| File | Contents |
|---|---|
| `src/styles/tokens.css` | The token layer, including the dark admin surface |
| `src/styles/base.css` | Reset, type scale (`.wk-h3`, `.wk-body-sm`, `.wk-num`…), layout primitives |
| `src/styles/components.css` | Buttons, fields, chips, badges, cards, tables, modals, toasts, meters, timetable and heat cells |
| `src/styles/shell.css` | Sidebar, topbar, page frame, auth screen, responsive behaviour |

Rules the implementation follows:

- **One red action per screen.** Red is reserved for the primary action and for
  errors, so it always means "something happens here". Destructive
  confirmations use the outlined danger variant, never a second red fill.
- **Amber for earned signals** — verification, ratings, timetabled periods.
- **Tabular figures** on money, counts, percentages, dates and IDs so columns
  align (`.wk-num`).
- **48px tap targets**, including inside dense tables.
- **Warm ink neutrals only** — no pure greys, including shadows and scrollbars.
- **Motion**: 140ms for micro-interactions, 240ms for cards and sheets, all on
  `cubic-bezier(.22, 1, .36, 1)`, and every duration collapses to `0ms` under
  `prefers-reduced-motion`.

The token file ships a dark surface set for the admin context, so the panel has
a theme toggle in the topbar; the choice is stored per browser.

### Accessibility

WCAG AA text contrast, visible focus rings on every interactive element,
`aria-current` on the active nav item, `aria-pressed` on filter chips, labelled
dialogs with focus trapping and Escape-to-close, `role="alert"` on inline field
errors, a live region for toasts, and scoped table headers. Wide content
(tables, the timetable grid) scrolls inside its own container — the page body
never scrolls sideways.

---

## Demo data mode

`src/server/mock/` implements the documented API against a deterministic
dataset: 15 teachers, 5 classes with sections, 8 subjects, 200 chapters with
subtopics, 54 assignments, a 270-slot timetable, ~45 days of session logs,
attendance, calendar events and an audit trail. It honours the response
envelope, the documented status codes, pagination, soft deletes, upsert
attendance, timetable clash detection and pacing recalculation, and it writes
audit entries for admin actions.

It is only reachable when `ADMIN_API_BASE_URL` is unset, and nothing outside
`src/server/mock/` imports it. State lives in memory, so a restart resets it.

---

## Assumptions

Documented for the backend team — each is isolated so it is cheap to correct.

1. **Auth routes.** The API documentation covers admin resources but not the
   login route. The panel calls `POST /auth/login` with `{ username, password }`,
   `POST /auth/logout` and `GET /auth/me`, all relative to the same admin base
   URL. If the deployment names them differently, only the auth block of
   `AdminApiClient` changes.
2. **Reference data.** Academic sessions, classes and classrooms are created
   outside the documented surface, so the panel reads `GET /academic-sessions`,
   `GET /classes` and `GET /classrooms`. If those return 404 it silently falls
   back to deriving the pickers from `GET /assignments`, so every screen still
   works.
3. **`daysBehind`.** `GET /pacing/behind` is documented as sorted by
   `daysBehind`, and the field is rendered when present but treated as optional.
4. **Teaching-days horizon.** The dashboard reports effective teaching days over
   the next 90 days, since the API does not expose session start and end dates.
