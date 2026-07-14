"""2026 month-by-month returns (%), done precisely.

Two configurations:
  A) Bot AS CODED  (inverted stop entry, session flatten) - what running the
     current bot would have produced.
  B) Best candidate (non-inverted limit entry, London/NY 14:00 UK session,
     run to TP/SL) - the variant found in the robustness search.

Each account starts at $100,000 on 2026-01-01 and compounds. Monthly % is
(month_end_balance / month_start_balance - 1). A month with no trades = 0.00%.
July 2026 is PARTIAL (data ends 2026-07-14).
"""
import os
import sys

import numpy as np
import pandas as pd

sys.path.insert(0, os.path.dirname(__file__))
import engine  # noqa: E402

m5, m15 = engine.load_bars(os.path.join(os.path.dirname(__file__), "data/eurusd_m5.parquet"))
YEAR = (pd.Timestamp("2026-01-01"), pd.Timestamp("2026-07-15"))
MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul"]


def monthly(cfg):
    bt = engine.Backtest(m5, m15, costs=engine.Costs(), ambiguity="worst",
                         mode=cfg.get("mode", "inverted"),
                         flatten_mode=cfg.get("flatten_mode", "session"),
                         pending_cancel=cfg.get("pending_cancel", "cutoff"),
                         session_hours=cfg.get("session_hours"))
    tr, _, _ = bt.run(start=YEAR[0], end=YEAR[1])
    f = [t for t in tr if t.status == "filled"]
    # count trades by exit month, P&L compounded on a 100k base
    rows = [{"t_exit": t.t_exit, "pnl": t.pnl} for t in f]
    d = pd.DataFrame(rows).sort_values("t_exit")
    bal = 100_000.0
    d["bal"] = 0.0
    for i in d.index:
        bal += d.at[i, "pnl"]
        d.at[i, "bal"] = bal
    d = d.set_index("t_exit")
    # month-end balances across Jan..Jul (fill months with no trades)
    idx = pd.period_range("2026-01", "2026-07", freq="M")
    me = d["bal"].resample("ME").last()
    me.index = me.index.to_period("M")
    me = me.reindex(idx).ffill().fillna(100_000.0)
    ms = me.shift(1).fillna(100_000.0)
    ret = (me / ms - 1) * 100
    counts = d.assign(m=d.index.to_period("M")).groupby("m").size().reindex(idx).fillna(0).astype(int)
    return ret.values, counts.values, me.values


cfgA = dict(mode="inverted", flatten_mode="session", pending_cancel="cutoff")
cfgB = dict(mode="original", flatten_mode="none", pending_cancel="end", session_hours={14})

rA, cA, balA = monthly(cfgA)
rB, cB, balB = monthly(cfgB)

print("EURUSD 2026 monthly returns (%) - $100k start, 1% risk/trade, realistic costs")
print("(Jul is partial: data ends 2026-07-14)\n")
print(f"{'Month':<6} | {'A: bot as coded':>22} | {'B: non-inv London/NY':>24}")
print(f"{'':<6} | {'return':>10} {'trades':>10} | {'return':>10} {'trades':>12}")
print("-" * 60)
for i, mo in enumerate(MONTHS):
    tag = " *" if mo == "Jul" else ""
    print(f"{mo:<6} | {rA[i]:>+9.2f}% {cA[i]:>10} | {rB[i]:>+9.2f}% {cB[i]:>12}{tag}")
print("-" * 60)
ytdA = (balA[-1] / 100_000 - 1) * 100
ytdB = (balB[-1] / 100_000 - 1) * 100
print(f"{'YTD':<6} | {ytdA:>+9.2f}% {cA.sum():>10} | {ytdB:>+9.2f}% {cB.sum():>12}")
print(f"\nA compounds $100,000 -> ${balA[-1]:,.0f}")
print(f"B compounds $100,000 -> ${balB[-1]:,.0f}")
print("* July partial (1-14 only)")

# persist a CSV
out = pd.DataFrame({"month": MONTHS,
                    "bot_as_coded_pct": np.round(rA, 2), "bot_trades": cA,
                    "noninv_londonNY_pct": np.round(rB, 2), "noninv_trades": cB})
out.to_csv(os.path.join(os.path.dirname(__file__), "out", "monthly_2026.csv"), index=False)
