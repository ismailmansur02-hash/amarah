# DOW bot — run guide (FTMO-Demo, EURUSD + GBPUSD)

The day-of-week bot built to `DOW_BOT_SPEC.md`. Monday it buys EURUSD & GBPUSD,
Wednesday it sells them; enters 00:15 London, protective stop at 1.5×ATR(14,
daily), always flat by 21:45 London (no overnight, no swap, no weekend risk).
0.5% of balance risked per pair, red-news days skipped, hard kill-switches.

**This is a DEMO forward-test build. Do not point it at funded money until the
demo has run ≥8 weeks and matched expectations (spec §13).**

## One-time setup (Windows PC that stays on)

1. Install the FTMO MT5 terminal, log into the **FTMO-Demo** account, and turn
   **Algo Trading ON** (toolbar button green; also Tools → Options → Expert
   Advisors → Allow algorithmic trading).
2. Install Python 3.11+ (tick "Add to PATH"), then in a terminal:
   ```
   python -m pip install -r bot/requirements.txt
   ```
3. Put your details in — either environment variables (preferred):
   ```
   setx MT_LOGIN     <your FTMO demo login>
   setx MT_PASSWORD  <your FTMO demo password>
   setx MT_SERVER    FTMO-Demo
   setx MT_PATH      "C:\Program Files\FTMO MetaTrader 5\terminal64.exe"
   setx TG_BOT_TOKEN <telegram bot token>      (optional, recommended)
   setx TG_CHAT_ID   <telegram chat id>
   ```
   …then open a **new** terminal — or edit the marked block at the top of
   `bot/dow_config.py`. Check `MT_PATH` matches your actual FTMO terminal path.

## Run

```
python bot/dow_bot.py
```

That's it. Within a minute you should see (and get on Telegram) a startup line
with the balance, schedule, and broker clock offset. Leave the terminal open —
the bot handles everything: entries, exits, news skips, reconnects, halts.

- **Stop everything now:** create an empty file named `KILL` in the `bot/`
  folder → the bot flattens and exits on its next 30-second poll.
- **After a risk halt** (drawdown / 4 losing days): the bot stays idle on
  purpose, even across restarts. Review what happened first, then:
  ```
  python bot/dow_bot.py --reset-halt
  python bot/dow_bot.py
  ```

## Auto-start after a reboot (recommended)

Task Scheduler → Create Task → Trigger **At log on** → Action **Start a
program**: program `python`, arguments `bot\dow_bot.py`, start-in = the repo
folder. (MT5 must also auto-start and stay logged in: put the terminal in
shell:startup or set it in Task Scheduler the same way.)

## What the alerts mean

| Alert | Meaning |
|---|---|
| `ENTER BUY EURUSD 0.55 @ …` | Monday/Wednesday entry filled, stop attached |
| `closed EURUSD #… (P&L was …)` | 21:45 time-exit |
| `… position gone before time-exit` | the 1.5×ATR protective stop took it out |
| `SKIPPED today - USD CPI [High]` | red-news day, sat out (your rule) |
| `calendar unavailable (fail-safe…)` | news feed down → bot refuses to trade blind — check internet |
| `daily halt: …` | day lost 2% → flat + no more trades today (automatic) |
| `CRITICAL … BOT HALTED` | drawdown/losing-streak halt → needs your review + `--reset-halt` |

## Files it writes (all in `bot/`, all git-ignored)

`dow_state.json` (crash-safe day state), `dow_calendar_cache.json` (news
cache), `dow_bot.log` (full log). Delete none of them while it runs.

## Expectations (from the validated backtest — not promises)

2025→Jul 2026 on real data: ~+0.79%/month average, 15/19 months positive,
max drawdown −3.1%. 2024 was flat-to-negative — the halts exist precisely for
such regimes. Roughly 2 trades/day on Mondays and Wednesdays, nothing on other
days, ~4% of trades end on the protective stop.
