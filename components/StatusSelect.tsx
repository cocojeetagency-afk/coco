"use client";

import { useOptimistic, useTransition } from "react";
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
  // Show the picked status (and its colour) straight away, while it saves
  const [shown, setShown] = useOptimistic(status);
  return (
    <select
      value={shown}
      disabled={pending}
      onChange={(e) => {
        const v = e.target.value;
        startTransition(async () => {
          setShown(v);
          await updateStatus(id, v);
        });
      }}
      className={`rounded-lg border px-2 py-1.5 text-sm font-semibold outline-none ${
        STATUS_STYLES[shown] ?? "bg-slate-50 text-slate-700 border-slate-300"
      } ${pending ? "opacity-50" : ""}`}
    >
      {STATUSES.map((s) => (
        <option key={s} value={s} className="bg-white text-slate-800">
          {s}
        </option>
      ))}
    </select>
  );
}
