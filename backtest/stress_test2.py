"""Part 2: permutation + bootstrap tests, and the intraday fix.

- Permutation test properly corrects the multiple-comparison problem: how often
  does RANDOM weekday labelling produce a best-of-10 as good as Wednesday?
- Bootstrap gives a confidence interval on the 2026 return of each sleeve.
- Re-specifies the day-of-week sleeve as INTRADAY (open->close, no overnight)
  and re-checks - the tradeable, swap-free, prop-safe form.
"""
import os
import sys

import numpy as np
import pandas as pd

sys.path.insert(0, os.path.dirname(__file__))
import engine  # noqa: E402

rng = np.random.default_rng(42)
m5, m15 = engine.load_bars(os.path.join(os.path.dirname(__file__), "data/eurusd_m5.parquet"))
Y0, Y1 = pd.Timestamp("2026-01-01"), pd.Timestamp("2026-07-15")
cost = 0.6 * engine.PIP / 1.10 * 100

day = m5.set_index("time").resample("1D").agg(
    o=("open", "first"), c=("close", "last")).dropna()
d = day[(day.index >= Y0) & (day.index < Y1)].copy()
d["wd"] = d.index.dayofweek
d["o2c"] = (d.c / d.o - 1) * 100                 # intraday, tradeable
ret = d["o2c"].to_numpy()
wd = d["wd"].to_numpy()
days = np.arange(5)


def best_of_10(returns, labels):
    best = -1e9
    for w in days:
        r = returns[labels == w]
        if len(r) == 0:
            continue
        best = max(best, (r - cost).sum(), (-r - cost).sum())
    return best


def wed_short(returns, labels):
    r = returns[labels == 2]
    return (-r - cost).sum()

actual_best = best_of_10(ret, wd)
actual_wed = wed_short(ret, wd)

N = 20000
null_best = np.empty(N)
null_wed = np.empty(N)
for i in range(N):
    perm = rng.permutation(wd)              # shuffle weekday labels across days
    null_best[i] = best_of_10(ret, perm)
    null_wed[i] = wed_short(ret, perm)

p_best = (null_best >= actual_best).mean()
p_wed = (null_wed >= actual_wed).mean()
print("=" * 66)
print("PERMUTATION TEST (intraday returns, 20k shuffles of weekday labels)")
print("=" * 66)
print(f"  Wednesday-short intraday 2026: {actual_wed:+.2f}%")
print(f"    p-value (raw, Wed specifically):            {p_wed:.4f}")
print(f"    p-value (corrected, best-of-10 weekdays):   {p_best:.4f}")
print(f"  interpretation: p<0.05 => unlikely to be random-weekday luck.")
print(f"    raw {'PASS' if p_wed < 0.05 else 'FAIL'}, "
      f"multiple-comparison-corrected {'PASS' if p_best < 0.05 else 'FAIL'}")

print("\n" + "=" * 66)
print("BOOTSTRAP 2026 return (resample trades w/ replacement, 10k)")
print("=" * 66)


def boot(returns, n=10000):
    tot = np.array([rng.choice(returns, len(returns), replace=True).sum()
                    for _ in range(n)])
    return np.percentile(tot, [5, 50, 95]), (tot > 0).mean()


# DoW intraday sleeve trades (Mon long + Wed short)
dow_tr = np.concatenate([ret[wd == 0] - cost, -ret[wd == 2] - cost])
(p5, p50, p95), pos = boot(dow_tr)
print(f"  DoW intraday sleeve: median {p50:+.2f}%  90% CI [{p5:+.2f}%, {p95:+.2f}%]  "
      f"P(>0)={pos*100:.0f}%  n={len(dow_tr)}")

bt = engine.Backtest(m5, m15, costs=engine.Costs(), mode="original",
                     flatten_mode="session", pending_cancel="cutoff", session_hours={14})
tr, _, _ = bt.run(start=Y0, end=Y1)
alg = np.array([t_.pnl / (t_.balance_after - t_.pnl) * 100 for t_ in tr if t_.status == "filled"])
(a5, a50, a95), apos = boot(alg)
print(f"  ALGAY 14:00 sleeve:  median {a50:+.2f}%  90% CI [{a5:+.2f}%, {a95:+.2f}%]  "
      f"P(>0)={apos*100:.0f}%  n={len(alg)}")
print("  -> if the CI comfortably clears 0, the sleeve is more than noise.")

print("\n" + "=" * 66)
print("INTRADAY DoW SUMMARY (the tradeable, swap-free, prop-safe form)")
print("=" * 66)
mon = ret[wd == 0] - cost
wed = -ret[wd == 2] - cost
print(f"  Mon long  intraday: {mon.sum():+.2f}%  win {(mon>0).mean()*100:.0f}%  n{len(mon)}")
print(f"  Wed short intraday: {wed.sum():+.2f}%  win {(wed>0).mean()*100:.0f}%  n{len(wed)}")
print(f"  Combined intraday:  {mon.sum()+wed.sum():+.2f}%  (vs +7.1% overnight version)")
print("  no overnight hold -> no swap, no weekend gap, prop-rule friendly.")
