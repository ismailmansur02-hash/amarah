"""
Faithful backtest engine for algay 3.0 "inversion" (EURUSD, 15M signals, 4H sessions).

Replicates bot/algay_3_inversion.py session logic decision-for-decision:

  * 4H sessions hard-anchored to 22/02/06/10/14/18 Europe/London (DST-aware).
  * Reference = OHLC of the previous session that had data (== broker's last
    completed H4 candle on an EET-server broker such as FTMO).
  * Signals evaluated on CLOSED 15M candles only, in close-time order:
      - sweep detection (strict break of ref high/low, high checked first),
      - Williams fractal (period 4, strict inequalities) lock + new fractal,
      - equal-level filter (1 pip tolerance vs same-side fractals in the
        previous 96 bars),
      - 70.5% fib entry level -> INVERTED stop order through the level,
      - "invalid vs market" skip when the stop is on the wrong side of price,
      - near-miss cancel (close within 2 pips of entry without touching),
      - no placement at/after session_end-10min; pending force-cancelled then,
      - open position force-closed at session_end-5min,
      - max ONE placement per session; a direction killed by equal-levels
        stays dead but the other side may still arm.
  * Fills simulated on 5M bars inside the pending/position windows:
      candles are treated as BID prices (MT5 convention); ask = bid + spread.
      Stop entries fill at level +/- slippage (gap-through fills at bar open);
      TP is a limit (no slippage); SL is a stop (slippage).
      If TP and SL are both touchable inside one 5M bar the WORST case (SL)
      is booked by default ("worst"); "best" books TP for sensitivity runs.
  * Near-miss checks stop the moment the pending fills (position exists),
    exactly like the live bot's has_pending()/has_position() gates.
  * Sizing: risk_pct of current balance / stop distance (USD account,
    contract 100k). Fractional lots (no broker volume step) - see report.

Timestamps: everything internal is naive UTC. Source bars are FMP 5-min
mid quotes stamped America/New_York bar-open time, treated as BID series
(MT5 candles are bid-based; a constant half-spread shift on every logic
price cancels out of the level arithmetic).
"""

from __future__ import annotations

import bisect
from dataclasses import dataclass

import numpy as np
import pandas as pd

# strategy constants (must match the bot)
FRACTAL_PERIOD = 4
FIB = 0.705
EQ_TOL = 0.0001
NEAR_MISS = 0.0002
EQ_LOOKBACK_BARS = 96
WINDOW = 299                      # bot fetches 300 M15 bars, uses 299 closed
CONTRACT = 100_000
SESSION_HOURS_UK = (22, 2, 6, 10, 14, 18)
PIP = 0.0001


@dataclass
class Costs:
    spread: float = 0.2 * PIP          # bid/ask spread (raw-spread account)
    commission_rt: float = 6.0         # USD per 1.0 lot round trip
    slippage: float = 0.1 * PIP        # on stop fills (entry + SL) & flatten


@dataclass
class Trade:
    session: pd.Timestamp
    side: str                          # "sell" / "buy"  (order direction)
    sweep: str                         # "L" (swept 4H high) / "S" (swept low)
    t_sweep: pd.Timestamp = None
    t_placed: pd.Timestamp = None
    level: float = 0.0
    tp: float = 0.0
    sl: float = 0.0
    status: str = ""                   # pending/filled/near_miss/expired/invalid
    t_fill: pd.Timestamp = None
    fill_px: float = 0.0
    t_exit: pd.Timestamp = None
    exit_px: float = 0.0
    exit_reason: str = ""              # tp/sl/flatten
    ambiguous: bool = False            # TP & SL touchable in the same 5M bar
    entry_type: str = "stop"           # "stop" (inverted) | "limit" (original)
    below_market: bool = True          # order placed below current price?
    risk_dist: float = 0.0
    lots: float = 0.0
    pnl: float = 0.0
    balance_after: float = 0.0


def load_bars(m5_path: str):
    """Return (m5, m15) frames with naive-UTC 'time' (bar open) columns."""
    m5 = pd.read_parquet(m5_path)
    ny = m5["time_ny"].dt.tz_localize("America/New_York")
    m5 = m5.assign(time=ny.dt.tz_convert("UTC").dt.tz_localize(None))
    m5 = m5.sort_values("time").reset_index(drop=True)

    g = m5.set_index("time")
    m15 = g.resample("15min").agg(
        open=("open", "first"), high=("high", "max"),
        low=("low", "min"), close=("close", "last"), n=("close", "size"),
    ).dropna(subset=["open"]).reset_index()
    return m5, m15


