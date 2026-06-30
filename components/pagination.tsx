"use client";

export function Pagination({
  page,
  total,
  pageSize,
  onChange,
}: {
  page: number;
  total: number;
  pageSize: number;
  onChange: (page: number) => void;
}) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  if (totalPages <= 1) return null;

  const from = (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);

  return (
    <div className="flex items-center justify-between text-sm">
      <span className="opacity-60">
        {from}–{to} of {total}
      </span>
      <div className="join">
        <button
          type="button"
          className="join-item btn btn-sm"
          disabled={page === 1}
          onClick={() => onChange(1)}
        >
          «
        </button>
        <button
          type="button"
          className="join-item btn btn-sm"
          disabled={page === 1}
          onClick={() => onChange(page - 1)}
        >
          ‹
        </button>
        <button
          type="button"
          className="join-item btn btn-sm pointer-events-none"
        >
          {page} / {totalPages}
        </button>
        <button
          type="button"
          className="join-item btn btn-sm"
          disabled={page === totalPages}
          onClick={() => onChange(page + 1)}
        >
          ›
        </button>
        <button
          type="button"
          className="join-item btn btn-sm"
          disabled={page === totalPages}
          onClick={() => onChange(totalPages)}
        >
          »
        </button>
      </div>
    </div>
  );
}
