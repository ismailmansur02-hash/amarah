"""Day-of-week test on GOLD, GBPJPY, and NASDAQ-100 — final OOS audit (Jul 2026).

Same hypothesis and method as multi_pair_dow.py: USD weak Monday / strong
Wednesday, risk-on Monday / risk-off Wednesday. Direction per instrument:
  GOLD  (GCUSD ~ XAUUSD): anti-USD           -> Mon LONG / Wed SHORT
  GBPJPY (cross, no USD): risk vs haven      -> Mon LONG / Wed SHORT
  NAS100 (QQQ ~ NDX):     USD risk asset     -> Mon LONG / Wed SHORT

Data notes (honest caveats):
  - Gold = GCUSD front-month futures (tracks XAUUSD spot ~1:1 on daily moves).
  - GBPJPY is BUILT from the repo's GBPUSD x USDJPY EOD files. Open/close of a
    cross are exact products of the legs; intraday high/low are NOT derivable,
    so GBPJPY gets no intrabar stop simulation. Coverage starts Oct 2024
    (limited by the GBPUSD file).
  - NASDAQ = QQQ daily bars (cash session 14:30-21:00 London). Open->close only
    covers the cash session; close->close (21:00->21:00 London) is closer to
    the bot's 00:15->21:45 CFD window. Both are reported.

Two passes:
  1) Raw edge test: signed open->close return minus spread cost; t-stats.
  2) Risk-normalized sim: 0.5% risk per trade, stop 1.5 x ATR14(daily),
     stop-hit checked against the day's high/low (gold, QQQ only).
"""
import json
import os

import numpy as np
import pandas as pd

TR = ("/root/.claude/projects/-home-user-amarah/"
      "1350fd41-cc26-5ee6-88f6-d711025cef0e/tool-results")
DATA = os.path.join(os.path.dirname(__file__), "data")

SPANS = {"2023": ("2023-01-01", "2024-01-01"), "2024": ("2024-01-01", "2025-01-01"),
         "2025": ("2025-01-01", "2026-01-01"), "2026": ("2026-01-01", "2026-07-21"),
         "25+26": ("2025-01-01", "2026-07-21")}


def save_sources():
    if not os.path.exists(f"{DATA}/gold_eod.csv"):
        g = pd.DataFrame(json.load(open(f"{TR}/mcp-FMP-commodity-1784580223458.txt")))
        g[["symbol", "date", "open", "high", "low", "close", "volume"]].to_csv(
            f"{DATA}/gold_eod.csv", index=False)
    if not os.path.exists(f"{DATA}/qqq_eod.csv"):
        q = pd.DataFrame(json.load(open(f"{TR}/mcp-FMP-technicalIndicators-1784580293901.txt")))
        q["symbol"] = "QQQ"
        q["date"] = pd.to_datetime(q["date"]).dt.strftime("%Y-%m-%d")
        q[["symbol", "date", "open", "high", "low", "close", "volume"]].to_csv(
            f"{DATA}/qqq_eod.csv", index=False)


def load(name):
    d = pd.read_csv(f"{DATA}/{name}_eod.csv")
    d["date"] = pd.to_datetime(d["date"])
    return d.drop_duplicates("date").sort_values("date").reset_index(drop=True)


def build_gbpjpy():
    g, j = load("gbpusd"), load("usdjpy")
    m = g.merge(j, on="date", suffixes=("_g", "_j"))
    d = pd.DataFrame({"date": m["date"],
                      "open": m["open_g"] * m["open_j"],
                      "close": m["close_g"] * m["close_j"]})
    # legs' extremes bound the cross but don't equal it -> no true high/low
    d["high"] = np.nan
    d["low"] = np.nan
    return d.sort_values("date").reset_index(drop=True)


def tstat(x):
    x = np.asarray(x, float)
    return x.mean() / (x.std(ddof=1) / np.sqrt(len(x))) if len(x) > 1 else 0.0


def raw_edge(d, cost_pct, c2c=False):
    d = d.copy()
    d["wd"] = d["date"].dt.dayofweek
    if c2c:
        d["ret"] = (d["close"] / d["close"].shift(1) - 1) * 100
    else:
        d["ret"] = (d["close"] / d["open"] - 1) * 100
    d["dir"] = np.where(d.wd == 0, 1, np.where(d.wd == 2, -1, 0))
    t = d[d["dir"] != 0].dropna(subset=["ret"])
    return pd.DataFrame({"date": t["date"], "r": t["dir"] * t["ret"] - cost_pct})


def atr14(d):
    pc = d["close"].shift(1)
    tr = pd.concat([d["high"] - d["low"], (d["high"] - pc).abs(),
                    (d["low"] - pc).abs()], axis=1).max(axis=1)
    return tr.rolling(14).mean().shift(1)          # yesterday's ATR only


