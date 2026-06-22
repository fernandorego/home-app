"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import toast from "react-hot-toast";
import { apiFetch, type TaskDTO, type UserDTO } from "@/lib/api-client";
import { PencilIcon, TrashIcon } from "@/components/icons";
import { TaskFormRow } from "./task-form-row";
import { PRIORITIES, PRIORITY_LABEL, PriorityBadge } from "./priority";
import {
  emptyForm,
  RECURRENCE_LABEL,
  toIsoDate,
  type Filters,
  type FormState,
  type Order,
  type SortKey,
} from "./types";

function formStateToInput(s: FormState) {
  return {
    description: s.description.trim(),
    priority: s.priority,
    recurrence: s.recurrence || null,
    deadline: s.deadline ? new Date(`${s.deadline}T12:00:00`).toISOString() : null,
    assigneeId: s.assigneeId || null,
  };
}

function taskToFormState(t: TaskDTO): FormState {
  return {
    description: t.description,
    priority: t.priority,
    recurrence: t.recurrence ?? "",
    deadline: t.deadline ? toIsoDate(new Date(t.deadline)) : "",
    assigneeId: t.assigneeId ?? "",
  };
}

export function TasksClient() {
  const { data: session } = useSession();
  const qc = useQueryClient();

  const [filters, setFilters] = useState<Filters>({ completed: "false" });
  const [sort, setSort] = useState<SortKey>("deadline");
  const [order, setOrder] = useState<Order>("asc");

  const queryParams = useMemo(() => {
    const sp = new URLSearchParams();
    sp.set("sort", sort);
    sp.set("order", order);
    if (filters.priority) sp.set("priority", filters.priority);
    if (filters.completed) sp.set("completed", filters.completed);
    if (filters.assigneeId) sp.set("assigneeId", filters.assigneeId);
    if (filters.q) sp.set("q", filters.q);
    return sp.toString();
  }, [filters, sort, order]);

  const tasksQ = useQuery({
    queryKey: ["tasks", queryParams],
    queryFn: () => apiFetch<TaskDTO[]>(`/api/tasks?${queryParams}`),
  });
  const usersQ = useQuery({
    queryKey: ["users"],
    queryFn: () => apiFetch<UserDTO[]>("/api/users"),
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: ["tasks"] });

  const [createForm, setCreateForm] = useState<FormState>(() => emptyForm());

  const createM = useMutation({
    mutationFn: (input: FormState) =>
      apiFetch<TaskDTO>("/api/tasks", {
        method: "POST",
        body: JSON.stringify(formStateToInput(input)),
      }),
    onSuccess: () => {
      invalidate();
      toast.success("Task added");
      setCreateForm(emptyForm());
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const updateM = useMutation({
    mutationFn: ({ id, input }: { id: string; input: FormState }) =>
      apiFetch<TaskDTO>(`/api/tasks/${id}`, {
        method: "PATCH",
        body: JSON.stringify(formStateToInput(input)),
      }),
    onSuccess: () => {
      invalidate();
      toast.success("Updated");
      setEditingId(null);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const toggleCompleteM = useMutation({
    mutationFn: ({ id, completed }: { id: string; completed: boolean }) =>
      apiFetch<TaskDTO>(`/api/tasks/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ completed }),
      }),
    onSuccess: (updated, vars) => {
      invalidate();
      // If a recurring task was "completed", the server rolled the deadline forward
      // instead of marking it done — surface that so the user knows what happened.
      if (vars.completed && updated.completed === false && updated.deadline) {
        toast.success(`Rolled forward to ${toIsoDate(new Date(updated.deadline))}`);
      }
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const deleteM = useMutation({
    mutationFn: (id: string) =>
      apiFetch<void>(`/api/tasks/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      invalidate();
      toast.success("Deleted");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<FormState | null>(null);

  const onHeaderClick = (key: SortKey) => {
    if (sort === key) {
      setOrder((o) => (o === "asc" ? "desc" : "asc"));
    } else {
      setSort(key);
      setOrder(key === "deadline" || key === "description" ? "asc" : "desc");
    }
  };

  const tasks = tasksQ.data ?? [];
  const users = usersQ.data ?? [];
  const userId = session?.user?.id;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return (
    <div className="space-y-4">
      <FiltersBar filters={filters} onChange={setFilters} users={users} />

      <div className="overflow-x-auto rounded-box border border-base-300">
        <table className="table table-zebra">
          <thead>
            <tr className="bg-base-200">
              <Th label="Description" sortKey="description" sort={sort} order={order} onClick={onHeaderClick} />
              <Th label="Deadline" sortKey="deadline" sort={sort} order={order} onClick={onHeaderClick} />
              <th>Recurs</th>
              <Th label="Priority" sortKey="priority" sort={sort} order={order} onClick={onHeaderClick} />
              <th>Assigned to</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            <TaskFormRow
              value={createForm}
              onChange={setCreateForm}
              onSubmit={() => createM.mutate(createForm)}
              busy={createM.isPending}
              users={users}
            />

            {tasksQ.isLoading && (
              <tr>
                <td colSpan={6} className="text-center py-6">
                  <span className="loading loading-spinner loading-md" />
                </td>
              </tr>
            )}

            {!tasksQ.isLoading && tasks.length === 0 && (
              <tr>
                <td colSpan={6} className="text-center py-6 opacity-60">
                  No tasks match these filters.
                </td>
              </tr>
            )}

            {tasks.map((t) => {
              const isOwner = userId === t.userId;
              const isEditing = editingId === t.id && editForm;
              if (isEditing && editForm) {
                return (
                  <TaskFormRow
                    key={t.id}
                    isEdit
                    value={editForm}
                    onChange={setEditForm}
                    onSubmit={() => updateM.mutate({ id: t.id, input: editForm })}
                    onCancel={() => {
                      setEditingId(null);
                      setEditForm(null);
                    }}
                    busy={updateM.isPending}
                    users={users}
                  />
                );
              }

              const deadlineDate = t.deadline ? new Date(t.deadline) : null;
              const isOverdue = !!deadlineDate && !t.completed && deadlineDate < today;
              const dim = t.completed ? "opacity-60" : "";

              return (
                <tr key={t.id} className={dim}>
                  <td>
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        className="checkbox checkbox-sm"
                        checked={t.completed}
                        disabled={!isOwner || toggleCompleteM.isPending}
                        onChange={(e) =>
                          toggleCompleteM.mutate({ id: t.id, completed: e.target.checked })
                        }
                        aria-label="Mark complete"
                      />
                      <span className={t.completed ? "line-through" : ""}>
                        {t.description}
                      </span>
                    </label>
                  </td>
                  <td className={isOverdue ? "text-error font-medium" : ""}>
                    {deadlineDate ? toIsoDate(deadlineDate) : "—"}
                  </td>
                  <td>
                    {t.recurrence ? (
                      <span className="badge badge-outline badge-sm">
                        {RECURRENCE_LABEL[t.recurrence]}
                      </span>
                    ) : (
                      <span className="opacity-50 text-sm">—</span>
                    )}
                  </td>
                  <td>
                    <PriorityBadge priority={t.priority} />
                  </td>
                  <td>
                    {t.assignee ? (
                      <span className="badge badge-outline badge-sm">
                        {t.assignee.name ?? t.assignee.email}
                      </span>
                    ) : (
                      <span className="opacity-50 text-sm">Unassigned</span>
                    )}
                  </td>
                  <td>
                    <div className="join">
                      <button
                        type="button"
                        className="btn btn-ghost btn-sm btn-square join-item"
                        disabled={!isOwner}
                        onClick={() => {
                          setEditingId(t.id);
                          setEditForm(taskToFormState(t));
                        }}
                        aria-label="Edit"
                        title="Edit"
                      >
                        <PencilIcon />
                      </button>
                      <button
                        type="button"
                        className="btn btn-ghost btn-sm btn-square text-error join-item"
                        disabled={!isOwner || deleteM.isPending}
                        onClick={() => {
                          if (confirm("Delete this task?")) {
                            deleteM.mutate(t.id);
                          }
                        }}
                        aria-label="Delete"
                        title="Delete"
                      >
                        <TrashIcon />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Th({
  label,
  sortKey,
  sort,
  order,
  onClick,
}: {
  label: string;
  sortKey: SortKey;
  sort: SortKey;
  order: Order;
  onClick: (k: SortKey) => void;
}) {
  const active = sort === sortKey;
  return (
    <th>
      <button
        type="button"
        onClick={() => onClick(sortKey)}
        className="flex items-center gap-1 hover:text-primary"
      >
        {label}
        <span className="opacity-60 text-xs">
          {active ? (order === "asc" ? "▲" : "▼") : "↕"}
        </span>
      </button>
    </th>
  );
}

function FiltersBar({
  filters,
  onChange,
  users,
}: {
  filters: Filters;
  onChange: (f: Filters) => void;
  users: UserDTO[];
}) {
  const set = <K extends keyof Filters>(key: K, v: Filters[K]) =>
    onChange({ ...filters, [key]: v });

  return (
    <div className="card bg-base-200">
      <div className="card-body py-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-2">
          <input
            type="text"
            className="input input-sm input-bordered"
            placeholder="Search description"
            value={filters.q ?? ""}
            onChange={(e) => set("q", e.target.value || undefined)}
          />
          <select
            className="select select-sm select-bordered"
            value={filters.priority ?? ""}
            onChange={(e) =>
              set("priority", (e.target.value || undefined) as Filters["priority"])
            }
          >
            <option value="">All priorities</option>
            {PRIORITIES.map((p) => (
              <option key={p} value={p}>
                {PRIORITY_LABEL[p]}
              </option>
            ))}
          </select>
          <select
            className="select select-sm select-bordered"
            value={filters.assigneeId ?? ""}
            onChange={(e) => set("assigneeId", e.target.value || undefined)}
          >
            <option value="">Anyone</option>
            <option value="unassigned">Unassigned</option>
            {users.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name ?? u.email}
              </option>
            ))}
          </select>
          <select
            className="select select-sm select-bordered"
            value={filters.completed ?? ""}
            onChange={(e) =>
              set(
                "completed",
                e.target.value === "" ? undefined : (e.target.value as "true" | "false"),
              )
            }
          >
            <option value="">All tasks</option>
            <option value="false">Open only</option>
            <option value="true">Completed only</option>
          </select>
        </div>
        {(filters.priority || filters.completed || filters.assigneeId || filters.q) && (
          <div className="pt-2">
            <button
              type="button"
              className="btn btn-xs btn-ghost"
              onClick={() => onChange({})}
            >
              Clear filters
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
