# ALGAY 3.0 "inversion" — Code Audit

Audit of `bot/algay_3_inversion.py` (as uploaded, 405 lines). Every finding below marked
**FIXED** has a surgical patch in this repo's copy of the bot; behaviour on FTMO/EET is
otherwise preserved. Strategy-level findings are in `backtest/REPORT.md`.

## Critical — strategy

### S1. The quoted backtest contains fractal look-ahead bias (docstring lines 4–5, 20)
The docstring claims 793 trades / ~84% wins / 12-of-15 quarters positive. A faithful
re-simulation of the code produces 381 trades / 49% wins / 3-of-15 quarters and −29%.
Injecting look-ahead (acting on a fractal at its bar time instead of 4 bars later, and
skipping the session flatten) reproduces the claim — including exactly 12/15 positive
quarters. The live bot cannot trade information it doesn't have yet, so it cannot earn
the docstring's numbers. Full evidence: `backtest/REPORT.md`. **Docstring warning added.**

## High — operational ("will it keep running?")

### H1. Bot kills itself after 12 minutes of connection failure (`connect`, `ensure_connected`)
`connect()` tries 12×/60s, then `ensure_connected()` raises `SystemExit` — a weekend VPS
network blip longer than 12 min permanently stops a "24/5 hands-off" bot, potentially
with a live position and no operator awake. **FIXED**: reconnect retries forever with
capped backoff and periodic Telegram alerts; `SystemExit` removed.

### H2. `order_send` results never checked (`place_stop`, `flatten`, `cancel_pendings`)
A rejected order (invalid stops, unsupported filling mode, market closed, `None` on
transport error) is only string-interpolated into a log line. The bot then behaves as if
it traded (`traded = True`) or as if the position closed. On a broker that rejects
`ORDER_FILLING_IOC` for pendings the bot would silently never trade. **FIXED**:
retcode-checked wrapper; on `INVALID_FILL` retries RETURN then FOK filling; loud alerts
on any non-DONE result.

### H3. `flatten()` doesn't verify the position actually closed
Single attempt, no retcode check, `tick is None` silently skips the close — a position
can survive into the next session, breaking the strategy contract (and prop-firm session
discipline). **FIXED**: up to 3 attempts per position with fresh ticks, verification
pass, and a CRITICAL alert if anything is still open.

### H4. Crash mid-session can double-trade (`main` recovery path)
On any exception `main()` re-enters `run_session()` with fresh state (`traded=False`).
If the bot had already traded that session (e.g. position hit TP, then a Telegram/API
hiccup raised), it can place a second trade in the same session — violating the
one-trade rule and doubling session risk. **FIXED**: session state (`session_open`,
`traded`) persisted to `algay_state.json`; on entry, a session already marked traded
stays traded.

### H5. H4 reference race at session start (`run_session` ref selection)
`h4.iloc[-2]` is only the just-completed candle if the broker has already opened the new
H4 bar. Re-entry happens ~30 s after the boundary; if no tick has arrived yet (Sunday
open, holidays), the reference is the wrong candle for the entire session. **FIXED**:
expected reference open time computed from the broker clock offset; on mismatch the bot
waits and refetches, then falls back to building the reference from M15 bars.

## Medium

### M1. `lot_size` rounds volume to the NEAREST step — can round risk up
`round(lots/step)*step` can exceed the intended 1% (e.g. 1.0149 → 1.01 fine, but 1.015 →
1.02). Worse, the `volume_min` clamp silently over-risks small accounts (a 2-pip stop on
a $500 account forces 0.01 lots ≈ 4× intended risk). **FIXED**: floor to step; alert
whenever the min-volume clamp raises effective risk above target.

### M2. No `symbol_select` after connect
If EURUSD isn't in Market Watch, `copy_rates_from_pos`/`symbol_info_tick` return `None`
and the bot idles forever ("market closed"). **FIXED**: `symbol_select(SYMBOL, True)` on
connect.

### M3. No TP/SL sanity or stops-level check before `order_send`
If the locked fractal ends up on the wrong side of the entry (possible after violent
moves), the order is rejected server-side ("invalid stops") — previously invisible (H2).
**FIXED**: explicit geometry check (TP and SL on correct sides of the level) and
`trade_stops_level` distance check; skip with alert instead of firing a doomed order.

### M4. Server-time vs UTC mixing in sweep gating (`last["time"] >= session_open`)
Candle times are broker time; `session_open` is UTC. On an EET broker (server ahead of
UTC) the comparison is safe only because pre-session bars fall inside the reference H4
candle's range and therefore can't trigger a sweep. On a UTC or UTC-negative broker,
in-session bars would FAIL the check for the first hours — the bot would silently skip
sweeps. Works on FTMO; portability trap. **FIXED**: candle times converted to UTC via
the broker-clock offset before the comparison.

## Low / notes (not changed)

- `market_is_open()` declares the market closed after 180 s without a fresh tick — during
  ultra-quiet periods (Christmas week) this can flatten and pause the bot. Safe direction;
  left as designed.
- `alert()` can block the trading loop up to 10 s per Telegram call (timeout). Acceptable
  at a 20 s poll cadence.
- Risk sizing assumes a USD-denominated account (EURUSD quote = USD). On EUR/GBP/CZK
  accounts 1% is misestimated by the FX rate. Note added in code.
- `server_now()` depends on the machine clock — keep NTP enabled on the VPS (comment
  already says so; startup now logs the measured broker-clock offset).
- Dead check `if now is None` removed (cosmetic).
- The equal-level filter, fib arithmetic, fractal logic and session anchoring were
  cross-validated against an independent implementation on real data (400 random windows,
  0 mismatches) — the signal math is implemented correctly.

## Test coverage added

`bot/test_bot_unit.py` (runs offline, MetaTrader5 stubbed): session anchoring across DST,
fractal confirmation timing (no repaint), equal-level filter, entry-level arithmetic,
lot flooring + min-volume alert, order retcode/filling fallback, flatten retry, and
session-state persistence.
