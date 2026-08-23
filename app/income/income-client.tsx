"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import toast from "react-hot-toast";
import {
  apiFetch,
  type IncomeEntryDTO,
  type IncomeSourceTypeDTO,
} from "@/lib/api-client";
import { CopyIcon, PencilIcon, PlusIcon, TrashIcon } from "@/components/icons";
import { IncomeLinesDialog } from "./income-lines-dialog";
import {
  currentMonthIso,
  emptyLine,
  monthLabel,
  newLineKey,
  type LineFormState,
} from "./types";

const eur = new Intl.NumberFormat("pt-PT", { style: "currency", currency: "EUR" });

function entryToLines(entry: IncomeEntryDTO): LineFormState[] {
  return entry.lines.map((l) => ({
    key: newLineKey(),
    id: l.id,
    sourceTypeId: l.sourceTypeId,
    grossAmount: String(l.grossAmount),
    irsPct: String(l.irsPct * 100),
    ssPct: String(l.ssPct * 100),
    note: l.note ?? "",
  }));
}

function linesToInput(lines: LineFormState[]) {
  return lines.map((l) => ({
    sourceTypeId: l.sourceTypeId,
    grossAmount: Number(l.grossAmount || 0),
    irsPct: Number(l.irsPct || 0) / 100,
    ssPct: Number(l.ssPct || 0) / 100,
    note: l.note.trim() || null,
  }));
}

// "Duplicate" is just a create pre-filled from another month's lines —
// the user still picks the target month and can tweak anything (e.g. a
// variable km/allowance amount) before it's actually saved.
type DialogState =
  | { mode: "create"; key: number; month: string; lines: LineFormState[] }
  | { mode: "edit"; key: number; entry: IncomeEntryDTO; month: string; lines: LineFormState[] }
  | null;

