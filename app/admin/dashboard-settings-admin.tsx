"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { apiFetch, type DashboardSettingDTO } from "@/lib/api-client";
import { CheckIcon } from "@/components/icons";

export function DashboardSettingsAdmin() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["dashboard-settings"],
    queryFn: () => apiFetch<DashboardSettingDTO>("/api/dashboard-settings"),
  });

  const [draft, setDraft] = useState<string | null>(null);

  const save = useMutation({
    mutationFn: (expensesIncomePct: number) =>
      apiFetch<DashboardSettingDTO>("/api/dashboard-settings", {
        method: "PATCH",
        body: JSON.stringify({ expensesIncomePct }),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["dashboard-settings"] });
      toast.success("Saved");
      setDraft(null);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  if (isLoading || !data) return <span className="loading loading-spinner loading-md" />;

  const currentPct = String(Number(data.expensesIncomePct) * 100);
  const value = draft ?? currentPct;

  return (
    <div className="card bg-base-200">
      <div className="card-body py-4">
        <form
          className="flex flex-wrap items-end gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            const pct = Number(value);
            if (!Number.isFinite(pct) || pct < 0 || pct > 100) {
              toast.error("Must be between 0% and 100%");
              return;
            }
            save.mutate(pct / 100);
          }}
        >
          <label className="form-control">
            <span className="label-text text-xs mb-1">
              Estimated healthy Expenses / Income ratio
            </span>
            <label className="input input-bordered flex items-center gap-1 w-32">
              <input
                type="number"
                step="0.01"
                min="0"
                max="100"
                inputMode="decimal"
                className="grow"
                value={value}
                onChange={(e) => setDraft(e.target.value)}
              />
              <span className="opacity-60">%</span>
            </label>
          </label>
          <button
            type="submit"
            className="btn btn-primary btn-square"
            disabled={save.isPending || draft === null}
            aria-label="Save"
            title="Save"
          >
            {save.isPending ? (
              <span className="loading loading-spinner loading-xs" />
            ) : (
              <CheckIcon />
            )}
          </button>
        </form>
        <p className="text-xs opacity-60 mt-1">
          On the Home dashboard, the &quot;Income vs expenses&quot; tooltip shows the Expenses/Income
          ratio for that month in red when it&apos;s above this value, and green when at or
          below it.
        </p>
      </div>
    </div>
  );
}
