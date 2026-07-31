"use client";

import { useActionState } from "react";
import { sendTestTelegram } from "@/lib/telegram-actions";

export default function TelegramTest() {
  const [state, formAction, pending] = useActionState(sendTestTelegram, undefined);
  return (
    <form action={formAction} className="mt-3">
      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-xl bg-green-700 py-3 text-sm font-semibold text-white disabled:opacity-60"
      >
        {pending ? "Sending..." : "Send test message"}
      </button>
      {state && (
        <p
          className={`mt-2 rounded-lg px-3 py-2 text-sm ${
            state.ok ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"
          }`}
        >
          {state.ok ? "✓ Test message sent! Check your Telegram." : state.error}
        </p>
      )}
    </form>
  );
}
