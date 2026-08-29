# DOW-BOT — Build Specification (v1.0, 2026-07-15)

**This is the implementation spec for the day-of-week EUR/GBP bot.** It is written
to be built as-is (by Fable 5) with no further decisions required. Every ambiguous
choice below is already decided and justified. Where a number must be re-checked
against data before going live, it is called out as a **[GATE]** — a hard
pre-live acceptance test, not an open question.

Nothing in here is to be run yet. This document is the contract.

---

## 0. What the strategy is (evidence basis — do not re-derive)

Trade a **day-of-week drift** in EUR/USD and GBP/USD:

- **Monday → LONG**, **Wednesday → SHORT**. No trade Tue/Thu/Fri.
- Enter near the start of the London calendar day, exit before the daily
  rollover. Pure directional day-trade, **no overnight hold**.

Validated (see `backtest/oos_test.py`, `stress_test*.py`, REPORT.md Addenda 2–3):

| Slice | Total | t-stat | Notes |
|---|---|---|---|
| EURUSD 2025 | +6.8% | 1.35 | positive, not individually significant |
| EURUSD 2026 | +7.9% | 2.69 | significant |
| GBPUSD 2025 | +11.4% | 2.30 | significant |
| GBPUSD 2026 | +10.8% | 3.41 | significant |
| EURUSD 00:15–21:45 clock, 2025+26 | +11.9% | 2.08 | the exact live clock (below) |

Passed: multiple-comparison permutation (corrected p=0.037), 10k bootstrap
(90% CI clears 0), outlier removal (18/27 Weds profitable), day-boundary
stability, and **beyond beta** (2026 EUR/GBP fell while the algo rose).

### Real-data validation of the EXACT live rules (do not re-derive)

Ran the exact clock + 1.5×ATR stop + 0.5%/pair sizing on **real FTMO GBPUSD
5-min** (user-supplied) and **FMP EURUSD 5-min**, both pairs on one $100k USD
account (`backtest/dow_acceptance.py`):

| Year | Total | Avg/mo | ≥+0.5% months |
|---|---|---|---|
| 2023 | +1.4% | +0.12% | 5/12 |
| **2024** | **−1.8%** | **−0.15%** | 4/12 |
| 2025 | +6.3% | +0.52% | 4/12 |
| 2026 (→Jul) | +9.2% | +1.27% | 4/7 |
| **All 2023–26** | **+15.5%** | +0.34% | 17/43 |

Combined per-trade **t = 2.23 (all), 3.48 (2025–26)**; win 54%; the ATR stop
binds only 5% of the time (genuine safety net, not the strategy); **max
drawdown −6.2%** at 0.5%/pair.

### ⚠ The honest expectation (read before promising anyone a number)

- **It meets +0.5%/mo in the recent regime** (2025 +0.52%, 2026 +1.27%) and
  cleared +1%/mo in 2026 — the target is realistic *when the edge is on*.
- **It does NOT hit +0.5% every month, and 2024 was a losing year (−1.8%).**
  Weekday/flow effects decay; 2024 is that decay, in the data. **No sizing fixes
  a dead regime** — leverage multiplies 2024's losses and blows the drawdown
  limit (see §4). So: target achievable in good regimes, **not guaranteed
  monthly**, and the kill-switches (§6) exist to *stop* trading when the edge
  turns off. This ships to **demo first** (§13). Anyone told "guaranteed 1%/mo"
  is being misled.

---

## 1. Exact trading rules

For each **enabled pair** (EURUSD, GBPUSD) independently, on each **London
calendar day**:

1. If today is **Monday**: side = **BUY**. If **Wednesday**: side = **SELL**.
   Otherwise: no trade.
2. **Entry**: first bot poll at/after **00:15 Europe/London**, provided it is
   also **before 01:15 London** (max 60-min late-entry window — see §9). Place a
   **market order** in `side`. Record the fill as the day's entry.
3. **Protective stop** (safety only, not the primary exit): attach SL at
   `entry ∓ STOP_DIST` (below entry for BUY, above for SELL), where
   `STOP_DIST = K_ATR × ATR14_daily` (§4). No take-profit.
4. **Exit**: at/after **21:45 Europe/London** the same day, **close at market**.
   This is the primary exit and always fires before the 22:00 London rollover
   (so: no swap, no weekend gap, no overnight-hold rule breach).
5. **Max one entry per pair per day.** After exit, no re-entry that day.

