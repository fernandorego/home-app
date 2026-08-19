export type FormState = {
  month: string; // yyyy-mm
  vencimento: string;
  isencaoHorario: string;
  subFerias: string;
  isencaoHorarioFerias: string;
  subsidioNatal: string;
  walletCoverflex: string;
};

export const RUBRIC_KEYS = [
  "isencaoHorario",
  "subFerias",
  "isencaoHorarioFerias",
  "subsidioNatal",
  "walletCoverflex",
] as const;
export type RubricKey = (typeof RUBRIC_KEYS)[number];

export const RUBRIC_LABELS: Record<RubricKey, string> = {
  isencaoHorario: "Isenção de horário",
  subFerias: "Subsídio de férias",
  isencaoHorarioFerias: "Isenção de horário (férias)",
  subsidioNatal: "Subsídio de Natal",
  walletCoverflex: "Wallet (Coverflex)",
};

export const emptyForm = (month: string): FormState => ({
  month,
  vencimento: "",
  isencaoHorario: "",
  subFerias: "",
  isencaoHorarioFerias: "",
  subsidioNatal: "",
  walletCoverflex: "",
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

// vencimento is the only rubric added; every other rubric is subtracted.
export function computeTotal(f: {
  vencimento: string;
  isencaoHorario: string;
  subFerias: string;
  isencaoHorarioFerias: string;
  subsidioNatal: string;
  walletCoverflex: string;
}): number {
  return (
    n(f.vencimento) -
    n(f.isencaoHorario) -
    n(f.subFerias) -
    n(f.isencaoHorarioFerias) -
    n(f.subsidioNatal) -
    n(f.walletCoverflex)
  );
}
