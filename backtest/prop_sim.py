"""Prop-account simulation of the candidate strategy.

Candidate: non-inverted (limit entry) EURUSD, London/NY 14:00 UK session only,
run to TP/SL, realistic costs (0.2p spread + $6/lot RT + 0.1p slippage).

Prop model (as specified):
  * Funded account: $200,000 (firm capital; evaluation already passed).
  * Risk 1% of CURRENT account equity per trade.
  * Profit split 80/20 in the trader's favour.
  * Monthly withdrawal + reset: at each month end, if equity > $200k the
    profit is paid out (you get 80%) and the account resets to $200k.
    A losing month pays nothing and carries its drawdown into next month
    (must be recovered before the account is back above $200k).
  * Drawdown rule: static max loss 10% => a $180,000 floor. If equity ever
    touches it, the account is terminated (typical FTMO-style rule).
  * Daily 5% loss rule: never binds here - at most one trade/day, each
    risking ~1% - but checked anyway.
  * Tax: shown at 0% (e.g. handled upstream by DEEL) and 20%.

Per-trade returns are base-invariant (lots scale linearly with equity), so
one engine run yields each trade's fractional equity change r_i, which is
then replayed under the prop cashflow rules for any account size.
"""
import os
import sys

import numpy as np
import pandas as pd

sys.path.insert(0, os.path.dirname(__file__))
import engine  # noqa: E402

ACCOUNT = 200_000.0
SPLIT = 0.80
DD_FLOOR = 0.90 * ACCOUNT        # 10% static max loss => $180k
CAND = dict(mode="original", flatten_mode="none", pending_cancel="end",
            session_hours={14})


def trade_returns(span):
    """(t_exit, r) per filled trade; r = pnl / equity_at_trade (base-invariant)."""
    bt = engine.Backtest(m5, m15, costs=engine.Costs(), ambiguity="worst", **CAND)
    tr, _, _ = bt.run(start=span[0], end=span[1])
    rows = []
    for t in tr:
        if t.status == "filled":
            # reconstruct the equity the engine used at that trade
            eq_before = t.balance_after - t.pnl
            rows.append((t.t_exit, t.pnl / eq_before))
    return pd.DataFrame(rows, columns=["t_exit", "r"]).sort_values("t_exit")


def simulate(span, label):
    df = trade_returns(span)
    df["month"] = df["t_exit"].dt.to_period("M")
    equity = ACCOUNT
    min_equity = ACCOUNT
    terminated = None
    monthly = []
    for month, grp in df.groupby("month"):
        start_eq = equity
        ntr = len(grp)
        for r in grp["r"]:
            equity *= (1 + r)
            min_equity = min(min_equity, equity)
            if equity <= DD_FLOOR and terminated is None:
                terminated = month
        acct_pl = equity - start_eq
        if equity > ACCOUNT:                     # payout + reset
            profit = equity - ACCOUNT
            your_share = profit * SPLIT
            equity = ACCOUNT
        else:                                    # losing month: carry drawdown
            profit = 0.0
            your_share = 0.0
        monthly.append(dict(month=str(month), trades=ntr,
                            acct_pl_pct=acct_pl / start_eq * 100,
                            end_equity=start_eq + acct_pl,
                            firm_profit=profit, your_80=your_share))
    m = pd.DataFrame(monthly)
    return m, min_equity, terminated


def show(span, title):
    m, min_eq, term = simulate(span, title)
    print(f"\n================  {title}  ================")
    print(f"{'Month':<9}{'trades':>7}{'acct P&L':>10}{'firm profit':>13}"
          f"{'your 80%':>11}{'  after 20% tax':>15}")
    print("-" * 66)
    tot80 = 0.0
    for _, r in m.iterrows():
        tot80 += r.your_80
        print(f"{r.month:<9}{int(r.trades):>7}{r.acct_pl_pct:>+9.2f}%"
              f"{r.firm_profit:>13,.0f}{r.your_80:>11,.0f}{r.your_80*0.8:>15,.0f}")
    print("-" * 66)
    n_months = len(m)
    print(f"{'TOTAL':<9}{int(m.trades.sum()):>7}{'':>10}"
          f"{m.firm_profit.sum():>13,.0f}{tot80:>11,.0f}{tot80*0.8:>15,.0f}")
    paid = (m.your_80 > 0).sum()
    print(f"\nMonths with a payout: {paid}/{n_months}   "
          f"(losing months pay $0 and carry the drawdown)")
    print(f"Your take-home  — no tax (DEEL-handled): ${tot80:,.0f}   "
          f"| after 20% tax: ${tot80*0.8:,.0f}")
    print(f"Avg per month   — no tax: ${tot80/n_months:,.0f}   "
          f"| after 20% tax: ${tot80*0.8/n_months:,.0f}")
    print(f"Lowest equity reached: ${min_eq:,.0f}  "
          f"(termination floor ${DD_FLOOR:,.0f})  "
          f"-> {'ACCOUNT BLOWN in ' + str(term) if term else 'account survived'}")


m5, m15 = engine.load_bars(os.path.join(os.path.dirname(__file__), "data/eurusd_m5.parquet"))
show((pd.Timestamp("2026-01-01"), pd.Timestamp("2026-07-15")),
     "2026  (Jan 1 - Jul 14, July partial)")
show((pd.Timestamp("2023-01-01"), pd.Timestamp("2026-07-15")),
     "FULL PERIOD  Jan 2023 - Jul 2026  (3.5 years, for viability)")
