"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { User } from "@project-ta/shared";
import Avatar from "@/components/Avatar";
import { apiFetch } from "@/lib/api";

export default function LoginClient() {
  const [users, setUsers] = useState<User[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState("");
  const router = useRouter();

  useEffect(() => {
    fetch("/api/demo-users", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : { users: [] }))
      .then((d: { users: User[] }) => setUsers(d.users ?? []))
      .catch(() => setUsers([]));
  }, []);

  async function signIn(userId: string) {
    setBusy(userId);
    setError("");
    try {
      const { user } = await apiFetch<{ user: User }>("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ userId }),
      });
      router.push(user.role === "tutor" ? "/tutor" : "/ask");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not sign in");
      setBusy(null);
    }
  }

  if (!users.length) {
    return <p className="muted pulse" style={{ marginTop: 28 }}>Loading accounts…</p>;
  }

  const group = (title: string, note: string, list: User[]) =>
    list.length > 0 && (
      <div key={title}>
        <h2 style={{ marginTop: 36 }}>{title}</h2>
        <p className="muted" style={{ fontSize: 14.5 }}>{note}</p>
        <div className="grid grid-2">
          {list.map((u) => (
            <button
              key={u.id}
              className="card card-hover"
              style={{ textAlign: "left", cursor: "pointer", font: "inherit", color: "inherit" }}
              onClick={() => signIn(u.id)}
              disabled={busy !== null}
            >
              <div className="row">
                <Avatar name={u.name} color={u.avatarColor} />
                <div>
                  <strong>{u.name}</strong>
                  <div className="muted" style={{ fontSize: 13.5 }}>
                    {u.role === "tutor"
                      ? `${u.degree} · ${u.university}`
                      : u.role === "parent"
                        ? "Parent account"
                        : `${u.yearGroup} · ${u.level} · ${u.examBoards?.join(", ")}`}
                  </div>
                </div>
              </div>
              <p className="muted tight" style={{ fontSize: 13.5, marginTop: 12 }}>
                {busy === u.id ? "Signing in…" : "Sign in as this account"}
              </p>
            </button>
          ))}
        </div>
      </div>
    );

  return (
    <div>
      {error && <div className="notice notice-danger" style={{ marginTop: 20 }}>{error}</div>}
      {group("Students", "Ask questions and spend credit.", users.filter((u) => u.role === "student"))}
      {group("Tutors", "See the live question board and accept work.", users.filter((u) => u.role === "tutor"))}
      {group("Parents", "Top up credit and read session transcripts.", users.filter((u) => u.role === "parent"))}
    </div>
  );
}
