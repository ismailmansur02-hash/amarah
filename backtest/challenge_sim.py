"""Prop-CHALLENGE simulation of the day-of-week edge (phase-1: +10% before -10%).

A challenge is a barrier problem, not an income problem: starting at the initial
balance, reach the **+10% profit target** before ever touching the **-10% max
loss** (FTMO phase-1 rules; daily -5% also checked). Time budget ~5 months.

We take the ALREADY-VALIDATED strategy (bot/DOW_BOT_SPEC.md: Mon-long/Wed-short,
00:15-21:45 London, 1.5xATR stop, both pairs) and only vary RISK_PER_PAIR. For
every possible 5-month start window in the real data (FTMO GBP + FMP EUR,
2023-2026) we simulate a fresh challenge and record pass / fail / neither.

This does NOT invent a new "aggressive" strategy — sizing up a proven edge is
honest; inventing a hot new one to hit a number is the overfitting trap.
"""
import os
import sys

import numpy as np
import pandas as pd

sys.path.insert(0, os.path.dirname(__file__))
import dow_acceptance as A

WIN_DAYS = 152          # ~5 months
TARGET = 0.10           # +10% profit target
MAXLOSS = 0.10          # -10% static max loss (from initial)
DAILY = 0.05            # -5% daily loss limit


def trade_series(pairs, risk):
    tr = A.run(pairs, risk=risk).sort_values("day").reset_index(drop=True)
    # collapse to per-DAY account returns (both pairs same day compound within day)
    day = tr.groupby("day")["r"].apply(lambda s: (1 + s).prod() - 1)
    return day.index.values, day.values


def simulate(dates, r, i0):
    """One challenge starting at trade-day index i0."""
    eq = 1.0
    start = dates[i0]
    for j in range(i0, len(r)):
        if (dates[j] - start) / np.timedelta64(1, "D") > WIN_DAYS:
            break
        if r[j] <= -DAILY:          # daily loss breach (rare at these sizes)
            return "fail"
        eq *= (1 + r[j])
        ret = eq - 1
        if ret <= -MAXLOSS:
            return "fail"
        if ret >= TARGET:
            return "pass"
    return "timeout"                # neither barrier in 5 months


def analyze(pairs, risk):
    dates, r = trade_series(pairs, risk)
    out = {"pass": 0, "fail": 0, "timeout": 0}
    # regime split by START date
    good = {"pass": 0, "fail": 0, "timeout": 0}
    for i in range(len(r)):
        # only start windows that have a full 5 months of data ahead
        if (dates[-1] - dates[i]) / np.timedelta64(1, "D") < WIN_DAYS:
            break
        o = simulate(dates, r, i)
        out[o] += 1
        if pd.Timestamp(dates[i]) >= pd.Timestamp("2025-01-01"):
            good[o] += 1
    return out, good


def pct(d):
    n = sum(d.values()) or 1
    return {k: v / n * 100 for k, v in d.items()}, sum(d.values())


if __name__ == "__main__":
    pairs = A.load_pairs()
    print("Prop challenge (+10% before -10%, 5-month windows) — day-of-week edge")
    print("=" * 74)
    print(f"{'risk/pair':>10}{'ALL windows pass/fail/timeout':>34}"
          f"{'2025+ windows pass/fail/timeout':>30}")
    for risk in (0.005, 0.0075, 0.010, 0.0125, 0.015, 0.020):
        allw, good = analyze(pairs, risk)
        a, na = pct(allw)
        g, ng = pct(good)
        print(f"{risk*100:>9.2f}%   {a['pass']:>5.0f}% / {a['fail']:>4.0f}% / "
              f"{a['timeout']:>4.0f}%  (n{na:<3})   {g['pass']:>5.0f}% / "
              f"{g['fail']:>4.0f}% / {g['timeout']:>4.0f}%  (n{ng})")
    print("\npass = hit +10% first · fail = hit -10% (or -5% day) first · "
          "timeout = neither in 5 months")
    print("2025+ = challenge windows starting in the current (good) regime.")

    # what does a good-regime window typically look like at a chosen size?
    print("\nDetail at 1.00%/pair, 2025-01 start (a concrete good-regime challenge):")
    dates, r = trade_series(pairs, 0.010)
    i0 = int(np.searchsorted(dates, np.datetime64("2025-01-01")))
    eq = 1.0; peak = 1.0; mdd = 0.0; hit = None
    for j in range(i0, len(r)):
        if (dates[j] - dates[i0]) / np.timedelta64(1, "D") > WIN_DAYS:
            break
        eq *= (1 + r[j]); peak = max(peak, eq); mdd = min(mdd, eq / peak - 1)
        if hit is None and eq - 1 >= TARGET:
            hit = (pd.Timestamp(dates[j]) - pd.Timestamp(dates[i0])).days
    print(f"  reached +10% in ~{hit} days; window end equity {(eq-1)*100:+.1f}%, "
          f"worst drawdown {mdd*100:.1f}%")
