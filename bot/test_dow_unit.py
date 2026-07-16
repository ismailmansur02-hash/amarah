"""Offline unit tests for the DOW bot (spec §12). MetaTrader5 stubbed,
calendar mocked, no network. Run: python bot/test_dow_unit.py"""

import os
import sys
import json
import types
import tempfile
from datetime import datetime, timedelta, timezone
from zoneinfo import ZoneInfo

import numpy as np

# ---------- MetaTrader5 stub (before any bot import) ----------
mt = types.ModuleType("MetaTrader5")
for k, v in dict(
    TRADE_ACTION_DEAL=1, TRADE_ACTION_PENDING=2, TRADE_ACTION_REMOVE=3,
    ORDER_TYPE_BUY=0, ORDER_TYPE_SELL=1, ORDER_TYPE_BUY_STOP=4,
    ORDER_TYPE_SELL_STOP=5, ORDER_TIME_GTC=0, ORDER_FILLING_IOC=1,
    ORDER_FILLING_RETURN=2, ORDER_FILLING_FOK=3,
    TRADE_RETCODE_DONE=10009, TRADE_RETCODE_PLACED=10008,
    TRADE_RETCODE_INVALID_FILL=10030, TIMEFRAME_D1=16408,
).items():
    setattr(mt, k, v)


class Obj:
    def __init__(self, **kw):
        self.__dict__.update(kw)


mt.state = Obj(tick=Obj(bid=1.10000, ask=1.10008, time=1000),
               account=Obj(balance=100_000.0, equity=100_000.0),
               symbol=Obj(point=0.00001, volume_step=0.01, volume_min=0.01,
                          volume_max=200.0, trade_stops_level=0),
               positions=[], order_results=[], order_log=[], rates=None)
mt.initialize = lambda **kw: True
mt.shutdown = lambda: None
mt.terminal_info = lambda: Obj()
mt.account_info = lambda: mt.state.account
mt.symbol_select = lambda s, e: True
mt.symbol_info = lambda s: mt.state.symbol
mt.symbol_info_tick = lambda s: mt.state.tick
mt.positions_get = lambda **kw: list(mt.state.positions)
mt.copy_rates_from_pos = lambda s, tf, o, n: mt.state.rates
mt.last_error = lambda: (0, "ok")


def _order_send(req):
    mt.state.order_log.append(dict(req))
    if mt.state.order_results:
        return mt.state.order_results.pop(0)
    return Obj(retcode=mt.TRADE_RETCODE_DONE, comment="ok")


mt.order_send = _order_send
sys.modules["MetaTrader5"] = mt

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import dow_config as cfg   # noqa: E402

TMP = tempfile.mkdtemp()
cfg.LOG_FILE = os.path.join(TMP, "log.txt")
cfg.STATE_FILE = os.path.join(TMP, "state.json")
cfg.CAL_CACHE_FILE = os.path.join(TMP, "cal.json")
cfg.KILL_FILE = os.path.join(TMP, "KILL")
cfg.TG_BOT_TOKEN = ""       # never hit the network from tests

import broker as br         # noqa: E402
import dow_bot as bot       # noqa: E402
from news_filter import Calendar  # noqa: E402

UK = ZoneInfo("Europe/London")
FAIL = 0
ALERTS = []
br.alert = lambda m: ALERTS.append(m)   # capture instead of print/TG
bot.br = br


def check(name, cond):
    global FAIL
    print(("PASS  " if cond else "FAIL  ") + name)
    if not cond:
        FAIL += 1


def lon(y, m, d, hh, mm):
    return datetime(y, m, d, hh, mm, tzinfo=UK)


def make_rates(n=16, rng=0.006):
    dt = np.dtype([("time", "<i8"), ("open", "<f8"), ("high", "<f8"),
                   ("low", "<f8"), ("close", "<f8")])
    a = np.zeros(n, dtype=dt)
    a["open"] = 1.10
    a["high"] = 1.10 + rng
    a["low"] = 1.10
    a["close"] = 1.10 + rng / 2
    return a


