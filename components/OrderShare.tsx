"use client";

import { useState } from "react";
import {
  orderSummaryText,
  renderOrderImage,
  type ShareOrder,
} from "@/lib/orderImage";

const button =
  "rounded-lg border border-green-700 px-2.5 py-1.5 text-sm font-semibold text-green-700 active:bg-green-50 disabled:opacity-50";

function save(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** Share / Download the order as a summary image (like a payment receipt). */
export default function OrderShare({ order }: { order: ShareOrder }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);
  const filename = `Order-${order.number}-${order.monthKey}.png`;

  async function run(mode: "share" | "download") {
    setBusy(true);
    setError(false);
    try {
      const blob = await renderOrderImage(order);
      const file = new File([blob], filename, { type: "image/png" });
      // The phone's own share sheet (WhatsApp, Telegram, Gmail…). Browsers
      // that can't share files get the image as a download instead.
      if (mode === "share" && navigator.canShare?.({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: `Order #${order.number}`,
          text: orderSummaryText(order),
        });
      } else {
        save(blob, filename);
      }
    } catch (e) {
      // closing the share sheet without choosing an app is not an error
      if (!(e instanceof DOMException && e.name === "AbortError")) setError(true);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        disabled={busy}
        onClick={() => run("share")}
        className={button}
      >
        ↗ Share
      </button>
      <button
        type="button"
        disabled={busy}
        onClick={() => run("download")}
        aria-label={`Download order #${order.number} image`}
        className={button}
      >
        ⬇ Download
      </button>
      {error && <span className="text-xs text-red-600">Failed, try again</span>}
    </div>
  );
}
