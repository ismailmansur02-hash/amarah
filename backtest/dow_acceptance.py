"""DOW-BOT acceptance backtest — the EXACT live rules, both pairs, all data.

Reproduces the spec (bot/DOW_BOT_SPEC.md) faithfully:
  - Mon LONG / Wed SHORT, EURUSD + GBPUSD.
  - Entry 00:15 London, time-exit 21:45 London (pre-rollover, no swap).
  - Protective stop = K_ATR x ATR14(daily), checked intrabar on 5-min bars.
  - Risk RISK_PER_PAIR of a $100k USD account per pair (0.5% default).
  - Costs: per-pair round-trip spread in price terms.
  - Both pairs on ONE account; monthly + per-year returns and max drawdown.

Data:
  EURUSD 5-min = FMP (America/New_York)  -> backtest/data/eurusd_m5.parquet
  GBPUSD 5-min = FTMO   (EET/EEST)       -> backtest/data/gbpusd_m5_ftmo.parquet
Both converted to Europe/London for the London-time clock.

NOTE: the news/red-day filter is NOT applied here (no historical calendar in
repo). Its effect is to REMOVE a handful of red days (e.g. FOMC Wednesdays);
document separately. Results here are therefore a slight lower bound on the
filtered strategy's win-rate quality.
"""
import os
import sys

import numpy as np
import pandas as pd

DATA = os.path.join(os.path.dirname(__file__), "data")
CONTRACT = 100_000
BAL0 = 100_000.0
K_ATR = 1.5
RISK_PER_PAIR = 0.005          # 0.5% of balance per pair
ENTRY_LON, EXIT_LON = 0.25, 21.75   # 00:15, 21:45 London (hours)
COST_PIPS = {"EURUSD": 0.6, "GBPUSD": 0.8}   # round-trip, pips


def to_london(df, src):
    if src == "NY":
        t = df["time"].dt.tz_localize("America/New_York").dt.tz_convert("Europe/London")
    else:  # FTMO EET/EEST == London + 2h exactly (both EU DST)
        t = df["dt"] - pd.Timedelta(hours=2)
    out = pd.DataFrame({"lon": pd.DatetimeIndex(t).tz_localize(None) if hasattr(t, "dt") else t,
                        "open": df["open"].values, "high": df["high"].values,
                        "low": df["low"].values, "close": df["close"].values})
    return out.sort_values("lon").reset_index(drop=True)


def load_pairs():
    e = pd.read_parquet(f"{DATA}/eurusd_m5.parquet").rename(columns={"time_ny": "time"})
    eur = to_london(e, "NY")
    g = pd.read_parquet(f"{DATA}/gbpusd_m5_ftmo.parquet")
    gbp = to_london(g, "FTMO")
    return {"EURUSD": eur, "GBPUSD": gbp}


def daily_atr(df):
    df = df.copy()
    df["day"] = df["lon"].dt.normalize()
    d = df.groupby("day").agg(h=("high", "max"), l=("low", "min"),
                              c=("close", "last")).dropna()
    pc = d["c"].shift(1)
    tr = pd.concat([d.h - d.l, (d.h - pc).abs(), (d.l - pc).abs()], axis=1).max(axis=1)
    atr = tr.rolling(14).mean().shift(1)      # prior-days only (no look-ahead)
    return atr


def pair_trades(df, side_by_wd):
    df = df.copy()
    df["day"] = df["lon"].dt.normalize()
    df["wd"] = df["lon"].dt.dayofweek
    df["hm"] = df["lon"].dt.hour + df["lon"].dt.minute / 60.0
    atr = daily_atr(df)
    win = df[(df.hm >= ENTRY_LON) & (df.hm < EXIT_LON)]
    trades = []
    for day, g in win.groupby("day"):
        wd = g["wd"].iloc[0]
        if wd not in side_by_wd:
            continue
        a = atr.get(pd.Timestamp(day), np.nan)
        if not np.isfinite(a) or a <= 0:
            continue
        side = side_by_wd[wd]
        entry = g["open"].iloc[0]
        stop_dist = K_ATR * a
        if side == "BUY":
            stop_px = entry - stop_dist
            hit = (g["low"] <= stop_px).any()
            exit_px = stop_px if hit else g["close"].iloc[-1]
            gross = exit_px - entry
        else:
            stop_px = entry + stop_dist
            hit = (g["high"] >= stop_px).any()
            exit_px = stop_px if hit else g["close"].iloc[-1]
            gross = entry - exit_px
        trades.append((pd.Timestamp(day), side, entry, exit_px, stop_dist, gross, hit))
    t = pd.DataFrame(trades, columns=["day", "side", "entry", "exit", "stop_dist",
                                      "gross", "stopped"])
    return t


def run(pairs, risk=RISK_PER_PAIR, start=None, end=None):
    side = {0: "BUY", 2: "SELL"}
    all_tr = []
    for sym, df in pairs.items():
        t = pair_trades(df, side)
        pip = 0.0001
        cost_price = COST_PIPS[sym] * pip
        # account return per trade = (net price move / stop_dist) * risk
        t["net"] = t["gross"] - cost_price
        t["r"] = (t["net"] / t["stop_dist"]) * risk
        t["sym"] = sym
        all_tr.append(t)
    tr = pd.concat(all_tr).sort_values("day").reset_index(drop=True)
    if start is not None:
        tr = tr[tr.day >= start]
    if end is not None:
        tr = tr[tr.day < end]
    # one account, compounding
    bal = BAL0
    eq = [BAL0]
    for r in tr["r"]:
        bal *= (1 + r)
        eq.append(bal)
    tr["bal"] = eq[1:]
    return tr


def report(tr, label):
    eq = pd.concat([pd.Series([BAL0]), tr["bal"]], ignore_index=True)
    dd = (eq / eq.cummax() - 1).min() * 100
    m = tr.set_index("day")["r"].resample("ME").apply(lambda s: ((1 + s).prod() - 1) * 100)
    total = (tr["bal"].iloc[-1] / BAL0 - 1) * 100
    print(f"\n=== {label} ===")
    print(f"trades {len(tr)}  win {(tr.r>0).mean()*100:.0f}%  stopped {tr.stopped.mean()*100:.0f}%  "
          f"total {total:+.1f}%  maxDD {dd:.1f}%")
    print(f"avg/mo {m.mean():+.2f}%  median {m.median():+.2f}%  "
          f">=+0.5%: {(m>=0.5).sum()}/{len(m)}  >=+1.0%: {(m>=1.0).sum()}/{len(m)}  "
          f"neg months {(m<0).sum()}/{len(m)}")
    return m


if __name__ == "__main__":
    pairs = load_pairs()
    print(f"EURUSD bars {len(pairs['EURUSD'])}, GBPUSD bars {len(pairs['GBPUSD'])}")
    for risk in (0.005, 0.0075, 0.010):
        tr = run(pairs, risk=risk)
        m = report(tr, f"BOTH pairs, risk {risk*100:.2f}%/pair, ALL data 2023-2026")
        by = tr.assign(yr=tr.day.dt.year).groupby("yr")
        for yr, g in by:
            eqy = pd.concat([pd.Series([BAL0]), g["bal"]], ignore_index=True)
            my = g.set_index("day")["r"].resample("ME").apply(lambda s: ((1+s).prod()-1)*100)
            gt = ((1+g["r"]).prod()-1)*100
            print(f"    {yr}: total {gt:+6.1f}%  avg/mo {my.mean():+.2f}%  "
                  f">=0.5:{(my>=0.5).sum()}/{len(my)}")
