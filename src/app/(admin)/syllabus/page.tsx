"use client";

import { useEffect, useState } from "react";

import { ClassPicker } from "@/components/domain/Pickers";
import { PageHeader } from "@/components/layout/PageHeader";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardBody, CardHead } from "@/components/ui/Card";
import { Input } from "@/components/ui/Field";
import { Icon } from "@/components/ui/Icon";
import { ConfirmDialog, Modal } from "@/components/ui/Modal";
import {
  Alert,
  EmptyState,
  ErrorState,
  Skeleton,
} from "@/components/ui/Primitives";
import { useToast } from "@/components/ui/Toast";
import {
  useChapters,
  useCreateChapter,
  useCreateSubject,
  useCreateSubtopic,
  useCreateTopic,
  useDeleteChapter,
  useDeleteSubject,
  useDeleteSubtopic,
  useDeleteTopic,
  useSubjects,
  useSubtopics,
  useTopics,
  useUpdateChapter,
  useUpdateSubject,
  useUpdateSubtopic,
  useUpdateTopic,
} from "@/lib/api/queries";
import { pluralise } from "@/lib/format";
import type { Chapter, Subject, Subtopic, Topic } from "@/lib/api/types";

type Editing =
  | { level: "subject"; record: Subject | null }
  | { level: "chapter"; record: Chapter | null }
  | { level: "topic"; record: Topic | null }
  | { level: "subtopic"; record: Subtopic | null }
  | null;

type Deleting =
  | { level: "subject"; id: number; name: string }
  | { level: "chapter"; id: number; name: string }
  | { level: "topic"; id: number; name: string }
  | { level: "subtopic"; id: number; name: string }
  | null;

