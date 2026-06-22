"use client";

import { CheckIcon, PlusIcon, XIcon } from "@/components/icons";
import type { UserDTO } from "@/lib/api-client";
import {
  PRIORITIES,
  PRIORITY_LABEL,
  PRIORITY_TEXT_COLOR,
  PriorityIcon,
} from "./priority";
import { RECURRENCES, RECURRENCE_LABEL, type FormState } from "./types";

type Props = {
  value: FormState;
  onChange: (next: FormState) => void;
  onSubmit: () => void;
  onCancel?: () => void;
  busy?: boolean;
  isEdit?: boolean;
  users: UserDTO[];
};

export function TaskFormRow({
  value,
  onChange,
  onSubmit,
  onCancel,
  busy,
  isEdit,
  users,
}: Props) {
  const set = <K extends keyof FormState>(key: K, v: FormState[K]) =>
    onChange({ ...value, [key]: v });

  const canSubmit = !!value.description.trim() && !!value.priority && !busy;

  return (
    <tr className={isEdit ? "bg-warning/10" : "bg-base-200"}>
      <td>
        <input
          type="text"
          className="input input-sm input-bordered w-full min-w-32"
          placeholder="Description"
          value={value.description}
          onChange={(e) => set("description", e.target.value)}
        />
      </td>
      <td>
        <input
          type="date"
          className="input input-sm input-bordered"
          value={value.deadline}
          onChange={(e) => set("deadline", e.target.value)}
        />
      </td>
      <td>
        <select
          className="select select-sm select-bordered"
          value={value.recurrence}
          onChange={(e) => set("recurrence", e.target.value as FormState["recurrence"])}
        >
          <option value="">One-off</option>
          {RECURRENCES.map((r) => (
            <option key={r} value={r}>
              {RECURRENCE_LABEL[r]}
            </option>
          ))}
        </select>
      </td>
      <td>
        <div className="flex items-center gap-1">
          <PriorityIcon
            priority={value.priority}
            className={`h-4 w-4 shrink-0 ${PRIORITY_TEXT_COLOR[value.priority]}`}
          />
          <select
            className="select select-sm select-bordered"
            value={value.priority}
            onChange={(e) => set("priority", e.target.value as FormState["priority"])}
          >
            {PRIORITIES.map((p) => (
              <option key={p} value={p}>
                {PRIORITY_LABEL[p]}
              </option>
            ))}
          </select>
        </div>
      </td>
      <td>
        <select
          className="select select-sm select-bordered"
          value={value.assigneeId}
          onChange={(e) => set("assigneeId", e.target.value)}
        >
          <option value="">Unassigned</option>
          {users.map((u) => (
            <option key={u.id} value={u.id}>
              {u.name ?? u.email}
            </option>
          ))}
        </select>
      </td>
      <td>
        <div className="join">
          <button
            type="button"
            className="btn btn-sm btn-primary btn-square join-item"
            onClick={onSubmit}
            disabled={!canSubmit}
            aria-label={isEdit ? "Save" : "Add task"}
            title={isEdit ? "Save" : "Add task"}
          >
            {busy ? (
              <span className="loading loading-spinner loading-xs" />
            ) : isEdit ? (
              <CheckIcon />
            ) : (
              <PlusIcon />
            )}
          </button>
          {onCancel && (
            <button
              type="button"
              className="btn btn-sm btn-ghost btn-square join-item"
              onClick={onCancel}
              disabled={busy}
              aria-label="Cancel"
              title="Cancel"
            >
              <XIcon />
            </button>
          )}
        </div>
      </td>
    </tr>
  );
}