def fractal_flags(high: np.ndarray, low: np.ndarray, n: int = FRACTAL_PERIOD):
    """Global Williams-fractal flags, identical to the bot's fractals():
    strictly greater/less than the n bars on each side."""
    N = len(high)
    up = np.zeros(N, dtype=bool)
    dn = np.zeros(N, dtype=bool)
    if N < 2 * n + 1:
        return up, dn
    up[n:N - n] = True
    dn[n:N - n] = True
    core = slice(n, N - n)
    for j in range(1, n + 1):
        up[core] &= (high[core] > high[n - j:N - n - j]) & (high[core] > high[n + j:N - n + j])
        dn[core] &= (low[core] < low[n - j:N - n - j]) & (low[core] < low[n + j:N - n + j])
    return up, dn


def build_sessions(m15: pd.DataFrame):
    """(session_open_utc, session_end_utc) pairs for every London-anchored 4H
    session over the data range (including empty ones, which are skipped when
    run)."""
    t0 = m15["time"].iloc[0].tz_localize("UTC").tz_convert("Europe/London")
    t1 = m15["time"].iloc[-1].tz_localize("UTC").tz_convert("Europe/London")
    out = []
    # iterate NAIVE London calendar days: tz-aware +24h steps drift across DST
    day = t0.normalize().tz_localize(None) - pd.Timedelta(days=1)
    last_day = t1.normalize().tz_localize(None) + pd.Timedelta(days=1)
    while day <= last_day:
        for h in SESSION_HOURS_UK:
            naive = day + pd.Timedelta(hours=h)
            a = naive.tz_localize("Europe/London").tz_convert("UTC").tz_localize(None)
            out.append(a)
        day += pd.Timedelta(days=1)
    out = sorted(set(out))
    return [(a, a + pd.Timedelta(hours=4)) for a in out]


