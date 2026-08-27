"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { apiFetch, type IncomeSourceTypeDTO } from "@/lib/api-client";
import {
  CheckIcon,
  EyeIcon,
  EyeOffIcon,
  PencilIcon,
  PlusIcon,
  TrashIcon,
  XIcon,
} from "@/components/icons";

type PatchInput = Partial<{
  name: string;
  irsPct: number;
  ssPct: number;
  requiresNote: boolean;
  visible: boolean;
}>;

// Percentages are stored as fractions (0.23) but edited as whole numbers
// (23) — same convention used on the Income page itself.
const percentToFraction = (v: string) => (v ? Number(v) / 100 : 0);
// Rounds to 2 decimal places and drops trailing zeros (23.4500 -> "23.45",
// 23 -> "23") so a whole-number rate doesn't display as "23.00%".
const formatPct = (fraction: number) => String(Number((fraction * 100).toFixed(2)));

export function IncomeTypesAdmin() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["income-types"],
    queryFn: () => apiFetch<IncomeSourceTypeDTO[]>("/api/income-types"),
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: ["income-types"] });

  const create = useMutation({
    mutationFn: (input: { name: string; irsPct: number; ssPct: number }) =>
      apiFetch<IncomeSourceTypeDTO>("/api/income-types", {
        method: "POST",
        body: JSON.stringify(input),
      }),
    onSuccess: () => {
      invalidate();
      toast.success("Income type created");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const patch = useMutation({
    mutationFn: ({ id, input }: { id: string; input: PatchInput }) =>
      apiFetch<IncomeSourceTypeDTO>(`/api/income-types/${id}`, {
        method: "PATCH",
        body: JSON.stringify(input),
      }),
    onSuccess: () => invalidate(),
    onError: (err: Error) => toast.error(err.message),
  });

  const remove = useMutation({
    mutationFn: (id: string) =>
      apiFetch<void>(`/api/income-types/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      invalidate();
      toast.success("Deleted");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const [newName, setNewName] = useState("");
  const [newIrs, setNewIrs] = useState("");
  const [newSs, setNewSs] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);

  if (isLoading) return <span className="loading loading-spinner loading-md" />;

  const busy = create.isPending || patch.isPending || remove.isPending;
  const types = data ?? [];

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
              create.mutate(
                { name, irsPct: percentToFraction(newIrs), ssPct: percentToFraction(newSs) },
                {
                  onSuccess: () => {
                    setNewName("");
                    setNewIrs("");
                    setNewSs("");
                  },
                },
              );
            }}
          >
            <input
              type="text"
              className="input input-bordered flex-1 min-w-32"
              placeholder="New income type name"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
            />
            <PctInput label="IRS" value={newIrs} onChange={setNewIrs} />
            <PctInput label="SS" value={newSs} onChange={setNewSs} />
            <button
              type="submit"
              className="btn btn-primary btn-square"
              disabled={create.isPending || !newName.trim()}
              aria-label="Add income type"
              title="Add income type"
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

      {types.length === 0 && (
        <p className="text-center opacity-60">No income types yet.</p>
      )}

      <ul className="space-y-2">
        {types.map((t) => (
          <li key={t.id} className="card bg-base-100 border border-base-300">
            <div className="card-body py-2 flex-row flex-wrap items-center gap-2">
              {editingId === t.id ? (
                <NameEditor
                  initial={t.name}
                  onSave={(name) =>
                    patch.mutate(
                      { id: t.id, input: { name } },
                      { onSuccess: () => setEditingId(null) },
                    )
                  }
                  onCancel={() => setEditingId(null)}
                />
              ) : (
                <span className={`font-medium ${t.visible ? "" : "opacity-50"}`}>
                  {t.name}
                </span>
              )}

              <PctField
                label="IRS"
                value={t.irsPct}
                onSave={(v) => patch.mutate({ id: t.id, input: { irsPct: v } })}
                disabled={busy}
              />
              <PctField
                label="SS"
                value={t.ssPct}
                onSave={(v) => patch.mutate({ id: t.id, input: { ssPct: v } })}
                disabled={busy}
              />

              <button
                type="button"
                className={`btn btn-xs ${t.requiresNote ? "btn-secondary" : "btn-ghost"}`}
                onClick={() =>
                  patch.mutate({ id: t.id, input: { requiresNote: !t.requiresNote } })
                }
                disabled={busy}
                title="Always require a description on this rubric's lines"
              >
                Requires note
              </button>

              <button
                type="button"
                className={`btn btn-ghost btn-sm btn-square ${t.visible ? "" : "text-warning"}`}
                onClick={() => patch.mutate({ id: t.id, input: { visible: !t.visible } })}
                disabled={busy}
                aria-label={t.visible ? "Hide from Income page" : "Show on Income page"}
                title={t.visible ? "Visible — click to hide" : "Hidden — click to show"}
              >
                {t.visible ? <EyeIcon /> : <EyeOffIcon />}
              </button>

              <div className="ml-auto join">
                <button
                  type="button"
                  className="btn btn-ghost btn-sm btn-square join-item"
                  onClick={() => setEditingId(t.id)}
                  disabled={busy}
                  aria-label="Rename"
                  title="Rename"
                >
                  <PencilIcon />
                </button>
                <DeleteButton onConfirm={() => remove.mutate(t.id)} disabled={busy} />
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

function PctInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <label className="input input-bordered flex items-center gap-1 w-24">
      <span className="opacity-60 text-xs">{label}</span>
      <input
        type="number"
        step="0.01"
        min="0"
        max="100"
        inputMode="decimal"
        className="grow w-10"
        placeholder="0"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
      <span className="opacity-60">%</span>
    </label>
  );
}

function PctField({
  label,
  value,
  onSave,
  disabled,
}: {
  label: string;
  value: string;
  onSave: (v: number) => void;
  disabled?: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(formatPct(Number(value)));

  if (!editing) {
    return (
      <button
        type="button"
        className="badge badge-outline"
        onClick={() => {
          setDraft(formatPct(Number(value)));
          setEditing(true);
        }}
        title={`${label}: click to change`}
        disabled={disabled}
      >
        {label} {formatPct(Number(value))}%
      </button>
    );
  }

  return (
    <form
      className="flex items-center gap-1"
      onSubmit={(e) => {
        e.preventDefault();
        onSave(percentToFraction(draft));
        setEditing(false);
      }}
    >
      <PctInput label={label} value={draft} onChange={setDraft} />
      <button
        type="submit"
        className="btn btn-primary btn-sm btn-square"
        aria-label={`Save ${label}`}
        title={`Save ${label}`}
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
      className="flex items-center gap-1"
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
        className="input input-sm input-bordered"
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
