"""Cross-asset conditioning of the DOW edge — the one genuinely new information
source reachable on this data plan.

Every hypothesis tested previously (~290 of them) used only the FX pair's OWN
price history. This uses VIX: an external measure of risk appetite. The DOW edge
IS a risk-on/risk-off effect (long risk-FX Monday, short Wednesday), so the
economic question is whether the effect depends on the prevailing risk regime.

Overfitting control — this is the most dangerous analysis in the project, since
a known-good strategy plus a free search for filters always yields something:
  * hypotheses are PRE-REGISTERED below and counted, not grid-searched
  * thresholds are the EXPANDING median of VIX (no optimised cut-offs, no
    lookahead), not a tuned number
  * TRAIN 2023-01 -> 2025-03, TEST 2025-04 -> 2026-08 (read once)
  * a survivor must work on BOTH pairs, not just the one that carries it
  * VIX is lagged to the last close STRICTLY before entry (Fri close for a
    Monday 00:15 London entry, Tue close for Wednesday)

PRE-REGISTERED HYPOTHESES (6 total, each with its economic rationale):
  H1  calm-only        : trade only when VIX < expanding median.
                         Rationale: in stress, panic/deleveraging flow swamps a
                         weekly seasonal.
  H2  stress-only      : the mirror of H1 (stated so H1 isn't a free 2-sided bet)
  H3  Mon needs calm   : take the Monday LONG only when VIX < median
                         (long risk-FX should need risk appetite)
  H4  Wed needs stress : take the Wednesday SHORT only when VIX >= median
                         (short risk-FX / long USD should need risk coming off)
  H5  VIX falling      : trade only when VIX fell over the prior 5 sessions
  H6  asymmetric combo : H3 and H4 together (Mon in calm, Wed in stress)
"""
import json
import os
import sys

import numpy as np
import pandas as pd

DATA = os.path.join(os.path.dirname(os.path.abspath(__file__)), "data")
TR = "/root/.claude/projects/-home-user-amarah/1350fd41-cc26-5ee6-88f6-d711025cef0e/tool-results"
SRC = {"EURUSD": f"{TR}/mcp-FMP-commodity-1787514005328.txt",
       "GBPUSD": f"{TR}/mcp-FMP-commodity-1787514013415.txt"}
TRAIN = (pd.Timestamp("2023-01-01"), pd.Timestamp("2025-04-01"))
TEST = (pd.Timestamp("2025-04-01"), pd.Timestamp("2026-08-22"))
RISK, K_ATR = 0.005, 1.5
COST_PIPS = {"EURUSD": 0.6, "GBPUSD": 0.8}
PIP = 0.0001
SIDE = {0: "BUY", 2: "SELL"}


def load_fx(pair):
    cache = f"{DATA}/{pair.lower()}_full_eod.csv"
    if not os.path.exists(cache):
        d = pd.DataFrame(json.load(open(SRC[pair])))
        d["date"] = pd.to_datetime(d["date"])
        d = d.drop_duplicates("date").sort_values("date")
        d[["date", "open", "high", "low", "close"]].to_csv(cache, index=False)
    d = pd.read_csv(cache, parse_dates=["date"])
    d = d[d.date.dt.dayofweek < 5].sort_values("date").reset_index(drop=True)
    pc = d.close.shift(1)
    tr = pd.concat([d.high - d.low, (d.high - pc).abs(), (d.low - pc).abs()],
                   axis=1).max(axis=1)
    d["atr"] = tr.rolling(14).mean().shift(1)
    return d


def dow_trades(pair):
    d, cost = load_fx(pair), COST_PIPS[pair] * PIP
    out = []
    for _, r in d.iterrows():
        wd = r.date.dayofweek
        if wd not in SIDE or not np.isfinite(r.atr) or r.atr <= 0:
            continue
        sd = K_ATR * r.atr
        if SIDE[wd] == "BUY":
            hit = r.low <= r.open - sd
            px = (r.open - sd) if hit else r.close
            gross = px - r.open
        else:
            hit = r.high >= r.open + sd
            px = (r.open + sd) if hit else r.close
            gross = r.open - px
        out.append({"date": r.date, "sym": pair, "wd": wd,
                    "r": (gross - cost) / sd * RISK, "stopped": bool(hit)})
    return pd.DataFrame(out)


def build():
    t = pd.concat([dow_trades(p) for p in ("EURUSD", "GBPUSD")])
    v = pd.read_csv(f"{DATA}/vix_eod.csv", parse_dates=["date"]).sort_values("date")
    v["med"] = v.close.expanding(60).median().shift(1)      # no lookahead
    v["chg5"] = v.close - v.close.shift(5)
    # lag: last VIX close STRICTLY before the trade date
    v = v.rename(columns={"close": "vix"})[["date", "vix", "med", "chg5"]]
    t = pd.merge_asof(t.sort_values("date"), v, on="date",
                      allow_exact_matches=False, direction="backward")
    return t.dropna(subset=["vix", "med"]).reset_index(drop=True)


def tstat(x):
    x = np.asarray(x, float)
    return x.mean() / (x.std(ddof=1) / np.sqrt(len(x))) if len(x) > 1 else 0.0


def stats(t):
    if not len(t):
        return 0.0, 0.0, 0, 0.0
    tot = ((1 + t.r).prod() - 1) * 100
    sharpe = t.r.mean() / t.r.std(ddof=1) * np.sqrt(8.7 * 12) if t.r.std() else 0
    return tot, tstat(t.r), len(t), sharpe


