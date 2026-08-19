"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { apiFetch, type CategoryDTO } from "@/lib/api-client";
import { CategoryIcon, normalize } from "./category-icons";
import { ExpenseDetailModal, type DetailRow } from "./expense-detail-modal";

const eur = new Intl.NumberFormat("pt-PT", {
  style: "currency",
  currency: "EUR",
});
const eurCompact = new Intl.NumberFormat("pt-PT", {
  style: "currency",
  currency: "EUR",
  notation: "compact",
  maximumFractionDigits: 1,
});
const eurRounded = new Intl.NumberFormat("pt-PT", {
  style: "currency",
  currency: "EUR",
  maximumFractionDigits: 0,
});

// A larger, hand-picked categorical palette (distinct hue *and*
// saturation/lightness, not just evenly-spaced hue) so categories stay
// visually distinguishable even when there are a dozen-plus of them —
// evenly-spaced hues alone tend to produce look-alike greens/teals.
const CATEGORY_PALETTE = [
  "#6929c4",
  "#1192e8",
  "#005d5d",
  "#9f1853",
  "#fa4d56",
  "#198038",
  "#002d9c",
  "#ee538b",
  "#b28600",
  "#009d9a",
  "#8a3800",
  "#a56eff",
  "#d2a106",
  "#4589ff",
  "#d12771",
  "#12b886",
  "#e8590c",
  "#5c7cfa",
];

type Period = "month" | "lastMonth" | "3m" | "6m" | "12m" | "ytd";
type Mode = "totals" | "evolution";

const PERIOD_OPTIONS: Array<{ value: Period; label: string }> = [
  { value: "month", label: "Month" },
  { value: "lastMonth", label: "Last" },
  { value: "3m", label: "3m" },
  { value: "6m", label: "6m" },
  { value: "12m", label: "12m" },
  { value: "ytd", label: "YTD" },
];

type BreakdownResponse = {
  period: Period;
  mode: Mode;
  label: string;
  scopeLabel: string;
  bars: Array<{ key: string; label: string; value: number }>;
};

const NO_SUBCATEGORY_COLOR = "#9ca3af";

// Explicit color requests for specific categories, matched against the
// normalized (accent-stripped, lowercase) category name. Anything not
// listed here falls back to the palette-by-position assignment below.
const CATEGORY_COLOR_OVERRIDES: Record<string, string> = {
  outro: "#f76707",
  saude: "#74c0fc",
  carro: "#1864ab",
  casa: "#faa2c1",
  supermercado: "#c2255c",
  refeicoes: "#b197fc",
};

const LABEL_FONT_SIZE = 10;
const LABEL_CHAR_WIDTH = LABEL_FONT_SIZE * 0.62; // rough width of a digit/comma at this size

// The euro value at the end of each bar: white and inside the bar when it
// fits, otherwise gray and just past the bar's right edge so it never
// overflows on top of a narrow/short bar.
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- matches recharts' LabelList content prop shape
function BarValueLabel(props: any) {
  const x = Number(props.x ?? 0);
  const y = Number(props.y ?? 0);
  const width = Number(props.width ?? 0);
  const height = Number(props.height ?? 0);
  const text = eurRounded.format(Math.round(Number(props.value ?? 0)));
  const textWidth = text.length * LABEL_CHAR_WIDTH;
  const fits = textWidth + 8 <= width;
  const cy = y + height - 4;

  if (fits) {
    return (
      <text
        x={x + width - 6}
        y={cy}
        textAnchor="end"
        fontSize={LABEL_FONT_SIZE}
        fill="#fff"
      >
        {text}
      </text>
    );
  }
  return (
    <text
      x={x + width + 6}
      y={cy}
      textAnchor="start"
      fontSize={LABEL_FONT_SIZE}
      fill="#9ca3af"
    >
      {text}
    </text>
  );
}

// A small colored swatch to the left of each category name on the axis,
// so a category keeps the same color across re-sorts and filter changes.
function CategoryAxisTick({
  x,
  y,
  payload,
  index,
  bars,
  colorFor,
}: {
  x?: string | number;
  y?: string | number;
  payload?: { value?: string };
  index?: number;
  bars: Array<{ key: string; label: string }>;
  colorFor: (key: string) => string;
}) {
  const bar = bars[index ?? -1];
  const color = bar ? colorFor(bar.key) : NO_SUBCATEGORY_COLOR;
  return (
    <g transform={`translate(${x},${y})`}>
      <g transform="translate(-124, -6)">
        <CategoryIcon name={bar?.label ?? ""} color={color} size={12} />
      </g>
      <text
        x={-108}
        y={0}
        dy={4}
        textAnchor="start"
        fontSize={12}
        fill="currentColor"
      >
        {payload?.value}
      </text>
    </g>
  );
}

