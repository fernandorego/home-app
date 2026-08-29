"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Area,
  AreaChart,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { apiFetch, type CategoryDTO, type DashboardDTO } from "@/lib/api-client";
import { COVERFLEX_LABELS } from "../expenses/coverflex";
import { SearchIcon } from "@/components/icons";
import { CategoryBreakdownCard, PERIOD_OPTIONS } from "./category-breakdown";
import { IncomeVsExpensesSection } from "./income-vs-expenses";
import { NEUTRAL_CATEGORY_COLOR, buildCategoryColorMap } from "./category-colors";
import { ExpenseDetailModal, type DetailRow } from "./expense-detail-modal";
import type { Period } from "@/lib/dashboard-period";
import { niceAxisTicks } from "@/lib/chart-scale";

function CoverflexLogo({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 12" className={className} aria-hidden="true">
      <defs>
        <linearGradient id="coverflexDome" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#ff8a73" />
          <stop offset="100%" stopColor="#ffb199" />
        </linearGradient>
      </defs>
      <path d="M0 12a12 12 0 0 1 24 0z" fill="url(#coverflexDome)" />
    </svg>
  );
}

// Same dome motif as the Coverflex logo, but redder — a clock (awaiting)
// paired with a coin (reimbursement) inside the dome.
function ReimbursementIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 12" className={className} aria-hidden="true">
      <defs>
        <linearGradient id="reimbursementDome" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#e03131" />
          <stop offset="100%" stopColor="#ff9b9b" />
        </linearGradient>
      </defs>
      <path d="M0 12a12 12 0 0 1 24 0z" fill="url(#reimbursementDome)" />
      <circle cx="8" cy="8.6" r="2.6" fill="none" stroke="#fff" strokeWidth="0.9" />
      <path
        d="M8 7v1.6l1 0.7"
        fill="none"
        stroke="#fff"
        strokeWidth="0.9"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="16" cy="8.6" r="2.6" fill="none" stroke="#fff" strokeWidth="0.9" />
      <text x="16" y="9.7" fontSize="3.4" fill="#fff" textAnchor="middle">
        €
      </text>
    </svg>
  );
}

const eur = new Intl.NumberFormat("pt-PT", { style: "currency", currency: "EUR" });
const eurCompact = new Intl.NumberFormat("pt-PT", {
  style: "currency",
  currency: "EUR",
  notation: "compact",
  maximumFractionDigits: 1,
});

type DetailModal = "month" | "reimbursement" | "coverflex" | null;

