"use client";

import { useMemo } from "react";
import type { CategoryDTO } from "@/lib/api-client";
import { CheckIcon, MinusIcon, PlusIcon, XIcon } from "@/components/icons";
import type { FormState } from "./types";

const eur = new Intl.NumberFormat("pt-PT", { style: "currency", currency: "EUR" });

type Props = {
  value: FormState;
  onChange: (next: FormState) => void;
  categories: CategoryDTO[];
  onSubmit: () => void;
  onCancel?: () => void;
  busy?: boolean;
  isEdit?: boolean;
  onReimbClick?: () => void;
};

export function ExpenseFormRow({
  value,
  onChange,
  categories,
  onSubmit,
  onCancel,
  busy,
  isEdit,
  onReimbClick,
}: Props) {
  const tops = useMemo(
    () => categories.filter((c) => !c.parentId).sort((a, b) => a.name.localeCompare(b.name)),
    [categories],
  );
  const subs = useMemo(
    () =>
      categories
        .filter((c) => c.parentId === value.categoryId)
        .sort((a, b) => a.name.localeCompare(b.name)),
    [categories, value.categoryId],
  );

  const set = <K extends keyof FormState>(key: K, v: FormState[K]) =>
    onChange({ ...value, [key]: v });

  const canSubmit =
    !!value.value.trim() &&
    !!value.description.trim() &&
    !!value.categoryId &&
    !!value.date &&
    !busy;

  const hasReimb = value.reimb !== null;

  return (
    <tr className={isEdit ? "bg-warning/10" : "bg-base-200"}>
      <td>
        <input
          type="date"
          className="input input-sm input-bordered"
          value={value.date}
          onChange={(e) => set("date", e.target.value)}
        />
      </td>
      <td>
        <label className="input input-sm input-bordered flex items-center gap-1 w-28">
          <input
            type="number"
            step="0.01"
            inputMode="decimal"
            className="grow"
            placeholder="0.00"
            value={value.value}
            onChange={(e) => set("value", e.target.value)}
          />
          <span className="opacity-60">€</span>
        </label>
      </td>
      <td>
        <input
          type="text"
          className="input input-sm input-bordered w-full min-w-32"
          placeholder="Description"
          value={value.description}
          onChange={(e) => set("description", e.target.value)}
        />
      </td>
      <td>
        <select
          className="select select-sm select-bordered w-full min-w-32"
          value={value.categoryId}
          onChange={(e) =>
            onChange({ ...value, categoryId: e.target.value, subcategoryId: "" })
          }
        >
          <option value="">— Category —</option>
          {tops.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </td>
      <td>
        <select
          className="select select-sm select-bordered w-full min-w-32"
          value={value.subcategoryId}
          onChange={(e) => set("subcategoryId", e.target.value)}
          disabled={!value.categoryId || subs.length === 0}
        >
          <option value="">—</option>
          {subs.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </td>
      <td className="text-center">
        <input
          type="checkbox"
          className="toggle toggle-sm"
          checked={value.isJoint}
          onChange={(e) => set("isJoint", e.target.checked)}
          aria-label="Joint expense"
        />
      </td>
      <td>
        <div className="flex items-center gap-1.5">
          {!hasReimb ? (
            <button
              type="button"
              className="btn btn-xs btn-ghost btn-square text-base-content/40 hover:text-success hover:bg-success/10"
              onClick={() =>
                set("reimb", {
                  reimbursementAmount: Number(value.value) || 0,
                  reimburser: null,
                  reimbursedAt: null,
                })
              }
              aria-label="Add reimbursement"
              title="Mark as reimbursable (100% of value)"
            >
              <PlusIcon />
            </button>
          ) : (
            <>
              <button
                type="button"
                className="btn btn-xs btn-ghost btn-square text-base-content/40 hover:text-error hover:bg-error/10"
                onClick={() => set("reimb", null)}
                aria-label="Remove reimbursement"
                title="Remove reimbursement"
              >
                <MinusIcon />
              </button>
              <button
                type="button"
                className="badge badge-sm badge-warning cursor-pointer"
                onClick={onReimbClick}
                title="Edit reimbursement details"
              >
                {value.reimb!.reimbursementAmount != null
                  ? eur.format(value.reimb!.reimbursementAmount)
                  : "—"}
              </button>
            </>
          )}
        </div>
      </td>
      <td>
        <div className="join">
          <button
            type="button"
            className="btn btn-sm btn-primary btn-square join-item"
            onClick={onSubmit}
            disabled={!canSubmit}
            aria-label={isEdit ? "Save" : "Add expense"}
            title={isEdit ? "Save" : "Add expense"}
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
