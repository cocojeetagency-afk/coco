import Link from "next/link";
import { sql } from "@/lib/db";
import { createOrder } from "@/lib/actions";
import { monthKeyIST, nowISTForInput } from "@/lib/dates";
import OrderForm from "@/components/OrderForm";
import { getPartyLists } from "@/lib/parties";

export const dynamic = "force-dynamic";

export default async function NewOrderPage() {
  const month = monthKeyIST(new Date());
  const [rows, parties] = await Promise.all([
    sql`SELECT COALESCE(MAX(order_number), 0) + 1 AS next
        FROM orders WHERE month_key = ${month}`,
    getPartyLists(),
  ]);
  const nextNumber = Number(rows[0].next);

  return (
    <>
      <header className="sticky top-0 z-30 bg-green-700 px-4 py-4 text-white shadow-md">
        <div className="mx-auto flex max-w-3xl items-center gap-3">
          <Link href="/" aria-label="Back" className="text-2xl leading-none">
            ←
          </Link>
          <h1 className="text-xl font-bold">Add New Order</h1>
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-3 py-4">
        <h2 className="mb-3 text-base font-bold text-green-800">
          📋 Order Information
        </h2>
        <OrderForm
          action={createOrder}
          initialNumber={nextNumber}
          sellers={parties.sellers}
          buyers={parties.buyers}
          initial={{
            order_date: nowISTForInput(),
            loading_date: "",
            seller: "",
            seller_phone: "",
            buyer: "",
            buyer_phone: "",
            actual_loading_date: "",
            rate: "",
            quantity: "",
            details: "",
            status: "Pending",
            remarks: "",
          }}
        />
      </main>
    </>
  );
}
