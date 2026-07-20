"""Edge search, family D: news-conditioned strategies (US NFP / CPI / Fed).

Events from backtest/data/us_news_high.csv (FMP calendar, UTC timestamps,
actual + estimate = true surprise). Price = 5-min EURUSD/GBPUSD (UTC).

Strategies (per pair; decisions made on POOLED events for power, per-type
shown for colour):
  D1 reaction momentum: sign of the first 15 min after release -> enter at
     +15 min, hold {1h, 4h, to 21:45 London}.
  D2 surprise direction: sign(actual-estimate) mapped to USD direction
     (good-for-USD surprise -> short EURUSD/GBPUSD), enter +5 min,
     hold {1h, 4h, to 21:45}.
  D3 reaction reversal: mirror of D1 (counted, not separately mined).
TRAIN/TEST split as elsewhere (2023-01..2025-03 / 2025-04..2026-07).
Cost charged per round trip. Slippage on news bars is real; entries are
15 min after the print when spreads have mostly normalised — still, treat
sub-1.5 bps results as not tradeable.

USD-direction convention for surprises:
  NFP: higher = USD+ ; CPI MoM: higher = USD+ (hawkish) ; Fed: higher = USD+.
"""
import os

import numpy as np
import pandas as pd

DATA = os.path.join(os.path.dirname(__file__), "data")
TRAIN = (pd.Timestamp("2023-01-01", tz="UTC"), pd.Timestamp("2025-04-01", tz="UTC"))
TEST = (pd.Timestamp("2025-04-01", tz="UTC"), pd.Timestamp("2026-07-21", tz="UTC"))
COST_BPS = {"eurusd": 0.55, "gbpusd": 0.63}
EVENTS = {"NFP": "Non Farm Payrolls", "CPI": "Inflation Rate MoM",
          "FED": "Fed Interest Rate Decision"}


def load_events():
    d = pd.read_csv(f"{DATA}/us_news_high.csv", parse_dates=["date"])
    d["date"] = d["date"].dt.tz_localize("UTC")
    out = []
    for tag, name in EVENTS.items():
        e = d[d.event.str.startswith(name)].copy()
        e["surprise"] = e["actual"] - e["estimate"]
        sd = e["surprise"].std()
        e["z"] = e["surprise"] / sd if sd and sd > 0 else 0.0
        out.append(e[["date", "surprise", "z"]].assign(kind=tag))
    ev = pd.concat(out).sort_values("date").reset_index(drop=True)
    return ev


def load_px(pair):
    d = pd.read_parquet(f"{DATA}/{pair}_m5_utc.parquet")
    d = d[~d.index.duplicated()]
    return d


def px_at(d, ts):
    """Close of the last bar that CLOSED at or before ts (bar label = open)."""
    i = d.index.searchsorted(ts - pd.Timedelta(minutes=5), side="right") - 1
    if i < 0 or i >= len(d):
        return None, None
    if ts - d.index[i] > pd.Timedelta(hours=3):
        return None, None
    return d["close"].iloc[i], d.index[i]


def eod_ts(ts):
    """21:45 London of the event's London day."""
    ldn = ts.tz_convert("Europe/London")
    return ldn.normalize() + pd.Timedelta(hours=21, minutes=45)


def tstat(x):
    x = np.asarray(x, float)
    return x.mean() / (x.std(ddof=1) / np.sqrt(len(x))) if len(x) > 1 else 0.0


def run(pair):
    d = load_px(pair)
    ev = load_events()
    cost = COST_BPS[pair]
    trades = []
    for _, e in ev.iterrows():
        t0 = e.date
        p_pre, _ = px_at(d, t0)                       # close just before release
        p15, _ = px_at(d, t0 + pd.Timedelta(minutes=15))
        if p_pre is None or p15 is None:
            continue
        react = (p15 / p_pre - 1) * 1e4               # first-15-min move, bps
        exits = {"1h": t0 + pd.Timedelta(minutes=75),
                 "4h": t0 + pd.Timedelta(hours=4, minutes=15),
                 "eod": eod_ts(t0).tz_convert("UTC")}
        for hname, tx in exits.items():
            p_out, _ = px_at(d, tx)
            if p_out is None or tx <= t0 + pd.Timedelta(minutes=15):
                continue
            fwd = (p_out / p15 - 1) * 1e4             # from +15min entry
            trades.append({"date": t0, "kind": e.kind, "hold": hname,
                           "react": react, "z": e.z, "fwd": fwd})
    t = pd.DataFrame(trades)

    print(f"\n{'='*90}\n{pair.upper()}  (cost {cost} bps/round trip; entry +15 min after print)")
    for strat in ("D1 reaction-momentum", "D2 surprise-direction"):
        print(f"\n  {strat}")
        for hold in ("1h", "4h", "eod"):
            s = t[t.hold == hold].copy()
            if strat.startswith("D1"):
                s = s[s.react.abs() > 1e-9]
                s["r"] = np.sign(s.react) * s.fwd - cost
            else:
                s = s[s.z.abs() > 1e-9]
                s["r"] = -np.sign(s.z) * s.fwd - cost   # USD+ surprise -> short pair
            tr = s[(s.date >= TRAIN[0]) & (s.date < TRAIN[1])]
            te = s[(s.date >= TEST[0]) & (s.date < TEST[1])]
            bykind = "  ".join(
                f"{k}:{g.r.mean():+5.1f}(n{len(g)})" for k, g in tr.groupby("kind"))
            print(f"    hold {hold:<4} POOLED train {tr.r.mean():+6.2f}bps "
                  f"t{tstat(tr.r):+5.1f} n={len(tr)}   [{bykind}]")
            if abs(tstat(tr.r)) >= 2.5:
                sgn = np.sign(tr.r.mean())
                print(f"      -> SHORTLIST, TEST: {sgn*te.r.mean():+6.2f}bps "
                      f"t{tstat(sgn*te.r):+5.1f} n={len(te)}")
    return t


if __name__ == "__main__":
    for pair in ("eurusd", "gbpusd"):
        run(pair)
    print("\nhypothesis ledger: 2 strategies x 3 holds x 2 pairs = 12 (pooled decisions);"
          "\nper-type numbers are descriptive only.")
