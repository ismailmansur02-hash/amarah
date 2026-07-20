# Systematic edge search — full campaign report (2026-07-20)

**Mandate:** "all the currencies, every timeframe, find a profitable edge,
factor in news, think like a hedge fund."

**How a fund actually does this:** not "there is always an edge" — the opposite.
Hundreds of candidate hypotheses, a train/test wall, an explicit hypothesis
ledger (so significance is judged against how many things were tried), real
transaction costs, and a validation gauntlet designed to *kill* candidates.
Whatever survives all of that is the edge. That process was run here.

## Data used

| Set | Span | Granularity |
|---|---|---|
| EURUSD, GBPUSD (FTMO) | Jan 2023 → Jul 2026 | **5-minute** (263k bars each, tz-verified) |
| AUD, NZD, JPY, CHF, CAD vs USD | Jan 2023 → Jul 2026 | daily |
| Gold (GCUSD), NAS100 (QQQ) | Jan 2023 → Jul 2026 | daily |
| US high-impact news: 1,153 events (44 NFP, 43 CPI, 28 Fed) **with consensus estimates → true surprise values** | Jan 2023 → Jul 2026 | timestamped |

Split: **TRAIN Jan 2023–Mar 2025, TEST Apr 2025–Jul 2026** (test touched once,
after selection). Costs: FTMO raw spreads (0.55–2.0 bps/round trip by pair).

## Hypothesis ledger (~290 tested)

| Family | Hypotheses | Train shortlist (\|t\|≥3-ish) | Survived validation |
|---|---|---|---|
| A. Hour-of-day seasonality (24h × 2 pairs) | 96 | EUR 12h; GBP 22h, 23h | **0** |
| B. Session structure (open/fix/Asian breakout ×2 pairs) | 32 | EUR fix-reversal | **0** |
| C. Momentum & mean-reversion (6 lookbacks × 9 instruments + weekly) | 126 | EUR 3-day MR | **0** |
| E. Turn-of-month + cross-sectional FX momentum | 20 | – | **0** |
| D. News (reaction-momentum, surprise-direction × 3 holds × 2 pairs, pooled) | 13 | – | **0** |

With ~290 hypotheses, ~1 train hit at \|t\|≥3 is expected by pure chance; we got
5. Every one died under scrutiny — the pattern of a fully mined dataset, not of
undiscovered treasure.

## Why each shortlisted candidate died

1. **GBPUSD 22:00/23:00-London drift (train t=+11!)** — the most seductive
   number of the whole campaign. It is the **rollover dead zone** (5–7pm NY):
   median tick volume 47 vs ~400 in liquid hours, real spreads 3–8 pips vs the
   0.63 bps assumed. Quoted drift you cannot capture. Hour 22 also flipped sign
   in TEST (−0.53, t −2.2). *Untradeable artifact.*
2. **EURUSD hour-12 fade (train t −3.4)** — TEST +0.12 bps, t +0.2. *Noise.*
3. **4pm-fix reversal** (fade 13:00→15:45 into the WM fix; real academic
   prior) — the screen initially showed TEST +1.27 bps t 2.6, but the
   validation gauntlet exposed a **cost-accounting bug in the screen itself**
   (sign-flipping a net-of-cost series credits the spread back as profit).
   Correctly computed: EURUSD +0.07 train / +0.17 test bps — the gross effect
   (~+0.6 bps) is real but **smaller than the spread**; GBPUSD negative; no
   parameter-grid stability; portfolio Sharpe −0.25. *Exists, but retail costs
   eat 100% of it. Banks monetize this; an FTMO account cannot.*
4. **EURUSD 3-day mean-reversion (train t −3.5 → MR +6.3 bps/day)** — TEST
   +0.69 bps t 0.3. The 2023–24 chop regime ended; MR died with it. *Regime
   artifact.*
5. **CPI surprise-direction, 4h hold** (pre-registered, strongest economic
   prior of the inflation era): train +16.5 bps/event t 1.8 (n=16), TEST
   +2.8 bps (n=9). Right direction, but ~1 tradeable event a month and a
   sample too small for a decision. *Watchlist, not a strategy.*

## The verdict

**The only edge in this data that survives every test remains the one already
in the bot** — the day-of-week risk-FX effect (Mon long / Wed short EURUSD +
GBPUSD, news-filtered): 2025→Jul 26 +16%, t 3.5, coherent across the whole
risk-currency cluster, and robust to every stress test run since.

The correct hedge-fund conclusion from ~290 hypotheses across 9 instruments,
5-minute to weekly, with true news surprises: **this market at this cost
structure offers one durable seasonal edge to a retail-sized account, and we
already hold it.** The searches above are the *evidence* for that claim, not a
failure to look hard enough. "There is always an edge" is true for entities
with sub-0.1-bp costs and fix/flow information; at 0.5–2 bp retail spreads,
almost everything that glitters in a backtest is either untradeable
microstructure (candidate 1), your own bugs (candidate 3), or a dead regime
(candidate 4).

**Action:** no change to the bot. Watchlist: CPI-surprise continuation (revisit
when n ≥ 30 in the test era), and the fix-reversal *if* ever trading on
raw-spread institutional pricing.

Scripts: `edge_prep.py` (data + tz verification), `edge_intraday.py` (A/B),
`edge_daily.py` (C/E), `edge_news.py` (D), `edge_validate_fix.py` (gauntlet).
