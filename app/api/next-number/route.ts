import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { getSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  if (!(await getSession()))
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const month = req.nextUrl.searchParams.get("month") ?? "";
  if (!/^\d{4}-\d{2}$/.test(month))
    return NextResponse.json({ error: "Invalid month" }, { status: 400 });

  // When editing, the order's own number should not push the preview up
  const excludeId = Number(req.nextUrl.searchParams.get("exclude") ?? 0);
  const rows = await sql`
    SELECT COALESCE(MAX(order_number), 0) + 1 AS next
    FROM orders WHERE month_key = ${month} AND id <> ${excludeId}`;
  return NextResponse.json({ month, next: Number(rows[0].next) });
}
