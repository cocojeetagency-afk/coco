import Link from "next/link";
import { sql, type Order } from "@/lib/db";
import {
  formatDate,
  formatDateTimeIST,
  monthKeyIST,
  monthLabel,
  monthOptions,
} from "@/lib/dates";
import StatusSelect from "@/components/StatusSelect";

export const dynamic = "force-dynamic";

function fmtRate(v: string) {
  return `₹${Number(v).toLocaleString("en-IN", { minimumFractionDigits: 2 })}`;
}
function fmtQty(v: string | null) {
  return v === null ? "—" : `${Number(v).toLocaleString("en-IN")} MT`;
}

export default async function OrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string; q?: string; saved?: string }>;
}) {
  const params = await searchParams;
  const month =
    params.month && /^\d{4}-\d{2}$/.test(params.month)
      ? params.month
      : monthKeyIST(new Date());
  const q = (params.q ?? "").trim();

  const orders = (await (q
    ? sql`SELECT * FROM orders WHERE month_key = ${month}
          AND (seller ILIKE ${"%" + q + "%"} OR buyer ILIKE ${"%" + q + "%"} OR remarks ILIKE ${"%" + q + "%"})
          ORDER BY order_number DESC`
    : sql`SELECT * FROM orders WHERE month_key = ${month} ORDER BY order_number DESC`)) as Order[];

  const counts = { total: orders.length, Pending: 0, Confirmed: 0, done: 0 };
  for (const o of orders) {
    if (o.status === "Pending") counts.Pending++;
    else if (o.status === "Confirmed") counts.Confirmed++;
    else if (o.status === "Loaded" || o.status === "Delivered") counts.done++;
  }

  const months = monthOptions();
  if (!months.includes(month)) months.push(month);

  return (
    <>
      <header className="sticky top-0 z-30 bg-green-700 px-4 py-4 text-white shadow-md">
        <div className="mx-auto flex max-w-3xl items-center justify-between">
          <h1 className="text-xl font-bold">Orders</h1>
          <span className="text-2xl">🥥</span>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-3 py-4">
        {params.saved && (
          <p className="mb-3 rounded-lg bg-green-100 px-3 py-2 text-sm font-medium text-green-800">
            ✓ Order saved successfully
          </p>
        )}

        {/* Month + summary */}
        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <form method="GET" className="flex items-center gap-2">
            <label htmlFor="month" className="text-sm font-medium text-slate-600">
              Month
            </label>
            <select
              id="month"
              name="month"
              defaultValue={month}
              className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-base font-medium text-green-800 outline-none focus:border-green-600"
            >
              {months.map((m) => (
                <option key={m} value={m}>
                  {monthLabel(m)}
                </option>
              ))}
            </select>
            <button
              type="submit"
              className="rounded-lg bg-green-700 px-4 py-2 text-sm font-semibold text-white"
            >
              Go
            </button>
          </form>

          <div className="mt-4 grid grid-cols-4 gap-2 text-center">
            <div className="rounded-xl bg-slate-50 p-2">
              <p className="text-[11px] text-slate-500">Total</p>
              <p className="text-xl font-bold text-slate-800">{counts.total}</p>
            </div>
            <div className="rounded-xl bg-amber-50 p-2">
              <p className="text-[11px] text-amber-700">Pending</p>
              <p className="text-xl font-bold text-amber-600">{counts.Pending}</p>
            </div>
            <div className="rounded-xl bg-blue-50 p-2">
              <p className="text-[11px] text-blue-700">Confirmed</p>
              <p className="text-xl font-bold text-blue-600">{counts.Confirmed}</p>
            </div>
            <div className="rounded-xl bg-green-50 p-2">
              <p className="text-[11px] text-green-700">Completed</p>
              <p className="text-xl font-bold text-green-600">{counts.done}</p>
            </div>
          </div>
        </section>

        {/* Search */}
        <form method="GET" className="mt-3 flex gap-2">
          <input type="hidden" name="month" value={month} />
          <input
            name="q"
            defaultValue={q}
            placeholder="Search seller, buyer or remarks..."
            className="flex-1 rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-base outline-none focus:border-green-600"
          />
          <button
            type="submit"
            className="rounded-lg border border-green-700 px-4 text-sm font-semibold text-green-700"
          >
            Search
          </button>
        </form>

        <h2 className="mt-5 mb-2 flex items-center justify-between text-base font-bold text-slate-800">
          <span>
            Orders — {monthLabel(month)} ({orders.length})
          </span>
        </h2>

        {orders.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center text-slate-500">
            <p className="text-3xl">📦</p>
            <p className="mt-2 font-medium">No orders in {monthLabel(month)}</p>
            <Link
              href="/orders/new"
              className="mt-3 inline-block rounded-lg bg-green-700 px-4 py-2 text-sm font-semibold text-white"
            >
              + Add New Order
            </Link>
          </div>
        ) : (
          <ul className="space-y-3">
            {orders.map((o) => (
              <li
                key={o.id}
                className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-sm text-slate-500">
                      Order{" "}
                      <span className="text-lg font-bold text-green-800">
                        #{o.order_number}
                      </span>
                    </p>
                    <p className="text-xs text-slate-500">
                      {formatDateTimeIST(o.order_date)}
                    </p>
                  </div>
                  <Link
                    href={`/orders/${o.id}/edit`}
                    className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-600 active:bg-slate-100"
                  >
                    ✏️ Edit
                  </Link>
                </div>

                <div className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2 text-sm">
                  <div>
                    <p className="text-[11px] uppercase tracking-wide text-slate-400">
                      Seller
                    </p>
                    <p className="font-medium text-slate-800">{o.seller}</p>
                  </div>
                  <div>
                    <p className="text-[11px] uppercase tracking-wide text-slate-400">
                      Buyer
                    </p>
                    <p className="font-medium text-slate-800">{o.buyer}</p>
                  </div>
                  <div>
                    <p className="text-[11px] uppercase tracking-wide text-slate-400">
                      Rate
                    </p>
                    <p className="font-semibold text-slate-800">
                      {fmtRate(o.rate)}
                    </p>
                  </div>
                  <div>
                    <p className="text-[11px] uppercase tracking-wide text-slate-400">
                      Quantity
                    </p>
                    <p className="font-medium text-slate-800">
                      {fmtQty(o.quantity)}
                    </p>
                  </div>
                  <div>
                    <p className="text-[11px] uppercase tracking-wide text-slate-400">
                      Loading Date
                    </p>
                    <p className="font-medium text-slate-800">
                      {o.loading_date ? formatDate(o.loading_date) : "—"}
                    </p>
                  </div>
                  <div>
                    <p className="text-[11px] uppercase tracking-wide text-slate-400">
                      Actual Loading
                    </p>
                    <p className="font-medium text-slate-800">
                      {o.actual_loading_date
                        ? formatDate(o.actual_loading_date)
                        : "—"}
                    </p>
                  </div>
                </div>

                {o.remarks && (
                  <p className="mt-2 rounded-lg bg-slate-50 px-3 py-1.5 text-sm text-slate-600">
                    💬 {o.remarks}
                  </p>
                )}

                <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-3">
                  <span className="text-xs text-slate-400">Status</span>
                  <StatusSelect id={o.id} status={o.status} />
                </div>
              </li>
            ))}
          </ul>
        )}

        <Link
          href="/orders/new"
          aria-label="Add New Order"
          className="fixed bottom-24 right-4 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-green-700 text-3xl font-light text-white shadow-lg active:scale-95"
        >
          +
        </Link>
      </main>
    </>
  );
}
