"use client";

import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { apiFetch, type DashboardSettingDTO, type IncomeVsExpensesDTO } from "@/lib/api-client";
import type { Period } from "@/lib/dashboard-period";
import { CarIcon } from "@/components/icons";

const eur = new Intl.NumberFormat("pt-PT", { style: "currency", currency: "EUR" });
const eurCompact = new Intl.NumberFormat("pt-PT", {
  style: "currency",
  currency: "EUR",
  notation: "compact",
  maximumFractionDigits: 1,
});

const INCOME_COLOR = "#2fb344";
const EXPENSE_COLOR = "#e03131";

const tooltipStyle = {
  background: "var(--color-base-100)",
  border: "1px solid var(--color-base-300)",
  borderRadius: 8,
  fontSize: 12,
} as const;

// The category is called "Carro" on the Expenses page, but this popup
// refers to it as "Gastos Carro" for clarity in this specific comparison.
function displayCategoryName(name: string | undefined): string {
  if (!name) return "Expense";
  return name === "Carro" ? "Gastos Carro" : name;
}

// The "Income vs expenses" chart + its "Reembolso Kms vs Carro" detail
// popup both read from the one shared /api/dashboard/income-vs-expenses
// call — one request, two views of the same period's data. Scoped to the
// signed-in user (own income vs own personal expense cost), matching
// "Spent this month" elsewhere on the dashboard.
export function IncomeVsExpensesSection({ period }: { period: Period }) {
  const { data, isLoading } = useQuery({
    queryKey: ["dashboard-income-vs-expenses", period],
    queryFn: () =>
      apiFetch<IncomeVsExpensesDTO>(`/api/dashboard/income-vs-expenses?period=${period}`),
  });
  // The threshold that decides whether a month's Expenses/Income ratio
  // shows red or green in the tooltip — editable in Admin.
  const { data: settings } = useQuery({
    queryKey: ["dashboard-settings"],
    queryFn: () => apiFetch<DashboardSettingDTO>("/api/dashboard-settings"),
  });
  const expensesIncomeThresholdPct = settings ? Number(settings.expensesIncomePct) * 100 : null;

  const [showComparison, setShowComparison] = useState(false);

  return (
    <>
      <IncomeVsExpensesChart
        data={data}
        isLoading={isLoading}
        onOpenComparison={() => setShowComparison(true)}
        expensesIncomeThresholdPct={expensesIncomeThresholdPct}
      />
      <KmVsCarModal
        open={showComparison}
        onClose={() => setShowComparison(false)}
        data={data}
        isLoading={isLoading}
      />
    </>
  );
}

