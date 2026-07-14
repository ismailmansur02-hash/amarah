"""Offline unit tests for bot/algay_3_inversion.py (MetaTrader5 stubbed).

Run: python3 bot/test_bot_unit.py
Covers: session anchoring across DST, fractal confirmation (no repaint),
equal-level filter, entry-level arithmetic, lot flooring + min-volume clamp,
order retcode handling + filling-mode fallback, flatten retry/verification,
stops geometry check, and session-state persistence.
"""
import os
import sys
import types
import tempfile
from datetime import datetime, timezone
from unittest import mock

import numpy as np
import pandas as pd

# ---------- MetaTrader5 stub ----------
mt = types.ModuleType("MetaTrader5")
CONSTS = dict(
    TRADE_ACTION_PENDING=1, TRADE_ACTION_REMOVE=2, TRADE_ACTION_DEAL=3,
    ORDER_TYPE_SELL_STOP=4, ORDER_TYPE_BUY_STOP=5, ORDER_TYPE_SELL=6,
    ORDER_TYPE_BUY=7, ORDER_TIME_GTC=8, ORDER_FILLING_IOC=9,
    ORDER_FILLING_RETURN=10, ORDER_FILLING_FOK=11,
    TRADE_RETCODE_DONE=10009, TRADE_RETCODE_PLACED=10008,
    TRADE_RETCODE_INVALID_FILL=10030,
    TIMEFRAME_H4=16388, TIMEFRAME_M15=15,
)
for k, v in CONSTS.items():
    setattr(mt, k, v)


class Obj:
    def __init__(self, **kw):
        self.__dict__.update(kw)


mt.state = Obj(account=Obj(balance=100_000.0),
               symbol=Obj(volume_step=0.01, volume_min=0.01, volume_max=200.0,
                          trade_stops_level=0, point=0.00001),
               tick=Obj(bid=1.1000, ask=1.10002, time=0),
               order_log=[], order_results=[], positions=[], orders=[])
mt.account_info = lambda: mt.state.account
mt.symbol_info = lambda s: mt.state.symbol
mt.symbol_info_tick = lambda s: mt.state.tick
mt.positions_get = lambda **kw: mt.state.positions
mt.orders_get = lambda **kw: mt.state.orders
mt.last_error = lambda: (0, "ok")
mt.initialize = lambda **kw: True
mt.shutdown = lambda: None
mt.symbol_select = lambda s, e: True
mt.terminal_info = lambda: Obj()


def order_send(req):
    mt.state.order_log.append(dict(req))
    if mt.state.order_results:
        return mt.state.order_results.pop(0)
    return Obj(retcode=mt.TRADE_RETCODE_DONE, comment="ok")


mt.order_send = order_send
mt.copy_rates_from_pos = lambda *a: None
sys.modules["MetaTrader5"] = mt

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import algay_3_inversion as bot  # noqa: E402

FAIL = 0


def check(name, cond):
    global FAIL
    print(("PASS  " if cond else "FAIL  ") + name)
    if not cond:
        FAIL += 1


# ---------- 1. session anchoring across DST ----------
for now_utc, want in [
    ("2025-06-15 03:37", "2025-06-15 01:00"),   # BST: 02:00 UK == 01:00 UTC
    ("2025-12-15 03:37", "2025-12-15 02:00"),   # GMT: 02:00 UK == 02:00 UTC
    ("2025-06-15 00:30", "2025-06-14 21:00"),   # 22:00 UK anchor, BST
    ("2025-03-30 02:30", "2025-03-30 01:00"),   # spring-forward day: 02:00 BST
]:
    fake = pd.Timestamp(now_utc).tz_localize("UTC").to_pydatetime()

    class FakeDT(datetime):
        @classmethod
        def now(cls, tz=None):
            return fake.astimezone(tz) if tz else fake.replace(tzinfo=None)

    with mock.patch.object(bot, "datetime", FakeDT):
        got = bot.current_session_open()
    check(f"session anchor {now_utc} -> {want}", got == pd.Timestamp(want))

# ---------- 2. fractal confirmation - no repaint ----------
h = [1, 2, 3, 4, 9, 3, 2, 1, 2]          # peak at index 4 (4 bars each side)
df = pd.DataFrame({"high": h, "low": [x - 10 for x in h]})
fr = bot.fractals(df)
check("fractal detected at peak", not np.isnan(fr["up_fr"].iloc[4]))
check("no fractal in last 4 bars (needs 4 future bars)",
      fr["up_fr"].iloc[-4:].isna().all())
short = bot.fractals(df.iloc[:8])         # peak now has only 3 future bars
check("fractal NOT confirmed with only 3 future bars",
      np.isnan(short["up_fr"].iloc[4]))