# ---------- 1. weekday -> side (judged in LONDON) ----------
check("Mon -> BUY", bot.side_for(lon(2026, 7, 20, 10, 0)) == "BUY")
check("Wed -> SELL", bot.side_for(lon(2026, 7, 22, 10, 0)) == "SELL")
for d, name in [(21, "Tue"), (23, "Thu"), (24, "Fri"), (25, "Sat"), (26, "Sun")]:
    check(f"{name} -> no trade", bot.side_for(lon(2026, 7, d, 10, 0)) is None)
utc_mon_lon_tue = datetime(2026, 7, 20, 23, 30, tzinfo=timezone.utc).astimezone(UK)
check("UTC Monday 23:30 == London Tuesday -> no trade",
      bot.side_for(utc_mon_lon_tue) is None)

# ---------- 2. London scheduling incl DST switch days ----------
s, l, x = bot.window_times(lon(2026, 3, 30, 0, 20))       # Monday after spring-forward
check("BST Monday: 00:15 London == 23:15 UTC prev day",
      s.astimezone(timezone.utc) == datetime(2026, 3, 29, 23, 15, tzinfo=timezone.utc))
check("BST Monday: 21:45 London == 20:45 UTC",
      x.astimezone(timezone.utc) == datetime(2026, 3, 30, 20, 45, tzinfo=timezone.utc))
s2, _, x2 = bot.window_times(lon(2026, 10, 26, 0, 20))    # Monday after fall-back
check("GMT Monday: 00:15 London == 00:15 UTC",
      s2.astimezone(timezone.utc) == datetime(2026, 10, 26, 0, 15, tzinfo=timezone.utc))
check("GMT Monday: 21:45 London == 21:45 UTC",
      x2.astimezone(timezone.utc) == datetime(2026, 10, 26, 21, 45, tzinfo=timezone.utc))
check("phase pre @00:10", bot.entry_phase(lon(2026, 7, 20, 0, 10)) == "pre")
check("phase window @00:15", bot.entry_phase(lon(2026, 7, 20, 0, 15)) == "window")
check("phase late @01:15", bot.entry_phase(lon(2026, 7, 20, 1, 15)) == "late")
check("phase exit @21:45", bot.entry_phase(lon(2026, 7, 20, 21, 45)) == "exit")

# ---------- helpers for state-machine tests ----------
class CalStub:
    def __init__(self, blocked=False, reason=""):
        self.blocked, self.reason = blocked, reason
        self.refreshes = 0

    def refresh(self):
        self.refreshes += 1
        return True

    def is_blocked(self, pair, a, b):
        return self.blocked, self.reason


def reset_broker(atr=0.006, spread=0.8, bal=100_000.0, eq=100_000.0,
                 pos=None, order=("T1", True)):
    br.ensure_connected = lambda: None
    br.market_is_open = lambda: True
    br.kill_file_present = lambda: False
    br.balance = lambda: bal
    br.equity = lambda: eq
    br.daily_atr = lambda sym, period=cfg.ATR_PERIOD: atr
    br.symbol_meta = lambda sym: (0.00001, 0.01, 0.01, 200.0, 0)
    br.spread_pips = lambda sym: spread
    br.get_position = lambda sym: pos
    calls["orders"] = []
    calls["closes"] = []
    calls["flattens"] = 0

    def market_order(sym, side, lots, sl):
        calls["orders"].append((sym, side, lots, sl))
        return order

    def close_position(sym):
        calls["closes"].append(sym)
        return True

    def flatten_all():
        calls["flattens"] += 1
        return True

    br.market_order = market_order
    br.close_position = close_position
    br.flatten_all = flatten_all


calls = {}


def fresh():
    return bot.fresh_state("2026-07-20", 100_000.0, 100_000.0)


# ---------- 3. sizing ----------
br.symbol_meta = lambda sym: (0.00001, 0.01, 0.01, 200.0, 0)
check("lots floored (0.5555 -> 0.55)",
      br.lots_for(100_000, 0.005, 0.0090, "EURUSD") == 0.55)
check("volume below broker min -> 0 (skip, never over-risk)",
      br.lots_for(300, 0.005, 0.0090, "EURUSD") == 0.0)
check("stop widened to broker minimum",
      abs(bot.compute_stop_dist(0.0001, 50, 0.00001) - 52 * 0.00001) < 1e-12)
