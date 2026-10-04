/** What the shareable order summary image shows (dates already formatted). */
export type ShareOrder = {
  number: number;
  monthKey: string;
  date: string;
  status: string;
  seller: string;
  sellerPhone: string | null;
  buyer: string;
  buyerPhone: string | null;
  rate: string;
  quantity: string | null;
  details: string | null;
  loadingDate: string | null;
  actualLoadingDate: string | null;
  remarks: string | null;
};

const W = 1080;
const M = 40; // page margin around the card
const PAD = 44; // padding inside the card
const HEADER_H = 124;
const GAP = 32;

const FONT =
  'system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';
const font = (size: number, weight = 400) => `${weight} ${size}px ${FONT}`;

const PAGE = "#efe7d3";
const CARD = "#fffdf7";
const BAND = "#f3ead7";
const LINE = "#d9cdb0";
const GREEN = "#15803d";
const INK = "#0f172a";
const MUTED = "#64748b";

const STATUS_COLORS: Record<string, { bg: string; fg: string }> = {
  Pending: { bg: "#ffedd5", fg: "#9a3412" },
  Loaded: { bg: "#dcfce7", fg: "#166534" },
  Cancelled: { bg: "#fee2e2", fg: "#b91c1c" },
};

type Ctx = CanvasRenderingContext2D;

