"""Broker layer for the DOW bot — the audited ALGAY infrastructure, adapted
to multi-symbol use (DOW_BOT_SPEC.md §7).

Carried over from bot/algay_3_inversion.py (audited + unit-tested there):
  - reconnect-forever with capped backoff, symbol_select on connect
  - retcode-checked order_send with IOC -> RETURN -> FOK filling fallback
  - verified position close with retries
  - tick-flow market-open detection
  - broker-clock offset measurement
  - console + logfile + Telegram alerting (outage-tolerant)
"""

import math
import os
import time as ts
from datetime import datetime, timedelta, timezone

import numpy as np
import requests
import MetaTrader5 as mt

import dow_config as cfg


# ---------------- alerting ----------------
def alert(msg: str) -> None:
    line = f"[{datetime.now():%Y-%m-%d %H:%M:%S}] {msg}"
    print(line, flush=True)
    try:
        with open(cfg.LOG_FILE, "a", encoding="utf-8") as fh:
            fh.write(line + "\n")
    except OSError:
        pass
    if not cfg.TG_BOT_TOKEN or not cfg.TG_CHAT_ID:
        return
    try:
        requests.post(
            f"https://api.telegram.org/bot{cfg.TG_BOT_TOKEN}/sendMessage",
            json={"chat_id": cfg.TG_CHAT_ID, "text": msg}, timeout=10)
    except requests.RequestException as e:
        print(f"telegram failed: {e}", flush=True)


# ---------------- connection ----------------
def connect() -> None:
    """Connect and select all symbols. Never gives up (24/5 hands-off).
    Backoff caps at 5 min; alerts every ~10 failed attempts."""
    attempt = 0
    while True:
        attempt += 1
        if mt.initialize(path=cfg.MT_PATH, login=cfg.MT_LOGIN,
                         password=cfg.MT_PASSWORD, server=cfg.MT_SERVER) \
                and mt.account_info() is not None:
            for sym in cfg.PAIRS:
                if not mt.symbol_select(sym, True):
                    alert(f"WARNING: symbol_select({sym}) failed: {mt.last_error()}")
            print(f"connected to {cfg.MT_SERVER} as {cfg.MT_LOGIN} (attempt {attempt})")
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


def server_offset(symbol: str = None) -> timedelta:
    """Broker-clock offset vs real UTC, rounded to 30 min."""
    tick = mt.symbol_info_tick(symbol or cfg.PAIRS[0])
    if tick is None or not tick.time:
        return timedelta(0)
    raw = tick.time - datetime.now(timezone.utc).timestamp()
    return timedelta(seconds=round(raw / 1800.0) * 1800)


# ---------------- account & market state ----------------
def balance() -> float:
    a = mt.account_info()
    return float(a.balance) if a else 0.0


def equity() -> float:
    a = mt.account_info()
    return float(a.equity) if a else 0.0


_ticks = {}
def market_is_open() -> bool:
    """Open if any enabled pair produced a fresh tick within 180 s."""
    now = ts.time()
    fresh = False
    for sym in cfg.PAIRS:
        tick = mt.symbol_info_tick(sym)
        if tick is None:
            continue
        rec = _ticks.setdefault(sym, {"last": 0, "seen": 0.0})
        if tick.time != rec["last"]:
            rec["last"] = tick.time
            rec["seen"] = now
        if (now - rec["seen"]) < 180:
            fresh = True
    return fresh


def spread_pips(symbol: str):
    tick = mt.symbol_info_tick(symbol)
    if tick is None or not tick.ask or not tick.bid:
        return None
    return (tick.ask - tick.bid) / cfg.PIP[symbol]


def symbol_meta(symbol: str):
    """(point, volume_step, volume_min, volume_max, trade_stops_level) or None."""
    info = mt.symbol_info(symbol)
    if info is None:
        return None
    return (info.point, info.volume_step or 0.01, info.volume_min,
            info.volume_max, info.trade_stops_level or 0)


def daily_atr(symbol: str, period: int = cfg.ATR_PERIOD):
    """ATR over the last `period` CLOSED daily candles (no look-ahead:
    the forming candle is excluded). Returns None if data is insufficient."""
    rates = mt.copy_rates_from_pos(symbol, mt.TIMEFRAME_D1, 0, period + 2)
    if rates is None or len(rates) < period + 2:
        return None
    closed = rates[:-1]                       # drop the forming candle
    h = np.asarray(closed["high"], dtype=float)
    l = np.asarray(closed["low"], dtype=float)
    c = np.asarray(closed["close"], dtype=float)
    tr = np.maximum(h[1:] - l[1:],
                    np.maximum(np.abs(h[1:] - c[:-1]), np.abs(l[1:] - c[:-1])))
    atr = float(tr[-period:].mean())
    return atr if atr > 0 else None


