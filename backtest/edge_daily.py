"""Edge search, family C+E: daily momentum / mean-reversion / calendar flows.

Instruments: EURUSD+GBPUSD daily bars built from the 5-min data (full 2023-26,
22:00-London close = 5pm NY), plus the EOD files for USDJPY/USDCHF/USDCAD/
AUDUSD/NZDUSD (2023-26), gold and QQQ.

Tests (per instrument, TRAIN 2023-01..2025-03, TEST 2025-04..2026-07):
  C1 time-series momentum: sign(past N-day ret) -> hold next day, N in
     {1,2,3,5,10,20}. 6 lookbacks x 2 signs x 9 instruments = 108 hypotheses ->
     shortlist needs |t|>=3 AND coherence across the risk-FX cluster.
  C2 weekly momentum: sign(past 5d) -> hold next 5d (non-overlap, Mon-Mon).
  E1 turn-of-month: hold USD-short (risk-pair-long) the last 2 + first 2
     trading days of each month (documented month-end rebalancing flow).
  E2 cross-sectional: each Monday rank 7 USD pairs by past-week USD-adjusted
     return; long strongest currency vs USD, short weakest, hold 1 week.
Costs: per-pair round-trip spread as before.
"""
import os

import numpy as np
import pandas as pd

DATA = os.path.join(os.path.dirname(__file__), "data")
TRAIN = (pd.Timestamp("2023-01-01"), pd.Timestamp("2025-04-01"))
TEST = (pd.Timestamp("2025-04-01"), pd.Timestamp("2026-07-21"))

# instrument -> (file, usd_side, cost bps round trip)
INSTR = {
    "EURUSD": (None, "quote", 0.55), "GBPUSD": (None, "quote", 0.63),
    "AUDUSD": ("audusd_eod.csv", "quote", 1.15), "NZDUSD": ("nzdusd_eod.csv", "quote", 2.0),
    "USDJPY": ("usdjpy_eod.csv", "base", 0.55), "USDCHF": ("usdchf_eod.csv", "base", 1.5),
    "USDCAD": ("usdcad_eod.csv", "base", 0.9), "GOLD": ("gold_eod.csv", "quote", 0.75),
    "NAS100": ("qqq_eod.csv", "quote", 0.75),
}


def daily_from_m5(pair):
    d = pd.read_parquet(f"{DATA}/{pair}_m5_utc.parquet")
    ldn = d["london"]
    # FX day: close at 22:00 London. Assign bars after 22:00 to next day.
    day = ldn.dt.tz_localize(None).dt.normalize() + pd.to_timedelta(
        (ldn.dt.hour >= 22).astype(int), unit="D")
    g = d.groupby(day.values).agg(open=("open", "first"), high=("high", "max"),
                                  low=("low", "min"), close=("close", "last"),
                                  n=("close", "size"))
    g.index = pd.DatetimeIndex(g.index, name="date")
    g = g[(g.index.dayofweek < 5) & (g.n > 100)]
    return g.reset_index()[["date", "open", "high", "low", "close"]]


def load_eod(f):
    d = pd.read_csv(f"{DATA}/{f}", parse_dates=["date"])
    return (d.drop_duplicates("date").sort_values("date")
             .reset_index(drop=True)[["date", "open", "high", "low", "close"]])


def tstat(x):
    x = np.asarray(x, float)
    return x.mean() / (x.std(ddof=1) / np.sqrt(len(x))) if len(x) > 1 else 0.0


def split(t):
    tr = t[(t.date >= TRAIN[0]) & (t.date < TRAIN[1])]["r"]
    te = t[(t.date >= TEST[0]) & (t.date < TEST[1])]["r"]
    return tr, te


def load_all():
    out = {}
    for name, (f, side, cost) in INSTR.items():
        d = daily_from_m5(name.lower()) if f is None else load_eod(f)
        d["ret"] = (d.close / d.close.shift(1) - 1) * 1e4      # c2c bps
        out[name] = (d, side, cost)
    return out


def c1_tsmom(all_d):
    print("\n[C1] time-series momentum: sign(past N-day) -> next day, net bps/day")
    print(f"{'instr':<8}" + "".join(f"{'N='+str(n):>16}" for n in (1, 2, 3, 5, 10, 20)))
    shortlist = []
    for name, (d, side, cost) in all_d.items():
        line = f"{name:<8}"
        for n in (1, 2, 3, 5, 10, 20):
            d2 = d.copy()
            d2["sig"] = np.sign(d2.close.pct_change(n)).shift(1)
            d2["r"] = d2.sig * d2.ret - cost
            tr, te = split(d2.dropna(subset=["r"]))
            t = tstat(tr)
            line += f"{tr.mean():+7.2f}(t{t:+4.1f})"
            if abs(t) >= 3:
                shortlist.append((name, n, np.sign(tr.mean()), tr, te))
        print(line)
    return shortlist


