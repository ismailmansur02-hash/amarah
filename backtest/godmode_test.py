"""Backtest GODMODE v4.1 at its default settings.

The published script is an indicator(), so it has no P&L of its own. This runs
the ported logic (godmode_port.py) through a real trade simulator across
timeframes, with spreads, and ALSO reproduces the indicator's own on-chart
"Win Rate (TP1 before SL)" counter so the two can be compared.

Exit models (the script defines TP1/TP2/TP3 and breakeven but never says how
much to scale at each, so all three readings are reported):
  TP1-only : full exit at TP1 or SL                      -> pure 1:1
  thirds   : 1/3 at TP1, 1/3 at TP2, 1/3 at TP3, SL->BE  -> the usual reading
  runner   : full position to TP3, SL->BE after TP1
A reversal signal closes any open trade at the close.
"""
import os
import sys

import numpy as np
import pandas as pd

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import godmode_port as G                                      # noqa: E402

DATA = os.path.join(os.path.dirname(os.path.abspath(__file__)), "data")
SPREAD = {"EURUSD": 0.6e-4, "GBPUSD": 0.8e-4}          # round trip, price terms
HTF_OF = {"5min": "1h", "1h": "4h", "4h": "1D", "1D": "1W"}   # script's htfAuto


def load(pair, tf):
    d = pd.read_parquet(f"{DATA}/{pair.lower()}_m5_utc.parquet")
    d = d[["open", "high", "low", "close", "volume"]]
    if tf != "5min":
        d = d.resample(tf).agg({"open": "first", "high": "max", "low": "min",
                                "close": "last", "volume": "sum"}).dropna()
    return d[d.volume > 0] if tf != "5min" else d


def htf_dir(pair, tf, index):
    """Supertrend direction on the higher timeframe, shifted one HTF bar
    (the script's f_dirPrev + lookahead_on = previous CLOSED HTF bar)."""
    h = load(pair, HTF_OF[tf])
    _, d = G.f_trend(h.high.to_numpy(), h.low.to_numpy(), h.close.to_numpy(), 3.0, 10)
    s = pd.Series(d, index=h.index).shift(1)
    return s.reindex(index, method="ffill").to_numpy()


def build(pair, tf, factor=3.0, atrlen=10):
    d = load(pair, tf)
    o, h, l, c = (d[x].to_numpy(float) for x in ("open", "high", "low", "close"))
    v = d["volume"].to_numpy(float)
    a14 = G.atr(h, l, c, 14)
    r14 = G.rsi(c, 14)
    cc = G.cci((h + l + c) / 3.0, 20)
    _, _, adx = G.dmi_adx(h, l, c)
    e20 = G.ema(c, 20)
    vs = G.sma(v, 20)
    rel = np.where(vs > 0, v / np.where(vs == 0, 1, vs), 1.0)
    f1 = np.nan_to_num(r14, nan=50) / 100
    f2 = (np.clip(np.nan_to_num((c - e20) / (a14 * 3.0)), -1, 1) + 1) / 2
    f3 = (np.clip(np.nan_to_num(cc), -300, 300) + 300) / 600
    f4 = np.nan_to_num(adx) / 100
    f5 = np.clip(rel, 0, 3) / 3
    F = np.column_stack([f1, f2, f3, f4, f5])
    line, sdir = G.f_trend(h, l, c, factor, atrlen)
    ai = G.knn_vote(F, c)
    hd = htf_dir(pair, tf, d.index)
    mh = G.macd_hist(c)
    # composite confidence, exactly as weighted in the script
    w = np.full(len(c), 0.20); vsum = 0.20 * sdir
    m = np.isfinite(ai); w[m] += 0.35; vsum = vsum + np.where(m, 0.35 * np.nan_to_num(ai), 0)
    mh2 = np.isfinite(hd); w[mh2] += 0.20
    vsum = vsum + np.where(mh2, 0.20 * np.nan_to_num(hd), 0)
    mom = np.where(np.nan_to_num(mh) > 0, .5, -.5) + np.where(np.nan_to_num(r14, nan=50) > 50, .5, -.5)
    w += 0.15; vsum = vsum + 0.15 * mom
    hasv = vs > 0
    vb = np.where(rel >= 1.2, np.where(c > o, 1.0, np.where(c < o, -1.0, 0.0)), 0.0)
    w = w + np.where(hasv, 0.10, 0); vsum = vsum + np.where(hasv, 0.10 * vb, 0)
    bull = (vsum / w + 1) * 50
    return d, o, h, l, c, a14, sdir, bull, 100 - bull


def signals(sdir, bull, bear, min_conf=55.0, window=3, cooldown=3):
    n = len(sdir)
    sig = np.zeros(n, dtype=int)
    regime_bar, used, last_sig = 0, False, -10**6
    for i in range(1, n):
        if sdir[i] != sdir[i - 1]:
            regime_bar, used = i, False
        ready = (i > 60 and i - last_sig > cooldown and not used
                 and i - regime_bar <= window)
        if not ready:
            continue
        if sdir[i] == 1 and bull[i] >= min_conf:
            sig[i] = 1
        elif sdir[i] == -1 and bear[i] >= min_conf:
            sig[i] = -1
        if sig[i]:
            used, last_sig = True, i
    return sig


