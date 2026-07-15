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
stability, and **beyond beta** (2026 EUR/GBP fell while the algo rose). It is
NOT proven for all time — weekday/flow effects can decay — so this bot ships to
**demo first** (§13) and carries kill-switches (§6).

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
- **Never scale up** the surviving pair when the other is skipped (news/holiday).
  A one-pair day simply risks 0.5%. Simpler = fewer failure modes.
- **Hard cap**: total open risk across all pairs ≤ `MAX_DAILY_RISK = 1.0%`.
  The bot must refuse any order that would breach this.

---

## 4. Position sizing & protective stop

- **ATR**: `ATR14_daily` = 14-period ATR on the **daily** timeframe for that
  pair, read at entry (from closed daily candles only — no look-ahead).
- **Stop distance**: `STOP_DIST = K_ATR × ATR14_daily`, `K_ATR = 1.5`.
  (1.5×ATR sits outside the normal daily range, so the time-exit — not the stop
  — is the usual exit; the stop is crash protection.)
- **Lot size**: `lots = (balance × RISK_PER_PAIR) / (STOP_DIST × CONTRACT)`,
  `CONTRACT = 100_000`. Then **floor to `volume_step`** (never round up — an
  ALGAY fix), clamp to `[volume_min, volume_max]`. If the floored size is below
  `volume_min`, **skip the trade and alert** (do not silently over-risk).
- Account currency assumed USD; if the deployed account is GBP/EUR, add the
  quote→account FX conversion to lot sizing (**[GATE]** verify on the real
  account before live).

---

## 5. News / event filter ("no red-day clusterfucks")

Skip trading a pair on days with high-impact scheduled news for its currencies.

- **Currencies that matter per pair**: EURUSD → {USD, EUR}; GBPUSD → {USD, GBP}.
  USD events (NFP, CPI, FOMC — FOMC is typically a **Wednesday**, exactly our
  short day) therefore skip **both** pairs.
- **Impact level to avoid**: **High only** ("red folder"). Medium/Low are traded.
- **Source (primary)**: ForexFactory weekly JSON
  `https://nfs.faireconomy.media/ff_calendar_thisweek.json`
  (fields: `title`, `country`/currency, `impact`, `date`/time). Parse once at
  startup and **re-fetch every day at 00:00 London** (calendar updates).
  **Secondary/fallback source** must be pluggable (interface in §7) in case the
  URL changes.
- **Rule**: for a pair on a trade day, if **any High-impact event for one of its
  currencies** is timestamped **within the holding window (00:15–21:45 London)
  that day**, **skip that pair for the day**. (Events strictly outside the window
  do not block — but see the pre-event buffer below.)
- **Pre-event buffer**: also skip if a High event lands within
  `NEWS_BUFFER_MIN = 60` minutes **before** the 00:15 entry (overnight spillover).
- **FAIL-SAFE (critical)**: if the calendar cannot be fetched or parsed and no
  cached copy ≤ 48h old exists, **do not trade that day at all**. "No data" must
  never mean "trade blind." Alert loudly.
- All skips are logged with the blocking event name.

---

## 6. Prop-firm compliance & kill-switches

Assume FTMO-style rules (5% daily loss limit, 10% static max loss, no weekend
holds). Our design already respects them (intraday only; ~1%/day risk). Add
**hard automated halts** (all values configurable):

- **Daily stop**: if realized+open P&L for the day ≤ `−DAILY_HALT` (default
  −2.0% of start-of-day balance), close everything and **stop trading until next
  day**.
