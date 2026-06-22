"use client";

import Link from "next/link";
import { useState } from "react";
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
import { apiFetch, type DashboardDTO } from "@/lib/api-client";
import { PriorityBadge } from "../tasks/priority";

const eur = new Intl.NumberFormat("pt-PT", { style: "currency", currency: "EUR" });
const eurCompact = new Intl.NumberFormat("pt-PT", {
  style: "currency",
  currency: "EUR",
  notation: "compact",
  maximumFractionDigits: 1,
});

const PIE_COLORS = [
  "#570df8",
  "#f000b8",
  "#37cdbe",
  "#3abff8",
  "#fbbd23",
  "#84cc16",
  "#fb923c",
  "#9ca3af",
];

type LineMonths = 3 | 6 | 12;
type PieRange = "month" | "lastMonth" | "3m" | "ytd";

export function DashboardClient() {
  const [lineMonths, setLineMonths] = useState<LineMonths>(6);
  const [pieRange, setPieRange] = useState<PieRange>("month");

  const { data, isLoading } = useQuery({
    queryKey: ["dashboard", lineMonths, pieRange],
    queryFn: () =>
      apiFetch<DashboardDTO>(
        `/api/dashboard?lineMonths=${lineMonths}&pieRange=${pieRange}`,
      ),
  });

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

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h1 className="text-3xl font-bold">Home</h1>
          <p className="opacity-70">{data.monthLabel}</p>
        </div>
        <div className="flex gap-2">
          <Link href="/expenses" className="btn btn-sm btn-ghost">
            Expenses →
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
        <div className="stat">
          <div className="stat-title">Spent this month</div>
          <div className="stat-value text-primary">{eur.format(e.monthTotal)}</div>
          <div className={`stat-desc ${deltaTone}`}>
            {delta == null
              ? "no comparison"
              : `${delta >= 0 ? "▲" : "▼"} ${Math.abs(delta * 100).toFixed(0)}% vs last month`}
          </div>
        </div>

        <div className="stat">
          <div className="stat-title">Net this month</div>
          <div className="stat-value text-secondary">{eur.format(e.monthNet)}</div>
          <div className="stat-desc">
            {e.monthRefundExpected > 0
              ? `after ${eur.format(e.monthRefundExpected)} expected back`
              : "no reimbursements"}
          </div>
        </div>

        <AwaitingCard
          total={e.awaitingTotal}
          count={e.awaitingCount}
          details={e.awaitingDetails}
        />

        <div className="stat">
          <div className="stat-title">Open tasks</div>
          <div className="stat-value text-accent">{data.tasks.length}</div>
          <div className="stat-desc">{data.shopping.length} on shopping list</div>
        </div>
      </div>

      {/* Insights row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
        <InfoCard
          title="Daily average"
          value={eur.format(e.dailyAverage)}
          hint={`across ${e.daysInMonthSoFar} day${e.daysInMonthSoFar === 1 ? "" : "s"} so far`}
        />
        <InfoCard
          title="Projected total"
          value={eur.format(e.projectedMonthTotal)}
          hint={`by end of ${data.monthLabel.split(" ")[0]}`}
          tone={
            e.projectedMonthTotal > e.lastMonthTotal && e.lastMonthTotal > 0
              ? "warning"
              : "default"
          }
        />
        <InfoCard
          title="Joint vs private"
          value={`${eur.format(e.jointThisMonth)} · ${eur.format(e.privateThisMonth)}`}
          hint={
            e.monthTotal > 0
              ? `${Math.round((e.jointThisMonth / e.monthTotal) * 100)}% joint`
              : "no spend yet"
          }
        />
        <InfoCard
          title={`Reimbursed in ${new Date().getFullYear()}`}
          value={eur.format(e.reimbursedYTD)}
          hint={
            e.awaitingTotal > 0
              ? `${eur.format(e.awaitingTotal)} still pending`
              : "all caught up"
          }
          tone="success"
        />
      </div>

      {/* Largest expense card (full width tile) */}
      {e.largestExpense && (
        <div className="card bg-base-100 border border-base-300">
          <div className="card-body py-3 flex-row items-center gap-4">
            <div className="badge badge-lg badge-ghost">Largest this month</div>
            <div className="flex-1 min-w-0">
              <div className="font-semibold truncate">{e.largestExpense.description}</div>
              <div className="text-xs opacity-70">
                {e.largestExpense.categoryName} ·{" "}
                {new Date(e.largestExpense.date).toISOString().slice(0, 10)}
              </div>
            </div>
            <div className="font-mono text-lg whitespace-nowrap">
              {eur.format(e.largestExpense.value)}
            </div>
          </div>
        </div>
      )}

      {/* Over-budget warning */}
      {e.overBudgetThisMonth.length > 0 && (
        <div role="alert" className="alert alert-warning">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-5 w-5 shrink-0"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
            <line x1="12" y1="9" x2="12" y2="13" />
            <line x1="12" y1="17" x2="12.01" y2="17" />
          </svg>
          <div>
            <h3 className="font-semibold">Budget exceeded this month</h3>
            <ul className="text-sm">
              {e.overBudgetThisMonth.map((o) => (
                <li key={o.id}>
                  <span className="font-medium">{o.name}</span> ·{" "}
                  {eur.format(o.spent)} / {eur.format(o.budget)} ·{" "}
                  <span className="font-semibold">+{eur.format(o.overshoot)}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* Cumulative chart (full width) */}
      <div className="card bg-base-100 border border-base-300">
        <div className="card-body">
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

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="card bg-base-100 border border-base-300">
          <div className="card-body">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <h2 className="card-title text-base">By category</h2>
              <RangePicker
                value={lineMonths}
                onChange={(v) => setLineMonths(v)}
                options={[
                  { value: 3, label: "3m" },
                  { value: 6, label: "6m" },
                  { value: 12, label: "12m" },
                ]}
              />
            </div>
            {e.chartCategories.length === 0 ? (
              <div className="h-64 flex items-center justify-center opacity-50">
                No category activity in this period.
              </div>
            ) : (
              <CategoryLineChart
                data={e.chartData}
                categories={e.chartCategories}
              />
            )}
          </div>
        </div>

        <div className="card bg-base-100 border border-base-300">
          <div className="card-body">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <h2 className="card-title text-base">Share by category</h2>
              <RangePicker
                value={pieRange}
                onChange={(v) => setPieRange(v)}
                options={[
                  { value: "month", label: "Month" },
                  { value: "lastMonth", label: "Last" },
                  { value: "3m", label: "3m" },
                  { value: "ytd", label: "YTD" },
                ]}
              />
            </div>
            <p className="text-xs opacity-60 -mt-2">
              {e.pieRangeLabel} · {eur.format(e.pieRangeTotal)}
            </p>
            {e.topCategories.length === 0 ? (
              <div className="h-64 flex items-center justify-center opacity-50">
                No expenses in this period.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
                <div className="h-64 min-w-0">
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
                        {e.topCategories.map((_, i) => (
                          <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
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
                  {e.topCategories.map((c, i) => {
                    const pct = e.pieRangeTotal > 0
                      ? (c.total / e.pieRangeTotal) * 100
                      : 0;
                    return (
                      <li key={c.name} className="flex items-center gap-2">
                        <span
                          className="inline-block w-3 h-3 rounded-sm shrink-0"
                          style={{ background: PIE_COLORS[i % PIE_COLORS.length] }}
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

      {/* Reimburser leaderboard */}
      {e.reimburserLeaderboard.length > 0 && (
        <div className="card bg-base-100 border border-base-300">
          <div className="card-body">
            <h2 className="card-title text-base">Top reimbursers ({new Date().getFullYear()})</h2>
            <ul className="divide-y divide-base-200 text-sm">
              {e.reimburserLeaderboard.map((r) => (
                <li key={r.name} className="py-1.5 flex items-center gap-3">
                  <span className="flex-1 truncate font-medium">{r.name}</span>
                  <span className="opacity-60 text-xs whitespace-nowrap">
                    {r.count} expense{r.count === 1 ? "" : "s"}
                  </span>
                  <span className="font-mono whitespace-nowrap">
                    {eur.format(r.total)}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* Tasks + Shopping previews */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="card bg-base-100 border border-base-300">
          <div className="card-body">
            <div className="flex items-center justify-between">
              <h2 className="card-title text-base">Coming up</h2>
              <Link href="/tasks" className="link link-hover text-sm">
                See all →
              </Link>
            </div>
            {data.tasks.length === 0 ? (
              <p className="opacity-60 py-4">Nothing to do. Enjoy.</p>
            ) : (
              <ul className="divide-y divide-base-200">
                {data.tasks.map((t) => {
                  const due = t.deadline ? new Date(t.deadline) : null;
                  const today = new Date();
                  today.setHours(0, 0, 0, 0);
                  const overdue = !!due && due < today;
                  return (
                    <li key={t.id} className="py-2 flex items-center gap-3">
                      <PriorityBadge priority={t.priority} />
                      <span className="flex-1 truncate">{t.description}</span>
                      {t.assignee && (
                        <span className="badge badge-outline badge-sm">
                          {t.assignee.name ?? t.assignee.email}
                        </span>
                      )}
                      <span
                        className={`text-sm whitespace-nowrap ${
                          overdue ? "text-error font-medium" : "opacity-70"
                        }`}
                      >
                        {due ? due.toISOString().slice(0, 10) : "—"}
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>

        <div className="card bg-base-100 border border-base-300">
          <div className="card-body">
            <div className="flex items-center justify-between">
              <h2 className="card-title text-base">Need to buy</h2>
              <Link href="/shopping" className="link link-hover text-sm">
                See all →
              </Link>
            </div>
            {data.shopping.length === 0 ? (
              <p className="opacity-60 py-4">Shopping list is empty.</p>
            ) : (
              <ul className="divide-y divide-base-200">
                {data.shopping.map((s) => (
                  <li key={s.id} className="py-2 flex items-center gap-3">
                    <span className="flex-1 truncate">
                      <span className="font-medium">{s.name}</span>
                      {s.quantity && (
                        <span className="opacity-70 text-sm"> · {s.quantity}</span>
                      )}
                    </span>
                    {s.recurrence && (
                      <span className="badge badge-outline badge-sm">
                        {s.recurrence.toLowerCase()}
                      </span>
                    )}
                    {s.dueDate && (
                      <span className="text-sm opacity-70 whitespace-nowrap">
                        {s.dueDate.slice(0, 10)}
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function RangePicker<T extends string | number>({
  value,
  onChange,
  options,
}: {
  value: T;
  onChange: (v: T) => void;
  options: Array<{ value: T; label: string }>;
}) {
  return (
    <div className="join">
      {options.map((o) => (
        <button
          key={String(o.value)}
          type="button"
          className={`btn btn-xs join-item ${
            o.value === value ? "btn-primary" : "btn-ghost"
          }`}
          onClick={() => onChange(o.value)}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

function InfoCard({
  title,
  value,
  hint,
  tone,
}: {
  title: string;
  value: string;
  hint: string;
  tone?: "default" | "success" | "warning";
}) {
  const toneClass =
    tone === "success" ? "text-success" : tone === "warning" ? "text-warning" : "";
  return (
    <div className="card bg-base-100 border border-base-300">
      <div className="card-body py-3">
        <div className="text-xs uppercase opacity-60 tracking-wide">{title}</div>
        <div className={`text-lg font-semibold font-mono ${toneClass}`}>{value}</div>
        <div className="text-xs opacity-60">{hint}</div>
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
    <div className="h-64">
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
            formatter={(v, name) => [
              v == null ? "—" : eur.format(Number(v)),
              name === "thisMonth" ? "This month" : "Last month",
            ]}
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
}: {
  data: DashboardDTO["expenses"]["chartData"];
  categories: DashboardDTO["expenses"]["chartCategories"];
}) {
  const colored = categories.map((c, i) => ({
    ...c,
    color: PIE_COLORS[i % PIE_COLORS.length],
  }));

  const idToName = new Map(colored.map((c) => [c.id, c.name]));

  return (
    <div className="space-y-2">
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 8, right: 8, left: -10, bottom: 0 }}>
            <XAxis dataKey="label" tick={{ fontSize: 12 }} stroke="currentColor" />
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
  details,
}: {
  total: number;
  count: number;
  details: DashboardDTO["expenses"]["awaitingDetails"];
}) {
  return (
    <div className="stat group relative overflow-visible">
      <div className="stat-title">Awaiting reimbursement</div>
      <div className={`stat-value ${total > 0 ? "text-warning" : ""}`}>
        {eur.format(total)}
      </div>
      <div className="stat-desc">
        {count === 0
          ? "nothing pending"
          : `${count} expense${count === 1 ? "" : "s"} · hover for details`}
      </div>
      {count > 0 && (
        <div
          className="pointer-events-none absolute right-2 top-full z-20 mt-1 hidden w-80 max-w-[90vw] group-hover:block"
        >
          <div className="card card-compact bg-base-100 border border-base-300 shadow-xl">
            <div className="card-body">
              <h3 className="card-title text-sm">Pending reimbursements</h3>
              <ul className="divide-y divide-base-200 text-sm">
                {details.slice(0, 8).map((d) => (
                  <li key={d.id} className="py-1.5 flex items-start gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="truncate font-medium">{d.description}</div>
                      <div className="text-xs opacity-70 truncate">
                        {d.date.slice(0, 10)}
                        {d.reimburser ? ` · from ${d.reimburser}` : ""}
                      </div>
                    </div>
                    <span className="font-mono whitespace-nowrap">
                      {eur.format(d.amount)}
                    </span>
                  </li>
                ))}
              </ul>
              {details.length > 8 && (
                <div className="text-xs opacity-60">
                  + {details.length - 8} more
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
