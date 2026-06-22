"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { apiFetch, type CategoryDTO } from "@/lib/api-client";
import {
  CheckIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  PencilIcon,
  PlusIcon,
  TrashIcon,
  XIcon,
} from "@/components/icons";

type Tree = {
  category: CategoryDTO;
  children: CategoryDTO[];
};

function buildTree(cats: CategoryDTO[]): Tree[] {
  const tops = cats.filter((c) => !c.parentId);
  const subs = cats.filter((c) => c.parentId);
  return tops
    .map((t) => ({
      category: t,
      children: subs
        .filter((s) => s.parentId === t.id)
        .sort((a, b) => a.name.localeCompare(b.name)),
    }))
    .sort((a, b) => a.category.name.localeCompare(b.category.name));
}

const eur = new Intl.NumberFormat("pt-PT", { style: "currency", currency: "EUR" });

export function CategoriesAdmin() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["categories"],
    queryFn: () => apiFetch<CategoryDTO[]>("/api/categories"),
  });

  const tree = useMemo(() => (data ? buildTree(data) : []), [data]);

  const invalidate = () => qc.invalidateQueries({ queryKey: ["categories"] });

  const create = useMutation({
    mutationFn: (input: { name: string; parentId: string | null; monthlyBudget?: number | null }) =>
      apiFetch<CategoryDTO>("/api/categories", {
        method: "POST",
        body: JSON.stringify(input),
      }),
    onSuccess: () => {
      invalidate();
      toast.success("Category created");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const patch = useMutation({
    mutationFn: ({
      id,
      patchInput,
    }: {
      id: string;
      patchInput: Partial<{ name: string; monthlyBudget: number | null }>;
    }) =>
      apiFetch<CategoryDTO>(`/api/categories/${id}`, {
        method: "PATCH",
        body: JSON.stringify(patchInput),
      }),
    onSuccess: () => {
      invalidate();
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const remove = useMutation({
    mutationFn: (id: string) =>
      apiFetch<void>(`/api/categories/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      invalidate();
      toast.success("Deleted");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const [newTopName, setNewTopName] = useState("");
  const [newTopBudget, setNewTopBudget] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);

  if (isLoading) return <span className="loading loading-spinner loading-md" />;

  const busy = create.isPending || patch.isPending || remove.isPending;

  return (
    <div className="space-y-4">
      <div className="card bg-base-200">
        <div className="card-body py-4">
          <form
            className="flex flex-wrap gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              const name = newTopName.trim();
              if (!name) return;
              const budget = newTopBudget.trim() === "" ? null : Number(newTopBudget);
              create.mutate(
                { name, parentId: null, monthlyBudget: budget },
                {
                  onSuccess: () => {
                    setNewTopName("");
                    setNewTopBudget("");
                  },
                },
              );
            }}
          >
            <input
              type="text"
              className="input input-bordered flex-1 min-w-32"
              placeholder="New category name"
              value={newTopName}
              onChange={(e) => setNewTopName(e.target.value)}
            />
            <label className="input input-bordered flex items-center gap-1 w-32">
              <input
                type="number"
                step="0.01"
                min="0"
                inputMode="decimal"
                className="grow"
                placeholder="Budget"
                value={newTopBudget}
                onChange={(e) => setNewTopBudget(e.target.value)}
              />
              <span className="opacity-60">€</span>
            </label>
            <button
              type="submit"
              className="btn btn-primary btn-square"
              disabled={create.isPending || !newTopName.trim()}
              aria-label="Add category"
              title="Add category"
            >
              {create.isPending ? (
                <span className="loading loading-spinner loading-xs" />
              ) : (
                <PlusIcon />
              )}
            </button>
          </form>
        </div>
      </div>

      {tree.length === 0 && (
        <p className="text-center opacity-60">No categories yet.</p>
      )}

      <ul className="space-y-3">
        {tree.map((node) => (
          <CategoryNode
            key={node.category.id}
            node={node}
            editingId={editingId}
            onStartEdit={setEditingId}
            onCancelEdit={() => setEditingId(null)}
            onRename={(id, name) =>
              patch.mutate(
                { id, patchInput: { name } },
                { onSuccess: () => setEditingId(null) },
              )
            }
            onSetBudget={(id, monthlyBudget) =>
              patch.mutate(
                { id, patchInput: { monthlyBudget } },
                { onSuccess: () => toast.success("Budget saved") },
              )
            }
            onCreateSub={(name) => create.mutate({ name, parentId: node.category.id })}
            onDelete={(id) => remove.mutate(id)}
            busy={busy}
          />
        ))}
      </ul>
    </div>
  );
}

type NodeProps = {
  node: Tree;
  editingId: string | null;
  onStartEdit: (id: string) => void;
  onCancelEdit: () => void;
  onRename: (id: string, name: string) => void;
  onSetBudget: (id: string, monthlyBudget: number | null) => void;
  onCreateSub: (name: string) => void;
  onDelete: (id: string) => void;
  busy: boolean;
};

function CategoryNode({
  node,
  editingId,
  onStartEdit,
  onCancelEdit,
  onRename,
  onSetBudget,
  onCreateSub,
  onDelete,
  busy,
}: NodeProps) {
  const [expanded, setExpanded] = useState(false);
  const [subName, setSubName] = useState("");

  return (
    <li className="card bg-base-100 border border-base-300">
      <div className="card-body py-3">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            className="btn btn-ghost btn-sm btn-square"
            onClick={() => setExpanded((e) => !e)}
            aria-label={expanded ? "Collapse" : "Expand"}
            title={expanded ? "Collapse" : "Expand"}
          >
            {expanded ? <ChevronDownIcon /> : <ChevronRightIcon />}
          </button>

          {editingId === node.category.id ? (
            <NameEditor
              initial={node.category.name}
              onSave={(name) => onRename(node.category.id, name)}
              onCancel={onCancelEdit}
            />
          ) : (
            <>
              <span className="font-medium">{node.category.name}</span>
              <span className="badge badge-ghost">
                {node.children.length} sub{node.children.length === 1 ? "" : "s"}
              </span>

              <BudgetField
                value={node.category.monthlyBudget}
                onSave={(v) => onSetBudget(node.category.id, v)}
                disabled={busy}
              />

              <div className="ml-auto">
                <RowActions
                  onEdit={() => onStartEdit(node.category.id)}
                  onDelete={() => onDelete(node.category.id)}
                  disabled={busy}
                />
              </div>
            </>
          )}
        </div>

        {expanded && (
          <div className="mt-3 ml-8 space-y-2">
            {node.children.map((child) => (
              <div
                key={child.id}
                className="flex items-center gap-2 py-1 border-b border-base-200 last:border-0"
              >
                {editingId === child.id ? (
                  <NameEditor
                    initial={child.name}
                    onSave={(name) => onRename(child.id, name)}
                    onCancel={onCancelEdit}
                  />
                ) : (
                  <>
                    <span className="font-medium">{child.name}</span>
                    <div className="ml-auto">
                      <RowActions
                        onEdit={() => onStartEdit(child.id)}
                        onDelete={() => onDelete(child.id)}
                        disabled={busy}
                      />
                    </div>
                  </>
                )}
              </div>
            ))}

            <form
              className="flex gap-2 pt-2"
              onSubmit={(e) => {
                e.preventDefault();
                const name = subName.trim();
                if (!name) return;
                onCreateSub(name);
                setSubName("");
              }}
            >
              <input
                type="text"
                className="input input-sm input-bordered flex-1"
                placeholder="New subcategory"
                value={subName}
                onChange={(e) => setSubName(e.target.value)}
              />
              <button
                type="submit"
                className="btn btn-sm btn-secondary btn-square"
                disabled={busy || !subName.trim()}
                aria-label="Add subcategory"
                title="Add subcategory"
              >
                <PlusIcon />
              </button>
            </form>
          </div>
        )}
      </div>
    </li>
  );
}

function BudgetField({
  value,
  onSave,
  disabled,
}: {
  value: string | null;
  onSave: (v: number | null) => void;
  disabled?: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value ?? "");

  if (!editing) {
    return (
      <button
        type="button"
        className={`badge badge-outline ${value ? "" : "opacity-50"}`}
        onClick={() => {
          setDraft(value ?? "");
          setEditing(true);
        }}
        title="Set monthly budget"
        disabled={disabled}
      >
        {value ? `${eur.format(Number(value))} / mo` : "no budget"}
      </button>
    );
  }

  return (
    <form
      className="flex items-center gap-1"
      onSubmit={(e) => {
        e.preventDefault();
        const trimmed = draft.trim();
        const next = trimmed === "" ? null : Number(trimmed);
        if (next != null && !Number.isFinite(next)) return;
        onSave(next);
        setEditing(false);
      }}
    >
      <label className="input input-sm input-bordered flex items-center gap-1 w-28">
        <input
          autoFocus
          type="number"
          step="0.01"
          min="0"
          inputMode="decimal"
          className="grow"
          placeholder="Budget"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
        />
        <span className="opacity-60">€</span>
      </label>
      <button
        type="submit"
        className="btn btn-primary btn-sm btn-square"
        aria-label="Save budget"
        title="Save budget"
      >
        <CheckIcon />
      </button>
      <button
        type="button"
        className="btn btn-ghost btn-sm btn-square"
        onClick={() => setEditing(false)}
        aria-label="Cancel"
        title="Cancel"
      >
        <XIcon />
      </button>
    </form>
  );
}

function NameEditor({
  initial,
  onSave,
  onCancel,
}: {
  initial: string;
  onSave: (name: string) => void;
  onCancel: () => void;
}) {
  const [val, setVal] = useState(initial);

  return (
    <form
      className="flex items-center gap-1 flex-1"
      onSubmit={(e) => {
        e.preventDefault();
        const trimmed = val.trim();
        if (!trimmed) return;
        if (trimmed === initial) {
          onCancel();
          return;
        }
        onSave(trimmed);
      }}
    >
      <input
        autoFocus
        className="input input-sm input-bordered flex-1"
        value={val}
        onChange={(e) => setVal(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Escape") onCancel();
        }}
      />
      <div className="join">
        <button
          type="submit"
          className="btn btn-primary btn-sm btn-square join-item"
          aria-label="Save"
          title="Save"
        >
          <CheckIcon />
        </button>
        <button
          type="button"
          className="btn btn-ghost btn-sm btn-square join-item"
          onClick={onCancel}
          aria-label="Cancel"
          title="Cancel"
        >
          <XIcon />
        </button>
      </div>
    </form>
  );
}

function RowActions({
  onEdit,
  onDelete,
  disabled,
}: {
  onEdit: () => void;
  onDelete: () => void;
  disabled?: boolean;
}) {
  return (
    <div className="join">
      <button
        type="button"
        className="btn btn-ghost btn-sm btn-square join-item"
        onClick={onEdit}
        disabled={disabled}
        aria-label="Rename"
        title="Rename"
      >
        <PencilIcon />
      </button>
      <DeleteButton onConfirm={onDelete} disabled={disabled} />
    </div>
  );
}

function DeleteButton({
  onConfirm,
  disabled,
}: {
  onConfirm: () => void;
  disabled?: boolean;
}) {
  const [confirming, setConfirming] = useState(false);

  if (!confirming) {
    return (
      <button
        type="button"
        className="btn btn-ghost btn-sm btn-square text-error join-item"
        onClick={() => setConfirming(true)}
        disabled={disabled}
        aria-label="Delete"
        title="Delete"
      >
        <TrashIcon />
      </button>
    );
  }

  return (
    <>
      <button
        type="button"
        className="btn btn-error btn-sm btn-square join-item"
        onClick={() => {
          onConfirm();
          setConfirming(false);
        }}
        aria-label="Confirm delete"
        title="Confirm delete"
      >
        <CheckIcon />
      </button>
      <button
        type="button"
        className="btn btn-ghost btn-sm btn-square join-item"
        onClick={() => setConfirming(false)}
        aria-label="Cancel"
        title="Cancel"
      >
        <XIcon />
      </button>
    </>
  );
}
