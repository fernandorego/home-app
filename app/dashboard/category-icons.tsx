import type { ReactNode } from "react";

export function normalize(name: string): string {
  const stripped = Array.from(name.normalize("NFD"))
    .filter((ch) => {
      const code = ch.codePointAt(0) ?? 0;
      return code < 0x0300 || code > 0x036f;
    })
    .join("");
  return stripped.toLowerCase();
}

// Keyword -> icon paths (viewBox 0 0 24 24, stroke-based to match the rest
// of the icon set). Matched against the category name so no schema change
// (a per-category icon field) is needed for this small visual touch.
const ICON_RULES: Array<{ match: string; paths: ReactNode }> = [
  {
    match: "saude",
    paths: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 8v8M8 12h8" />
      </>
    ),
  },
  {
    match: "casa",
    paths: (
      <>
        <path d="M4 11.5 12 4l8 7.5" />
        <path d="M6 10v9h12v-9" />
      </>
    ),
  },
  {
    match: "carro",
    paths: (
      <>
        <path d="M4 16v-5l2-4h12l2 4v5" />
        <path d="M4 16h16" />
        <circle cx="8" cy="17.5" r="1.5" />
        <circle cx="16" cy="17.5" r="1.5" />
      </>
    ),
  },
  {
    match: "combustivel",
    paths: (
      <>
        <path d="M4 21V6a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v15" />
        <path d="M4 12h8" />
        <path d="M16 8h1a2 2 0 0 1 2 2v3a2 2 0 0 0 2 2" />
      </>
    ),
  },
  {
    match: "parque",
    paths: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M10 16V8h3a3 3 0 0 1 0 6h-3" />
      </>
    ),
  },
  {
    match: "refeic",
    paths: (
      <>
        <path d="M7 2v8M5 2v5a2 2 0 0 0 4 0V2" />
        <path d="M9 10v11" />
        <path d="M17 2c-2 3-2 6 0 9v11" />
      </>
    ),
  },
  {
    match: "supermercado",
    paths: (
      <>
        <path d="M3 4h2l2 12h11l2-8H7" />
        <circle cx="9" cy="19" r="1" />
        <circle cx="16" cy="19" r="1" />
      </>
    ),
  },
  {
    match: "ferias",
    paths: (
      <>
        <circle cx="12" cy="12" r="4" />
        <path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M19.1 4.9 17 7M7 17l-2.1 2.1" />
      </>
    ),
  },
  {
    match: "propinas",
    paths: (
      <>
        <path d="M2 9l10-4 10 4-10 4-10-4z" />
        <path d="M6 11v4c0 1.5 3 3 6 3s6-1.5 6-3v-4" />
      </>
    ),
  },
];

function KmIcon() {
  return (
    <>
      <path d="M12 21s7-7.5 7-12a7 7 0 1 0-14 0c0 4.5 7 12 7 12z" />
      <circle cx="12" cy="9" r="2.5" />
    </>
  );
}

function OtherIcon() {
  return (
    <>
      <rect x="3" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" />
      <rect x="14" y="14" width="7" height="7" rx="1" />
    </>
  );
}

function iconPathsFor(name: string): ReactNode {
  const n = normalize(name);
  if (n.includes("km") || n.includes("cliente")) return <KmIcon />;
  const rule = ICON_RULES.find((r) => n.includes(r.match));
  return rule ? rule.paths : <OtherIcon />;
}

export function CategoryIcon({
  name,
  color,
  size = 12,
}: {
  name: string;
  color: string;
  size?: number;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {iconPathsFor(name)}
    </svg>
  );
}
