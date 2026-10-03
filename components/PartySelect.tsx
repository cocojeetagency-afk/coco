"use client";

import { useState, useSyncExternalStore } from "react";
import type { Party } from "@/lib/db";

const label = "mb-1 block text-sm font-semibold text-slate-700";
const input =
  "w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-base outline-none focus:border-green-600 focus:ring-2 focus:ring-green-100";

// Contact Picker API — lets the user pick from the phone's own contact book.
// Only some mobile browsers have it (Chrome on Android), so the button is
// hidden everywhere else.
type PickedContact = { name?: string[]; tel?: string[] };
type ContactsManager = {
  select: (
    props: string[],
    opts?: { multiple?: boolean }
  ) => Promise<PickedContact[]>;
};

function phoneContacts(): ContactsManager | null {
  if (typeof navigator === "undefined" || !("contacts" in navigator)) return null;
  const c = (navigator as Navigator & { contacts?: ContactsManager }).contacts;
  return c && typeof c.select === "function" ? c : null;
}

const noopSubscribe = () => () => {};

export default function PartySelect({
  title,
  field,
  options,
  defaultName,
  defaultPhone,
}: {
  title: string;
  field: "seller" | "buyer";
  options: Party[];
  defaultName: string;
  defaultPhone: string;
}) {
  const [name, setName] = useState(defaultName);
  const [phone, setPhone] = useState(defaultPhone);
  const [open, setOpen] = useState(false);
  const canPickFromPhone = useSyncExternalStore(
    noopSubscribe,
    () => phoneContacts() !== null,
    () => false
  );

  const q = name.trim().toLowerCase();
  const saved = options.find((o) => o.name.toLowerCase() === q);
  const digits = q.replace(/\D/g, "");
  // Typing searches the saved list by name or phone number. With a saved name
  // already filled in, show the whole list so another one can be chosen.
  const matches =
    q === "" || saved
      ? options
      : options.filter(
          (o) =>
            o.name.toLowerCase().includes(q) ||
            (digits !== "" && (o.phone ?? "").replace(/\D/g, "").includes(digits))
        );

  function type(value: string) {
    setName(value);
    setOpen(true);
    const match = options.find(
      (o) => o.name.toLowerCase() === value.trim().toLowerCase()
    );
    if (match?.phone) setPhone(match.phone);
  }

  function pick(o: Party) {
    setName(o.name);
    setPhone(o.phone ?? "");
    setOpen(false);
  }

  async function pickFromPhone() {
    try {
      const picked = await phoneContacts()?.select(["name", "tel"], {
        multiple: false,
      });
      const c = picked?.[0];
      if (!c) return;
      const pickedName = c.name?.[0]?.trim() ?? "";
      const pickedPhone = c.tel?.[0]?.replace(/[\s-]/g, "") ?? "";
      if (pickedName) setName(pickedName);
      if (pickedPhone) setPhone(pickedPhone);
      setOpen(false);
    } catch {
      // picker closed or permission denied — leave the fields as they are
    }
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-3">
      <label htmlFor={`${field}-input`} className={label}>
        {title} <span className="text-red-600">*</span>
      </label>

      <div className="relative">
        <input
          id={`${field}-input`}
          name={field}
          type="search"
          role="combobox"
          aria-expanded={open}
          aria-controls={`${field}-list`}
          aria-autocomplete="list"
          value={name}
          onChange={(e) => type(e.target.value)}
          onFocus={() => setOpen(true)}
          onBlur={() => setOpen(false)}
          placeholder={`🔍 Search or type ${field} name`}
          required
          autoComplete="off"
          className={input}
        />
        {open && matches.length > 0 && (
          <ul
            id={`${field}-list`}
            role="listbox"
            className="absolute inset-x-0 top-full z-20 mt-1 max-h-60 overflow-y-auto rounded-xl border border-slate-300 bg-white py-1 shadow-lg"
          >
            {matches.map((o) => (
              <li key={o.id} role="option" aria-selected={o.id === saved?.id}>
                <button
                  type="button"
                  // keep focus in the input so the list doesn't close before the tap lands
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => pick(o)}
                  className={`block w-full px-3 py-2 text-left active:bg-green-50 ${
                    o.id === saved?.id ? "bg-green-50" : ""
                  }`}
                >
                  <span className="block font-medium text-slate-800">
                    {o.name}
                  </span>
                  {o.phone && (
                    <span className="block text-xs text-slate-500">
                      📞 {o.phone}
                    </span>
                  )}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
      {q !== "" && !saved && (
        <p className="mt-1 text-[11px] font-medium text-green-700">
          New {field} — will be added to your contact list when you save.
        </p>
      )}
      {canPickFromPhone && (
        <button
          type="button"
          onClick={pickFromPhone}
          className="mt-2 w-full rounded-lg border border-green-700 py-2 text-sm font-semibold text-green-700 active:bg-green-50"
        >
          📱 Pick from phone contacts
        </button>
      )}

      <label htmlFor={`${field}-phone`} className={`${label} mt-2`}>
        Phone Number
      </label>
      <div className="flex gap-2">
        <input
          id={`${field}-phone`}
          name={`${field}_phone`}
          type="tel"
          inputMode="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="e.g. 9944555679"
          className={input}
        />
        {phone.trim() && (
          <a
            href={`tel:${phone.trim()}`}
            aria-label={`Call ${name || field}`}
            className="flex shrink-0 items-center rounded-xl border border-green-700 px-3 text-sm font-semibold text-green-700 active:bg-green-50"
          >
            📞 Call
          </a>
        )}
      </div>
      <p className="mt-1 text-[11px] text-slate-400">
        New names and phone numbers are saved to your contact list automatically.
      </p>
    </div>
  );
}
