"""Faithful Python port of GODMODE v4.1's signal logic, so it can be backtested.

The published file is an `indicator()`, not a `strategy()`, so TradingView cannot
backtest it and it ships no P&L. This port reproduces the decision logic exactly
as written, at default settings, and runs it through a real trade simulator with
spreads.

Ported pieces (defaults in brackets):
  f_trend  supertrend-style ATR bands, src=hl2, factor=3.0 ["Balanced"], len=10
  k-NN     5 features, Lorentzian distance, k=8, horizon=4, memory=400
  score    0.20*trend + 0.35*AI + 0.20*HTF + 0.15*momentum + 0.10*volume
  signal   on trend flip, within sigWindow=3 bars, cooldown=3, score>=55
  trade    entry=close, SL=1.5*ATR14, TP1/2/3 = 1R/2R/3R, SL->BE after TP1
  filters  HTF / chop / volume agreement all default OFF

Pine semantics preserved: ta.atr/ta.rsi use Wilder RMA; f_trend updates lo/hi
before dir but dir compares against the PREVIOUS bar's bands; the k-NN pushes
its training sample before predicting on the same bar.
"""
import numpy as np
import pandas as pd


# ---------------------------------------------------------------- indicators
def rma(x, n):
    x = np.asarray(x, float)
    out = np.full(len(x), np.nan)
    if len(x) < n:
        return out
    seed = np.nanmean(x[:n])
    out[n - 1] = seed
    a = 1.0 / n
    for i in range(n, len(x)):
        out[i] = a * x[i] + (1 - a) * out[i - 1]
    return out


def true_range(h, l, c):
    pc = np.roll(c, 1); pc[0] = np.nan
    return np.nanmax(np.vstack([h - l, np.abs(h - pc), np.abs(l - pc)]), axis=0)


def atr(h, l, c, n):
    return rma(true_range(h, l, c), n)


def rsi(c, n=14):
    d = np.diff(c, prepend=c[0])
    up = rma(np.where(d > 0, d, 0.0), n)
    dn = rma(np.where(d < 0, -d, 0.0), n)
    with np.errstate(divide="ignore", invalid="ignore"):
        return np.where(dn == 0, 100.0, 100.0 - 100.0 / (1.0 + up / dn))


def ema(c, n):
    c = np.asarray(c, float)
    out = np.full(len(c), np.nan)
    if len(c) < n:
        return out
    out[n - 1] = c[:n].mean()
    a = 2.0 / (n + 1)
    for i in range(n, len(c)):
        out[i] = a * c[i] + (1 - a) * out[i - 1]
    return out


def sma(x, n):
    return pd.Series(x).rolling(n).mean().to_numpy()


def cci(hlc3, n=20):
    s = pd.Series(hlc3)
    m = s.rolling(n).mean()
    mad = s.rolling(n).apply(lambda w: np.abs(w - w.mean()).mean(), raw=True)
    return ((s - m) / (0.015 * mad)).to_numpy()


def dmi_adx(h, l, c, n=14, adxn=14):
    up = np.diff(h, prepend=h[0])
    dn = -np.diff(l, prepend=l[0])
    plus = np.where((up > dn) & (up > 0), up, 0.0)
    minus = np.where((dn > up) & (dn > 0), dn, 0.0)
    tr = rma(true_range(h, l, c), n)
    with np.errstate(divide="ignore", invalid="ignore"):
        dip = 100 * rma(plus, n) / tr
        dim = 100 * rma(minus, n) / tr
        dx = 100 * np.abs(dip - dim) / (dip + dim)
    return dip, dim, rma(np.nan_to_num(dx, nan=0.0), adxn)


def macd_hist(c):
    m = ema(c, 12) - ema(c, 26)
    sig = ema(np.nan_to_num(m), 9)
    return m - sig


# ---------------------------------------------------------------- f_trend
def f_trend(hi_, lo_, close, factor, length):
    """Exact port: bands update first, direction compares to PREVIOUS bands."""
    src = (hi_ + lo_) / 2.0
    a = atr(hi_, lo_, close, length)
    up, dn = src - factor * a, src + factor * a
    n = len(close)
    line = np.full(n, np.nan)
    direction = np.ones(n, dtype=int)
    lo = hi = np.nan
    d = 1
    for i in range(n):
        if not np.isfinite(up[i]):
            direction[i] = d
            continue
        pLo = up[i] if not np.isfinite(lo) else lo
        pHi = dn[i] if not np.isfinite(hi) else hi
        pc = close[i - 1] if i > 0 else np.nan
        lo = up[i] if (up[i] > pLo or (np.isfinite(pc) and pc < pLo)) else pLo
        hi = dn[i] if (dn[i] < pHi or (np.isfinite(pc) and pc > pHi)) else pHi
        d = 1 if close[i] > pHi else (-1 if close[i] < pLo else d)
        direction[i] = d
        line[i] = lo if d == 1 else hi
    return line, direction


# ---------------------------------------------------------------- k-NN
def knn_vote(F, close, horizon=4, memory=400, k=8):
    """Returns the AI vote in [-1,1]; NaN until the memory has > 2k samples.
    Training sample is pushed BEFORE predicting on the same bar, as in Pine."""
    n = len(close)
    out = np.full(n, np.nan)
    X = np.empty((memory, 5)); Y = np.empty(memory)
    cnt = head = 0
    for i in range(n):
        if i > 50 + horizon:
            j = i - horizon
            if np.all(np.isfinite(F[j])):
                lab = 1.0 if close[i] > close[j] else (-1.0 if close[i] < close[j] else 0.0)
                if cnt < memory:
                    X[cnt] = F[j]; Y[cnt] = lab; cnt += 1
                else:
                    X[head] = F[j]; Y[head] = lab      # circular: order is
                    head = (head + 1) % memory         # irrelevant to k-NN
        if cnt > 2 * k and np.all(np.isfinite(F[i])):
            d = np.log1p(np.abs(X[:cnt] - F[i])).sum(axis=1)
            idx = np.argpartition(d, k)[:k]
            out[i] = Y[idx].sum() / k
    return out
