"""The user's own Notion rules ("4HR to 5 min" / Omor mentorship), coded and
tested — alone, and with GODMODE's trend signal layered on top.

RULES AS WRITTEN (Notion "⛔ Rules"):
  1. No equal highs/lows for the fib. Too easy to take out.
  2. Any highs after the equal highs are not to be considered for Fib.
  3. If price comes near entry but misses it by a couple of pips, don't
     entertain anything until the next 4hr candle.
  4. If there is a FVG to the left of a high before the high/low has been
     swept, consider putting FIB above/below the FVG candle high/low.
  5. If two trade opportunities on GU & EU, max risk 0.5% on all trades.
  6. One trade per 4HR candle.

MECHANISED AS (ICT OTE after a liquidity sweep):
  - swing high/low = pivot with `piv` bars either side
  - SWEEP: price trades beyond that pivot (liquidity taken)
  - DISPLACEMENT: price then reverses and makes an extreme the other way
  - ENTRY: first touch of the 0.62 retracement of the sweep->displacement leg
           (the near edge of the 62-79% OTE zone)
  - STOP: beyond the sweep extreme + buffer      TARGET: 2R (the 2:1 discussed)
  - rule 1 applied: skip if the swept level was part of an equal-high/low
    cluster (>=2 pivots within `eq_tol` ATR of each other)
  - rule 3 applied: if the OTE is not touched within `wait` bars, abandon
  - rule 6 applied: at most one entry per 4-hour bucket
  - rule 5: risk is reported in R; 0.5%/pair is the sizing layer

NOT mechanised (needs definitions only the author can give): rule 2's "highs
after the equal highs", and rule 4's FVG-based fib re-anchoring. Both shift the
fib anchor, which moves entry and stop; results below are the base reading.
"""
import os
import sys

import numpy as np
import pandas as pd

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import godmode_port as G                                       # noqa: E402

DATA = os.path.join(os.path.dirname(os.path.abspath(__file__)), "data")
SPREAD = {"EURUSD": 0.6e-4, "GBPUSD": 0.8e-4}


def load(pair, tf):
    d = pd.read_parquet(f"{DATA}/{pair.lower()}_m5_utc.parquet")[
        ["open", "high", "low", "close"]]
    if tf != "5min":
        d = d.resample(tf).agg({"open": "first", "high": "max",
                                "low": "min", "close": "last"}).dropna()
    return d


def pivots(h, l, n):
    """Index arrays of confirmed pivot highs / lows (n bars either side)."""
    ph = np.zeros(len(h), bool)
    pl = np.zeros(len(l), bool)
    for i in range(n, len(h) - n):
        if h[i] == h[i - n:i + n + 1].max():
            ph[i] = True
        if l[i] == l[i - n:i + n + 1].min():
            pl[i] = True
    return ph, pl


