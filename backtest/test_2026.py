"""Everything, on 2026 data only — the current live spec under a microscope.

HONESTY NOTE, up front: 2026 sat INSIDE the test window (2025-04 -> 2026-07) used
to pick the noon exit. So a good 2026 result here is partly circular and is NOT
independent validation. It is a characterisation of how the adopted spec behaves
in the most recent regime. The genuinely clean check is the demo forward test.

5-minute data ends 2026-07-14 (EURUSD) / 07-15 (GBPUSD), so "2026" = Jan 1 ->
mid-July, ~6.5 months. The noon exit cannot be extended past that without
intraday data (daily bars cannot produce a 12:00 exit).

Tests:
  1. new spec vs old spec, 2026 only
  2. month by month, per pair
  3. news filter applied
  4. tail risk: worst day, worst week, longest losing run
  5. cost sensitivity (spread 0.6 -> 3.0 pips)
  6. prop-challenge simulation driven by the 2026 return distribution only
"""
import os
import sys

import numpy as np
import pandas as pd

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from dow_acceptance import load_pairs, pair_trades, daily_atr, COST_PIPS, BAL0  # noqa

DATA = os.path.join(os.path.dirname(os.path.abspath(__file__)), "data")
Y0, Y1 = pd.Timestamp("2026-01-01"), pd.Timestamp("2026-12-31")
SIDE = {0: "BUY", 2: "SELL"}


def run_spec(pairs, exit_lon, risk, cost_mult=1.0, start=Y0, end=Y1):
    """Exact engine with a configurable exit clock and risk."""
    out = []
    for sym, df in pairs.items():
        d = df.copy()
        d["day"] = d["lon"].dt.normalize()
        d["wd"] = d["lon"].dt.dayofweek
        d["hm"] = d["lon"].dt.hour + d["lon"].dt.minute / 60.0
        atr = daily_atr(d)
        win = d[(d.hm >= 0.25) & (d.hm < exit_lon)]
        for day, g in win.groupby("day"):
            wd = g["wd"].iloc[0]
            if wd not in SIDE or not (start <= day <= end):
                continue
            a = atr.get(pd.Timestamp(day), np.nan)
            if not np.isfinite(a) or a <= 0 or len(g) < 6:
                continue
            side, e, sd = SIDE[wd], g["open"].iloc[0], 1.5 * a
            if side == "BUY":
                hit = (g["low"] <= e - sd).any()
                px = (e - sd) if hit else g["close"].iloc[-1]
                gross = px - e
            else:
                hit = (g["high"] >= e + sd).any()
                px = (e + sd) if hit else g["close"].iloc[-1]
                gross = e - px
            cost = COST_PIPS[sym] * 1e-4 * cost_mult
            out.append({"day": pd.Timestamp(day), "sym": sym, "side": side,
                        "stopped": bool(hit), "r": (gross - cost) / sd * risk})
    return pd.DataFrame(out).sort_values("day").reset_index(drop=True)


def eq_stats(t):
    if not len(t):
        return None
    day = t.groupby("day").r.apply(lambda s: (1 + s).prod() - 1).sort_index()
    eq = (1 + day).cumprod()
    dd = (eq / eq.cummax() - 1).min() * 100
    tot = (eq.iloc[-1] - 1) * 100
    months = (day.index[-1] - day.index[0]).days / 30.44
    return dict(tot=tot, dd=dd, n=len(t), win=(t.r > 0).mean() * 100,
                stop=t.stopped.mean() * 100, permo=tot / months,
                worst_day=day.min() * 100, day=day, months=months)


def news_set():
    red = set()
    for f in ("us_news_high.csv", "news_2026_h2_manual.csv"):
        p = f"{DATA}/{f}"
        if os.path.exists(p):
            red |= set(pd.read_csv(p, parse_dates=["date"]).date.dt.normalize())
    return red


