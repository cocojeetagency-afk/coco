import { sql } from "@/lib/db";
import { monthKeyIST, monthLabel, monthOptions, todayIST } from "@/lib/dates";
import { sumQty } from "@/lib/qty";

export const dynamic = "force-dynamic";

const included = [
  "Order Number",
  "Order Date",
  "Loading Date",
  "Seller",
  "Seller Phone",
  "Buyer",
  "Buyer Phone",
  "Actual Loading Date",
  "Rate",
  "Quantity",
  "Order Details",
  "Status",
  "Remarks",
];

type PartyTotal = { name: string; orders: number; qty: string };

/** Orders and quantity per name, for one side (seller or buyer) of the orders. */
function totalsBy(
  rows: { seller: string; buyer: string; quantity: string | null }[],
  side: "seller" | "buyer",
  search: string
): PartyTotal[] {
  const groups = new Map<string, { name: string; qtys: (string | null)[] }>();
  for (const r of rows) {
    const name = r[side].trim();
    if (search && !name.toLowerCase().includes(search)) continue;
    const g = groups.get(name.toLowerCase());
    if (g) g.qtys.push(r.quantity);
    else groups.set(name.toLowerCase(), { name, qtys: [r.quantity] });
  }
  return [...groups.values()]
    .map((g) => ({ name: g.name, orders: g.qtys.length, qty: sumQty(g.qtys) }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string; party?: string }>;
}) {
  const params = await searchParams;
  const today = todayIST();
  const monthStart = today.slice(0, 8) + "01";

  // Totals are for one month ("2026-10") or one whole year ("2026")
  const period =
    params.period && /^\d{4}(-\d{2})?$/.test(params.period)
      ? params.period
      : monthKeyIST(new Date());
  const yearly = period.length === 4;
  const periodLabel = yearly ? `Year ${period}` : monthLabel(period);
  const party = (params.party ?? "").trim();

  const months = monthOptions();
  if (!yearly && !months.includes(period)) months.push(period);
  const years = [...new Set([...months.map((m) => m.slice(0, 4)), period.slice(0, 4)])]
    .sort()
    .reverse();

  const rows = (await (yearly
    ? sql`SELECT seller, buyer, quantity FROM orders
          WHERE month_key LIKE ${period + "-%"} AND status <> 'Cancelled'`
    : sql`SELECT seller, buyer, quantity FROM orders
          WHERE month_key = ${period} AND status <> 'Cancelled'`)) as {
    seller: string;
    buyer: string;
    quantity: string | null;
  }[];
  const sides = [
    { title: "Sellers", rows: totalsBy(rows, "seller", party.toLowerCase()) },
    { title: "Buyers", rows: totalsBy(rows, "buyer", party.toLowerCase()) },
  ];

  return (
    <>
      <header className="sticky top-0 z-30 bg-green-700 px-4 py-4 text-white shadow-md">
        <div className="mx-auto flex max-w-3xl items-center justify-between">
          <h1 className="text-xl font-bold">Reports</h1>
          <span className="text-2xl">📊</span>
        </div>
      </header>
      <main className="mx-auto max-w-3xl space-y-4 px-3 py-4">
        <section className="flex items-start gap-3 rounded-2xl bg-green-50 p-4">
          <span className="text-3xl">📄</span>
          <div>
            <h2 className="font-bold text-slate-800">Export Orders</h2>
            <p className="text-sm text-slate-600">
              Select a date range to download orders in CSV format.
            </p>
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <h3 className="mb-3 font-bold text-green-800">📅 Select Date Range</h3>
          <form action="/api/export" method="GET" className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label
                  htmlFor="from"
                  className="mb-1 block text-sm font-semibold text-slate-700"
                >
                  From Date
                </label>
                <input
                  id="from"
                  type="date"
                  name="from"
                  required
                  defaultValue={monthStart}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-base outline-none focus:border-green-600"
                />
              </div>
              <div>
                <label
                  htmlFor="to"
                  className="mb-1 block text-sm font-semibold text-slate-700"
                >
                  To Date
                </label>
                <input
                  id="to"
                  type="date"
                  name="to"
                  required
                  defaultValue={today}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-base outline-none focus:border-green-600"
                />
              </div>
            </div>
            <button
              type="submit"
              className="w-full rounded-xl bg-green-700 py-3.5 text-base font-bold text-white shadow-md active:scale-[0.98]"
            >
              ⬇️ DOWNLOAD CSV
            </button>
          </form>
        </section>

        <section
          id="totals"
          className="scroll-mt-20 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
        >
          <h3 className="font-bold text-green-800">
            🧮 Seller &amp; Buyer Totals
          </h3>
          <p className="mb-3 text-sm text-slate-500">
            Orders and total quantity for each seller and buyer, by month or by
            year. Cancelled orders are left out.
          </p>
          <form method="GET" action="/reports#totals" className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label
                  htmlFor="period"
                  className="mb-1 block text-sm font-semibold text-slate-700"
                >
                  Month / Year
                </label>
                <select
                  id="period"
                  name="period"
                  defaultValue={period}
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-base outline-none focus:border-green-600"
                >
                  <optgroup label="Yearly">
                    {years.map((y) => (
                      <option key={y} value={y}>
                        Year {y}
                      </option>
                    ))}
                  </optgroup>
                  <optgroup label="Monthly">
                    {months.map((m) => (
                      <option key={m} value={m}>
                        {monthLabel(m)}
                      </option>
                    ))}
                  </optgroup>
                </select>
              </div>
              <div>
                <label
                  htmlFor="party"
                  className="mb-1 block text-sm font-semibold text-slate-700"
                >
                  Name
                </label>
                <input
                  id="party"
                  name="party"
                  type="search"
                  defaultValue={party}
                  placeholder="All names"
                  className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-base outline-none focus:border-green-600"
                />
              </div>
            </div>
            <button
              type="submit"
              className="w-full rounded-xl border border-green-700 py-3 text-sm font-bold text-green-700 active:bg-green-50"
            >
              Show totals
            </button>
          </form>

          {sides.map((side) => (
            <div key={side.title} className="mt-4">
              <h4 className="mb-1 text-sm font-bold text-slate-800">
                {side.title} — {periodLabel} ({side.rows.length})
              </h4>
              {side.rows.length === 0 ? (
                <p className="rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-500">
                  No orders{party ? ` matching "${party}"` : ""} in {periodLabel}.
                </p>
              ) : (
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 text-[11px] uppercase tracking-wide text-slate-400">
                      <th className="py-1.5 pr-2 font-medium">Name</th>
                      <th className="px-2 py-1.5 text-right font-medium">
                        Orders
                      </th>
                      <th className="py-1.5 pl-2 text-right font-medium">
                        Total Qty
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {side.rows.map((r) => (
                      <tr key={r.name} className="border-b border-slate-100">
                        <td className="py-2 pr-2 font-medium text-slate-800">
                          {r.name}
                        </td>
                        <td className="px-2 py-2 text-right text-slate-700">
                          {r.orders}
                        </td>
                        <td className="py-2 pl-2 text-right font-semibold text-green-800">
                          {r.qty}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          ))}
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <h3 className="mb-3 font-bold text-green-800">✅ Export Includes</h3>
          <ul className="grid grid-cols-2 gap-x-2 gap-y-2 text-sm text-slate-700">
            {included.map((f) => (
              <li key={f} className="flex items-center gap-2">
                <span className="text-green-600">✔</span> {f}
              </li>
            ))}
          </ul>
          <p className="mt-4 rounded-lg bg-green-50 px-3 py-2 text-sm text-slate-600">
            ℹ️ The exported file can be opened in Microsoft Excel or any
            spreadsheet application.
          </p>
        </section>
      </main>
    </>
  );
}
