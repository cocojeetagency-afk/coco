"use client";

import { useTransition } from "react";
import { updateStatus } from "@/lib/actions";
import { STATUSES } from "@/lib/statuses";

const styles: Record<string, string> = {
  Pending: "bg-amber-50 text-amber-700 border-amber-300",
  Confirmed: "bg-blue-50 text-blue-700 border-blue-300",
  Loaded: "bg-purple-50 text-purple-700 border-purple-300",
  Delivered: "bg-green-50 text-green-700 border-green-300",
  Cancelled: "bg-red-50 text-red-600 border-red-300",
};

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
        styles[status] ?? "bg-slate-50 text-slate-700 border-slate-300"
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