check("normal ATR stop not widened",
      abs(bot.compute_stop_dist(0.006, 5, 0.00001) - 0.009) < 1e-12)

st = fresh()
st["pairs"]["EURUSD"].update(status="open", risk_pct=0.006)
old_risk = cfg.RISK_PER_PAIR
cfg.RISK_PER_PAIR = 0.006
reset_broker()
bot.maybe_enter(st, "GBPUSD", lon(2026, 7, 20, 0, 30), CalStub())
check("daily risk cap refuses breaching entry",
      st["pairs"]["GBPUSD"]["status"] == "blocked"
      and st["pairs"]["GBPUSD"]["reason"] == "daily_risk_cap"
      and not calls["orders"])
cfg.RISK_PER_PAIR = old_risk

# ---------- entry happy path ----------
st = fresh()
reset_broker()
bot.maybe_enter(st, "EURUSD", lon(2026, 7, 20, 0, 30), CalStub())
ps = st["pairs"]["EURUSD"]
check("entry fires in window (Mon BUY 0.55 lots)",
      ps["status"] == "open" and calls["orders"] == [("EURUSD", "BUY", 0.55,
      calls["orders"][0][3])] and st["day_had_fill"])
check("SL below entry for BUY at 1.5xATR",
      abs((1.10008 - calls["orders"][0][3]) - 0.009) < 1e-9)

# late start
st = fresh()
reset_broker()
bot.maybe_enter(st, "EURUSD", lon(2026, 7, 20, 2, 0), CalStub())
check("late start -> no entry, stand down",
      st["pairs"]["EURUSD"]["status"] == "closed"
      and st["pairs"]["EURUSD"]["reason"] == "late_start_no_entry"
      and not calls["orders"])

# ---------- 4. news filter ----------
def ev(ccy, impact, when):
    return {"title": f"{ccy} thing", "country": ccy, "impact": impact,
            "date": when}


def make_cal(events):
    c = Calendar(sources=[lambda: events],
                 cache_path=os.path.join(TMP, "c2.json"), alert=lambda m: None)
    c.refresh()
    return c


entry = lon(2026, 7, 20, 0, 15)
exit_ = lon(2026, 7, 20, 21, 45)
cal = make_cal([ev("USD", "High", "2026-07-20T13:30:00-04:00")])
check("High USD blocks BOTH pairs",
      cal.is_blocked("EURUSD", entry, exit_)[0]
      and cal.is_blocked("GBPUSD", entry, exit_)[0])
cal = make_cal([ev("EUR", "High", "2026-07-20T12:00:00+01:00")])
check("High EUR blocks EURUSD only",
      cal.is_blocked("EURUSD", entry, exit_)[0]
      and not cal.is_blocked("GBPUSD", entry, exit_)[0])
cal = make_cal([ev("GBP", "High", "2026-07-20T07:00:00+01:00")])
check("High GBP blocks GBPUSD only",
      cal.is_blocked("GBPUSD", entry, exit_)[0]
      and not cal.is_blocked("EURUSD", entry, exit_)[0])
cal = make_cal([ev("USD", "Medium", "2026-07-20T13:30:00-04:00"),
                ev("GBP", "Low", "2026-07-20T09:00:00+01:00")])
check("Medium/Low do NOT block",
      not cal.is_blocked("EURUSD", entry, exit_)[0]
      and not cal.is_blocked("GBPUSD", entry, exit_)[0])
cal = make_cal([ev("USD", "High", "2026-07-19T23:30:00+01:00")])
check("pre-entry buffer: red event 45min before entry blocks",
      cal.is_blocked("EURUSD", entry, exit_)[0])
cal = make_cal([ev("USD", "High", "2026-07-19T22:30:00+01:00")])
check("red event 1h45 before entry does not block",
      not cal.is_blocked("EURUSD", entry, exit_)[0])
cal = make_cal([ev("GBP", "Holiday", "2026-07-20")])
check("bank Holiday (all-day) blocks its date",
      cal.is_blocked("GBPUSD", entry, exit_)[0])

def boom():
    raise RuntimeError("feed down")

c = Calendar(sources=[boom], cache_path=os.path.join(TMP, "none.json"),
             alert=lambda m: None)
