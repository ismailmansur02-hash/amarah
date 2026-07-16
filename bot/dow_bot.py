"""DOW bot — day-of-week EUR/GBP bot for FTMO MT5 (built to DOW_BOT_SPEC.md).

Strategy (frozen, validated on real FTMO GBP + FMP EUR 5-min data):
  Monday  -> BUY  EURUSD & GBPUSD   (USD tends weak on Mondays)
  Wednesday -> SELL EURUSD & GBPUSD (USD tends strong on Wednesdays)
  Enter at 00:15 Europe/London (never after 01:15), protective stop at
  1.5 x ATR14(daily), time-exit 21:45 London — always flat before the 22:00
  rollover (no swap, no overnight/weekend exposure). Max one entry per pair
  per day; 0.5% of balance risked per pair; red-news days skipped.

Run:      python bot/dow_bot.py
Halt:     create a file named KILL in the bot directory (flattens + exits)
Un-halt:  python bot/dow_bot.py --reset-halt   (after a risk-halt, deliberate)

Requires the FTMO MT5 terminal running & logged in on this Windows machine,
credentials in dow_config.py / environment (see DOW_BOT_README.md).
"""

import json
import os
import sys
import time as ts
from datetime import datetime, timedelta, timezone
from zoneinfo import ZoneInfo

import dow_config as cfg
import broker as br
from news_filter import Calendar

UK_TZ = ZoneInfo("Europe/London")


# ---------------- time helpers (all scheduling in Europe/London) ----------------
def now_london() -> datetime:
    """Real machine UTC clock -> London. NEVER broker/tick time (spec §2)."""
    return datetime.now(timezone.utc).astimezone(UK_TZ)


def day_anchor(now_lon: datetime, hm) -> datetime:
    return now_lon.replace(hour=hm[0], minute=hm[1], second=0, microsecond=0)


def window_times(now_lon: datetime):
    """(entry_start, entry_late_cutoff, exit_at) for now's London day."""
    return (day_anchor(now_lon, cfg.ENTRY_LON),
            day_anchor(now_lon, cfg.ENTRY_LATE_CUTOFF_LON),
            day_anchor(now_lon, cfg.EXIT_LON))


def entry_phase(now_lon: datetime) -> str:
    """'pre' | 'window' | 'late' | 'exit' for the current London moment."""
    start, late, exit_at = window_times(now_lon)
    if now_lon < start:
        return "pre"
    if now_lon < late:
        return "window"
    if now_lon < exit_at:
        return "late"
    return "exit"


def side_for(now_lon: datetime):
    """'BUY' (Mon) / 'SELL' (Wed) / None — weekday judged in LONDON time."""
    return cfg.SIDE_BY_WEEKDAY.get(now_lon.weekday())


def compute_stop_dist(atr: float, stops_level: int, point: float) -> float:
    """K_ATR x ATR, widened to the broker minimum stop distance if ever
    needed (sizing uses the final distance, so risk never exceeds target)."""
    dist = cfg.K_ATR * atr
    if stops_level:
        dist = max(dist, (stops_level + 2) * point)
    return dist


# ---------------- persistent state (crash-safe, spec §8) ----------------
def fresh_pair_state():
    return {"status": "idle", "ticket": None, "entry_px": None, "sl": None,
            "lots": None, "risk_pct": 0.0, "reason": "", "attempts": 0}


def fresh_state(today_str, start_balance, peak):
    return {"london_date": today_str,
            "pairs": {p: fresh_pair_state() for p in cfg.PAIRS},
            "day_halted": False, "bot_halted": False, "halt_reason": "",
            "day_start_balance": start_balance, "peak_equity": peak,
            "consec_losses": 0, "day_had_fill": False}


def load_state():
    try:
        with open(cfg.STATE_FILE, encoding="utf-8") as fh:
            return json.load(fh)
    except (OSError, ValueError):
        return None


def save_state(state) -> None:
    try:
        tmp = cfg.STATE_FILE + ".tmp"
        with open(tmp, "w", encoding="utf-8") as fh:
            json.dump(state, fh, indent=1)
        os.replace(tmp, cfg.STATE_FILE)
    except OSError as e:
        br.alert(f"WARNING: could not persist state: {e}")


