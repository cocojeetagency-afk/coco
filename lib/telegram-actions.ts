"use server";

import { getSession } from "@/lib/auth";
import { sendTelegram } from "@/lib/telegram";

export async function sendTestTelegram(): Promise<{
  ok: boolean;
  error?: string;
}> {
  const session = await getSession();
  if (!session) return { ok: false, error: "Not logged in" };
  return sendTelegram(
    `🥥 <b>Coconut Export Manager</b>\nTest message — Telegram reminders are working! (sent by ${session.username})`
  );
}
