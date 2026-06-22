"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import toast from "react-hot-toast";
import { apiFetch, type ShoppingItemDTO } from "@/lib/api-client";
import { PencilIcon, TrashIcon } from "@/components/icons";
import { ShoppingFormRow } from "./shopping-form-row";
import {
  emptyForm,
  RECURRENCES,
  RECURRENCE_LABEL,
  toIsoDate,
  type Filters,
  type FormState,
  type Order,
  type Recurrence,
  type SortKey,
} from "./types";

function formStateToInput(s: FormState) {
  return {
    name: s.name.trim(),
    quantity: s.quantity.trim() ? s.quantity.trim() : null,
    recurrence: s.recurrence || null,
    dueDate: s.dueDate ? new Date(`${s.dueDate}T12:00:00`).toISOString() : null,
  };
}

function itemToFormState(i: ShoppingItemDTO): FormState {
  return {
    name: i.name,
    quantity: i.quantity ?? "",
    recurrence: i.recurrence ?? "",
    dueDate: i.dueDate ? toIsoDate(new Date(i.dueDate)) : "",
  };
}

export function ShoppingClient() {
  const { data: session } = useSession();
  const qc = useQueryClient();

  const [filters, setFilters] = useState<Filters>({ bought: "false" });
  const [sort, setSort] = useState<SortKey>("dueDate");
  const [order, setOrder] = useState<Order>("asc");

  const queryParams = useMemo(() => {
    const sp = new URLSearchParams();
    sp.set("sort", sort);
    sp.set("order", order);
    if (filters.bought) sp.set("bought", filters.bought);
    if (filters.recurrence) sp.set("recurrence", filters.recurrence);
    if (filters.q) sp.set("q", filters.q);
    return sp.toString();
  }, [filters, sort, order]);

  const itemsQ = useQuery({
    queryKey: ["shopping", queryParams],
    queryFn: () => apiFetch<ShoppingItemDTO[]>(`/api/shopping?${queryParams}`),
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: ["shopping"] });

  const [createForm, setCreateForm] = useState<FormState>(() => emptyForm());

  const createM = useMutation({
    mutationFn: (input: FormState) =>
      apiFetch<ShoppingItemDTO>("/api/shopping", {
        method: "POST",
        body: JSON.stringify(formStateToInput(input)),
      }),
    onSuccess: () => {
      invalidate();
      toast.success("Added to list");
      setCreateForm(emptyForm());
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const updateM = useMutation({
    mutationFn: ({ id, input }: { id: string; input: FormState }) =>
      apiFetch<ShoppingItemDTO>(`/api/shopping/${id}`, {
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

  const toggleBoughtM = useMutation({
    mutationFn: ({ id, bought }: { id: string; bought: boolean }) =>
      apiFetch<ShoppingItemDTO>(`/api/shopping/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ bought }),
      }),
    onSuccess: (updated, vars) => {
      invalidate();
      // Recurring item rolled forward instead of being marked bought.
      if (vars.bought && updated.bought === false && updated.dueDate) {
        toast.success(`Next due ${toIsoDate(new Date(updated.dueDate))}`);
      }
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const deleteM = useMutation({
    mutationFn: (id: string) =>
      apiFetch<void>(`/api/shopping/${id}`, { method: "DELETE" }),
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
      setOrder(key === "dueDate" || key === "name" ? "asc" : "desc");
    }
  };

  const items = itemsQ.data ?? [];
  const userId = session?.user?.id;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return (
    <div className="space-y-4">
      <FiltersBar filters={filters} onChange={setFilters} />

      <div className="overflow-x-auto rounded-box border border-base-300">
        <table className="table table-zebra">
          <thead>
            <tr className="bg-base-200">
              <Th label="Item" sortKey="name" sort={sort} order={order} onClick={onHeaderClick} />
              <th>Quantity</th>
              <Th label="Due" sortKey="dueDate" sort={sort} order={order} onClick={onHeaderClick} />
              <th>Recurs</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            <ShoppingFormRow
              value={createForm}
              onChange={setCreateForm}
              onSubmit={() => createM.mutate(createForm)}
              busy={createM.isPending}
            />

            {itemsQ.isLoading && (
              <tr>
                <td colSpan={5} className="text-center py-6">
                  <span className="loading loading-spinner loading-md" />
                </td>
              </tr>
            )}

            {!itemsQ.isLoading && items.length === 0 && (
              <tr>
                <td colSpan={5} className="text-center py-6 opacity-60">
                  Nothing on the list.
                </td>
              </tr>
            )}

            {items.map((item) => {
              const isOwner = userId === item.userId;
              const isEditing = editingId === item.id && editForm;
              if (isEditing && editForm) {
                return (
                  <ShoppingFormRow
                    key={item.id}
                    isEdit
                    value={editForm}
                    onChange={setEditForm}
                    onSubmit={() => updateM.mutate({ id: item.id, input: editForm })}
                    onCancel={() => {
                      setEditingId(null);
                      setEditForm(null);
                    }}
                    busy={updateM.isPending}
                  />
                );
              }

              const dueDate = item.dueDate ? new Date(item.dueDate) : null;
              const isOverdue = !!dueDate && !item.bought && dueDate < today;
              const dim = item.bought ? "opacity-60" : "";

              return (
                <tr key={item.id} className={dim}>
                  <td>
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        className="checkbox checkbox-sm"
                        checked={item.bought}
                        disabled={!isOwner || toggleBoughtM.isPending}
                        onChange={(e) =>
                          toggleBoughtM.mutate({ id: item.id, bought: e.target.checked })
                        }
                        aria-label="Mark bought"
                      />
                      <span className={item.bought ? "line-through" : ""}>{item.name}</span>
                    </label>
                  </td>
                  <td className="text-sm opacity-80">{item.quantity ?? "—"}</td>
                  <td className={isOverdue ? "text-error font-medium" : ""}>
                    {dueDate ? toIsoDate(dueDate) : "—"}
                  </td>
                  <td>
                    {item.recurrence ? (
                      <span className="badge badge-outline badge-sm">
                        {RECURRENCE_LABEL[item.recurrence]}
                      </span>
                    ) : (
                      <span className="opacity-50 text-sm">—</span>
                    )}
                  </td>
                  <td>
                    <div className="join">
                      <button
                        type="button"
                        className="btn btn-ghost btn-sm btn-square join-item"
                        disabled={!isOwner}
                        onClick={() => {
                          setEditingId(item.id);
                          setEditForm(itemToFormState(item));
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
                          if (confirm("Remove this item?")) {
                            deleteM.mutate(item.id);
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
}: {
  filters: Filters;
  onChange: (f: Filters) => void;
}) {
  const set = <K extends keyof Filters>(key: K, v: Filters[K]) =>
    onChange({ ...filters, [key]: v });

  return (
    <div className="card bg-base-200">
      <div className="card-body py-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
          <input
            type="text"
            className="input input-sm input-bordered"
            placeholder="Search items"
            value={filters.q ?? ""}
            onChange={(e) => set("q", e.target.value || undefined)}
          />
          <select
            className="select select-sm select-bordered"
            value={filters.recurrence ?? ""}
            onChange={(e) =>
              set("recurrence", (e.target.value || undefined) as Recurrence | undefined)
            }
          >
            <option value="">All recurrences</option>
            {RECURRENCES.map((r) => (
              <option key={r} value={r}>
                {RECURRENCE_LABEL[r]}
              </option>
            ))}
          </select>
          <select
            className="select select-sm select-bordered"
            value={filters.bought ?? ""}
            onChange={(e) =>
              set(
                "bought",
                e.target.value === "" ? undefined : (e.target.value as "true" | "false"),
              )
            }
          >
            <option value="">All items</option>
            <option value="false">To buy only</option>
            <option value="true">Bought only</option>
          </select>
        </div>
        {(filters.bought || filters.recurrence || filters.q) && (
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
