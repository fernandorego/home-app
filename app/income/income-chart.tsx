"use client";

import { useMemo } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  LabelList,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { IncomeEntryDTO } from "@/lib/api-client";

const eur = new Intl.NumberFormat("pt-PT", { style: "currency", currency: "EUR" });
const eurCompact = new Intl.NumberFormat("pt-PT", {
  style: "currency",
  currency: "EUR",
  notation: "compact",
  maximumFractionDigits: 1,
});

const USER_COLORS = ["#570df8", "#37cdbe", "#fbbd23", "#f000b8"];

const MONTH_LABELS = Array.from({ length: 12 }, (_, i) =>
  new Date(2000, i, 1).toLocaleDateString("en-US", { month: "short" }),
);

// Chart + summary card side by side, mirroring the Category breakdown /
// Total layout on the Home dashboard.
export function IncomeChartSection({
  entries,
  year,
}: {
  entries: IncomeEntryDTO[];
  year: number;
}) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_auto] gap-4 items-stretch">
      <IncomeChart entries={entries} year={year} />
      <IncomeSummaryCard entries={entries} year={year} />
    </div>
  );
}

// One bar per month (Jan -> Dec, always in order), stacked by person when
// more than one has entries in the selected year — bar height is each
// month's total income.
function IncomeChart({
  entries,
  year,
}: {
  entries: IncomeEntryDTO[];
  year: number;
}) {
  const users = useMemo(() => {
    const map = new Map<string, string>();
    for (const e of entries) map.set(e.userId, e.user.name ?? e.user.email);
    return [...map.entries()].map(([id, name]) => ({ id, name }));
  }, [entries]);

  const data = useMemo(() => {
    return MONTH_LABELS.map((label, i) => {
      const point: Record<string, string | number> = { label };
      for (const u of users) point[u.id] = 0;
      for (const e of entries) {
        if (new Date(e.month).getUTCMonth() !== i) continue;
        point[e.userId] = (Number(point[e.userId]) || 0) + e.total;
      }
      return point;
    });
  }, [entries, users]);

  const userName = (id: string) => users.find((u) => u.id === id)?.name ?? id;

  return (
    <div className="card bg-base-100 border border-base-300">
      <div className="card-body py-3">
        <h2 className="card-title text-base">Income by month — {year}</h2>
        {entries.length === 0 ? (
          <div className="h-32 flex items-center justify-center opacity-50">
            No income entries for {year}.
          </div>
        ) : (
          <div className="h-32">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data} margin={{ top: 18, right: 8, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 11 }} stroke="currentColor" />
                <YAxis
                  tick={{ fontSize: 11 }}
                  stroke="currentColor"
                  tickFormatter={(v: number) => eurCompact.format(v)}
                  width={52}
                />
                <Tooltip
                  contentStyle={{
                    background: "var(--color-base-100)",
                    border: "1px solid var(--color-base-300)",
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                  formatter={(v, name) => [eur.format(Number(v)), userName(String(name))]}
                />
                {users.length > 1 && (
                  <Legend formatter={(value) => userName(String(value))} />
                )}
                {users.map((u, i) => (
                  <Bar
                    key={u.id}
                    dataKey={u.id}
                    name={u.id}
                    stackId="income"
                    fill={USER_COLORS[i % USER_COLORS.length]}
                    radius={i === users.length - 1 ? [4, 4, 0, 0] : undefined}
                  >
                    <LabelList
                      dataKey={u.id}
                      position="top"
                      fill="#000"
                      fontSize={10}
                      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- matches recharts' LabelList formatter prop shape
                      formatter={(v: any) => {
                        const n = Number(v);
                        return n > 0 ? eurCompact.format(n) : "";
                      }}
                    />
                  </Bar>
                ))}
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </div>
  );
}

// The monthly average is spread over the months that actually have an
// entry (not a flat /12), so it stays meaningful before the year is over.
function IncomeSummaryCard({
  entries,
  year,
}: {
  entries: IncomeEntryDTO[];
  year: number;
}) {
  const total = entries.reduce((s, e) => s + e.total, 0);
  const monthsWithData = new Set(entries.map((e) => new Date(e.month).getUTCMonth())).size;
  const average = monthsWithData > 0 ? total / monthsWithData : 0;
  const totalIrs = entries.reduce(
    (s, e) => s + e.lines.reduce((s2, l) => s2 + l.grossAmount * l.irsPct, 0),
    0,
  );
  const totalSs = entries.reduce(
    (s, e) => s + e.lines.reduce((s2, l) => s2 + l.grossAmount * l.ssPct, 0),
    0,
  );

  return (
    <div className="card bg-base-100 border border-base-300 lg:w-56">
      <div className="card-body py-4 gap-3">
        <div>
          <div className="text-xs uppercase opacity-60 tracking-wide">
            Monthly average
          </div>
          <div className="text-xl font-semibold font-mono">{eur.format(average)}</div>
        </div>
        <div>
          <div className="text-xs uppercase opacity-60 tracking-wide">
            Annual total · {year}
          </div>
          <div className="text-xl font-semibold font-mono">{eur.format(total)}</div>
        </div>
        <div className="pt-2 border-t border-base-300 space-y-1">
          <div className="flex items-center justify-between text-sm">
            <span className="opacity-70">IRS withheld</span>
            <span className="font-mono">{eur.format(totalIrs)}</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="opacity-70">SS withheld</span>
            <span className="font-mono">{eur.format(totalSs)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
