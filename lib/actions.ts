"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { sql, STATUSES } from "@/lib/db";
import { createSession, destroySession, validUsers } from "@/lib/auth";
import { istInputToDate, monthKeyIST } from "@/lib/dates";

// ---------- Auth ----------

export async function login(
  _prev: { error?: string } | undefined,
  formData: FormData
) {
  const username = String(formData.get("username") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const match = validUsers().find(
    (u) => u.username === username && u.password === password
  );
  if (!match) return { error: "Invalid username or password" };
  await createSession(username);
  redirect("/");
}

export async function logout() {
  await destroySession();
  redirect("/login");
}

// ---------- Orders ----------

function parseOrderForm(formData: FormData) {
  const orderDateRaw = String(formData.get("order_date") ?? "");
  const seller = String(formData.get("seller") ?? "").trim();
  const buyer = String(formData.get("buyer") ?? "").trim();
  const rate = String(formData.get("rate") ?? "").trim();
  const status = String(formData.get("status") ?? "Pending");
  const quantityRaw = String(formData.get("quantity") ?? "").trim();
  const remarks = String(formData.get("remarks") ?? "").trim();
  const opt = (name: string) => {
    const v = String(formData.get(name) ?? "").trim();
    return v === "" ? null : v;
  };

  if (!orderDateRaw) throw new Error("Order Date is required");
  if (!seller) throw new Error("Seller is required");
  if (!buyer) throw new Error("Buyer is required");
  if (!rate || isNaN(Number(rate)) || Number(rate) <= 0)
    throw new Error("Enter a valid Rate");
  if (quantityRaw && (isNaN(Number(quantityRaw)) || Number(quantityRaw) <= 0))
    throw new Error("Enter a valid Quantity");
  if (!(STATUSES as readonly string[]).includes(status))
    throw new Error("Invalid status");

  const orderDate = istInputToDate(orderDateRaw);
  return {
    orderDate,
    monthKey: monthKeyIST(orderDate),
    loadingDate: opt("loading_date"),
    confirmationDate: opt("confirmation_date"),
    actualLoadingDate: opt("actual_loading_date"),
    seller,
    buyer,
    rate: Number(rate),
    quantity: quantityRaw === "" ? null : Number(quantityRaw),
    status,
    remarks: remarks === "" ? null : remarks,
  };
}

export type OrderFormState = { error?: string } | undefined;

export async function createOrder(
  _prev: OrderFormState,
  formData: FormData
): Promise<OrderFormState> {
  let monthKey = "";
  try {
    const o = parseOrderForm(formData);
    monthKey = o.monthKey;
    // Order number = next in sequence for the order's month (resets monthly).
    // Retry once if two saves race on the same number (UNIQUE constraint).
    for (let attempt = 0; ; attempt++) {
      try {
        await sql`
          INSERT INTO orders
            (order_number, month_key, order_date, loading_date, seller, buyer,
             confirmation_date, actual_loading_date, rate, quantity, status, remarks)
          VALUES (
            (SELECT COALESCE(MAX(order_number), 0) + 1 FROM orders WHERE month_key = ${o.monthKey}),
            ${o.monthKey}, ${o.orderDate.toISOString()}, ${o.loadingDate},
            ${o.seller}, ${o.buyer}, ${o.confirmationDate}, ${o.actualLoadingDate},
            ${o.rate}, ${o.quantity}, ${o.status}, ${o.remarks}
          )`;
        break;
      } catch (e) {
        if (attempt >= 2) throw e;
      }
    }
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Failed to save order" };
  }
  revalidatePath("/");
  redirect(`/?month=${monthKey}&saved=1`);
}

export async function updateOrder(
  id: number,
  _prev: OrderFormState,
  formData: FormData
): Promise<OrderFormState> {
  let monthKey = "";
  try {
    const o = parseOrderForm(formData);
    monthKey = o.monthKey;
    const rows = await sql`SELECT month_key FROM orders WHERE id = ${id}`;
    if (rows.length === 0) throw new Error("Order not found");
    const sameMonth = rows[0].month_key === o.monthKey;

    for (let attempt = 0; ; attempt++) {
      try {
        if (sameMonth) {
          await sql`
            UPDATE orders SET
              order_date = ${o.orderDate.toISOString()}, loading_date = ${o.loadingDate},
              seller = ${o.seller}, buyer = ${o.buyer},
              confirmation_date = ${o.confirmationDate},
              actual_loading_date = ${o.actualLoadingDate},
              rate = ${o.rate}, quantity = ${o.quantity},
              status = ${o.status}, remarks = ${o.remarks}, updated_at = now()
            WHERE id = ${id}`;
        } else {
          // Month changed: assign the next available number in the new month
          await sql`
            UPDATE orders SET
              month_key = ${o.monthKey},
              order_number = (SELECT COALESCE(MAX(order_number), 0) + 1 FROM orders WHERE month_key = ${o.monthKey}),
              order_date = ${o.orderDate.toISOString()}, loading_date = ${o.loadingDate},
              seller = ${o.seller}, buyer = ${o.buyer},
              confirmation_date = ${o.confirmationDate},
              actual_loading_date = ${o.actualLoadingDate},
              rate = ${o.rate}, quantity = ${o.quantity},
              status = ${o.status}, remarks = ${o.remarks}, updated_at = now()
            WHERE id = ${id}`;
        }
        break;
      } catch (e) {
        if (attempt >= 2) throw e;
      }
    }
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Failed to update order" };
  }
  revalidatePath("/");
  redirect(`/?month=${monthKey}&saved=1`);
}

export async function updateStatus(id: number, status: string) {
  if (!(STATUSES as readonly string[]).includes(status)) return;
  await sql`UPDATE orders SET status = ${status}, updated_at = now() WHERE id = ${id}`;
  revalidatePath("/");
}

export async function deleteOrder(id: number) {
  await sql`DELETE FROM orders WHERE id = ${id}`;
  revalidatePath("/");
  redirect("/");
}
