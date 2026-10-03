/** Rate is free text; plain numbers are shown as rupees, anything else as typed. */
export function fmtRate(v: string): string {
  const s = v.trim();
  return /^\d+(\.\d+)?$/.test(s) ? `₹${Number(s).toLocaleString("en-IN")}` : s;
}

/** Split a typed quantity like "200 bags" into its number and unit. */
export function parseQty(v: string): { n: number; unit: string } | null {
  const m = v.trim().match(/^(\d[\d,]*(?:\.\d+)?|\.\d+)\s*(.*)$/);
  if (!m) return null;
  const n = Number(m[1].replace(/,/g, ""));
  if (isNaN(n)) return null;
  return { n, unit: m[2].trim().replace(/\s+/g, " ") };
}

/**
 * Add up typed quantities, one total per unit: "350 bags + 10 MT".
 * Quantities that don't start with a number can't be added and are counted
 * separately.
 */
export function sumQty(values: (string | null)[]): string {
  const totals = new Map<string, { unit: string; n: number }>();
  let other = 0;
  for (const v of values) {
    if (!v || !v.trim()) continue;
    const q = parseQty(v);
    if (!q) {
      other++;
      continue;
    }
    const key = q.unit.toLowerCase();
    const t = totals.get(key);
    if (t) t.n += q.n;
    else totals.set(key, { unit: q.unit, n: q.n });
  }
  const parts = [...totals.values()].map((t) =>
    `${t.n.toLocaleString("en-IN", { maximumFractionDigits: 3 })} ${t.unit}`.trim()
  );
  if (other > 0) parts.push(`${other} not counted`);
  return parts.length ? parts.join(" + ") : "—";
}
