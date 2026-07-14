"""
algay 3.0 "inversion" - EURUSD mean-reversion bot (15M chart, 4H sessions)
============================================================================
!! AUDIT WARNING (2026-07-14) !!
The backtest quoted below (Jan 2023 - Jul 2026, 793 trades, 12/15 quarters
positive, ~84% wins) could only be reproduced by a simulation that uses each
Williams fractal at its own bar time - i.e. FOUR BARS BEFORE it is knowable
(look-ahead bias) - and that skips the session flatten. A faithful
re-simulation of THIS code over the same period produced 381 trades, 49%
wins and -29% total return under realistic costs (and -12% with zero costs).
See backtest/REPORT.md and AUDIT.md before risking real funds.
============================================================================
This is the INVERTED version of the original strategy, exactly as backtested
(Jan 2023 - Jul 2026, 793 trades, 12/15 quarters positive).

LOGIC PER 4H SESSION (candles at 00/04/08/12/16/20 server time = 10pm UK anchor):
 1. Reference = high/low of the last COMPLETED 4H candle.
 2. Watch closed 15M candles. A close-period candle breaking the 4H high
    starts a SHORT setup (inverted long); breaking the 4H low starts a
    LONG setup (inverted short). Lock the latest confirmed opposite
    Williams fractal (period 4) at that moment.
 3. Wait for a NEW same-side fractal to confirm after the sweep.
    EQUAL-LEVEL FILTER: if that fractal is within 1 pip of any same-side
    fractal from the last 24h (96 bars), that direction is dead this session.
 4. Entry level = 70.5% fib between new fractal and locked fractal.
    INVERTED: place a STOP order through the level -
      long-sweep  -> SELL STOP at level | TP = locked fractal | SL = new fractal
      short-sweep -> BUY  STOP at level | TP = locked fractal | SL = new fractal
    (reward:risk ~= 0.42:1)
 5. NEAR-MISS RULE: price within 2 pips of entry without triggering -> cancel,
    nothing more until the next 4H candle.
 6. No new orders in the final 10 min of the session (pendings cancelled);
    open positions force-closed 5 min before the next 4H candle.
 7. Max ONE trade per session. Risk = 1% of account balance per trade.

SESSION TIMING: session boundaries are hard-anchored to 10pm/2am/6am/10am/2pm/6pm
UK time (Europe/London, DST-aware) via current_session_open() - NOT inferred from
the broker's own H4 candle timestamps, which can drift from this fixed schedule.
"now" for all timing decisions (flatten, entry cutoff, near-miss) comes from the
machine's real UTC clock, not broker tick data, since demo-server tick clocks can
run ahead of real time. Keep NTP enabled on the VPS.

Runs 24/5 hands-off: auto-detects market open/close by tick flow,
self-reconnects (forever, with capped backoff), survives errors and Telegram
outages, checks every order result, verifies flatten, and persists per-session
state so a crash/restart cannot double-trade a session.

Credentials via environment variables (NEVER hardcode):
  MT_LOGIN, MT_PASSWORD, MT_SERVER, MT_PATH, TG_BOT_TOKEN, TG_CHAT_ID
"""

import json
import math
import os
import time as ts
from datetime import datetime, timedelta, timezone
from zoneinfo import ZoneInfo

import numpy as np
import pandas as pd
import requests
import MetaTrader5 as mt

# ---------------- config ----------------
SYMBOL = "EURUSD"
FRACTAL_PERIOD = 4
FIB = 0.705
RISK_PER_TRADE = 0.01            # 1% of balance per trade (USD account assumed)
EQ_TOL = 0.0001                  # 1 pip: "equal" highs/lows
NEAR_MISS = 0.0002               # 2 pips: near-miss cancel
EQ_LOOKBACK_BARS = 96            # 24h of 15M bars for the equal filter
NO_TRADE_FINAL_SEC = 10 * 60     # no new orders in last 10 min of session
FLATTEN_BEFORE_SEC = 5 * 60      # close positions 5 min before next 4H candle
POLL_SECONDS = 20
CONTRACT_SIZE = 100_000
MAGIC = 30                       # order tag for this bot
UK_TZ = ZoneInfo("Europe/London")
SESSION_ANCHOR_HOURS_UK = (22, 2, 6, 10, 14, 18)  # 10pm/2am/6am/10am/2pm/6pm UK, every 4h
STATE_FILE = os.path.join(os.path.dirname(os.path.abspath(__file__)), "algay_state.json")


