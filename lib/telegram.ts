// Env values pasted into a dashboard often pick up stray spaces or newlines,
// which Telegram rejects with a confusing "chat not found".
const env = (name: string) => process.env[name]?.trim() || "";

export function telegramConfigured(): boolean {
  return Boolean(env("TELEGRAM_BOT_TOKEN") && env("TELEGRAM_CHAT_ID"));
}

async function post(token: string, chatId: string, text: string) {
  const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text, parse_mode: "HTML" }),
  });
  return (await res.json()) as { ok: boolean; description?: string };
}

export async function sendTelegram(
  text: string
): Promise<{ ok: boolean; error?: string }> {
  const token = env("TELEGRAM_BOT_TOKEN");
  const chatId = env("TELEGRAM_CHAT_ID");
  if (!token || !chatId)
    return {
      ok: false,
      error:
        "Telegram is not configured. Set TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID.",
    };

  try {
    let data = await post(token, chatId, text);

    // Group chat IDs are negative, and some dashboards drop the leading minus
    // when the value is saved. If a plain number is not found, try it negated.
    if (
      !data.ok &&
      data.description === "Bad Request: chat not found" &&
      /^\d+$/.test(chatId)
    ) {
      data = await post(token, `-${chatId}`, text);
    }

    if (!data.ok) {
      const hint =
        data.description === "Bad Request: chat not found"
          ? ` — check TELEGRAM_CHAT_ID (currently "${chatId}"); group IDs start with a minus sign`
          : "";
      return { ok: false, error: `${data.description ?? "Telegram error"}${hint}` };
    }
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Network error" };
  }
}
