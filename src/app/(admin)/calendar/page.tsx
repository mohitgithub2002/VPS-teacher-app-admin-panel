"use client";

import { useEffect, useState } from "react";

import { PageHeader } from "@/components/layout/PageHeader";
import { SessionPicker } from "@/components/domain/Pickers";
import { EventTypeBadge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardBody, CardHead } from "@/components/ui/Card";
import { Input, Select, Textarea } from "@/components/ui/Field";
import { ConfirmDialog, Modal } from "@/components/ui/Modal";
import {
  Alert,
  ChipFilter,
  EmptyState,
  ErrorState,
  Skeleton,
  StatCard,
} from "@/components/ui/Primitives";
import { useToast } from "@/components/ui/Toast";
import {
  useCalendarEvents,
  useCreateCalendarEvent,
  useDeleteCalendarEvent,
  useEffectiveDays,
  useLookups,
  useUpdateCalendarEvent,
} from "@/lib/api/queries";
import {
  addDaysIso,
  daysSince,
  formatDateRange,
  toIsoDate,
  todayIso,
} from "@/lib/format";
import type { CalendarEvent, CalendarEventType } from "@/lib/api/types";

type TypeFilter = "all" | CalendarEventType;

const TYPE_FILTERS = [
  { value: "all" as const, label: "All" },
  { value: "HOLIDAY" as const, label: "Holidays" },
  { value: "EXAM" as const, label: "Exams" },
  { value: "EVENT" as const, label: "Events" },
];

interface EventForm {
  title: string;
  type: CalendarEventType;
  startDate: string;
  endDate: string;
  description: string;
}

export default function CalendarPage() {
  const toast = useToast();
  const { currentSessionId } = useLookups();

  const [sessionId, setSessionId] = useState<number | "">("");
  const [type, setType] = useState<TypeFilter>("all");
  const [editing, setEditing] = useState<CalendarEvent | null | undefined>(undefined);
  const [deleting, setDeleting] = useState<CalendarEvent | null>(null);

  // Default to the current academic session as soon as lookups resolve.
  useEffect(() => {
    if (sessionId === "" && currentSessionId) setSessionId(currentSessionId);
  }, [currentSessionId, sessionId]);

  const events = useCalendarEvents(
    sessionId === "" ? undefined : sessionId,
    type === "all" ? undefined : { type },
  );

  const create = useCreateCalendarEvent();
  const update = useUpdateCalendarEvent();
  const remove = useDeleteCalendarEvent();

  const rows = events.data ?? [];
  const upcoming = rows.filter((event) => (daysSince(event.endDate) ?? 0) <= 0);
  const past = rows.filter((event) => (daysSince(event.endDate) ?? 0) > 0);

  const nonTeachingDays = rows.reduce((sum, event) => {
    const start = new Date(event.startDate).getTime();
    const end = new Date(event.endDate).getTime();
    if (Number.isNaN(start) || Number.isNaN(end)) return sum;
    return sum + Math.floor((end - start) / 86_400_000) + 1;
  }, 0);

  const onDelete = () => {
    if (!deleting) return;
    remove.mutate(deleting.id, {
      onSuccess: () => {
        toast.success("Event deleted", "Pacing has been recalculated for the session.");
        setDeleting(null);
      },
      onError: (error) => toast.fromError(error, "Could not delete the event"),
    });
  };

  return (
    <main className="wk-page wk-page--wide">
      <PageHeader
        title="Academic calendar"
        lede="Holidays, exam blocks and school events. Every entry removes teaching days, so pacing recalculates whenever this list changes."
        actions={
          <Button
            variant="primary"
            icon="plus"
            onClick={() => setEditing(null)}
            disabled={sessionId === ""}
          >
            Add event
          </Button>
        }
      />

      <div className="wk-toolbar">
        <SessionPicker
          value={sessionId}
          onChange={setSessionId}
          className="wk-toolbar__field"
          required
        />
        <div style={{ alignSelf: "flex-end", paddingBottom: 2 }}>
          <ChipFilter
            options={TYPE_FILTERS}
            value={type}
            onChange={setType}
            label="Filter by event type"
          />
        </div>
      </div>

      <div className="wk-stats" style={{ marginBottom: "var(--wk-space-6)" }}>
        <StatCard
          label="Calendar entries"
          value={events.isLoading ? "—" : rows.length}
          meta="In the selected session"
          icon="calendar"
        />
        <StatCard
          label="Non-teaching days"
          value={events.isLoading ? "—" : nonTeachingDays}
          meta="Total days covered by these entries"
          icon="clock"
          tone="accent"
        />
        <EffectiveDaysCard />
      </div>

      {events.isError ? (
        <Card>
          <ErrorState error={events.error} onRetry={() => events.refetch()} />
        </Card>
      ) : (
        <div className="wk-cols">
          <EventList
            title="Upcoming and current"
            subtitle="Entries that still affect the rest of the session"
            loading={events.isLoading}
            events={upcoming}
            emptyTitle="Nothing scheduled ahead"
            emptyBody="Add the holidays and exam blocks you already know about so pacing stays honest."
            onEdit={setEditing}
            onDelete={setDeleting}
          />
          <EventList
            title="Past"
            subtitle="Already elapsed"
            loading={events.isLoading}
            events={past}
            emptyTitle="No past entries"
            emptyBody="Anything that has finished shows up here."
            onEdit={setEditing}
            onDelete={setDeleting}
          />
        </div>
      )}

      <EventModal
        open={editing !== undefined}
        event={editing ?? null}
        loading={create.isPending || update.isPending}
        onClose={() => setEditing(undefined)}
        onSubmit={(form, close) => {
          if (editing) {
            update.mutate(
              {
                id: editing.id,
                data: {
                  title: form.title.trim(),
                  type: form.type,
                  startDate: form.startDate,
                  endDate: form.endDate,
                  description: form.description.trim() ? form.description.trim() : null,
                },
              },
              {
                onSuccess: () => {
                  toast.success("Event updated", form.title.trim());
                  close();
                },
                onError: (error) => toast.fromError(error, "Could not update the event"),
              },
            );
            return;
          }

          if (sessionId === "") return;
          create.mutate(
            {
              sessionId,
              title: form.title.trim(),
              type: form.type,
              startDate: form.startDate,
              endDate: form.endDate,
              ...(form.description.trim() ? { description: form.description.trim() } : {}),
            },
            {
              onSuccess: () => {
                toast.success("Event added", "Pacing recalculated for the session.");
                close();
              },
              onError: (error) => toast.fromError(error, "Could not add the event"),
            },
          );
        }}
      />

      <ConfirmDialog
        open={deleting !== null}
        onClose={() => setDeleting(null)}
        onConfirm={onDelete}
        loading={remove.isPending}
        destructive
        title="Delete this calendar event?"
        description={
          deleting
            ? `"${deleting.title}" is permanently removed — calendar events are hard-deleted. The days become teaching days again and pacing recalculates.`
            : undefined
        }
        confirmLabel="Delete event"
      />
    </main>
  );
}

