import { neon } from "@neondatabase/serverless";

export const sql = neon(process.env.DATABASE_URL!);

export type Order = {
  id: number;
  order_number: number;
  month_key: string;
  order_date: string | Date;
  loading_date: string | Date | null;
  seller: string;
  seller_phone: string | null;
  buyer: string;
  buyer_phone: string | null;
  actual_loading_date: string | Date | null;
  rate: string;
  quantity: string | null;
  details: string | null;
  status: string;
  remarks: string | null;
  created_at: string;
  updated_at: string;
};

export type Party = {
  id: number;
  name: string;
  phone: string | null;
  role: string; // 'seller' | 'buyer' | 'both'
};

export type User = {
  id: number;
  username: string;
  created_at: string;
};

export { STATUSES } from "@/lib/statuses";
