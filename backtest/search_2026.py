"""Hunt for edges scored on 2026 EURUSD ONLY, with an internal stability filter.

2026 is split in half - H1 = Jan-Mar, H2 = Apr-Jul(14) - and a config is only
called "stable" if it is positive in BOTH halves (and has enough trades to be
worth a comment). This is the cheapest honest guard against picking the
single best-looking curve on one 6-month blob. It reduces luck; it does not
remove it - ~8 trades per half is still tiny.

Scans:
  A) ALGAY family: inverted vs original x each UK session hour x flatten on/off.
  B) Raw hour-of-day directional bias (which UK hour drifts up/down).
  C) Raw day-of-week directional bias.
Realistic costs throughout for the traded strategies.
"""
import os
import sys

import numpy as np
import pandas as pd

sys.path.insert(0, os.path.dirname(__file__))
import engine  # noqa: E402

m5, m15 = engine.load_bars(os.path.join(os.path.dirname(__file__), "data/eurusd_m5.parquet"))

Y0 = pd.Timestamp("2026-01-01")
MID = pd.Timestamp("2026-04-01")
Y1 = pd.Timestamp("2026-07-15")
HOURS = (22, 2, 6, 10, 14, 18)


def algay_ret(cfg, a, b):
    bt = engine.Backtest(m5, m15, costs=engine.Costs(), ambiguity="worst",
                         mode=cfg["mode"], flatten_mode=cfg["flat"],
                         pending_cancel=("end" if cfg["flat"] == "none" else "cutoff"),
                         session_hours=cfg.get("hours"))
    tr, _, _ = bt.run(start=a, end=b)
    f = [t for t in tr if t.status == "filled"]
    if not f:
        return 0.0, 0
    r = 1.0
    for t in f:
        r *= (1 + t.pnl / (t.balance_after - t.pnl))
    return (r - 1) * 100, len(f)


print("=== A) ALGAY family on 2026 (sorted by full-2026 return) ===")
print("stable* = positive in BOTH H1 (Jan-Mar) and H2 (Apr-Jul)\n")
rows = []
for mode in ("inverted", "original"):
    for flat in ("session", "none"):
        for hrs in [None] + [{h} for h in HOURS]:
            full, n = algay_ret({"mode": mode, "flat": flat, "hours": hrs}, Y0, Y1)
            if n == 0:
                continue
            h1, n1 = algay_ret({"mode": mode, "flat": flat, "hours": hrs}, Y0, MID)
            h2, n2 = algay_ret({"mode": mode, "flat": flat, "hours": hrs}, MID, Y1)
            label = f"{mode:<8} flat={flat:<7} hrs={sorted(hrs) if hrs else 'all'}"
            rows.append((full, h1, h2, n, n1, n2, label))
rows.sort(reverse=True)
print(f"{'config':<42}{'2026':>8}{'H1':>8}{'H2':>8}{'n':>5}  stable")
for full, h1, h2, n, n1, n2, label in rows[:14]:
    stable = "*YES*" if (h1 > 0 and h2 > 0 and n1 >= 4 and n2 >= 4) else ""
    print(f"{label:<42}{full:>+7.1f}%{h1:>+7.1f}%{h2:>+7.1f}%{n:>5}  {stable}")

print("\n=== B) Raw hour-of-day drift, 2026 (EURUSD 1H close-to-close) ===")
h = m5.set_index("time")["close"].resample("1h").last().dropna()
hr = h.pct_change() * 100
uk_hour = hr.index.tz_localize("UTC").tz_convert("Europe/London").hour
d = pd.DataFrame({"ret": hr.values, "hour": uk_hour, "t": hr.index})
d = d[(d.t >= Y0) & (d.t < Y1)].dropna()
print(f"{'UK hr':>6}{'mean%':>9}{'%up':>7}{'n':>6}  {'H1 mean':>9}{'H2 mean':>9}  stable")
for hh in range(24):
    g = d[d.hour == hh]
    if len(g) < 40:
        continue
    g1 = g[g.t < MID]; g2 = g[g.t >= MID]
    st = "*" if (g1.ret.mean() > 0) == (g2.ret.mean() > 0) and abs(g.ret.mean()) > 0.003 else ""
    print(f"{hh:>6}{g.ret.mean():>+8.4f}{(g.ret>0).mean()*100:>6.0f}%{len(g):>6}"
          f"{g1.ret.mean():>+9.4f}{g2.ret.mean():>+9.4f}  {st}")

print("\n=== C) Raw day-of-week drift, 2026 (EURUSD daily close-to-close) ===")
dd = m5.set_index("time")["close"].resample("1D").last().dropna()
dr = (dd.pct_change() * 100).dropna()
dr = dr[(dr.index >= Y0) & (dr.index < Y1)]
wd = pd.DataFrame({"ret": dr.values, "wd": dr.index.dayofweek, "t": dr.index})
names = ["Mon", "Tue", "Wed", "Thu", "Fri"]
print(f"{'day':>5}{'mean%':>9}{'%up':>7}{'n':>5}  {'H1':>8}{'H2':>8}  stable")
for w in range(5):
    g = wd[wd.wd == w]
    if len(g) < 5:
        continue
    g1 = g[g.t < MID]; g2 = g[g.t >= MID]
    st = "*" if (g1.ret.mean() > 0) == (g2.ret.mean() > 0) and abs(g.ret.mean()) > 0.01 else ""
    print(f"{names[w]:>5}{g.ret.mean():>+8.3f}{(g.ret>0).mean()*100:>6.0f}%{len(g):>5}"
          f"{g1.ret.mean():>+8.3f}{g2.ret.mean():>+8.3f}  {st}")
