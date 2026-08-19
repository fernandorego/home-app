"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { apiFetch, type ReimburserDTO } from "@/lib/api-client";
import { CheckIcon, PencilIcon, PlusIcon, TrashIcon, XIcon } from "@/components/icons";

export function ReimbursersAdmin() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["reimbursers"],
    queryFn: () => apiFetch<ReimburserDTO[]>("/api/reimbursers"),
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: ["reimbursers"] });

  const create = useMutation({
    mutationFn: (name: string) =>
      apiFetch<ReimburserDTO>("/api/reimbursers", {
        method: "POST",
        body: JSON.stringify({ name }),
      }),
    onSuccess: () => {
      invalidate();
      toast.success("Reimburser created");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const rename = useMutation({
    mutationFn: ({ id, name }: { id: string; name: string }) =>
      apiFetch<ReimburserDTO>(`/api/reimbursers/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ name }),
      }),
    onSuccess: () => invalidate(),
    onError: (err: Error) => toast.error(err.message),
  });

  const remove = useMutation({
    mutationFn: (id: string) =>
      apiFetch<void>(`/api/reimbursers/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      invalidate();
      toast.success("Deleted");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const [newName, setNewName] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);

  if (isLoading) return <span className="loading loading-spinner loading-md" />;

  const busy = create.isPending || rename.isPending || remove.isPending;
  const reimbursers = data ?? [];

  return (
    <div className="space-y-4">
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
              placeholder="New reimburser name"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
            />
            <button
              type="submit"
              className="btn btn-primary btn-square"
              disabled={create.isPending || !newName.trim()}
              aria-label="Add reimburser"
              title="Add reimburser"
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

      {reimbursers.length === 0 && (
        <p className="text-center opacity-60">No reimbursers yet.</p>
      )}

      <ul className="space-y-2">
        {reimbursers.map((r) => (
          <li
            key={r.id}
            className="card bg-base-100 border border-base-300"
          >
            <div className="card-body py-2 flex-row items-center gap-2">
              {editingId === r.id ? (
                <NameEditor
                  initial={r.name}
                  onSave={(name) =>
                    rename.mutate(
                      { id: r.id, name },
                      { onSuccess: () => setEditingId(null) },
                    )
                  }
                  onCancel={() => setEditingId(null)}
                />
              ) : (
                <>
                  <span className="font-medium">{r.name}</span>
                  <div className="ml-auto join">
                    <button
                      type="button"
                      className="btn btn-ghost btn-sm btn-square join-item"
                      onClick={() => setEditingId(r.id)}
                      disabled={busy}
                      aria-label="Rename"
                      title="Rename"
                    >
                      <PencilIcon />
                    </button>
                    <DeleteButton
                      onConfirm={() => remove.mutate(r.id)}
                      disabled={busy}
                    />
                  </div>
                </>
              )}
            </div>
          </li>
        ))}
      </ul>
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