def run(pair, tf, piv=5, wait=36, disp_min=0.5, ote=0.62, rr=2.0,
        buf=0.1, eq_tol=0.25, apply_eq_rule=True, gm_dir=None, cost=True,
        max_hold=None):
    d = load(pair, tf)
    o, h, l, c = (d[x].to_numpy(float) for x in ("open", "high", "low", "close"))
    a14 = G.atr(h, l, c, 14)
    ph, pl = pivots(h, l, piv)
    sp = SPREAD[pair] if cost else 0.0
    bucket = d.index.floor("4h")
    n = len(c)

    ph_idx = np.flatnonzero(ph)
    pl_idx = np.flatnonzero(pl)
    used_bucket = set()
    trades = []

    for side in (-1, 1):                       # -1 short (sweep high), +1 long
        src = ph_idx if side == -1 else pl_idx
        for k in src:
            lvl = h[k] if side == -1 else l[k]
            a = a14[k]
            if not np.isfinite(a) or a <= 0:
                continue
            # rule 1: skip equal-high / equal-low clusters
            if apply_eq_rule:
                near = src[(src > k - 60) & (src < k) ]
                vals = (h[near] if side == -1 else l[near])
                if len(vals) and np.any(np.abs(vals - lvl) < eq_tol * a):
                    continue
            # find the sweep
            j0 = k + piv + 1
            sweep = None
            for j in range(j0, min(j0 + 200, n)):
                if (h[j] > lvl) if side == -1 else (l[j] < lvl):
                    sweep = j
                    break
            if sweep is None:
                continue
            # sweep extreme, then displacement the other way
            ext = h[sweep] if side == -1 else l[sweep]
            disp = None
            for j in range(sweep + 1, min(sweep + wait, n)):
                ext = max(ext, h[j]) if side == -1 else min(ext, l[j])
                move = (ext - l[j]) if side == -1 else (h[j] - ext)
                if move >= disp_min * a:
                    disp = j
                    break
            if disp is None:
                continue
            dext = l[disp] if side == -1 else h[disp]
            leg = abs(ext - dext)
            if leg <= 0:
                continue
            entry_px = dext + side * -1 * (ote * leg) if side == -1 else dext - (ote * leg)
            entry_px = dext + ote * leg if side == -1 else dext - ote * leg
            stop_px = ext + side * -1 * (buf * a) if side == -1 else ext - buf * a
            stop_px = ext + buf * a if side == -1 else ext - buf * a
            risk = abs(stop_px - entry_px)
            if risk <= 0:
                continue
            # rule 3: OTE must be touched within `wait` bars, else abandon
            fill = None
            for j in range(disp + 1, min(disp + wait, n)):
                if (h[j] >= entry_px) if side == -1 else (l[j] <= entry_px):
                    fill = j
                    break
                if (h[j] > stop_px) if side == -1 else (l[j] < stop_px):
                    break                       # invalidated before fill
            if fill is None:
                continue
            b = bucket[fill]
            if b in used_bucket:                # rule 6
                continue
            # optional GODMODE trend agreement
            if gm_dir is not None and gm_dir[fill] != side:
                continue
            used_bucket.add(b)
            tgt = entry_px - side * -1 * (rr * risk) if side == -1 else entry_px + rr * risk
            tgt = entry_px - rr * risk if side == -1 else entry_px + rr * risk
            r = None
            stop_j = n if max_hold is None else min(fill + 1 + max_hold, n)
            for j in range(fill + 1, stop_j):
                hs = (h[j] >= stop_px) if side == -1 else (l[j] <= stop_px)
                ht = (l[j] <= tgt) if side == -1 else (h[j] >= tgt)
                if hs:
                    r = -1.0
                    break
                if ht:
                    r = rr
                    break
            if r is None:
                r = side * (c[stop_j - 1] - entry_px) / risk
            trades.append({"i": fill, "side": side, "r": r - sp / risk,
                           "risk_atr": risk / a})
    t = pd.DataFrame(trades).sort_values("i").reset_index(drop=True)
    return t


def summarise(t, pair, label):
    if not len(t):
        return None
    x = t.r
    se = x.std(ddof=1) / np.sqrt(len(x))
    # average spread cost expressed in R
    atr_risk = t.risk_atr.mean()
    return dict(label=label, n=len(x), mean=x.mean(), tot=x.sum(),
                t=x.mean() / se, win=(x > 0).mean() * 100, risk_atr=atr_risk)


def gm_direction(pair, tf):
    d = load(pair, tf)
    _, sd = G.f_trend(d.high.to_numpy(float), d.low.to_numpy(float),
                      d.close.to_numpy(float), 3.0, 10)
    return sd


if __name__ == "__main__":
    print("YOUR RULES (sweep -> displacement -> 0.62 OTE entry, stop beyond the")
    print("sweep, 2:1 target, 1 trade per 4H, equal-high/low setups skipped)\n")
    print(f"{'tf':<7}{'disp':<7}{'pair':<8}{'n':>6}{'win%':>7}{'mean R':>9}"
          f"{'total R':>10}{'t':>7}{'stop (ATR)':>12}{'spread cost':>13}")
    rows = []
    for tf in ("5min", "15min", "1h", "4h"):
        for dm in (0.5, 1.5):
            for pair in ("EURUSD", "GBPUSD"):
                t = run(pair, tf, disp_min=dm)
                s = summarise(t, pair, f"{tf}/{dm}")
                if not s:
                    continue
                d = load(pair, tf)
                atr_mean = np.nanmean(G.atr(d.high.to_numpy(float),
                                            d.low.to_numpy(float),
                                            d.close.to_numpy(float), 14))
                cost_R = SPREAD[pair] / (s["risk_atr"] * atr_mean)
                rows.append((tf, dm, pair, s, cost_R))
                print(f"{tf:<7}{dm:<7}{pair:<8}{s['n']:>6}{s['win']:>6.1f}%"
                      f"{s['mean']:>+8.3f}R{s['tot']:>+9.1f}R{s['t']:>7.2f}"
                      f"{s['risk_atr']:>11.2f}{cost_R:>11.2f}R")
    print("\n'spread cost' = the round-trip spread expressed as a fraction of 1R.")
    print("A 2:1 needs a 33.3% win rate BEFORE costs; add the spread column to that bar.")
