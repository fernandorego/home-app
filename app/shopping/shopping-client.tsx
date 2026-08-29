"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import toast from "react-hot-toast";
import {
  apiFetch,
  type ListCategoryDTO,
  type Paginated,
  type ShoppingItemDTO,
} from "@/lib/api-client";
import { PencilIcon, PlusIcon, TrashIcon } from "@/components/icons";
import { PRIORITIES, PRIORITY_LABEL, PriorityBadge } from "@/components/priority";
import { ShoppingFormRow } from "./shopping-form-row";
import { Pagination } from "@/components/pagination";
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

const PAGE_SIZE = 25;

function formStateToInput(s: FormState) {
  return {
    name: s.name.trim(),
    quantity: s.quantity.trim() ? s.quantity.trim() : null,
    priority: s.priority,
    recurrence: s.recurrence || null,
    dueDate: s.dueDate ? new Date(`${s.dueDate}T12:00:00`).toISOString() : null,
    categoryId: s.categoryId || null,
  };
}

function itemToFormState(i: ShoppingItemDTO): FormState {
  return {
    name: i.name,
    quantity: i.quantity ?? "",
    priority: i.priority,
    recurrence: i.recurrence ?? "",
    dueDate: i.dueDate ? toIsoDate(new Date(i.dueDate)) : "",
    categoryId: i.categoryId ?? "",
  };
}

