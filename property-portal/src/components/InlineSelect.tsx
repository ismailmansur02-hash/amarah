"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

/**
 * Select that saves on change.
 *
 * The new value shows straight away rather than waiting for the server. The
 * request goes out in the background; if it fails the old value comes back
 * with an explanation, so nothing is silently lost.
 */
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
  const [current, setCurrent] = useState(value);
  const [failed, setFailed] = useState(false);

  async function onChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const next = e.target.value;
    const previous = current;
    setCurrent(next);
    setFailed(false);

    const body = new FormData();
    for (const [k, v] of Object.entries(payload)) body.set(k, v);
    body.set(name, next);

    try {
      const res = await fetch(action, { method: "POST", body });
      if (!res.ok) throw new Error("save failed");
      router.refresh();
    } catch {
      setCurrent(previous);
      setFailed(true);
    }
  }

  return (
    <span className="inline-flex flex-col gap-1">
      <select
        value={current}
        onChange={onChange}
        disabled={disabled}
        className="rounded-md border border-slate-300 px-2 py-1 text-sm"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      {failed && <span className="text-xs text-red-600">Not saved — try again</span>}
    </span>
  );
}
