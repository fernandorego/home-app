"use client";

import { CheckIcon, PlusIcon, XIcon } from "@/components/icons";
import { RUBRIC_KEYS, computeTotal, type FormState } from "./types";

const eur = new Intl.NumberFormat("pt-PT", { style: "currency", currency: "EUR" });

type Props = {
  value: FormState;
  onChange: (next: FormState) => void;
  onSubmit: () => void;
  onCancel?: () => void;
  busy?: boolean;
  isEdit?: boolean;
  personLabel: string;
};

export function IncomeFormRow({
  value,
  onChange,
  onSubmit,
  onCancel,
  busy,
  isEdit,
  personLabel,
}: Props) {
  const set = <K extends keyof FormState>(key: K, v: FormState[K]) =>
    onChange({ ...value, [key]: v });

  const canSubmit = !!value.month && !!value.vencimento.trim() && !busy;

  return (
    <tr className={isEdit ? "bg-warning/10" : "bg-base-200"}>
      <td>
        <input
          type="month"
          className="input input-sm input-bordered w-32"
          value={value.month}
          onChange={(e) => set("month", e.target.value)}
        />
      </td>
      <td className="opacity-70">{personLabel}</td>
      <td>
        <label className="input input-sm input-bordered flex items-center gap-1 w-24">
          <input
            type="number"
            step="0.01"
            inputMode="decimal"
            className="grow"
            placeholder="0.00"
            value={value.vencimento}
            onChange={(e) => set("vencimento", e.target.value)}
          />
          <span className="opacity-60">€</span>
        </label>
      </td>
      {RUBRIC_KEYS.map((key) => (
        <td key={key}>
          <label className="input input-sm input-bordered flex items-center gap-1 w-24">
            <input
              type="number"
              step="0.01"
              inputMode="decimal"
              className="grow"
              placeholder="0.00"
              value={value[key]}
              onChange={(e) => set(key, e.target.value)}
            />
            <span className="opacity-60">€</span>
          </label>
        </td>
      ))}
      <td className="font-mono font-semibold whitespace-nowrap">
        {eur.format(computeTotal(value))}
      </td>
      <td>
        <div className="join">
          <button
            type="button"
            className="btn btn-sm btn-primary btn-square join-item"
            onClick={onSubmit}
            disabled={!canSubmit}
            aria-label={isEdit ? "Save" : "Add income entry"}
            title={isEdit ? "Save" : "Add income entry"}
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
