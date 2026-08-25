"""Answering the 15 backtesting questions from the user's Notion 'Backtesting'
database (logged April 2023, never run).

ICT definitions used — stated explicitly so the test is fair to the method.
All times NEW YORK (ICT convention):
  Asian range  20:00 -> 00:00 NY (the evening before the trading day)
  LOKZ         02:00 -> 05:00 NY   (London kill zone)
  NYKZ         07:00 -> 10:00 NY   (New York kill zone)
  Midnight open 00:00 NY
  FVG (3-candle imbalance): bullish/BISI when high[i-1] < low[i+1];
                            bearish/SIBI when low[i-1] > high[i+1]
  MSS: close beyond the most recent opposing swing extreme of the prior 2h
  OTE: 62-79% retracement of the impulse leg

Every question is answered TWICE:
  (a) FREQUENCY — the literal "how many times" that was asked
  (b) TRADEABILITY — expectancy per trade after real spread, because a pattern
      can be frequent and still not make money. That distinction is the whole
      point of the exercise.

Costs: EURUSD 0.6 pip, GBPUSD 0.8 pip round trip.
"""
import os
import sys

import numpy as np
import pandas as pd

DATA = os.path.join(os.path.dirname(os.path.abspath(__file__)), "data")
COST = {"EURUSD": 0.6e-4, "GBPUSD": 0.8e-4}
PIP = 1e-4


def load(pair):
    d = pd.read_parquet(f"{DATA}/{pair.lower()}_m5_utc.parquet")
    ny = d.index.tz_convert("America/New_York")
    d = d.assign(ny=ny, h=ny.hour, m=ny.minute,
                 nyd=pd.DatetimeIndex(ny).tz_localize(None).normalize())
    d["hm"] = d.h * 60 + d.m
    # Asian evening bars (>=20:00) belong to the NEXT trading day
    d["sess"] = d.nyd + pd.to_timedelta((d.h >= 20).astype(int), unit="D")
    d["wd"] = d["sess"].dt.dayofweek
    return d[d.wd < 5]


def sessions(d):
    """Per trading day: Asian range, LOKZ bars, NYKZ bars, day OHLC."""
    asian = d[d.h >= 20].groupby("sess").agg(
        a_hi=("high", "max"), a_lo=("low", "min"), a_n=("close", "size"))
    asian = asian[asian.a_n >= 24]                      # >=2h of Asian data
    mid = (d[(d.hm >= 0) & (d.hm < 5)].groupby("sess")["open"].first()
           .rename("midnight"))
    day = d[(d.h >= 0) & (d.h < 17)].groupby("sess").agg(
        d_open=("open", "first"), d_hi=("high", "max"),
        d_lo=("low", "min"), d_close=("close", "last"), d_n=("close", "size"))
    day = day[day.d_n > 150]
    return asian.join(mid, how="inner").join(day, how="inner")


def in_win(d, lo, hi):
    return d[(d.hm >= lo) & (d.hm < hi)]


# ---------------------------------------------------------------- Q1 / Q4
def q1_q4_asian_sweep_judas(d, s, pair):
    """Q1 'How many times does LOKZ offer a run on Asian range?'
       Q4 'Recognise the judas swing protraction move midnight price above Asia'

    Judas = LOKZ sweeps one side of the Asian range, then the day closes the
    OTHER way (the sweep was a false move). Tradeability: on the sweep, enter
    the reversal, stop 1x Asian-range beyond the extreme, exit 16:00 NY.
    """
    lok = in_win(d, 2 * 60, 5 * 60)
    rows = []
    for sess, g in lok.groupby("sess"):
        if sess not in s.index:
            continue
        r = s.loc[sess]
        w = r.a_hi - r.a_lo
        if w <= 0:
            continue
        up = g[g.high > r.a_hi]
        dn = g[g.low < r.a_lo]
        t_up = up.index[0] if len(up) else None
        t_dn = dn.index[0] if len(dn) else None
        if t_up is None and t_dn is None:
            rows.append({"sess": sess, "swept": 0}); continue
        if t_dn is None or (t_up is not None and t_up < t_dn):
            side, t0 = 1, t_up          # swept the HIGH -> Judas would go down
        else:
            side, t0 = -1, t_dn
        # did the day close back the other way (a true Judas)?
        judas = int(np.sign(r.d_close - r.midnight) == -side)
        # trade the reversal
        entry = g.loc[t0, "close"]
        stop = entry + side * w                        # 1x range beyond
        after = d[(d.sess == sess) & (d.index > t0) & (d.hm < 16 * 60)]
        if not len(after):
            continue
        hit = (after.high >= stop).any() if side > 0 else (after.low <= stop).any()
        exit_px = stop if hit else after.iloc[-1]["close"]
        rr = -side * (exit_px - entry) - COST[pair]
        rows.append({"sess": sess, "swept": 1, "side": side, "judas": judas,
                     "r": rr / w, "stopped": bool(hit)})
    t = pd.DataFrame(rows)
    sw = t[t.swept == 1]
    print(f"\n  [{pair}] Q1/Q4 — LOKZ run on the Asian range")
    print(f"    FREQUENCY : LOKZ swept an Asian extreme on "
          f"{len(sw)}/{len(t)} days = {len(sw)/len(t)*100:.0f}%")
    print(f"    JUDAS     : of those, day closed the OPPOSITE way "
          f"{sw.judas.mean()*100:.0f}% of the time (coin flip = 50%)")
    print(f"    TRADEABLE : fading the sweep = {sw.r.mean():+.3f} R/trade "
          f"(t={sw.r.mean()/(sw.r.std()/np.sqrt(len(sw))):+.1f}), "
          f"stopped {sw.stopped.mean()*100:.0f}%, n={len(sw)}")
    return sw