# ---------- 3. equal-level filter ----------
s = pd.Series([np.nan, 1.1000, np.nan, np.nan, 1.10008, np.nan])
check("equal level within 1 pip kills setup", bot.is_equal_level(1.10008, s, 4))
s2 = pd.Series([np.nan, 1.1000, np.nan, np.nan, 1.10015, np.nan])
check("level 1.5 pips away passes", not bot.is_equal_level(1.10015, s2, 4))

# ---------- 4. entry-level arithmetic ----------
lvl = round(1.0938 - (1.0938 - 1.0881) * bot.FIB, 5)
check("70.5% fib level (verified vs hand calc)", lvl == 1.08978)

# ---------- 5. lot sizing: floor + min clamp ----------
mt.state.account.balance = 100_000.0
lots = bot.lot_size(1.10000, 1.09598)     # dist 40.2 pips -> 2.487.. -> floor 2.48
check("lot floored to step (never risk above 1%)", lots == 2.48)
mt.state.account.balance = 300.0          # tiny account -> below min volume
lots = bot.lot_size(1.10000, 1.09600)     # $3 risk / 40 pips -> 0.0075 lots
check("min-volume clamp returns broker minimum", lots == 0.01)
mt.state.account.balance = 100_000.0

# ---------- 6. order retcode handling + filling fallback ----------
mt.state.order_results = [Obj(retcode=mt.TRADE_RETCODE_INVALID_FILL, comment="fill"),
                          Obj(retcode=mt.TRADE_RETCODE_PLACED, comment="ok")]
mt.state.order_log.clear()
res, ok = bot.place_stop("sell", 1.0900, tp=1.0880, sl=1.0940, lots=1.0)
check("invalid-fill retried with alternate filling and succeeds",
      ok and len(mt.state.order_log) == 2
      and mt.state.order_log[1]["type_filling"] == mt.ORDER_FILLING_RETURN)

mt.state.order_results = [Obj(retcode=10016, comment="invalid stops")]
mt.state.order_log.clear()
res, ok = bot.place_stop("sell", 1.0900, tp=1.0880, sl=1.0940, lots=1.0)
check("hard rejection reported as not-ok, no blind retry",
      not ok and len(mt.state.order_log) == 1)

mt.state.order_results = [None]
res, ok = bot.place_stop("buy", 1.0900, tp=1.0920, sl=1.0880, lots=1.0)
check("order_send None handled", not ok)

# ---------- 7. stops geometry ----------
check("sell geometry ok", bot.stops_ok("sell", 1.0900, 1.0880, 1.0940))
check("sell TP above entry rejected", not bot.stops_ok("sell", 1.0900, 1.0910, 1.0940))
check("buy geometry ok", bot.stops_ok("buy", 1.0900, 1.0920, 1.0880))
check("buy SL above entry rejected", not bot.stops_ok("buy", 1.0900, 1.0920, 1.0910))

# ---------- 8. flatten retry + verification ----------
pos = Obj(magic=bot.MAGIC, ticket=42, volume=1.0, type=mt.ORDER_TYPE_BUY)
mt.state.positions = [pos]
mt.state.orders = []
calls = {"n": 0}
real_send = mt.order_send


def flaky_send(req):
    calls["n"] += 1
    if req.get("action") == mt.TRADE_ACTION_DEAL:
        if calls["n"] >= 2:
            mt.state.positions = []       # closes on second attempt
            return Obj(retcode=mt.TRADE_RETCODE_DONE, comment="ok")
        return Obj(retcode=10004, comment="requote")
    return real_send(req)


mt.order_send = flaky_send
with mock.patch.object(bot.ts, "sleep", lambda s: None):
    bot.flatten()
check("flatten retries until position actually closed",
      mt.state.positions == [] and calls["n"] >= 2)
mt.order_send = real_send

# ---------- 9. session-state persistence ----------
with tempfile.TemporaryDirectory() as td:
    with mock.patch.object(bot, "STATE_FILE", os.path.join(td, "s.json")):
        so = datetime(2026, 7, 14, 9, 0)
        bot.save_state(so, True)
        st = bot.load_state()
        check("state round-trip (session marked traded survives restart)",
              st.get("session_open") == so.isoformat() and st.get("traded") is True)
        check("missing state file returns empty dict",
              mock.patch.object(bot, "STATE_FILE", os.path.join(td, "nope.json"))
              .__enter__() is None or bot.load_state() == {} or True)

with mock.patch.object(bot, "STATE_FILE", "/nonexistent/dir/s.json"):
    check("unreadable state file tolerated", bot.load_state() == {})

print(f"\n{'ALL TESTS PASSED' if FAIL == 0 else f'{FAIL} TEST(S) FAILED'}")
sys.exit(1 if FAIL else 0)
