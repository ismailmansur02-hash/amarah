"""FundingPips "1-Step Flex" pass simulation for the DOW bot.

Rules from the ad (2026-07): max loss 12% STATIC, no daily minimum, no
consistency rules, no time limit implied. NOT stated in the ad (assumed here,
sensitivity-tested): profit target +10% (their 1-step standard; +8% also
shown). Daily-loss rule unknown -> checked separately: worst possible bot day
= both pairs stopped ~= -1.0% x sizing multiplier, so any daily rule >= 4%
only binds at multiplier >= 4x.

Method: real strategy days from the acceptance engine (5-min data, exact live
rules, 0.5%/pair baseline). Sizing multiplier m scales each day's return
linearly (risk sizing is linear). Every historical start date = one path;
walk forward until +target (pass), -12% (fail), or data runs out (undecided).
Windows drawn from ALL data (includes the dead 2024 regime) and separately
from the 2025+ regime.
"""
import os
import sys

import numpy as np
import pandas as pd

sys.path.insert(0, os.path.dirname(__file__))
from dow_acceptance import load_pairs, run          # noqa: E402

TARGETS = (0.10, 0.08)
MAX_LOSS = 0.12
MULTS = (1.0, 1.5, 2.0, 3.0, 4.0)                   # x 0.5%/pair baseline


def daily_series():
    tr = run(load_pairs(), risk=0.005)
    day = tr.groupby("day")["r"].apply(lambda s: (1 + s).prod() - 1)
    return day.sort_index()                          # index=real dates (Mon/Wed)


def walk(days, dates, m, target):
    """One path from index 0; returns (outcome, calendar_days)."""
    eq = 1.0
    for i, r in enumerate(days):
        eq *= (1 + m * r)
        if eq <= 1 - MAX_LOSS:
            return "fail", (dates[i] - dates[0]).days
        if eq >= 1 + target:
            return "pass", (dates[i] - dates[0]).days
    return "open", (dates[-1] - dates[0]).days


def sim(day, label, target):
    v, idx = day.values, day.index
    print(f"\n  [{label}] target +{target*100:.0f}% vs -12% static "
          f"({len(v)} strategy days {idx[0].date()}..{idx[-1].date()})")
    print(f"    {'sizing':<16}{'pass':>7}{'fail':>7}{'undec.':>8}"
          f"{'med. pass time':>16}{'90th pct':>10}{'worst day':>11}")
    for m in MULTS:
        outs = []
        for s in range(len(v) - 10):
            outs.append(walk(v[s:], idx[s:], m, target))
        o = pd.DataFrame(outs, columns=["res", "cal"])
        p = o[o.res == "pass"]
        med = p.cal.median() / 30.44 if len(p) else np.nan
        p90 = p.cal.quantile(0.9) / 30.44 if len(p) else np.nan
        wd = (v * m).min() * 100
        nf = int(o.res.eq("fail").sum())        # exact count — % rounding hides rare busts
        print(f"    {m:.1f}x ({m*0.5:.2f}%/pair){o.res.eq('pass').mean()*100:>6.0f}%"
              f"{o.res.eq('fail').mean()*100:>5.1f}% ({nf}){o.res.eq('open').mean()*100:>6.0f}%"
              f"{med:>12.1f} mo{p90:>8.1f} mo{wd:>10.2f}%")


if __name__ == "__main__":
    day = daily_series()
    for target in TARGETS:
        sim(day, "ALL data 2023-2026 (incl. dead 2024)", target)
        sim(day[day.index >= "2025-01-01"], "2025->Jul 2026 regime", target)
    print("\n  note: undecided = data ran out before either barrier (right-censored,"
        "\n  mostly late start dates); with no time limit these are still-alive paths.")