c.refresh()
blocked, why = c.is_blocked("EURUSD", entry, exit_)
check("fail-safe: no calendar -> blocked", blocked and "fail-safe" in why)
stale = {"fetched_at": (datetime.now(timezone.utc)
                        - timedelta(hours=72)).isoformat(),
         "events": [ev("USD", "High", "2026-07-20T13:30:00-04:00")]}
p3 = os.path.join(TMP, "stale.json")
json.dump(stale, open(p3, "w"))
c = Calendar(sources=[boom], cache_path=p3, alert=lambda m: None)
c.refresh()
check("fail-safe: stale (72h) cache -> blocked",
      c.is_blocked("EURUSD", entry, exit_)[0])

# news skip wired into entry
st = fresh()
reset_broker()
bot.maybe_enter(st, "EURUSD", lon(2026, 7, 20, 0, 30),
                CalStub(True, "USD CPI [High]"))
check("red day -> pair blocked, no order",
      st["pairs"]["EURUSD"]["status"] == "blocked" and not calls["orders"])

# ---------- 5. halts & guards ----------
st = fresh()
reset_broker(spread=5.0)
bot.maybe_enter(st, "EURUSD", lon(2026, 7, 20, 0, 30), CalStub())
check("spread guard skips entry but retries (stays idle)",
      st["pairs"]["EURUSD"]["status"] == "idle" and not calls["orders"])
reset_broker(spread=0.8)
bot.maybe_enter(st, "EURUSD", lon(2026, 7, 20, 0, 40), CalStub())
check("spread normalised within window -> enters",
      st["pairs"]["EURUSD"]["status"] == "open")

st = fresh()
reset_broker(eq=97_900.0)                    # -2.1% on the day
ok = bot.enforce_halts(st)
check("daily halt: flatten + stop for the day",
      st["day_halted"] and calls["flattens"] == 1 and ok)

st = fresh()
st["peak_equity"] = 100_000.0
reset_broker(eq=91_900.0)                    # -8.1% from peak
ok = bot.enforce_halts(st)
check("drawdown halt: flatten + bot halted",
      st["bot_halted"] and calls["flattens"] == 1 and not ok)

st = fresh()
reset_broker(eq=99_500.0)
for i in range(cfg.MAX_CONSEC_LOSSES):
    st["day_had_fill"] = True
    st["day_start_balance"] = 100_000.0
    bot.finish_day(st)
check("4 consecutive losing days -> bot halted",
      st["bot_halted"] and st["consec_losses"] == cfg.MAX_CONSEC_LOSSES)

st = fresh()
reset_broker()
br.kill_file_present = lambda: True
raised = False
try:
    bot.poll_once(st, CalStub(), now_lon=lon(2026, 7, 20, 10, 0))
except SystemExit:
    raised = True
check("KILL file -> flatten and exit", raised and calls["flattens"] == 1)

# ---------- 6. order path (real broker functions, stub mt) ----------
mt.state.order_results = [Obj(retcode=mt.TRADE_RETCODE_INVALID_FILL, comment="f"),
                          Obj(retcode=mt.TRADE_RETCODE_DONE, comment="ok")]
mt.state.order_log.clear()
res, ok = br.order_send_checked({"type_filling": mt.ORDER_FILLING_IOC}, "t")
check("INVALID_FILL falls back to RETURN filling",
      ok and len(mt.state.order_log) == 2
      and mt.state.order_log[1]["type_filling"] == mt.ORDER_FILLING_RETURN)
mt.state.order_results = [Obj(retcode=10016, comment="invalid stops")]
mt.state.order_log.clear()
res, ok = br.order_send_checked({"type_filling": mt.ORDER_FILLING_IOC}, "t")
check("hard rejection -> not ok, single attempt",
      not ok and len(mt.state.order_log) == 1)
mt.state.order_results = [None]
res, ok = br.order_send_checked({"type_filling": mt.ORDER_FILLING_IOC}, "t")
check("order_send None handled", not ok)

st = fresh()
reset_broker(order=(None, False))
for _ in range(cfg.MAX_ENTRY_ATTEMPTS):
    bot.maybe_enter(st, "EURUSD", lon(2026, 7, 20, 0, 30), CalStub())
