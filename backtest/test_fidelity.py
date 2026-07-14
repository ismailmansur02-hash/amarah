"""Cross-validate the backtest engine's signal math against the live bot's own
functions (bot imported with a stubbed MetaTrader5 module), on real data.

Checks, on hundreds of random rolling 299-bar windows of the real M15 series:
  1. fractal flags match bot fractals() output exactly,
  2. latest-confirmed fractal (the bot's ups/dns.iloc[-1]) matches,
  3. is_equal_level() verdict matches for the latest confirmed fractal,
  4. entry level arithmetic matches (round(fr - (fr-locked)*FIB, 5)),
  5. current_session_open() anchors match engine session boundaries around
     DST changes.
"""
import sys
import types
import random

import numpy as np
import pandas as pd

# stub MetaTrader5 before importing the bot
mt_stub = types.ModuleType("MetaTrader5")
for name in ("TRADE_ACTION_PENDING", "TRADE_ACTION_REMOVE", "TRADE_ACTION_DEAL",
             "ORDER_TYPE_SELL_STOP", "ORDER_TYPE_BUY_STOP", "ORDER_TYPE_SELL",
             "ORDER_TYPE_BUY", "ORDER_TIME_GTC", "ORDER_FILLING_IOC",
             "TIMEFRAME_H4", "TIMEFRAME_M15"):
    setattr(mt_stub, name, 0)
sys.modules["MetaTrader5"] = mt_stub

sys.path.insert(0, "/home/user/amarah/bot")
sys.path.insert(0, "/home/user/amarah/backtest")

import algay_3_inversion as bot          # noqa: E402
import engine                            # noqa: E402

random.seed(7)

m5, m15 = engine.load_bars("/home/user/amarah/backtest/data/eurusd_m5.parquet")
bt = engine.Backtest(m5, m15)
N = len(m15)
print(f"M15 bars: {N}")

fails = 0
for trial in range(400):
    j = random.randrange(400, N - 1)             # "current closed bar" position
    w0 = j - (engine.WINDOW - 1)
    win = m15.iloc[w0:j + 1].reset_index(drop=True)

    fr = bot.fractals(win)
    ups = fr.dropna(subset=["up_fr"]); dns = fr.dropna(subset=["dn_fr"])

    # 1) fractal flags
    bot_up = set(fr.index[fr["up_fr"].notna()])
    eng_up = {i - w0 for i in bt.up_idx if w0 + 4 <= i <= j - 4}
    bot_dn = set(fr.index[fr["dn_fr"].notna()])
    eng_dn = {i - w0 for i in bt.dn_idx if w0 + 4 <= i <= j - 4}
    if bot_up != eng_up or bot_dn != eng_dn:
        print(f"FRACTAL MISMATCH at j={j}: up {bot_up ^ eng_up} dn {bot_dn ^ eng_dn}")
        fails += 1
        continue

    # 2) latest confirmed fractal
    li_up = bt.latest_confirmed(bt.up_idx, j)
    li_dn = bt.latest_confirmed(bt.dn_idx, j)
    b_up = ups.index[-1] + w0 if not ups.empty else -1
    b_dn = dns.index[-1] + w0 if not dns.empty else -1
    if li_up != b_up or li_dn != b_dn:
        print(f"LATEST MISMATCH at j={j}: up {li_up} vs {b_up}, dn {li_dn} vs {b_dn}")
        fails += 1
        continue

    # 3) equal filter on the latest confirmed up & dn fractals
    for side, li, series in (("up", li_up, fr["up_fr"]), ("dn", li_dn, fr["dn_fr"])):
        if li < 0:
            continue
        pos = li - w0
        want = bot.is_equal_level(float(series.iloc[pos]), series, pos)
        got = bt.equal_level(li, side)
        if want != got:
            print(f"EQUAL MISMATCH j={j} side={side} pos={pos}: bot={want} eng={got}")
            fails += 1

    # 4) level arithmetic
    if li_up >= 0 and li_dn >= 0:
        frp, lk = float(bt.hi[li_up]), float(bt.lo[li_dn])
        want = round(frp - (frp - lk) * bot.FIB, 5)
        got = round(frp - (frp - lk) * engine.FIB, 5)
        if want != got:
            print(f"LEVEL MISMATCH j={j}: {want} vs {got}")
            fails += 1

print("signal-math trials: 400, failures:", fails)

# 5) session anchors vs bot's current_session_open around DST switches
from datetime import datetime, timezone, timedelta  # noqa: E402
from unittest import mock                            # noqa: E402

anchors = {a for a, _ in bt.sessions}
probe_days = ["2023-03-26", "2023-10-29", "2024-03-31", "2024-10-27",
              "2025-03-30", "2025-10-26", "2026-03-29", "2023-06-15",
              "2024-01-10", "2025-12-15"]
anchor_fails = 0
for d in probe_days:
    for hour in (0, 3, 7, 11, 15, 19, 23):
        fake_now = pd.Timestamp(f"{d} {hour:02d}:37").tz_localize("UTC")

        class FakeDT(datetime):
            @classmethod
            def now(cls, tz=None):
                return fake_now.to_pydatetime().astimezone(tz)

        with mock.patch.object(bot, "datetime", FakeDT):
            so = bot.current_session_open()
        so = pd.Timestamp(so)
        expect = max(a for a in anchors if a <= fake_now.tz_localize(None))
        if so != expect:
            print(f"ANCHOR MISMATCH now={fake_now}: bot={so} engine={expect}")
            anchor_fails += 1
print("session-anchor probes: 70, failures:", anchor_fails)

assert fails == 0 and anchor_fails == 0, "FIDELITY CHECK FAILED"
print("ALL FIDELITY CHECKS PASSED")
