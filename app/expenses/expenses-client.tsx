"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import toast from "react-hot-toast";
import { apiFetch, type CategoryDTO, type ExpenseDTO } from "@/lib/api-client";
import { CheckIcon, MinusIcon, PencilIcon, PlusIcon, TrashIcon } from "@/components/icons";
import { ExpenseFormRow } from "./expense-form-row";
import { ReimbursementDialog } from "./reimbursement-dialog";
import {
  emptyForm,
  toIsoDate,
  todayIso,
  type Filters,
  type FormState,
  type Order,
  type ReimbursementInput,
  type SortKey,
} from "./types";

function formStateToInput(s: FormState) {
  return {
    value: Number(s.value),
    description: s.description.trim(),
    date: new Date(`${s.date}T12:00:00`).toISOString(),
    isJoint: s.isJoint,
    categoryId: s.categoryId,
    subcategoryId: s.subcategoryId || null,
    reimbursementAmount: s.reimb?.reimbursementAmount ?? null,
    reimburser: s.reimb?.reimburser ?? null,
    reimbursedAt: s.reimb?.reimbursedAt ?? null,
  };
}

function expenseToFormState(e: ExpenseDTO): FormState {
  return {
    value: e.value,
    description: e.description,
    categoryId: e.categoryId,
    subcategoryId: e.subcategoryId ?? "",
    date: toIsoDate(new Date(e.date)),
    isJoint: e.isJoint,
    reimb: null,
  };
}