export function IncomeClient() {
  const { data: session } = useSession();
  const qc = useQueryClient();
  const [year, setYear] = useState(() => new Date().getFullYear());

  const entriesQ = useQuery({
    queryKey: ["income", year],
    queryFn: () => apiFetch<IncomeEntryDTO[]>(`/api/income?year=${year}`),
  });
  const typesQ = useQuery({
    queryKey: ["income-types"],
    queryFn: () => apiFetch<IncomeSourceTypeDTO[]>("/api/income-types"),
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: ["income"] });

  const [dialog, setDialog] = useState<DialogState>(null);
  const [dialogKeySeq, setDialogKeySeq] = useState(0);
  const nextDialogKey = () => {
    setDialogKeySeq((k) => k + 1);
    return dialogKeySeq + 1;
  };

  const createM = useMutation({
    mutationFn: (input: { month: string; lines: LineFormState[] }) =>
      apiFetch<IncomeEntryDTO>("/api/income", {
        method: "POST",
        body: JSON.stringify({ month: `${input.month}-01`, lines: linesToInput(input.lines) }),
      }),
    onSuccess: () => {
      invalidate();
      toast.success("Income entry added");
      setDialog(null);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const updateM = useMutation({
    mutationFn: ({ id, lines }: { id: string; lines: LineFormState[] }) =>
      apiFetch<IncomeEntryDTO>(`/api/income/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ lines: linesToInput(lines) }),
      }),
    onSuccess: () => {
      invalidate();
      toast.success("Updated");
      setDialog(null);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const deleteM = useMutation({
    mutationFn: (id: string) =>
      apiFetch<void>(`/api/income/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      invalidate();
      toast.success("Deleted");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const entries = entriesQ.data ?? [];
  const types = typesQ.data ?? [];
  const userId = session?.user?.id;

  const openCreate = () => {
    const month = currentMonthIso();
    setDialog({ mode: "create", key: nextDialogKey(), month, lines: [emptyLine()] });
  };
  const openEdit = (entry: IncomeEntryDTO) => {
    setDialog({
      mode: "edit",
      key: nextDialogKey(),
      entry,
      month: entry.month.slice(0, 7),
      lines: entryToLines(entry),
    });
  };
  const openDuplicate = (entry: IncomeEntryDTO) => {
    const [y, m] = entry.month.slice(0, 7).split("-").map(Number);
    const next = new Date(y, m, 1); // m is already 1-based here -> next month
    const targetMonth = `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, "0")}`;
    setDialog({
      mode: "create",
      key: nextDialogKey(),
      month: targetMonth,
      lines: entryToLines(entry),
    });
  };

  const busy = createM.isPending || updateM.isPending;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="join">
          <button
            type="button"
            className="btn btn-sm join-item"
            onClick={() => setYear((y) => y - 1)}
          >
            « {year - 1}
          </button>
          <span className="btn btn-sm join-item btn-disabled font-semibold">
            {year}
          </span>
          <button
            type="button"
            className="btn btn-sm join-item"
            onClick={() => setYear((y) => y + 1)}
          >
            {year + 1} »
          </button>
        </div>

        <button
          type="button"
          className="btn btn-sm btn-primary gap-1"
          onClick={openCreate}
          disabled={types.length === 0}
          title={types.length === 0 ? "Create an income type in Admin first" : "Add month"}
        >
          <PlusIcon /> Add month
        </button>
      </div>

      <div className="overflow-x-auto rounded-box border border-base-300">
        <table className="table table-zebra">
          <thead>
            <tr className="bg-base-200">
              <th>Month</th>
              <th>Person</th>
              <th>Rubrics</th>
              <th>Total</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {entriesQ.isLoading && (
              <tr>
                <td colSpan={5} className="text-center py-6">
                  <span className="loading loading-spinner loading-md" />
                </td>
              </tr>
            )}

            {!entriesQ.isLoading && entries.length === 0 && (
              <tr>
                <td colSpan={5} className="text-center py-6 opacity-60">
                  No income entries for {year}.
                </td>
              </tr>
            )}

            {entries.map((entry) => {
              const isOwner = userId === entry.userId;
              return (
                <tr key={entry.id}>
                  <td className="font-medium">{monthLabel(entry.month.slice(0, 7))}</td>
                  <td>{entry.user.name ?? entry.user.email}</td>
                  <td className="text-xs opacity-70 max-w-xs truncate">
                    {entry.lines.map((l) => l.sourceTypeName).join(", ")}
                  </td>
                  <td className="font-mono font-semibold whitespace-nowrap">
                    {eur.format(entry.total)}
                  </td>
                  <td>
                    <div className="join">
                      <button
                        type="button"
                        className="btn btn-ghost btn-sm btn-square join-item"
                        disabled={!isOwner}
                        onClick={() => openEdit(entry)}
                        aria-label="Edit"
                        title="Edit"
                      >
                        <PencilIcon />
                      </button>
                      <button
                        type="button"
                        className="btn btn-ghost btn-sm btn-square join-item"
                        disabled={!isOwner}
                        onClick={() => openDuplicate(entry)}
                        aria-label="Duplicate to another month"
                        title="Duplicate to another month"
                      >
                        <CopyIcon />
                      </button>
                      <button
                        type="button"
                        className="btn btn-ghost btn-sm btn-square text-error join-item"
                        disabled={!isOwner || deleteM.isPending}
                        onClick={() => {
                          if (confirm("Delete this income entry?")) {
                            deleteM.mutate(entry.id);
                          }
                        }}
                        aria-label="Delete"
                        title="Delete"
                      >
                        <TrashIcon />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <IncomeLinesDialog
        key={dialog?.key ?? "closed"}
        open={dialog !== null}
        month={dialog?.month ?? null}
        onMonthChange={
          dialog?.mode === "create"
            ? (month) => setDialog((d) => (d ? { ...d, month } : d))
            : undefined
        }
        initialLines={dialog?.lines ?? []}
        types={types}
        busy={busy}
        onClose={() => setDialog(null)}
        onSave={(lines) => {
          if (!dialog) return;
          if (dialog.mode === "create") {
            createM.mutate({ month: dialog.month, lines });
          } else {
            updateM.mutate({ id: dialog.entry.id, lines });
          }
        }}
      />
    </div>
  );
}
