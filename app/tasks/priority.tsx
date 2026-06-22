import type { TaskDTO } from "@/lib/api-client";

export type Priority = TaskDTO["priority"];

export const PRIORITIES: Priority[] = ["LOW", "MEDIUM", "HIGH", "URGENT"];

export const PRIORITY_LABEL: Record<Priority, string> = {
  LOW: "Low",
  MEDIUM: "Medium",
  HIGH: "High",
  URGENT: "Urgent",
};

export const PRIORITY_TEXT_COLOR: Record<Priority, string> = {
  LOW: "text-success",
  MEDIUM: "text-info",
  HIGH: "text-warning",
  URGENT: "text-error",
};

export const PRIORITY_BADGE: Record<Priority, string> = {
  LOW: "badge-success",
  MEDIUM: "badge-info",
  HIGH: "badge-warning",
  URGENT: "badge-error",
};

export function PriorityIcon({
  priority,
  className = "h-4 w-4",
}: {
  priority: Priority;
  className?: string;
}) {
  switch (priority) {
    case "LOW":
      return (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={className}
          aria-hidden="true"
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      );
    case "MEDIUM":
      return (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={className}
          aria-hidden="true"
        >
          <line x1="5" y1="9" x2="19" y2="9" />
          <line x1="5" y1="15" x2="19" y2="15" />
        </svg>
      );
    case "HIGH":
      return (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={className}
          aria-hidden="true"
        >
          <polyline points="18 15 12 9 6 15" />
        </svg>
      );
    case "URGENT":
      return (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={className}
          aria-hidden="true"
        >
          <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
          <line x1="12" y1="9" x2="12" y2="13" />
          <line x1="12" y1="17" x2="12.01" y2="17" />
        </svg>
      );
  }
}

export function PriorityBadge({ priority }: { priority: Priority }) {
  return (
    <span
      className={`badge ${PRIORITY_BADGE[priority]} badge-sm gap-1 text-white`}
    >
      <PriorityIcon priority={priority} className="h-3 w-3" />
      {PRIORITY_LABEL[priority]}
    </span>
  );
}