def simulate(pair, o, h, l, c, a14, sig, sl_mult=1.5, rr=(1, 2, 3)):
    """Returns per-trade R under three exit models + the script's own counter."""
    sp = SPREAD[pair]
    n = len(c)
    trades = []
    i = 0
    idxs = np.flatnonzero(sig)
    for t, k in enumerate(idxs):
        d = sig[k]
        if not np.isfinite(a14[k]) or a14[k] <= 0:
            continue
        risk = max(a14[k] * sl_mult, a14[k] * 0.3)
        e = c[k]
        slp = e - d * risk
        tps = [e + d * risk * r for r in rr]
        end = idxs[t + 1] if t + 1 < len(idxs) else n - 1      # reversal closes
        hit = [False, False, False]
        stopped = be = False
        exit_px = None
        cur_sl = slp
        for j in range(k + 1, end + 1):
            sl_touch = (l[j] <= cur_sl) if d == 1 else (h[j] >= cur_sl)
            if sl_touch:                        # SL checked first (script's rule)
                stopped, be = True, hit[0]
                exit_px = cur_sl
                break
            for m in range(3):
                if not hit[m] and (h[j] >= tps[m] if d == 1 else l[j] <= tps[m]):
                    if m == 0 or hit[m - 1]:
                        hit[m] = True
                        if m == 0:
                            cur_sl = e          # breakeven after TP1
            if hit[2]:
                exit_px = tps[2]
                break
        if exit_px is None:
            exit_px = c[end]
        # --- exit models, in R, net of a round-trip spread
        cost_R = sp / risk
        if hit[0]:
            tp1_only = rr[0] - cost_R
        elif stopped:
            tp1_only = -1 - cost_R
        else:
            tp1_only = d * (exit_px - e) / risk - cost_R
        if hit[2]:
            thirds = (rr[0] + rr[1] + rr[2]) / 3
            runner = rr[2]
        elif hit[1]:
            rest = 0.0 if be else d * (exit_px - e) / risk
            thirds = (rr[0] + rr[1] + rest) / 3
            runner = 0.0 if be else d * (exit_px - e) / risk
        elif hit[0]:
            rest = 0.0 if be else d * (exit_px - e) / risk
            thirds = (rr[0] + 2 * rest) / 3
            runner = 0.0 if be else d * (exit_px - e) / risk
        else:
            v = -1.0 if stopped else d * (exit_px - e) / risk
            thirds = runner = v
        trades.append({"i": k, "dir": d, "hit1": hit[0], "hit2": hit[1],
                       "hit3": hit[2], "stopped": stopped, "be": be,
                       "tp1_only": tp1_only, "thirds": thirds - cost_R,
                       "runner": runner - cost_R,
                       # the indicator's own counter
                       "script_win": hit[0] or (not stopped and d * (exit_px - e) > 0),
                       "script_loss": stopped and not hit[0]})
    return pd.DataFrame(trades)


def report(tf_list=("1D", "4h", "1h")):
    print(f"GODMODE v4.1 — default settings, EURUSD + GBPUSD, 2023-01 to 2026-07")
    print(f"{'tf':<6}{'pair':<8}{'trades':>7}{'script WR':>11}"
          f"{'TP1-only':>11}{'thirds':>10}{'runner':>10}{'expectancy R/trade':>22}")
    allt = {}
    for tf in tf_list:
        for pair in ("EURUSD", "GBPUSD"):
            d, o, h, l, c, a14, sdir, bull, bear = build(pair, tf)
            sig = signals(sdir, bull, bear)
            t = simulate(pair, o, h, l, c, a14, sig)
            if not len(t):
                continue
            allt[(tf, pair)] = t
            sw = t.script_win.sum(); sl_ = t.script_loss.sum()
            wr = sw / max(sw + sl_, 1) * 100
            print(f"{tf:<6}{pair:<8}{len(t):>7}{wr:>10.1f}%"
                  f"{t.tp1_only.sum():>+10.1f}R{t.thirds.sum():>+9.1f}R"
                  f"{t.runner.sum():>+9.1f}R"
                  f"{t.thirds.mean():>+15.3f}R/trade")
    return allt


if __name__ == "__main__":
    allt = report()
    print("\nPer-trade detail, pooled across timeframes (thirds model):")
    t = pd.concat(allt.values())
    for col, nm in (("tp1_only", "TP1-only"), ("thirds", "thirds"), ("runner", "runner")):
        x = t[col]
        se = x.std(ddof=1) / np.sqrt(len(x))
        print(f"  {nm:<10} total {x.sum():+8.1f}R   mean {x.mean():+.4f}R   "
              f"t={x.mean()/se:+5.2f}   win% {(x > 0).mean()*100:4.1f}   n={len(x)}")
    print(f"\n  TP1 hit {t.hit1.mean()*100:.0f}%   TP2 {t.hit2.mean()*100:.0f}%   "
          f"TP3 {t.hit3.mean()*100:.0f}%   stopped {t.stopped.mean()*100:.0f}%   "
          f"of which at BE {t.be.mean()*100:.0f}%")
    sw, sl_ = t.script_win.sum(), t.script_loss.sum()
    print(f"\n  The indicator's own on-chart counter would show: "
          f"{sw/(sw+sl_)*100:.1f}% win rate ({sw}W / {sl_}L)")
    print(f"  Actual expectancy (thirds, after spread): {t.thirds.mean():+.4f} R/trade")