def current_session_open() -> datetime:
    """Most recent 4H session boundary, hard-anchored to 10pm/2am/6am/10am/2pm/6pm
    UK time (Europe/London, DST-aware) - NOT derived from broker candle timestamps,
    which can drift from this fixed schedule. Returned as naive UTC (matches candle
    timestamp convention used elsewhere in this file)."""
    now_uk = datetime.now(UK_TZ)
    best = None
    for day_offset in (-1, 0):
        d = now_uk.date() + timedelta(days=day_offset)
        for h in SESSION_ANCHOR_HOURS_UK:
            cand = datetime(d.year, d.month, d.day, h, 0, 0, tzinfo=UK_TZ)
            if cand <= now_uk and (best is None or cand > best):
                best = cand
    return best.astimezone(timezone.utc).replace(tzinfo=None)

MT_LOGIN = int(os.environ.get("MT_LOGIN", "0"))
MT_PASSWORD = os.environ.get("MT_PASSWORD", "")
MT_SERVER = os.environ.get("MT_SERVER", "FTMO-Demo")
MT_PATH = os.environ.get("MT_PATH", r"C:\Program Files\MetaTrader 5\terminal64.exe")
TG_BOT_TOKEN = os.environ.get("TG_BOT_TOKEN", "")
TG_CHAT_ID = os.environ.get("TG_CHAT_ID", "")


# ---------------- infrastructure ----------------
def alert(msg: str) -> None:
    print(f"[{datetime.now():%Y-%m-%d %H:%M:%S}] {msg}", flush=True)
    if not TG_BOT_TOKEN or not TG_CHAT_ID:
        return
    try:
        requests.post(f"https://api.telegram.org/bot{TG_BOT_TOKEN}/sendMessage",
                      json={"chat_id": TG_CHAT_ID, "text": msg}, timeout=10)
    except requests.RequestException as e:
        print(f"telegram failed: {e}", flush=True)


def connect() -> None:
    """Connect and select the symbol. Never gives up: a 24/5 hands-off bot must
    survive VPS/broker outages of any length. Backoff caps at 5 min; alerts
    every ~10 failed attempts."""
    attempt = 0
    while True:
        attempt += 1
        if mt.initialize(path=MT_PATH, login=MT_LOGIN, password=MT_PASSWORD,
                         server=MT_SERVER) and mt.account_info() is not None:
            if not mt.symbol_select(SYMBOL, True):
                alert(f"WARNING: symbol_select({SYMBOL}) failed: {mt.last_error()}")
            print(f"connected to {MT_SERVER} as {MT_LOGIN} (attempt {attempt})")
            return
        err = mt.last_error()
        mt.shutdown()
        if attempt % 10 == 1:
            alert(f"MT5 connect attempt {attempt} failed: {err} - retrying")
        ts.sleep(min(60 * attempt, 300))


def ensure_connected() -> None:
    if mt.terminal_info() is None or mt.account_info() is None:
        alert("MT5 connection lost - reconnecting")
        mt.shutdown()
        connect()
        alert("MT5 reconnected")


def server_offset() -> timedelta:
    """Broker-clock offset vs real UTC, rounded to 30 min (absorbs stale ticks).
    Broker candle/tick times are server-local rendered as epoch; e.g. an EET
    broker in summer is +3h. Returns 0 if no tick is available."""
    tick = mt.symbol_info_tick(SYMBOL)
    if tick is None or not tick.time:
        return timedelta(0)
    raw = tick.time - datetime.now(timezone.utc).timestamp()
    return timedelta(seconds=round(raw / 1800.0) * 1800)


# ---------------- market data ----------------
def get_candles(tf, count: int) -> pd.DataFrame | None:
    rates = mt.copy_rates_from_pos(SYMBOL, tf, 0, count)
    if rates is None or len(rates) == 0:
        return None
    d = pd.DataFrame(rates)
    d["time"] = pd.to_datetime(d["time"], unit="s")  # server time
    return d


