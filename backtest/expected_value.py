"""Is the DOW strategy worth running? Blunt expected-value maths.

Everything is driven by the REAL trade returns from the acceptance engine
(bot's exact rules, 5-min data, 2023-01 -> 2026-07), not assumptions.
"""
import sys, numpy as np, pandas as pd
sys.path.insert(0, 'backtest')
from dow_acceptance import load_pairs, run

rng = np.random.default_rng(7)
tr = run(load_pairs(), risk=0.005)
day = tr.groupby("day")["r"].apply(lambda s: (1+s).prod()-1).sort_index()   # per trading day, 0.5%/pair
v = day.values
n_per_month = len(v) / ((day.index[-1]-day.index[0]).days/30.44)

print("=== 1. WHAT THE STRATEGY ACTUALLY IS (0.5%/pair, real trades) ===")
print(f"  trading days: {len(v)} over {(day.index[-1]-day.index[0]).days/365.25:.1f} yrs "
      f"({n_per_month:.1f}/month)")
mu_d, sd_d = v.mean(), v.std(ddof=1)
ann_ret = mu_d * n_per_month * 12 * 100
ann_vol = sd_d * np.sqrt(n_per_month*12) * 100
print(f"  mean/day {mu_d*100:+.3f}%   sd/day {sd_d*100:.3f}%")
print(f"  annualised: return {ann_ret:+.1f}%   vol {ann_vol:.1f}%   "
      f"SHARPE {ann_ret/ann_vol:.2f}")
print(f"  monthly: mean {mu_d*n_per_month*100:+.2f}%   "
      f"sd {sd_d*np.sqrt(n_per_month)*100:.2f}%")
mo = day.resample("ME").apply(lambda s: ((1+s).prod()-1)*100)
print(f"  months: {len(mo)}, negative {(mo<0).sum()} ({(mo<0).mean()*100:.0f}%), "
      f"worst {mo.min():+.1f}%, best {mo.max():+.1f}%")

print("\n=== 2. DOLLARS ON YOUR OWN CAPITAL (no prop firm) ===")
print(f"  at {mu_d*n_per_month*100:+.2f}%/month average:")
for cap in (1_000, 5_000, 10_000, 50_000, 100_000):
    m = cap * mu_d * n_per_month
    print(f"    ${cap:>7,}  ->  ${m:>7,.0f}/month   ${m*12:>8,.0f}/year")

print("\n=== 3. THE PROP ROUTE: what the leverage really costs ===")
# bootstrap whole journeys: challenge (to +10% or -12%) then funded life
def journey(mult, target=0.10, floor=0.12, max_days=2000):
    """returns (passed, days_to_pass, months_funded_before_death, total_%_earned_funded)"""
    eq, d = 1.0, 0
    while d < max_days:                      # challenge phase
        eq *= 1 + mult*v[rng.integers(len(v))]; d += 1
        if eq <= 1-floor: return False, d, 0, 0.0
        if eq >= 1+target: break
    else:
        return False, d, 0, 0.0
    days_pass = d
    # funded phase: same rules, drawdown from peak kills the account
    feq, peak, earned, fd = 1.0, 1.0, 0.0, 0
    while fd < max_days:
        r = mult*v[rng.integers(len(v))]
        feq *= 1+r; peak = max(peak, feq)
        if feq <= peak*(1-floor):            # blown funded account
            break
        if feq >= 1.05:                      # withdraw profits above +5%
            earned += feq-1.0; feq = 1.0; peak = 1.0
        fd += 1
    return True, days_pass, fd/n_per_month, (earned + max(0, feq-1))*100

for mult, lbl in ((1.0,"0.50%/pair"), (1.5,"0.75%/pair"), (2.0,"1.00%/pair")):
    res = [journey(mult) for _ in range(3000)]
    passed = [r for r in res if r[0]]
    pr = len(passed)/len(res)
    d2p = np.median([r[1] for r in passed])/n_per_month if passed else np.nan
    life = np.median([r[2] for r in passed]) if passed else 0
    earn = np.mean([r[3] for r in passed]) if passed else 0
    print(f"  {lbl}: pass {pr*100:.0f}%  median {d2p:.1f} mo to pass  "
          f"funded life {life:.0f} mo (median)  total earned while funded {earn:.0f}% of account")

print("\n=== 4. NET DOLLARS VIA PROP, $100k account, 85% split ===")
print("  (fee unverified - shown as a range; assumes funded acct keeps the 12% static rule)")
for mult, lbl in ((1.0,"0.50%/pair"), (1.5,"0.75%/pair")):
    res = [journey(mult) for _ in range(3000)]
    pr = np.mean([r[0] for r in res])
    earn = np.mean([r[3] for r in res])          # 0 for failures
    gross = earn/100 * 100_000 * 0.85
    passed = [r for r in res if r[0]]
    horizon = np.median([r[1]/n_per_month + r[2] for r in passed]) if passed else np.nan
    print(f"  {lbl}: E[payout] ${gross:,.0f} per attempt over ~{horizon:.0f} months "
          f"-> ~${gross/max(horizon,1):,.0f}/month, before fees")
