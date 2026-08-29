"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { CREDIT_PACKS, formatMoney, type User, type Wallet } from "@project-ta/shared";
import { apiFetch } from "@/lib/api";

export default function PayClient() {
  const [me, setMe] = useState<{ user: User | null; wallet: Wallet | null } | null>(null);
  const [chosen, setChosen] = useState<string>("five");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  const [cardName, setCardName] = useState("");
  const [cardNumber, setCardNumber] = useState("");
  const [expiry, setExpiry] = useState("");
  const [cvc, setCvc] = useState("");

  const load = () =>
    fetch("/api/me", { cache: "no-store" })
      .then((r) => r.json())
      .then(setMe)
      .catch(() => setMe({ user: null, wallet: null }));

  useEffect(() => { load(); }, []);

  async function pay() {
    setBusy(true);
    setError("");
    try {
      await apiFetch("/api/wallet/topup", {
        method: "POST",
        body: JSON.stringify({ packId: chosen }),
      });
      setDone(true);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Payment failed");
    } finally {
      setBusy(false);
    }
  }

  if (me === null) return <p className="muted pulse">Loading…</p>;

  if (!me.user) {
    return (
      <>
        <h1>Credit &amp; payments</h1>
        <div className="notice notice-brand">
          <Link href="/login">Sign in</Link> to top up credit.
        </div>
      </>
    );
  }

  if (me.user.role === "tutor") {
    return (
      <>
        <h1>Credit &amp; payments</h1>
        <div className="notice notice-brand">
          Tutor accounts get paid out, not topped up.{" "}
          <Link href="/tutor/earnings">See your earnings →</Link>
        </div>
      </>
    );
  }

  const pack = CREDIT_PACKS.find((p) => p.id === chosen);

  return (
    <>
      <h1>Credit &amp; payments</h1>
      <p className="muted">
        Buy credit, spend it whenever you are stuck. No subscription, nothing that
        auto-renews, and credit does not expire.
      </p>

      <div className="notice notice-warn">
        <strong>Prototype — payments are mocked.</strong> The card form below is a
        placeholder. Nothing is sent anywhere, no card is charged, and no card details
        are stored. The live version will use Stripe Checkout, so card data would never
        touch our servers either.
      </div>

      <div className="card card-pad-lg" style={{ marginBottom: 24 }}>
        <div className="row-between">
          <div>
            <p className="label tight">Your balance</p>
            <div className="stat-value" style={{ textAlign: "left" }}>
              {formatMoney(me.wallet?.balancePence ?? 0)}
            </div>
          </div>
          <Link href="/ask" className="btn btn-ghost">Ask a question</Link>
        </div>
      </div>

      {done && (
        <div className="notice notice-brand">
          <strong>Credit added.</strong> No card was charged — this is a prototype.{" "}
          <Link href="/ask">Ask a question →</Link>
        </div>
      )}
      {error && <div className="notice notice-danger">{error}</div>}

      <h2>Choose a pack</h2>
      <div className="grid grid-3">
        {CREDIT_PACKS.map((p) => (
          <button
            key={p.id}
            className={`card card-hover${chosen === p.id ? " card-accent" : ""}`}
            style={{ textAlign: "left", cursor: "pointer", font: "inherit", color: "inherit" }}
            onClick={() => setChosen(p.id)}
            aria-pressed={chosen === p.id}
          >
            <div className="row-between" style={{ marginBottom: 6 }}>
              <strong>{p.name}</strong>
              {p.badge && <span className="badge">{p.badge}</span>}
            </div>
            <div className="stat-value" style={{ textAlign: "left", fontSize: 30 }}>
              {formatMoney(p.pricePence)}
            </div>
            <p className="muted tight" style={{ fontSize: 14 }}>{p.blurb}</p>
            {p.creditPence > p.pricePence && (
              <p className="badge" style={{ marginTop: 10 }}>
                {formatMoney(p.creditPence)} of credit
              </p>
            )}
          </button>
        ))}
      </div>

      <h2 style={{ marginTop: 36 }}>Card details</h2>
      <div className="card card-pad-lg">
        <div className="field">
          <label htmlFor="cn">Name on card</label>
          <input id="cn" type="text" value={cardName} autoComplete="off"
            onChange={(e) => setCardName(e.target.value)} placeholder="A. Parent" />
        </div>
        <div className="field">
          <label htmlFor="num">Card number</label>
          <input id="num" type="text" inputMode="numeric" value={cardNumber} autoComplete="off"
            onChange={(e) => setCardNumber(e.target.value)} placeholder="4242 4242 4242 4242" />
          <p className="hint">Type anything. This field is decorative — it is never read or sent.</p>
        </div>
        <div className="row" style={{ gap: 16 }}>
          <div className="field" style={{ flex: 1, minWidth: 130 }}>
            <label htmlFor="exp">Expiry</label>
            <input id="exp" type="text" value={expiry} autoComplete="off"
              onChange={(e) => setExpiry(e.target.value)} placeholder="MM/YY" />
          </div>
          <div className="field" style={{ flex: 1, minWidth: 110 }}>
            <label htmlFor="cvc">CVC</label>
            <input id="cvc" type="text" value={cvc} autoComplete="off"
              onChange={(e) => setCvc(e.target.value)} placeholder="123" />
          </div>
        </div>

        <hr />
        <div className="row-between">
          <div>
            <strong>{pack?.name}</strong>
            <div className="muted" style={{ fontSize: 14 }}>
              {pack && formatMoney(pack.creditPence)} of credit
            </div>
          </div>
          <button className="btn btn-lg" onClick={pay} disabled={busy}>
            {busy ? "Processing…" : `Pay ${pack ? formatMoney(pack.pricePence) : ""}`}
          </button>
        </div>
      </div>

      {me.wallet && me.wallet.transactions.length > 0 && (
        <>
          <h2 style={{ marginTop: 36 }}>Recent activity</h2>
          <div className="card card-flat" style={{ padding: 0, overflow: "hidden" }}>
            <div className="table-scroll" style={{ margin: 0 }}>
              <table>
                <tbody>
                  {me.wallet.transactions.slice(0, 12).map((t) => (
                    <tr key={t.id}>
                      <td>
                        {t.note}
                        <div className="faint" style={{ fontSize: 13 }}>
                          {new Date(t.createdAt).toLocaleString("en-GB", {
                            day: "numeric", month: "short", hour: "2-digit", minute: "2-digit",
                          })}
                        </div>
                      </td>
                      <td style={{
                        textAlign: "right",
                        color: t.amountPence < 0 ? "var(--ink-soft)" : "var(--brand)",
                        fontWeight: 600,
                        whiteSpace: "nowrap",
                      }}>
                        {t.amountPence < 0 ? "−" : "+"}{formatMoney(Math.abs(t.amountPence))}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      <div className="card" style={{ marginTop: 28 }}>
        <h3>Refunds</h3>
        <p className="muted tight">
          If no tutor accepts your question, your credit is returned automatically — you
          do not have to ask. If a session goes wrong, tell us within 7 days on the{" "}
          <Link href="/complaints">complaints page</Link> and we will refund the credit
          while we look into it.
        </p>
      </div>
    </>
  );
}
