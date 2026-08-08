import { sql, type Party } from "@/lib/db";

/** Contacts split into the seller list and the buyer list, both alphabetical. */
export async function getPartyLists(): Promise<{
  sellers: Party[];
  buyers: Party[];
  all: Party[];
}> {
  const all = (await sql`
    SELECT id, name, phone, role FROM parties ORDER BY lower(name)`) as Party[];
  return {
    all,
    sellers: all.filter((p) => p.role === "seller" || p.role === "both"),
    buyers: all.filter((p) => p.role === "buyer" || p.role === "both"),
  };
}
