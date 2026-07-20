"""Validation gauntlet for the single edge-search survivor:

  4PM LONDON FIX REVERSAL - fade the 13:00->15:45 London move from 15:45 to
  16:15 (the WM/Reuters fix window). Prior: fix-driven order flow pushes price
  into 16:00, then mean-reverts; heavily documented (Evans 2018, Ito/Yamada).

Checks:
  1. both pairs, train/test, year-by-year consistency
  2. parameter stability (signal window x hold window grid - a real edge
     should not live on one cell)
  3. month-end subsample (fix flows are largest at month-end)
  4. signal-size filter: only trade when the 13:00->15:45 move is large
  5. risk-normalized portfolio sim (both pairs, 0.25%/trade risk) + corr vs
     the DOW book, combined equity
"""
import os

import numpy as np
import pandas as pd

DATA = os.path.join(os.path.dirname(__file__), "data")
TRAIN = (pd.Timestamp("2023-01-01"), pd.Timestamp("2025-04-01"))
TEST = (pd.Timestamp("2025-04-01"), pd.Timestamp("2026-07-21"))
COST_BPS = {"eurusd": 0.55, "gbpusd": 0.63}


def load(pair):
    d = pd.read_parquet(f"{DATA}/{pair}_m5_utc.parquet")
    ldn = d["london"]
    d["ldate"] = ldn.dt.tz_localize(None).dt.normalize()
    d["lmin"] = ldn.dt.hour * 60 + ldn.dt.minute
    d["lwd"] = ldn.dt.dayofweek
    return d


def window(d, m1, m2):
    w = d[(d.lmin >= m1) & (d.lmin < m2)]
    g = w.groupby("ldate").agg(o=("open", "first"), c=("close", "last"),
                               wd=("lwd", "first"), n=("close", "size"))
    g = g[(g.wd < 5) & (g.n >= (m2 - m1) / 5 * 0.6)]
    g["r"] = (g.c / g.o - 1) * 1e4
    return g


def tstat(x):
    x = np.asarray(x, float)
    return x.mean() / (x.std(ddof=1) / np.sqrt(len(x))) if len(x) > 1 else 0.0


def fixrev(d, pair, sig=(13 * 60, 15 * 60 + 45), hold=(15 * 60 + 45, 16 * 60 + 15),
           zmin=0.0):
    s, h = window(d, *sig), window(d, *hold)
    m = s[["r"]].join(h[["r"]], lsuffix="_s", rsuffix="_h", how="inner")
    if zmin > 0:
        thr = m.r_s.abs().expanding(60).quantile(zmin).shift(1)
        m = m[m.r_s.abs() >= thr.fillna(np.inf)]
    r = -np.sign(m.r_s) * m.r_h - COST_BPS[pair]
    return pd.DataFrame({"date": m.index, "r": r.values})


def split(t):
    tr = t[(t.date >= TRAIN[0]) & (t.date < TRAIN[1])]["r"]
    te = t[(t.date >= TEST[0]) & (t.date < TEST[1])]["r"]
    return tr, te