function IncomeVsExpensesChart({
  data,
  isLoading,
  onOpenComparison,
  expensesIncomeThresholdPct,
}: {
  data: IncomeVsExpensesDTO | undefined;
  isLoading: boolean;
  onOpenComparison: () => void;
  expensesIncomeThresholdPct: number | null;
}) {
  const chartData = data?.chartData ?? [];
  const hasData = chartData.some((d) => d.income > 0 || d.expense > 0);
  const diff = data?.difference ?? 0;
  const diffTone = diff >= 0 ? "text-success" : "text-error";

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_auto] gap-4 items-stretch">
      <div className="card bg-base-100 border border-base-300">
        <div className="card-body py-3">
          <div className="flex items-center justify-between gap-2">
            <h2 className="card-title text-base">Income vs expenses</h2>
            <button
              type="button"
              className="btn btn-ghost btn-xs btn-square"
              onClick={onOpenComparison}
              aria-label="View Reembolso Kms vs Gastos Carro"
              title="View Reembolso Kms vs Gastos Carro"
            >
              <CarIcon className="h-3.5 w-3.5" />
            </button>
          </div>
          {isLoading ? (
            <div className="h-44 flex items-center justify-center">
              <span className="loading loading-spinner loading-md" />
            </div>
          ) : !hasData ? (
            <div className="h-44 flex items-center justify-center opacity-50">
              No income or expenses in this period.
            </div>
          ) : (
            <div className="h-44">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 8, right: 8, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="label" tick={{ fontSize: 12 }} stroke="currentColor" />
                  <YAxis
                    tick={{ fontSize: 12 }}
                    stroke="currentColor"
                    tickFormatter={(v: number) => eurCompact.format(v)}
                    width={56}
                  />
                  <Tooltip
                    content={({ active, payload, label }) => {
                      if (!active || !payload?.length) return null;
                      const income = Number(
                        payload.find((p) => p.dataKey === "income")?.value ?? 0,
                      );
                      const expense = Number(
                        payload.find((p) => p.dataKey === "expense")?.value ?? 0,
                      );
                      const pct = income > 0 ? (expense / income) * 100 : null;
                      return (
                        <div style={{ ...tooltipStyle, padding: "6px 10px" }}>
                          <div className="font-medium mb-1">{label}</div>
                          <div className="flex items-center justify-between gap-3">
                            <span style={{ color: INCOME_COLOR }}>Income</span>
                            <span className="font-mono">{eur.format(income)}</span>
                          </div>
                          <div className="flex items-center justify-between gap-3">
                            <span style={{ color: EXPENSE_COLOR }}>Expenses</span>
                            <span className="font-mono">{eur.format(expense)}</span>
                          </div>
                          {pct != null && (
                            <div className="flex items-center justify-between gap-3 pt-1 mt-1 border-t border-base-300">
                              <span className="opacity-70">Expenses / Income</span>
                              <span
                                className="font-mono"
                                style={{
                                  color:
                                    expensesIncomeThresholdPct == null
                                      ? undefined
                                      : pct > expensesIncomeThresholdPct
                                        ? EXPENSE_COLOR
                                        : INCOME_COLOR,
                                }}
                              >
                                {pct.toFixed(0)}%
                              </span>
                            </div>
                          )}
                        </div>
                      );
                    }}
                  />
                  <Legend formatter={(v) => (v === "income" ? "Income" : "Expenses")} />
                  <Bar dataKey="income" name="income" fill={INCOME_COLOR} radius={[4, 4, 0, 0]} />
                  <Bar dataKey="expense" name="expense" fill={EXPENSE_COLOR} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>

      <div className="card bg-base-100 border border-base-300 lg:w-48">
        <div className="card-body py-4 items-center text-center gap-1">
          <div className="text-xs uppercase opacity-60 tracking-wide">Saved</div>
          <div className={`text-2xl font-semibold font-mono ${diffTone}`}>
            {eur.format(diff)}
          </div>
          <div className="text-xs opacity-60 mb-1">{data?.label}</div>
          <div className="w-full pt-2 border-t border-base-300 space-y-1 text-left">
            <div className="flex justify-between text-xs">
              <span className="opacity-70">Income</span>
              <span className="font-mono">{eur.format(data?.totalIncome ?? 0)}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="opacity-70">Expenses</span>
              <span className="font-mono">{eur.format(data?.totalExpense ?? 0)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function KmVsCarModal({
  open,
  onClose,
  data,
  isLoading,
}: {
  open: boolean;
  onClose: () => void;
  data: IncomeVsExpensesDTO | undefined;
  isLoading: boolean;
}) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (open && !el.open) el.showModal();
    if (!open && el.open) el.close();
  }, [open]);

  const comparison = data?.comparison;
  const categoryLabel = displayCategoryName(comparison?.categoryName);
  const incomeLabel = comparison?.incomeTypeName ?? "Income";
  const chartData = comparison?.data ?? [];
  const hasData = chartData.some((d) => d.incomeAmount > 0 || d.expenseAmount > 0);
  const totalIncome = chartData.reduce((s, d) => s + d.incomeAmount, 0);
  const totalExpense = chartData.reduce((s, d) => s + d.expenseAmount, 0);

  return (
    <dialog ref={ref} className="modal" onClose={onClose}>
      <div className="modal-box max-w-2xl">
        <h3 className="font-bold text-lg mb-3">
          {comparison ? `${incomeLabel} vs ${categoryLabel}` : "Reembolso Kms vs Gastos Carro"}
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-[minmax(0,1fr)_auto] gap-4 items-stretch">
          <div>
            {isLoading ? (
              <div className="h-48 flex items-center justify-center">
                <span className="loading loading-spinner loading-md" />
              </div>
            ) : comparison && !comparison.available ? (
              <div className="h-48 flex items-center justify-center text-center opacity-50 px-4">
                Create a &quot;{incomeLabel}&quot; income type and a &quot;{categoryLabel}&quot;
                category to see this comparison.
              </div>
            ) : !hasData ? (
              <div className="h-48 flex items-center justify-center opacity-50">
                No matching income or expenses in this period.
              </div>
            ) : (
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top: 8, right: 8, left: -10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="label" tick={{ fontSize: 12 }} stroke="currentColor" />
                    <YAxis
                      tick={{ fontSize: 12 }}
                      stroke="currentColor"
                      tickFormatter={(v: number) => eurCompact.format(v)}
                      width={56}
                    />
                    <Tooltip
                      contentStyle={tooltipStyle}
                      formatter={(v, name) => [
                        eur.format(Number(v)),
                        name === "incomeAmount" ? incomeLabel : categoryLabel,
                      ]}
                    />
                    <Legend
                      formatter={(v) => (v === "incomeAmount" ? incomeLabel : categoryLabel)}
                    />
                    <Bar
                      dataKey="incomeAmount"
                      name="incomeAmount"
                      fill="#4589ff"
                      radius={[4, 4, 0, 0]}
                    />
                    <Bar
                      dataKey="expenseAmount"
                      name="expenseAmount"
                      fill="#e8590c"
                      radius={[4, 4, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          <div className="card bg-base-200 sm:w-48">
            <div className="card-body py-4 items-center text-center gap-1">
              <div className="text-xs uppercase opacity-60 tracking-wide">Coverage</div>
              <div className="text-2xl font-semibold font-mono">
                {eur.format(totalIncome - totalExpense)}
              </div>
              <div className="text-xs opacity-60 mb-1">{data?.label}</div>
              <div className="w-full pt-2 border-t border-base-300 space-y-1 text-left">
                <div className="flex justify-between text-xs">
                  <span className="opacity-70">{incomeLabel}</span>
                  <span className="font-mono">{eur.format(totalIncome)}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="opacity-70">{categoryLabel}</span>
                  <span className="font-mono">{eur.format(totalExpense)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

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
