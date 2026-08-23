import { normalize } from "./category-icons";

// A larger, hand-picked categorical palette (distinct hue *and*
// saturation/lightness, not just evenly-spaced hue) so categories stay
// visually distinguishable even when there are a dozen-plus of them —
// evenly-spaced hues alone tend to produce look-alike greens/teals.
export const CATEGORY_PALETTE = [
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

// Used for "no subcategory" buckets and any other neutral/synthetic slice
// (e.g. the pie chart's "Other" bucket) that doesn't map to a real category.
export const NEUTRAL_CATEGORY_COLOR = "#9ca3af";

// Explicit color requests for specific categories, matched against the
// normalized (accent-stripped, lowercase) category name. Anything not
// listed here falls back to the palette-by-position assignment below.
export const CATEGORY_COLOR_OVERRIDES: Record<string, string> = {
  outro: "#f76707",
  saude: "#74c0fc",
  carro: "#1864ab",
  casa: "#faa2c1",
  supermercado: "#c2255c",
  refeicoes: "#b197fc",
};

export function paletteColor(i: number): string {
  return i < CATEGORY_PALETTE.length
    ? CATEGORY_PALETTE[i]
    : `hsl(${Math.round((i * 137.508) % 360)}, 68%, 42%)`;
}

// Stable color per category name, independent of sort/display order, so a
// category always renders in the same color across every chart on the Home
// page. Built from the *full* set of categories (sorted alphabetically by
// name) so a given name's color doesn't shift depending on which subset of
// categories happens to be visible in one chart or another. A category's
// own admin-assigned `color` always wins; otherwise falls back to the
// curated overrides/palette below.
export function buildCategoryColorMap(
  categories: Array<{ name: string; color?: string | null }>,
): Map<string, string> {
  const byName = new Map<string, string | null | undefined>();
  for (const c of categories) if (!byName.has(c.name)) byName.set(c.name, c.color);
  const sorted = [...byName.keys()].sort((a, b) => a.localeCompare(b));
  const map = new Map<string, string>();
  sorted.forEach((name, i) => {
    map.set(
      name,
      byName.get(name) || CATEGORY_COLOR_OVERRIDES[normalize(name)] || paletteColor(i),
    );
  });
  return map;
}