def risk_sim(d, cost_pct, risk=0.5, atr_mult=1.5):
    """0.5% risk per trade, stop atr_mult x ATR14 from entry, exit at close."""
    d = d.copy()
    d["atr"] = atr14(d)
    d["wd"] = d["date"].dt.dayofweek
    rows, stops = [], 0
    for _, r in d.dropna(subset=["atr"]).iterrows():
        sgn = 1 if r.wd == 0 else (-1 if r.wd == 2 else 0)
        if sgn == 0 or r.atr <= 0:
            continue
        stop_dist = atr_mult * r.atr
        hit = (r.low <= r.open - stop_dist) if sgn > 0 else (r.high >= r.open + stop_dist)
        if hit:
            pnl, stops = -risk, stops + 1
        else:
            pnl = sgn * (r.close - r.open) / stop_dist * risk
        stop_pct = stop_dist / r.open * 100          # stop distance as % of price
        rows.append((r.date, pnl - cost_pct / stop_pct * risk))
    t = pd.DataFrame(rows, columns=["date", "r"])
    return t, stops


def span_stats(t, a, b):
    s = t[(t.date >= pd.Timestamp(a)) & (t.date < pd.Timestamp(b))]
    if len(s) < 2:
        return None
    comp = ((1 + s.r / 100).prod() - 1) * 100
    return comp, tstat(s.r), len(s), (s.r > 0).mean() * 100


def maxdd(r):
    eq = (1 + r / 100).cumprod()
    return ((eq / eq.cummax() - 1).min()) * 100


if __name__ == "__main__":
    save_sources()
    gold, qqq, gj = load("gold"), load("qqq"), build_gbpjpy()
    eur, gbp = load("eurusd"), load("gbpusd")

    # instrument -> (frame, cost % of price per round trip, label)
    runs = [
        ("GOLD (XAU)",  raw_edge(gold, 0.25 / gold["close"].mean() * 100)),
        ("GBPJPY",      raw_edge(gj,   0.02 / gj["close"].mean() * 100)),
        ("NAS100 o->c", raw_edge(qqq,  0.0075)),
        ("NAS100 c->c", raw_edge(qqq,  0.0075, c2c=True)),
        ("EURUSD ref",  raw_edge(eur,  0.6 * 0.0001 / eur["close"].mean() * 100)),
        ("GBPUSD ref",  raw_edge(gbp,  0.8 * 0.0001 / gbp["close"].mean() * 100)),
    ]

    print("PASS 1 - raw day-of-week edge (Mon LONG / Wed SHORT, open->close - cost)")
    print("=" * 100)
    print(f"{'instrument':<14}" + "".join(f"{y:>17}" for y in SPANS))
    for name, t in runs:
        line = f"{name:<14}"
        for y, (a, b) in SPANS.items():
            r = span_stats(t, a, b)
            line += f"{r[0]:>+8.1f}%(t{r[1]:>+4.1f})" if r else f"{'-':>17}"
        print(line)
    print("(cell: compounded % (t-stat). t>2 ~ real. GBPJPY starts Oct-24; NAS100 c->c ~ CFD window)")

    print("\nPASS 2 - risk-normalized sim: 0.5% risk/trade, stop 1.5xATR14 (real OHLC only)")
    print("=" * 100)
    print(f"{'instrument':<14}{'span':<9}{'return':>9}{'maxDD':>8}{'t':>6}{'n':>6}"
          f"{'win%':>7}{'stops':>7}{'%/mo':>7}")
    for name, frame in [("GOLD (XAU)", gold), ("NAS100 (QQQ)", qqq)]:
        cost = (0.25 / frame["close"].mean() * 100) if name.startswith("GOLD") else 0.0075
        t, stops = risk_sim(frame, cost)
        for span in ("2024", "25+26"):
            a, b = SPANS[span]
            s = t[(t.date >= pd.Timestamp(a)) & (t.date < pd.Timestamp(b))]
            months = (pd.Timestamp(b) - pd.Timestamp(a)).days / 30.44
            comp = ((1 + s.r / 100).prod() - 1) * 100
            nstop = sum(1 for x in s.r if abs(x + 0.5) < 0.02)
            print(f"{name:<14}{span:<9}{comp:>+8.1f}%{maxdd(s.r):>+7.1f}%"
                  f"{tstat(s.r):>6.1f}{len(s):>6}{(s.r > 0).mean() * 100:>6.0f}%"
                  f"{nstop:>7}{comp / months:>+6.2f}%")

    # correlation with the existing EUR+GBP book (daily strategy returns)
    print("\nCorrelation of daily strategy returns vs the live EURUSD+GBPUSD book (25+26):")
    book = runs[4][1].merge(runs[5][1], on="date", suffixes=("_e", "_g"))
    book["r"] = (book["r_e"] + book["r_g"]) / 2
    for name, t in runs[:4]:
        m = book[["date", "r"]].merge(t, on="date", suffixes=("_book", "_x"))
        m = m[m.date >= pd.Timestamp("2025-01-01")]
        if len(m) > 10:
            print(f"  {name:<14} corr = {np.corrcoef(m.r_book, m.r_x)[0, 1]:+.2f}   (n={len(m)})")