Rationale for the clock: 00:15→21:45 London captured the strongest, cleanest
edge in testing (+11.9%, t=2.08 on EUR 2025+26) while closing before the
illiquid rollover. Trimming to London-only hours **weakened** it — do not
"optimise" the window further; it was already swept and this is the robust point.

---

## 2. Timezone & clock (get this exactly right — #1 source of silent bugs)

- All schedule times are **Europe/London, DST-aware** (`zoneinfo.ZoneInfo`).
  Reuse the pattern in `bot/algay_3_inversion.py` (`UK_TZ`, `current_session_open`).
- **Weekday is determined in London time**, not UTC and not broker-server time.
- "Now" for all timing decisions = **real machine UTC clock**
  (`datetime.now(timezone.utc)`), converted to London — **never** broker tick
  time (demo tick clocks drift; this was a real ALGAY finding).
- Broker candle/tick timestamps are server-local; when comparing to a wall-clock
  time, convert via a measured server-UTC offset (reuse `server_offset()`).
- Holidays: skip any day flagged by the holiday check (§5) — thin liquidity.

---

## 3. Instruments & USD-correlation exposure model

EURUSD and GBPUSD are ~0.9 correlated and **both are the inverse of USD**: long
both = one concentrated short-USD bet; short both = one long-USD bet. Treat a
day's two trades as **~one correlated position**, not two independent ones.

**Decision (fixed):**
- Trade **both** pairs, each at **half risk** (`RISK_PER_PAIR = 0.5%` of
  balance). A normal day therefore risks ~1.0% gross but ~0.95% economically
  (correlation-adjusted). This keeps EUR/GBP divergence as mild diversification
  without doubling the USD bet.
- **Sizing vs the FTMO 10% max-loss limit — why 0.5% is the ceiling, not 1%**
  (from `dow_acceptance.py`, real data 2023–26):

  | Risk/pair | Total | Avg/mo | Max drawdown | Verdict |
  |---|---|---|---|---|
  | 0.40% | +12% | +0.27% | −5.0% | very safe, undershoots target in slow regimes |
  | **0.50% (default)** | **+15.5%** | **+0.34% (0.5–1.3% in 2025–26)** | **−6.2%** | **chosen** |
  | 0.75% | +24% | +0.52% | −9.2% | too close to FTMO's 10% |
  | 1.00% | +33% | +0.70% | **−12.1%** | **BLOWS an FTMO account** |

  Chasing a higher monthly number by raising risk walks straight into the 10%
  wall. **0.5%/pair is the default and the prudent maximum**; only lower it for
  more safety. Never raise it to force a target.
- **Never scale up** the surviving pair when the other is skipped (news/holiday).
  A one-pair day simply risks 0.5%. Simpler = fewer failure modes.
- **Hard cap**: total open risk across all pairs ≤ `MAX_DAILY_RISK = 1.0%`.
  This **must** stay ≥ 2×`RISK_PER_PAIR`, or the second pair is silently refused.
  The bot must refuse any order that would breach this.

---

## 4. Position sizing & protective stop

- **ATR**: `ATR14_daily` = 14-period ATR on the **daily** timeframe for that
  pair, read at entry (from closed daily candles only — no look-ahead).
- **Stop distance**: `STOP_DIST = K_ATR × ATR14_daily`, `K_ATR = 1.5`.
  (1.5×ATR sits outside the normal daily range, so the time-exit — not the stop
  — is the usual exit; the stop is crash protection.)
- **Lot size**: `lots = (balance × RISK_PER_PAIR) / (STOP_DIST × CONTRACT)`,
  `CONTRACT = 100_000`. `balance` = live account balance read from MT5
  (`account_info().balance`), **base case $100,000 USD**. Then **floor to
  `volume_step`** (never round up — an ALGAY fix), clamp to
  `[volume_min, volume_max]`. If the floored size is below `volume_min`, **skip
  the trade and alert** (do not silently over-risk).
- **Account currency = USD** (confirmed). EURUSD and GBPUSD are USD-quoted, so
  pip value is in USD and **no FX conversion is needed** — sizing is exact as
  written. (If a non-USD account is ever used, a quote→account conversion must
  be added; not required here.)
- Worked example at $100k, 0.5%/pair: risk $500/pair. If ATR14≈0.0060 and
  K_ATR=1.5 → STOP_DIST≈0.0090 (90 pips) → `lots ≈ 500/(0.0090×100000) ≈ 0.55`.

