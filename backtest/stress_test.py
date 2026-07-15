"""Adversarial stress-test of the candidate/combined strategy on 2026.

Goal: try to BREAK the result. Each check looks for a way the backtest is
optimistic, mislabeled, or just luck. Prints a verdict per check.
"""
import os
import sys

import numpy as np
import pandas as pd

sys.path.insert(0, os.path.dirname(__file__))
import engine  # noqa: E402

m5, m15 = engine.load_bars(os.path.join(os.path.dirname(__file__), "data/eurusd_m5.parquet"))
Y0, MID, Y1 = pd.Timestamp("2026-01-01"), pd.Timestamp("2026-04-01"), pd.Timestamp("2026-07-15")
PIP = engine.PIP


def sub(a, b):
    d = m5[(m5.time >= a) & (m5.time < b)]
    return d


# daily OHLC (UTC calendar days)
day = m5.set_index("time").resample("1D").agg(
    o=("open", "first"), h=("high", "max"), l=("low", "min"), c=("close", "last")
).dropna()
day26 = day[(day.index >= Y0) & (day.index < Y1)].copy()
day26["wd"] = day26.index.dayofweek

print("=" * 70)
print("CHECK 1 — is the 'strategy' just long EURUSD in a trending year? (beta)")
print("=" * 70)
p0, p1 = day26.c.iloc[0], day26.c.iloc[-1]
bh = (p1 / p0 - 1) * 100
print(f"EURUSD 2026: {p0:.4f} -> {p1:.4f}  = buy&hold {bh:+.1f}% (no leverage)")
print(f"  H1 {(day26.c[day26.index < MID].iloc[-1]/p0-1)*100:+.1f}%  "
      f"H2 {(p1/day26.c[day26.index >= MID].iloc[0]-1)*100:+.1f}%")
print("  -> if the bot is net-long, part of its 2026 P&L is just this drift.")

print("\n" + "=" * 70)
print("CHECK 2 — day-of-week: CLOSE-TO-CLOSE (overnight) vs INTRADAY (open->close)")
print("=" * 70)
cost = 0.6 * PIP / 1.10 * 100
day26["c2c"] = day26.c.pct_change() * 100          # prev close -> close (holds overnight/weekend)
day26["o2c"] = (day26.c / day26.o - 1) * 100       # open -> close same day (no overnight)
for lbl, wd, direction in [("Mon", 0, +1), ("Wed", 2, -1)]:
    g = day26[day26.wd == wd]
    c2c = (direction * g.c2c - cost).sum()
    o2c = (direction * g.o2c - cost).sum()
    print(f"  {lbl} {'long ' if direction>0 else 'short'}: "
          f"close-to-close {c2c:+6.2f}%  |  intraday open->close {o2c:+6.2f}%  (n={len(g)})")
print("  -> if the edge is in c2c but NOT in o2c, it is an OVERNIGHT/WEEKEND")
print("     effect: needs holding overnight (swap fees, gap & prop-rule risk),")
print("     not a clean intraday trade.")

print("\n" + "=" * 70)
print("CHECK 3 — swap/financing cost the combined sim ignored (overnight holds)")
print("=" * 70)
# typical EURUSD short/long swap ~ -0.5 pip/night; weekend = 3x. Monday c2c hold
# spans Fri->Mon (~3 nights incl weekend triple = up to ~5 swap units).
swap_pip = 0.5
mon = day26[day26.wd == 0]
wed = day26[day26.wd == 2]
mon_swap = len(mon) * 5 * swap_pip * PIP / 1.10 * 100    # ~weekend-loaded
wed_swap = len(wed) * 1 * swap_pip * PIP / 1.10 * 100
print(f"  est. swap drag: Mon-hold ~{mon_swap:.2f}%, Wed-hold ~{wed_swap:.2f}% over 2026")
print(f"  combined DoW gross was ~+7% -> swap alone could remove "
      f"~{mon_swap+wed_swap:.1f}% of it.")

