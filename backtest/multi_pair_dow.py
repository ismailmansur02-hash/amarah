"""Day-of-week USD effect across 7 pairs, aligned by USD direction.

Hypothesis: USD tends to be WEAK Monday, STRONG Wednesday. Express that per pair:
  USD-quote pairs (EURUSD, GBPUSD, AUDUSD, NZDUSD): Mon LONG pair / Wed SHORT.
  USD-base  pairs (USDJPY, USDCHF, USDCAD):         Mon SHORT pair / Wed LONG.
Both encode: short USD Monday, long USD Wednesday.

Daily EOD open->close (the day's move), realistic per-pair cost. Tests whether
the edge GENERALISES out-of-sample to instruments it was never derived on.
"""
import glob
import json
import os

import numpy as np
import pandas as pd

TR = ("/root/.claude/projects/-home-user-amarah/"
      "1350fd41-cc26-5ee6-88f6-d711025cef0e/tool-results")
DATA = os.path.join(os.path.dirname(__file__), "data")

# symbol -> (tool-result id or None if already saved, usd_side, spread_pips, pip)
NEW = {
    "USDJPY": ("1784186130104", "base", 0.8, 0.01),
    "AUDUSD": ("1784186130084", "quote", 0.8, 0.0001),
    "USDCHF": ("1784186131741", "base", 1.2, 0.0001),
    "USDCAD": ("1784186132582", "base", 1.2, 0.0001),
    "NZDUSD": ("1784186133370", "quote", 1.2, 0.0001),
}
EXIST = {  # already in repo from earlier
    "EURUSD": ("quote", 0.6, 0.0001),
    "GBPUSD": ("quote", 0.8, 0.0001),
}


def save_new():
    for sym, (fid, *_ ) in NEW.items():
        rows = json.load(open(f"{TR}/mcp-FMP-forex-{fid}.txt"))
        d = pd.DataFrame(rows)[["symbol", "date", "open", "high", "low", "close", "volume"]]
        d.to_csv(f"{DATA}/{sym.lower()}_eod.csv", index=False)


def load(sym):
    d = pd.read_csv(f"{DATA}/{sym.lower()}_eod.csv")
    d["date"] = pd.to_datetime(d["date"])
    return d.sort_values("date").reset_index(drop=True)


def pair_returns(sym, usd_side, spread_pips, pip):
    d = load(sym)
    d["wd"] = d["date"].dt.dayofweek
    d["o2c"] = (d["close"] / d["open"] - 1) * 100
    cost = spread_pips * pip / d["close"] * 100
    # USD-weak-Monday / USD-strong-Wednesday, translated to pair direction
    if usd_side == "quote":       # long pair = short USD
        mon_dir, wed_dir = +1, -1
    else:                         # USD base: short pair = short USD
        mon_dir, wed_dir = -1, +1
    rows = []
    for _, r in d.iterrows():
        if r.wd == 0:
            rows.append((r.date, mon_dir * r.o2c - cost.loc[_] if False else mon_dir * r.o2c))
        elif r.wd == 2:
            rows.append((r.date, wed_dir * r.o2c))
    t = pd.DataFrame(rows, columns=["date", "gross"])
    # subtract cost properly (cost is tiny, ~0.005%); recompute per row
    c = spread_pips * pip / d.set_index("date")["close"]
    t["r"] = t["gross"] - (c.reindex(t["date"]).values * 100)
    return t[["date", "r"]]


def tstat(x):
    x = np.asarray(x, float)
    return x.mean() / (x.std(ddof=1) / np.sqrt(len(x))) if len(x) > 1 else 0.0


def stats(t, a, b):
    s = t[(t.date >= a) & (t.date < b)]
    if len(s) < 2:
        return None
    comp = ((1 + s.r / 100).prod() - 1) * 100
    return comp, tstat(s.r), len(s), (s.r > 0).mean() * 100


if __name__ == "__main__":
    save_new()
    pairs = {**{k: v for k, v in EXIST.items()},
             **{k: (v[1], v[2], v[3]) for k, v in NEW.items()}}
    spans = {"2023": ("2023-01-01", "2024-01-01"), "2024": ("2024-01-01", "2025-01-01"),
             "2025": ("2025-01-01", "2026-01-01"), "2026": ("2026-01-01", "2026-07-20"),
             "25+26": ("2025-01-01", "2026-07-20")}
    print("Day-of-week USD effect, per pair, aligned by USD direction (short USD Mon / long USD Wed)")
    print("=" * 90)
    print(f"{'pair':<8}{'usd':<7}" + "".join(f"{y:>13}" for y in spans))
    allr = {}
    for sym, (side, sp, pip) in pairs.items():
        t = pair_returns(sym, side, sp, pip)
        allr[sym] = t
        line = f"{sym:<8}{side:<7}"
        for y, (a, b) in spans.items():
            r = stats(t, pd.Timestamp(a), pd.Timestamp(b))
            line += f"{r[0]:>+7.1f}%(t{r[1]:>4.1f})" if r else f"{'-':>13}"
        print(line)
    print("\n(each cell: total return % (t-stat) for that pair/period; t>2 ~ significant)")