class Backtest:
    def __init__(self, m5, m15, costs: Costs = None, balance: float = 100_000.0,
                 risk_pct: float = 0.01, ambiguity: str = "worst",
                 pending_cancel: str = "cutoff", flatten_mode: str = "session",
                 mode: str = "inverted", session_hours: set = None):
        """pending_cancel: 'cutoff' = bot behaviour (cancel 10 min before end),
        'end' = pending lives to session end (diagnostic variant).
        flatten_mode: 'session' = bot behaviour (close 5 min before end),
        'none' = position runs to TP/SL across sessions (diagnostic variant).
        mode: 'inverted' = bot as coded (stop through level, 0.42:1);
        'original' = non-inverted mirror (limit at level, TP/SL swapped, 2.4:1).
        session_hours: if given, only trade sessions whose open falls on these
        UK anchor hours (subset of 22/2/6/10/14/18); None = all sessions."""
        self.costs = costs or Costs()
        self.balance0 = balance
        self.risk_pct = risk_pct
        self.ambiguity = ambiguity
        self.pending_cancel = pending_cancel
        self.flatten_mode = flatten_mode
        self.mode = mode
        self.session_hours = session_hours

        h = m15["high"].to_numpy(); l = m15["low"].to_numpy()
        self.up_fr, self.dn_fr = fractal_flags(h, l)
        self.hi, self.lo = h, l
        self.close_ = m15["close"].to_numpy()
        self.t15 = m15["time"].to_numpy()          # bar open, np.datetime64
        self.up_idx = list(np.flatnonzero(self.up_fr))
        self.dn_idx = list(np.flatnonzero(self.dn_fr))

        self.t5 = m5["time"].to_numpy()
        self.o5 = m5["open"].to_numpy(); self.h5 = m5["high"].to_numpy()
        self.l5 = m5["low"].to_numpy(); self.c5 = m5["close"].to_numpy()

        self.sessions = build_sessions(m15)
        self.s15 = [(int(np.searchsorted(self.t15, np.datetime64(a))),
                     int(np.searchsorted(self.t15, np.datetime64(b))))
                    for a, b in self.sessions]

    # ---- fractal helpers (mirror the bot's rolling 299-bar view) ----
    def latest_confirmed(self, idx_arr, j):
        """Latest fractal position i with i <= j-4 (confirmed by close of bar
        j) inside the bot's 299-bar window. Returns -1 if none."""
        k = bisect.bisect_right(idx_arr, j - FRACTAL_PERIOD) - 1
        if k < 0:
            return -1
        i = idx_arr[k]
        if i < j - (WINDOW - 1):
            return -1
        return int(i)

    def equal_level(self, i, side):
        """Bot's is_equal_level: same-side fractal within EQ_TOL in the
        EQ_LOOKBACK_BARS bars before fractal bar i."""
        lo_i = max(0, i - EQ_LOOKBACK_BARS)
        idx = self.up_idx if side == "up" else self.dn_idx
        px = self.hi if side == "up" else self.lo
        a = bisect.bisect_left(idx, lo_i)
        b = bisect.bisect_left(idx, i)
        for k in idx[a:b]:
            if abs(px[k] - px[i]) <= EQ_TOL:
                return True
        return False

    # ---- 5M fill helpers ----
    def first_trigger(self, trade: Trade, t_from, t_cancel):
        """First 5M bar index in [t_from, t_cancel) where the pending order
        triggers, or None. (Candles are bid; ask = bid + spread.)
        stop orders trigger as price moves THROUGH the level; limit orders
        trigger as price comes BACK to the level."""
        s = self.costs.spread
        a = int(np.searchsorted(self.t5, np.datetime64(t_from)))
        b = int(np.searchsorted(self.t5, np.datetime64(t_cancel)))
        if trade.entry_type == "stop":
            if trade.side == "sell":                 # sell stop below market
                hits = np.flatnonzero(self.l5[a:b] <= trade.level)
            else:                                    # buy stop above market
                hits = np.flatnonzero(self.h5[a:b] + s >= trade.level)
        else:                                        # limit
            if trade.side == "buy":                  # buy limit below market
                hits = np.flatnonzero(self.l5[a:b] + s <= trade.level)
            else:                                    # sell limit above market
                hits = np.flatnonzero(self.h5[a:b] >= trade.level)
        return (a + int(hits[0])) if len(hits) else None

    def sim_exits(self, trade: Trade, f: int, t_flatten):
        """Fill at 5M bar f, then walk bars until TP/SL/flatten."""
        s = self.costs.spread
        slip = self.costs.slippage
        trade.status = "filled"
        trade.t_fill = pd.Timestamp(self.t5[f])
        o = self.o5[f]
        if trade.entry_type == "stop":
            if trade.side == "sell":
                gap = o < trade.level
                trade.fill_px = (o if gap else trade.level) - slip
            else:
                gap = o + s > trade.level
                trade.fill_px = ((o + s) if gap else trade.level) + slip
        else:                                        # limit: no adverse slip
            if trade.side == "buy":                  # buy at ask; gap improves
                trade.fill_px = min(trade.level, o + s)
            else:                                    # sell at bid; gap improves
                trade.fill_px = max(trade.level, o)

        if self.flatten_mode == "none":
            end = len(self.t5)                  # run to TP/SL across sessions
        else:
            end = int(np.searchsorted(self.t5, np.datetime64(t_flatten)))
        for i in range(f, end):
            if self._exit_in_bar(trade, i):
                return
        if self.flatten_mode == "none":         # never hit: close at data end
            px = self.c5[-1]
            if trade.side == "sell":
                trade.exit_px = px + self.costs.spread + slip
            else:
                trade.exit_px = px - slip
            trade.t_exit = pd.Timestamp(self.t5[-1])
            trade.exit_reason = "data_end"
            return
        # flatten at session_end-5min: 5M bar opening exactly at t_flatten
        j = int(np.searchsorted(self.t5, np.datetime64(t_flatten)))
        if j < len(self.t5) and self.t5[j] == np.datetime64(t_flatten):
            px = self.o5[j]
        else:                                   # data hole: last close before
            px = self.c5[max(0, min(j, len(self.c5)) - 1)]
        if trade.side == "sell":
            trade.exit_px = px + s + slip       # buy back at ask
        else:
            trade.exit_px = px - slip           # sell at bid
        trade.t_exit = pd.Timestamp(t_flatten)
        trade.exit_reason = "flatten"

    def _exit_in_bar(self, trade: Trade, i):
        s = self.costs.spread
        slip = self.costs.slippage
        hh, ll = self.h5[i], self.l5[i]
        if trade.side == "sell":                # short: TP below, SL above
            tp_hit = ll <= trade.tp - s        # buy limit at tp (ask <= tp)
            sl_hit = hh >= trade.sl - s        # buy stop  at sl (ask >= sl)
            tp_px, sl_px = trade.tp, trade.sl + s + slip
        else:                                   # long: TP above, SL below
            tp_hit = hh >= trade.tp            # sell limit at tp (bid >= tp)
            sl_hit = ll <= trade.sl            # sell stop  at sl (bid <= sl)
            tp_px, sl_px = trade.tp, trade.sl - slip
        if not (tp_hit or sl_hit):
            return False
        if tp_hit and sl_hit:
            trade.ambiguous = True
            first = "sl" if self.ambiguity == "worst" else "tp"
        else:
            first = "tp" if tp_hit else "sl"
        trade.exit_reason = first
        trade.exit_px = tp_px if first == "tp" else sl_px
        trade.t_exit = pd.Timestamp(self.t5[i])
        return True

    # ---- one session, mirroring run_session() ----
    def run_session(self, si, balance):
        (s_open, s_end) = self.sessions[si]
        (b0, b1) = self.s15[si]
        if b1 <= b0:
            return None, []
        if self.session_hours is not None:
            uk_hour = s_open.tz_localize("UTC").tz_convert("Europe/London").hour
            if uk_hour not in self.session_hours:
                return None, []
        cutoff = s_end - pd.Timedelta(minutes=10)
        if self.pending_cancel == "end":
            cutoff = s_end
        flatten_at = s_end - pd.Timedelta(minutes=5)
        if self.flatten_mode == "none":
            flatten_at = s_end

        # ref = previous session with data (== last completed broker H4 candle)
        ref_hi = ref_lo = None
        for sj in range(si - 1, -1, -1):
            (p0, p1) = self.s15[sj]
            if p1 > p0:
                ref_hi = float(self.hi[p0:p1].max())
                ref_lo = float(self.lo[p0:p1].min())
                break
        if ref_hi is None:
            return None, []

        swept = None; sweep_j = None; locked = None
        dead = {"L": False, "S": False}
        trade = None
        trigger_i = None                        # first 5M trigger bar index
        events = []

        for j in range(b0, b1):
            t_close = pd.Timestamp(self.t15[j]) + pd.Timedelta(minutes=15)
            if t_close >= flatten_at:            # would be processed at/after flatten
                break

            # near-miss on freshly closed bar while pending exists & unfilled.
            # Approach direction depends on whether the order sits below or
            # above market, not on buy/sell (identical to the bot for the
            # inverted case: sell stop below, buy stop above).
            if trade is not None and trade.status == "pending":
                if trigger_i is not None and self.t5[trigger_i] < np.datetime64(t_close):
                    trade.status = "prefilled"   # filled before this close
                elif trade.below_market and self.lo[j] > trade.level and \
                        self.lo[j] <= trade.level + NEAR_MISS:
                    trade.status = "near_miss"; events.append("near_miss")
                elif (not trade.below_market) and self.hi[j] < trade.level and \
                        self.hi[j] >= trade.level - NEAR_MISS:
                    trade.status = "near_miss"; events.append("near_miss")

            if trade is not None or t_close >= cutoff:
                continue

            # bot guard: needs at least one confirmed fractal on each side
            if self.latest_confirmed(self.up_idx, j) < 0 or \
               self.latest_confirmed(self.dn_idx, j) < 0:
                continue

            # 1) sweep detection (closed in-session bars only, high first)
            if swept is None:
                if self.hi[j] > ref_hi and not dead["L"]:
                    swept, sweep_j = "L", j
                    locked = float(self.lo[self.latest_confirmed(self.dn_idx, j)])
                elif self.lo[j] < ref_lo and not dead["S"]:
                    swept, sweep_j = "S", j
                    locked = float(self.hi[self.latest_confirmed(self.up_idx, j)])

            # 2) new same-side fractal -> equal filter -> inverted stop order
            if swept == "L":
                i2 = self.latest_confirmed(self.up_idx, j)
                if i2 >= sweep_j:               # fractal bar at/after sweep bar
                    fr_price = float(self.hi[i2])
                    if self.equal_level(i2, "up"):
                        dead["L"] = True; swept = None
                        events.append("equal_kill_L")
                    else:
                        level = round(fr_price - (fr_price - locked) * FIB, 5)
                        if self.mode == "inverted":
                            trade = Trade(session=s_open, side="sell", sweep="L",
                                          t_sweep=pd.Timestamp(self.t15[sweep_j]),
                                          t_placed=t_close, level=level,
                                          tp=locked, sl=fr_price,
                                          entry_type="stop", below_market=True)
                        else:                            # original: mirror (buy limit)
                            trade = Trade(session=s_open, side="buy", sweep="L",
                                          t_sweep=pd.Timestamp(self.t15[sweep_j]),
                                          t_placed=t_close, level=level,
                                          tp=fr_price, sl=locked,
                                          entry_type="limit", below_market=True)
                        if level < self.close_[j]:          # order sits below market
                            trade.status = "pending"
                            trigger_i = self.first_trigger(trade, t_close, cutoff)
                        else:
                            trade.status = "invalid"; events.append("invalid")
            elif swept == "S":
                i2 = self.latest_confirmed(self.dn_idx, j)
                if i2 >= sweep_j:
                    fr_price = float(self.lo[i2])
                    if self.equal_level(i2, "dn"):
                        dead["S"] = True; swept = None
                        events.append("equal_kill_S")
                    else:
                        level = round(fr_price + (locked - fr_price) * FIB, 5)
                        if self.mode == "inverted":
                            trade = Trade(session=s_open, side="buy", sweep="S",
                                          t_sweep=pd.Timestamp(self.t15[sweep_j]),
                                          t_placed=t_close, level=level,
                                          tp=locked, sl=fr_price,
                                          entry_type="stop", below_market=False)
                        else:                            # original: mirror (sell limit)
                            trade = Trade(session=s_open, side="sell", sweep="S",
                                          t_sweep=pd.Timestamp(self.t15[sweep_j]),
                                          t_placed=t_close, level=level,
                                          tp=fr_price, sl=locked,
                                          entry_type="limit", below_market=False)
                        if level > self.close_[j] + self.costs.spread:  # order sits above market
                            trade.status = "pending"
                            trigger_i = self.first_trigger(trade, t_close, cutoff)
                        else:
                            trade.status = "invalid"; events.append("invalid")

        if trade is None:
            return None, events

        if trade.status in ("pending", "prefilled"):
            if trigger_i is None:
                trade.status = "expired"
            else:
                self.sim_exits(trade, trigger_i, flatten_at)
        if trade.status != "filled":
            return trade, events

        # sizing + P&L (bot: risk = balance*risk_pct on |entry - sl|)
        trade.risk_dist = abs(trade.level - trade.sl)
        if trade.risk_dist <= 0:
            trade.status = "invalid"
            return trade, events
        trade.lots = (balance * self.risk_pct) / (trade.risk_dist * CONTRACT)
        sgn = 1.0 if trade.side == "buy" else -1.0
        trade.pnl = sgn * (trade.exit_px - trade.fill_px) * trade.lots * CONTRACT
        trade.pnl -= self.costs.commission_rt * trade.lots
        return trade, events

    def run(self, start=None, end=None):
        balance = self.balance0
        trades, all_events = [], []
        busy_until = None                       # open position blocks sessions
        for si, (a, b) in enumerate(self.sessions):
            if start is not None and a < start:
                continue
            if end is not None and a >= end:
                continue
            if busy_until is not None and a < busy_until:
                continue                        # has_position() gate
            tr, ev = self.run_session(si, balance)
            all_events.extend((a, e) for e in ev)
            if tr is not None:
                if tr.status == "filled":
                    balance += tr.pnl
                    tr.balance_after = balance
                    if self.flatten_mode == "none" and tr.t_exit is not None:
                        busy_until = tr.t_exit
                trades.append(tr)
        return trades, all_events, balance
