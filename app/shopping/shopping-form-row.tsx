"use client";

import { CheckIcon, PlusIcon, XIcon } from "@/components/icons";
import { RECURRENCES, RECURRENCE_LABEL, type FormState } from "./types";

type Props = {
  value: FormState;
  onChange: (next: FormState) => void;
  onSubmit: () => void;
  onCancel?: () => void;
  busy?: boolean;
  isEdit?: boolean;
};

export function ShoppingFormRow({ value, onChange, onSubmit, onCancel, busy, isEdit }: Props) {
  const set = <K extends keyof FormState>(key: K, v: FormState[K]) =>
    onChange({ ...value, [key]: v });

  const canSubmit = !!value.name.trim() && !busy;

  return (
    <tr className={isEdit ? "bg-warning/10" : "bg-base-200"}>
      <td>
        <input
          type="text"
          className="input input-sm input-bordered w-full min-w-32"
          placeholder="Item"
          value={value.name}
          onChange={(e) => set("name", e.target.value)}
        />
      </td>
      <td>
        <input
          type="text"
          className="input input-sm input-bordered w-24"
          placeholder="e.g. 2 kg"
          value={value.quantity}
          onChange={(e) => set("quantity", e.target.value)}
        />
      </td>
      <td>
        <input
          type="date"
          className="input input-sm input-bordered"
          value={value.dueDate}
          onChange={(e) => set("dueDate", e.target.value)}
        />
      </td>
      <td>
        <select
          className="select select-sm select-bordered"
          value={value.recurrence}
          onChange={(e) => set("recurrence", e.target.value as FormState["recurrence"])}
        >
          <option value="">One-off</option>
          {RECURRENCES.map((r) => (
            <option key={r} value={r}>
              {RECURRENCE_LABEL[r]}
            </option>
          ))}
        </select>
      </td>
      <td>
        <div className="join">
          <button
            type="button"
            className="btn btn-sm btn-primary btn-square join-item"
            onClick={onSubmit}
            disabled={!canSubmit}
            aria-label={isEdit ? "Save" : "Add item"}
            title={isEdit ? "Save" : "Add item"}
          >
            {busy ? (
              <span className="loading loading-spinner loading-xs" />
            ) : isEdit ? (
              <CheckIcon />
            ) : (
              <PlusIcon />
            )}
          </button>
          {onCancel && (
            <button
              type="button"
              className="btn btn-sm btn-ghost btn-square join-item"
              onClick={onCancel}
              disabled={busy}
              aria-label="Cancel"
              title="Cancel"
            >
              <XIcon />
            </button>
          )}
        </div>
      </td>
    </tr>
  );
}