export function CategoryBreakdownCard() {
  const [period, setPeriod] = useState<Period>("6m");
  const [mode, setMode] = useState<Mode>("totals");
  const [categoryId, setCategoryId] = useState("");
  const [subcategoryId, setSubcategoryId] = useState("");
  const [selectedBar, setSelectedBar] = useState<{
    key: string;
    label: string;
  } | null>(null);

  const categoriesQ = useQuery({
    queryKey: ["categories"],
    queryFn: () => apiFetch<CategoryDTO[]>("/api/categories"),
  });
  const categories = useMemo(() => categoriesQ.data ?? [], [categoriesQ.data]);

  const tops = useMemo(
    () =>
      categories
        .filter((c) => !c.parentId)
        .sort((a, b) => a.name.localeCompare(b.name)),
    [categories],
  );
  const subs = useMemo(
    () =>
      categories
        .filter((c) => c.parentId === categoryId)
        .sort((a, b) => a.name.localeCompare(b.name)),
    [categories, categoryId],
  );

  // Stable color per category id, independent of sort order, so a category
  // always renders in the same color across filters/modes. Bars are either
  // all top-level categories or all subcategories of one category — never a
  // mix — so each is indexed within its own (short) list rather than the
  // combined category+subcategory list, which would push most items past
  // the curated palette and into look-alike generated hues.
  const paletteColor = (i: number) =>
    i < CATEGORY_PALETTE.length
      ? CATEGORY_PALETTE[i]
      : `hsl(${Math.round((i * 137.508) % 360)}, 68%, 42%)`;

  const topColorByKey = useMemo(() => {
    const map = new Map<string, string>();
    tops.forEach((c, i) =>
      map.set(
        c.id,
        CATEGORY_COLOR_OVERRIDES[normalize(c.name)] ?? paletteColor(i),
      ),
    );
    return map;
  }, [tops]);
  const subColorByKey = useMemo(() => {
    const map = new Map<string, string>();
    subs.forEach((c, i) =>
      map.set(
        c.id,
        CATEGORY_COLOR_OVERRIDES[normalize(c.name)] ?? paletteColor(i),
      ),
    );
    return map;
  }, [subs]);
  const colorFor = (key: string) => {
    if (key === "__none__") return NO_SUBCATEGORY_COLOR;
    return (
      topColorByKey.get(key) ?? subColorByKey.get(key) ?? CATEGORY_PALETTE[0]
    );
  };

  const queryParams = useMemo(() => {
    const sp = new URLSearchParams();
    sp.set("period", period);
    sp.set("mode", mode);
    if (categoryId) sp.set("categoryId", categoryId);
    if (subcategoryId) sp.set("subcategoryId", subcategoryId);
    return sp.toString();
  }, [period, mode, categoryId, subcategoryId]);

  const { data, isLoading } = useQuery({
    queryKey: ["dashboard-category-breakdown", queryParams],
    queryFn: () =>
      apiFetch<BreakdownResponse>(
        `/api/dashboard/category-breakdown?${queryParams}`,
      ),
  });

  const bars = data?.bars ?? [];
  const chartHeight = Math.max(140, bars.length * 26 + 16);
  const total = bars.reduce((s, b) => s + b.value, 0);

  const detailParams = useMemo(() => {
    if (!selectedBar) return null;
    const sp = new URLSearchParams(queryParams);
    sp.set("barKey", selectedBar.key);
    return sp.toString();
  }, [queryParams, selectedBar]);

  const { data: detailData, isLoading: detailLoading } = useQuery({
    queryKey: ["dashboard-category-breakdown-expenses", detailParams],
    queryFn: () =>
      apiFetch<{ details: DetailRow[] }>(
        `/api/dashboard/category-breakdown/expenses?${detailParams}`,
      ),
    enabled: !!detailParams,
  });

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_auto] gap-4 items-start">
      <div className="card bg-base-100 border border-base-300">
        <div className="card-body">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <h2 className="card-title text-base">Category breakdown</h2>
            <div className="join">
              <button
                type="button"
                className={`btn btn-xs join-item ${mode === "totals" ? "btn-primary" : "btn-ghost"}`}
                onClick={() => setMode("totals")}
              >
                Totals
              </button>
              <button
                type="button"
                className={`btn btn-xs join-item ${mode === "evolution" ? "btn-primary" : "btn-ghost"}`}
                onClick={() => setMode("evolution")}
              >
                Evolution
              </button>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <select
              className="select select-sm select-bordered"
              value={subcategoryId}
              onChange={(ev) => setSubcategoryId(ev.target.value)}
              disabled={!categoryId || subs.length === 0}
            >
              <option value="">All subcategories</option>
              {subs.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
            <div className="join ml-auto">
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

          <p className="text-xs opacity-60 -mb-1">
            {data ? `${data.scopeLabel} · ${data.label}` : ""}
          </p>

          <div className="flex gap-3">
            {/* Category filter labels, to the left of the chart */}
            <div className="flex flex-col gap-0.5 shrink-0 w-28">
              <button
                type="button"
                className={`btn btn-xs justify-start ${categoryId === "" ? "btn-primary" : "btn-ghost"}`}
                onClick={() => {
                  setCategoryId("");
                  setSubcategoryId("");
                }}
              >
                All
              </button>
              {tops.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  className={`btn btn-xs justify-start gap-1.5 ${categoryId === c.id ? "btn-primary" : "btn-ghost"}`}
                  onClick={() => {
                    setCategoryId(c.id);
                    setSubcategoryId("");
                  }}
                >
                  <CategoryIcon
                    name={c.name}
                    color={
                      categoryId === c.id
                        ? "currentColor"
                        : (topColorByKey.get(c.id) ?? NO_SUBCATEGORY_COLOR)
                    }
                    size={12}
                  />
                  <span className="truncate">{c.name}</span>
                </button>
              ))}
            </div>

            <div className="flex-1 min-w-0">
              {isLoading ? (
                <div className="h-48 flex items-center justify-center">
                  <span className="loading loading-spinner loading-md" />
                </div>
              ) : bars.length === 0 ? (
                <div className="h-48 flex items-center justify-center opacity-50">
                  No expenses in this period.
                </div>
              ) : (
                <div style={{ height: chartHeight }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={bars}
                      layout="vertical"
                      margin={{ top: 4, right: 24, bottom: 4, left: 4 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                      <XAxis
                        type="number"
                        tickFormatter={(v: number) => eurCompact.format(v)}
                        tick={{ fontSize: 12 }}
                        stroke="currentColor"
                      />
                      <YAxis
                        type="category"
                        dataKey="label"
                        width={132}
                        tick={(props) => (
                          <CategoryAxisTick
                            {...props}
                            bars={bars}
                            colorFor={colorFor}
                          />
                        )}
                        stroke="currentColor"
                      />
                      <Tooltip
                        cursor={{ fill: "var(--color-base-200)" }}
                        content={({ active, payload }) => {
                          if (!active || !payload?.length) return null;
                          const p = payload[0];
                          return (
                            <div
                              style={{
                                background: "var(--color-base-100)",
                                border: "1px solid var(--color-base-300)",
                                borderRadius: 8,
                                fontSize: 12,
                                padding: "6px 10px",
                              }}
                            >
                              <div className="font-medium">
                                {p.payload.label}
                              </div>
                              <div className="font-mono">
                                {eur.format(Number(p.value))}
                              </div>
                            </div>
                          );
                        }}
                      />
                      <Bar
                        dataKey="value"
                        radius={[0, 4, 4, 0]}
                        cursor="pointer"
                        onClick={(d) => {
                          const bar = d.payload as {
                            key: string;
                            label: string;
                          };
                          setSelectedBar({ key: bar.key, label: bar.label });
                        }}
                      >
                        {bars.map((b, i) => (
                          <Cell key={i} fill={colorFor(b.key)} />
                        ))}
                        <LabelList dataKey="value" content={BarValueLabel} />
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="card bg-base-100 border border-base-300 lg:w-48">
        <div className="card-body py-4 items-center text-center">
          <div className="text-xs uppercase opacity-60 tracking-wide">
            Total
          </div>
          <div className="text-2xl font-semibold font-mono">
            {eur.format(total)}
          </div>
          <div className="text-xs opacity-60">
            {data ? `${data.scopeLabel} · ${data.label}` : ""}
          </div>
        </div>
      </div>

      <ExpenseDetailModal
        open={!!selectedBar}
        onClose={() => setSelectedBar(null)}
        title={selectedBar?.label ?? ""}
        rows={detailData?.details ?? []}
        loading={detailLoading}
      />
    </div>
  );
}