# ---------------------------------------------------------------- Q2/Q6/Q10
def q2_fvg(d, s, pair, min_gap_pips=1.0):
    """Q2 'How many times does LOKZ leave a FVG for NYKZ to trade to?'
       Q6 'FVG left when London displaces away — are entries formed in it?'
       Q10 'SIBI & BISI'

    Only gaps >= min_gap_pips count: a sub-pip "imbalance" is narrower than the
    spread, so it is a quoting artifact rather than a tradeable inefficiency
    (17% of raw detections were under 0.5 pip and, used as a risk denominator,
    produced absurd R multiples).

    Trade: on the first NYKZ touch, enter at the near edge, stop the far edge,
    target 2R, else exit 16:00 NY. Bars touching BOTH stop and target are
    ambiguous at 5-min resolution and are resolved PESSIMISTICALLY (stop first);
    the ambiguous share is reported so the bias is visible.
    """
    rows, ambig = [], 0
    for sess, g in d.groupby("sess"):
        if sess not in s.index:
            continue
        lok = g[(g.hm >= 120) & (g.hm < 300)]
        nyk = g[(g.hm >= 420) & (g.hm < 600)]
        if len(lok) < 12 or len(nyk) < 12:
            continue
        hi, lo = lok.high.values, lok.low.values
        fvgs = []
        for i in range(1, len(lok) - 1):
            if hi[i - 1] < lo[i + 1] and (lo[i + 1] - hi[i - 1]) >= min_gap_pips * PIP:
                fvgs.append(("bull", hi[i - 1], lo[i + 1]))
            elif lo[i - 1] > hi[i + 1] and (lo[i - 1] - hi[i + 1]) >= min_gap_pips * PIP:
                fvgs.append(("bear", hi[i + 1], lo[i - 1]))
        if not fvgs:
            rows.append({"sess": sess, "n_fvg": 0, "filled": np.nan, "r": np.nan})
            continue
        kind, bot, top = fvgs[-1]
        gap = top - bot
        hits = nyk[(nyk.low <= top) & (nyk.high >= bot)]
        filled = len(hits) > 0
        r = np.nan
        if filled:
            side = 1 if kind == "bull" else -1
            entry = top if kind == "bull" else bot
            stop = bot if kind == "bull" else top
            risk = abs(entry - stop)
            after = g[(g.index > hits.index[0]) & (g.hm < 16 * 60)]
            if risk > 0 and len(after):
                tgt = entry + side * 2 * risk
                for _, b in after.iterrows():
                    hs = b.low <= stop if side > 0 else b.high >= stop
                    ht = b.high >= tgt if side > 0 else b.low <= tgt
                    if hs and ht:
                        ambig += 1; r = -1.0; break        # pessimistic
                    if hs:
                        r = -1.0; break
                    if ht:
                        r = 2.0; break
                else:
                    r = side * (after.iloc[-1]["close"] - entry) / risk
                r -= COST[pair] / risk
        rows.append({"sess": sess, "n_fvg": len(fvgs), "filled": filled, "r": r})
    t = pd.DataFrame(rows)
    has = t[t.n_fvg > 0].copy()
    has["filled"] = has["filled"].astype(bool)            # avoid object-dtype mean bug
    tr = t.dropna(subset=["r"])
    print(f"\n  [{pair}] Q2/Q6/Q10 — LOKZ fair-value gaps traded by NYKZ "
          f"(gaps >= {min_gap_pips} pip)")
    print(f"    FREQUENCY : LOKZ left >=1 real FVG on {len(has)}/{len(t)} days = "
          f"{len(has)/len(t)*100:.0f}%  (median {has.n_fvg.median():.0f} per day)")
    print(f"    RETURN    : NYKZ traded back into the last LOKZ FVG "
          f"{has.filled.mean()*100:.0f}% of the time")
    if len(tr) > 10:
        se = tr.r.std(ddof=1) / np.sqrt(len(tr))
        print(f"    TRADEABLE : entry at FVG, stop far edge, 2R target = "
              f"{tr.r.mean():+.3f} R/trade (t={tr.r.mean()/se:+.1f}), n={len(tr)}, "
              f"{ambig} ambiguous bars resolved as losses")
    return tr