export function ExpensesClient() {
  const { data: session } = useSession();
  const qc = useQueryClient();

  const [filters, setFilters] = useState<Filters>({});
  const [sort, setSort] = useState<SortKey>("date");
  const [order, setOrder] = useState<Order>("desc");

  const queryParams = useMemo(() => {
    const sp = new URLSearchParams();
    sp.set("sort", sort);
    sp.set("order", order);
    if (filters.categoryId) sp.set("categoryId", filters.categoryId);
    if (filters.subcategoryId) sp.set("subcategoryId", filters.subcategoryId);
    if (filters.isJoint) sp.set("isJoint", filters.isJoint);
    if (filters.from) sp.set("from", filters.from);
    if (filters.to) sp.set("to", filters.to);
    if (filters.q) sp.set("q", filters.q);
    if (filters.reimburse) sp.set("reimburse", filters.reimburse);
    return sp.toString();
  }, [filters, sort, order]);

  const expensesQ = useQuery({
    queryKey: ["expenses", queryParams],
    queryFn: () => apiFetch<ExpenseDTO[]>(`/api/expenses?${queryParams}`),
  });
  const categoriesQ = useQuery({
    queryKey: ["categories"],
    queryFn: () => apiFetch<CategoryDTO[]>("/api/categories"),
  });
  const lastDateQ = useQuery({
    queryKey: ["expenses", "last-date"],
    queryFn: () => apiFetch<{ date: string | null }>("/api/expenses/last-date"),
  });

  const initialDate = lastDateQ.data?.date
    ? toIsoDate(new Date(lastDateQ.data.date))
    : todayIso();

  const [createForm, setCreateFormState] = useState<FormState>(() => emptyForm(""));
  const [createTouched, setCreateTouched] = useState(false);

  const displayCreateForm: FormState = createTouched
    ? createForm
    : { ...createForm, date: initialDate };

  const setCreateForm = (next: FormState) => {
    setCreateTouched(true);
    setCreateFormState(next);
  };

  const resetCreateForm = (date: string) => {
    setCreateTouched(false);
    setCreateFormState(emptyForm(date));
  };

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["expenses"] });
  };

  const createM = useMutation({
    mutationFn: (input: FormState) =>
      apiFetch<ExpenseDTO>("/api/expenses", {
        method: "POST",
        body: JSON.stringify(formStateToInput(input)),
      }),
    onSuccess: (created) => {
      invalidate();
      toast.success("Expense added");
      resetCreateForm(toIsoDate(new Date(created.date)));
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const updateM = useMutation({
    mutationFn: ({ id, input }: { id: string; input: FormState }) =>
      apiFetch<ExpenseDTO>(`/api/expenses/${id}`, {
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

  const deleteM = useMutation({
    mutationFn: (id: string) =>
      apiFetch<void>(`/api/expenses/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      invalidate();
      toast.success("Deleted");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const updateReimbursementM = useMutation({
    mutationFn: ({ id, input }: { id: string; input: ReimbursementInput }) =>
      apiFetch<ExpenseDTO>(`/api/expenses/${id}`, {
        method: "PATCH",
        body: JSON.stringify(input),
      }),
    onSuccess: (updated) => {
      invalidate();
      if (updated.reimbursedAt) toast.success("Reimbursement received");
      else if (updated.reimbursementAmount) toast.success("Reimbursement saved");
      else toast.success("Reimbursement cleared");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const confirmReceivedM = useMutation({
    mutationFn: (id: string) =>
      apiFetch<ExpenseDTO>(`/api/expenses/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ reimbursedAt: new Date().toISOString() }),
      }),
    onSuccess: () => {
      invalidate();
      toast.success("Reimbursement confirmed");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<FormState | null>(null);
  const [reimbTarget, setReimbTarget] = useState<ExpenseDTO | null>(null);
  const [createReimbOpen, setCreateReimbOpen] = useState(false);
  const [createReimbKey, setCreateReimbKey] = useState(0);

  const onHeaderClick = (key: SortKey) => {
    if (sort === key) {
      setOrder((o) => (o === "asc" ? "desc" : "asc"));
    } else {
      setSort(key);
      setOrder("desc");
    }
  };

  const expenses = expensesQ.data ?? [];
  const categories = categoriesQ.data ?? [];
  const userId = session?.user?.id;

  return (
    <div className="space-y-4">
      <FiltersBar filters={filters} onChange={setFilters} categories={categories} />

      <div className="overflow-x-auto rounded-box border border-base-300">
        <table className="table table-zebra">
          <thead>
            <tr className="bg-base-200">
              <Th label="Date" sortKey="date" sort={sort} order={order} onClick={onHeaderClick} />
              <Th label="Value" sortKey="value" sort={sort} order={order} onClick={onHeaderClick} />
              <Th label="Description" sortKey="description" sort={sort} order={order} onClick={onHeaderClick} />
              <Th label="Category" sortKey="category" sort={sort} order={order} onClick={onHeaderClick} />
              <th>Subcategory</th>
              <th className="text-center">Joint</th>
              <th>Reimburse</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            <ExpenseFormRow
              value={displayCreateForm}
              onChange={setCreateForm}
              categories={categories}
              onSubmit={() => createM.mutate(displayCreateForm)}
              busy={createM.isPending}
              onReimbClick={() => {
                setCreateReimbKey((k) => k + 1);
                setCreateReimbOpen(true);
              }}
            />

            {expensesQ.isLoading && (
              <tr>
                <td colSpan={8} className="text-center py-6">
                  <span className="loading loading-spinner loading-md" />
                </td>
              </tr>
            )}

            {!expensesQ.isLoading && expenses.length === 0 && (
              <tr>
                <td colSpan={8} className="text-center py-6 opacity-60">
                  No expenses match these filters.
                </td>
              </tr>
            )}

            {expenses.map((e) => {
              const isOwner = userId === e.userId;
              const canEdit = isOwner || e.isJoint;
              const isEditing = editingId === e.id && editForm;
              if (isEditing && editForm) {
                return (
                  <ExpenseFormRow
                    key={e.id}
                    isEdit
                    value={editForm}
                    onChange={setEditForm}
                    categories={categories}
                    onSubmit={() => updateM.mutate({ id: e.id, input: editForm })}
                    onCancel={() => {
                      setEditingId(null);
                      setEditForm(null);
                    }}
                    busy={updateM.isPending}
                  />
                );
              }

              const awaiting =
                e.reimbursementAmount != null && !e.reimbursedAt;

              return (
                <tr
                  key={e.id}
                  // Light yellow background while awaiting reimbursement.
                  // Inline style beats DaisyUI's table-zebra :nth-child specificity.
                  style={
                    awaiting
                      ? {
                          backgroundColor:
                            "color-mix(in oklab, var(--color-warning) 15%, transparent)",
                        }
                      : undefined
                  }
                >
                  <td>{toIsoDate(new Date(e.date))}</td>
                  <td className="font-mono whitespace-nowrap">{formatValue(e.value)}</td>
                  <td>{e.description}</td>
                  <td>{e.category.name}</td>
                  <td>{e.subcategory?.name ?? "—"}</td>
                  <td className="text-center">
                    {e.isJoint ? (
                      <span className="badge badge-success badge-sm">Joint</span>
                    ) : (
                      <span className="badge badge-ghost badge-sm">
                        {isOwner ? "Private" : e.user.name ?? "Private"}
                      </span>
                    )}
                  </td>
                  <td>
                    <ReimbursementCell
                      expense={e}
                      isOwner={canEdit}
                      busy={updateReimbursementM.isPending || confirmReceivedM.isPending}
                      onToggle={(checked) =>
                        updateReimbursementM.mutate({
                          id: e.id,
                          input: checked
                            ? {
                                reimbursementAmount: Number(e.value),
                                reimburser: e.reimburser ?? null,
                                reimbursedAt: null,
                              }
                            : {
                                reimbursementAmount: null,
                                reimburser: null,
                                reimbursedAt: null,
                              },
                        })
                      }
                      onOpen={() => setReimbTarget(e)}
                      onConfirm={() => confirmReceivedM.mutate(e.id)}
                    />
                  </td>
                  <td>
                    <div className="join">
                      <button
                        type="button"
                        className="btn btn-ghost btn-sm btn-square join-item"
                        disabled={!canEdit}
                        onClick={() => {
                          setEditingId(e.id);
                          setEditForm(expenseToFormState(e));
                        }}
                        aria-label="Edit"
                        title="Edit"
                      >
                        <PencilIcon />
                      </button>
                      <button
                        type="button"
                        className="btn btn-ghost btn-sm btn-square text-error join-item"
                        disabled={!canEdit || deleteM.isPending}
                        onClick={() => {
                          if (confirm("Delete this expense?")) {
                            deleteM.mutate(e.id);
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

      {/* Dialog for editing reimbursement on an existing expense */}
      <ReimbursementDialog
        key={reimbTarget?.id ?? "none-reimb"}
        open={!!reimbTarget}
        expense={reimbTarget}
        readOnly={!reimbTarget || (reimbTarget.userId !== userId && !reimbTarget.isJoint)}
        onClose={() => setReimbTarget(null)}
        onSave={(input) => {
          if (!reimbTarget) return;
          updateReimbursementM.mutate({ id: reimbTarget.id, input });
          setReimbTarget(null);
        }}
      />

      {/* Dialog for setting reimbursement on a new expense before it is saved */}
      <ReimbursementDialog
        key={`create-reimb-${createReimbKey}`}
        open={createReimbOpen}
        expense={
          createReimbOpen
            ? {
                id: "__create__",
                value: displayCreateForm.value || "0",
                description: displayCreateForm.description.trim() || "New expense",
                comment: null,
                date: new Date().toISOString(),
                isJoint: displayCreateForm.isJoint,
                categoryId: "",
                category: { id: "", name: "" },
                subcategoryId: null,
                subcategory: null,
                reimbursementAmount:
                  displayCreateForm.reimb?.reimbursementAmount != null
                    ? String(displayCreateForm.reimb.reimbursementAmount)
                    : displayCreateForm.value || "0",
                reimburser: displayCreateForm.reimb?.reimburser ?? null,
                reimbursedAt: displayCreateForm.reimb?.reimbursedAt ?? null,
                userId: "",
                user: { id: "", name: null, email: "", image: null },
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
              }
            : null
        }
        readOnly={false}
        onClose={() => setCreateReimbOpen(false)}
        onSave={(input) => {
          setCreateForm({
            ...displayCreateForm,
            reimb: input.reimbursementAmount !== null ? input : null,
          });
          setCreateReimbOpen(false);
        }}
      />
    </div>
  );
}

function ReimbursementCell({
  expense,
  isOwner,
  busy,
  onToggle,
  onOpen,
  onConfirm,
}: {
  expense: ExpenseDTO;
  isOwner: boolean;
  busy?: boolean;
  onToggle: (checked: boolean) => void;
  onOpen: () => void;
  onConfirm: () => void;
}) {
  const amount = expense.reimbursementAmount ? Number(expense.reimbursementAmount) : null;
  const isExpected = amount != null;
  const isReceived = !!expense.reimbursedAt;

  return (
    <div className="flex items-center gap-1.5">
      {!isExpected ? (
        <button
          type="button"
          className="btn btn-xs btn-ghost btn-square text-base-content/40 hover:text-success hover:bg-success/10"
          disabled={!isOwner || busy}
          onClick={() => onToggle(true)}
          aria-label="Add reimbursement"
          title="Mark as reimbursable (defaults to 100% of value)"
        >
          <PlusIcon />
        </button>
      ) : (
        <>
          <button
            type="button"
            className="btn btn-xs btn-ghost btn-square text-base-content/40 hover:text-error hover:bg-error/10"
            disabled={!isOwner || busy}
            onClick={() => onToggle(false)}
            aria-label="Remove reimbursement"
            title="Remove reimbursement"
          >
            <MinusIcon />
          </button>
          <button
            type="button"
            onClick={onOpen}
            className={`badge badge-sm ${
              isReceived ? "badge-success" : "badge-warning"
            } cursor-pointer`}
            title={
              (isReceived ? "Received · " : "Awaiting · ") +
              eurFormatter.format(amount ?? 0) +
              (expense.reimburser ? ` from ${expense.reimburser}` : "") +
              (isReceived && expense.reimbursedAt
                ? ` on ${new Date(expense.reimbursedAt).toISOString().slice(0, 10)}`
                : "")
            }
          >
            {isReceived ? "✓ " : ""}
            {eurFormatter.format(amount ?? 0)}
            {expense.reimburser ? ` · ${expense.reimburser}` : ""}
          </button>
          {!isReceived && (
            <button
              type="button"
              className="btn btn-ghost btn-xs btn-square text-success"
              onClick={onConfirm}
              disabled={!isOwner || busy}
              aria-label="Confirm received"
              title="Confirm received"
            >
              <CheckIcon />
            </button>
          )}
        </>
      )}
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
  categories,
}: {
  filters: Filters;
  onChange: (f: Filters) => void;
  categories: CategoryDTO[];
}) {
  const tops = useMemo(
    () => categories.filter((c) => !c.parentId).sort((a, b) => a.name.localeCompare(b.name)),
    [categories],
  );
  const subs = useMemo(
    () =>
      categories
        .filter((c) => c.parentId === filters.categoryId)
        .sort((a, b) => a.name.localeCompare(b.name)),
    [categories, filters.categoryId],
  );

  const set = <K extends keyof Filters>(key: K, v: Filters[K]) =>
    onChange({ ...filters, [key]: v });

  return (
    <div className="card bg-base-200">
      <div className="card-body py-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-7 gap-2">
          <input
            type="text"
            className="input input-sm input-bordered"
            placeholder="Search description"
            value={filters.q ?? ""}
            onChange={(e) => set("q", e.target.value || undefined)}
          />
          <select
            className="select select-sm select-bordered"
            value={filters.categoryId ?? ""}
            onChange={(e) =>
              onChange({
                ...filters,
                categoryId: e.target.value || undefined,
                subcategoryId: undefined,
              })
            }
          >
            <option value="">All categories</option>
            {tops.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <select
            className="select select-sm select-bordered"
            value={filters.subcategoryId ?? ""}
            onChange={(e) => set("subcategoryId", e.target.value || undefined)}
            disabled={!filters.categoryId || subs.length === 0}
          >
            <option value="">All subcategories</option>
            {subs.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <input
            type="date"
            className="input input-sm input-bordered"
            value={filters.from ?? ""}
            onChange={(e) => set("from", e.target.value || undefined)}
          />
          <input
            type="date"
            className="input input-sm input-bordered"
            value={filters.to ?? ""}
            onChange={(e) => set("to", e.target.value || undefined)}
          />
          <select
            className="select select-sm select-bordered"
            value={filters.isJoint ?? ""}
            onChange={(e) =>
              set(
                "isJoint",
                e.target.value === "" ? undefined : (e.target.value as "true" | "false"),
              )
            }
          >
            <option value="">All visibility</option>
            <option value="true">Joint only</option>
            <option value="false">Private only</option>
          </select>
          <select
            className="select select-sm select-bordered"
            value={filters.reimburse ?? ""}
            onChange={(e) =>
              set(
                "reimburse",
                e.target.value === ""
                  ? undefined
                  : (e.target.value as "awaiting" | "received" | "none"),
              )
            }
          >
            <option value="">All reimbursements</option>
            <option value="awaiting">Awaiting</option>
            <option value="received">Received</option>
            <option value="none">None</option>
          </select>
        </div>
        {Object.values(filters).some(Boolean) && (
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

const eurFormatter = new Intl.NumberFormat("pt-PT", {
  style: "currency",
  currency: "EUR",
});

function formatValue(v: string): string {
  const n = Number(v);
  if (!Number.isFinite(n)) return v;
  return eurFormatter.format(n);
}