---

## 5. News / event filter ("no red-day clusterfucks")

**User rule (their own words): "all red days I never used to trade."** A "red
day" on ForexFactory = a day containing a **High-impact (red folder)** event. So:
if a trade day carries a red event affecting our pairs, **sit out**.

- **Source**: ForexFactory calendar, `https://www.forexfactory.com/calendar`
  (what the user uses). The page itself is Cloudflare/bot-protected, so the bot
  consumes **ForexFactory's machine-readable weekly JSON feed**:
  `https://nfs.faireconomy.media/ff_calendar_thisweek.json`
  (array of events; fields: `title`, `country`=currency, `impact`
  ∈ {High, Medium, Low, Holiday}, `date`=ISO datetime). This is the standard FF
  feed and matches the red/orange/yellow folders on the site 1:1
  (High = red). Parse at startup and **re-fetch daily at 00:00 London**. The
  fetcher is **pluggable** (a second source can be dropped in if the URL changes).
  *Note: this feed could not be reached from the build sandbox (network policy
  403); it must be reachable from the VPS — verified in the build-time test.*
- **Impact to block**: **High only** ("red"). Medium/Low are fine to trade.
- **Which currencies**: default `NEWS_CCYS = {USD, EUR, GBP}` — the only
  currencies driving our two pairs. A red **USD** event (NFP, CPI, and **FOMC —
  typically a Wednesday, our short day**) skips **both** pairs; a red **EUR**
  event (ECB) skips EURUSD only; a red **GBP** event (BoE) skips GBPUSD only.
  Optional stricter flag `NEWS_BLOCK_ANY_CCY=False`: if set True, ANY currency's
  red event skips that day entirely (fullest reading of "all red days"). Default
  is the USD/EUR/GBP rule, which already covers essentially every red day that
  moves EUR/GBP.
- **Window**: block a pair if a qualifying red event is timestamped **within the
  holding window (00:15–21:45 London)** that day, **or** within
  `NEWS_BUFFER_MIN = 60` min **before** the 00:15 entry (overnight spillover).
  All-day events / events with no precise time → treat as blocking the day.
- **FAIL-SAFE (critical)**: if the calendar cannot be fetched or parsed and no
  cached copy ≤ 48h old exists, **do not trade that day at all**. "No data" must
  never mean "trade blind." Alert loudly.
- Every skip is logged and alerted with the blocking event's name/time.

---

## 6. Prop-firm compliance & kill-switches

Assume FTMO-style rules (5% daily loss limit, 10% static max loss, no weekend
holds). Our design already respects them (intraday only; ~1%/day risk). Add
**hard automated halts** (all values configurable):

- **Daily stop**: if realized+open P&L for the day ≤ `−DAILY_HALT` (default
  −2.0% of start-of-day balance), close everything and **stop trading until next
  day**.
- **Drawdown halt**: if equity ≤ `PEAK × (1 − MAX_DD_HALT)`, `MAX_DD_HALT = 8%`
  (buffer below FTMO's 10%; historical worst was −6.2% at 0.5%/pair, so 8% gives
  headroom while still stopping before the firm limit), **flatten and stop the
  bot**; require manual restart. Never let the account approach the firm's limit.
- **Consecutive-loss halt**: after `MAX_CONSEC_LOSSES = 4` losing days in a row,
  pause and alert for manual review (possible regime decay — the known risk).
- **Spread guard**: at entry, if `spread > MAX_SPREAD_PIPS` (default 2.0 pips
  EUR, 2.5 GBP), skip the entry (illiquid / news spike).
- **Manual kill-switch**: presence of a file `KILL` in the bot dir → flatten and
  exit on next poll.
- Every halt sends a Telegram alert. All are enforced **before** any order.

---

## 7. Execution & infrastructure (reuse the audited ALGAY code — do not rewrite)

Reuse, verbatim where possible, from `bot/algay_3_inversion.py` (already audited
& unit-tested in `bot/test_bot_unit.py`):

- `connect()` — reconnect-forever with capped backoff, `symbol_select` for BOTH
  pairs.
- `ensure_connected()`, `server_offset()`, `server_now()`, `market_is_open()`.
- `order_send_checked()` — retcode-checked, IOC→RETURN→FOK filling fallback.
- `flatten()` — verified close with retries (extend to per-symbol).
- `lot_size()` — with the floor-not-round fix and min-volume alert (adapt to
  ATR stop distance & per-pair risk).
