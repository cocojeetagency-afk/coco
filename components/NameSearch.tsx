"use client";

import { useRef, useState } from "react";
import { flushSync } from "react-dom";

type Option = { id: number; name: string; phone: string | null };

/**
 * Search box for a GET form that drops down the saved sellers and buyers.
 * Tapping a name fills the box and submits the form; free text still works.
 */
export default function NameSearch({
  name,
  defaultValue,
  options,
  placeholder,
  className = "",
  inputClassName,
  id,
  wide = false,
}: {
  name: string;
  defaultValue: string;
  options: Option[];
  placeholder: string;
  className?: string;
  inputClassName: string;
  id?: string;
  /** let the list grow wider than a narrow input, anchored to its right edge */
  wide?: boolean;
}) {
  const [value, setValue] = useState(defaultValue);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLInputElement>(null);

  const q = value.trim().toLowerCase();
  const digits = q.replace(/\D/g, "");
  // The value the page was loaded with shows the whole list, so another name
  // can be picked without clearing the box first.
  const matches =
    q === "" || value === defaultValue
      ? options
      : options.filter(
          (o) =>
            o.name.toLowerCase().includes(q) ||
            (digits !== "" && (o.phone ?? "").replace(/\D/g, "").includes(digits))
        );

  function pick(o: Option) {
    // the input must hold the picked name before the form is submitted
    flushSync(() => {
      setValue(o.name);
      setOpen(false);
    });
    ref.current?.form?.requestSubmit();
  }

  return (
    <div className={`relative min-w-0 ${className}`}>
      <input
        ref={ref}
        id={id}
        name={name}
        type="search"
        role="combobox"
        aria-expanded={open}
        aria-controls={`${name}-names`}
        aria-autocomplete="list"
        autoComplete="off"
        value={value}
        onChange={(e) => {
          setValue(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onClick={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        placeholder={placeholder}
        className={inputClassName}
      />
      {open && matches.length > 0 && (
        <ul
          id={`${name}-names`}
          role="listbox"
          className={`absolute top-full z-20 mt-1 max-h-60 overflow-y-auto rounded-xl border border-slate-300 bg-white py-1 shadow-lg ${
            wide ? "right-0 w-64 max-w-[80vw]" : "inset-x-0"
          }`}
        >
          {matches.map((o) => (
            <li key={o.id} role="option" aria-selected={o.name === value}>
              <button
                type="button"
                // keep focus in the input so the list doesn't close before the tap lands
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => pick(o)}
                className="block w-full px-3 py-2 text-left active:bg-green-50"
              >
                <span className="block font-medium text-slate-800">{o.name}</span>
                {o.phone && (
                  <span className="block text-xs text-slate-500">📞 {o.phone}</span>
                )}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
