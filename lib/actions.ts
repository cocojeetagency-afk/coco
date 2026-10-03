"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { sql, STATUSES } from "@/lib/db";
import { createSession, destroySession, getSession } from "@/lib/auth";
import { hashPassword, verifyPassword } from "@/lib/password";
import { istInputToDate, monthKeyIST, todayIST } from "@/lib/dates";

// ---------- Auth ----------

export async function login(
  _prev: { error?: string } | undefined,
  formData: FormData
) {
  const username = String(formData.get("username") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  if (!username || !password) return { error: "Enter username and password" };

  const rows = await sql`
    SELECT username, password_hash FROM users WHERE lower(username) = lower(${username})`;
  if (rows.length === 0 || !(await verifyPassword(password, rows[0].password_hash)))
    return { error: "Invalid username or password" };

  await createSession(rows[0].username);
  redirect("/");
}

export async function logout() {
  await destroySession();
  redirect("/login");
}

// ---------- Users ----------

export type SettingsState = { error?: string; success?: string } | undefined;

export async function addUser(
  _prev: SettingsState,
  formData: FormData
): Promise<SettingsState> {
  if (!(await getSession())) return { error: "Not signed in" };
  const username = String(formData.get("username") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  if (username.length < 3) return { error: "Username must be at least 3 characters" };
  if (password.length < 4) return { error: "Password must be at least 4 characters" };

  const existing = await sql`SELECT 1 FROM users WHERE lower(username) = lower(${username})`;
  if (existing.length > 0) return { error: `User "${username}" already exists` };

  await sql`INSERT INTO users (username, password_hash)
            VALUES (${username}, ${await hashPassword(password)})`;
  revalidatePath("/settings");
  return { success: `User "${username}" added` };
}

export async function changePassword(
  _prev: SettingsState,
  formData: FormData
): Promise<SettingsState> {
  const session = await getSession();
  if (!session) return { error: "Not signed in" };

  const current = String(formData.get("current_password") ?? "");
  const next = String(formData.get("new_password") ?? "");
  const confirm = String(formData.get("confirm_password") ?? "");
  if (next.length < 4) return { error: "New password must be at least 4 characters" };
  if (next !== confirm) return { error: "New passwords do not match" };

  const rows = await sql`
    SELECT password_hash FROM users WHERE lower(username) = lower(${session.username})`;
  if (rows.length === 0) return { error: "User not found" };
  if (!(await verifyPassword(current, rows[0].password_hash)))
    return { error: "Current password is incorrect" };

  await sql`UPDATE users SET password_hash = ${await hashPassword(next)}
            WHERE lower(username) = lower(${session.username})`;
  return { success: "Password changed successfully" };
}

export async function resetUserPassword(
  _prev: SettingsState,
  formData: FormData
): Promise<SettingsState> {
  if (!(await getSession())) return { error: "Not signed in" };
  const username = String(formData.get("username") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  if (password.length < 4) return { error: "Password must be at least 4 characters" };

  const rows = await sql`UPDATE users SET password_hash = ${await hashPassword(password)}
    WHERE lower(username) = lower(${username}) RETURNING username`;
  if (rows.length === 0) return { error: "User not found" };
  revalidatePath("/settings");
  return { success: `Password updated for "${rows[0].username}"` };
}

export async function deleteUser(username: string) {
  const session = await getSession();
  if (!session) return;
  if (session.username.toLowerCase() === username.toLowerCase()) return; // can't delete yourself
  const [{ count }] = await sql`SELECT count(*)::int AS count FROM users`;
  if (count <= 1) return; // never remove the last login
  await sql`DELETE FROM users WHERE lower(username) = lower(${username})`;
  revalidatePath("/settings");
}

// ---------- Contacts (sellers / buyers) ----------

export async function saveParty(
  _prev: SettingsState,
  formData: FormData
): Promise<SettingsState> {
  if (!(await getSession())) return { error: "Not signed in" };
  const id = String(formData.get("id") ?? "").trim();
  const name = String(formData.get("name") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim() || null;
  const role = String(formData.get("role") ?? "both");
  if (!name) return { error: "Name is required" };
  if (!["seller", "buyer", "both"].includes(role)) return { error: "Invalid type" };

  try {
    if (id) {
      await sql`UPDATE parties SET name = ${name}, phone = ${phone}, role = ${role}
                WHERE id = ${Number(id)}`;
    } else {
      await sql`INSERT INTO parties (name, phone, role) VALUES (${name}, ${phone}, ${role})`;
    }
  } catch {
    return { error: `"${name}" already exists in the contact list` };
  }
  revalidatePath("/settings");
  revalidatePath("/orders/new");
  return { success: `Saved "${name}"` };
}

export async function deleteParty(id: number) {
  if (!(await getSession())) return;
  await sql`DELETE FROM parties WHERE id = ${id}`;
  revalidatePath("/settings");
}

/** Add a contact typed straight into the order form (used by the New/Edit screens). */
async function upsertPartyFromOrder(name: string, phone: string | null, role: string) {
  if (!name) return;
  const rows = await sql`SELECT id, phone FROM parties WHERE lower(name) = lower(${name})`;
  if (rows.length === 0) {
    await sql`INSERT INTO parties (name, phone, role) VALUES (${name}, ${phone}, ${role})
              ON CONFLICT DO NOTHING`;
  } else if (phone && !rows[0].phone) {
    await sql`UPDATE parties SET phone = ${phone} WHERE id = ${rows[0].id}`;
  }
}

// ---------- Orders ----------

function parseOrderForm(formData: FormData) {
  const orderDateRaw = String(formData.get("order_date") ?? "");
  const seller = String(formData.get("seller") ?? "").trim();
  const buyer = String(formData.get("buyer") ?? "").trim();
  const sellerPhone = String(formData.get("seller_phone") ?? "").trim() || null;
  const buyerPhone = String(formData.get("buyer_phone") ?? "").trim() || null;
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
  if (!rate) throw new Error("Rate is required");
  if (!(STATUSES as readonly string[]).includes(status))
    throw new Error("Invalid status");

  // Marking an order Loaded fills the Actual Loading Date automatically.
  let actualLoadingDate = opt("actual_loading_date");
  if (status === "Loaded" && !actualLoadingDate) actualLoadingDate = todayIST();

  const orderDate = istInputToDate(orderDateRaw);
  return {
    orderDate,
    monthKey: monthKeyIST(orderDate),
    loadingDate: opt("loading_date"),
    actualLoadingDate,
    seller,
    sellerPhone,
    buyer,
    buyerPhone,
    rate,
    quantity: quantityRaw === "" ? null : quantityRaw,
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
    // Retry if two saves race for the same number (UNIQUE constraint).
    for (let attempt = 0; ; attempt++) {
      try {
        await sql`
          INSERT INTO orders
            (order_number, month_key, order_date, loading_date, seller, seller_phone,
             buyer, buyer_phone, actual_loading_date, rate, quantity, status, remarks)
          VALUES (
            (SELECT COALESCE(MAX(order_number), 0) + 1 FROM orders WHERE month_key = ${o.monthKey}),
            ${o.monthKey}, ${o.orderDate.toISOString()}, ${o.loadingDate},
            ${o.seller}, ${o.sellerPhone}, ${o.buyer}, ${o.buyerPhone},
            ${o.actualLoadingDate}, ${o.rate}, ${o.quantity}, ${o.status}, ${o.remarks}
          )`;
        break;
      } catch (e) {
        if (attempt >= 2) throw e;
      }
    }
    await upsertPartyFromOrder(o.seller, o.sellerPhone, "seller");
    await upsertPartyFromOrder(o.buyer, o.buyerPhone, "buyer");
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
              seller = ${o.seller}, seller_phone = ${o.sellerPhone},
              buyer = ${o.buyer}, buyer_phone = ${o.buyerPhone},
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
              seller = ${o.seller}, seller_phone = ${o.sellerPhone},
              buyer = ${o.buyer}, buyer_phone = ${o.buyerPhone},
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
    await upsertPartyFromOrder(o.seller, o.sellerPhone, "seller");
    await upsertPartyFromOrder(o.buyer, o.buyerPhone, "buyer");
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Failed to update order" };
  }
  revalidatePath("/");
  redirect(`/?month=${monthKey}&saved=1`);
}

/**
 * Inline status change from the orders list. Switching to Loaded stamps the
 * Actual Loading Date with today (IST) when it is still empty.
 */
export async function updateStatus(id: number, status: string) {
  if (!(STATUSES as readonly string[]).includes(status)) return;
  if (status === "Loaded") {
    await sql`UPDATE orders SET status = ${status},
                actual_loading_date = COALESCE(actual_loading_date, ${todayIST()}::date),
                updated_at = now()
              WHERE id = ${id}`;
  } else {
    await sql`UPDATE orders SET status = ${status}, updated_at = now() WHERE id = ${id}`;
  }
  revalidatePath("/");
}

export async function deleteOrder(id: number) {
  await sql`DELETE FROM orders WHERE id = ${id}`;
  revalidatePath("/");
  redirect("/");
}
