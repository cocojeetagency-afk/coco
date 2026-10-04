"use client";

import { useActionState, useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { STATUSES, STATUS_STYLES } from "@/lib/statuses";
import type { OrderFormState } from "@/lib/actions";
import { deleteOrder } from "@/lib/actions";
import type { Party } from "@/lib/db";
import PartySelect from "@/components/PartySelect";
import { todayIST } from "@/lib/dates";

export type OrderFormValues = {
  id?: number;
  order_number?: number;
  order_date: string; // datetime-local value in IST
  loading_date: string;
  seller: string;
  seller_phone: string;
  buyer: string;
  buyer_phone: string;
  actual_loading_date: string;
  rate: string;
  quantity: string;
  details: string;
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
  sellers,
  buyers,
}: {
  initial: OrderFormValues;
  action: (prev: OrderFormState, formData: FormData) => Promise<OrderFormState>;
  initialNumber: number;
  sellers: Party[];
  buyers: Party[];
}) {
  const [state, formAction, pending] = useActionState(action, undefined);
  const [orderDate, setOrderDate] = useState(initial.order_date);
  const [status, setStatus] = useState(initial.status);
  const [actualLoading, setActualLoading] = useState(initial.actual_loading_date);
  const [numbersByMonth, setNumbersByMonth] = useState<Record<string, number>>(
    {}
  );
  const [deleting, startDelete] = useTransition();
  const router = useRouter();

  const monthKey = monthKeyOf(orderDate);
  const initialMonth = monthKeyOf(initial.order_date);
  const isEdit = initial.id !== undefined;

  // Same month as loaded: keep the existing (edit) or server-computed (new) number.
  // Another month: show the next free number of that month, fetched on demand.
  const previewNumber =
    monthKey === initialMonth ? initialNumber : (numbersByMonth[monthKey] ?? null);

  useEffect(() => {
    if (monthKey === initialMonth || numbersByMonth[monthKey] !== undefined)
      return;
    let cancelled = false;
    const url = `/api/next-number?month=${monthKey}${isEdit ? `&exclude=${initial.id}` : ""}`;
    fetch(url)
      .then((r) => r.json())
      .then((d) => {
        if (!cancelled && typeof d.next === "number")
          setNumbersByMonth((prev) => ({ ...prev, [monthKey]: d.next }));
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [monthKey, initialMonth, isEdit, initial.id, numbersByMonth]);

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
          A Telegram reminder is sent 1 day before this date if the Actual
          Loading Date is still empty.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <PartySelect
          title="Seller"
          field="seller"
          options={sellers}
          defaultName={initial.seller}
          defaultPhone={initial.seller_phone}
        />
        <PartySelect
          title="Buyer"
          field="buyer"
          options={buyers}
          defaultName={initial.buyer}
          defaultPhone={initial.buyer_phone}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="rate" className={label}>
            Rate (₹) <span className="text-red-600">*</span>
          </label>
          <input
            id="rate"
            name="rate"
            type="text"
            autoComplete="off"
            required
            defaultValue={initial.rate}
            placeholder="Enter rate"
            className={input}
          />
        </div>
        <div>
          <label htmlFor="quantity" className={label}>
            Quantity
          </label>
          <input
            id="quantity"
            name="quantity"
            type="text"
            autoComplete="off"
            defaultValue={initial.quantity}
            placeholder="e.g. 200 bags"
            className={input}
          />
        </div>
      </div>

      <div>
        <label htmlFor="details" className={label}>
          Order Details
        </label>
        <textarea
          id="details"
          name="details"
          rows={2}
          defaultValue={initial.details}
          placeholder="e.g. 60 bharti, 50 bharti 5 patta"
          className={input}
        />
      </div>

      <div>
        <label htmlFor="status" className={label}>
          Status <span className="text-red-600">*</span>
        </label>
        <select
          id="status"
          name="status"
          value={status}
          onChange={(e) => {
            const v = e.target.value;
            setStatus(v);
            // Marking an order Loaded stamps today's date automatically
            if (v === "Loaded" && !actualLoading) setActualLoading(todayIST());
          }}
          className={`${input.replace("bg-white ", "").replace("border-slate-300 ", "")} font-semibold ${
            STATUS_STYLES[status] ?? "bg-white border-slate-300"
          }`}
        >
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor="actual_loading_date" className={label}>
          Actual Loading Date
        </label>
        <input
          id="actual_loading_date"
          type="date"
          name="actual_loading_date"
          value={actualLoading}
          onChange={(e) => setActualLoading(e.target.value)}
          className={input}
        />
        <p className="mt-1 text-xs text-slate-400">
          Filled in automatically with today&apos;s date when you set the status
          to <b>Loaded</b>. You can still change it.
        </p>
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