def server_now() -> datetime:
    """True machine UTC clock - used for ALL session-timing decisions (flatten,
    entry cutoff, near-miss deadlines). Deliberately NOT derived from broker tick
    data: this demo server's tick clock runs well ahead of real time, which was
    causing sessions to be declared "over" hours early. Session boundaries are
    fixed to the real-world 10pm/2am/6am/10am/2pm/6pm UK schedule (see
    current_session_open()), so "now" must be real-world time too."""
    return datetime.now(timezone.utc).replace(tzinfo=None)


_tick = {"last": 0, "seen": 0.0}
def market_is_open() -> bool:
    tick = mt.symbol_info_tick(SYMBOL)
    now = ts.time()
    if tick is None:
        return False
    if tick.time != _tick["last"]:
        _tick["last"] = tick.time
        _tick["seen"] = now
    return (now - _tick["seen"]) < 180


def fractals(df: pd.DataFrame, n: int = FRACTAL_PERIOD) -> pd.DataFrame:
    high, low = df["high"], df["low"]
    up = pd.Series(True, index=df.index)
    dn = pd.Series(True, index=df.index)
    for j in range(1, n + 1):
        up &= (high > high.shift(j)) & (high > high.shift(-j))
        dn &= (low < low.shift(j)) & (low < low.shift(-j))
    out = df.copy()
    out["up_fr"] = np.where(up, high, np.nan)
    out["dn_fr"] = np.where(dn, low, np.nan)
    return out


def is_equal_level(fr_price: float, series: pd.Series, fr_pos: int) -> bool:
    """True if fr_price is within EQ_TOL of any same-side fractal in the
    previous EQ_LOOKBACK_BARS bars (rule: equal highs/lows kill the setup)."""
    lo = max(0, fr_pos - EQ_LOOKBACK_BARS)
    window = series.iloc[lo:fr_pos].dropna()
    return bool((window.sub(fr_price).abs() <= EQ_TOL).any())


# ---------------- session state (crash-safe one-trade-per-session) ----------------
def load_state() -> dict:
    try:
        with open(STATE_FILE) as fh:
            return json.load(fh)
    except (OSError, ValueError):
        return {}


def save_state(session_open: datetime, traded: bool) -> None:
    try:
        with open(STATE_FILE, "w") as fh:
            json.dump({"session_open": session_open.isoformat(), "traded": traded}, fh)
    except OSError as e:
        alert(f"WARNING: could not persist session state: {e}")


# ---------------- orders ----------------
def lot_size(entry: float, sl: float) -> float:
    acct, info = mt.account_info(), mt.symbol_info(SYMBOL)
    if acct is None or info is None:
        return 0.0
    dist = abs(entry - sl)
    if dist <= 0:
        return 0.0
    lots = (acct.balance * RISK_PER_TRADE) / (dist * CONTRACT_SIZE)
    step = info.volume_step or 0.01
    # FLOOR to the step: rounding to nearest can push risk above RISK_PER_TRADE
    lots = math.floor(lots / step + 1e-9) * step
    if lots < info.volume_min:
        alert(f"WARNING: computed volume {lots:.2f} below broker min "
              f"{info.volume_min} - trading min volume risks MORE than "
              f"{RISK_PER_TRADE * 100:.1f}% on this stop distance")
        lots = info.volume_min
    return round(min(info.volume_max, lots), 2)


def order_send_checked(request: dict, what: str):
    """order_send with result verification. Retries alternative filling modes
    when the broker rejects the hardcoded one. Returns (result, ok)."""
    fillings = [request.get("type_filling")]
    for alt in (mt.ORDER_FILLING_RETURN, mt.ORDER_FILLING_FOK):
        if alt not in fillings:
            fillings.append(alt)
    res = None
    for f in fillings:
        if f is not None:
            request["type_filling"] = f
        res = mt.order_send(request)
        if res is None:
            alert(f"ORDER FAILED ({what}): order_send returned None: {mt.last_error()}")
            return None, False
        if res.retcode in (mt.TRADE_RETCODE_DONE, mt.TRADE_RETCODE_PLACED):
            return res, True
        if res.retcode != mt.TRADE_RETCODE_INVALID_FILL:
            break                      # a different problem - retrying won't help
    alert(f"ORDER REJECTED ({what}): retcode {getattr(res, 'retcode', '?')} "
          f"{getattr(res, 'comment', '')}")
    return res, False


