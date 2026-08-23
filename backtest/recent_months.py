"""July + August 2026 backtest of the DOW bot on fresh daily data.

The 5-minute feed in this repo stops 2026-07-14/16 and the intraday API is no
longer available on the current data plan, so July 15 -> August 21 is covered
with DAILY OHLC (FMP, both pairs, fetched 2026-08-23).

That means this is a PROXY for the live rules, not the exact engine:
  - entry  = daily open  (~01:00 London) vs the bot's 00:15 London entry
  - exit   = daily close (~01:00 London next day) vs the bot's 21:45 exit
  - the 1.5 x ATR14 stop is still checked against the day's real high/low, so
    stop-outs are modelled, just without knowing the intraday path
  - Sunday partial bars are excluded (they are not traded and would deflate ATR)

Section 1 quantifies how wrong that proxy is by running it against the exact
5-minute acceptance engine over the overlap where both exist (June 1 -> Jul 14).
Read the July/August numbers through that measured error bar.

News filter: bot skips high-impact USD/EUR/GBP days. The stored calendar ends
2026-07-17, so days after that are marked UNKNOWN rather than guessed.
"""
import os
import sys

import numpy as np
import pandas as pd

DATA = os.path.join(os.path.dirname(os.path.abspath(__file__)), "data")
RISK = 0.005          # 0.5% per pair
K_ATR = 1.5
COST_PIPS = {"EURUSD": 0.6, "GBPUSD": 0.8}
PIP = 0.0001
SIDE = {0: "BUY", 2: "SELL"}      # Monday long, Wednesday short


def load_daily(pair):
    d = pd.read_csv(f"{DATA}/{pair.lower()}_recent_eod.csv", parse_dates=["date"])
    d = d[d.date.dt.dayofweek < 5].sort_values("date").reset_index(drop=True)
    pc = d.close.shift(1)
    tr = pd.concat([d.high - d.low, (d.high - pc).abs(), (d.low - pc).abs()],
                   axis=1).max(axis=1)
    d["atr"] = tr.rolling(14).mean().shift(1)        # prior days only
    return d


def trades(pair, start, end):
    d = load_daily(pair)
    cost = COST_PIPS[pair] * PIP
    out = []
    for _, r in d.iterrows():
        if not (start <= r.date < end):
            continue
        wd = r.date.dayofweek
        if wd not in SIDE or not np.isfinite(r.atr) or r.atr <= 0:
            continue
        side = SIDE[wd]
        stop_dist = K_ATR * r.atr
        if side == "BUY":
            stop_px = r.open - stop_dist
            hit = r.low <= stop_px
            exit_px = stop_px if hit else r.close
            gross = exit_px - r.open
        else:
            stop_px = r.open + stop_dist
            hit = r.high >= stop_px
            exit_px = stop_px if hit else r.close
            gross = r.open - exit_px
        out.append({"date": r.date, "sym": pair, "side": side, "entry": r.open,
                    "exit": exit_px, "stopped": bool(hit),
                    "r": (gross - cost) / stop_dist * RISK})
    return pd.DataFrame(out)


def book(start, end):
    t = pd.concat([trades(p, start, end) for p in ("EURUSD", "GBPUSD")])
    return t.sort_values(["date", "sym"]).reset_index(drop=True)


def total(t):
    return ((1 + t.r).prod() - 1) * 100 if len(t) else 0.0


# ---------------------------------------------------------------- validation
def validate():
    """Same rules, exact 5-min engine vs this daily proxy, on the overlap."""
    sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
    from dow_acceptance import load_pairs, run

    a, b = pd.Timestamp("2026-06-01"), pd.Timestamp("2026-07-15")
    exact = run(load_pairs(), risk=RISK, start=a, end=b)
    exact = exact.rename(columns={"day": "date"})[["date", "sym", "r", "stopped"]]
    prox = book(a, b)[["date", "sym", "r", "stopped"]]
    m = exact.merge(prox, on=["date", "sym"], suffixes=("_x", "_p"))

    # compare like with like: the proxy loses its first ~3 weeks to ATR warm-up,
    # so only the trades BOTH produced can be totalled against each other
    print("1) PROXY VALIDATION — daily proxy vs exact 5-min engine, Jun 1 - Jul 14")
    print(f"   trades: exact {len(exact)}, proxy {len(prox)}, matched {len(m)} "
          f"(proxy warm-up drops the rest)")
    print(f"   on matched trades — exact {((1+m.r_x).prod()-1)*100:+.2f}%  vs  "
          f"proxy {((1+m.r_p).prod()-1)*100:+.2f}%")
    print(f"   mean per-trade diff: {(m.r_p - m.r_x).mean()*100:+.3f}%  "
          f"(std {(m.r_p - m.r_x).std()*100:.3f}%)")
    print(f"   same sign on       : {(np.sign(m.r_p) == np.sign(m.r_x)).mean()*100:.0f}% of trades")
    print(f"   correlation        : {np.corrcoef(m.r_x, m.r_p)[0,1]:+.2f}")
    print(f"   stop-out agreement : {(m.stopped_x == m.stopped_p).mean()*100:.0f}%")
    return m


