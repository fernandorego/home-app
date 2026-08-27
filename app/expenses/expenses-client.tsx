"use client";

import { useMemo, useRef, useState, type ReactNode } from "react";
import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import toast from "react-hot-toast";
import {
  apiFetch,
  type CategoryDTO,
  type CoverflexStatus,
  type ExpenseDTO,
  type Paginated,
} from "@/lib/api-client";
import { Pagination } from "@/components/pagination";
import {
  CheckIcon,
  EraserIcon,
  FilterIcon,
  MinusIcon,
  PencilIcon,
  PlusIcon,
  TrashIcon,
} from "@/components/icons";
import { ExpenseFormRow } from "./expense-form-row";
import { ReimbursementDialog } from "./reimbursement-dialog";
import { COVERFLEX_LABELS, CoverflexIcon, coverflexBtnClass, nextCoverflexStatus } from "./coverflex";
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
    coverflexStatus: s.coverflexStatus,
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
    coverflexStatus: e.coverflexStatus,
    reimb:
      e.reimbursementAmount != null
        ? {
            reimbursementAmount: Number(e.reimbursementAmount),
            reimburser: e.reimburser,
            reimbursedAt: e.reimbursedAt,
          }
        : null,
  };
}

const PAGE_SIZE = 25;

export function ExpensesClient() {
  const { data: session } = useSession();
  const qc = useQueryClient();

  const [filters, setFilters] = useState<Filters>({});
  const [sort, setSort] = useState<SortKey>("date");
  const [order, setOrder] = useState<Order>("desc");
  const [page, setPage] = useState(1);

  const queryParams = useMemo(() => {
    const sp = new URLSearchParams();
    sp.set("sort", sort);
    sp.set("order", order);
    if (filters.categoryId?.length) sp.set("categoryId", filters.categoryId.join(","));
    if (filters.subcategoryId?.length)
      sp.set("subcategoryId", filters.subcategoryId.join(","));
    if (filters.isJoint?.length) sp.set("isJoint", filters.isJoint.join(","));
    if (filters.from) sp.set("from", filters.from);
    if (filters.to) sp.set("to", filters.to);
    if (filters.q) sp.set("q", filters.q);
    if (filters.reimburse?.length) sp.set("reimburse", filters.reimburse.join(","));
    if (filters.coverflexStatus?.length)
      sp.set("coverflexStatus", filters.coverflexStatus.join(","));
    sp.set("page", String(page));
    sp.set("pageSize", String(PAGE_SIZE));
    return sp.toString();
  }, [filters, sort, order, page]);

  const expensesQ = useQuery({
    queryKey: ["expenses", queryParams],
    queryFn: () =>
      apiFetch<Paginated<ExpenseDTO>>(`/api/expenses?${queryParams}`),
    placeholderData: keepPreviousData,
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

  const [createForm, setCreateFormState] = useState<FormState>(() =>
    emptyForm(""),
  );
  const firstInputRef = useRef<HTMLInputElement>(null);
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
      setPage(1);
      toast.success("Expense added");
      resetCreateForm(toIsoDate(new Date(created.date)));
      firstInputRef.current?.focus();
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

  const toggleJointM = useMutation({
    mutationFn: ({ id, isJoint }: { id: string; isJoint: boolean }) =>
      apiFetch<ExpenseDTO>(`/api/expenses/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ isJoint }),
      }),
    onSuccess: (updated) => {
      invalidate();
      toast.success(updated.isJoint ? "Marked as joint" : "Marked as private");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const updateCoverflexM = useMutation({
    mutationFn: ({
      id,
      coverflexStatus,
    }: {
      id: string;
      coverflexStatus: ExpenseDTO["coverflexStatus"];
    }) =>
      apiFetch<ExpenseDTO>(`/api/expenses/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ coverflexStatus }),
      }),
    onSuccess: (updated) => {
      invalidate();
      toast.success(`Coverflex: ${COVERFLEX_LABELS[updated.coverflexStatus]}`);
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
      else if (updated.reimbursementAmount)
        toast.success("Reimbursement saved");
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
  const [editReimbOpen, setEditReimbOpen] = useState(false);
  const [editReimbKey, setEditReimbKey] = useState(0);

  const onHeaderClick = (key: SortKey) => {
    if (sort === key) {
      setOrder((o) => (o === "asc" ? "desc" : "asc"));
    } else {
      setSort(key);
      setOrder("desc");
    }
    setPage(1);
  };

  const setFilter = <K extends keyof Filters>(key: K, v: Filters[K]) => {
    setFilters((f) => ({ ...f, [key]: v }));
    setPage(1);
  };

  const clearFilters = () => {
    setFilters({});
    setPage(1);
  };

  // Clears just the given filter field(s) — used by each column header's
  // eraser button so clearing one column's filter leaves the others alone.
  const clearFilterKeys = (keys: Array<keyof Filters>) => {
    setFilters((f) => {
      const next = { ...f };
      for (const k of keys) delete next[k];
      return next;
    });
    setPage(1);
  };

  const expenses = expensesQ.data?.data ?? [];
  const total = expensesQ.data?.total ?? 0;
  const categories = useMemo(() => categoriesQ.data ?? [], [categoriesQ.data]);
  const userId = session?.user?.id;

  const tops = useMemo(
    () =>
      categories
        .filter((c) => !c.parentId)
        .sort((a, b) => a.name.localeCompare(b.name)),
    [categories],
  );
  // With no category filter active, offer every subcategory; once at least
  // one is picked, narrow the list down to those categories' children.
  const subs = useMemo(
    () =>
      categories
        .filter((c) =>
          filters.categoryId?.length
            ? !!c.parentId && filters.categoryId.includes(c.parentId)
            : !!c.parentId,
        )
        .sort((a, b) => a.name.localeCompare(b.name)),
    [categories, filters.categoryId],
  );

  const anyFilterActive = Object.values(filters).some(
    (v) => v != null && (Array.isArray(v) ? v.length > 0 : true),
  );

  return (
    <div className="space-y-4">
      {anyFilterActive && (
        <button
          type="button"
          className="btn btn-xs btn-ghost"
          onClick={clearFilters}
        >
          Clear filters
        </button>
      )}

      <div className="overflow-x-auto rounded-box border border-base-300">
        <table className="table table-zebra">
          <thead>
            <tr className="bg-base-200">
              <Th
                label="Date"
                sortKey="date"
                sort={sort}
                order={order}
                onClick={onHeaderClick}
                filterActive={!!(filters.from || filters.to)}
                onClear={() => clearFilterKeys(["from", "to"])}
                filterContent={
                  <div className="flex flex-col gap-2 w-44">
                    <label className="flex flex-col gap-1 text-xs">
                      From
                      <input
                        type="date"
                        className="input input-sm input-bordered"
                        value={filters.from ?? ""}
                        onChange={(e) => setFilter("from", e.target.value || undefined)}
                      />
                    </label>
                    <label className="flex flex-col gap-1 text-xs">
                      To
                      <input
                        type="date"
                        className="input input-sm input-bordered"
                        value={filters.to ?? ""}
                        onChange={(e) => setFilter("to", e.target.value || undefined)}
                      />
                    </label>
                  </div>
                }
              />
              <Th
                label="Value"
                sortKey="value"
                sort={sort}
                order={order}
                onClick={onHeaderClick}
              />
              <Th
                label="Description"
                sortKey="description"
                sort={sort}
                order={order}
                onClick={onHeaderClick}
                filterActive={!!filters.q}
                onClear={() => clearFilterKeys(["q"])}
                filterContent={
                  <input
                    type="text"
                    className="input input-sm input-bordered w-48"
                    placeholder="Search description"
                    value={filters.q ?? ""}
                    onChange={(e) => setFilter("q", e.target.value || undefined)}
                  />
                }
              />
              <Th
                label="Category"
                sortKey="category"
                sort={sort}
                order={order}
                onClick={onHeaderClick}
                filterActive={!!filters.categoryId?.length}
                onClear={() => clearFilterKeys(["categoryId"])}
                filterContent={
                  <CheckboxFilterList
                    options={tops.map((c) => ({ value: c.id, label: c.name }))}
                    selected={filters.categoryId ?? []}
                    onChange={(next) => setFilter("categoryId", next)}
                  />
                }
              />
              <FilterTh
                label="Subcategory"
                filterActive={!!filters.subcategoryId?.length}
                onClear={() => clearFilterKeys(["subcategoryId"])}
                filterContent={
                  <CheckboxFilterList
                    options={[
                      { value: "__none__", label: "(no subcategory)" },
                      ...subs.map((c) => ({ value: c.id, label: c.name })),
                    ]}
                    selected={filters.subcategoryId ?? []}
                    onChange={(next) => setFilter("subcategoryId", next)}
                  />
                }
              />
              <FilterTh
                label="Joint"
                className="text-center"
                filterActive={!!filters.isJoint?.length}
                onClear={() => clearFilterKeys(["isJoint"])}
                filterContent={
                  <CheckboxFilterList
                    options={[
                      { value: "true" as const, label: "Joint" },
                      { value: "false" as const, label: "Private" },
                    ]}
                    selected={filters.isJoint ?? []}
                    onChange={(next) => setFilter("isJoint", next)}
                  />
                }
              />
              <Th
                label="Coverflex"
                sortKey="coverflexStatus"
                sort={sort}
                order={order}
                onClick={onHeaderClick}
                className="text-center"
                filterActive={!!filters.coverflexStatus?.length}
                onClear={() => clearFilterKeys(["coverflexStatus"])}
                filterContent={
                  <CheckboxFilterList
                    options={(Object.keys(COVERFLEX_LABELS) as CoverflexStatus[]).map(
                      (s) => ({ value: s, label: COVERFLEX_LABELS[s] }),
                    )}
                    selected={filters.coverflexStatus ?? []}
                    onChange={(next) => setFilter("coverflexStatus", next)}
                  />
                }
              />
              <Th
                label="Reimburse"
                sortKey="reimbursementAmount"
                sort={sort}
                order={order}
                onClick={onHeaderClick}
                filterActive={!!filters.reimburse?.length}
                onClear={() => clearFilterKeys(["reimburse"])}
                filterContent={
                  <CheckboxFilterList
                    options={[
                      { value: "awaiting" as const, label: "Awaiting" },
                      { value: "received" as const, label: "Received" },
                      { value: "none" as const, label: "None" },
                    ]}
                    selected={filters.reimburse ?? []}
                    onChange={(next) => setFilter("reimburse", next)}
                  />
                }
              />
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
              firstInputRef={firstInputRef}
              onReimbClick={() => {
                setCreateReimbKey((k) => k + 1);
                setCreateReimbOpen(true);
              }}
            />

            {expensesQ.isLoading && (
              <tr>
                <td colSpan={9} className="text-center py-6">
                  <span className="loading loading-spinner loading-md" />
                </td>
              </tr>
            )}

            {!expensesQ.isLoading && expenses.length === 0 && (
              <tr>
                <td colSpan={9} className="text-center py-6 opacity-60">
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
                    onSubmit={() =>
                      updateM.mutate({ id: e.id, input: editForm })
                    }
                    onCancel={() => {
                      setEditingId(null);
                      setEditForm(null);
                    }}
                    busy={updateM.isPending}
                    onReimbClick={() => {
                      setEditReimbKey((k) => k + 1);
                      setEditReimbOpen(true);
                    }}
                  />
                );
              }

              const awaiting = e.reimbursementAmount != null && !e.reimbursedAt;

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
                  <td className="font-mono whitespace-nowrap">
                    {formatValue(e.value)}
                  </td>
                  <td>{e.description}</td>
                  <td>{e.category.name}</td>
                  <td>{e.subcategory?.name ?? "—"}</td>
                  <td className="text-center">
                    {canEdit ? (
                      <button
                        type="button"
                        disabled={toggleJointM.isPending}
                        onClick={() =>
                          toggleJointM.mutate({ id: e.id, isJoint: !e.isJoint })
                        }
                        className={`badge badge-sm cursor-pointer ${
                          e.isJoint ? "badge-success" : "badge-ghost"
                        }`}
                        title="Click to toggle joint/private"
                      >
                        {e.isJoint ? "Joint" : "Private"}
                      </button>
                    ) : e.isJoint ? (
                      <span className="badge badge-success badge-sm">
                        Joint
                      </span>
                    ) : (
                      <span className="badge badge-ghost badge-sm">
                        {e.user.name ?? "Private"}
                      </span>
                    )}
                  </td>
                  <td className="text-center">
                    <button
                      type="button"
                      className={`btn btn-xs btn-square btn-ghost ${coverflexBtnClass(e.coverflexStatus)}`}
                      disabled={!canEdit || updateCoverflexM.isPending}
                      onClick={() =>
                        updateCoverflexM.mutate({
                          id: e.id,
                          coverflexStatus: nextCoverflexStatus(e.coverflexStatus),
                        })
                      }
                      aria-label={`Coverflex: ${COVERFLEX_LABELS[e.coverflexStatus]}`}
                      title={`Coverflex: ${COVERFLEX_LABELS[e.coverflexStatus]}${
                        canEdit
                          ? ` (click for ${COVERFLEX_LABELS[nextCoverflexStatus(e.coverflexStatus)]})`
                          : ""
                      }`}
                    >
                      <CoverflexIcon status={e.coverflexStatus} />
                    </button>
                  </td>
                  <td>
                    <ReimbursementCell
                      expense={e}
                      isOwner={canEdit}
                      busy={
                        updateReimbursementM.isPending ||
                        confirmReceivedM.isPending
                      }
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

      <Pagination
        page={page}
        total={total}
        pageSize={PAGE_SIZE}
        onChange={setPage}
      />

      {/* Dialog for editing reimbursement on an existing expense */}
      <ReimbursementDialog
        key={reimbTarget?.id ?? "none-reimb"}
        open={!!reimbTarget}
        expense={reimbTarget}
        readOnly={
          !reimbTarget ||
          (reimbTarget.userId !== userId && !reimbTarget.isJoint)
        }
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
                description:
                  displayCreateForm.description.trim() || "New expense",
                comment: null,
                date: new Date().toISOString(),
                isJoint: displayCreateForm.isJoint,
                coverflexStatus: displayCreateForm.coverflexStatus,
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

      {/* Dialog for setting reimbursement details while editing an existing
          expense — mirrors the create-flow dialog above: changes are staged
          into editForm and only persisted once the row's Save is clicked. */}
      <ReimbursementDialog
        key={`edit-reimb-${editReimbKey}`}
        open={editReimbOpen}
        expense={
          editReimbOpen && editForm
            ? {
                id: "__edit__",
                value: editForm.value || "0",
                description: editForm.description.trim() || "Expense",
                comment: null,
                date: new Date().toISOString(),
                isJoint: editForm.isJoint,
                coverflexStatus: editForm.coverflexStatus,
                categoryId: "",
                category: { id: "", name: "" },
                subcategoryId: null,
                subcategory: null,
                reimbursementAmount:
                  editForm.reimb?.reimbursementAmount != null
                    ? String(editForm.reimb.reimbursementAmount)
                    : editForm.value || "0",
                reimburser: editForm.reimb?.reimburser ?? null,
                reimbursedAt: editForm.reimb?.reimbursedAt ?? null,
                userId: "",
                user: { id: "", name: null, email: "", image: null },
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
              }
            : null
        }
        readOnly={false}
        onClose={() => setEditReimbOpen(false)}
        onSave={(input) => {
          if (!editForm) return;
          setEditForm({
            ...editForm,
            reimb: input.reimbursementAmount !== null ? input : null,
          });
          setEditReimbOpen(false);
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
  const amount = expense.reimbursementAmount
    ? Number(expense.reimbursementAmount)
    : null;
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
            className={`flex flex-col items-center justify-center gap-0 rounded-md px-2 py-0.5 text-xs leading-tight cursor-pointer ${
              isReceived
                ? "bg-success text-success-content"
                : "bg-warning text-warning-content"
            }`}
            title={
              (isReceived ? "Received · " : "Awaiting · ") +
              eurFormatter.format(amount ?? 0) +
              (expense.reimburser ? ` from ${expense.reimburser}` : "") +
              (isReceived && expense.reimbursedAt
                ? ` on ${new Date(expense.reimbursedAt).toISOString().slice(0, 10)}`
                : "")
            }
          >
            <span className="font-semibold">
              {isReceived ? "✓ " : ""}
              {eurFormatter.format(amount ?? 0)}
            </span>
            <span>
              {isReceived ? "Received" : "Awaiting"}
              {expense.reimburser ? ` · ${expense.reimburser}` : ""}
            </span>
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
  className,
  filterActive,
  filterContent,
  onClear,
}: {
  label: string;
  sortKey: SortKey;
  sort: SortKey;
  order: Order;
  onClick: (k: SortKey) => void;
  className?: string;
  filterActive?: boolean;
  filterContent?: ReactNode;
  onClear?: () => void;
}) {
  const active = sort === sortKey;
  const centered = className?.includes("text-center");
  return (
    <th className={`${className ?? ""} ${filterActive ? "bg-primary/10" : ""}`}>
      <div className={`flex items-center gap-0.5 ${centered ? "justify-center" : ""}`}>
        <button
          type="button"
          onClick={() => onClick(sortKey)}
          className={`flex items-center gap-1 hover:text-primary ${filterActive ? "text-primary font-semibold" : ""}`}
        >
          {label}
          <span className="opacity-60 text-xs">
            {active ? (order === "asc" ? "▲" : "▼") : "↕"}
          </span>
        </button>
        {filterContent && (
          <HeaderFilter active={!!filterActive}>{filterContent}</HeaderFilter>
        )}
        {filterActive && onClear && <ClearFilterButton onClick={onClear} />}
      </div>
    </th>
  );
}

function FilterTh({
  label,
  className,
  filterActive,
  filterContent,
  onClear,
}: {
  label: string;
  className?: string;
  filterActive?: boolean;
  filterContent: ReactNode;
  onClear?: () => void;
}) {
  const centered = className?.includes("text-center");
  return (
    <th className={`${className ?? ""} ${filterActive ? "bg-primary/10" : ""}`}>
      <div className={`flex items-center gap-0.5 ${centered ? "justify-center" : ""}`}>
        <span className={filterActive ? "text-primary font-semibold" : ""}>
          {label}
        </span>
        <HeaderFilter active={!!filterActive}>{filterContent}</HeaderFilter>
        {filterActive && onClear && <ClearFilterButton onClick={onClear} />}
      </div>
    </th>
  );
}

// Eraser button shown next to a column header only while that column's
// filter is active, to clear just that one filter without opening the
// dropdown or affecting any other column.
function ClearFilterButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      className="btn btn-ghost btn-xs btn-square text-primary"
      onClick={onClick}
      aria-label="Clear this column's filter"
      title="Clear this column's filter"
    >
      <EraserIcon className="h-3.5 w-3.5" />
    </button>
  );
}

// A funnel icon that opens a small dropdown (native <details>-style daisyUI
// dropdown) with the column's filter control. Highlighted while active.
function HeaderFilter({
  active,
  children,
}: {
  active: boolean;
  children: ReactNode;
}) {
  return (
    <div className="dropdown dropdown-bottom">
      <div
        tabIndex={0}
        role="button"
        className={`btn btn-ghost btn-xs btn-square ${active ? "text-primary" : "opacity-40"}`}
        aria-label="Filter"
        title="Filter"
      >
        <FilterIcon className="h-3.5 w-3.5" />
      </div>
      <div
        tabIndex={0}
        className="dropdown-content z-20 p-3 shadow-lg bg-base-100 border border-base-300 rounded-box mt-1"
      >
        {children}
      </div>
    </div>
  );
}

// A scrollable list of checkboxes for a column's filter — lets several
// options be selected at once instead of just one.
function CheckboxFilterList<T extends string>({
  options,
  selected,
  onChange,
}: {
  options: Array<{ value: T; label: string }>;
  selected: T[];
  onChange: (next: T[]) => void;
}) {
  const toggle = (v: T) =>
    onChange(
      selected.includes(v) ? selected.filter((x) => x !== v) : [...selected, v],
    );

  return (
    <div className="flex flex-col gap-0.5 max-h-56 overflow-y-auto w-48">
      {options.map((opt) => (
        <label
          key={opt.value}
          className="flex items-center gap-2 text-sm py-0.5 cursor-pointer hover:bg-base-200 rounded px-1"
        >
          <input
            type="checkbox"
            className="checkbox checkbox-xs"
            checked={selected.includes(opt.value)}
            onChange={() => toggle(opt.value)}
          />
          <span className="truncate">{opt.label}</span>
        </label>
      ))}
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