def place_stop(direction: str, price: float, tp: float, sl: float, lots: float):
    """Inverted entries trade THROUGH the level -> stop orders.
    sell stop must be below market, buy stop above; caller checks validity."""
    order = {
        "action": mt.TRADE_ACTION_PENDING,
        "symbol": SYMBOL,
        "volume": lots,
        "type": mt.ORDER_TYPE_SELL_STOP if direction == "sell" else mt.ORDER_TYPE_BUY_STOP,
        "price": price,
        "tp": tp,
        "sl": sl,
        "deviation": 20,
        "magic": MAGIC,
        "comment": f"algay3 {direction} stop",
        "type_time": mt.ORDER_TIME_GTC,
        "type_filling": mt.ORDER_FILLING_IOC,
    }
    return order_send_checked(order, f"{direction} stop")


def stops_ok(direction: str, level: float, tp: float, sl: float) -> bool:
    """Geometry + broker minimum-stop-distance sanity before firing an order
    the server would reject ('invalid stops')."""
    if direction == "sell":
        good = tp < level < sl
    else:
        good = sl < level < tp
    if not good:
        return False
    info = mt.symbol_info(SYMBOL)
    if info is not None and info.trade_stops_level:
        min_dist = info.trade_stops_level * info.point
        if abs(level - tp) < min_dist or abs(level - sl) < min_dist:
            return False
    return True


def cancel_pendings() -> None:
    for o in mt.orders_get(symbol=SYMBOL) or []:
        if o.magic == MAGIC:
            order_send_checked({"action": mt.TRADE_ACTION_REMOVE, "order": o.ticket},
                               f"cancel #{o.ticket}")


def flatten() -> None:
    """Cancel pendings and close positions - verified, with retries. The
    strategy contract requires being flat at the session boundary."""
    cancel_pendings()
    for attempt in range(3):
        remaining = [p for p in mt.positions_get(symbol=SYMBOL) or [] if p.magic == MAGIC]
        if not remaining:
            return
        for p in remaining:
            tick = mt.symbol_info_tick(SYMBOL)
            if tick is None:
                continue
            res, ok = order_send_checked({
                "action": mt.TRADE_ACTION_DEAL,
                "position": p.ticket,
                "symbol": SYMBOL,
                "volume": p.volume,
                "type": mt.ORDER_TYPE_SELL if p.type == mt.ORDER_TYPE_BUY else mt.ORDER_TYPE_BUY,
                "price": tick.bid if p.type == mt.ORDER_TYPE_BUY else tick.ask,
                "deviation": 20,
                "type_filling": mt.ORDER_FILLING_IOC,
            }, f"flatten #{p.ticket}")
            if ok:
                alert(f"flattened position {p.ticket}")
        ts.sleep(2)
    if any(p.magic == MAGIC for p in mt.positions_get(symbol=SYMBOL) or []):
        alert("CRITICAL: position still open after 3 flatten attempts - "
              "close manually NOW")


def has_position() -> bool:
    return any(p.magic == MAGIC for p in mt.positions_get(symbol=SYMBOL) or [])


def has_pending() -> bool:
    return any(o.magic == MAGIC for o in mt.orders_get(symbol=SYMBOL) or [])


