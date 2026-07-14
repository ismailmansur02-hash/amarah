"""Search for a ROBUST profitable variant, judged out-of-sample.

Discipline: parameters are chosen on the in-sample split (2023-2024) and then
scored on the out-of-sample split (2025 - Jul 2026) that they never saw. A
variant is only interesting if it is positive on BOTH. Anything that is good
in-sample and bad out-of-sample is overfit and rejected.

Run: python3 backtest/research.py
"""
import os
import sys

import numpy as np
import pandas as pd

sys.path.insert(0, os.path.dirname(__file__))
import engine  # noqa: E402

m5, m15 = engine.load_bars(os.path.join(os.path.dirname(__file__), "data/eurusd_m5.parquet"))

IN = (pd.Timestamp("2023-01-01"), pd.Timestamp("2025-01-01"))
OUT = (pd.Timestamp("2025-01-01"), pd.Timestamp("2026-07-12"))
FULL = (pd.Timestamp("2023-01-01"), pd.Timestamp("2026-07-12"))


def evaluate(cfg, span):
    bt = engine.Backtest(m5, m15, costs=cfg.get("costs") or engine.Costs(),
                         ambiguity="worst",
                         mode=cfg.get("mode", "inverted"),
                         flatten_mode=cfg.get("flatten_mode", "session"),
                         pending_cancel=cfg.get("pending_cancel", "cutoff"),
                         session_hours=cfg.get("session_hours"))
    tr, _, bal = bt.run(start=span[0], end=span[1])
    f = [t for t in tr if t.status == "filled"]
    if not f:
        return dict(n=0, ret=0.0, win=0.0, mpos=0, mtar=0, nmo=0, avgm=0.0, dd=0.0)
    d = pd.DataFrame([{"pnl": t.pnl, "t_exit": t.t_exit, "bal": t.balance_after} for t in f])
    ret = (bal / bt.balance0 - 1) * 100
    eq = pd.concat([pd.Series([bt.balance0]), d["bal"]], ignore_index=True)
    dd = (eq / eq.cummax() - 1).min() * 100
    m = d.set_index("t_exit").sort_index()["bal"]
    me = m.resample("ME").last().ffill()
    ms = me.shift(1).fillna(bt.balance0)
    mo = (me / ms - 1) * 100
    return dict(n=len(f), ret=ret, win=(d.pnl > 0).mean() * 100,
                mpos=int((mo > 0).sum()), mtar=int((mo >= 0.5).sum()),
                nmo=len(mo), avgm=mo.mean(), dd=dd)


def row(label, cfg):
    i, o, fu = evaluate(cfg, IN), evaluate(cfg, OUT), evaluate(cfg, FULL)
    print(f"{label:<34} "
          f"| IN {i['ret']:+7.1f}% win{i['win']:4.0f}% tgt{i['mtar']:>2}/{i['nmo']:<2} "
          f"| OUT {o['ret']:+7.1f}% win{o['win']:4.0f}% tgt{o['mtar']:>2}/{o['nmo']:<2} "
          f"| FULL {fu['ret']:+7.1f}% avg{fu['avgm']:+.2f}% dd{fu['dd']:5.0f}% n{fu['n']}")
    return i, o, fu


print("EURUSD ALGAY variants - realistic costs (0.2p spread + $6/lot + 0.1p slip)\n")
print("legend: IN = 2023-2024 (in-sample) | OUT = 2025-Jul2026 (out-of-sample)")
print("        tgt = months hitting +0.5% / total months | win = win rate\n")

print("--- core 2x2: direction x session-flatten ---")
row("inverted + flatten (bot as coded)", dict(mode="inverted", flatten_mode="session"))
row("inverted + run-to-TP/SL",           dict(mode="inverted", flatten_mode="none", pending_cancel="end"))
row("original + flatten",                dict(mode="original", flatten_mode="session"))
row("original + run-to-TP/SL",           dict(mode="original", flatten_mode="none", pending_cancel="end"))

print("\n--- best direction found + per-session-hour breakdown (chosen on IN) ---")
# score each single UK session-hour on the in-sample split, for the better mode
best_mode = "original"
hour_scores = {}
for h in (22, 2, 6, 10, 14, 18):
    i = evaluate(dict(mode=best_mode, flatten_mode="none", pending_cancel="end",
                      session_hours={h}), IN)
    hour_scores[h] = i
    print(f"  {best_mode} run-to-TP/SL, only {h:02d}:00 UK  "
          f"| IN {i['ret']:+7.1f}% win{i['win']:4.0f}% n{i['n']:>3} tgt{i['mtar']}/{i['nmo']}")

# pick hours that were positive IN-sample, then test that set OUT-of-sample
good_hours = {h for h, s in hour_scores.items() if s["ret"] > 0 and s["n"] >= 20}
print(f"\n  hours positive in-sample (n>=20): {sorted(good_hours) or 'none'}")
if good_hours:
    print("  -> apply that fixed hour-set to the UNSEEN out-of-sample period:")
    row(f"original run-to-TP/SL, hours {sorted(good_hours)}",
        dict(mode="original", flatten_mode="none", pending_cancel="end",
             session_hours=good_hours))

print("\n--- also: inverted with the same hour-selection discipline ---")
inv_scores = {}
for h in (22, 2, 6, 10, 14, 18):
    inv_scores[h] = evaluate(dict(mode="inverted", flatten_mode="none",
                                  pending_cancel="end", session_hours={h}), IN)
inv_good = {h for h, s in inv_scores.items() if s["ret"] > 0 and s["n"] >= 20}
print(f"  inverted hours positive in-sample: {sorted(inv_good) or 'none'}")
if inv_good:
    row(f"inverted run-to-TP/SL, hours {sorted(inv_good)}",
        dict(mode="inverted", flatten_mode="none", pending_cancel="end",
             session_hours=inv_good))
