"""Stress-test the candidate variant (original, run-to-TP/SL, hours 10+14 UK).

Robustness gauntlet before trusting it:
  1. Alternative train/test split (2023 train -> 2024-26 test): are the same
     hours selected, and does it still hold?
  2. Cost sensitivity (zero / realistic / 1.5x / retail 1 pip).
  3. Keeping the session-flatten (prop-firm discipline) with the same hours.
  4. Per-year returns + worst month + max drawdown.
  5. Adjacent-hour stability (does adding/removing an hour blow it up?).
"""
import os
import sys

import numpy as np
import pandas as pd

sys.path.insert(0, os.path.dirname(__file__))
import engine  # noqa: E402

m5, m15 = engine.load_bars(os.path.join(os.path.dirname(__file__), "data/eurusd_m5.parquet"))
FULL = (pd.Timestamp("2023-01-01"), pd.Timestamp("2026-07-12"))


def evaluate(cfg, span):
    bt = engine.Backtest(m5, m15, costs=cfg.get("costs") or engine.Costs(),
                         ambiguity="worst", mode=cfg.get("mode", "original"),
                         flatten_mode=cfg.get("flatten_mode", "none"),
                         pending_cancel=cfg.get("pending_cancel", "end"),
                         session_hours=cfg.get("session_hours"))
    tr, _, bal = bt.run(start=span[0], end=span[1])
    f = [t for t in tr if t.status == "filled"]
    if not f:
        return None
    d = pd.DataFrame([{"pnl": t.pnl, "t_exit": t.t_exit, "bal": t.balance_after} for t in f])
    ret = (bal / bt.balance0 - 1) * 100
    eq = pd.concat([pd.Series([bt.balance0]), d["bal"]], ignore_index=True)
    dd = (eq / eq.cummax() - 1).min() * 100
    m = d.set_index("t_exit").sort_index()["bal"]
    me = m.resample("ME").last().ffill(); ms = me.shift(1).fillna(bt.balance0)
    mo = (me / ms - 1) * 100
    yr = me.resample("YE").last()
    return dict(n=len(f), ret=ret, win=(d.pnl > 0).mean() * 100, dd=dd,
                mtar=int((mo >= 0.5).sum()), nmo=len(mo), avgm=mo.mean(),
                worst=mo.min(), best=mo.max(), mo=mo,
                bal=bal, b0=bt.balance0)


CAND = dict(mode="original", flatten_mode="none", pending_cancel="end",
            session_hours={10, 14})

print("=== 1. Alternative split: train 2023, test 2024-Jul2026 ===")
tr_span = (pd.Timestamp("2023-01-01"), pd.Timestamp("2024-01-01"))
te_span = (pd.Timestamp("2024-01-01"), pd.Timestamp("2026-07-12"))
scores = {}
for h in (22, 2, 6, 10, 14, 18):
    r = evaluate(dict(mode="original", flatten_mode="none", pending_cancel="end",
                      session_hours={h}), tr_span)
    scores[h] = r["ret"] if r else 0
    print(f"  train-2023 only {h:02d}:00 UK: {scores[h]:+.1f}%")
good = {h for h, v in scores.items() if v > 0}
print(f"  hours positive in 2023: {sorted(good)}")
if good:
    r = evaluate(dict(mode="original", flatten_mode="none", pending_cancel="end",
                      session_hours=good), te_span)
    print(f"  -> those hours on 2024-Jul2026 (unseen): {r['ret']:+.1f}%  "
          f"win {r['win']:.0f}%  n{r['n']}  tgt {r['mtar']}/{r['nmo']}  dd {r['dd']:.0f}%")

print("\n=== 2. Cost sensitivity (hours 10+14, run-to-TP/SL, full period) ===")
for label, c in [("zero", engine.Costs(spread=0, commission_rt=0, slippage=0)),
                 ("realistic", engine.Costs()),
                 ("1.5x", engine.Costs(spread=0.3 * engine.PIP, commission_rt=9, slippage=0.15 * engine.PIP)),
                 ("retail 1.0p", engine.Costs(spread=1.0 * engine.PIP, commission_rt=0, slippage=0.1 * engine.PIP))]:
    r = evaluate({**CAND, "costs": c}, FULL)
    print(f"  {label:<11}: {r['ret']:+7.1f}%  win {r['win']:.0f}%  avg {r['avgm']:+.2f}%/mo  "
          f"tgt {r['mtar']}/{r['nmo']}  dd {r['dd']:.0f}%")

print("\n=== 3. Keep session-flatten (prop discipline), hours 10+14 ===")
r = evaluate({**CAND, "flatten_mode": "session", "pending_cancel": "cutoff"}, FULL)
print(f"  flatten kept: {r['ret']:+.1f}%  win {r['win']:.0f}%  avg {r['avgm']:+.2f}%/mo  "
      f"tgt {r['mtar']}/{r['nmo']}  n{r['n']}  dd {r['dd']:.0f}%")

print("\n=== 4. Candidate detail (run-to-TP/SL, hours 10+14, realistic) ===")
r = evaluate(CAND, FULL)
print(f"  final ${r['bal']:,.0f}  return {r['ret']:+.1f}%  win {r['win']:.0f}%  n{r['n']}")
print(f"  avg month {r['avgm']:+.2f}%  best {r['best']:+.2f}%  worst {r['worst']:+.2f}%  maxDD {r['dd']:.0f}%")
print(f"  months >= +0.5%: {r['mtar']}/{r['nmo']}   (target is EVERY month)")
mo = r["mo"]
for y in (2023, 2024, 2025, 2026):
    s = mo[mo.index.year == y]
    comp = ((1 + s / 100).prod() - 1) * 100
    print(f"    {y}: {comp:+6.1f}%  ({(s>0).sum()}/{len(s)} months up)")

print("\n=== 5. Adjacent-hour stability ===")
for hrs in [{14}, {10}, {10, 14}, {10, 14, 6}, {6, 10, 14, 18}, {10, 14, 2}]:
    r = evaluate({**CAND, "session_hours": hrs}, FULL)
    print(f"  hours {sorted(hrs)}: {r['ret']:+7.1f}%  win {r['win']:.0f}%  "
          f"avg {r['avgm']:+.2f}%/mo  n{r['n']}  dd {r['dd']:.0f}%")
