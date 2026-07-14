# ALGAY 3.0 "inversion" — Full Backtest Report

**Verdict: the strategy, exactly as the bot trades it, loses money over Jan 2023 – Jul 2026
and does not meet the +0.5%/month target. The profitable backtest quoted in the bot's
docstring (793 trades, ~84% wins, 12/15 quarters positive) is reproduced almost exactly by a
simulation that contains fractal look-ahead bias — an edge the live bot cannot access.**

---

## 1. What was tested

`bot/algay_3_inversion.py`, replicated decision-for-decision in `backtest/engine.py`:
UK-anchored 4H sessions (22/02/06/10/14/18 Europe/London, DST-aware), closed-15M-candle
logic, sweep of the previous 4H high/low, Williams fractal (period 4) lock, equal-level
filter (1 pip / 96 bars), 70.5% fib entry as an inverted stop order, near-miss cancel
(2 pips), no placement in the final 10 min, pending cancelled at the 10-min cutoff, and
position force-flattened 5 min before session end. Max one placement per session,
1% risk per trade, compounding.

**Fidelity was verified, not assumed** (`backtest/test_fidelity.py`): the engine's fractal
flags, latest-confirmed-fractal selection, equal-level verdicts and entry-level arithmetic
were cross-checked against the bot's own functions (imported with a stubbed MetaTrader5)
on 400 random 299-bar windows of real data — 0 mismatches — and session anchors were
checked against `current_session_open()` across DST switches — 0 mismatches. Individual
trades were re-verified by hand against raw bars.

## 2. Data

- EURUSD 5-minute bars, FMP feed, **Dec 25 2022 – Jul 14 2026** (263,632 bars),
  aggregated to 15M for signals; fills simulated on the 5M bars.
- Bars are mid quotes stamped America/New_York (verified by the Fri 17:00 / Sun 17:00 NY
  market open/close signature); treated as bid with ask = bid + spread (MT5 convention).
- Data quality: 0 OHLC violations, 0 nulls. 96 of 5,544 sessions (1.7%) have partial
  data (mostly holiday periods); they are traded on the bars that exist.

## 3. Headline result — bot as coded, realistic FTMO-style costs

Costs: 0.2 pip spread + $6/lot round-trip commission + 0.1 pip stop slippage.
Where TP and SL are both touchable inside one 5M bar, the loss is booked (worst case —
in practice this occurred 0 times).

| Metric | Value |
|---|---|
| Sessions with data | 5,503 |
| Orders placed | 2,488 (1,387 expired unfilled, 386 invalid-vs-market, 334 near-miss cancels) |
| **Filled trades** | **381** |
| Win rate | 49.3% |
| Exit mix | 193 session-flatten, 144 TP, 44 SL |
| **Total return** | **−29.1%** ($100k → $70.9k) |
| Profit factor | 0.62 |
| Max drawdown | −30.8% |
| Average month | **−0.78%** |
| Months ≥ +0.5% | **8 of 43** |
| Positive months | 14 of 43 |
| Positive quarters | 3 of 15 |

### Monthly returns (%)

| Year | Jan | Feb | Mar | Apr | May | Jun | Jul | Aug | Sep | Oct | Nov | Dec | Year |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 2023 | −0.57 | −1.60 | +0.00 | +0.46 | −5.27 | −0.57 | −0.76 | −3.50 | +1.67 | +0.13 | −2.30 | −0.06 | **−11.9%** |
| 2024 | −1.40 | −0.96 | −1.82 | −0.30 | +0.58 | −1.17 | −0.98 | −1.23 | +0.93 | −3.61 | −0.35 | −1.23 | **−11.0%** |
| 2025 | −1.62 | +0.63 | +0.66 | −5.06 | −2.60 | −1.38 | −0.24 | −0.16 | +1.11 | −1.89 | +0.30 | −0.36 | **−10.3%** |
| 2026 | +1.00 | +2.32 | −1.71 | −0.35 | +0.45 | +0.23 | −1.17 | | | | | | **+0.7%** |