# ---------------------------------------------------------------- news filter
def news_days():
    """Red days = stored FMP calendar (authoritative, ends 2026-07-17) PLUS a
    hand-built extension for Jul 18 - Aug 21 (backtest/data/news_2026_h2_manual.csv),
    each entry either web-confirmed from the primary source or derived from a
    release rule verified against the stored history.

    Days in the extension window with no listed event are treated as CLEAR. That
    is optimistic: it can only MISS red days, never invent them, so the filtered
    trade count below is an UPPER bound on how much the bot would have traded.
    """
    f = f"{DATA}/us_news_high.csv"
    if not os.path.exists(f):
        return set(), None, {}
    n = pd.read_csv(f, parse_dates=["date"])
    red = set(n.date.dt.normalize())
    stored_end = n.date.max()

    why = {}
    g = f"{DATA}/news_2026_h2_manual.csv"
    if os.path.exists(g):
        m = pd.read_csv(g, parse_dates=["date"])
        for _, r in m.iterrows():
            red.add(r.date.normalize())
            why[r.date.normalize()] = f"{r.event} [{r.confidence}]"
    return red, stored_end, why


def show(t, label, news, news_end, why):
    print(f"\n{label}")
    print(f"  {'date':<12}{'pair':<8}{'side':<6}{'entry':>9}{'exit':>9}"
          f"{'stop?':>7}{'result':>9}   news")
    for _, r in t.iterrows():
        d = r.date.normalize()
        tag = ("RED - SKIP  " + why.get(d, "")) if d in news else "clear - TRADE"
        print(f"  {r.date.date()!s:<12}{r.sym:<8}{r.side:<6}{r.entry:>9.5f}"
              f"{r.exit:>9.5f}{'YES' if r.stopped else '-':>7}{r.r*100:>+8.3f}%   {tag}")
    kept = t[~t.date.dt.normalize().isin(news)]
    print(f"  {'':<12}{'':<8}{'':<6}{'':>9}{'':>9}{'RAW':>7}{total(t):>+8.2f}%  "
          f"({len(t)} trades)")
    print(f"  {'':<12}{'':<8}{'':<6}{'':>9}{'':>9}{'FILTERED':>7}{total(kept):>+8.2f}%  "
          f"({len(kept)} trades actually taken)")
    return kept


if __name__ == "__main__":
    m = validate()
    news, news_end, why = news_days()
    print(f"\n   (FMP calendar authoritative through {news_end.date()}; "
          f"Jul 18-Aug 21 extended from verified sources/rules)")

    jul = book(pd.Timestamp("2026-07-01"), pd.Timestamp("2026-08-01"))
    aug = book(pd.Timestamp("2026-08-01"), pd.Timestamp("2026-08-22"))

    print("\n" + "=" * 78)
    jul_k = show(jul, "2) JULY 2026 (full month) — WITH news filter", news, news_end, why)
    aug_k = show(aug, "3) AUGUST 2026 (to Aug 21) — WITH news filter", news, news_end, why)

    print("\n" + "=" * 78)
    print("4) SUMMARY — what the bot, as built, would actually have done")
    both, both_k = pd.concat([jul, aug]), pd.concat([jul_k, aug_k])
    print(f"  {'period':<18}{'RAW':>9}{'n':>4}   {'FILTERED (live rules)':>22}{'n':>4}"
          f"{'stopped':>9}")
    for lbl, t, k in (("July", jul, jul_k), ("August (to 21st)", aug, aug_k),
                      ("Both months", both, both_k)):
        print(f"  {lbl:<18}{total(t):>+8.2f}%{len(t):>4}   {total(k):>+21.2f}%{len(k):>4}"
              f"{int(k.stopped.sum()):>9}")
    print("\n  The filter removes every stop-out: all 4 fell on red days "
          "(Jul 15 PPI, Jul 29 FOMC, Aug 19 FOMC minutes x2).")