def report(t, name, mask):
    sel = t[mask]
    rows = []
    for lbl, lo, hi in (("TRAIN", *TRAIN), ("TEST", *TEST)):
        s = sel[(sel.date >= lo) & (sel.date < hi)]
        rows.append(stats(s))
    (trt, trtt, trn, trs), (tet, tett, ten, tes) = rows
    both = all(len(sel[(sel.sym == p)]) > 20 for p in ("EURUSD", "GBPUSD"))
    per = {p: stats(sel[sel.sym == p])[1] for p in ("EURUSD", "GBPUSD")}
    print(f"  {name:<22} TRAIN {trt:+7.1f}% t{trtt:+5.1f} n={trn:<4} Sh{trs:+5.2f}"
          f" | TEST {tet:+7.1f}% t{tett:+5.1f} n={ten:<4} Sh{tes:+5.2f}"
          f" | perpair t: EUR{per['EURUSD']:+4.1f} GBP{per['GBPUSD']:+4.1f}")


if __name__ == "__main__":
    t = build()
    print(f"trades {len(t)}  {t.date.min().date()} -> {t.date.max().date()}   "
          f"VIX lagged to last close before entry\n")
    print("Baseline and 6 PRE-REGISTERED cross-asset conditions "
          "(Sh = annualised Sharpe):")
    report(t, "BASELINE (all days)", t.index == t.index)
    report(t, "H1 calm only", t.vix < t.med)
    report(t, "H2 stress only", t.vix >= t.med)
    report(t, "H3 Mon needs calm", ~((t.wd == 0) & (t.vix >= t.med)))
    report(t, "H4 Wed needs stress", ~((t.wd == 2) & (t.vix < t.med)))
    report(t, "H5 VIX falling", t.chg5 < 0)
    report(t, "H6 asym combo (H3+H4)",
           ~(((t.wd == 0) & (t.vix >= t.med)) | ((t.wd == 2) & (t.vix < t.med))))

    print("\nSanity: is any effect just a few outlier days? "
          "mean |r| of days each filter REMOVES:")
    for nm, m in (("H1", t.vix < t.med), ("H6", ~(((t.wd == 0) & (t.vix >= t.med)) |
                                                  ((t.wd == 2) & (t.vix < t.med))))):
        drop = t[~m]
        print(f"  {nm}: drops {len(drop)} trades, mean {drop.r.mean()*100:+.3f}%, "
              f"of which stop-outs {drop.stopped.mean()*100:.0f}%")
    print("\nhypothesis ledger: 6 pre-registered conditions, 1 baseline, 2 pairs "
          "checked separately. Bonferroni bar for 6 tests ~ |t| > 2.6.")


# ---------------------------------------------------------------- round 2
def round2():
    """4 further PRE-REGISTERED conditioners from the other orthogonal data
    actually available: gold (haven demand / real-rate proxy) and the breadth of
    the USD move across the 7-pair cross-section (is the dollar moving broadly,
    or is this pair idiosyncratic?).

      H7  gold falling  : trade only when gold fell over 5 sessions
                          (falling gold ~ USD firm / haven demand easing)
      H8  gold rising   : mirror of H7
      H9  USD broad     : trade only when >=5 of 7 pairs moved the same USD way
                          over the prior 5 days (broad dollar trend in force)
      H10 USD mixed     : mirror of H9 (no clear dollar trend)
    """
    t = build()
    g = pd.read_csv(f"{DATA}/gold_eod.csv", parse_dates=["date"]).sort_values("date")
    g["gchg5"] = g.close - g.close.shift(5)
    t = pd.merge_asof(t.sort_values("date"), g[["date", "gchg5"]], on="date",
                      allow_exact_matches=False, direction="backward")

    # USD breadth across the 7-pair cross-section
    legs = {"eurusd": 1, "gbpusd": 1, "audusd": 1, "nzdusd": 1,
            "usdjpy": -1, "usdchf": -1, "usdcad": -1}      # +1 = USD is quote
    br = None
    for f, sgn in legs.items():
        d = pd.read_csv(f"{DATA}/{f}_eod.csv", parse_dates=["date"]).sort_values("date")
        s = np.sign(d.close.pct_change(5)) * sgn           # + = USD weaker
        cur = pd.DataFrame({"date": d.date, f: s})
        br = cur if br is None else br.merge(cur, on="date", how="outer")
    br = br.sort_values("date")
    br["agree"] = br[list(legs)].sum(axis=1).abs()          # 7 = unanimous
    t = pd.merge_asof(t, br[["date", "agree"]], on="date",
                      allow_exact_matches=False, direction="backward")
    t = t.dropna(subset=["gchg5", "agree"])

    print("\nRound 2 — gold and cross-sectional USD breadth (4 more hypotheses):")
    report(t, "BASELINE (same rows)", t.index == t.index)
    report(t, "H7 gold falling", t.gchg5 < 0)
    report(t, "H8 gold rising", t.gchg5 >= 0)
    report(t, "H9 USD trend broad", t.agree >= 5)
    report(t, "H10 USD trend mixed", t.agree < 5)
    print("\nledger now: 10 pre-registered conditions. Bonferroni bar ~ |t| > 2.8.")


if __name__ == "__main__":
    round2()
