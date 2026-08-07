"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

/** Select that POSTs { ...payload, [name]: value } to an API route on change. */
export default function InlineSelect({
  action,
  name,
  value,
  options,
  payload = {},
  disabled = false,
}: {
  action: string;
  name: string;
  value: string;
  options: { value: string; label: string }[];
  payload?: Record<string, string>;
  disabled?: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function onChange(e: React.ChangeEvent<HTMLSelectElement>) {
    setBusy(true);
    const body = new FormData();
    for (const [k, v] of Object.entries(payload)) body.set(k, v);
    body.set(name, e.target.value);
    await fetch(action, { method: "POST", body });
    setBusy(false);
    router.refresh();
  }

  return (
    <select
      defaultValue={value}
      onChange={onChange}
      disabled={disabled || busy}
      className="rounded-md border border-slate-300 px-2 py-1 text-sm"
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}