# ---------------- sizing ----------------
def lots_for(bal: float, risk_pct: float, stop_dist: float, symbol: str):
    """Volume for `risk_pct` of balance at `stop_dist`. FLOORED to the step
    (never round risk up). Returns 0.0 (caller must skip + alert) when the
    floored volume is below the broker minimum — spec §4 forbids silently
    over-risking small accounts."""
    meta = symbol_meta(symbol)
    if meta is None or stop_dist <= 0 or bal <= 0:
        return 0.0
    _, step, vmin, vmax, _ = meta
    lots = (bal * risk_pct) / (stop_dist * cfg.CONTRACT_SIZE)
    lots = math.floor(lots / step + 1e-9) * step
    lots = round(lots, 8)
    if lots < vmin:
        return 0.0
    return min(vmax, lots)


# ---------------- orders (retcode-checked, audited pattern) ----------------
def order_send_checked(request: dict, what: str):
    """order_send with result verification. Retries alternative filling modes
    when the broker rejects the requested one. Returns (result, ok)."""
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


def get_position(symbol: str):
    """This bot's open position on `symbol` (magic-tagged), or None."""
    for p in mt.positions_get(symbol=symbol) or []:
        if p.magic == cfg.MAGIC:
            return p
    return None


def market_order(symbol: str, side: str, lots: float, sl: float):
    """Market entry with protective SL attached. Returns (ticket, ok)."""
    tick = mt.symbol_info_tick(symbol)
    if tick is None:
        alert(f"ORDER FAILED ({symbol} {side}): no tick")
        return None, False
    price = tick.ask if side == "BUY" else tick.bid
    res, ok = order_send_checked({
        "action": mt.TRADE_ACTION_DEAL,
        "symbol": symbol,
        "volume": lots,
        "type": mt.ORDER_TYPE_BUY if side == "BUY" else mt.ORDER_TYPE_SELL,
        "price": price,
        "sl": sl,
        "deviation": cfg.DEVIATION,
        "magic": cfg.MAGIC,
        "comment": f"dow {side}",
        "type_filling": mt.ORDER_FILLING_IOC,
    }, f"{symbol} {side} market")
    if not ok:
        return None, False
    for _ in range(6):                 # position may appear with slight latency
        pos = get_position(symbol)
        if pos is not None:
            return pos.ticket, True
        ts.sleep(0.5)
    alert(f"WARNING: {symbol} order accepted but position not visible yet")
    return None, True


def close_position(symbol: str) -> bool:
    """Close this bot's position on `symbol` — verified, with retries
    (audited ALGAY flatten pattern). Returns True when flat."""
    for attempt in range(3):
        pos = get_position(symbol)
        if pos is None:
            return True
        tick = mt.symbol_info_tick(symbol)
        if tick is None:
            ts.sleep(2)
            continue
        res, ok = order_send_checked({
            "action": mt.TRADE_ACTION_DEAL,
            "position": pos.ticket,
            "symbol": symbol,
            "volume": pos.volume,
            "type": mt.ORDER_TYPE_SELL if pos.type == mt.ORDER_TYPE_BUY else mt.ORDER_TYPE_BUY,
            "price": tick.bid if pos.type == mt.ORDER_TYPE_BUY else tick.ask,
            "deviation": cfg.DEVIATION,
            "type_filling": mt.ORDER_FILLING_IOC,
        }, f"close {symbol} #{pos.ticket}")
        if ok:
            alert(f"closed {symbol} #{pos.ticket} (P&L was {pos.profit:+.2f})")
        ts.sleep(2 if not ok else 0.5)
    if get_position(symbol) is not None:
        alert(f"CRITICAL: {symbol} position still open after 3 close attempts "
              f"- close manually NOW")
        return False
    return True


def flatten_all() -> bool:
    ok = True
    for sym in cfg.PAIRS:
        ok = close_position(sym) and ok
    return ok


def kill_file_present() -> bool:
    return os.path.exists(cfg.KILL_FILE)