function roundRect(ctx: Ctx, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/** Break text into lines that fit maxW, using the font currently set on ctx. */
function wrap(ctx: Ctx, text: string, maxW: number): string[] {
  const out: string[] = [];
  for (const para of text.split(/\r?\n/)) {
    let line = "";
    for (let word of para.split(/\s+/).filter(Boolean)) {
      const test = line ? `${line} ${word}` : word;
      if (ctx.measureText(test).width <= maxW) {
        line = test;
        continue;
      }
      if (line) out.push(line);
      // a single word wider than the line is cut into pieces
      while (ctx.measureText(word).width > maxW) {
        let i = word.length - 1;
        while (i > 1 && ctx.measureText(word.slice(0, i)).width > maxW) i--;
        out.push(word.slice(0, i));
        word = word.slice(i);
      }
      line = word;
    }
    out.push(line);
  }
  return out;
}

/** Draw wrapped text with its top at y; returns the y just below it. */
function block(
  ctx: Ctx,
  text: string,
  x: number,
  y: number,
  maxW: number,
  size: number,
  weight: number,
  color: string
): number {
  ctx.font = font(size, weight);
  ctx.fillStyle = color;
  ctx.textAlign = "left";
  ctx.textBaseline = "top";
  const lineH = Math.round(size * 1.3);
  for (const line of wrap(ctx, text, maxW)) {
    ctx.fillText(line, x, y);
    y += lineH;
  }
  return y;
}

/** A small grey label with its value underneath; returns the y just below. */
function field(
  ctx: Ctx,
  label: string,
  value: string,
  x: number,
  y: number,
  w: number,
  size = 38,
  weight = 700
): number {
  y = block(ctx, label, x, y, w, 26, 500, MUTED) + 4;
  return block(ctx, value, x, y, w, size, weight, INK);
}

function fieldHeight(ctx: Ctx, value: string, w: number, size = 38, weight = 700) {
  ctx.font = font(size, weight);
  return Math.round(26 * 1.3) + 4 + wrap(ctx, value, w).length * Math.round(size * 1.3);
}

/**
 * Paint the whole image. The card's height depends on how the text wraps, so
 * this runs twice: once to measure (cardH = 0), then for real.
 * Returns the card height.
 */
function paint(ctx: Ctx, o: ShareOrder, cardH: number): number {
  const cardX = M;
  const cardW = W - 2 * M;
  const x = cardX + PAD;
  const innerW = cardW - 2 * PAD;
  const colW = (innerW - GAP) / 2;
  const x2 = x + colW + GAP;

  ctx.fillStyle = PAGE;
  ctx.fillRect(0, 0, W, cardH + 2 * M);

  ctx.save();
  ctx.shadowColor = "rgba(60, 40, 0, 0.18)";
  ctx.shadowBlur = 24;
  ctx.shadowOffsetY = 6;
  roundRect(ctx, cardX, M, cardW, cardH || 1, 28);
  ctx.fillStyle = CARD;
  ctx.fill();
  ctx.restore();

  ctx.save();
  roundRect(ctx, cardX, M, cardW, cardH || 1, 28);
  ctx.clip();

  // Header bar
  ctx.fillStyle = GREEN;
  ctx.fillRect(cardX, M, cardW, HEADER_H);
  ctx.font = font(50, 800);
  ctx.fillStyle = "#ffffff";
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  ctx.fillText(`🥥  ORDER SUMMARY #${o.number}`, x, M + HEADER_H / 2 + 2);

  let y = M + HEADER_H + 36;

  // Order number, date and status
  const status = STATUS_COLORS[o.status] ?? { bg: "#e2e8f0", fg: "#334155" };
  ctx.font = font(32, 700);
  const pillW = ctx.measureText(o.status).width + 48;
  roundRect(ctx, x + innerW - pillW, y + 6, pillW, 60, 16);
  ctx.fillStyle = status.bg;
  ctx.fill();
  ctx.fillStyle = status.fg;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(o.status, x + innerW - pillW / 2, y + 37);

  y = block(ctx, `Order #${o.number}`, x, y, innerW - pillW - GAP, 54, 800, INK);
  y = block(ctx, o.date, x, y + 2, innerW, 30, 400, MUTED) + 30;

  // Seller and buyer, side by side
  const party = (label: string, name: string, phone: string | null, px: number) => {
    let py = field(ctx, label, name, px, y, colW);
    if (phone) py = block(ctx, `📞 ${phone}`, px, py + 4, colW, 30, 600, GREEN);
    return py;
  };
  y = Math.max(
    party("Seller", o.seller, o.sellerPhone, x),
    party("Buyer", o.buyer, o.buyerPhone, x2)
  );
  y += 34;

  // Rate and quantity band
  const rate = /^\d+(\.\d+)?$/.test(o.rate.trim())
    ? `₹${Number(o.rate).toLocaleString("en-IN")}`
    : o.rate;
  const qty = o.quantity || "—";
  const bandH =
    Math.max(fieldHeight(ctx, rate, colW, 42), fieldHeight(ctx, qty, colW, 42)) + 52;
  ctx.fillStyle = BAND;
  ctx.fillRect(cardX, y, cardW, bandH);
  ctx.fillStyle = LINE;
  ctx.fillRect(cardX, y, cardW, 2);
  ctx.fillRect(cardX, y + bandH - 2, cardW, 2);
  ctx.fillRect(x + colW + GAP / 2 - 1, y, 2, bandH);
  field(ctx, "Rate", rate, x, y + 26, colW, 42);
  field(ctx, "Quantity", qty, x2, y + 26, colW, 42);
  y += bandH + 30;

  if (o.details) y = field(ctx, "Order Details", o.details, x, y, innerW, 36, 600) + 30;

  // Loading dates
  y = Math.max(
    field(ctx, "Loading Date", o.loadingDate || "—", x, y, colW),
    field(ctx, "Actual Loading", o.actualLoadingDate || "—", x2, y, colW)
  );
  y += 34;

  // Remarks box
  if (o.remarks) {
    ctx.font = font(34, 500);
    const lines = wrap(ctx, o.remarks, innerW - 56).length;
    const boxH = 34 + Math.round(26 * 1.3) + 8 + lines * Math.round(34 * 1.3) + 28;
    roundRect(ctx, x, y, innerW, boxH, 18);
    ctx.fillStyle = BAND;
    ctx.fill();
    ctx.strokeStyle = LINE;
    ctx.lineWidth = 2;
    ctx.stroke();
    const ry = block(ctx, "REMARKS", x + 28, y + 26, innerW - 56, 26, 700, "#7c5a1e");
    block(ctx, o.remarks, x + 28, ry + 8, innerW - 56, 34, 500, INK);
    y += boxH + 30;
  }

  // Footer
  ctx.fillStyle = LINE;
  ctx.fillRect(x, y, innerW, 2);
  ctx.font = font(26, 600);
  ctx.fillStyle = MUTED;
  ctx.textAlign = "center";
  ctx.textBaseline = "top";
  ctx.fillText("JEET AGENCY, Salem", cardX + cardW / 2, y + 22);
  y += 22 + 34 + 26;

  ctx.restore();
  return y - M;
}

/** Render the order summary card as a PNG (runs in the browser). */
export function renderOrderImage(o: ShareOrder): Promise<Blob> {
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = 10;
  let ctx = canvas.getContext("2d");
  if (!ctx) return Promise.reject(new Error("Canvas is not available"));

  const cardH = paint(ctx, o, 0);
  canvas.height = cardH + 2 * M; // resizing clears the canvas
  ctx = canvas.getContext("2d")!;
  paint(ctx, o, cardH);

  return new Promise((resolve, reject) =>
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("Could not create image"))),
      "image/png"
    )
  );
}