# ---------------- risk cap (spec §3) ----------------
def open_risk_pct(state) -> float:
    return sum(ps.get("risk_pct", 0.0) for ps in state["pairs"].values()
               if ps["status"] == "open")


# ---------------- entries & exits ----------------
def maybe_enter(state, pair, now_lon, cal):
    ps = state["pairs"][pair]
    phase = entry_phase(now_lon)
    if phase == "pre":
        return
    if phase in ("late", "exit"):
        ps["status"] = "closed"
        ps["reason"] = "late_start_no_entry"
        br.alert(f"{pair}: entry window missed today - standing down "
                 f"(never chase a late entry)")
        return

    side = side_for(now_lon)
    entry_start, _, exit_at = window_times(now_lon)

    # red-day filter first (decisive for the whole day)
    blocked, why = cal.is_blocked(pair, entry_start, exit_at)
    if blocked:
        ps["status"] = "blocked"
        ps["reason"] = why
        br.alert(f"{pair}: SKIPPED today - {why}")
        return

    # duplicate-order protection: state AND a live-position check
    if br.get_position(pair) is not None:
        ps["status"] = "open"
        ps["reason"] = "adopted_unexpected_position"
        br.alert(f"WARNING: {pair} already has a live position - adopting")
        return

    # spread guard: transient by nature -> retry on the next poll while the
    # window is open (skipping the whole day on a 1-second spike would be
    # worse than the spec's intent of avoiding spike ENTRY)
    sp = br.spread_pips(pair)
    if sp is None or sp > cfg.MAX_SPREAD_PIPS[pair]:
        br.alert(f"{pair}: spread {sp if sp is not None else 'n/a'} pips > "
                 f"{cfg.MAX_SPREAD_PIPS[pair]} - waiting (retry in window)")
        return

    # hard cap on total open risk
    if open_risk_pct(state) + cfg.RISK_PER_PAIR > cfg.MAX_DAILY_RISK + 1e-9:
        ps["status"] = "blocked"
        ps["reason"] = "daily_risk_cap"
        br.alert(f"{pair}: entry refused - MAX_DAILY_RISK would be breached")
        return

    atr = br.daily_atr(pair)
    if atr is None:
        br.alert(f"{pair}: no ATR data yet - retrying")
        return
    meta = br.symbol_meta(pair)
    if meta is None:
        br.alert(f"{pair}: no symbol info - retrying")
        return
    point, _, _, _, stops_level = meta
    stop_dist = compute_stop_dist(atr, stops_level, point)

    bal = br.balance()
    lots = br.lots_for(bal, cfg.RISK_PER_PAIR, stop_dist, pair)
    if lots <= 0:
        ps["status"] = "blocked"
        ps["reason"] = "volume_below_min"
        br.alert(f"{pair}: computed volume below broker minimum - SKIPPING "
                 f"(will not silently over-risk)")
        return

    tick_ref = br.spread_pips(pair)          # cheap liveness re-check
    if tick_ref is None:
        return
    # reference price for the SL from the current tick side
    import MetaTrader5 as mt                 # local import keeps tests simple
    tick = mt.symbol_info_tick(pair)
    ref_px = tick.ask if side == "BUY" else tick.bid
    sl = ref_px - stop_dist if side == "BUY" else ref_px + stop_dist

    ticket, ok = br.market_order(pair, side, lots, sl)
    if not ok:
        ps["attempts"] += 1
        if ps["attempts"] >= cfg.MAX_ENTRY_ATTEMPTS:
            ps["status"] = "blocked"
            ps["reason"] = "order_rejected"
            br.alert(f"{pair}: {ps['attempts']} rejected orders - standing "
                     f"down for the day")
        return
    ps.update(status="open", ticket=ticket, entry_px=ref_px, sl=sl, lots=lots,
              risk_pct=cfg.RISK_PER_PAIR)
    state["day_had_fill"] = True
    br.alert(f"ENTER {side} {pair} {lots} @ ~{ref_px:.5f} | SL {sl:.5f} "
             f"({stop_dist / cfg.PIP[pair]:.0f} pips = {cfg.K_ATR}xATR) | "
             f"exit {cfg.EXIT_LON[0]:02d}:{cfg.EXIT_LON[1]:02d} London")