print("\n" + "=" * 70)
print("CHECK 4 — statistical significance (is the per-trade edge > noise?)")
print("=" * 70)


def tstat(returns):
    r = np.array(returns, dtype=float)
    if len(r) < 2 or r.std(ddof=1) == 0:
        return 0.0, 0.0
    t = r.mean() / (r.std(ddof=1) / np.sqrt(len(r)))
    return r.mean(), t


# DoW per-trade (close-to-close, the version that "worked")
dow_r = list((+1) * day26[day26.wd == 0].c2c - cost) + list((-1) * day26[day26.wd == 2].c2c - cost)
mu, t = tstat(dow_r)
print(f"  DoW sleeve (c2c):  n={len(dow_r)}  mean/trade {mu:+.3f}%  t-stat {t:.2f}  "
      f"{'*edge*' if abs(t) > 2 else 'NOT significant (|t|<2)'}")
# DoW intraday version
dow_o = list((+1) * day26[day26.wd == 0].o2c - cost) + list((-1) * day26[day26.wd == 2].o2c - cost)
mu2, t2 = tstat(dow_o)
print(f"  DoW sleeve (intraday): n={len(dow_o)}  mean/trade {mu2:+.3f}%  t-stat {t2:.2f}  "
      f"{'*edge*' if abs(t2) > 2 else 'NOT significant (|t|<2)'}")

# ALGAY sleeve per-trade returns
bt = engine.Backtest(m5, m15, costs=engine.Costs(), mode="original",
                     flatten_mode="session", pending_cancel="cutoff", session_hours={14})
tr, _, _ = bt.run(start=Y0, end=Y1)
alg_r = [t_.pnl / (t_.balance_after - t_.pnl) * 100 for t_ in tr if t_.status == "filled"]
mu3, t3 = tstat(alg_r)
print(f"  ALGAY 14:00 sleeve: n={len(alg_r)}  mean/trade {mu3:+.3f}%  t-stat {t3:.2f}  "
      f"{'*edge*' if abs(t3) > 2 else 'NOT significant (|t|<2)'}")
print("  (|t|>2 ~ 95% confidence the mean is really > 0; below that = plausibly luck)")

print("\n" + "=" * 70)
print("CHECK 5 — did I just pick the luckiest weekday? (all 5 days, both directions)")
print("=" * 70)
best = []
for wd in range(5):
    g = day26[day26.wd == wd]
    lo = (g.c2c - cost).sum(); sh = (-g.c2c - cost).sum()
    best.append((max(lo, sh), ["Mon", "Tue", "Wed", "Thu", "Fri"][wd],
                 "long" if lo > sh else "short", lo, sh))
best.sort(reverse=True)
print("  best 2026 c2c return by weekday (picking best direction each):")
for val, name, side, lo, sh in best:
    print(f"    {name} {side:<5}: {val:+6.2f}%   (long {lo:+.2f} / short {sh:+.2f})")
print("  -> I selected the top 2 of 10 options. Some weekday will always look")
print("     best in ANY single year; that is the multiple-comparison trap.")

print("\n" + "=" * 70)
print("CHECK 6 — resample-boundary fragility (UTC midnight vs London midnight)")
print("=" * 70)
for tzlbl, shift in [("UTC day", "0h"), ("London day", "LON")]:
    if shift == "0h":
        d2 = day26.copy()
    else:
        s = m5.copy()
        s["time"] = s["time"].dt.tz_localize("UTC").dt.tz_convert("Europe/London").dt.tz_localize(None)
        d2 = s.set_index("time").resample("1D").agg(c=("close", "last")).dropna()
        d2 = d2[(d2.index >= Y0) & (d2.index < Y1)]
        d2["wd"] = d2.index.dayofweek; d2["c2c"] = d2.c.pct_change() * 100
    w = d2[d2.wd == 2]
    print(f"  {tzlbl:<11}: Wed short c2c = {((-w.c2c) - cost).sum():+.2f}%  (n={len(w)})")
print("  -> if the number swings a lot with the day boundary, the 'edge' is fragile.")
