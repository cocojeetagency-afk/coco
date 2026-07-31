import { neon } from "@neondatabase/serverless";

export const sql = neon(process.env.DATABASE_URL!);

export type Order = {
  id: number;
  order_number: number;
  month_key: string;
  order_date: string | Date;
  loading_date: string | Date | null;
  seller: string;
  buyer: string;
  confirmation_date: string | Date | null;
  actual_loading_date: string | Date | null;
  rate: string;
  quantity: string | null;
  status: string;
  remarks: string | null;
  created_at: string;
  updated_at: string;
};

export { STATUSES } from "@/lib/statuses";
