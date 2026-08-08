"use client";

import { useTransition } from "react";
import { updateStatus } from "@/lib/actions";
import { STATUSES, STATUS_STYLES } from "@/lib/statuses";

export default function StatusSelect({
  id,
  status,
}: {
  id: number;
  status: string;
}) {
  const [pending, startTransition] = useTransition();
  return (
    <select
      value={status}
      disabled={pending}
      onChange={(e) => {
        const v = e.target.value;
        startTransition(() => updateStatus(id, v));
      }}
      className={`rounded-lg border px-2 py-1.5 text-sm font-medium outline-none ${
        STATUS_STYLES[status] ?? "bg-slate-50 text-slate-700 border-slate-300"
      } ${pending ? "opacity-50" : ""}`}
    >
      {STATUSES.map((s) => (
        <option key={s} value={s}>
          {s}
        </option>
      ))}
    </select>
  );
}
