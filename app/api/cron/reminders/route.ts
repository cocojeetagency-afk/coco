import { NextRequest, NextResponse } from "next/server";
import { sql, type Order } from "@/lib/db";
import { sendTelegram, telegramConfigured } from "@/lib/telegram";
import { formatDate, todayIST, toYMD } from "@/lib/dates";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

function addDays(ymd: string, days: number): string {
  const [y, m, d] = ymd.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + days));
  return dt.toISOString().slice(0, 10);
}

/**
 * Daily reminder job (triggered by Vercel Cron).
 * Sends a Telegram alert for orders whose Loading Date is TOMORROW (or today /
 * overdue) while Actual Loading Date or Confirmation Date is still empty.
 */
export async function GET(req: NextRequest) {
  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (!telegramConfigured())
    return NextResponse.json({ ok: false, error: "Telegram not configured" });

  const today = todayIST();
  const tomorrow = addDays(today, 1);

  const pending = (await sql`
    SELECT * FROM orders
    WHERE loading_date IS NOT NULL
      AND loading_date <= ${tomorrow}
      AND status NOT IN ('Cancelled', 'Delivered')
      AND (actual_loading_date IS NULL OR confirmation_date IS NULL)
    ORDER BY loading_date, month_key, order_number`) as Order[];

  if (pending.length === 0)
    return NextResponse.json({ ok: true, sent: 0, message: "Nothing pending" });

  const lines: string[] = ["🥥 <b>Coconut Export Manager — Reminders</b>", ""];
  for (const o of pending) {
    const missing = [
      o.actual_loading_date ? null : "Actual Loading Date",
      o.confirmation_date ? null : "Confirmation Date",
    ]
      .filter(Boolean)
      .join(" & ");
    const loadingYMD = toYMD(o.loading_date!);
    const when =
      loadingYMD === tomorrow
        ? "⏰ Loading TOMORROW"
        : loadingYMD === today
          ? "🚛 Loading TODAY"
          : `⚠️ Loading date passed (${formatDate(o.loading_date!)})`;
    lines.push(
      `${when} — Order <b>#${o.order_number}</b> (${o.month_key})`,
      `Seller: ${o.seller} → Buyer: ${o.buyer}`,
      `Status: ${o.status} | Missing: <b>${missing}</b>`,
      ""
    );
  }
  lines.push("Please update the orders in the dashboard.");

  const result = await sendTelegram(lines.join("\n"));
  return NextResponse.json({ ok: result.ok, sent: pending.length, error: result.error });
}