def manage_open(state, pair, now_lon):
    ps = state["pairs"][pair]
    pos = br.get_position(pair)
    if pos is None:                          # protective stop took it out
        ps["status"] = "closed"
        ps["reason"] = "stop_hit"
        br.alert(f"{pair}: position gone before time-exit (protective stop "
                 f"hit) - done for the day")
        return
    _, _, exit_at = window_times(now_lon)
    if now_lon >= exit_at:
        if br.close_position(pair):
            ps["status"] = "closed"
            ps["reason"] = "time_exit"
        # on failure close_position already alerted CRITICAL; retry next poll


# ---------------- day rollover & halts ----------------
def finish_day(state):
    """Consecutive-loss accounting at London-midnight rollover. Only days
    that actually traded count toward the streak (spec §6)."""
    if not state.get("day_had_fill"):
        return
    day_pnl = br.equity() - state.get("day_start_balance", br.equity())
    if day_pnl < 0:
        state["consec_losses"] = state.get("consec_losses", 0) + 1
        br.alert(f"day closed {day_pnl:+.2f} USD - losing day "
                 f"#{state['consec_losses']} in a row")
        if state["consec_losses"] >= cfg.MAX_CONSEC_LOSSES:
            state["bot_halted"] = True
            state["halt_reason"] = (f"{state['consec_losses']} consecutive "
                                    f"losing days - possible regime decay")
            br.alert(f"CRITICAL: {state['halt_reason']} - BOT HALTED. Review "
                     f"before restarting (python dow_bot.py --reset-halt)")
    else:
        state["consec_losses"] = 0
        br.alert(f"day closed {day_pnl:+.2f} USD")


def enforce_halts(state) -> bool:
    """Drawdown & daily halts (spec §6). Returns True when trading may go on."""
    eq = br.equity()
    if eq <= 0:
        return False
    state["peak_equity"] = max(state.get("peak_equity", eq), eq)
    if eq <= state["peak_equity"] * (1 - cfg.MAX_DD_HALT) and not state["bot_halted"]:
        br.flatten_all()
        state["bot_halted"] = True
        state["halt_reason"] = (f"equity {eq:,.0f} is {cfg.MAX_DD_HALT*100:.0f}% "
                                f"below peak {state['peak_equity']:,.0f}")
        br.alert(f"CRITICAL: {state['halt_reason']} - FLATTENED & BOT HALTED. "
                 f"Manual review required (--reset-halt to resume).")
        return False
    day_base = state.get("day_start_balance") or eq
    if not state["day_halted"] and eq <= day_base * (1 - cfg.DAILY_HALT):
        br.flatten_all()
        for ps in state["pairs"].values():
            if ps["status"] == "open":
                ps["status"] = "closed"
                ps["reason"] = "daily_halt"
        state["day_halted"] = True
        br.alert(f"daily halt: equity {eq:,.0f} is {cfg.DAILY_HALT*100:.0f}% "
                 f"below day start {day_base:,.0f} - done for the day")
    return not state["bot_halted"]


# ---------------- startup reconciliation (spec §8.7 / §9) ----------------
def startup_reconcile(state, now_lon):
    today = now_lon.date().isoformat()
    _, _, exit_at = window_times(now_lon)
    for pair in cfg.PAIRS:
        pos = br.get_position(pair)
        ps = state["pairs"].get(pair, fresh_pair_state()) if state else None
        same_day_open = (state is not None and state.get("london_date") == today
                         and ps is not None and ps.get("status") == "open")
        if pos is not None:
            if same_day_open and now_lon < exit_at:
                br.alert(f"startup: adopting live {pair} position #{pos.ticket}")
            else:
                br.alert(f"startup: stale/unknown {pair} position #{pos.ticket} "
                         f"- closing now")
                br.close_position(pair)
                if same_day_open:
                    ps["status"] = "closed"
                    ps["reason"] = "closed_on_restart"
        elif same_day_open:
            ps["status"] = "closed"
            ps["reason"] = "closed_while_down"
            br.alert(f"startup: {pair} position from state no longer exists "
                     f"(stop hit while bot was down)")


