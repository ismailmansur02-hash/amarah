"""Combined bot on ONE $200k prop account, 2026 only: ALGAY London/NY sleeve
+ day-of-week sleeve. Shows what running BOTH looks like on previous 2026 data.

Sleeves (both on the same account, chronological, shared equity):
  ALGAY : non-inverted EURUSD, London/NY 14:00 UK session, KEEP the session
          flatten (account-safe, no overnight holds), 1% risk per trade.
  DoW   : long EURUSD each Monday, short each Wednesday, 1x notional
          (account return per trade = direction x daily% move - cost),
          held one day. ~0.4% typical exposure, well inside prop daily limit.

Prop rules: $200k, 80/20 split, monthly withdraw+reset, $180k static max-loss
floor (termination check). FX for GBP = today's 1.33802.

IMPORTANT: this is 2026 only (17 + ~55 trades). The DoW sleeve especially is
the kind of pattern that most often turns out to be luck; a good combined
2026 curve does NOT launder that risk. Treat as a forward-test candidate.
"""
import os
import sys

import numpy as np
import pandas as pd

sys.path.insert(0, os.path.dirname(__file__))
import engine  # noqa: E402

ACCOUNT = 200_000.0
SPLIT = 0.80
DD_FLOOR = 0.90 * ACCOUNT
FX = 1.33802
Y0, MID, Y1 = pd.Timestamp("2026-01-01"), pd.Timestamp("2026-04-01"), pd.Timestamp("2026-07-15")
COST_PCT = 0.6 * engine.PIP / 1.10 * 100     # ~0.6 pip daily-hold cost, in %

m5, m15 = engine.load_bars(os.path.join(os.path.dirname(__file__), "data/eurusd_m5.parquet"))


def algay_stream():
    bt = engine.Backtest(m5, m15, costs=engine.Costs(), ambiguity="worst",
                         mode="original", flatten_mode="session",
                         pending_cancel="cutoff", session_hours={14})
    tr, _, _ = bt.run(start=Y0, end=Y1)
    return [(t.t_exit, t.pnl / (t.balance_after - t.pnl), "ALGAY")
            for t in tr if t.status == "filled"]


def dow_stream():
    dd = m5.set_index("time")["close"].resample("1D").last().dropna()
    ret = (dd.pct_change() * 100).dropna()
    out = []
    for t, r in ret.items():
        if t < Y0 or t >= Y1:
            continue
        wd = t.dayofweek
        if wd == 0:                                   # Monday long
            out.append((t + pd.Timedelta(hours=23), (r - COST_PCT) / 100, "DoW"))
        elif wd == 2:                                 # Wednesday short
            out.append((t + pd.Timedelta(hours=23), (-r - COST_PCT) / 100, "DoW"))
    return out


def run(streams, label):
    trades = sorted(streams, key=lambda x: x[0])
    equity = ACCOUNT
    min_eq = ACCOUNT
    term = None
    rows = {}
    for t, r, _ in trades:
        month = pd.Period(t, "M")
        rows.setdefault(month, {"start": equity, "n": 0})
        equity *= (1 + r)
        min_eq = min(min_eq, equity)
        rows[month]["n"] += 1
        if equity <= DD_FLOOR and term is None:
            term = month
        rows[month]["end"] = equity
        # monthly payout+reset handled after loop per month boundary below
    # Re-run with proper monthly reset (need reset between months)
    equity = ACCOUNT
    min_eq = ACCOUNT
    term = None
    monthly = []
    for month in sorted({pd.Period(t, "M") for t, _, _ in trades}):
        start = equity
        n = 0
        for t, r, _ in trades:
            if pd.Period(t, "M") != month:
                continue
            equity *= (1 + r)
            min_eq = min(min_eq, equity)
            n += 1
            if equity <= DD_FLOOR and term is None:
                term = month
        pl_pct = (equity - start) / start * 100
        if equity > ACCOUNT:
            profit = equity - ACCOUNT
            your = profit * SPLIT
            equity = ACCOUNT
        else:
            profit = your = 0.0
        monthly.append((str(month), n, pl_pct, profit, your))
    m = pd.DataFrame(monthly, columns=["month", "n", "pl_pct", "firm_profit", "your80"])
    tot = m.your80.sum()
    print(f"\n===== {label} =====")
    print(f"{'Month':<9}{'trades':>7}{'acct P&L':>10}{'your 80% $':>12}"
          f"{'your 80% £':>12}")
    print("-" * 50)
    for _, r in m.iterrows():
        mm = pd.Period(r.month).strftime("%b")
        print(f"{mm:<9}{int(r.n):>7}{r.pl_pct:>+9.2f}%{r.your80:>12,.0f}{r.your80/FX:>12,.0f}")
    print("-" * 50)
    print(f"{'TOTAL':<9}{int(m.n.sum()):>7}{'':>10}{tot:>12,.0f}{tot/FX:>12,.0f}")
    print(f"take-home: ${tot:,.0f} (£{tot/FX:,.0f})  |  after 20% tax: "
          f"${tot*0.8:,.0f} (£{tot*0.8/FX:,.0f})")
    print(f"months paid: {(m.your80>0).sum()}/{len(m)}   "
          f"lowest equity ${min_eq:,.0f} vs ${DD_FLOOR:,.0f} floor -> "
          f"{'BLOWN '+str(term) if term else 'survived'}")
    return m


algay = algay_stream()
dow = dow_stream()
run(algay, "ALGAY London/NY sleeve only")
run(dow, "Day-of-week sleeve only")
mcomb = run(algay + dow, "COMBINED bot (both sleeves, one account)")
mcomb.to_csv(os.path.join(os.path.dirname(__file__), "out", "combined_2026.csv"), index=False)
