import { neon } from "@neondatabase/serverless";
import { readFileSync } from "fs";
import { scryptSync, randomBytes } from "crypto";

// Load env from .env.local when run locally
if (!process.env.DATABASE_URL) {
  try {
    const env = readFileSync(new URL("../.env.local", import.meta.url), "utf8");
    for (const line of env.split("\n")) {
      const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
      if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim();
    }
  } catch {}
}

const sql = neon(process.env.DATABASE_URL);

function hashPassword(password) {
  const salt = randomBytes(16).toString("hex");
  return `${salt}:${scryptSync(password, salt, 64).toString("hex")}`;
}

// ---------- orders ----------
await sql`
  CREATE TABLE IF NOT EXISTS orders (
    id                  SERIAL PRIMARY KEY,
    order_number        INTEGER NOT NULL,
    month_key           TEXT NOT NULL,
    order_date          TIMESTAMPTZ NOT NULL,
    loading_date        DATE,
    seller              TEXT NOT NULL,
    buyer               TEXT NOT NULL,
    confirmation_date   DATE,
    actual_loading_date DATE,
    rate                TEXT NOT NULL,
    quantity            TEXT,
    status              TEXT NOT NULL DEFAULT 'Pending',
    remarks             TEXT,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (month_key, order_number)
  )`;
await sql`CREATE INDEX IF NOT EXISTS idx_orders_month ON orders (month_key)`;
await sql`CREATE INDEX IF NOT EXISTS idx_orders_loading ON orders (loading_date)`;

// Phone numbers captured with the order (snapshot of the contact at save time)
await sql`ALTER TABLE orders ADD COLUMN IF NOT EXISTS seller_phone TEXT`;
await sql`ALTER TABLE orders ADD COLUMN IF NOT EXISTS buyer_phone TEXT`;

// Free-text order details (what was ordered), shown below Rate / Quantity
await sql`ALTER TABLE orders ADD COLUMN IF NOT EXISTS details TEXT`;

// Confirmation Date was dropped from the app
await sql`ALTER TABLE orders DROP COLUMN IF EXISTS confirmation_date`;

// Statuses reduced to Pending / Loaded / Cancelled
await sql`UPDATE orders SET status = 'Pending'   WHERE status IN ('Confirmed')`;
await sql`UPDATE orders SET status = 'Loaded'    WHERE status IN ('Delivered', 'Completed')`;

// Rate and Quantity are free text ("200 bags", "25000 per ton"). Older numeric
// quantities were entered in MT, so keep that unit when converting.
const numericCols = (
  await sql`SELECT column_name FROM information_schema.columns
            WHERE table_schema = current_schema() AND table_name = 'orders'
              AND column_name IN ('rate', 'quantity') AND data_type = 'numeric'`
).map((r) => r.column_name);
if (numericCols.includes("rate"))
  await sql`ALTER TABLE orders ALTER COLUMN rate TYPE TEXT USING trim_scale(rate)::text`;
if (numericCols.includes("quantity"))
  await sql`ALTER TABLE orders ALTER COLUMN quantity TYPE TEXT
            USING trim_scale(quantity)::text || ' MT'`;

// ---------- contacts (sellers & buyers) ----------
await sql`
  CREATE TABLE IF NOT EXISTS parties (
    id         SERIAL PRIMARY KEY,
    name       TEXT NOT NULL,
    phone      TEXT,
    role       TEXT NOT NULL DEFAULT 'both',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
  )`;
await sql`CREATE UNIQUE INDEX IF NOT EXISTS idx_parties_name ON parties (lower(name))`;

// Seed contacts from names already used in orders — first run only, so a
// re-run never brings back contacts that were removed or renamed in Settings
const [{ count: partyCount }] = await sql`SELECT count(*)::int AS count FROM parties`;
if (partyCount === 0) {
  await sql`
    INSERT INTO parties (name, role)
    SELECT DISTINCT seller, 'seller' FROM orders WHERE seller <> ''
    ON CONFLICT DO NOTHING`;
  await sql`
    INSERT INTO parties (name, role)
    SELECT DISTINCT buyer, 'buyer' FROM orders
    WHERE buyer <> '' AND lower(buyer) NOT IN (SELECT lower(name) FROM parties)
    ON CONFLICT DO NOTHING`;
}

// ---------- users ----------
await sql`
  CREATE TABLE IF NOT EXISTS users (
    id            SERIAL PRIMARY KEY,
    username      TEXT NOT NULL,
    password_hash TEXT NOT NULL,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
  )`;
await sql`CREATE UNIQUE INDEX IF NOT EXISTS idx_users_username ON users (lower(username))`;

// Seed the first logins from env vars (only when the table is empty)
const [{ count }] = await sql`SELECT count(*)::int AS count FROM users`;
if (count === 0) {
  const seeds = [
    [process.env.APP_USER_1, process.env.APP_PASS_1],
    [process.env.APP_USER_2, process.env.APP_PASS_2],
  ].filter(([u, p]) => u && p);
  if (seeds.length === 0) seeds.push(["admin", "coco@2026"]);
  for (const [username, password] of seeds) {
    await sql`INSERT INTO users (username, password_hash)
              VALUES (${username}, ${hashPassword(password)})
              ON CONFLICT DO NOTHING`;
  }
  console.log(`seeded users: ${seeds.map((s) => s[0]).join(", ")}`);
}

console.log("database ready (orders, parties, users)");