if __name__ == "__main__":
    pairs = load_pairs()
    NEW, OLD = 12.0, 21.75

    print("=" * 78)
    print("1) 2026 ONLY — adopted spec vs the old one")
    print(f"   {'spec':<28}{'total':>8}{'maxDD':>8}{'/mo':>8}{'win':>6}"
          f"{'stops':>7}{'n':>5}")
    res = {}
    for lbl, ex, rk in (("OLD  21:45 @0.50%/pair", OLD, 0.005),
                        ("NEW  12:00 @0.75%/pair", NEW, 0.0075),
                        ("  (new clock, old size)", NEW, 0.005)):
        t = run_spec(pairs, ex, rk)
        s = eq_stats(t)
        res[lbl] = (t, s)
        print(f"   {lbl:<28}{s['tot']:>+7.2f}%{s['dd']:>7.2f}%{s['permo']:>+7.2f}%"
              f"{s['win']:>5.0f}%{s['stop']:>6.1f}%{s['n']:>5}")

    t_new, s_new = res["NEW  12:00 @0.75%/pair"]

    print("\n2) month by month (adopted spec) and per pair")
    m = t_new.set_index("day").r.resample("ME").apply(lambda s: ((1 + s).prod() - 1) * 100)
    print("   " + "  ".join(f"{d.strftime('%b')}:{v:+.2f}%" for d, v in m.items()))
    print(f"   positive months {int((m > 0).sum())}/{len(m)}")
    for p in ("EURUSD", "GBPUSD"):
        sp = t_new[t_new.sym == p]
        tt = sp.r.mean() / (sp.r.std(ddof=1) / np.sqrt(len(sp)))
        print(f"   {p}: {((1+sp.r).prod()-1)*100:+6.2f}%  win {(sp.r>0).mean()*100:.0f}%"
              f"  t={tt:+.1f}  n={len(sp)}")

    print("\n3) news filter (calendar authoritative through 2026-07-17)")
    red = news_set()
    kept = t_new[~t_new.day.isin(red)]
    sk = eq_stats(kept)
    print(f"   raw      {s_new['tot']:+6.2f}%  maxDD {s_new['dd']:+.2f}%  n={s_new['n']}")
    print(f"   filtered {sk['tot']:+6.2f}%  maxDD {sk['dd']:+.2f}%  n={sk['n']}"
          f"  ({s_new['n']-sk['n']} trades skipped on red days)")

    print("\n4) tail risk (adopted spec)")
    day = s_new["day"]
    wk = day.resample("W").apply(lambda s: (1 + s).prod() - 1) * 100
    streak = mx = 0
    for v in day:
        streak = streak + 1 if v < 0 else 0
        mx = max(mx, streak)
    print(f"   worst day {day.min()*100:+.2f}%   worst week {wk.min():+.2f}%"
          f"   longest losing run {mx} trading days")
    print(f"   days beyond -1%: {(day < -0.01).sum()}   beyond -1.5%: {(day < -0.015).sum()}")
    print(f"   vs the live guards: DAILY_HALT -2%, MAX_DD_HALT -8% -> "
          f"{'NEITHER would have fired' if day.min()*100 > -2 and s_new['dd'] > -8 else 'A HALT WOULD HAVE FIRED'}")

    print("\n5) cost sensitivity (2026, adopted spec)")
    print(f"   {'assumed spread':<18}{'total':>9}{'/mo':>9}")
    for mult, lbl in ((1.0, "0.6/0.8 (base)"), (1.7, "1.0/1.4"), (2.5, "1.5/2.0"),
                      (4.0, "2.4/3.2")):
        s = eq_stats(run_spec(pairs, NEW, 0.0075, cost_mult=mult))
        print(f"   {lbl:<18}{s['tot']:>+8.2f}%{s['permo']:>+8.2f}%")

    print("\n6) prop challenge on the 2026 distribution ONLY (bootstrap, 3000 runs)")
    rng = np.random.default_rng(11)
    v = day.values
    for tgt, floor, nm in ((0.10, 0.10, "FTMO-style  +10% / -10%"),
                           (0.10, 0.12, "FundingPips +10% / -12% static")):
        for mult, ml in ((1.0, "as configured 0.75%/pair"), (1.34, "1.0%/pair")):
            outs = []
            for _ in range(3000):
                eq, d = 1.0, 0
                while d < 400:
                    eq *= 1 + mult * v[rng.integers(len(v))]
                    d += 1
                    if eq <= 1 - floor:
                        outs.append(("fail", d)); break
                    if eq >= 1 + tgt:
                        outs.append(("pass", d)); break
                else:
                    outs.append(("open", d))
            o = pd.DataFrame(outs, columns=["res", "d"])
            p = o[o.res == "pass"]
            dpm = len(v) / s_new["months"]
            med = p.d.median() / dpm if len(p) else np.nan
            print(f"   {nm} @{ml:<24} pass {o.res.eq('pass').mean()*100:3.0f}%  "
                  f"fail {o.res.eq('fail').mean()*100:3.0f}%  median {med:4.1f} months")
