import { getSession } from "@/lib/auth";
import { logout } from "@/lib/actions";
import { telegramConfigured } from "@/lib/telegram";
import TelegramTest from "@/components/TelegramTest";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const session = await getSession();
  const tgReady = telegramConfigured();

  return (
    <>
      <header className="sticky top-0 z-30 bg-green-700 px-4 py-4 text-white shadow-md">
        <div className="mx-auto flex max-w-3xl items-center justify-between">
          <h1 className="text-xl font-bold">Settings</h1>
          <span className="text-2xl">⚙️</span>
        </div>
      </header>
      <main className="mx-auto max-w-3xl space-y-4 px-3 py-4">
        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="mb-2 font-bold text-green-800">👤 Account</h2>
          <p className="text-sm text-slate-600">
            Logged in as{" "}
            <span className="font-semibold text-slate-800">
              {session?.username}
            </span>
          </p>
          <form action={logout} className="mt-3">
            <button
              type="submit"
              className="w-full rounded-xl border border-red-300 py-3 text-sm font-semibold text-red-600 active:bg-red-50"
            >
              Log out
            </button>
          </form>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="mb-2 font-bold text-green-800">
            🔔 Telegram Reminders
          </h2>
          <p
            className={`mb-2 inline-block rounded-full px-3 py-1 text-xs font-semibold ${
              tgReady
                ? "bg-green-100 text-green-700"
                : "bg-amber-100 text-amber-700"
            }`}
          >
            {tgReady ? "✓ Configured" : "Not configured yet"}
          </p>
          <p className="text-sm text-slate-600">
            Every day at <b>9:00 AM IST</b>, a Telegram alert is sent for orders
            whose <b>Loading Date is tomorrow</b> (or already passed) while the{" "}
            <b>Actual Loading Date / Confirmation Date</b> is still empty.
          </p>
          {tgReady ? (
            <TelegramTest />
          ) : (
            <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">
              To enable, set <code>TELEGRAM_BOT_TOKEN</code> and{" "}
              <code>TELEGRAM_CHAT_ID</code> in the environment variables (see
              README for step-by-step setup).
            </p>
          )}
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm text-sm text-slate-500">
          <h2 className="mb-1 font-bold text-green-800">ℹ️ About</h2>
          <p>Coconut Export Manager — JEET AGENCY, Salem.</p>
          <p>Order numbers reset to 1 at the start of every month (IST).</p>
        </section>
      </main>
    </>
  );
}
