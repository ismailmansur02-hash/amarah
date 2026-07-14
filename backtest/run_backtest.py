"""Run the full ALGAY 3.0 inversion backtest and emit stats + trade list.

Usage: python3 run_backtest.py
Writes: backtest/out/trades.csv, backtest/out/monthly.csv, backtest/out/summary.txt
"""
import os
import sys

import numpy as np
import pandas as pd

sys.path.insert(0, os.path.dirname(__file__))
import engine  # noqa: E402

OUT = os.path.join(os.path.dirname(__file__), "out")
os.makedirs(OUT, exist_ok=True)

START = pd.Timestamp("2023-01-01")
END = pd.Timestamp("2026-07-12")     # last complete trading week in data


def trades_frame(trades):
    rows = []
    for t in trades:
        rows.append({
            "session": t.session, "side": t.side, "sweep": t.sweep,
            "t_sweep": t.t_sweep, "t_placed": t.t_placed, "level": t.level,
            "tp": t.tp, "sl": t.sl, "status": t.status, "t_fill": t.t_fill,
            "fill_px": t.fill_px, "t_exit": t.t_exit, "exit_px": t.exit_px,
            "exit_reason": t.exit_reason, "ambiguous": t.ambiguous,
            "risk_pips": t.risk_dist / engine.PIP, "lots": t.lots,
            "pnl": t.pnl, "balance_after": t.balance_after,
        })
    return pd.DataFrame(rows)


def stats(df_filled, balance0, label, out_lines):
    eq = pd.concat([pd.Series([balance0]), df_filled["balance_after"]], ignore_index=True)
    peak = eq.cummax()
    dd = (eq / peak - 1.0)
    wins = df_filled[df_filled.pnl > 0]
    losses = df_filled[df_filled.pnl <= 0]
    pf = wins.pnl.sum() / abs(losses.pnl.sum()) if len(losses) and losses.pnl.sum() != 0 else float("inf")

    m = df_filled.set_index("t_exit").sort_index()
    bal = m["balance_after"]
    month_end = bal.resample("ME").last().ffill()
    month_start = month_end.shift(1).fillna(balance0)
    monthly = (month_end / month_start - 1) * 100

    total_ret = (eq.iloc[-1] / balance0 - 1) * 100
    n_months = len(monthly)
    avg_m = monthly.mean()
    months_above = (monthly >= 0.5).sum()
    pos_months = (monthly > 0).sum()

    out_lines += [
        f"\n=== {label} ===",
        f"filled trades: {len(df_filled)}  wins: {len(wins)} ({len(wins)/len(df_filled)*100:.1f}%)",
        f"final balance: {eq.iloc[-1]:,.0f}  total return: {total_ret:+.1f}%",
        f"profit factor: {pf:.2f}   max drawdown: {dd.min()*100:.2f}%",
        f"months: {n_months}  avg monthly: {avg_m:+.3f}%  median: {monthly.median():+.3f}%",
        f"months > 0: {pos_months}/{n_months}   months >= +0.5%: {months_above}/{n_months}",
        f"ambiguous-bar trades (TP&SL same 5M bar): {int(df_filled.ambiguous.sum())}",
        f"exit mix: {df_filled.exit_reason.value_counts().to_dict()}",
    ]
    return monthly


def main():
    m5, m15 = engine.load_bars(os.path.join(os.path.dirname(__file__), "data/eurusd_m5.parquet"))
    out_lines = []

    # ---------- headline: realistic costs, worst-case ambiguity ----------
    bt = engine.Backtest(m5, m15, costs=engine.Costs(), ambiguity="worst")
    trades, events, bal = bt.run(start=START, end=END)
    df = trades_frame(trades)
    filled = df[df.status == "filled"].copy()
    ev = pd.Series([e for _, e in events]).value_counts().to_dict()

    n_sessions = sum(1 for (a, b), (i0, i1) in zip(bt.sessions, bt.s15)
                     if START <= a < END and i1 > i0)
    out_lines += [
        f"sessions with data: {n_sessions}",
        f"orders placed: {len(df)}  status mix: {df.status.value_counts().to_dict()}",
        f"session events: {ev}",
    ]
    monthly = stats(filled, bt.balance0, "HEADLINE  spread 0.2p + $6/lot RT + 0.1p slip, worst-case bars", out_lines)

    df.to_csv(os.path.join(OUT, "trades.csv"), index=False)
    monthly.to_frame("ret_pct").to_csv(os.path.join(OUT, "monthly.csv"))

    # ---------- sensitivity grid ----------
    grids = [
        ("zero costs, worst bars", engine.Costs(spread=0, commission_rt=0, slippage=0), "worst"),
        ("zero costs, best bars", engine.Costs(spread=0, commission_rt=0, slippage=0), "best"),
        ("realistic costs, best bars", engine.Costs(), "best"),
        ("1.5x costs, worst bars", engine.Costs(spread=0.3 * engine.PIP, commission_rt=9.0,
                                                slippage=0.15 * engine.PIP), "worst"),
        ("retail spread 1.0p no comm, worst", engine.Costs(spread=1.0 * engine.PIP,
                                                           commission_rt=0.0,
                                                           slippage=0.1 * engine.PIP), "worst"),
    ]
    for label, costs, amb in grids:
        b = engine.Backtest(m5, m15, costs=costs, ambiguity=amb)
        tr, _, _ = b.run(start=START, end=END)
        d = trades_frame(tr)
        f = d[d.status == "filled"]
        if f.empty:
            out_lines.append(f"\n=== {label} === no fills")
            continue
        stats(f, b.balance0, label, out_lines)

    text = "\n".join(out_lines)
    print(text)
    with open(os.path.join(OUT, "summary.txt"), "w") as fh:
        fh.write(text + "\n")


if __name__ == "__main__":
    main()
