"use client";

import { useEffect, useRef, useState } from "react";
import type { IncomeSourceTypeDTO } from "@/lib/api-client";
import { CheckIcon, PlusIcon, TrashIcon } from "@/components/icons";
import {
  computeTotal,
  emptyLine,
  fractionToPercent,
  lineNet,
  monthLabel,
  type LineFormState,
} from "./types";

const eur = new Intl.NumberFormat("pt-PT", { style: "currency", currency: "EUR" });

type Props = {
  open: boolean;
  month: string | null; // yyyy-mm; null while closed
  onMonthChange?: (month: string) => void; // only used in "create" mode
  initialLines: LineFormState[];
  types: IncomeSourceTypeDTO[];
  readOnly?: boolean;
  busy?: boolean;
  onClose: () => void;
  onSave: (lines: LineFormState[]) => void;
};

export function IncomeLinesDialog({
  open,
  month,
  onMonthChange,
  initialLines,
  types,
  readOnly,
  busy,
  onClose,
  onSave,
}: Props) {
  // The parent remounts this component (via a changing `key`) each time a
  // new edit/create/duplicate session starts, so this initial value is all
  // that's needed to seed the draft — no reset-on-prop-change effect, which
  // would otherwise wipe the draft on every keystroke in the month field.
  const ref = useRef<HTMLDialogElement>(null);
  const [lines, setLines] = useState<LineFormState[]>(initialLines);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (open && !el.open) el.showModal();
    if (!open && el.open) el.close();
  }, [open]);

  if (month == null) return null;

  const set = (key: string, patch: Partial<LineFormState>) =>
    setLines((prev) => prev.map((l) => (l.key === key ? { ...l, ...patch } : l)));

  const typeById = new Map(types.map((t) => [t.id, t]));
  const visibleTypes = types.filter((t) => t.visible);

  const total = computeTotal(lines);

  const canSave =
    !!month &&
    lines.length > 0 &&
    lines.every((l) => {
      if (!l.sourceTypeId) return false;
      const type = typeById.get(l.sourceTypeId);
      if (type?.requiresNote && !l.note.trim()) return false;
      return true;
    });

  return (
    <dialog ref={ref} className="modal" onClose={onClose}>
      <div className="modal-box max-w-3xl">
        <h3 className="font-bold text-lg mb-1">Income — {monthLabel(month)}</h3>
        {onMonthChange && (
          <label className="form-control w-40 mb-4">
            <span className="label-text text-xs mb-1">Month</span>
            <input
              type="month"
              className="input input-sm input-bordered"
              value={month}
              onChange={(e) => onMonthChange(e.target.value)}
              disabled={readOnly}
            />
          </label>
        )}

        <div className="space-y-2">
          {lines.length === 0 && (
            <p className="text-sm opacity-60 py-2">No lines yet — add one below.</p>
          )}
          {lines.map((line) => {
            const type = typeById.get(line.sourceTypeId);
            const noteRequired = !!type?.requiresNote;
            return (
              <div
                key={line.key}
                className="flex flex-wrap items-start gap-2 p-2 rounded-box bg-base-200"
              >
                <select
                  className="select select-sm select-bordered w-44"
                  value={line.sourceTypeId}
                  onChange={(e) => {
                    const nextType = typeById.get(e.target.value);
                    set(line.key, {
                      sourceTypeId: e.target.value,
                      // Only overwrite the % fields if they hadn't been
                      // touched from the previous default (0) — otherwise a
                      // deliberate override on type-switch would be lost.
                      irsPct: nextType ? fractionToPercent(Number(nextType.irsPct)) : line.irsPct,
                      ssPct: nextType ? fractionToPercent(Number(nextType.ssPct)) : line.ssPct,
                    });
                  }}
                  disabled={readOnly}
                >
                  <option value="">— Type —</option>
                  {visibleTypes.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>

                <label className="input input-sm input-bordered flex items-center gap-1 w-28">
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    inputMode="decimal"
                    className="grow"
                    placeholder="0.00"
                    value={line.grossAmount}
                    onChange={(e) => set(line.key, { grossAmount: e.target.value })}
                    readOnly={readOnly}
                  />
                  <span className="opacity-60">€</span>
                </label>

                <label className="input input-sm input-bordered flex items-center gap-1 w-20">
                  <span className="opacity-60 text-xs">IRS</span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    max="100"
                    inputMode="decimal"
                    className="grow w-8"
                    value={line.irsPct}
                    onChange={(e) => set(line.key, { irsPct: e.target.value })}
                    readOnly={readOnly}
                  />
                  <span className="opacity-60">%</span>
                </label>

                <label className="input input-sm input-bordered flex items-center gap-1 w-20">
                  <span className="opacity-60 text-xs">SS</span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    max="100"
                    inputMode="decimal"
                    className="grow w-8"
                    value={line.ssPct}
                    onChange={(e) => set(line.key, { ssPct: e.target.value })}
                    readOnly={readOnly}
                  />
                  <span className="opacity-60">%</span>
                </label>

                <input
                  type="text"
                  className={`input input-sm input-bordered flex-1 min-w-32 ${
                    noteRequired && !line.note.trim() ? "input-error" : ""
                  }`}
                  placeholder={noteRequired ? "Description (required)" : "Description (optional)"}
                  value={line.note}
                  onChange={(e) => set(line.key, { note: e.target.value })}
                  readOnly={readOnly}
                />

                <span className="font-mono text-sm self-center whitespace-nowrap w-24 text-right">
                  {eur.format(lineNet(line))}
                </span>

                {!readOnly && (
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm btn-square text-error"
                    onClick={() => setLines((prev) => prev.filter((l) => l.key !== line.key))}
                    aria-label="Remove line"
                    title="Remove line"
                  >
                    <TrashIcon />
                  </button>
                )}
              </div>
            );
          })}
        </div>

        {!readOnly && (
          <button
            type="button"
            className="btn btn-sm btn-ghost gap-1 mt-2"
            onClick={() => setLines((prev) => [...prev, emptyLine()])}
          >
            <PlusIcon /> Add line
          </button>
        )}

        <div className="flex items-center justify-between mt-4 pt-3 border-t border-base-300">
          <span className="font-medium">Total</span>
          <span className="font-mono font-semibold text-lg">{eur.format(total)}</span>
        </div>

        <div className="modal-action">
          <button type="button" className="btn btn-ghost" onClick={onClose}>
            Cancel
          </button>
          {!readOnly && (
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => onSave(lines)}
              disabled={!canSave || busy}
            >
              {busy ? <span className="loading loading-spinner loading-xs" /> : <CheckIcon />}
              Save
            </button>
          )}
        </div>
      </div>
      <form method="dialog" className="modal-backdrop">
        <button>close</button>
      </form>
    </dialog>
  );
}
