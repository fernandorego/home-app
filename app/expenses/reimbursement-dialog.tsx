"use client";

import { useEffect, useRef, useState } from "react";
import type { ExpenseDTO } from "@/lib/api-client";
import { CheckIcon, XIcon } from "@/components/icons";
import { toIsoDate, todayIso, type ReimbursementInput } from "./types";

export type { ReimbursementInput };

type Props = {
  open: boolean;
  expense: ExpenseDTO | null;
  readOnly?: boolean;
  onClose: () => void;
  onSave: (input: ReimbursementInput) => void;
};

const eur = new Intl.NumberFormat("pt-PT", { style: "currency", currency: "EUR" });

export function ReimbursementDialog({
  open,
  expense,
  readOnly,
  onClose,
  onSave,
}: Props) {
  const ref = useRef<HTMLDialogElement>(null);

  const [amount, setAmount] = useState(
    expense?.reimbursementAmount ? String(expense.reimbursementAmount) : "",
  );
  const [reimburser, setReimburser] = useState(expense?.reimburser ?? "");
  const [confirmedAt, setConfirmedAt] = useState(
    expense?.reimbursedAt ? toIsoDate(new Date(expense.reimbursedAt)) : "",
  );

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (open && !el.open) el.showModal();
    if (!open && el.open) el.close();
  }, [open]);

  if (!expense) return null;

  const expenseValue = Number(expense.value);
  const refund = Number(amount || 0);
  const partialPct =
    expenseValue > 0 && refund > 0
      ? Math.min(100, (refund / expenseValue) * 100)
      : 0;

  const isReceived = !!confirmedAt;
  const hasAmount = refund > 0;
  const overFull = refund > expenseValue;

  const buildInput = (overrides?: Partial<ReimbursementInput>): ReimbursementInput => ({
    reimbursementAmount: refund > 0 ? refund : null,
    reimburser: reimburser.trim() || null,
    reimbursedAt: confirmedAt
      ? new Date(`${confirmedAt}T12:00:00`).toISOString()
      : null,
    ...overrides,
  });

  return (
    <dialog ref={ref} className="modal" onClose={onClose}>
      <div className="modal-box max-w-md">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 mb-1">
          <div className="min-w-0">
            <h3 className="font-bold text-lg">Reimbursement</h3>
            <p className="text-sm opacity-70 truncate">
              {expense.description}
            </p>
          </div>
          <span
            className={`badge ${
              isReceived
                ? "badge-success"
                : hasAmount
                  ? "badge-warning"
                  : "badge-ghost"
            } shrink-0`}
          >
            {isReceived ? "Received" : hasAmount ? "Awaiting" : "None"}
          </span>
        </div>
        <div className="text-xs opacity-60 mb-5">
          Total expense: <span className="font-mono">{eur.format(expenseValue)}</span>
        </div>

        <div className="space-y-4">
          {/* Amount */}
          <div className="form-control">
            <div className="flex items-center justify-between mb-1">
              <span className="label-text font-medium">Amount expected back</span>
              {!readOnly && (
                <button
                  type="button"
                  className="btn btn-xs btn-ghost"
                  onClick={() => setAmount(expenseValue.toFixed(2))}
                  disabled={refund === expenseValue}
                  title="Set to 100% of the expense"
                >
                  Use 100%
                </button>
              )}
            </div>
            <label className="input input-bordered flex items-center gap-2">
              <input
                type="number"
                step="0.01"
                min="0"
                inputMode="decimal"
                className="grow"
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                readOnly={readOnly}
              />
              <span className="opacity-60">€</span>
            </label>
            {/* Coverage bar */}
            <div className="mt-2">
              <div className="flex justify-between text-xs mb-1">
                <span className="opacity-60">{partialPct.toFixed(0)}% of expense</span>
                {overFull && (
                  <span className="text-error">
                    Above the expense ({eur.format(refund - expenseValue)} extra)
                  </span>
                )}
              </div>
              <progress
                className={`progress ${
                  overFull
                    ? "progress-error"
                    : isReceived
                      ? "progress-success"
                      : "progress-warning"
                } w-full`}
                value={Math.min(refund, expenseValue)}
                max={Math.max(expenseValue, 0.01)}
              />
            </div>
          </div>

          {/* Reimburser */}
          <label className="form-control">
            <span className="label-text font-medium mb-1">Reimbursed by</span>
            <input
              type="text"
              className="input input-bordered"
              placeholder="e.g. Acme Corp, Allianz, …"
              value={reimburser}
              onChange={(e) => setReimburser(e.target.value)}
              readOnly={readOnly}
            />
          </label>

          {/* Confirmation date */}
          <div className="form-control">
            <div className="flex items-center justify-between mb-1">
              <span className="label-text font-medium">Confirmation date</span>
              {!readOnly && !isReceived && hasAmount && (
                <button
                  type="button"
                  className="btn btn-xs btn-ghost"
                  onClick={() => setConfirmedAt(todayIso())}
                  title="Confirm received today"
                >
                  Today
                </button>
              )}
              {!readOnly && isReceived && (
                <button
                  type="button"
                  className="btn btn-xs btn-ghost"
                  onClick={() => setConfirmedAt("")}
                  title="Mark as still awaiting"
                >
                  Clear date
                </button>
              )}
            </div>
            <input
              type="date"
              className="input input-bordered"
              value={confirmedAt}
              onChange={(e) => setConfirmedAt(e.target.value)}
              readOnly={readOnly}
            />
            <span className="label-text-alt mt-1 opacity-60">
              {isReceived
                ? `Received on ${confirmedAt}.`
                : "Empty = still awaiting."}
            </span>
          </div>
        </div>

        {/* Footer */}
        <div className="modal-action mt-6 justify-between">
          {!readOnly ? (
            <button
              type="button"
              className="btn btn-ghost text-error"
              onClick={() =>
                onSave({
                  reimbursementAmount: null,
                  reimburser: null,
                  reimbursedAt: null,
                })
              }
              title="Remove reimbursement entirely"
            >
              <XIcon /> Clear
            </button>
          ) : (
            <span />
          )}
          <div className="flex gap-2">
            <button type="button" className="btn btn-ghost" onClick={onClose}>
              Cancel
            </button>
            {!readOnly && (
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => onSave(buildInput())}
                disabled={!hasAmount && !isReceived && refund === 0 && reimburser.trim() === ""}
              >
                <CheckIcon /> Save
              </button>
            )}
          </div>
        </div>
      </div>
      <form method="dialog" className="modal-backdrop">
        <button>close</button>
      </form>
    </dialog>
  );
}
