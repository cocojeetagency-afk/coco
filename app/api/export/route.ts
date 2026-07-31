import { NextRequest, NextResponse } from "next/server";
import { sql, type Order } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { formatDateTimeIST, toYMD } from "@/lib/dates";

export const dynamic = "force-dynamic";

function csvCell(v: string | number | null): string {
  if (v === null || v === undefined) return "";
  const s = String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function fmtDMY(value: string | Date | null): string {
  if (!value) return "";
  const [y, m, d] = toYMD(value).split("-");
  return `${d}-${m}-${y}`;
}

export async function GET(req: NextRequest) {
  if (!(await getSession()))
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const from = req.nextUrl.searchParams.get("from") ?? "";
  const to = req.nextUrl.searchParams.get("to") ?? "";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(from) || !/^\d{4}-\d{2}-\d{2}$/.test(to))
    return NextResponse.json({ error: "Invalid date range" }, { status: 400 });

  // Filter by order date evaluated in IST
  const rows = (await sql`
    SELECT * FROM orders
    WHERE (order_date AT TIME ZONE 'Asia/Kolkata')::date BETWEEN ${from} AND ${to}
    ORDER BY month_key, order_number`) as Order[];

  const header = [
    "Order Number",
    "Month",
    "Order Date (IST)",
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
  const lines = [header.join(",")];
  for (const o of rows) {
    lines.push(
      [
        o.order_number,
        o.month_key,
        formatDateTimeIST(o.order_date),
        fmtDMY(o.loading_date),
        o.seller,
        o.buyer,
        fmtDMY(o.confirmation_date),
        fmtDMY(o.actual_loading_date),
        Number(o.rate).toFixed(2),
        o.quantity === null ? "" : Number(o.quantity),
        o.status,
        o.remarks,
      ]
        .map(csvCell)
        .join(",")
    );
  }

  const fname = `Orders_${fmtDMY(from)}_to_${fmtDMY(to)}.csv`;
  return new NextResponse("\uFEFF" + lines.join("\r\n"), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${fname}"`,
    },
  });
}