# ---------------- one 4H session ----------------
def get_reference(session_open: datetime):
    """High/low of the last COMPLETED 4H candle, guarded against the
    session-boundary race: right after the boundary the broker may not have
    opened the new H4 bar yet, in which case iloc[-2] is the wrong candle.
    Verifies the candle's open time against the expected server-clock time,
    retries briefly, then falls back to aggregating M15 bars."""
    off = server_offset()
    expected = session_open + off - timedelta(hours=4)   # server-time open of ref bar
    for _ in range(6):
        h4 = get_candles(mt.TIMEFRAME_H4, 6)
        if h4 is not None and len(h4) >= 2:
            ref = h4.iloc[-2]
            if ref["time"] == expected:
                return float(ref["high"]), float(ref["low"])
            # boundary race: the new H4 bar hasn't printed yet, so iloc[-1]
            # is still the reference candle - wait for the bar to roll over
            if h4.iloc[-1]["time"] == expected:
                ts.sleep(20)
                continue
            break   # broker H4 grid doesn't match the UK anchor -> fallback
        ts.sleep(20)
    # fallback: build the reference from M15 bars of the previous session
    m15 = get_candles(mt.TIMEFRAME_M15, 40)
    if m15 is None or m15.empty:
        return None
    lo_t, hi_t = expected, session_open + off
    win = m15[(m15["time"] >= lo_t) & (m15["time"] < hi_t)]
    if win.empty:
        return None
    alert("H4 reference built from M15 bars (broker H4 candle not aligned/ready)")
    return float(win["high"].max()), float(win["low"].min())


