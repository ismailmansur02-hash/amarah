"""Edge search, family A+B: intraday seasonality & session structure.

Discipline:
  TRAIN = 2023-01-01 .. 2025-03-31   (27 months)
  TEST  = 2025-04-01 .. 2026-07-20   (15.5 months, untouched by selection)
Candidates are picked on TRAIN only (|t| >= 3, and mean must clear round-trip
cost); survivors are then read once on TEST. Hypothesis counts are printed so
the significance bar is honest (Bonferroni across the family).

Costs (FTMO raw spread, per round trip): EURUSD 0.6 pip ~ 0.55 bps,
GBPUSD 0.8 pip ~ 0.63 bps.
"""
import os

import numpy as np
import pandas as pd

DATA = os.path.join(os.path.dirname(__file__), "data")
TRAIN = (pd.Timestamp("2023-01-01"), pd.Timestamp("2025-04-01"))
TEST = (pd.Timestamp("2025-04-01"), pd.Timestamp("2026-07-21"))
COST_BPS = {"eurusd": 0.55, "gbpusd": 0.63}


def load(pair):
    d = pd.read_parquet(f"{DATA}/{pair}_m5_utc.parquet")
    d["ldn"] = d.index.tz_convert("Europe/London")
    d["ldate"] = d["ldn"].dt.tz_localize(None).dt.normalize()
    d["lhour"] = d["ldn"].dt.hour
    d["lwd"] = d["ldn"].dt.dayofweek
    return d


def tstat(x):
    x = np.asarray(x, float)
    return x.mean() / (x.std(ddof=1) / np.sqrt(len(x))) if len(x) > 1 else 0.0


def split(t):
    tr = t[(t.date >= TRAIN[0]) & (t.date < TRAIN[1])]["r"]
    te = t[(t.date >= TEST[0]) & (t.date < TEST[1])]["r"]
    return tr, te


def fmt(x, n=1):
    return f"{x.mean():+6.2f}bps t{tstat(x):+5.1f} n={len(x):<5}"


# ---------------------------------------------------------------- family A
def hour_of_day(d, pair):
    """Mean London-hour return, weekdays only. 24 hypotheses x 2 signs."""
    h = (d.groupby(["ldate", "lhour"])
           .agg(o=("open", "first"), c=("close", "last"), wd=("lwd", "first")))
    h = h[h.wd < 5].reset_index()
    h["r"] = (h.c / h.o - 1) * 1e4                      # bps, before cost
    out = []
    for hour in range(24):
        t = h[h.lhour == hour].rename(columns={"ldate": "date"})
        tr, te = split(t)
        if len(tr) > 100:
            out.append((hour, tr.mean(), tstat(tr), len(tr), te))
    return out


# ---------------------------------------------------------------- family B
def window_ret(d, h1, m1, h2, m2):
    """Per London-day return (bps) from h1:m1 to h2:m2 (first/last 5m bar)."""
    t1, t2 = h1 * 60 + m1, h2 * 60 + m2
    mins = d["ldn"].dt.hour * 60 + d["ldn"].dt.minute
    w = d[(mins >= t1) & (mins < t2)]
    g = w.groupby("ldate").agg(o=("open", "first"), c=("close", "last"),
                               hi=("high", "max"), lo=("low", "min"),
                               wd=("lwd", "first"), n=("close", "size"))
    g = g[(g.wd < 5) & (g.n > (t2 - t1) / 5 * 0.6)]
    g["r"] = (g.c / g.o - 1) * 1e4
    return g


def sessions(d, pair):
    """Signal window -> hold window strategies. Each is 1 hypothesis x 2 signs."""
    specs = {
        # name: (signal window, hold window)  (London times)
        "ldn_open_mom (7-8 -> 8-12)": ((7, 0, 8, 0), (8, 0, 12, 0)),
        "morning_mom (8-10 -> 10-16)": ((8, 0, 10, 0), (10, 0, 16, 0)),
        "prefix_mom (13-15:45 -> fix 15:45-16:15)": ((13, 0, 15, 45), (15, 45, 16, 15)),
        "postfix_fade (15-16 -> 16-18)": ((15, 0, 16, 0), (16, 0, 18, 0)),
        "asian_mom (0-7 -> 8-16)": ((0, 0, 7, 0), (8, 0, 16, 0)),
        "day_mom (0-16 -> 16-21:45)": ((0, 0, 16, 0), (16, 0, 21, 45)),
    }
    rows = []
    for name, (sw, hw) in specs.items():
        s, h = window_ret(d, *sw), window_ret(d, *hw)
        m = s[["r"]].join(h[["r"]], lsuffix="_s", rsuffix="_h", how="inner").reset_index()
        m["r"] = np.sign(m.r_s) * m.r_h - COST_BPS[pair] * 1e0
        m = m.rename(columns={"ldate": "date"})
        rows.append((name, *split(m)))
    return rows