export function ShoppingClient() {
  const qc = useQueryClient();

  const [filters, setFilters] = useState<Filters>({ bought: "false" });
  const [sort, setSort] = useState<SortKey>("dueDate");
  const [order, setOrder] = useState<Order>("asc");
  const [page, setPage] = useState(1);

  const queryParams = useMemo(() => {
    const sp = new URLSearchParams();
    sp.set("sort", sort);
    sp.set("order", order);
    sp.set("page", String(page));
    sp.set("pageSize", String(PAGE_SIZE));
    if (filters.bought) sp.set("bought", filters.bought);
    if (filters.recurrence) sp.set("recurrence", filters.recurrence);
    if (filters.priority) sp.set("priority", filters.priority);
    if (filters.categoryId) sp.set("categoryId", filters.categoryId);
    if (filters.q) sp.set("q", filters.q);
    return sp.toString();
  }, [filters, sort, order, page]);

  const itemsQ = useQuery({
    queryKey: ["shopping", queryParams],
    queryFn: () =>
      apiFetch<Paginated<ShoppingItemDTO>>(`/api/shopping?${queryParams}`),
    placeholderData: keepPreviousData,
  });
  const categoriesQ = useQuery({
    queryKey: ["list-categories", "SHOPPING"],
    queryFn: () => apiFetch<ListCategoryDTO[]>("/api/list-categories?kind=SHOPPING"),
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: ["shopping"] });

  const [createForm, setCreateForm] = useState<FormState>(() => emptyForm());
  const firstInputRef = useRef<HTMLInputElement>(null);

  const createM = useMutation({
    mutationFn: (input: FormState) =>
      apiFetch<ShoppingItemDTO>("/api/shopping", {
        method: "POST",
        body: JSON.stringify(formStateToInput(input)),
      }),
    onSuccess: () => {
      invalidate();
      setPage(1);
      toast.success("Added to list");
      setCreateForm(emptyForm());
      firstInputRef.current?.focus();
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

  const bulkCreateM = useMutation({
    mutationFn: (names: string[]) =>
      apiFetch<ShoppingItemDTO[]>("/api/shopping/bulk-create", {
        method: "POST",
        body: JSON.stringify({ names }),
      }),
    onSuccess: (created) => {
      invalidate();
      setPage(1);
      toast.success(`Added ${created.length} item${created.length === 1 ? "" : "s"}`);
      setBulkAddOpen(false);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const clearBoughtM = useMutation({
    mutationFn: () =>
      apiFetch<{ deleted: number }>("/api/shopping/clear-bought", { method: "POST" }),
    onSuccess: ({ deleted }) => {
      invalidate();
      toast.success(`Cleared ${deleted} bought item${deleted === 1 ? "" : "s"}`);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<FormState | null>(null);
  const [bulkAddOpen, setBulkAddOpen] = useState(false);

  const onHeaderClick = (key: SortKey) => {
    if (sort === key) {
      setOrder((o) => (o === "asc" ? "desc" : "asc"));
    } else {
      setSort(key);
      setOrder(key === "dueDate" || key === "name" ? "asc" : "desc");
    }
    setPage(1);
  };

  const handleFiltersChange = (f: Filters) => {
    setFilters(f);
    setPage(1);
  };

  const items = itemsQ.data?.data ?? [];
  const total = itemsQ.data?.total ?? 0;
  const categories = categoriesQ.data ?? [];

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return (
    <div className="space-y-4">
      <FiltersBar filters={filters} onChange={handleFiltersChange} categories={categories} />

      <div className="flex justify-end gap-2">
        <button
          type="button"
          className="btn btn-sm btn-ghost gap-1"
          onClick={() => setBulkAddOpen(true)}
        >
          <PlusIcon className="h-4 w-4" /> Add multiple
        </button>
        <button
          type="button"
          className="btn btn-sm btn-ghost gap-1"
          disabled={clearBoughtM.isPending}
          onClick={() => {
            if (confirm("Remove every bought item from the list?")) {
              clearBoughtM.mutate();
            }
          }}
        >
          <TrashIcon className="h-4 w-4" /> Clear bought
        </button>
      </div>

      <div className="overflow-x-auto rounded-box border border-base-300">
        <table className="table table-zebra">
          <thead>
            <tr className="bg-base-200">
              <Th
                label="Item"
                sortKey="name"
                sort={sort}
                order={order}
                onClick={onHeaderClick}
              />
              <th>Category</th>
              <th>Quantity</th>
              <Th
                label="Priority"
                sortKey="priority"
                sort={sort}
                order={order}
                onClick={onHeaderClick}
              />
              <Th
                label="Due"
                sortKey="dueDate"
                sort={sort}
                order={order}
                onClick={onHeaderClick}
              />
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
              categories={categories}
              firstInputRef={firstInputRef}
            />

            {itemsQ.isLoading && (
              <tr>
                <td colSpan={7} className="text-center py-6">
                  <span className="loading loading-spinner loading-md" />
                </td>
              </tr>
            )}

            {!itemsQ.isLoading && items.length === 0 && (
              <tr>
                <td colSpan={7} className="text-center py-6 opacity-60">
                  Nothing on the list.
                </td>
              </tr>
            )}

            {items.map((item) => {
              const isEditing = editingId === item.id && editForm;
              if (isEditing && editForm) {
                return (
                  <ShoppingFormRow
                    key={item.id}
                    isEdit
                    value={editForm}
                    onChange={setEditForm}
                    onSubmit={() =>
                      updateM.mutate({ id: item.id, input: editForm })
                    }
                    onCancel={() => {
                      setEditingId(null);
                      setEditForm(null);
                    }}
                    busy={updateM.isPending}
                    categories={categories}
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
                        disabled={toggleBoughtM.isPending}
                        onChange={(e) =>
                          toggleBoughtM.mutate({
                            id: item.id,
                            bought: e.target.checked,
                          })
                        }
                        aria-label="Mark bought"
                      />
                      <span className={item.bought ? "line-through" : ""}>
                        {item.name}
                      </span>
                    </label>
                  </td>
                  <td>
                    {item.category ? (
                      <span className="badge badge-ghost badge-sm">{item.category.name}</span>
                    ) : (
                      <span className="opacity-50 text-sm">—</span>
                    )}
                  </td>
                  <td className="text-sm opacity-80">{item.quantity ?? "—"}</td>
                  <td>
                    <PriorityBadge priority={item.priority} />
                  </td>
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
                        disabled={deleteM.isPending}
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

      <Pagination
        page={page}
        total={total}
        pageSize={PAGE_SIZE}
        onChange={setPage}
      />

      <BulkAddDialog
        open={bulkAddOpen}
        busy={bulkCreateM.isPending}
        onClose={() => setBulkAddOpen(false)}
        onSubmit={(names) => bulkCreateM.mutate(names)}
      />
    </div>
  );
}

function BulkAddDialog({
  open,
  busy,
  onClose,
  onSubmit,
}: {
  open: boolean;
  busy: boolean;
  onClose: () => void;
  onSubmit: (names: string[]) => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const [text, setText] = useState("");

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (open && !el.open) el.showModal();
    if (!open && el.open) el.close();
  }, [open]);

  const names = text
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);

  return (
    <dialog ref={ref} className="modal" onClose={onClose}>
      <div className="modal-box">
        <h3 className="font-bold text-lg mb-1">Add multiple items</h3>
        <p className="text-sm opacity-60 mb-3">One item per line.</p>
        <textarea
          className="textarea textarea-bordered w-full h-40"
          placeholder={"Milk\nEggs\nBread"}
          value={text}
          onChange={(e) => setText(e.target.value)}
          autoFocus
        />
        <div className="modal-action">
          <button type="button" className="btn btn-ghost" onClick={onClose}>
            Cancel
          </button>
          <button
            type="button"
            className="btn btn-primary"
            disabled={names.length === 0 || busy}
            onClick={() => onSubmit(names)}
          >
            {busy ? (
              <span className="loading loading-spinner loading-xs" />
            ) : (
              `Add ${names.length} item${names.length === 1 ? "" : "s"}`
            )}
          </button>
        </div>
      </div>
      <form method="dialog" className="modal-backdrop">
        <button>close</button>
      </form>
    </dialog>
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
  categories,
}: {
  filters: Filters;
  onChange: (f: Filters) => void;
  categories: ListCategoryDTO[];
}) {
  const set = <K extends keyof Filters>(key: K, v: Filters[K]) =>
    onChange({ ...filters, [key]: v });

  return (
    <div className="card bg-base-200">
      <div className="card-body py-4">
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-2">
          <input
            type="text"
            className="input input-sm input-bordered"
            placeholder="Search items"
            value={filters.q ?? ""}
            onChange={(e) => set("q", e.target.value || undefined)}
          />
          <select
            className="select select-sm select-bordered"
            value={filters.categoryId ?? ""}
            onChange={(e) => set("categoryId", e.target.value || undefined)}
          >
            <option value="">All categories</option>
            <option value="__none__">No category</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <select
            className="select select-sm select-bordered"
            value={filters.priority ?? ""}
            onChange={(e) =>
              set(
                "priority",
                (e.target.value || undefined) as Filters["priority"],
              )
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
            value={filters.recurrence ?? ""}
            onChange={(e) =>
              set(
                "recurrence",
                (e.target.value || undefined) as Recurrence | undefined,
              )
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
                e.target.value === ""
                  ? undefined
                  : (e.target.value as "true" | "false"),
              )
            }
          >
            <option value="">All items</option>
            <option value="false">To buy only</option>
            <option value="true">Bought only</option>
          </select>
        </div>
        {(filters.bought || filters.recurrence || filters.priority || filters.categoryId || filters.q) && (
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