def run_session(skip_trading: bool = False) -> None:
    ensure_connected()

    session_open = current_session_open()  # fixed 10pm/2am/6am/10am/2pm/6pm UK anchor, not broker-derived
    session_end = session_open + timedelta(hours=4)
    entry_cutoff = session_end - timedelta(seconds=NO_TRADE_FINAL_SEC)
    flatten_at = session_end - timedelta(seconds=FLATTEN_BEFORE_SEC)

    ref = get_reference(session_open)
    if ref is None:
        ts.sleep(30)
        return
    ref_hi, ref_lo = ref

    alert(f"--- 4H session {session_open} | ref hi {ref_hi} lo {ref_lo} ---")

    swept = None; locked = None; sweep_time = None
    traded = False
    dead = {"L": False, "S": False}
    session_dead = False
    # crash-safe one-trade-per-session: honour persisted state after a restart
    st = load_state()
    if st.get("session_open") == session_open.isoformat() and st.get("traded"):
        traded = True
        alert("state file says this session already traded - standing down")
    else:
        save_state(session_open, False)
    if skip_trading:
        dead["L"] = True; dead["S"] = True
        alert(f"skipping session {session_open} (already in progress at startup) - will trade starting next 4H candle")
    entry_level = None; entry_side = None
    last_15m = None

    while True:
        now = server_now()
        if not market_is_open():
            alert("market closed mid-session - flattening")
            flatten()
            return

        # hard exits
        if now >= flatten_at:
            flatten()
            alert("session over - flattened 5 min before next 4H candle")
            while (sn := server_now()) is not None and sn < session_end:
                ts.sleep(10)
            ts.sleep(30)  # safety: never spin instantly even if session_end already passed
            return
        if now >= entry_cutoff and has_pending():
            cancel_pendings()
            alert("final 10 min - pending order cancelled")

        m15 = get_candles(mt.TIMEFRAME_M15, 300)
        if m15 is None or len(m15) < 2 * FRACTAL_PERIOD + 2:
            ts.sleep(POLL_SECONDS)
            continue
        closed = m15.iloc[:-1]
        last = closed.iloc[-1]
        if last_15m == last["time"]:
            ts.sleep(POLL_SECONDS)
            continue
        last_15m = last["time"]

        # near-miss check on the freshly closed candle (only while pending exists)
        if has_pending() and entry_level is not None and not has_position():
            if entry_side == "sell" and last["low"] > entry_level and \
               last["low"] <= entry_level + NEAR_MISS:
                cancel_pendings(); session_dead = True
                alert(f"near miss ({last['low']:.5f} vs {entry_level:.5f}) - cancelled, session dead")
            elif entry_side == "buy" and last["high"] < entry_level and \
                 last["high"] >= entry_level - NEAR_MISS:
                cancel_pendings(); session_dead = True
                alert(f"near miss ({last['high']:.5f} vs {entry_level:.5f}) - cancelled, session dead")

        if traded or session_dead or now >= entry_cutoff:
            ts.sleep(POLL_SECONDS)
            continue

        fr = fractals(closed)
        ups = fr.dropna(subset=["up_fr"])
        dns = fr.dropna(subset=["dn_fr"])
        if ups.empty or dns.empty:
            ts.sleep(POLL_SECONDS)
            continue

        # 1) sweep detection (only counts inside session, only closed candles).
        # Candle stamps are SERVER time; convert to UTC before comparing with
        # the UTC session anchor (on a UTC-or-behind broker the raw comparison
        # would silently reject genuine in-session bars).
        last_utc = last["time"].to_pydatetime() - server_offset()
        if swept is None and last_utc >= session_open:
            if last["high"] > ref_hi and not dead["L"]:
                swept, sweep_time = "L", last["time"]
                locked = float(dns.iloc[-1]["dn_fr"])
                alert(f"sweep of 4H high @ {sweep_time} - locked down-fractal {locked}")
            elif last["low"] < ref_lo and not dead["S"]:
                swept, sweep_time = "S", last["time"]
                locked = float(ups.iloc[-1]["up_fr"])
                alert(f"sweep of 4H low @ {sweep_time} - locked up-fractal {locked}")

        # 2) new fractal -> equal filter -> INVERTED stop order
        if swept and not has_pending() and not has_position():
            if swept == "L" and ups.iloc[-1]["time"] >= sweep_time:
                fr_price = float(ups.iloc[-1]["up_fr"])
                pos_in_fr = fr.index.get_loc(ups.index[-1])
                if is_equal_level(fr_price, fr["up_fr"], pos_in_fr):
                    dead["L"] = True; swept = None
                    alert("equal highs - long-sweep setup dead this session")
                else:
                    level = round(fr_price - (fr_price - locked) * FIB, 5)
                    tick = mt.symbol_info_tick(SYMBOL)
                    if tick and level < tick.bid and stops_ok("sell", level, locked, fr_price):
                        lots = lot_size(level, fr_price)
                        res, ok = place_stop("sell", level, tp=locked, sl=fr_price, lots=lots)
                        alert(f"SELL STOP {lots} @ {level} | TP {locked} SL {fr_price} | "
                              f"{'placed' if ok else 'REJECTED'}")
                        if ok:
                            entry_level, entry_side = level, "sell"
                    else:
                        alert(f"sell stop {level} invalid vs market/stops - skipped")
                    traded = True
                    save_state(session_open, True)
            elif swept == "S" and dns.iloc[-1]["time"] >= sweep_time:
                fr_price = float(dns.iloc[-1]["dn_fr"])
                pos_in_fr = fr.index.get_loc(dns.index[-1])
                if is_equal_level(fr_price, fr["dn_fr"], pos_in_fr):
                    dead["S"] = True; swept = None
                    alert("equal lows - short-sweep setup dead this session")
                else:
                    level = round(fr_price + (locked - fr_price) * FIB, 5)
                    tick = mt.symbol_info_tick(SYMBOL)
                    if tick and level > tick.ask and stops_ok("buy", level, locked, fr_price):
                        lots = lot_size(level, fr_price)
                        res, ok = place_stop("buy", level, tp=locked, sl=fr_price, lots=lots)
                        alert(f"BUY STOP {lots} @ {level} | TP {locked} SL {fr_price} | "
                              f"{'placed' if ok else 'REJECTED'}")
                        if ok:
                            entry_level, entry_side = level, "buy"
                    else:
                        alert(f"buy stop {level} invalid vs market/stops - skipped")
                    traded = True
                    save_state(session_open, True)

        ts.sleep(POLL_SECONDS)


# ---------------- 24/5 main ----------------
def main() -> None:
    if MT_LOGIN == 0 or not MT_PASSWORD:
        raise SystemExit("Set MT_LOGIN and MT_PASSWORD environment variables first.")
    connect()
    alert(f"algay 3.0 INVERSION started | 15M chart | risk {RISK_PER_TRADE*100:.1f}% | "
          f"24/5 | broker clock offset vs UTC: {server_offset()}")
    closed_notice = False
    first_session = True
    while True:
        try:
            if market_is_open():
                closed_notice = False
                run_session(skip_trading=first_session)
                first_session = False
            else:
                if not closed_notice:
                    alert("market closed - sleeping until reopen")
                    closed_notice = True
                ts.sleep(60)
        except SystemExit:
            raise
        except Exception as e:
            alert(f"ERROR (recovering): {type(e).__name__}: {e}")
            ts.sleep(30)
            ensure_connected()


if __name__ == "__main__":
    main()
