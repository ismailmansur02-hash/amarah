"""Out-of-sample test of the day-of-week algo: new YEAR (2025) and new
INSTRUMENT (GBPUSD), same Monday-long / Wednesday-short intraday logic.

If the 2026 EURUSD edge is real, it should show some life on 2025 and on
GBPUSD. If it only exists on 2026 EURUSD, it was regime/instrument-specific
(i.e. luck), and that is the honest conclusion.

Uses FMP daily EOD bars (open->close = the day's move). Cost ~0.6 pip.
"""
import os

import numpy as np
import pandas as pd

DATA = os.path.join(os.path.dirname(__file__), "data")
FILES = {"EURUSD": f"{DATA}/eurusd_eod.csv", "GBPUSD": f"{DATA}/gbpusd_eod.csv"}


def load(sym):
    d = pd.read_csv(FILES[sym])
    d["date"] = pd.to_datetime(d["date"])
    d = d.sort_values("date").reset_index(drop=True)
    d["wd"] = d["date"].dt.dayofweek
    d["o2c"] = (d["close"] / d["open"] - 1) * 100
    d["pip_cost_pct"] = 0.6 * 0.0001 / d["close"] * 100
    return d


def tstat(r):
    r = np.asarray(r, float)
    if len(r) < 2 or r.std(ddof=1) == 0:
        return 0.0
    return r.mean() / (r.std(ddof=1) / np.sqrt(len(r)))


def evaluate(d, y0, y1):
    g = d[(d.date >= y0) & (d.date < y1)]
    trades, months = [], []
    for _, r in g.iterrows():
        if r.wd == 0:
            trades.append((r.date, r.o2c - r.pip_cost_pct))
        elif r.wd == 2:
            trades.append((r.date, -r.o2c - r.pip_cost_pct))
    if not trades:
        return None
    tr = pd.DataFrame(trades, columns=["t", "r"])
    comp = ((1 + tr.r / 100).prod() - 1) * 100
    mo = tr.set_index("t").resample("ME")["r"].apply(lambda s: ((1 + s / 100).prod() - 1) * 100)
    return dict(total=comp, n=len(tr), win=(tr.r > 0).mean() * 100,
                t=tstat(tr.r), avgm=mo.mean(), months=mo,
                mtar=int((mo >= 0.5).sum()), nmo=len(mo),
                bh=(g.close.iloc[-1] / g.open.iloc[0] - 1) * 100)


spans = {"2025": (pd.Timestamp("2025-01-01"), pd.Timestamp("2026-01-01")),
         "2026": (pd.Timestamp("2026-01-01"), pd.Timestamp("2026-07-15"))}

print("Day-of-week algo (Mon long + Wed short, intraday) — out-of-sample grid")
print("=" * 72)
print(f"{'symbol/year':<16}{'total':>9}{'avg/mo':>9}{'win':>6}{'t-stat':>8}"
      f"{'>=0.5 mo':>10}{'buy&hold':>10}")
print("-" * 72)
results = {}
for sym in ("EURUSD", "GBPUSD"):
    d = load(sym)
    for yr, (a, b) in spans.items():
        r = evaluate(d, a, b)
        results[(sym, yr)] = r
        sig = "*" if abs(r["t"]) > 2 else " "
        print(f"{sym+' '+yr:<16}{r['total']:>+8.1f}%{r['avgm']:>+8.2f}%"
              f"{r['win']:>5.0f}%{r['t']:>7.2f}{sig}{r['mtar']:>6}/{r['nmo']:<3}"
              f"{r['bh']:>+9.1f}%")
print("-" * 72)
print("* |t|>2 ~ statistically significant on that slice (still single-sample)")

print("\nMonth-by-month (total return %, that slice):")
for (sym, yr), r in results.items():
    ms = "  ".join(f"{m.strftime('%b')}:{v:+.1f}" for m, v in r["months"].items())
    print(f"  {sym} {yr}: {ms}")
