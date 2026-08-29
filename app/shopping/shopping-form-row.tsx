"use client";

import type { RefObject } from "react";
import { CheckIcon, PlusIcon, XIcon } from "@/components/icons";
import type { ListCategoryDTO } from "@/lib/api-client";
import {
  PRIORITIES,
  PRIORITY_LABEL,
  PRIORITY_TEXT_COLOR,
  PriorityIcon,
} from "@/components/priority";
import { RECURRENCES, RECURRENCE_LABEL, type FormState } from "./types";

type Props = {
  value: FormState;
  onChange: (next: FormState) => void;
  onSubmit: () => void;
  onCancel?: () => void;
  busy?: boolean;
  isEdit?: boolean;
  categories: ListCategoryDTO[];
  firstInputRef?: RefObject<HTMLInputElement | null>;
};

export function ShoppingFormRow({
  value,
  onChange,
  onSubmit,
  onCancel,
  busy,
  isEdit,
  categories,
  firstInputRef,
}: Props) {
  const set = <K extends keyof FormState>(key: K, v: FormState[K]) =>
    onChange({ ...value, [key]: v });

  const canSubmit = !!value.name.trim() && !busy;

  return (
    <tr className={isEdit ? "bg-warning/10" : "bg-base-200"}>
      {/* Bulk-selection column has nothing to select for a create/edit row. */}
      <td />
      <td>
        <input
          ref={firstInputRef}
          type="text"
          className="input input-sm input-bordered w-full min-w-32"
          placeholder="Item"
          value={value.name}
          onChange={(e) => set("name", e.target.value)}
        />
      </td>
      <td>
        <select
          className="select select-sm select-bordered"
          value={value.categoryId}
          onChange={(e) => set("categoryId", e.target.value)}
        >
          <option value="">No category</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
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
        <div className="flex items-center gap-1">
          <PriorityIcon
            priority={value.priority}
            className={`h-4 w-4 shrink-0 ${PRIORITY_TEXT_COLOR[value.priority]}`}
          />
          <select
            className="select select-sm select-bordered"
            value={value.priority}
            onChange={(e) => set("priority", e.target.value as FormState["priority"])}
          >
            {PRIORITIES.map((p) => (
              <option key={p} value={p}>
                {PRIORITY_LABEL[p]}
              </option>
            ))}
          </select>
        </div>
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
