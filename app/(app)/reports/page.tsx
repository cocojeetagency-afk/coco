import { todayIST } from "@/lib/dates";

export const dynamic = "force-dynamic";

const included = [
  "Order Number",
  "Order Date",
  "Loading Date",
  "Seller",
  "Buyer",
  "Confirmation Date",
  "Actual Loading Date",
  "Rate",
  "Quantity",
  "Status",
  "Remarks",
];

export default function ReportsPage() {
  const today = todayIST();
  const monthStart = today.slice(0, 8) + "01";

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
