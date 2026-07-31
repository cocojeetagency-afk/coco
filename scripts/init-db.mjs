import { neon } from "@neondatabase/serverless";
import { readFileSync } from "fs";

// Load DATABASE_URL from .env.local when run locally
if (!process.env.DATABASE_URL) {
  try {
    const env = readFileSync(new URL("../.env.local", import.meta.url), "utf8");
    const m = env.match(/^DATABASE_URL=(.+)$/m);
    if (m) process.env.DATABASE_URL = m[1].trim();
  } catch {}
}

const sql = neon(process.env.DATABASE_URL);

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
    rate                NUMERIC(12,2) NOT NULL,
    quantity            NUMERIC(12,3),
    status              TEXT NOT NULL DEFAULT 'Pending',
    remarks             TEXT,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (month_key, order_number)
  )
`;
await sql`CREATE INDEX IF NOT EXISTS idx_orders_month ON orders (month_key)`;
await sql`CREATE INDEX IF NOT EXISTS idx_orders_loading ON orders (loading_date)`;

console.log("orders table ready");