- `alert()` — console + Telegram, outage-tolerant.
- State persistence pattern (`load_state`/`save_state`) — extend schema (§8).

New modules to add:
- `bot/news_filter.py` — `class Calendar` with `refresh()`, `is_blocked(pair,
  date, window) -> (bool, reason)`, pluggable `sources: list[fetcher]`, 48h
  cache, fail-safe = blocked.
- `bot/dow_bot.py` — main loop + state machine (§8).
- `bot/dow_config.py` — all constants (§10) in one importable module.

### 7.1 Account & credentials — WHERE YOU PUT YOUR DETAILS

`bot/dow_config.py` must contain **one clearly-marked block** at the very top, so
the user fills it in in exactly one place. Preferred: read from environment
variables, with a commented in-file fallback for the demo. Template:

```python
# ============================================================
#  >>> PUT YOUR ACCOUNT DETAILS HERE  <<<
#  (env vars take priority; edit the fallbacks for a quick demo start)
# ============================================================
import os
MT_LOGIN    = int(os.environ.get("MT_LOGIN",  "0"))          # <-- your FTMO login number
MT_PASSWORD =     os.environ.get("MT_PASSWORD", "")          # <-- your FTMO password
MT_SERVER   =     os.environ.get("MT_SERVER",  "FTMO-Demo")  # <-- demo server (default)
MT_PATH     =     os.environ.get("MT_PATH",    r"C:\Program Files\FTMO MetaTrader 5\terminal64.exe")
TG_BOT_TOKEN =    os.environ.get("TG_BOT_TOKEN", "")         # <-- Telegram alerts (optional)
TG_CHAT_ID   =    os.environ.get("TG_CHAT_ID",   "")         # <-- Telegram chat id (optional)
# ============================================================
```