def c2_weekly(all_d):
    print("\n[C2] weekly momentum (past 5d -> next 5d, non-overlapping), net bps/wk")
    shortlist = []
    for name, (d, side, cost) in all_d.items():
        d2 = d.copy()
        d2["wk"] = d2.date.dt.to_period("W")
        w = d2.groupby("wk").agg(date=("date", "first"), close=("close", "last"))
        w["ret"] = (w.close / w.close.shift(1) - 1) * 1e4
        w["r"] = np.sign(w.ret.shift(1)) * w.ret - cost
        tr, te = split(w.dropna(subset=["r"]))
        t = tstat(tr)
        flag = ""
        if abs(t) >= 2.5:
            shortlist.append((name, "wk", np.sign(tr.mean()), tr, te))
            flag = "  <- shortlist"
        print(f"  {name:<8} train {tr.mean():+7.1f}bps/wk t{t:+5.1f} n={len(tr)}{flag}")
    return shortlist


def e1_turn_of_month(all_d):
    print("\n[E1] turn-of-month, short-USD window (last 2 + first 2 trading days), net bps/day")
    shortlist = []
    for name, (d, side, cost) in all_d.items():
        d2 = d.copy().reset_index(drop=True)
        d2["m"] = d2.date.dt.to_period("M")
        pos_in = d2.groupby("m").cumcount()
        size = d2.groupby("m")["date"].transform("size")
        tom = (pos_in < 2) | (pos_in >= size - 2)
        sgn = 1 if side == "quote" else -1          # short USD
        d2["r"] = np.where(tom, sgn * d2.ret, np.nan) - cost / 4
        tr, te = split(d2.dropna(subset=["r"]))
        t = tstat(tr)
        flag = ""
        if abs(t) >= 2.5:
            shortlist.append((name, "tom", np.sign(tr.mean()), tr, te))
            flag = "  <- shortlist"
        print(f"  {name:<8} train {tr.mean():+7.2f}bps/d t{t:+5.1f} n={len(tr)}{flag}")
    return shortlist


def e2_xsec(all_d):
    print("\n[E2] cross-sectional weekly FX momentum (long best ccy, short worst)")
    # weekly USD-adjusted currency returns: +ret for quote pairs, -ret for base
    wk = {}
    for name, (d, side, cost) in all_d.items():
        if name in ("GOLD", "NAS100"):
            continue
        d2 = d.copy()
        d2["wk"] = d2.date.dt.to_period("W")
        w = d2.groupby("wk").agg(date=("date", "first"), close=("close", "last"))
        r = (w.close / w.close.shift(1) - 1) * 1e4
        wk[name] = r if side == "quote" else -r
    m = pd.DataFrame(wk).dropna(how="any")
    rows = []
    for i in range(1, len(m) - 1):
        past, nxt = m.iloc[i], m.iloc[i + 1]
        best, worst = past.idxmax(), past.idxmin()
        cost = (INSTR[best][2] + INSTR[worst][2]) / 2
        rows.append((m.index[i + 1].start_time, (nxt[best] - nxt[worst]) / 2 - cost))
    t = pd.DataFrame(rows, columns=["date", "r"])
    tr, te = split(t)
    print(f"  mom:  train {tr.mean():+7.1f}bps/wk t{tstat(tr):+5.1f} n={len(tr)} | "
          f"(reversal = mirror)")
    return [("XSEC", "wk", 1, tr, te)] if abs(tstat(tr)) >= 2.5 else []


if __name__ == "__main__":
    all_d = load_all()
    for name, (d, side, cost) in all_d.items():
        print(f"{name:<8} {len(d):>5} days  {d.date.min().date()} -> {d.date.max().date()}")
    sl = c1_tsmom(all_d) + c2_weekly(all_d) + e1_turn_of_month(all_d) + e2_xsec(all_d)
    print("\n" + "=" * 80)
    print("SHORTLIST -> TEST (one look, sign fixed from train):")
    if not sl:
        print("  (nothing reached the shortlist bar)")
    for name, spec, sgn, tr, te in sl:
        net = sgn * te
        print(f"  {name} {spec}: train {sgn*tr.mean():+.2f} t{tstat(sgn*tr):+.1f} | "
              f"TEST {net.mean():+.2f} t{tstat(net):+.1f} n={len(net)}")