if __name__ == "__main__":
    frames = {p: load(p) for p in ("eurusd", "gbpusd")}

    print("1) base spec: fade 13:00->15:45 move, hold 15:45->16:15, net bps/day")
    both = {}
    for pair, d in frames.items():
        t = fixrev(d, pair)
        both[pair] = t
        tr, te = split(t)
        yr = "  ".join(f"{y}:{t[t.date.dt.year == y].r.mean():+5.2f}"
                       for y in (2023, 2024, 2025, 2026))
        print(f"  {pair}: train {tr.mean():+5.2f} t{tstat(tr):+5.1f} n={len(tr)} | "
              f"TEST {te.mean():+5.2f} t{tstat(te):+5.1f} n={len(te)} | {yr}")

    print("\n2) parameter stability (net mean bps, FULL period, both pairs pooled)")
    sigs = {"12:00": 12 * 60, "13:00": 13 * 60, "14:00": 14 * 60, "15:00": 15 * 60}
    holds = {"15:45-16:05": (15 * 60 + 45, 16 * 60 + 5),
             "15:45-16:15": (15 * 60 + 45, 16 * 60 + 15),
             "15:45-16:30": (15 * 60 + 45, 16 * 60 + 30),
             "16:00-16:30": (16 * 60, 16 * 60 + 30)}
    print(f"  {'sig start':<10}" + "".join(f"{h:>14}" for h in holds))
    for sname, sm in sigs.items():
        line = f"  {sname:<10}"
        for hname, hw in holds.items():
            rs = [fixrev(frames[p], p, sig=(sm, 15 * 60 + 45), hold=hw)["r"]
                  for p in frames]
            r = pd.concat(rs)
            line += f"{r.mean():+7.2f}(t{tstat(r):+4.1f})"
        print(line)

    print("\n3) month-end (last 2 business days) vs rest, base spec, full period")
    for pair, t in both.items():
        t = t.copy()
        nxt = t.date + pd.tseries.offsets.BDay(2)
        me = t[nxt.dt.month != t.date.dt.month]
        rest = t[nxt.dt.month == t.date.dt.month]
        print(f"  {pair}: month-end {me.r.mean():+5.2f} t{tstat(me.r):+4.1f} n={len(me)}"
              f" | other days {rest.r.mean():+5.2f} t{tstat(rest.r):+4.1f} n={len(rest)}")

    print("\n4) only trade when |13:00->15:45 move| >= its rolling 50th pct")
    for pair, d in frames.items():
        t = fixrev(d, pair, zmin=0.5)
        tr, te = split(t)
        print(f"  {pair}: train {tr.mean():+5.2f} t{tstat(tr):+5.1f} n={len(tr)} | "
              f"TEST {te.mean():+5.2f} t{tstat(te):+5.1f} n={len(te)}")

    print("\n5) portfolio: both pairs, risk-normalized (vol-scaled to 10bps/day tgt)")
    port = both["eurusd"].merge(both["gbpusd"], on="date", how="outer",
                                suffixes=("_e", "_g"))
    port["r"] = port[["r_e", "r_g"]].mean(axis=1)
    port = port.sort_values("date")
    full = port.dropna(subset=["r"])
    sd20 = full.r.rolling(60).std().shift(1)
    full = full.assign(rn=(full.r / sd20 * 6).clip(-60, 60)).dropna()
    ann = full.rn.mean() * 252
    sharpe = full.rn.mean() / full.rn.std() * np.sqrt(252)
    eq = (1 + full.rn / 1e4).cumprod()
    dd = (eq / eq.cummax() - 1).min() * 100
    print(f"  full-period: {ann:.0f} bps/yr | Sharpe {sharpe:.2f} | maxDD {dd:.2f}% "
          f"(at ~6bps/day risk)")
    tr, te = split(full.rename(columns={"rn": "rr"}).assign(r=lambda x: x.rr))
    print(f"  train Sharpe {tr.mean()/tr.std()*np.sqrt(252):+5.2f} | "
          f"test Sharpe {te.mean()/te.std()*np.sqrt(252):+5.2f}")

    # correlation vs the DOW book (daily strategy returns, Mon/Wed only)
    dow = []
    for pair, d in frames.items():
        day = window(d, 15, 21 * 60 + 45)          # 00:15 -> 21:45 London
        day["r"] = np.where(day.wd == 0, day.r, np.where(day.wd == 2, -day.r, np.nan))
        dow.append(day[["r"]].rename(columns={"r": pair}))
    dowb = dow[0].join(dow[1], how="inner").mean(axis=1).dropna().rename("dow")
    m = full.set_index("date")[["rn"]].join(dowb, how="inner").dropna()
    print(f"  corr(fix-reversal, DOW book) on shared days: "
          f"{np.corrcoef(m.rn, m.dow)[0, 1]:+.2f}  (n={len(m)})")