![equity](out/equity.png)
![monthly](out/monthly.png)

## 4. Why this contradicts the quoted backtest — look-ahead bias

A Williams fractal (period 4) is only knowable **4 bars after** its bar prints. The live
bot correctly waits for that confirmation. If a backtest instead lets the strategy act on
the fractal *at its own bar time*, it trades on information from the future.

Re-running the engine with exactly that one change (plus letting trades run to TP/SL
instead of the session flatten) reproduces the docstring's claims almost line by line:

| | Docstring claim | Look-ahead reconstruction | Bot as coded (honest) |
|---|---|---|---|
| Trades | 793 | 683 | 381 |
| Win rate | ~84% | 77.5% | 49.3% |
| Positive quarters | **12 / 15** | **12 / 15** | 3 / 15 |
| Outcome | profitable | +93% (zero-cost) | **−29%** |

Two structural effects account for the whole gap:

1. **Confirmation delay** — waiting 4 bars moves the entry a full hour later; the same
   levels are placed when the move is already over. Win rate (to TP/SL, zero-cost) drops
   from 77.5% to 68.2%, below the 70.4% breakeven required at 0.42:1 reward:risk.
2. **Session flatten** — entries structurally happen late in the 4H session (sweep + 1h
   confirmation + stop-order fill), so 51% of live-bot fills get force-closed at
   session_end−5min before reaching TP or SL.

## 5. Cost sensitivity (bot as coded)

| Scenario | Trades | Win rate | Total return | Months ≥ +0.5% |
|---|---|---|---|---|
| Zero costs (upper bound) | 374 | 54.5% | −12.1% | 13/43 |
| Realistic (0.2p + $6/lot + 0.1p slip) | 381 | 49.3% | −29.1% | 8/43 |
| 1.5× realistic | 388 | 47.2% | −38.5% | 5/43 |
| Retail 1.0-pip spread, no commission | 418 | 43.5% | −43.2% | 3/43 |

Even with **zero** trading costs the coded strategy loses. Costs only deepen it: the
average winner is small (≈0.42R and many flatten exits), so spread/commission consume a
large fraction of every win.

## 6. Method caveats

- FMP mid-quote bars vs FTMO bid feed: candle shapes can differ by fractions of a pip;
  with a 2-pip near-miss band and 1-pip equal filter, individual sessions can flip, but
  aggregate results are robust to this (the zero-cost bound already loses).
- Fills simulated on 5M bars, not ticks. Intra-bar TP/SL ambiguity never actually
  occurred (0 trades), so tick sequencing is not driving the result.
- 1.7% of sessions have partial data (holidays); the engine trades the bars that exist.
- Fractional lot sizing (no 0.01 step rounding); swap/rollover ignored — the bot never
  holds through 5pm NY (all positions die at session end), so swap is genuinely zero.
- No account-currency conversion (assumes USD account).

## 7. What this means

- **Do not run this live expecting the docstring numbers.** The deployed logic has had
  negative expectancy for 3.5 years on this data, under every cost assumption tested,
  including zero.
- The +0.5%/month goal is not met: 8 of 43 months, average −0.78%/month.
- No guarantee of future profits is possible for any strategy; but here the evidence is
  the opposite — the claimed edge is a measurement artifact (look-ahead), not a property
  of the market.
- If you want to keep working on ALGAY: re-derive the original backtest with confirmed
  (non-repainting) fractals and the bot's own timing rules, then forward-test on demo
  only. The infrastructure in this repo (engine + fidelity tests) does exactly that and
  can be re-run in seconds (`python3 backtest/run_backtest.py`).

*Report generated 2026-07-14. Reproduce: `merge_data.py` → `test_fidelity.py` →
`run_backtest.py` → `make_charts.py`.*