export function DashboardClient() {
  // Shared across all three charts below (Category breakdown, "By
  // category", "Share by category") — one control, one range everywhere.
  const [period, setPeriod] = useState<Period>("6m");
  const [detailModal, setDetailModal] = useState<DetailModal>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["dashboard", period],
    queryFn: () => apiFetch<DashboardDTO>(`/api/dashboard?period=${period}`),
  });

  // Fetch the full category list so "Share by category" can use the exact
  // same color-per-category-name mapping as the Category breakdown chart
  // below it, regardless of which subset of categories each one displays.
  const categoriesQ = useQuery({
    queryKey: ["categories"],
    queryFn: () => apiFetch<CategoryDTO[]>("/api/categories"),
  });
  const categoryColorMap = useMemo(
    () =>
      buildCategoryColorMap(
        (categoriesQ.data ?? [])
          .filter((c) => !c.parentId)
          .map((c) => ({ name: c.name, color: c.color })),
      ),
    [categoriesQ.data],
  );
  const colorForCategoryName = (name: string) =>
    name === "Other" ? NEUTRAL_CATEGORY_COLOR : categoryColorMap.get(name) ?? NEUTRAL_CATEGORY_COLOR;

  if (isLoading || !data) {
    return (
      <div className="flex justify-center py-20">
        <span className="loading loading-spinner loading-lg" />
      </div>
    );
  }

  const e = data.expenses;
  const delta =
    e.lastMonthTotal === 0 ? null : (e.monthTotal - e.lastMonthTotal) / e.lastMonthTotal;
  const deltaTone = delta == null ? "" : delta > 0 ? "text-error" : "text-success";

  const monthRows: DetailRow[] = e.monthExpenseDetails;
  const reimbursementRows: DetailRow[] = e.awaitingDetails.map((d) => ({
    id: d.id,
    description: d.description,
    date: d.date,
    categoryName: d.categoryName,
    value: d.amount,
    meta: d.reimburser ?? undefined,
  }));
  const coverflexRows: DetailRow[] = e.awaitingCoverflexDetails.map((d) => ({
    id: d.id,
    description: d.description,
    date: d.date,
    categoryName: d.categoryName,
    value: d.value,
    meta: COVERFLEX_LABELS[d.coverflexStatus],
  }));

  return (
    <div className="space-y-3">
      <header className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h1 className="text-3xl font-bold">Home</h1>
          <p className="opacity-70">{data.monthLabel}</p>
        </div>
        <div className="flex gap-2">
          <Link href="/expenses" className="btn btn-sm btn-ghost">
            Expenses →
          </Link>
          <Link href="/income" className="btn btn-sm btn-ghost">
            Income →
          </Link>
          <Link href="/tasks" className="btn btn-sm btn-ghost">
            To-Do →
          </Link>
          <Link href="/shopping" className="btn btn-sm btn-ghost">
            Shopping →
          </Link>
        </div>
      </header>

      {/* Stat cards */}
      <div className="stats stats-vertical lg:stats-horizontal shadow w-full bg-base-200">
        <div className="stat relative">
          <button
            type="button"
            className="btn btn-ghost btn-xs btn-square absolute right-2 top-2 opacity-50 hover:opacity-100"
            onClick={() => setDetailModal("month")}
            aria-label="View expenses"
            title="View expenses"
          >
            <SearchIcon className="h-3.5 w-3.5" />
          </button>
          <div className="stat-title">Spent this month</div>
          <div className="stat-value text-primary">{eur.format(e.monthTotal)}</div>
          <div className={`stat-desc ${deltaTone}`}>
            {delta == null
              ? "no comparison"
              : `${delta >= 0 ? "▲" : "▼"} ${Math.abs(delta * 100).toFixed(0)}% vs last month`}
          </div>
        </div>

        <AwaitingCard
          total={e.awaitingTotal}
          count={e.awaitingCount}
          onOpenDetails={() => setDetailModal("reimbursement")}
        />

        <CoverflexAwaitingCard
          total={e.awaitingCoverflexTotal}
          count={e.awaitingCoverflexCount}
          onOpenDetails={() => setDetailModal("coverflex")}
        />
      </div>

      <ExpenseDetailModal
        open={detailModal !== null}
        onClose={() => setDetailModal(null)}
        title={
          detailModal === "month"
            ? "Spent this month"
            : detailModal === "reimbursement"
              ? "Awaiting reimbursement"
              : detailModal === "coverflex"
                ? "Awaiting Coverflex"
                : ""
        }
        rows={
          detailModal === "month"
            ? monthRows
            : detailModal === "reimbursement"
              ? reimbursementRows
              : detailModal === "coverflex"
                ? coverflexRows
                : []
        }
      />

      {/* Shared page filters (full width) */}
      <div className="card bg-base-100 border border-base-300">
        <div className="card-body py-3 flex-row flex-wrap items-center justify-between gap-2">
          <h2 className="card-title text-base">Filters</h2>
          <div className="join">
            {PERIOD_OPTIONS.map((p) => (
              <button
                key={p.value}
                type="button"
                className={`btn btn-xs join-item ${period === p.value ? "btn-primary" : "btn-ghost"}`}
                onClick={() => setPeriod(p.value)}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Category breakdown (full width) */}
      <CategoryBreakdownCard period={period} />

      {/* Income vs expenses + Reembolso Kms vs Carro (full width) */}
      <IncomeVsExpensesSection period={period} />

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="card bg-base-100 border border-base-300">
          <div className="card-body py-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <h2 className="card-title text-base">By category</h2>
              <span className="text-xs opacity-60">{e.pieRangeLabel}</span>
            </div>
            {e.chartCategories.length === 0 ? (
              <div className="h-44 flex items-center justify-center opacity-50">
                No category activity in this period.
              </div>
            ) : (
              <CategoryLineChart
                data={e.chartData}
                categories={e.chartCategories}
                colorFor={colorForCategoryName}
              />
            )}
          </div>
        </div>

        <div className="card bg-base-100 border border-base-300">
          <div className="card-body py-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <h2 className="card-title text-base">Share by category</h2>
            </div>
            <p className="text-xs opacity-60 -mt-2">
              {e.pieRangeLabel} · {eur.format(e.pieRangeTotal)}
            </p>
            {e.topCategories.length === 0 ? (
              <div className="h-44 flex items-center justify-center opacity-50">
                No expenses in this period.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
                <div className="h-44 min-w-0">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart margin={{ top: 4, right: 4, bottom: 4, left: 4 }}>
                      <Pie
                        data={e.topCategories}
                        dataKey="total"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        innerRadius="55%"
                        outerRadius="85%"
                        paddingAngle={2}
                        stroke="var(--color-base-100)"
                      >
                        {e.topCategories.map((c, i) => (
                          <Cell key={i} fill={colorForCategoryName(c.name)} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{
                          background: "var(--color-base-100)",
                          border: "1px solid var(--color-base-300)",
                          borderRadius: 8,
                          fontSize: 12,
                        }}
                        formatter={(v) => eur.format(Number(v))}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <ul className="text-sm space-y-1 self-center">
                  {e.topCategories.map((c) => {
                    const pct = e.pieRangeTotal > 0
                      ? (c.total / e.pieRangeTotal) * 100
                      : 0;
                    return (
                      <li key={c.name} className="flex items-center gap-2">
                        <span
                          className="inline-block w-3 h-3 rounded-sm shrink-0"
                          style={{ background: colorForCategoryName(c.name) }}
                        />
                        <span className="flex-1 truncate">{c.name}</span>
                        <span className="font-mono opacity-80 whitespace-nowrap">
                          {eur.format(c.total)}{" "}
                          <span className="opacity-60">({pct.toFixed(0)}%)</span>
                        </span>
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Cumulative chart (full width, at the bottom) */}
      <div className="card bg-base-100 border border-base-300">
        <div className="card-body py-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <h2 className="card-title text-base">Cumulative spending</h2>
            <div className="text-sm opacity-70">
              {eur.format(e.cumulative.thisMonthTotal)} this month ·{" "}
              {eur.format(e.cumulative.lastMonthAtSameDay)} at same point last month
            </div>
          </div>
          <CumulativeChart data={e.cumulative.data} />
        </div>
      </div>
    </div>
  );
}


function CumulativeChart({
  data,
}: {
  data: DashboardDTO["expenses"]["cumulative"]["data"];
}) {
  return (
    <div className="h-44">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 8, right: 8, left: -10, bottom: 0 }}>
          <defs>
            <linearGradient id="thisMonthFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#570df8" stopOpacity={0.35} />
              <stop offset="95%" stopColor="#570df8" stopOpacity={0} />
            </linearGradient>
          </defs>
          <XAxis dataKey="day" tick={{ fontSize: 12 }} stroke="currentColor" />
          <YAxis
            tick={{ fontSize: 12 }}
            stroke="currentColor"
            tickFormatter={(v: number) => eurCompact.format(v)}
            width={56}
          />
          <Tooltip
            contentStyle={{
              background: "var(--color-base-100)",
              border: "1px solid var(--color-base-300)",
              borderRadius: 8,
              fontSize: 12,
            }}
            labelFormatter={(d) => `Day ${d}`}
            // The Area components below already set an explicit `name`
            // ("This month" / "Last month"), so just pass it through —
            // comparing it against the raw dataKey never matched, which is
            // why both series used to show "Last month" in the tooltip.
            formatter={(v, name) => [v == null ? "—" : eur.format(Number(v)), name]}
          />
          <Area
            type="monotone"
            dataKey="lastMonth"
            stroke="#9ca3af"
            strokeDasharray="4 4"
            fill="none"
            connectNulls
            isAnimationActive={false}
            name="Last month"
          />
          <Area
            type="monotone"
            dataKey="thisMonth"
            stroke="#570df8"
            strokeWidth={2}
            fill="url(#thisMonthFill)"
            connectNulls
            isAnimationActive={false}
            name="This month"
          />
          <Legend
            verticalAlign="top"
            height={24}
            iconType="line"
            wrapperStyle={{ fontSize: 12 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

function CategoryLineChart({
  data,
  categories,
  colorFor,
}: {
  data: DashboardDTO["expenses"]["chartData"];
  categories: DashboardDTO["expenses"]["chartCategories"];
  colorFor: (name: string) => string;
}) {
  const colored = categories.map((c) => ({
    ...c,
    color: colorFor(c.name),
  }));

  const idToName = new Map(colored.map((c) => [c.id, c.name]));

  // Build evenly-spaced, clean whole-number ticks (e.g. 0 / 2 mil / 4 mil €)
  // instead of relying on recharts' own tick-picking, which can land on
  // unevenly-spaced or awkward halves like "1,5 mil €" / "4,5 mil €".
  // Considers both the plotted values and any budget reference lines so
  // those aren't clipped off the chart.
  const { max: yAxisMax, ticks: yAxisTicks } = niceAxisTicks(
    Math.max(
      data.reduce(
        (m, point) => Math.max(m, ...colored.map((c) => Number(point[c.id]) || 0)),
        0,
      ),
      ...colored.map((c) => c.monthlyBudget ?? 0),
    ),
  );

  return (
    <div className="space-y-2">
      <div className="h-44">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 8, right: 8, left: -10, bottom: 0 }}>
            <XAxis dataKey="label" tick={{ fontSize: 12 }} stroke="currentColor" />
            <YAxis
              domain={[0, yAxisMax]}
              ticks={yAxisTicks}
              tick={{ fontSize: 12 }}
              stroke="currentColor"
              tickFormatter={(v: number) => eurCompact.format(v)}
              width={56}
            />
            <Tooltip
              contentStyle={{
                background: "var(--color-base-100)",
                border: "1px solid var(--color-base-300)",
                borderRadius: 8,
                fontSize: 12,
              }}
              formatter={(v, key) => [eur.format(Number(v)), idToName.get(String(key)) ?? key]}
            />
            {colored
              .filter((c) => c.monthlyBudget != null)
              .map((c) => (
                <ReferenceLine
                  key={`budget-${c.id}`}
                  y={c.monthlyBudget!}
                  stroke={c.color}
                  strokeDasharray="4 4"
                  strokeOpacity={0.5}
                />
              ))}
            {colored.map((c) => (
              <Line
                key={c.id}
                type="monotone"
                dataKey={c.id}
                name={c.name}
                stroke={c.overBudget ? "#ef4444" : c.color}
                strokeWidth={c.overBudget ? 3 : 2}
                dot={{ r: 3, fill: c.color }}
                activeDot={{ r: 5 }}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>

      <ul className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1 text-xs">
        {colored.map((c) => {
          const pct = c.monthlyBudget && c.monthlyBudget > 0
            ? (c.currentMonthValue / c.monthlyBudget) * 100
            : null;
          return (
            <li key={c.id} className="flex items-center gap-2">
              <span
                className="inline-block w-3 h-1.5 rounded-sm shrink-0"
                style={{ background: c.color }}
              />
              <span className={c.overBudget ? "font-semibold text-error" : ""}>
                {c.name}
              </span>
              <span className="ml-auto opacity-75 whitespace-nowrap font-mono">
                {eur.format(c.currentMonthValue)}
                {c.monthlyBudget != null
                  ? ` / ${eur.format(c.monthlyBudget)}`
                  : ""}
                {pct != null ? ` (${pct.toFixed(0)}%)` : ""}
              </span>
            </li>
          );
        })}
      </ul>
      <Legend content={() => null} />
    </div>
  );
}

function AwaitingCard({
  total,
  count,
  onOpenDetails,
}: {
  total: number;
  count: number;
  onOpenDetails: () => void;
}) {
  return (
    <div className="stat relative">
      <button
        type="button"
        className="btn btn-ghost btn-xs btn-square absolute right-2 top-2 opacity-50 hover:opacity-100"
        onClick={onOpenDetails}
        aria-label="View expenses"
        title="View expenses"
      >
        <SearchIcon className="h-3.5 w-3.5" />
      </button>
      <div className="stat-title flex items-center gap-1.5">
        <ReimbursementIcon className="h-3 w-6" />
        Awaiting reimbursement
      </div>
      <div className={`stat-value ${total > 0 ? "text-warning" : ""}`}>
        {eur.format(total)}
      </div>
      <div className="stat-desc">
        {count === 0 ? "nothing pending" : `${count} expense${count === 1 ? "" : "s"}`}
      </div>
    </div>
  );
}

function CoverflexAwaitingCard({
  total,
  count,
  onOpenDetails,
}: {
  total: number;
  count: number;
  onOpenDetails: () => void;
}) {
  return (
    <div className="stat relative">
      <button
        type="button"
        className="btn btn-ghost btn-xs btn-square absolute right-2 top-2 opacity-50 hover:opacity-100"
        onClick={onOpenDetails}
        aria-label="View expenses"
        title="View expenses"
      >
        <SearchIcon className="h-3.5 w-3.5" />
      </button>
      <div className="stat-title flex items-center gap-1.5">
        <CoverflexLogo className="h-3 w-6" />
        Awaiting Coverflex
      </div>
      <div className={`stat-value ${total > 0 ? "text-warning" : ""}`}>
        {eur.format(total)}
      </div>
      <div className="stat-desc">
        {count === 0 ? "nothing pending" : `${count} expense${count === 1 ? "" : "s"}`}
      </div>
    </div>
  );
}

