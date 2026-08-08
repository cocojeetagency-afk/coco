"use client";

import { useState } from "react";
import type { Party } from "@/lib/db";

const label = "mb-1 block text-sm font-semibold text-slate-700";
const input =
  "w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-base outline-none focus:border-green-600 focus:ring-2 focus:ring-green-100";

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
  const known = options.some(
    (o) => o.name.toLowerCase() === defaultName.toLowerCase()
  );
  const [name, setName] = useState(defaultName);
  const [phone, setPhone] = useState(defaultPhone);
  const [typing, setTyping] = useState(defaultName !== "" && !known);

  function pick(value: string) {
    if (value === "__new__") {
      setTyping(true);
      setName("");
      setPhone("");
      return;
    }
    setName(value);
    const match = options.find((o) => o.name === value);
    setPhone(match?.phone ?? "");
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-3">
      <label htmlFor={`${field}-input`} className={label}>
        {title} <span className="text-red-600">*</span>
      </label>

      <input type="hidden" name={field} value={name} />

      {typing ? (
        <>
          <input
            id={`${field}-input`}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={`Enter new ${field} name`}
            required
            autoComplete="off"
            className={input}
          />
          {options.length > 0 && (
            <button
              type="button"
              onClick={() => {
                setTyping(false);
                setName("");
                setPhone("");
              }}
              className="mt-1.5 text-xs font-semibold text-green-700 underline"
            >
              ← Choose from saved list instead
            </button>
          )}
        </>
      ) : (
        <select
          id={`${field}-input`}
          value={name}
          onChange={(e) => pick(e.target.value)}
          required
          className={input}
        >
          <option value="">Select {field}…</option>
          {options.map((o) => (
            <option key={o.id} value={o.name}>
              {o.name}
              {o.phone ? ` — ${o.phone}` : ""}
            </option>
          ))}
          <option value="__new__">➕ Add new {field}…</option>
        </select>
      )}

      <label htmlFor={`${field}-phone`} className={`${label} mt-2`}>
        Phone Number
      </label>
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
      <p className="mt-1 text-[11px] text-slate-400">
        New names and phone numbers are saved to your contact list automatically.
      </p>
    </div>
  );
}