# ---------------- one poll (spec §8) ----------------
def poll_once(state, cal, now_lon=None):
    br.ensure_connected()
    if br.kill_file_present():
        br.alert("KILL file found - flattening everything and exiting")
        br.flatten_all()
        save_state(state)
        raise SystemExit(0)

    now_lon = now_lon or now_london()
    today = now_lon.date().isoformat()

    # London-midnight rollover: settle yesterday, reset today, refresh calendar
    if state["london_date"] != today:
        finish_day(state)
        eq = br.equity()
        keep_peak = state.get("peak_equity", eq)
        halted, why = state.get("bot_halted", False), state.get("halt_reason", "")
        consec = state.get("consec_losses", 0)
        state.clear()
        state.update(fresh_state(today, eq, keep_peak))
        state["bot_halted"], state["halt_reason"] = halted, why
        state["consec_losses"] = consec
        cal.refresh()
        save_state(state)

    if state["bot_halted"]:
        if not state.get("_halt_notice"):
            br.alert(f"bot is HALTED ({state.get('halt_reason', 'manual')}) - "
                     f"idling. --reset-halt after review to resume.")
            state["_halt_notice"] = True
        return

    if not enforce_halts(state):
        save_state(state)
        return

    if not br.market_is_open():
        for pair in cfg.PAIRS:
            if state["pairs"][pair]["status"] == "open":
                br.alert(f"market closed with {pair} open - flattening")
                br.close_position(pair)
                state["pairs"][pair]["status"] = "closed"
                state["pairs"][pair]["reason"] = "market_closed"
        save_state(state)
        return

    if side_for(now_lon) is None or state["day_halted"]:
        return                                # Tue/Thu/Fri/weekend or halted day

    changed = False
    for pair in cfg.PAIRS:
        ps = state["pairs"][pair]
        before = (ps["status"], ps["reason"], ps["attempts"])
        if ps["status"] == "open":
            manage_open(state, pair, now_lon)
        elif ps["status"] == "idle":
            maybe_enter(state, pair, now_lon, cal)
        if (ps["status"], ps["reason"], ps["attempts"]) != before:
            changed = True
    if changed:
        save_state(state)


# ---------------- main ----------------
def main(argv=None) -> None:
    argv = argv if argv is not None else sys.argv[1:]
    if "--reset-halt" in argv:
        state = load_state()
        if state:
            state["bot_halted"] = False
            state["halt_reason"] = ""
            state["consec_losses"] = 0
            save_state(state)
            print("halt flags cleared - start the bot normally to resume")
        else:
            print("no state file - nothing to reset")
        return

    if cfg.MT_LOGIN == 0 or not cfg.MT_PASSWORD:
        raise SystemExit(
            "Set your FTMO details first: MT_LOGIN / MT_PASSWORD environment "
            "variables (or the marked block in bot/dow_config.py).")

    br.connect()
    now_lon = now_london()
    state = load_state()
    startup_reconcile(state, now_lon)
    if state is None or state.get("london_date") != now_lon.date().isoformat():
        eq = br.equity()
        peak = (state or {}).get("peak_equity", eq)
        halted = (state or {}).get("bot_halted", False)
        why = (state or {}).get("halt_reason", "")
        consec = (state or {}).get("consec_losses", 0)
        state = fresh_state(now_lon.date().isoformat(), eq, max(peak, eq))
        state["bot_halted"], state["halt_reason"] = halted, why
        state["consec_losses"] = consec
    save_state(state)

    cal = Calendar(alert=br.alert)
    cal.refresh()

    br.alert(f"DOW bot started | {'+'.join(cfg.PAIRS)} | Mon BUY / Wed SELL | "
             f"entry {cfg.ENTRY_LON[0]:02d}:{cfg.ENTRY_LON[1]:02d} exit "
             f"{cfg.EXIT_LON[0]:02d}:{cfg.EXIT_LON[1]:02d} London | "
             f"risk {cfg.RISK_PER_PAIR*100:.2f}%/pair | balance "
             f"{br.balance():,.0f} | broker offset {br.server_offset()} | "
             f"halts: day -{cfg.DAILY_HALT*100:.0f}% dd -{cfg.MAX_DD_HALT*100:.0f}% "
             f"streak {cfg.MAX_CONSEC_LOSSES}")

    while True:
        try:
            poll_once(state, cal)
        except SystemExit:
            raise
        except Exception as e:                # noqa: BLE001 - never die mid-week
            br.alert(f"ERROR (recovering): {type(e).__name__}: {e}")
            ts.sleep(30)
            br.ensure_connected()
        ts.sleep(cfg.POLL_SECONDS)


if __name__ == "__main__":
    main()