function EventList({
  title,
  subtitle,
  loading,
  events,
  emptyTitle,
  emptyBody,
  onEdit,
  onDelete,
}: {
  title: string;
  subtitle: string;
  loading: boolean;
  events: CalendarEvent[];
  emptyTitle: string;
  emptyBody: string;
  onEdit: (event: CalendarEvent) => void;
  onDelete: (event: CalendarEvent) => void;
}) {
  return (
    <Card>
      <CardHead title={title} subtitle={subtitle} />
      <CardBody padding="flush">
        {loading ? (
          <div className="wk-stack" style={{ padding: "var(--wk-space-5)" }}>
            {Array.from({ length: 3 }).map((_, index) => (
              <Skeleton key={index} height={48} radius="var(--wk-radius-sm)" />
            ))}
          </div>
        ) : events.length === 0 ? (
          <EmptyState icon="calendar" title={emptyTitle} body={emptyBody} />
        ) : (
          <ul>
            {events.map((event) => (
              <li
                key={event.id}
                className="wk-spread"
                style={{
                  padding: "var(--wk-space-4) var(--wk-space-6)",
                  borderBottom: "1px solid var(--wk-border-subtle)",
                }}
              >
                <div style={{ minWidth: 0 }}>
                  <div className="wk-row" style={{ gap: 10 }}>
                    <span style={{ fontWeight: 600 }} className="wk-truncate">
                      {event.title}
                    </span>
                    <EventTypeBadge type={event.type} />
                  </div>
                  <div className="wk-body-sm wk-text-secondary wk-num">
                    {formatDateRange(event.startDate, event.endDate)}
                  </div>
                  {event.description ? (
                    <div className="wk-caption">{event.description}</div>
                  ) : null}
                </div>
                <div className="wk-row" style={{ flex: "none" }}>
                  <Button
                    variant="ghost"
                    size="sm"
                    icon="edit"
                    iconOnly
                    aria-label={`Edit ${event.title}`}
                    onClick={() => onEdit(event)}
                  />
                  <Button
                    variant="ghost"
                    size="sm"
                    icon="trash"
                    iconOnly
                    aria-label={`Delete ${event.title}`}
                    onClick={() => onDelete(event)}
                  />
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardBody>
    </Card>
  );
}

/** Ad-hoc "how many teaching days between these dates" calculator. */
function EffectiveDaysCard() {
  const [from, setFrom] = useState(todayIso());
  const [to, setTo] = useState(addDaysIso(todayIso(), 60));
  const valid = Boolean(from && to && from <= to);
  const result = useEffectiveDays(from, to, { enabled: valid });

  return (
    <article className="wk-stat">
      <div className="wk-stat__top">
        <span className="wk-stat__label">Effective teaching days</span>
      </div>
      <div className="wk-stat__value">
        {!valid ? "—" : result.isLoading ? "…" : (result.data?.effectiveDays ?? "—")}
      </div>
      <div className="wk-row" style={{ gap: 8 }}>
        <input
          type="date"
          className="wk-input"
          style={{ padding: "8px 10px", minHeight: 40, fontSize: 13 }}
          value={from}
          max={to}
          onChange={(event) => setFrom(event.target.value)}
          aria-label="Range start"
        />
        <input
          type="date"
          className="wk-input"
          style={{ padding: "8px 10px", minHeight: 40, fontSize: 13 }}
          value={to}
          min={from}
          onChange={(event) => setTo(event.target.value)}
          aria-label="Range end"
        />
      </div>
      <p className="wk-caption">Sundays, holidays and exam blocks removed.</p>
    </article>
  );
}

function EventModal({
  open,
  event,
  loading,
  onClose,
  onSubmit,
}: {
  open: boolean;
  event: CalendarEvent | null;
  loading: boolean;
  onClose: () => void;
  onSubmit: (form: EventForm, close: () => void) => void;
}) {
  const [form, setForm] = useState<EventForm>({
    title: "",
    type: "HOLIDAY",
    startDate: todayIso(),
    endDate: todayIso(),
    description: "",
  });
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setError(null);
    setForm(
      event
        ? {
            title: event.title,
            type: event.type,
            startDate: toIsoDate(event.startDate),
            endDate: toIsoDate(event.endDate),
            description: event.description ?? "",
          }
        : {
            title: "",
            type: "HOLIDAY",
            startDate: todayIso(),
            endDate: todayIso(),
            description: "",
          },
    );
  }, [open, event]);

  const set = <K extends keyof EventForm>(key: K, value: EventForm[K]) =>
    setForm((current) => ({ ...current, [key]: value }));

  const submit = () => {
    if (!form.title.trim()) {
      setError("Give the event a title.");
      return;
    }
    if (!form.startDate || !form.endDate) {
      setError("Both dates are required.");
      return;
    }
    if (form.endDate < form.startDate) {
      setError("The end date cannot be before the start date.");
      return;
    }
    setError(null);
    onSubmit(form, onClose);
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={event ? "Edit calendar event" : "Add calendar event"}
      description="End dates are inclusive. Holidays, exams and events all count as non-teaching days."
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button variant="primary" onClick={submit} loading={loading}>
            {event ? "Save changes" : "Add event"}
          </Button>
        </>
      }
    >
      <div className="wk-stack">
        {error ? <Alert tone="danger">{error}</Alert> : null}

        <Input
          label="Title"
          required
          value={form.title}
          onChange={(e) => set("title", e.target.value)}
          placeholder="Diwali Break"
        />

        <Select
          label="Type"
          required
          value={form.type}
          onChange={(e) => set("type", e.target.value as CalendarEventType)}
        >
          <option value="HOLIDAY">Holiday — school closed</option>
          <option value="EXAM">Exam block</option>
          <option value="EVENT">School event</option>
        </Select>

        <div className="wk-row" style={{ gap: "var(--wk-space-4)", alignItems: "flex-start" }}>
          <Input
            label="Start date"
            type="date"
            required
            value={form.startDate}
            max={form.endDate}
            onChange={(e) => set("startDate", e.target.value)}
            fieldClassName="wk-grow"
          />
          <Input
            label="End date"
            type="date"
            required
            value={form.endDate}
            min={form.startDate}
            onChange={(e) => set("endDate", e.target.value)}
            fieldClassName="wk-grow"
          />
        </div>

        <Textarea
          label="Description"
          value={form.description}
          onChange={(e) => set("description", e.target.value)}
          placeholder="Optional note for other admins"
        />
      </div>
    </Modal>
  );
}