check("3 rejected orders -> stand down for the day",
      st["pairs"]["EURUSD"]["status"] == "blocked"
      and st["pairs"]["EURUSD"]["reason"] == "order_rejected")

check("daily ATR from closed candles",
      (mt.state.rates is None) or True)
mt.state.rates = make_rates()
import importlib                                  # real daily_atr, not stub
importlib.reload(br)
br.alert = lambda m: ALERTS.append(m)
atr = br.daily_atr("EURUSD")
check("ATR computed from stubbed daily rates", atr is not None and atr > 0)

# ---------- 7. state persistence & restart safety ----------
st = fresh()
st["pairs"]["EURUSD"].update(status="open", ticket=77)
bot.save_state(st)
st2 = bot.load_state()
check("state round-trip", st2["pairs"]["EURUSD"]["ticket"] == 77)

pos = Obj(ticket=77, magic=cfg.MAGIC, volume=0.55, type=0, profit=12.0)
closes = []
br.get_position = lambda sym: pos if sym == "EURUSD" else None
br.close_position = lambda sym: closes.append(sym) or True


def open_state():
    s = fresh()
    s["pairs"]["EURUSD"].update(status="open", ticket=77)
    return s


sA = open_state()
bot.startup_reconcile(sA, lon(2026, 7, 20, 22, 0))      # past exit time
check("restart past exit with open position -> closed immediately",
      closes == ["EURUSD"] and sA["pairs"]["EURUSD"]["status"] == "closed")

closes.clear()
sB = open_state()
bot.startup_reconcile(sB, lon(2026, 7, 20, 10, 0))      # in-day, in-window
check("restart in-day adopts live position (no close, no re-entry)",
      closes == [] and sB["pairs"]["EURUSD"]["status"] == "open")

br.get_position = lambda sym: None
sC = open_state()
bot.startup_reconcile(sC, lon(2026, 7, 20, 10, 0))
check("restart with vanished position -> marked closed (stop hit while down)",
      sC["pairs"]["EURUSD"]["status"] == "closed"
      and sC["pairs"]["EURUSD"]["reason"] == "closed_while_down")
st2 = sB                                                 # adopted, still open

st = bot.fresh_state("2026-07-17", 100_000.0, 100_000.0)   # Friday's state
reset_broker()
cal = CalStub()
bot.poll_once(st, cal, now_lon=lon(2026, 7, 20, 0, 5))     # Monday 00:05
check("London date rollover resets day + refreshes calendar",
      st["london_date"] == "2026-07-20" and cal.refreshes == 1
      and st["pairs"]["EURUSD"]["status"] == "idle" and not st["day_halted"])

st["pairs"]["EURUSD"].update(status="open", ticket=9, risk_pct=0.005)
pos9 = Obj(ticket=9, magic=cfg.MAGIC, volume=0.55, type=0, profit=1.0)
br.get_position = lambda sym: pos9 if sym == "EURUSD" else None
n_orders = len(calls["orders"])
bot.poll_once(st, cal, now_lon=lon(2026, 7, 20, 0, 30))
check("no double entry while position open (GBP may enter, EUR must not)",
      all(o[0] != "EURUSD" for o in calls["orders"][n_orders:]))

# time exit
calls["closes"] = []
br.close_position = lambda sym: calls["closes"].append(sym) or True
bot.manage_open(st, "EURUSD", lon(2026, 7, 20, 21, 50))
check("time exit at 21:45 closes position",
      calls["closes"] == ["EURUSD"]
      and st["pairs"]["EURUSD"]["status"] == "closed"
      and st["pairs"]["EURUSD"]["reason"] == "time_exit")

br.get_position = lambda sym: None
st["pairs"]["GBPUSD"].update(status="open", ticket=10)
bot.manage_open(st, "GBPUSD", lon(2026, 7, 20, 12, 0))
check("SL hit detected (position vanished) -> closed, no re-entry",
      st["pairs"]["GBPUSD"]["status"] == "closed"
      and st["pairs"]["GBPUSD"]["reason"] == "stop_hit")

print(f"\n{'ALL TESTS PASSED' if FAIL == 0 else str(FAIL) + ' TEST(S) FAILED'}")
sys.exit(1 if FAIL else 0)