def asian_breakout(d, pair):
    """First 5m close outside the 00-08 London range during 08-16; stop = range
    opposite side capped 1x range; exit 16:00. Follow + fade variants."""
    mins = d["ldn"].dt.hour * 60 + d["ldn"].dt.minute
    rng = d[(mins >= 0) & (mins < 480)].groupby("ldate").agg(
        hi=("high", "max"), lo=("low", "min"), wd=("lwd", "first"))
    rng = rng[rng.wd < 5]
    ses = d[(mins >= 480) & (mins < 960)]
    out = {"follow": [], "fade": []}
    for day, g in ses.groupby("ldate"):
        if day not in rng.index:
            continue
        hi, lo = rng.loc[day, "hi"], rng.loc[day, "lo"]
        width = hi - lo
        if width <= 0:
            continue
        up = g[g.close > hi]
        dn = g[g.close < lo]
        first_up = up.index[0] if len(up) else None
        first_dn = dn.index[0] if len(dn) else None
        if first_up is None and first_dn is None:
            continue
        if first_dn is None or (first_up is not None and first_up < first_dn):
            side, t0 = 1, first_up
        else:
            side, t0 = -1, first_dn
        entry = g.loc[t0, "close"]
        after = g[g.index > t0]
        if not len(after):
            continue
        stop = entry - side * width          # 1x range away
        if side > 0:
            hit = after[after.low <= stop]
        else:
            hit = after[after.high >= stop]
        exit_px = stop if len(hit) else after.iloc[-1]["close"]
        r = side * (exit_px / entry - 1) * 1e4 - COST_BPS[pair]
        out["follow"].append((day, r))
        out["fade"].append((day, -r - 2 * COST_BPS[pair] * 0))  # fade = mirror
    res = []
    for name, rows in out.items():
        t = pd.DataFrame(rows, columns=["date", "r"])
        res.append((f"asian_breakout_{name}", *split(t)))
    return res


if __name__ == "__main__":
    for pair in ("eurusd", "gbpusd"):
        d = load(pair)
        cost = COST_BPS[pair]
        print(f"\n{'='*95}\n{pair.upper()}  (round-trip cost ~{cost} bps)")
        print(f"\n[A] hour-of-day (London), TRAIN mean per hour, bps before cost "
              f"(24x2 hypotheses, Bonferroni t>3.6):")
        hod = hour_of_day(d, pair)
        line = "  "
        for hour, mu, t, n, te in hod:
            flag = " *" if abs(t) >= 3 and abs(mu) > cost else "  "
            line += f"{hour:02d}h {mu:+5.2f}(t{t:+4.1f}){flag} "
            if (hour + 1) % 6 == 0:
                print(line)
                line = "  "
        if line.strip():
            print(line)
        for hour, mu, t, n, te in hod:
            if abs(t) >= 3 and abs(mu) > cost:
                sgn = np.sign(mu)
                after = sgn * te - cost
                print(f"    -> SURVIVOR hour {hour:02d} train {mu:+.2f} t{t:+.1f} | "
                      f"TEST net {after.mean():+.2f}bps t{tstat(after):+.1f} n={len(after)}")

        print(f"\n[B] session structures (net of cost, 8x2 hypotheses, t>3 to shortlist):")
        for name, tr, te in sessions(d, pair) + asian_breakout(d, pair):
            mark = "  <- shortlist, TEST ->" if abs(tstat(tr)) >= 3 else ""
            extra = ""
            if abs(tstat(tr)) >= 3:
                # tr/te are NET of cost in the momentum orientation; to read the
                # opposite sign, add cost back before flipping, then re-charge it
                s = np.sign(tr.mean())
                te_net = s * (te + cost) - cost
                extra = f" TEST {te_net.mean():+.2f}bps t{tstat(te_net):+.1f} n={len(te)}"
            print(f"  {name:<42} train {fmt(tr)}{mark}{extra}")