- **Drawdown halt**: if equity ≤ `PEAK × (1 − MAX_DD_HALT)`, `MAX_DD_HALT = 6%`
  (buffer below the firm's 10%), **flatten and stop the bot**; require manual
  restart. Never let the account approach the firm's real limit.
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

Credentials via env vars only (`MT_LOGIN`, `MT_PASSWORD`, `MT_SERVER`, `MT_PATH`,
`TG_BOT_TOKEN`, `TG_CHAT_ID`) — never hardcode.

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
| `PAIRS` | `["EURUSD","GBPUSD"]` | enabled instruments |
| `SIDE_BY_WEEKDAY` | `{0:"BUY", 2:"SELL"}` | Mon long, Wed short |
| `ENTRY_LON` | `00:15` | entry time (London) |
| `ENTRY_LATE_CUTOFF_LON` | `01:15` | latest allowed entry |
| `EXIT_LON` | `21:45` | time exit (pre-rollover) |
| `RISK_PER_PAIR` | `0.005` | 0.5% risk per pair |
| `MAX_DAILY_RISK` | `0.010` | hard daily gross-risk cap |
| `K_ATR` | `1.5` | stop = K_ATR × ATR14(daily) |
| `NEWS_IMPACT_BLOCK` | `["High"]` | impact levels that skip a day |
| `NEWS_BUFFER_MIN` | `60` | pre-entry buffer for overnight events |
| `CAL_URL` | ForexFactory weekly JSON | primary calendar source |
| `CAL_CACHE_MAX_H` | `48` | max cache age before fail-safe blocks |
| `MAX_SPREAD_PIPS` | `{EUR:2.0, GBP:2.5}` | entry spread guard |
| `DAILY_HALT` | `0.02` | −2% day → stop for the day |
| `MAX_DD_HALT` | `0.06` | −6% from peak → flatten + stop bot |
| `MAX_CONSEC_LOSSES` | `4` | pause for review |
| `POLL_SECONDS` | `30` | loop cadence |
| `MAGIC` | `31` | order tag (distinct from ALGAY's 30) |

---

## 11. Data & backtest ACCEPTANCE GATE (must pass before any live/demo money)

Build `backtest/dow_acceptance.py` that reproduces the **exact live rules**
(00:15→21:45 London clock, 1.5×ATR protective stop, News filter, 0.5%/pair
sizing, spread & holiday skips) on historical data and asserts:

- **[GATE-1]** Positive net return on **EURUSD 2025, EURUSD 2026, GBPUSD 2025,
  GBPUSD 2026** individually.
- **[GATE-2]** Combined (all four) per-trade **t-stat > 2**.
- **[GATE-3]** Worst simulated drawdown **< 6%** (inside `MAX_DD_HALT`).
- **[GATE-4]** Adding the 1.5×ATR stop does **not** reduce combined return by
  >20% vs the no-stop version (confirms the stop is a safety net, not a
  strategy change).
- **[GATE-5]** The News filter removes ≥ the known red-Wednesday (e.g. FOMC)
  days and does not accidentally blank the whole sample.

Data needed:
- EURUSD 5-min — **already in repo** (`backtest/data/eurusd_m5.parquet`).
- **GBPUSD 5-min — MUST be fetched at build time** (only GBP *daily* EOD is in
  repo). Fetch 2025-01-01→now in ≤9-day windows (same method as
  `merge_data.py`) and validate the exact clock on GBP, not just EUR. **[GATE]**
- Economic-calendar history for the backtest news filter (or, if unavailable,
  approximate by skipping known monthly USD event dates — document the
  approximation).

If any GATE fails, **do not deploy**; report and stop. A failed gate is a
finding, not a nuisance.

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
backtest/dow_acceptance.py   the pre-live GATE backtest (§11)
backtest/data/gbpusd_m5.parquet   GBP 5-min fetched at build (§11)
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

1. Fetch **GBPUSD 5-min** and run GATE on it (only EUR 5-min in repo today).
2. Confirm the **account currency** on the real prop account; add FX conversion
   to sizing if not USD.
3. Confirm the prop firm's exact rules (daily %, max DD, news-trading clause,
   weekend clause) and map to §6 constants.
4. Confirm a **calendar history source** for the backtest news filter, or
   document the monthly-USD-event approximation.
5. Confirm broker **server timezone** and **daily-candle rollover** time.

Everything else above is decided. Build to this document.
