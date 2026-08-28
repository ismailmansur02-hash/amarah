"""Where inside the 21.5-hour DOW trade does the money actually accrue?

Every improvement tested so far (news filter, VIX regime, dollar breadth) raised
Sharpe by removing TRADES, but barely moved max drawdown — and drawdown, not
Sharpe, is what caps position size. So none of them increased absolute return.

Hold time is the one dimension never tested, and it acts differently: cutting
dead hours removes variance from INSIDE each trade, which shrinks drawdown
directly and therefore permits genuinely larger sizing.

Rules held identical to the live bot: enter 00:15 London Mon(BUY)/Wed(SELL),
protective stop 1.5 x ATR14(daily) checked on 5-min bars, EURUSD+GBPUSD,
0.5%/pair. The ONLY change is the exit clock.

PRE-REGISTERED exits (9): 04:00, 06:00, 08:00, 10:00, 12:00, 14:00, 16:00,
18:00 London, and 21:45 (the current spec). TRAIN 2023-01..2025-03,
TEST 2025-04..2026-07. Both pairs must agree for a survivor.
"""
import os
import sys

import numpy as np
import pandas as pd

DATA = os.path.join(os.path.dirname(os.path.abspath(__file__)), "data")
COST = {"EURUSD": 0.6e-4, "GBPUSD": 0.8e-4}
RISK, K_ATR = 0.005, 1.5
SIDE = {0: "BUY", 2: "SELL"}
ENTRY = 15                                   # 00:15 London, in minutes
EXITS = [(4, 0), (6, 0), (8, 0), (10, 0), (12, 0), (14, 0), (16, 0), (18, 0), (21, 45)]
TRAIN = (pd.Timestamp("2023-01-01"), pd.Timestamp("2025-04-01"))
TEST = (pd.Timestamp("2025-04-01"), pd.Timestamp("2026-08-01"))


def load(pair):
    d = pd.read_parquet(f"{DATA}/{pair.lower()}_m5_utc.parquet")
    ldn = d["london"]
    d = d.assign(lday=ldn.dt.tz_localize(None).dt.normalize(),
                 lmin=ldn.dt.hour * 60 + ldn.dt.minute)
    day = d.groupby("lday").agg(h=("high", "max"), l=("low", "min"), c=("close", "last"))
    pc = day.c.shift(1)
    tr = pd.concat([day.h - day.l, (day.h - pc).abs(), (day.l - pc).abs()],
                   axis=1).max(axis=1)
    d.attrs["atr"] = tr.rolling(14).mean().shift(1)
    return d


def trades(pair, exit_min):
    d, atr = load(pair), None
    atr = d.attrs["atr"]
    win = d[(d.lmin >= ENTRY) & (d.lmin < exit_min)]
    out = []
    for lday, g in win.groupby("lday"):
        wd = lday.dayofweek
        if wd not in SIDE or len(g) < 6:
            continue
        a = atr.get(lday, np.nan)
        if not np.isfinite(a) or a <= 0:
            continue
        side, e, sd = SIDE[wd], g.iloc[0]["open"], K_ATR * a
        if side == "BUY":
            hit = (g.low <= e - sd).any()
            px = (e - sd) if hit else g.iloc[-1]["close"]
            gross = px - e
        else:
            hit = (g.high >= e + sd).any()
            px = (e + sd) if hit else g.iloc[-1]["close"]
            gross = e - px
        out.append({"date": lday, "sym": pair, "stopped": bool(hit),
                    "r": (gross - COST[pair]) / sd * RISK})
    return pd.DataFrame(out)


def book(exit_min):
    return pd.concat([trades(p, exit_min) for p in ("EURUSD", "GBPUSD")]
                     ).sort_values("date").reset_index(drop=True)


def perf(t, lo=None, hi=None):
    if lo is not None:
        t = t[(t.date >= lo) & (t.date < hi)]
    if len(t) < 5:
        return None
    day = t.groupby("date").r.apply(lambda s: (1 + s).prod() - 1).sort_index()
    yrs = max((day.index[-1] - day.index[0]).days / 365.25, 0.5)
    tot = ((1 + day).prod() - 1) * 100
    ann = ((1 + tot / 100) ** (1 / yrs) - 1) * 100
    dpm = len(day) / (yrs * 12)
    sh = day.mean() / day.std(ddof=1) * np.sqrt(dpm * 12) if day.std() else 0
    eq = (1 + day).cumprod()
    dd = (eq / eq.cummax() - 1).min() * 100
    tt = t.r.mean() / (t.r.std(ddof=1) / np.sqrt(len(t)))
    return dict(ann=ann, sh=sh, dd=dd, n=len(t), t=tt, stop=t.stopped.mean() * 100)


if __name__ == "__main__":
    print("Cumulative P&L inside the trade — mean return by London hour "
          "(both pairs, all data):")
    prev, marks = 0.0, []
    for h, m in EXITS:
        b = book(h * 60 + m)
        p = perf(b)
        marks.append((f"{h:02d}:{m:02d}", p["ann"]))
        print(f"  exit {h:02d}:{m:02d}  cumulative {p['ann']:+6.2f}%/yr   "
              f"(this block {p['ann']-prev:+6.2f})   stops {p['stop']:4.1f}%")
        prev = p["ann"]

    print("\nPRE-REGISTERED exit times — train/test (9 hypotheses, both pairs):")
    print(f"  {'exit':<8}{'TRAIN ann':>11}{'Sh':>6}{'maxDD':>8}"
          f"{'TEST ann':>11}{'Sh':>6}{'maxDD':>8}{'t':>6}{'stops':>7}")
    rows = []
    for h, m in EXITS:
        b = book(h * 60 + m)
        tr, te = perf(b, *TRAIN), perf(b, *TEST)
        if not tr or not te:
            continue
        rows.append((f"{h:02d}:{m:02d}", b, tr, te))
        cur = "  <- current" if (h, m) == (21, 45) else ""
        print(f"  {h:02d}:{m:02d}   {tr['ann']:>+9.1f}%{tr['sh']:>6.2f}{tr['dd']:>7.1f}%"
              f"{te['ann']:>+10.1f}%{te['sh']:>6.2f}{te['dd']:>7.1f}%"
              f"{te['t']:>6.1f}{te['stop']:>6.1f}%{cur}")

    print("\nThe money question — size each variant to an 8% drawdown budget "
          "(full period):")
    print(f"  {'exit':<8}{'maxDD@0.5%':>12}{'sizing x':>10}{'return @8% DD':>16}"
          f"{'Sharpe':>9}")
    for lbl, b, tr, te in rows:
        p = perf(b)
        k = 8.0 / abs(p["dd"])
        day = b.groupby("date").r.apply(lambda s: (1 + s * k).prod() - 1).sort_index()
        yrs = (day.index[-1] - day.index[0]).days / 365.25
        ann = ((1 + ((1 + day).prod() - 1)) ** (1 / yrs) - 1) * 100
        eq = (1 + day).cumprod()
        print(f"  {lbl:<8}{p['dd']:>11.1f}%{k:>10.1f}{ann:>15.1f}%{p['sh']:>9.2f}")