Rules: **server defaults to `FTMO-Demo`**; `MT_PATH` points at the FTMO MT5
terminal (the installer's default path differs from a stock MT5 — the config
comment must say "set this to your FTMO terminal64.exe"). `main()` must refuse to
start if `MT_LOGIN==0` or `MT_PASSWORD==""` (reuse ALGAY's guard) with a clear
message telling the user to fill the block. **Never hardcode real credentials in
committed files**; the fallbacks stay blank/demo.

---

## 8. Scheduling state machine (poll loop)

Single loop, poll every `POLL_SECONDS = 30`. Persist a per-day record so a
crash/restart cannot double-trade or miss an exit.

**State file** `dow_state.json`: `{ "london_date": "YYYY-MM-DD", "pairs": {
"EURUSD": {"status": "idle|blocked|open|closed", "ticket": int|null,
"entry_px": float|null}, "GBPUSD": {...} }, "day_halted": bool, "bot_halted":
bool }`. Reset the per-day block when the London date rolls over.

Each poll:
1. `ensure_connected()`; if `KILL` file → flatten all, exit; if `bot_halted` →
   idle. If `not market_is_open()` → flatten any open, idle.
2. Compute `now_london`, `today = now_london.date()`, `wd = weekday`.
   If new London date → reset per-day state, `refresh()` calendar, clear
   `day_halted`.
3. Enforce halts (§6): drawdown/consec → may set `bot_halted`; daily → `day_halted`.
4. If `wd not in {Mon, Wed}` or holiday or `day_halted` → ensure flat, idle.
5. For each enabled pair with `status == idle`:
   - If `now_london ≥ 21:45` → too late to open today → mark `closed` (skipped).
   - Elif `00:15 ≤ now_london < 01:15` and calendar `is_blocked` is False and
     spread OK and risk-cap OK → **enter** (market + ATR SL), set `status=open`,
     persist. If blocked/late/guard-fail → mark `blocked`/`closed` with reason.
6. For each pair with `status == open`:
   - If `now_london ≥ 21:45` **or** position no longer exists (SL hit) → close if
     needed, set `status=closed`, persist, record P&L.
7. **Restart safety**: on startup, for any pair whose state says `open`: if a live
   position exists and `now_london ≥ 21:45` → close immediately; if it exists and
   still in-window → adopt it (do not re-enter); if no live position but state
   said open → mark `closed` (SL already took it).
8. Sleep `POLL_SECONDS`.

Wrap the loop body in try/except like ALGAY’s `main()` — log, sleep, reconnect,
never die on a transient error; only `SystemExit`/`KILL` stops it.

---

## 9. Edge cases & failure handling (each MUST be handled)

- **Bot starts after 00:15 but before 01:15** → enter (still within window).
- **Bot starts after 01:15** → skip entry for the day (never chase a late entry;
  it changes the trade vs backtest).
- **Bot down over the 21:45 exit, restarts later with position open** → close
  immediately on first poll (§8.7).
- **SL hit before 21:45** → position gone; mark closed; do not re-enter.
- **Holiday Monday/Wednesday** (thin) → skip (holiday list + optional
  volume/spread sanity).
- **Calendar fetch fails, no fresh cache** → skip the whole day (fail-safe).
- **Partial fill / requote** → `order_send_checked` handles; if final volume 0,
  treat as no-trade and alert.
- **Spread spike at entry** → spread guard skips.
- **DST switch days** (Mar/Oct) → London-time math handles automatically; add a
  unit test around both switch dates.
- **One pair blocked, other not** → trade the other at 0.5% only.
- **Duplicate-order protection** → state file + "one entry per pair per day".
- **Broker rejects SL (too close / invalid stops)** → reuse ALGAY `stops_ok`
  distance check; if invalid, widen to broker min or skip + alert.

---

## 10. Config parameters (single source of truth — `bot/dow_config.py`)

| Name | Default | Meaning |
|---|---|---|
| `START_BALANCE_NOTE` | `$100,000 USD` | base account size (live balance is read from MT5) |
| `MT_SERVER` | `FTMO-Demo` | broker server (see §7.1 credentials block) |
| `PAIRS` | `["EURUSD","GBPUSD"]` | enabled instruments |
| `SIDE_BY_WEEKDAY` | `{0:"BUY", 2:"SELL"}` | Mon long, Wed short |
| `ENTRY_LON` | `00:15` | entry time (London) |
| `ENTRY_LATE_CUTOFF_LON` | `01:15` | latest allowed entry |
| `EXIT_LON` | `21:45` | time exit (pre-rollover) |
| `RISK_PER_PAIR` | `0.005` | 0.5% risk per pair |
| `MAX_DAILY_RISK` | `0.010` | hard daily gross-risk cap (must be >= 2x RISK_PER_PAIR) |
| `K_ATR` | `1.5` | stop = K_ATR × ATR14(daily) |
| `NEWS_IMPACT_BLOCK` | `["High"]` | impact levels that skip a day ("red") |
| `NEWS_CCYS` | `{USD, EUR, GBP}` | currencies whose red events block |
| `NEWS_BLOCK_ANY_CCY` | `False` | True = ANY currency's red event skips the day |
| `NEWS_BUFFER_MIN` | `60` | pre-entry buffer for overnight events |
| `CAL_URL` | `nfs.faireconomy.media/ff_calendar_thisweek.json` | ForexFactory JSON feed |
| `CAL_CACHE_MAX_H` | `48` | max cache age before fail-safe blocks |
| `MAX_SPREAD_PIPS` | `{EUR:2.0, GBP:2.5}` | entry spread guard |
| `DAILY_HALT` | `0.02` | −2% day → stop for the day |
| `MAX_DD_HALT` | `0.08` | −8% from peak → flatten + stop bot (hist. worst −6.2%) |
| `MAX_CONSEC_LOSSES` | `4` | pause for review |
| `POLL_SECONDS` | `30` | loop cadence |
| `MAGIC` | `31` | order tag (distinct from ALGAY's 30) |

---

## 11. Data & backtest ACCEPTANCE GATE (must pass before any live/demo money)

Build `backtest/dow_acceptance.py` that reproduces the **exact live rules**
(00:15→21:45 London clock, 1.5×ATR protective stop, News filter, 0.5%/pair
sizing, spread & holiday skips) on historical data and asserts:

- **[GATE-1] — PASS.** Positive on **EURUSD 2025/2026 and GBPUSD 2025/2026**
  individually (GBP: +7.5% / +7.9%; EUR: +4.1% / +7.4% on the exact clock).
  ⚠ **2023 weak (+), 2024 NEGATIVE** on both — a known dead regime, not a bug;
  handled by the drawdown/consec-loss halts, not by pretending it away.
- **[GATE-2] — PASS.** Combined per-trade **t = 2.23 (all years), 3.48
  (2025–26)**.
- **[GATE-3] — PASS at 0.5%/pair.** Worst simulated drawdown **−6.2% < 8%**
  (`MAX_DD_HALT`). Fails if risk is raised to 0.75%+ — do not.
- **[GATE-4] — PASS.** The 1.5×ATR stop binds only ~5% of trades and does not
  materially change returns — it is a safety net, not the strategy.
- **[GATE-5] — build-time.** With the News filter live, confirm it removes known
  red days (e.g. FOMC Wednesdays) and does not blank the sample.

Status: **all data-driven gates already pass** on real FTMO GBP + FMP EUR via
`backtest/dow_acceptance.py`. Remaining build-time gates are GATE-5 (needs the
live/historical calendar) and the VPS calendar-reachability check.

Data:
- EURUSD 5-min — in repo (`backtest/data/eurusd_m5.parquet`, FMP).
- **GBPUSD 5-min — in repo** (`backtest/data/gbpusd_m5_ftmo.parquet`, **real
  FTMO feed supplied by the user**, 2023–2026). Gap CLOSED.
- Economic-calendar history for the backtest news filter (or approximate by
  skipping known monthly USD event dates — document the approximation).

If any GATE fails on a re-run, **do not deploy**; report and stop. A failed gate
is a finding, not a nuisance.

---

## 12. Test checklist (offline, stubbed MT5 + mock calendar)

`bot/test_dow_unit.py` must cover:
- weekday→side mapping; no-trade Tue/Thu/Fri.
- London-time scheduling incl. **both DST switch days**; entry window &
  late-skip; exit trigger; restart-with-open-position closes.
- sizing: ATR stop → lots, floor-not-round, min-volume skip+alert, daily-risk cap.
- news filter: High USD event skips **both** pairs; High EUR skips EUR only; High
  GBP skips GBP only; Medium/Low do **not** skip; fail-safe blocks on
  fetch-failure with stale cache; pre-entry buffer.
- halts: daily, drawdown (flatten+halt), consecutive-loss, spread guard, KILL file.
- order path: retcode DONE/PLACED ok; INVALID_FILL fallback; None handled;
  invalid-stops widened/skipped.
- state persistence: no double-entry across restart; per-day reset on date roll.

All tests run with no network and no MT5 (stub module, mock `Calendar`).

---

## 13. Rollout (do not skip a phase)

1. **Build + GATE** (§11) — all gates green, all unit tests green.
2. **Demo forward-test** ≥ 8 weeks on the target prop firm's demo/eval. Log every
   decision (entry, skip+reason, exit, P&L). Compare demo fills to the backtest's
   expected trades weekly.
3. **Review**: demo months must broadly resemble backtest (direction hit-rate,
   ~0.5–1%/mo at this sizing, drawdown in bounds, news skips firing correctly).
4. **Small live / eval** only after demo passes. Start at the specified sizing;
   scale only on continued evidence.
5. The **21 July reminder** (already set) kicks off phase 2.

---

## 14. Deliverables (files Fable 5 will create)

```
bot/dow_config.py            all constants (§10)
bot/news_filter.py           calendar fetch + red-day logic + fail-safe cache
bot/dow_bot.py               main loop + state machine (§8), reuses ALGAY infra
bot/test_dow_unit.py         offline unit tests (§12)
backtest/dow_acceptance.py   the pre-live GATE backtest (§11)  [ALREADY WRITTEN]
backtest/data/gbpusd_m5_ftmo.parquet   real FTMO GBP 5-min (§11)  [ALREADY IN REPO]
backtest/data/eurusd_m5.parquet        EUR 5-min (FMP)            [ALREADY IN REPO]
bot/DOW_BOT_README.md        run/deploy/monitor instructions
```

Reused unchanged: `bot/algay_3_inversion.py` infra functions (import or copy the
audited helpers into a shared `bot/broker.py`).

---

## 15. Risks & mitigations (eyes open)

| Risk | Mitigation |
|---|---|
| Weekday edge decays (regime change) | consec-loss halt, demo-first, ongoing monitoring; it is the known #1 risk |
| EUR/GBP correlation = one bet | half-size each, daily-risk cap; treat as ~1 position |
| Only 2 years / no gold test | demo forward-test is the real proof; widen pairs later |
| News spike inside the day | red-day skip + spread guard + 1.5×ATR stop |
| Broker clock / DST bug | London-time math + server-offset; DST unit tests |
| Calendar source breaks | pluggable sources + 48h cache + fail-safe skip |
| Over-optimisation of the clock | clock already swept; **frozen** at 00:15–21:45, no further tuning |
| Prop rule breach | intraday-only, drawdown halt at 6% (below firm's 10%) |

---

## 16. Open items to resolve AT BUILD TIME (not now)

1. ~~Fetch GBPUSD 5-min~~ — **RESOLVED: real FTMO GBP M5 supplied and validated**
   (`backtest/data/gbpusd_m5_ftmo.parquet`; `dow_acceptance.py` gates pass).
2. ~~Account currency~~ — **RESOLVED: USD, $100k, FTMO-Demo.** No FX conversion.
3. Confirm the prop firm's exact rules (daily %, max DD, news-trading clause,
   weekend clause) and map to §6 constants. (FTMO defaults assumed: 5% daily,
   10% max, no weekend holds — our design already fits.)
4. Confirm the **live host can reach** `nfs.faireconomy.media` (blocked in the
   build sandbox; must be open on the live host = the user's always-on Windows
   PC). Confirm a **calendar history source** for the backtest news filter, or
   document the monthly-USD-event approximation.
5. Confirm broker **server timezone** and **daily-candle rollover** time (for
   ATR14-daily reads; FTMO server is EET/EEST = UTC+2/+3).

**Deployment target (confirmed): the user's own always-on Windows PC** (not a
VPS). MT5 terminal + the bot + the local "Claude dispatch" agent all run on that
one machine. No VPS provisioning; add Windows **auto-start on boot** (Task
Scheduler) so a reboot resumes the bot. Operational runbook for dispatch:
`bot/DISPATCH_RUNBOOK.md`.

Everything else above is decided. Build to this document.


---

## Hold-time revision (2026-08-24) — adopted, then REVERTED (2026-08-25)

Recorded in full because the reasoning error is worth keeping.

A noon exit was adopted on the finding that the trade holds 81% of the day's
return by 12:00 London with 38% of the drawdown, and the acceptance gate showed
**+18.2% vs +15.5%**. A 2026-only test then reversed the decision.

**The error.** That +18.2% compared the noon clock at **0.75%**/pair against the
original clock at **0.50%**/pair. The sizing did the work, not the clock.
Isolating them over 2023–26:

| Spec | Total | maxDD |
|---|---|---|
| 21:45 @0.50% (original) | **+15.50%** | −6.22% |
| 21:45 @0.75% | +23.93% | −9.22% (breaches the 8% halt) |
| 12:00 @0.50% | **+11.78%** | −2.48% |
| 12:00 @0.75% (shipped briefly) | +18.10% | −3.70% |

**At matched risk the 21:45 clock earns more.** The noon exit's only real
advantage was lower drawdown, which is a weaker basis for a change because it
relies on historical max drawdown as a sizing input, and that always understates
future drawdown.

**The 2026 evidence.** Paired by day and pair, with only the exit clock differing
(n=724), the noon-minus-21:45 difference:

| Year | mean diff/trade | t | 21:45 total | 12:00 total |
|---|---|---|---|---|
| 2023 | +0.0117% | 0.92 | +1.39% | +3.80% |
| 2024 | +0.0074% | 0.51 | −1.35% | +0.23% |
| 2025 | −0.0013% | −0.10 | +6.31% | +6.06% |
| **2026** | **−0.0676%** | **−3.73** | **+9.17%** | **+1.30%** |
| ALL | −0.0054% | −0.75 | **+16.09%** | +11.78% |

The noon exit's advantage lived in 2023–24 and **significantly reversed in
2026**: the afternoon block now pays (t = +3.73), and the difference-in-
differences between 2023–24 and 2026 is t = −3.75. Across all data the paired
test gives t = −0.75 — no evidence the noon clock is better, with the point
estimate against it.

**Reverted** to `EXIT_LON=(21,45)`, `RISK_PER_PAIR=0.005`,
`MAX_DAILY_RISK=0.010`. The bar for changing a spec validated over 3.5 years is
higher than the bar for undoing a change that rests on one drawdown estimate and
is contradicted by the most recent data.

**Kept from the episode:** a unit test asserting `2 × RISK_PER_PAIR ≤
MAX_DAILY_RISK` (raising per-pair risk without raising the cap would silently
refuse the second pair), and a lot-sizing test pinned to the live risk constant
rather than a hard-coded literal (lot-step flooring is not linear in risk).
