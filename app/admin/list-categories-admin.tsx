"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { apiFetch, type ListCategoryDTO } from "@/lib/api-client";
import type { ListCategoryKind } from "@/lib/validators";
import {
  CheckIcon,
  EyeIcon,
  EyeOffIcon,
  PencilIcon,
  PlusIcon,
  TrashIcon,
  XIcon,
} from "@/components/icons";

const KIND_TABS: Array<{ value: ListCategoryKind; label: string }> = [
  { value: "TASK", label: "To-Do" },
  { value: "SHOPPING", label: "Shopping" },
];

export function ListCategoriesAdmin() {
  const [kind, setKind] = useState<ListCategoryKind>("TASK");
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["list-categories", kind],
    queryFn: () => apiFetch<ListCategoryDTO[]>(`/api/list-categories?kind=${kind}`),
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: ["list-categories"] });

  const create = useMutation({
    mutationFn: (name: string) =>
      apiFetch<ListCategoryDTO>("/api/list-categories", {
        method: "POST",
        body: JSON.stringify({ kind, name }),
      }),
    onSuccess: () => {
      invalidate();
      toast.success("Category created");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const patch = useMutation({
    mutationFn: ({ id, input }: { id: string; input: Partial<{ name: string; visible: boolean }> }) =>
      apiFetch<ListCategoryDTO>(`/api/list-categories/${id}`, {
        method: "PATCH",
        body: JSON.stringify(input),
      }),
    onSuccess: () => invalidate(),
    onError: (err: Error) => toast.error(err.message),
  });

  const remove = useMutation({
    mutationFn: (id: string) =>
      apiFetch<void>(`/api/list-categories/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      invalidate();
      toast.success("Deleted");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const [newName, setNewName] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);

  const busy = create.isPending || patch.isPending || remove.isPending;
  const categories = data ?? [];

  return (
    <div className="space-y-4">
      <div className="tabs tabs-boxed w-fit">
        {KIND_TABS.map((t) => (
          <button
            key={t.value}
            type="button"
            className={`tab ${kind === t.value ? "tab-active" : ""}`}
            onClick={() => setKind(t.value)}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="card bg-base-200">
        <div className="card-body py-4">
          <form
            className="flex flex-wrap gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              const name = newName.trim();
              if (!name) return;
              create.mutate(name, { onSuccess: () => setNewName("") });
            }}
          >
            <input
              type="text"
              className="input input-bordered flex-1 min-w-32"
              placeholder="New category name"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
            />
            <button
              type="submit"
              className="btn btn-primary btn-square"
              disabled={create.isPending || !newName.trim()}
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

      {isLoading ? (
        <span className="loading loading-spinner loading-md" />
      ) : categories.length === 0 ? (
        <p className="text-center opacity-60">No categories yet.</p>
      ) : (
        <ul className="space-y-2">
          {categories.map((c) => (
            <li key={c.id} className="card bg-base-100 border border-base-300">
              <div className="card-body py-2 flex-row items-center gap-2">
                {editingId === c.id ? (
                  <NameEditor
                    initial={c.name}
                    onSave={(name) =>
                      patch.mutate(
                        { id: c.id, input: { name } },
                        { onSuccess: () => setEditingId(null) },
                      )
                    }
                    onCancel={() => setEditingId(null)}
                  />
                ) : (
                  <span className={`font-medium ${c.visible ? "" : "opacity-50"}`}>
                    {c.name}
                  </span>
                )}

                <button
                  type="button"
                  className={`btn btn-ghost btn-sm btn-square ml-auto ${c.visible ? "" : "text-warning"}`}
                  onClick={() => patch.mutate({ id: c.id, input: { visible: !c.visible } })}
                  disabled={busy}
                  aria-label={c.visible ? "Hide" : "Show"}
                  title={c.visible ? "Visible — click to hide" : "Hidden — click to show"}
                >
                  {c.visible ? <EyeIcon /> : <EyeOffIcon />}
                </button>

                <div className="join">
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm btn-square join-item"
                    onClick={() => setEditingId(c.id)}
                    disabled={busy}
                    aria-label="Rename"
                    title="Rename"
                  >
                    <PencilIcon />
                  </button>
                  <DeleteButton onConfirm={() => remove.mutate(c.id)} disabled={busy} />
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
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
