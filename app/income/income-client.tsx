"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import toast from "react-hot-toast";
import { apiFetch, type IncomeEntryDTO } from "@/lib/api-client";
import { PencilIcon, TrashIcon } from "@/components/icons";
import { IncomeFormRow } from "./income-form-row";
import {
  RUBRIC_KEYS,
  RUBRIC_LABELS,
  computeTotal,
  currentMonthIso,
  emptyForm,
  monthLabel,
  type FormState,
} from "./types";

const eur = new Intl.NumberFormat("pt-PT", { style: "currency", currency: "EUR" });

function formStateToInput(s: FormState) {
  return {
    month: `${s.month}-01`,
    vencimento: Number(s.vencimento || 0),
    isencaoHorario: Number(s.isencaoHorario || 0),
    subFerias: Number(s.subFerias || 0),
    isencaoHorarioFerias: Number(s.isencaoHorarioFerias || 0),
    subsidioNatal: Number(s.subsidioNatal || 0),
    walletCoverflex: Number(s.walletCoverflex || 0),
  };
}

function entryToFormState(e: IncomeEntryDTO): FormState {
  return {
    month: e.month.slice(0, 7),
    vencimento: e.vencimento,
    isencaoHorario: e.isencaoHorario,
    subFerias: e.subFerias,
    isencaoHorarioFerias: e.isencaoHorarioFerias,
    subsidioNatal: e.subsidioNatal,
    walletCoverflex: e.walletCoverflex,
  };
}

export function IncomeClient() {
  const { data: session } = useSession();
  const qc = useQueryClient();
  const [year, setYear] = useState(() => new Date().getFullYear());

  const entriesQ = useQuery({
    queryKey: ["income", year],
    queryFn: () => apiFetch<IncomeEntryDTO[]>(`/api/income?year=${year}`),
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: ["income"] });

  const [createForm, setCreateForm] = useState<FormState>(() =>
    emptyForm(currentMonthIso()),
  );

  const createM = useMutation({
    mutationFn: (input: FormState) =>
      apiFetch<IncomeEntryDTO>("/api/income", {
        method: "POST",
        body: JSON.stringify(formStateToInput(input)),
      }),
    onSuccess: (created) => {
      invalidate();
      toast.success("Income entry added");
      setCreateForm(emptyForm(created.month.slice(0, 7)));
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const updateM = useMutation({
    mutationFn: ({ id, input }: { id: string; input: FormState }) =>
      apiFetch<IncomeEntryDTO>(`/api/income/${id}`, {
        method: "PATCH",
        body: JSON.stringify(formStateToInput(input)),
      }),
    onSuccess: () => {
      invalidate();
      toast.success("Updated");
      setEditingId(null);
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

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<FormState | null>(null);

  const entries = entriesQ.data ?? [];
  const userId = session?.user?.id;

  return (
    <div className="space-y-4">
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

      <div className="overflow-x-auto rounded-box border border-base-300">
        <table className="table table-zebra">
          <thead>
            <tr className="bg-base-200">
              <th>Month</th>
              <th>Person</th>
              <th>Vencimento (+)</th>
              {RUBRIC_KEYS.map((key) => (
                <th key={key}>{RUBRIC_LABELS[key]} (−)</th>
              ))}
              <th>Total</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            <IncomeFormRow
              value={createForm}
              onChange={setCreateForm}
              onSubmit={() => createM.mutate(createForm)}
              busy={createM.isPending}
              personLabel={session?.user?.name ?? session?.user?.email ?? ""}
            />

            {entriesQ.isLoading && (
              <tr>
                <td colSpan={10} className="text-center py-6">
                  <span className="loading loading-spinner loading-md" />
                </td>
              </tr>
            )}

            {!entriesQ.isLoading && entries.length === 0 && (
              <tr>
                <td colSpan={10} className="text-center py-6 opacity-60">
                  No income entries for {year}.
                </td>
              </tr>
            )}

            {entries.map((entry) => {
              const isOwner = userId === entry.userId;
              const isEditing = editingId === entry.id && editForm;
              if (isEditing && editForm) {
                return (
                  <IncomeFormRow
                    key={entry.id}
                    isEdit
                    value={editForm}
                    onChange={setEditForm}
                    onSubmit={() =>
                      updateM.mutate({ id: entry.id, input: editForm })
                    }
                    onCancel={() => {
                      setEditingId(null);
                      setEditForm(null);
                    }}
                    busy={updateM.isPending}
                    personLabel={entry.user.name ?? entry.user.email}
                  />
                );
              }

              const total = computeTotal(entryToFormState(entry));

              return (
                <tr key={entry.id}>
                  <td className="font-medium">{monthLabel(entry.month.slice(0, 7))}</td>
                  <td>{entry.user.name ?? entry.user.email}</td>
                  <td className="font-mono whitespace-nowrap">
                    {eur.format(Number(entry.vencimento))}
                  </td>
                  {RUBRIC_KEYS.map((key) => (
                    <td key={key} className="font-mono whitespace-nowrap">
                      {eur.format(Number(entry[key]))}
                    </td>
                  ))}
                  <td className="font-mono font-semibold whitespace-nowrap">
                    {eur.format(total)}
                  </td>
                  <td>
                    <div className="join">
                      <button
                        type="button"
                        className="btn btn-ghost btn-sm btn-square join-item"
                        disabled={!isOwner}
                        onClick={() => {
                          setEditingId(entry.id);
                          setEditForm(entryToFormState(entry));
                        }}
                        aria-label="Edit"
                        title="Edit"
                      >
                        <PencilIcon />
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
    </div>
  );
}
