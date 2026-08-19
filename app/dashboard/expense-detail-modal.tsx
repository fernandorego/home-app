"use client";

import { useEffect, useRef } from "react";

const eur = new Intl.NumberFormat("pt-PT", { style: "currency", currency: "EUR" });

export type DetailRow = {
  id: string;
  description: string;
  date: string;
  categoryName: string;
  value: number;
  meta?: string;
};

export function categoryCode(name: string): string {
  // Strip combining diacritical marks (U+0300-U+036F) left behind by NFD
  // normalization, e.g. "Saúde" -> "Saude", so codes stay plain ASCII.
  const stripped = Array.from(name.normalize("NFD"))
    .filter((ch) => {
      const code = ch.codePointAt(0) ?? 0;
      return code < 0x0300 || code > 0x036f;
    })
    .join("");
  return stripped.slice(0, 3).toUpperCase();
}

export function ExpenseDetailModal({
  open,
  onClose,
  title,
  rows,
  loading,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  rows: DetailRow[];
  loading?: boolean;
}) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (open && !el.open) el.showModal();
    if (!open && el.open) el.close();
  }, [open]);

  return (
    <dialog ref={ref} className="modal" onClose={onClose}>
      <div className="modal-box max-w-lg">
        <h3 className="font-bold text-lg mb-3">{title}</h3>
        {loading ? (
          <div className="flex justify-center py-8">
            <span className="loading loading-spinner loading-md" />
          </div>
        ) : rows.length === 0 ? (
          <p className="opacity-60 py-4">Nothing here.</p>
        ) : (
          <>
            <ul className="divide-y divide-base-200 text-sm max-h-[60vh] overflow-y-auto">
              {rows.map((r) => (
                <li key={r.id} className="py-2 flex items-center gap-2">
                  <span className="badge badge-ghost badge-xs font-mono shrink-0">
                    {categoryCode(r.categoryName)}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="truncate font-medium">{r.description}</div>
                    <div className="text-xs opacity-60 truncate">
                      {r.date.slice(0, 10)}
                      {r.meta ? ` · ${r.meta}` : ""}
                    </div>
                  </div>
                  <span className="font-mono whitespace-nowrap">
                    {eur.format(r.value)}
                  </span>
                </li>
              ))}
            </ul>
            <div className="flex items-center justify-between pt-3 mt-1 border-t border-base-300 font-bold">
              <span>Total</span>
              <span className="font-mono">
                {eur.format(rows.reduce((s, r) => s + r.value, 0))}
              </span>
            </div>
          </>
        )}
        <div className="modal-action">
          <button type="button" className="btn" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
      <form method="dialog" className="modal-backdrop">
        <button>close</button>
      </form>
    </dialog>
  );
}