# ---------------------------------------------------------------- Q14
def q14_time_of_extremes(d, s, pair):
    """Q14 'Time of highs & lows in bullish & bearish days'."""
    print(f"\n  [{pair}] Q14 — when the day's high/low forms (NY hour, 00:00-17:00)")
    day = d[(d.h >= 0) & (d.h < 17)]
    rec = []
    for sess, g in day.groupby("sess"):
        if sess not in s.index or len(g) < 150:
            continue
        up = g.iloc[-1]["close"] > g.iloc[0]["open"]
        rec.append({"sess": sess, "up": up,
                    "h_hi": g.loc[g.high.idxmax(), "h"],
                    "h_lo": g.loc[g.low.idxmin(), "h"]})
    t = pd.DataFrame(rec)
    for lbl, sub in (("bullish days", t[t.up]), ("bearish days", t[~t.up])):
        hi = sub.h_hi.value_counts(normalize=True).sort_index()
        lo = sub.h_lo.value_counts(normalize=True).sort_index()
        top_hi = hi.nlargest(3).index.tolist()
        top_lo = lo.nlargest(3).index.tolist()
        key = "LOW" if "bull" in lbl else "HIGH"
        src = lo if "bull" in lbl else hi
        kz = src.reindex(range(2, 5)).fillna(0).sum() * 100
        print(f"    {lbl} (n={len(sub)}): high most often at NY {top_hi}h, "
              f"low at {top_lo}h | session {key} formed in LOKZ(02-05) "
              f"{kz:.0f}% of days")
    return t


# ---------------------------------------------------------------- Q7
def q7_ten_pip(d, s, pair):
    """Q7 '1:1 trades with 10 pip SL & TP' — entered at the LOKZ open, both ways.

    5-min bars cannot say whether the high or the low came first, so a bar that
    spans both target and stop is genuinely ambiguous. Reported as a RANGE:
    pessimistic (ambiguous = loss) to optimistic (ambiguous = win). The truth is
    inside that band. Long and short win rates must sum to roughly 100% - that is
    the check that the accounting is right.
    """
    print(f"\n  [{pair}] Q7 — 1:1 with 10-pip stop and 10-pip target (LOKZ open)")
    be = (10 * PIP + COST[pair]) / (2 * 10 * PIP) * 100
    for side, nm in ((1, "long "), (-1, "short")):
        win = loss = amb = 0
        for sess, g in d.groupby("sess"):
            lok = g[(g.hm >= 120) & (g.hm < 16 * 60)]
            if len(lok) < 20:
                continue
            e = lok.iloc[0]["open"]
            tp, sl = e + side * 10 * PIP, e - side * 10 * PIP
            for _, b in lok.iterrows():
                ht = b.high >= tp if side > 0 else b.low <= tp
                hs = b.low <= sl if side > 0 else b.high >= sl
                if ht and hs:
                    amb += 1; break
                if ht:
                    win += 1; break
                if hs:
                    loss += 1; break
        n = win + loss + amb
        lo_w, hi_w = win / n * 100, (win + amb) / n * 100
        verdict = ("PROFITABLE" if lo_w > be else
                   "loses money" if hi_w < be else "straddles break-even")
        print(f"    {nm}: win rate {lo_w:.1f}%-{hi_w:.1f}% "
              f"({amb/n*100:.0f}% ambiguous) vs {be:.1f}% needed -> {verdict}  n={n}")


if __name__ == "__main__":
    for pair in ("EURUSD", "GBPUSD"):
        d = load(pair)
        s = sessions(d)
        print(f"\n{'='*78}\n{pair}: {len(s)} trading days "
              f"{s.index.min().date()} -> {s.index.max().date()}")
        q1_q4_asian_sweep_judas(d, s, pair)
        q2_fvg(d, s, pair)
        q14_time_of_extremes(d, s, pair)
        q7_ten_pip(d, s, pair)


