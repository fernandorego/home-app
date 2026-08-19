import type { CoverflexStatus } from "@/lib/api-client";
import { CheckIcon, ClockIcon, ReceiptIcon } from "@/components/icons";

const COVERFLEX_ORDER: CoverflexStatus[] = ["RECEIPT", "WAITING", "PAID"];

export const COVERFLEX_LABELS: Record<CoverflexStatus, string> = {
  RECEIPT: "Receipt",
  WAITING: "Waiting",
  PAID: "Paid",
};

export function nextCoverflexStatus(status: CoverflexStatus): CoverflexStatus {
  const i = COVERFLEX_ORDER.indexOf(status);
  return COVERFLEX_ORDER[(i + 1) % COVERFLEX_ORDER.length];
}

export function coverflexBtnClass(status: CoverflexStatus): string {
  switch (status) {
    case "RECEIPT":
      return "text-base-content/50 hover:text-info hover:bg-info/10";
    case "WAITING":
      return "text-warning hover:bg-warning/10";
    case "PAID":
      return "text-success hover:bg-success/10";
  }
}

export function CoverflexIcon({ status }: { status: CoverflexStatus }) {
  switch (status) {
    case "RECEIPT":
      return <ReceiptIcon />;
    case "WAITING":
      return <ClockIcon />;
    case "PAID":
      return <CheckIcon />;
  }
}
