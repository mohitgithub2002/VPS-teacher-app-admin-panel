"use client";

import Link from "next/link";
import { useState } from "react";

import { PageHeader } from "@/components/layout/PageHeader";
import { CredentialModal } from "@/components/domain/CredentialModal";
import { TeacherFormModal } from "@/components/domain/TeacherFormModal";
import { ActiveBadge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardBody } from "@/components/ui/Card";
import { SearchInput } from "@/components/ui/Field";
import { Icon } from "@/components/ui/Icon";
import {
  Avatar,
  ChipFilter,
  EmptyState,
  ErrorState,
  Pagination,
  TableSkeleton,
} from "@/components/ui/Primitives";
import { useTeachers } from "@/lib/api/queries";
import { useDebounced } from "@/lib/hooks";
import { formatDate, pluralise, relativeDays } from "@/lib/format";

type ActiveFilter = "all" | "true" | "false";

const FILTERS = [
  { value: "all" as const, label: "All" },
  { value: "true" as const, label: "Active" },
  { value: "false" as const, label: "Deactivated" },
];

const PAGE_SIZE = 20;

export default function TeachersPage() {
  const [search, setSearch] = useState("");
  const [active, setActive] = useState<ActiveFilter>("all");
  const [page, setPage] = useState(1);
  const [formOpen, setFormOpen] = useState(false);
  const [credential, setCredential] = useState<{
    name: string;
    employeeId: string;
    password: string;
  } | null>(null);

  const debouncedSearch = useDebounced(search);

  const teachers = useTeachers({
    page,
    pageSize: PAGE_SIZE,
    ...(debouncedSearch.trim() ? { search: debouncedSearch.trim() } : {}),
    ...(active === "all" ? {} : { active }),
  });

  const rows = teachers.data?.teachers ?? [];
  const pagination = teachers.data?.pagination;

  const onFilterChange = (value: ActiveFilter) => {
    setActive(value);
    setPage(1);
  };

  return (
    <main className="wk-page wk-page--wide">
      <PageHeader
        title="Teachers"
        lede="Every teacher account, their workload, and when they last signed in."
        actions={
          <Button variant="primary" icon="plus" onClick={() => setFormOpen(true)}>
            Add teacher
          </Button>
        }
      />

      <div className="wk-toolbar">
        <SearchInput
          className="wk-toolbar__search"
          value={search}
          onValueChange={(value) => {
            setSearch(value);
            setPage(1);
          }}
          placeholder="Search by name or employee ID"
          label="Search teachers"
        />
        <ChipFilter
          options={FILTERS}
          value={active}
          onChange={onFilterChange}
          label="Filter by status"
        />
      </div>

      <Card>
        <CardBody padding="flush">
          {teachers.isLoading ? (
            <TableSkeleton rows={6} columns={5} />
          ) : teachers.isError ? (
            <ErrorState error={teachers.error} onRetry={() => teachers.refetch()} />
          ) : rows.length === 0 ? (
            <EmptyState
              icon="teachers"
              title={debouncedSearch ? "No teachers match that search" : "No teachers yet"}
              body={
                debouncedSearch
                  ? "Try a different name or employee ID, or clear the status filter."
                  : "Create the first teacher account to start assigning classes."
              }
              action={
                debouncedSearch ? (
                  <Button
                    size="sm"
                    onClick={() => {
                      setSearch("");
                      setActive("all");
                    }}
                  >
                    Clear filters
                  </Button>
                ) : (
                  <Button variant="primary" size="sm" icon="plus" onClick={() => setFormOpen(true)}>
                    Add teacher
                  </Button>
                )
              }
            />
          ) : (
            <div className="wk-table-wrap">
              <table className="wk-table">
                <thead>
                  <tr>
                    <th>Teacher</th>
                    <th>Contact</th>
                    <th>Qualification</th>
                    <th className="wk-table__num">Assignments</th>
                    <th>Last sign-in</th>
                    <th>Status</th>
                    <th aria-label="Actions" />
                  </tr>
                </thead>
                <tbody>
                  {rows.map((teacher) => (
                    <tr key={teacher.id}>
                      <td>
                        <div className="wk-row">
                          <Avatar name={teacher.name} seed={teacher.id} size="sm" />
                          <div style={{ minWidth: 0 }}>
                            <Link
                              href={`/teachers/${teacher.id}`}
                              className="wk-table__primary"
                            >
                              {teacher.name}
                            </Link>
                            <div className="wk-caption wk-num">{teacher.employeeId}</div>
                          </div>
                        </div>
                      </td>
                      <td>
                        <div className="wk-num">{teacher.phone}</div>
                        {teacher.email ? (
                          <div className="wk-caption wk-truncate" style={{ maxWidth: 200 }}>
                            {teacher.email}
                          </div>
                        ) : null}
                      </td>
                      <td>{teacher.qualification ?? "—"}</td>
                      <td className="wk-table__num">
                        {teacher._count?.assignments ?? 0}
                      </td>
                      <td>
                        {teacher.lastLoginAt ? (
                          <>
                            <div>{relativeDays(teacher.lastLoginAt)}</div>
                            <div className="wk-caption">
                              {formatDate(teacher.lastLoginAt)}
                            </div>
                          </>
                        ) : (
                          <span className="wk-text-muted">Never</span>
                        )}
                      </td>
                      <td>
                        <ActiveBadge active={teacher.isActive} />
                      </td>
                      <td>
                        <div className="wk-table__actions">
                          <Link
                            href={`/teachers/${teacher.id}`}
                            className="wk-btn wk-btn--outline wk-btn--sm"
                          >
                            Open
                            <Icon name="chevron-right" size={15} />
                          </Link>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardBody>

        {pagination && rows.length > 0 ? (
          <Pagination
            page={pagination.page}
            pageSize={pagination.pageSize}
            total={pagination.total}
            pages={pagination.pages}
            onPageChange={setPage}
            noun="teachers"
          />
        ) : null}
      </Card>

      {pagination ? (
        <p className="wk-caption" style={{ marginTop: "var(--wk-space-3)" }}>
          {pluralise(pagination.total, "teacher")} in total.
        </p>
      ) : null}

      <TeacherFormModal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        onCredential={setCredential}
      />

      {credential ? (
        <CredentialModal
          open
          onClose={() => setCredential(null)}
          name={credential.name}
          employeeId={credential.employeeId}
          password={credential.password}
        />
      ) : null}
    </main>
  );
}