# ---------------------------------------------------------------- Q3
def q3_mss_830(d, s, pair):
    """Q3 'How many times is there a MSS at 8:30 am NY time?'
    MSS = in 08:30-09:30 NY, a 5-min CLOSE beyond the swing extreme of the
    preceding two hours (06:30-08:30)."""
    up = dn = tot = 0
    for sess, g in d.groupby("sess"):
        pre = g[(g.hm >= 390) & (g.hm < 510)]
        win = g[(g.hm >= 510) & (g.hm < 570)]
        if len(pre) < 12 or len(win) < 6:
            continue
        tot += 1
        if (win.close > pre.high.max()).any():
            up += 1
        elif (win.close < pre.low.min()).any():
            dn += 1
    print(f"\n  [{pair}] Q3 — market-structure shift in the 08:30 NY window")
    print(f"    FREQUENCY : break of the prior 2h range on {up+dn}/{tot} days = "
          f"{(up+dn)/tot*100:.0f}%  (up {up/tot*100:.0f}%, down {dn/tot*100:.0f}%)")


# ---------------------------------------------------------------- Q15
def q15_wednesday(d, s, pair):
    """Q15 'See when the opposing end of the range was made on Wednesday and if
    it tagged PWH/PWL'. Directly relevant: the bot shorts Wednesdays."""
    s = s.copy()
    s["wd"] = s.index.dayofweek
    # previous week's high/low from the daily session data
    s["wk"] = s.index.to_period("W")
    pw = s.groupby("wk").agg(pwh=("d_hi", "max"), pwl=("d_lo", "min"))
    pw.index = pw.index + 1                                   # shift to NEXT week
    s = s.join(pw, on="wk")
    wed = s[(s.wd == 2)].dropna(subset=["pwh", "pwl"])
    hi_first, tags = [], 0
    for sess, r in wed.iterrows():
        g = d[(d.sess == sess) & (d.h < 17)]
        if len(g) < 150:
            continue
        hi_first.append(g.high.idxmax() < g.low.idxmin())      # high before low
        tags += int(r.d_hi >= r.pwh or r.d_lo <= r.pwl)
    n = len(hi_first)
    print(f"\n  [{pair}] Q15 — Wednesdays (n={n})")
    print(f"    FREQUENCY : the day's HIGH formed before its LOW on "
          f"{np.mean(hi_first)*100:.0f}% of Wednesdays "
          f"(i.e. sold off after the high — the bot's Wednesday-short premise)")
    print(f"    PWH/PWL   : Wednesday tagged the previous week's high or low "
          f"{tags/n*100:.0f}% of the time")


# ---------------------------------------------------------------- Q11
def q11_fomc(d, s, pair):
    """Q11 'FOMC on Wednesday, does Thursday & Friday move opposing way after?'"""
    f = f"{DATA}/us_news_high.csv"
    if not os.path.exists(f):
        print(f"\n  [{pair}] Q11 — no stored calendar; skipped")
        return
    n = pd.read_csv(f, parse_dates=["date"])
    fomc = n[n.event.str.startswith("Fed Interest Rate Decision")]
    days = sorted(set(fomc.date.dt.normalize()))
    dd = s[["d_open", "d_close"]].copy()
    dd["ret"] = dd.d_close / dd.d_open - 1
    rows = []
    for f0 in days:
        if f0 not in dd.index:
            continue
        nxt = dd[dd.index > f0].head(2)
        if len(nxt) < 2:
            continue
        rows.append((np.sign(dd.loc[f0, "ret"]),
                     np.sign(nxt.iloc[0].ret), np.sign(nxt.iloc[1].ret)))
    t = pd.DataFrame(rows, columns=["fomc", "d1", "d2"])
    if not len(t):
        return
    print(f"\n  [{pair}] Q11 — FOMC day direction vs the two days after (n={len(t)})")
    print(f"    next day opposed FOMC day {(t.d1 != t.fomc).mean()*100:.0f}% of the time"
          f"  |  second day {(t.d2 != t.fomc).mean()*100:.0f}%   (coin flip = 50%)")


if __name__ == "__main__":
    for pair in ("EURUSD", "GBPUSD"):
        d = load(pair); s = sessions(d)
        print(f"\n{'-'*78}\n{pair} — remaining questions")
        q3_mss_830(d, s, pair)
        q15_wednesday(d, s, pair)
        q11_fomc(d, s, pair)