export default function SyllabusPage() {
  const toast = useToast();

  const [classId, setClassId] = useState<number | "">("");
  const [subjectId, setSubjectId] = useState<number | null>(null);
  const [chapterId, setChapterId] = useState<number | null>(null);
  const [topicId, setTopicId] = useState<number | null>(null);
  const [editing, setEditing] = useState<Editing>(null);
  const [deleting, setDeleting] = useState<Deleting>(null);

  const subjects = useSubjects("all");
  const chapters = useChapters(
    {
      active: "all",
      ...(subjectId ? { subjectId } : {}),
      ...(classId === "" ? {} : { classId }),
    },
    { enabled: subjectId !== null && classId !== "" },
  );
  const topics = useTopics(chapterId ?? undefined);
  const subtopics = useSubtopics(topicId ?? undefined);

  const createSubject = useCreateSubject();
  const updateSubject = useUpdateSubject();
  const deleteSubject = useDeleteSubject();
  const createChapter = useCreateChapter();
  const updateChapter = useUpdateChapter();
  const deleteChapter = useDeleteChapter();
  const createTopic = useCreateTopic();
  const updateTopic = useUpdateTopic();
  const deleteTopic = useDeleteTopic();
  const createSubtopic = useCreateSubtopic();
  const updateSubtopic = useUpdateSubtopic();
  const deleteSubtopic = useDeleteSubtopic();

  // Selecting a different subject or class invalidates the chapter selection,
  // and a different chapter invalidates the topic below it.
  useEffect(() => setChapterId(null), [subjectId, classId]);
  useEffect(() => setTopicId(null), [chapterId]);

  const selectedSubject = subjects.data?.find((s) => s.id === subjectId) ?? null;
  const selectedChapter = chapters.data?.find((c) => c.id === chapterId) ?? null;
  const selectedTopic = topics.data?.find((t) => t.id === topicId) ?? null;
  const chapterRows = chapters.data ?? [];
  const topicRows = topics.data ?? [];
  const subtopicRows = subtopics.data ?? [];

  const nextOrder = (rows: { displayOrder: number }[]) =>
    rows.reduce((max, row) => Math.max(max, row.displayOrder), 0) + 1;

  const onDelete = () => {
    if (!deleting) return;
    const done = (label: string) => {
      toast.success(label, `${deleting.name} is now inactive.`);
      setDeleting(null);
    };
    const fail = (error: unknown) => toast.fromError(error, "Could not deactivate");

    if (deleting.level === "subject") {
      deleteSubject.mutate(deleting.id, {
        onSuccess: () => {
          done("Subject deactivated");
          if (subjectId === deleting.id) setSubjectId(null);
        },
        onError: fail,
      });
    } else if (deleting.level === "chapter") {
      deleteChapter.mutate(deleting.id, {
        onSuccess: () => {
          done("Chapter deactivated");
          if (chapterId === deleting.id) setChapterId(null);
        },
        onError: fail,
      });
    } else if (deleting.level === "topic") {
      deleteTopic.mutate(deleting.id, {
        onSuccess: () => {
          done("Topic deactivated");
          if (topicId === deleting.id) setTopicId(null);
        },
        onError: fail,
      });
    } else {
      deleteSubtopic.mutate(deleting.id, {
        onSuccess: () => done("Subtopic deactivated"),
        onError: fail,
      });
    }
  };

  const deletePending =
    deleteSubject.isPending ||
    deleteChapter.isPending ||
    deleteTopic.isPending ||
    deleteSubtopic.isPending;

  return (
    <main className="wk-page wk-page--wide">
      <PageHeader
        title="Syllabus builder"
        lede="Subjects hold chapters, chapters hold topics, topics hold subtopics. Chapters are scoped to a subject and a class, so pick both."
        actions={
          <Button
            variant="primary"
            icon="plus"
            onClick={() => setEditing({ level: "subject", record: null })}
          >
            Add subject
          </Button>
        }
      />

      <div className="wk-toolbar">
        <ClassPicker
          value={classId}
          onChange={setClassId}
          className="wk-toolbar__field"
          allLabel="Choose a class"
        />
        {classId === "" ? (
          <p className="wk-body-sm wk-text-secondary" style={{ alignSelf: "center" }}>
            Chapters, topics and subtopics appear once a class is selected.
          </p>
        ) : null}
      </div>

      <div className="wk-syllabus">
        {/* ── Subjects ─────────────────────────────────────────────────── */}
        <Card>
          <CardHead
            title="Subjects"
            subtitle={
              subjects.data ? pluralise(subjects.data.length, "subject") : "Loading"
            }
          />
          <CardBody padding="flush">
            {subjects.isLoading ? (
              <div className="wk-stack-sm" style={{ padding: "var(--wk-space-4)" }}>
                {Array.from({ length: 6 }).map((_, index) => (
                  <Skeleton key={index} height={28} />
                ))}
              </div>
            ) : subjects.isError ? (
              <ErrorState error={subjects.error} onRetry={() => subjects.refetch()} />
            ) : (subjects.data ?? []).length === 0 ? (
              <EmptyState
                icon="layers"
                title="No subjects"
                body="Create the first subject to start building the syllabus."
              />
            ) : (
              <div className="wk-picklist" role="listbox" aria-label="Subjects">
                {subjects.data!.map((subject) => (
                  <button
                    key={subject.id}
                    type="button"
                    role="option"
                    className="wk-pick"
                    aria-selected={subject.id === subjectId}
                    onClick={() => setSubjectId(subject.id)}
                    title={subject.name}
                  >
                    <span className="wk-truncate">{subject.name}</span>
                    <span className="wk-pick__meta">
                      {subject.code ? <span>{subject.code}</span> : null}
                      {!subject.isActive ? <Badge tone="neutral">Inactive</Badge> : null}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </CardBody>
          {selectedSubject ? (
            <div className="wk-card__foot" style={{ justifyContent: "space-between" }}>
              <span className="wk-caption wk-truncate wk-grow">{selectedSubject.name}</span>
              <div className="wk-row">
                <Button
                  variant="ghost"
                  size="sm"
                  icon="edit"
                  onClick={() => setEditing({ level: "subject", record: selectedSubject })}
                >
                  Edit
                </Button>
                {selectedSubject.isActive ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    icon="trash"
                    onClick={() =>
                      setDeleting({
                        level: "subject",
                        id: selectedSubject.id,
                        name: selectedSubject.name,
                      })
                    }
                  >
                    Deactivate
                  </Button>
                ) : (
                  <Button
                    variant="ghost"
                    size="sm"
                    icon="refresh"
                    onClick={() =>
                      updateSubject.mutate(
                        { id: selectedSubject.id, data: { isActive: true } },
                        {
                          onSuccess: () => toast.success("Subject reactivated"),
                          onError: (error) => toast.fromError(error),
                        },
                      )
                    }
                  >
                    Reactivate
                  </Button>
                )}
              </div>
            </div>
          ) : null}
        </Card>

        {/* ── Chapters ─────────────────────────────────────────────────── */}
        <Card>
          <CardHead
            title="Chapters"
            subtitle={
              selectedSubject && classId !== ""
                ? `${selectedSubject.name} · ${chapterRows.length} chapters`
                : "Pick a subject and a class"
            }
            actions={
              selectedSubject && classId !== "" ? (
                <Button
                  size="sm"
                  icon="plus"
                  onClick={() => setEditing({ level: "chapter", record: null })}
                >
                  Add
                </Button>
              ) : null
            }
          />
          <CardBody padding="flush">
            {!selectedSubject || classId === "" ? (
              <EmptyState
                icon="book"
                title="Choose a subject and class"
                body="Chapters belong to a subject–class pair, which is how the syllabus differs per year group."
              />
            ) : chapters.isLoading ? (
              <div className="wk-stack-sm" style={{ padding: "var(--wk-space-4)" }}>
                {Array.from({ length: 5 }).map((_, index) => (
                  <Skeleton key={index} height={28} />
                ))}
              </div>
            ) : chapters.isError ? (
              <ErrorState error={chapters.error} onRetry={() => chapters.refetch()} />
            ) : chapterRows.length === 0 ? (
              <EmptyState
                icon="book"
                title="No chapters here yet"
                body="Add the first chapter for this subject and class."
                action={
                  <Button
                    size="sm"
                    icon="plus"
                    onClick={() => setEditing({ level: "chapter", record: null })}
                  >
                    Add chapter
                  </Button>
                }
              />
            ) : (
              <div className="wk-picklist" role="listbox" aria-label="Chapters">
                {chapterRows.map((chapter) => (
                  <button
                    key={chapter.id}
                    type="button"
                    role="option"
                    className="wk-pick"
                    aria-selected={chapter.id === chapterId}
                    onClick={() => setChapterId(chapter.id)}
                    title={chapter.name}
                  >
                    <span className="wk-pick__order">{chapter.displayOrder}</span>
                    <span className="wk-truncate">{chapter.name}</span>
                    <span className="wk-pick__meta">
                      {chapter.periodsRequired ? (
                        <span>{chapter.periodsRequired}p</span>
                      ) : null}
                      <span>{chapter._count?.topics ?? 0} tp</span>
                      {!chapter.isActive ? <Badge tone="neutral">Inactive</Badge> : null}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </CardBody>
          {selectedChapter ? (
            <div className="wk-card__foot" style={{ justifyContent: "space-between" }}>
              <span className="wk-caption wk-truncate wk-grow">{selectedChapter.name}</span>
              <div className="wk-row">
                <Button
                  variant="ghost"
                  size="sm"
                  icon="edit"
                  onClick={() => setEditing({ level: "chapter", record: selectedChapter })}
                >
                  Edit
                </Button>
                {selectedChapter.isActive ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    icon="trash"
                    onClick={() =>
                      setDeleting({
                        level: "chapter",
                        id: selectedChapter.id,
                        name: selectedChapter.name,
                      })
                    }
                  >
                    Deactivate
                  </Button>
                ) : (
                  <Button
                    variant="ghost"
                    size="sm"
                    icon="refresh"
                    onClick={() =>
                      updateChapter.mutate(
                        { id: selectedChapter.id, data: { isActive: true } },
                        {
                          onSuccess: () => toast.success("Chapter reactivated"),
                          onError: (error) => toast.fromError(error),
                        },
                      )
                    }
                  >
                    Reactivate
                  </Button>
                )}
              </div>
            </div>
          ) : null}
        </Card>

        {/* ── Topics ───────────────────────────────────────────────────── */}
        <Card>
          <CardHead
            title="Topics"
            subtitle={
              selectedChapter
                ? `${selectedChapter.name} · ${topicRows.length} topics`
                : "Pick a chapter"
            }
            actions={
              selectedChapter ? (
                <Button
                  size="sm"
                  icon="plus"
                  onClick={() => setEditing({ level: "topic", record: null })}
                >
                  Add
                </Button>
              ) : null
            }
          />
          <CardBody padding="flush">
            {!selectedChapter ? (
              <EmptyState
                icon="layers"
                title="Choose a chapter"
                body="Topics group the subtopics inside a chapter — pick a chapter to see or add them."
              />
            ) : topics.isLoading ? (
              <div className="wk-stack-sm" style={{ padding: "var(--wk-space-4)" }}>
                {Array.from({ length: 4 }).map((_, index) => (
                  <Skeleton key={index} height={28} />
                ))}
              </div>
            ) : topics.isError ? (
              <ErrorState error={topics.error} onRetry={() => topics.refetch()} />
            ) : topicRows.length === 0 ? (
              <EmptyState
                icon="layers"
                title="No topics here yet"
                body="Subtopics live under a topic, so add the first topic before adding subtopics."
                action={
                  <Button
                    size="sm"
                    icon="plus"
                    onClick={() => setEditing({ level: "topic", record: null })}
                  >
                    Add topic
                  </Button>
                }
              />
            ) : (
              <div className="wk-picklist" role="listbox" aria-label="Topics">
                {topicRows.map((topic) => (
                  <button
                    key={topic.id}
                    type="button"
                    role="option"
                    className="wk-pick"
                    aria-selected={topic.id === topicId}
                    onClick={() => setTopicId(topic.id)}
                    title={topic.name}
                  >
                    <span className="wk-pick__order">{topic.displayOrder}</span>
                    <span className="wk-truncate">{topic.name}</span>
                    <span className="wk-pick__meta">
                      <span>{topic._count?.subtopics ?? 0} st</span>
                      {!topic.isActive ? <Badge tone="neutral">Inactive</Badge> : null}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </CardBody>
          {selectedTopic ? (
            <div className="wk-card__foot" style={{ justifyContent: "space-between" }}>
              <span className="wk-caption wk-truncate wk-grow">{selectedTopic.name}</span>
              <div className="wk-row">
                <Button
                  variant="ghost"
                  size="sm"
                  icon="edit"
                  onClick={() => setEditing({ level: "topic", record: selectedTopic })}
                >
                  Edit
                </Button>
                {selectedTopic.isActive ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    icon="trash"
                    onClick={() =>
                      setDeleting({
                        level: "topic",
                        id: selectedTopic.id,
                        name: selectedTopic.name,
                      })
                    }
                  >
                    Deactivate
                  </Button>
                ) : (
                  <Button
                    variant="ghost"
                    size="sm"
                    icon="refresh"
                    onClick={() =>
                      updateTopic.mutate(
                        { id: selectedTopic.id, data: { isActive: true } },
                        {
                          onSuccess: () => toast.success("Topic reactivated"),
                          onError: (error) => toast.fromError(error),
                        },
                      )
                    }
                  >
                    Reactivate
                  </Button>
                )}
              </div>
            </div>
          ) : null}
        </Card>

        {/* ── Subtopics ────────────────────────────────────────────────── */}
        <Card>
          <CardHead
            title="Subtopics"
            subtitle={
              selectedTopic
                ? `${selectedTopic.name} · ${subtopicRows.length} subtopics`
                : "Pick a topic"
            }
            actions={
              selectedTopic ? (
                <Button
                  size="sm"
                  icon="plus"
                  onClick={() => setEditing({ level: "subtopic", record: null })}
                >
                  Add
                </Button>
              ) : null
            }
          />
          <CardBody padding="flush">
            {!selectedTopic ? (
              <EmptyState
                icon="list"
                title="Choose a topic"
                body="Subtopics are what teachers tick off in a session, so they drive completion percentages."
              />
            ) : subtopics.isLoading ? (
              <div className="wk-stack-sm" style={{ padding: "var(--wk-space-4)" }}>
                {Array.from({ length: 4 }).map((_, index) => (
                  <Skeleton key={index} height={28} />
                ))}
              </div>
            ) : subtopics.isError ? (
              <ErrorState error={subtopics.error} onRetry={() => subtopics.refetch()} />
            ) : subtopicRows.length === 0 ? (
              <EmptyState
                icon="list"
                title="No subtopics"
                body="A topic with no subtopics can only be marked complete in bulk."
                action={
                  <Button
                    size="sm"
                    icon="plus"
                    onClick={() => setEditing({ level: "subtopic", record: null })}
                  >
                    Add subtopic
                  </Button>
                }
              />
            ) : (
              <ul className="wk-picklist">
                {subtopicRows.map((subtopic) => (
                  <li
                    key={subtopic.id}
                    className="wk-pick"
                    style={{ cursor: "default" }}
                    title={subtopic.name}
                  >
                    <span className="wk-pick__order">{subtopic.displayOrder}</span>
                    <span className="wk-truncate">{subtopic.name}</span>
                    <span className="wk-pick__meta">
                      {!subtopic.isActive ? <Badge tone="neutral">Inactive</Badge> : null}
                      <button
                        type="button"
                        className="wk-close"
                        style={{ width: 32, minWidth: 32, height: 32 }}
                        aria-label={`Edit ${subtopic.name}`}
                        onClick={() => setEditing({ level: "subtopic", record: subtopic })}
                      >
                        <Icon name="edit" size={15} />
                      </button>
                      <button
                        type="button"
                        className="wk-close"
                        style={{ width: 32, minWidth: 32, height: 32 }}
                        aria-label={`Deactivate ${subtopic.name}`}
                        onClick={() =>
                          setDeleting({
                            level: "subtopic",
                            id: subtopic.id,
                            name: subtopic.name,
                          })
                        }
                      >
                        <Icon name="trash" size={15} />
                      </button>
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardBody>
        </Card>
      </div>

      {/* ── Subject form ─────────────────────────────────────────────────── */}
      <EntityModal
        open={editing?.level === "subject"}
        onClose={() => setEditing(null)}
        title={editing?.level === "subject" && editing.record ? "Edit subject" : "Add subject"}
        description="Subjects are shared across every class. The code is a short label used in tight columns."
        fields={[
          { key: "name", label: "Subject name", required: true, placeholder: "Mathematics" },
          { key: "code", label: "Code", placeholder: "MATH" },
          { key: "displayOrder", label: "Display order", type: "number" },
        ]}
        initial={
          editing?.level === "subject" && editing.record
            ? {
                name: editing.record.name,
                code: editing.record.code ?? "",
                displayOrder: String(editing.record.displayOrder),
              }
            : { name: "", code: "", displayOrder: String(nextOrder(subjects.data ?? [])) }
        }
        loading={createSubject.isPending || updateSubject.isPending}
        onSubmit={(values, close) => {
          const payload = {
            name: values.name.trim(),
            code: values.code.trim() ? values.code.trim() : null,
            displayOrder: Number(values.displayOrder) || 0,
          };
          if (editing?.level === "subject" && editing.record) {
            updateSubject.mutate(
              { id: editing.record.id, data: payload },
              {
                onSuccess: () => {
                  toast.success("Subject updated", payload.name);
                  close();
                },
                onError: (error) => toast.fromError(error, "Could not update the subject"),
              },
            );
          } else {
            createSubject.mutate(
              {
                name: payload.name,
                ...(payload.code ? { code: payload.code } : {}),
                displayOrder: payload.displayOrder,
              },
              {
                onSuccess: (subject) => {
                  toast.success("Subject created", subject.name);
                  setSubjectId(subject.id);
                  close();
                },
                onError: (error) => toast.fromError(error, "Could not create the subject"),
              },
            );
          }
        }}
      />

      {/* ── Chapter form ─────────────────────────────────────────────────── */}
      <EntityModal
        open={editing?.level === "chapter"}
        onClose={() => setEditing(null)}
        title={editing?.level === "chapter" && editing.record ? "Edit chapter" : "Add chapter"}
        description={
          selectedSubject && classId !== ""
            ? `${selectedSubject.name} · class scoped. Periods required feeds the pacing calculation.`
            : undefined
        }
        fields={[
          { key: "name", label: "Chapter name", required: true, placeholder: "Linear Equations" },
          { key: "displayOrder", label: "Display order", type: "number" },
          {
            key: "periodsRequired",
            label: "Periods required",
            type: "number",
            hint: "Estimated teaching periods. Leave empty if unknown.",
          },
        ]}
        initial={
          editing?.level === "chapter" && editing.record
            ? {
                name: editing.record.name,
                displayOrder: String(editing.record.displayOrder),
                periodsRequired:
                  editing.record.periodsRequired === null
                    ? ""
                    : String(editing.record.periodsRequired),
              }
            : {
                name: "",
                displayOrder: String(nextOrder(chapterRows)),
                periodsRequired: "",
              }
        }
        loading={createChapter.isPending || updateChapter.isPending}
        onSubmit={(values, close) => {
          const name = values.name.trim();
          const displayOrder = Number(values.displayOrder) || 0;
          const periodsRequired =
            values.periodsRequired.trim() === "" ? null : Number(values.periodsRequired);

          if (editing?.level === "chapter" && editing.record) {
            updateChapter.mutate(
              { id: editing.record.id, data: { name, displayOrder, periodsRequired } },
              {
                onSuccess: () => {
                  toast.success("Chapter updated", name);
                  close();
                },
                onError: (error) => toast.fromError(error, "Could not update the chapter"),
              },
            );
          } else if (selectedSubject && classId !== "") {
            createChapter.mutate(
              {
                subjectId: selectedSubject.id,
                classId,
                name,
                displayOrder,
                ...(periodsRequired === null ? {} : { periodsRequired }),
              },
              {
                onSuccess: (chapter) => {
                  toast.success("Chapter created", chapter.name);
                  setChapterId(chapter.id);
                  close();
                },
                onError: (error) => toast.fromError(error, "Could not create the chapter"),
              },
            );
          }
        }}
      />

      {/* ── Topic form ───────────────────────────────────────────────────── */}
      <EntityModal
        open={editing?.level === "topic"}
        onClose={() => setEditing(null)}
        title={editing?.level === "topic" && editing.record ? "Edit topic" : "Add topic"}
        description={
          selectedChapter
            ? `Inside ${selectedChapter.name}. Topics group the subtopics of a chapter.`
            : undefined
        }
        fields={[
          { key: "name", label: "Topic name", required: true, placeholder: "Kinematics" },
          { key: "displayOrder", label: "Display order", type: "number" },
        ]}
        initial={
          editing?.level === "topic" && editing.record
            ? {
                name: editing.record.name,
                displayOrder: String(editing.record.displayOrder),
              }
            : { name: "", displayOrder: String(nextOrder(topicRows)) }
        }
        loading={createTopic.isPending || updateTopic.isPending}
        onSubmit={(values, close) => {
          const name = values.name.trim();
          const displayOrder = Number(values.displayOrder) || 0;

          if (editing?.level === "topic" && editing.record) {
            updateTopic.mutate(
              { id: editing.record.id, data: { name, displayOrder } },
              {
                onSuccess: () => {
                  toast.success("Topic updated", name);
                  close();
                },
                onError: (error) => toast.fromError(error, "Could not update the topic"),
              },
            );
          } else if (selectedChapter) {
            createTopic.mutate(
              { chapterId: selectedChapter.id, name, displayOrder },
              {
                onSuccess: (topic) => {
                  toast.success("Topic created", topic.name);
                  setTopicId(topic.id);
                  close();
                },
                onError: (error) => toast.fromError(error, "Could not create the topic"),
              },
            );
          }
        }}
      />

      {/* ── Subtopic form ────────────────────────────────────────────────── */}
      <EntityModal
        open={editing?.level === "subtopic"}
        onClose={() => setEditing(null)}
        title={
          editing?.level === "subtopic" && editing.record ? "Edit subtopic" : "Add subtopic"
        }
        description={
          selectedTopic && selectedChapter
            ? `Inside ${selectedChapter.name} › ${selectedTopic.name}`
            : undefined
        }
        fields={[
          { key: "name", label: "Subtopic name", required: true, placeholder: "Quadratic Equations" },
          { key: "displayOrder", label: "Display order", type: "number" },
        ]}
        initial={
          editing?.level === "subtopic" && editing.record
            ? {
                name: editing.record.name,
                displayOrder: String(editing.record.displayOrder),
              }
            : { name: "", displayOrder: String(nextOrder(subtopicRows)) }
        }
        loading={createSubtopic.isPending || updateSubtopic.isPending}
        onSubmit={(values, close) => {
          const name = values.name.trim();
          const displayOrder = Number(values.displayOrder) || 0;

          if (editing?.level === "subtopic" && editing.record) {
            updateSubtopic.mutate(
              { id: editing.record.id, data: { name, displayOrder } },
              {
                onSuccess: () => {
                  toast.success("Subtopic updated", name);
                  close();
                },
                onError: (error) => toast.fromError(error, "Could not update the subtopic"),
              },
            );
          } else if (selectedTopic) {
            createSubtopic.mutate(
              { topicId: selectedTopic.id, name, displayOrder },
              {
                onSuccess: () => {
                  toast.success("Subtopic created", name);
                  close();
                },
                onError: (error) => toast.fromError(error, "Could not create the subtopic"),
              },
            );
          }
        }}
      />

      <ConfirmDialog
        open={deleting !== null}
        onClose={() => setDeleting(null)}
        onConfirm={onDelete}
        loading={deletePending}
        destructive
        title="Deactivate this record?"
        description={
          deleting
            ? `${deleting.name} is soft-deleted — it stays in the database and existing history keeps working. You can reactivate it later.`
            : undefined
        }
        confirmLabel="Deactivate"
      >
        <Alert tone="info">
          Deactivating a {deleting?.level ?? "record"} hides it from active lists and
          recalculates pacing where relevant.
        </Alert>
      </ConfirmDialog>
    </main>
  );
}

/* ── A tiny declarative form modal, shared by the three syllabus levels ──── */

interface FieldSpec {
  key: string;
  label: string;
  placeholder?: string;
  hint?: string;
  required?: boolean;
  type?: "text" | "number";
}

function EntityModal({
  open,
  onClose,
  title,
  description,
  fields,
  initial,
  loading,
  onSubmit,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  fields: FieldSpec[];
  initial: Record<string, string>;
  loading?: boolean;
  onSubmit: (values: Record<string, string>, close: () => void) => void;
}) {
  const [values, setValues] = useState<Record<string, string>>(initial);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setValues(initial);
      setError(null);
    }
    // `initial` is derived from the record being edited, which only changes
    // when the modal is (re)opened.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const submit = () => {
    const missing = fields.find(
      (field) => field.required && !(values[field.key] ?? "").trim(),
    );
    if (missing) {
      setError(`${missing.label} is required.`);
      return;
    }
    setError(null);
    onSubmit(values, onClose);
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      description={description}
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button variant="primary" onClick={submit} loading={loading}>
            Save
          </Button>
        </>
      }
    >
      <div className="wk-stack">
        {error ? <Alert tone="danger">{error}</Alert> : null}
        {fields.map((field) => (
          <Input
            key={field.key}
            label={field.label}
            required={field.required}
            hint={field.hint}
            placeholder={field.placeholder}
            type={field.type ?? "text"}
            inputMode={field.type === "number" ? "numeric" : undefined}
            value={values[field.key] ?? ""}
            onChange={(event) =>
              setValues((current) => ({ ...current, [field.key]: event.target.value }))
            }
          />
        ))}
      </div>
    </Modal>
  );
}
