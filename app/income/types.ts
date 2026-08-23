// A rubric line being edited. `id` is present once it's an existing saved
// line (needed for nothing client-side right now, but kept for stable keys
// when re-ordering); percentages are edited as whole numbers ("23" = 23%)
// and converted to fractions only when sent to the API.
export type LineFormState = {
  key: string; // stable React key, independent of whether it's saved yet
  id?: string;
  sourceTypeId: string;
  grossAmount: string;
  irsPct: string;
  ssPct: string;
  note: string;
};

export type FormState = {
  month: string; // yyyy-mm
  lines: LineFormState[];
};

let keySeq = 0;
export function newLineKey(): string {
  keySeq += 1;
  return `line-${keySeq}`;
}

export function emptyLine(
  overrides?: Partial<Pick<LineFormState, "sourceTypeId" | "irsPct" | "ssPct">>,
): LineFormState {
  return {
    key: newLineKey(),
    sourceTypeId: "",
    grossAmount: "",
    irsPct: "0",
    ssPct: "0",
    note: "",
    ...overrides,
  };
}

export const emptyForm = (month: string): FormState => ({
  month,
  lines: [],
});

export function currentMonthIso(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export function monthLabel(iso: string): string {
  const [y, m] = iso.split("-").map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString("en-US", {
    month: "short",
    year: "numeric",
  });
}

function n(v: string): number {
  const x = Number(v || 0);
  return Number.isFinite(x) ? x : 0;
}

export function lineNet(l: { grossAmount: string; irsPct: string; ssPct: string }): number {
  const gross = n(l.grossAmount);
  const irs = n(l.irsPct) / 100;
  const ss = n(l.ssPct) / 100;
  return gross * (1 - irs - ss);
}

export function computeTotal(lines: LineFormState[]): number {
  return lines.reduce((s, l) => s + lineNet(l), 0);
}
