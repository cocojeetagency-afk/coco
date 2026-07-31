"use client";

import { useActionState, useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { STATUSES } from "@/lib/statuses";
import type { OrderFormState } from "@/lib/actions";
import { deleteOrder } from "@/lib/actions";

export type OrderFormValues = {
  id?: number;
  order_number?: number;
  order_date: string; // datetime-local value in IST
  loading_date: string;
  seller: string;
  buyer: string;
  confirmation_date: string;
  actual_loading_date: string;
  rate: string;
  quantity: string;
  status: string;
  remarks: string;
};

function monthKeyOf(datetimeLocal: string): string {
  return datetimeLocal.slice(0, 7);
}

function monthLabelOf(key: string): string {
  const [y, m] = key.split("-").map(Number);
  return new Intl.DateTimeFormat("en-IN", {
    month: "long",
    year: "numeric",
  }).format(new Date(Date.UTC(y, m - 1, 1)));
}

const label = "mb-1 block text-sm font-semibold text-slate-700";
const input =
  "w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-base outline-none focus:border-green-600 focus:ring-2 focus:ring-green-100";

export default function OrderForm({
  initial,
  action,
  initialNumber,
}: {
  initial: OrderFormValues;
  action: (prev: OrderFormState, formData: FormData) => Promise<OrderFormState>;
  initialNumber: number;
}) {
  const [state, formAction, pending] = useActionState(action, undefined);
  const [orderDate, setOrderDate] = useState(initial.order_date);
  const [previewNumber, setPreviewNumber] = useState<number | null>(
    initialNumber
  );
  const [deleting, startDelete] = useTransition();
  const router = useRouter();

  const monthKey = monthKeyOf(orderDate);
  const initialMonth = monthKeyOf(initial.order_date);
  const isEdit = initial.id !== undefined;

  useEffect(() => {
    // Same month as loaded: for edits keep the existing number; for new, keep server-computed
    if (monthKey === initialMonth) {
      setPreviewNumber(initialNumber);
      return;
    }
    let cancelled = false;
    setPreviewNumber(null);
    const url = `/api/next-number?month=${monthKey}${isEdit ? `&exclude=${initial.id}` : ""}`;
    fetch(url)
      .then((r) => r.json())
      .then((d) => {
        if (!cancelled && typeof d.next === "number") setPreviewNumber(d.next);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [monthKey, initialMonth, initialNumber, isEdit, initial.id]);

  return (
    <form action={formAction} className="space-y-4">
      {/* Order number + period */}
      <div className="grid grid-cols-2 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-r border-slate-200 p-4">
          <p className="text-sm text-slate-500">Order Number (Auto)</p>
          <p className="text-2xl font-bold text-green-800">
            {previewNumber ?? "…"}
          </p>
        </div>
        <div className="p-4">
          <p className="text-sm text-slate-500">Period</p>
          <p className="text-lg font-bold text-green-700">
            {monthLabelOf(monthKey)}
          </p>
          <p className="text-[11px] text-slate-400">
            Numbers reset every month
          </p>
        </div>
      </div>

      <div>
        <label htmlFor="order_date" className={label}>
          Order Date <span className="text-red-600">*</span>{" "}
          <span className="font-normal text-slate-400">(IST)</span>
        </label>
        <input
          id="order_date"
          type="datetime-local"
          name="order_date"
          required
          value={orderDate}
          onChange={(e) => e.target.value && setOrderDate(e.target.value)}
          className={input}
        />
      </div>

      <div>
        <label htmlFor="loading_date" className={label}>
          Loading Date
        </label>
        <input
          id="loading_date"
          type="date"
          name="loading_date"
          defaultValue={initial.loading_date}
          className={input}
        />
        <p className="mt-1 text-xs text-slate-400">
          Telegram reminder is sent 1 day before this date if actual loading /
          confirmation is still empty.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="seller" className={label}>
            Seller <span className="text-red-600">*</span>
          </label>
          <input
            id="seller"
            name="seller"
            required
            defaultValue={initial.seller}
            placeholder="Enter seller name"
            className={input}
          />
        </div>
        <div>
          <label htmlFor="buyer" className={label}>
            Buyer <span className="text-red-600">*</span>
          </label>
          <input
            id="buyer"
            name="buyer"
            required
            defaultValue={initial.buyer}
            placeholder="Enter buyer name"
            className={input}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="confirmation_date" className={label}>
            Confirmation Date
          </label>
          <input
            id="confirmation_date"
            type="date"
            name="confirmation_date"
            defaultValue={initial.confirmation_date}
            className={input}
          />
        </div>
        <div>
          <label htmlFor="actual_loading_date" className={label}>
            Actual Loading Date
          </label>
          <input
            id="actual_loading_date"
            type="date"
            name="actual_loading_date"
            defaultValue={initial.actual_loading_date}
            className={input}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="rate" className={label}>
            Rate (₹) <span className="text-red-600">*</span>
          </label>
          <input
            id="rate"
            name="rate"
            type="number"
            step="0.01"
            min="0.01"
            inputMode="decimal"
            required
            defaultValue={initial.rate}
            placeholder="Enter rate"
            className={input}
          />
        </div>
        <div>
          <label htmlFor="quantity" className={label}>
            Quantity (MT)
          </label>
          <input
            id="quantity"
            name="quantity"
            type="number"
            step="0.001"
            min="0.001"
            inputMode="decimal"
            defaultValue={initial.quantity}
            placeholder="Optional"
            className={input}
          />
        </div>
      </div>

      <div>
        <label htmlFor="status" className={label}>
          Status <span className="text-red-600">*</span>
        </label>
        <select
          id="status"
          name="status"
          defaultValue={initial.status}
          className={input}
        >
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor="remarks" className={label}>
          Remarks
        </label>
        <textarea
          id="remarks"
          name="remarks"
          rows={2}
          defaultValue={initial.remarks}
          placeholder="Optional"
          className={input}
        />
      </div>

      {state?.error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm font-medium text-red-700">
          {state.error}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-xl bg-green-700 py-3.5 text-base font-bold text-white shadow-md transition active:scale-[0.98] disabled:opacity-60"
      >
        {pending ? "Saving..." : "💾 SAVE ORDER"}
      </button>
      <p className="text-center text-xs text-slate-400">
        <span className="text-red-600">*</span> Indicates mandatory field
      </p>

      {isEdit && (
        <button
          type="button"
          disabled={deleting}
          onClick={() => {
            if (confirm("Delete this order permanently?"))
              startDelete(() => deleteOrder(initial.id!));
          }}
          className="w-full rounded-xl border border-red-300 py-3 text-sm font-semibold text-red-600 disabled:opacity-60"
        >
          {deleting ? "Deleting..." : "🗑 Delete Order"}
        </button>
      )}

      <button
        type="button"
        onClick={() => router.back()}
        className="w-full rounded-xl border border-slate-300 py-3 text-sm font-semibold text-slate-600"
      >
        Cancel
      </button>
    </form>
  );
}
