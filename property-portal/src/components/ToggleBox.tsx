"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

/** Checkbox that POSTs { ...payload, completed } to an API route on change. */
export default function ToggleBox({
  action,
  checked,
  payload,
  disabled = false,
}: {
  action: string;
  checked: boolean;
  payload: Record<string, string>;
  disabled?: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function onChange(e: React.ChangeEvent<HTMLInputElement>) {
    setBusy(true);
    const body = new FormData();
    for (const [k, v] of Object.entries(payload)) body.set(k, v);
    body.set("completed", e.target.checked ? "1" : "0");
    await fetch(action, { method: "POST", body });
    setBusy(false);
    router.refresh();
  }

  return (
    <input
      type="checkbox"
      className="h-5 w-5 accent-emerald-600"
      defaultChecked={checked}
      disabled={disabled || busy}
      onChange={onChange}
    />
  );
}
