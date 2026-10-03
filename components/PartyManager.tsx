"use client";

import { useActionState, useState, useTransition } from "react";
import { deleteParty, saveParty, type SettingsState } from "@/lib/actions";
import type { Party } from "@/lib/db";

const label = "mb-1 block text-sm font-semibold text-slate-700";
const input =
  "w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-base outline-none focus:border-green-600 focus:ring-2 focus:ring-green-100";

const ROLE_LABEL: Record<string, string> = {
  seller: "Seller",
  buyer: "Buyer",
  both: "Seller & Buyer",
};

export default function PartyManager({ parties }: { parties: Party[] }) {
  // "new" = the add form at the top; a number = that contact's row is being edited
  const [editing, setEditing] = useState<number | "new" | null>(null);
  const [query, setQuery] = useState("");
  // hides the previous save's message once another form is opened
  const [stale, setStale] = useState(false);
  const [removing, startRemove] = useTransition();
  const [state, formAction, pending] = useActionState(
    async (prev: SettingsState, formData: FormData) => {
      const result = await saveParty(prev, formData);
      setStale(false);
      if (result?.success) setEditing(null);
      return result;
    },
    undefined
  );

  const q = query.trim().toLowerCase();
  const digits = q.replace(/\D/g, "");
  const shown = q
    ? parties.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          (digits !== "" && (p.phone ?? "").replace(/\D/g, "").includes(digits))
      )
    : parties;

  function show(target: number | "new" | null) {
    setStale(true);
    setEditing(target);
  }

  const message = !stale && (state?.error || state?.success) && (
    <p
      className={`rounded-lg px-3 py-2 text-sm font-medium ${
        state.error ? "bg-red-50 text-red-700" : "bg-green-50 text-green-700"
      }`}
    >
      {state.error ?? `✓ ${state.success}`}
    </p>
  );

  // The same fields serve the add form and the edit form inside a contact's row
  const form = (p: Party | null) => (
    <form action={formAction} className="space-y-3">
      {p && <input type="hidden" name="id" value={p.id} />}
      <div>
        <label htmlFor="party_name" className={label}>
          Name <span className="text-red-600">*</span>
        </label>
        <input
          id="party_name"
          name="name"
          required
          autoFocus
          defaultValue={p?.name ?? ""}
          placeholder="e.g. Coconut World Exporters"
          className={input}
        />
      </div>
      <div>
        <label htmlFor="party_phone" className={label}>
          Phone Number
        </label>
        <input
          id="party_phone"
          name="phone"
          type="tel"
          inputMode="tel"
          defaultValue={p?.phone ?? ""}
          placeholder="e.g. 9944555679"
          className={input}
        />
      </div>
      <div>
        <label htmlFor="party_role" className={label}>
          Type
        </label>
        <select
          id="party_role"
          name="role"
          defaultValue={p?.role ?? "both"}
          className={input}
        >
          <option value="seller">Seller</option>
          <option value="buyer">Buyer</option>
          <option value="both">Seller &amp; Buyer</option>
        </select>
      </div>
      {message}
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={pending}
          className="w-full rounded-xl bg-green-700 py-3 text-sm font-bold text-white disabled:opacity-60"
        >
          {pending ? "Saving..." : p ? "Update contact" : "Add contact"}
        </button>
        <button
          type="button"
          onClick={() => show(null)}
          className="w-32 rounded-xl border border-slate-300 py-3 text-sm font-semibold text-slate-600"
        >
          Cancel
        </button>
      </div>
    </form>
  );

  return (
    <div>
      <input
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="🔍 Search name or phone..."
        aria-label="Search sellers and buyers"
        className={input}
      />

      {editing === "new" ? (
        <div className="mt-3 rounded-xl border border-green-200 bg-green-50/50 p-3">
          {form(null)}
        </div>
      ) : (
        <button
          type="button"
          onClick={() => show("new")}
          className="mt-3 w-full rounded-xl border border-green-700 py-3 text-sm font-bold text-green-700"
        >
          ➕ Add seller / buyer
        </button>
      )}

      {editing === null && message && <div className="mt-2">{message}</div>}

      <ul className="mt-3 space-y-2">
        {parties.length === 0 && (
          <li className="rounded-xl border border-dashed border-slate-300 p-4 text-center text-sm text-slate-500">
            No contacts yet. Add sellers and buyers here so they appear in the
            order form dropdown.
          </li>
        )}
        {parties.length > 0 && shown.length === 0 && (
          <li className="rounded-xl border border-dashed border-slate-300 p-4 text-center text-sm text-slate-500">
            No contact matches &quot;{query.trim()}&quot;.
          </li>
        )}
        {shown.map((p) =>
          editing === p.id ? (
            <li
              key={p.id}
              className="rounded-xl border border-green-300 bg-green-50/50 p-3"
            >
              {form(p)}
            </li>
          ) : (
            <li
              key={p.id}
              className="flex items-center justify-between gap-2 rounded-xl border border-slate-200 bg-slate-50 p-3"
            >
              <div className="min-w-0">
                <p className="truncate font-semibold text-slate-800">{p.name}</p>
                <p className="text-xs text-slate-500">
                  {ROLE_LABEL[p.role] ?? p.role}
                  {p.phone ? (
                    <>
                      {" · "}
                      <a href={`tel:${p.phone}`} className="text-green-700 underline">
                        📞 {p.phone}
                      </a>
                    </>
                  ) : (
                    " · no phone"
                  )}
                </p>
              </div>
              <div className="flex shrink-0 gap-2">
                <button
                  type="button"
                  onClick={() => show(p.id)}
                  className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-600"
                >
                  Edit
                </button>
                <button
                  type="button"
                  disabled={removing}
                  onClick={() => {
                    if (confirm(`Remove "${p.name}" from contacts?`))
                      startRemove(() => deleteParty(p.id));
                  }}
                  className="rounded-lg border border-red-300 px-3 py-1.5 text-xs font-semibold text-red-600 disabled:opacity-50"
                >
                  Delete
                </button>
              </div>
            </li>
          )
        )}
      </ul>
    </div>
  );
}
