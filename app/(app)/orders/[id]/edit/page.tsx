import Link from "next/link";
import { notFound } from "next/navigation";
import { sql, type Order } from "@/lib/db";
import { updateOrder } from "@/lib/actions";
import { dateToISTInput, toYMD } from "@/lib/dates";
import OrderForm from "@/components/OrderForm";

export const dynamic = "force-dynamic";

export default async function EditOrderPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const orderId = Number(id);
  if (!Number.isInteger(orderId)) notFound();

  const rows = (await sql`SELECT * FROM orders WHERE id = ${orderId}`) as Order[];
  if (rows.length === 0) notFound();
  const o = rows[0];

  const boundUpdate = updateOrder.bind(null, o.id);
  const d = (v: string | Date | null) => (v ? toYMD(v) : "");

  return (
    <>
      <header className="sticky top-0 z-30 bg-green-700 px-4 py-4 text-white shadow-md">
        <div className="mx-auto flex max-w-3xl items-center gap-3">
          <Link href="/" aria-label="Back" className="text-2xl leading-none">
            ←
          </Link>
          <h1 className="text-xl font-bold">
            Edit Order #{o.order_number}{" "}
            <span className="text-sm font-normal opacity-80">
              ({o.month_key})
            </span>
          </h1>
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-3 py-4">
        <h2 className="mb-3 text-base font-bold text-green-800">
          📋 Order Information
        </h2>
        <OrderForm
          action={boundUpdate}
          initialNumber={o.order_number}
          initial={{
            id: o.id,
            order_number: o.order_number,
            order_date: dateToISTInput(o.order_date),
            loading_date: d(o.loading_date),
            seller: o.seller,
            buyer: o.buyer,
            confirmation_date: d(o.confirmation_date),
            actual_loading_date: d(o.actual_loading_date),
            rate: String(Number(o.rate)),
            quantity: o.quantity === null ? "" : String(Number(o.quantity)),
            status: o.status,
            remarks: o.remarks ?? "",
          }}
        />
      </main>
    </>
  );
}
