# DISPATCH RUNBOOK — deploy & operate the DOW bot (for Claude "dispatch")

**Status: PRE-BUILD DRAFT.** Written before the bot exists. Items marked
`[FILL AFTER BUILD]` get their exact filenames/commands once Fable 5 builds the
bot and the acceptance gate is green. Everything else is final.

**Audience: the Claude "dispatch" agent running locally on the user's Windows
PC.** Your job is to *set up, verify, launch, and health-check* the bot on this
machine so the user is hands-off. You are the operator, not the trader — the bot
trades itself once running.

---

## 0. Ground truth / boundaries (do not violate)

- **Host = the user's own always-on Windows PC.** MT5 terminal, the bot, and you
  all run here. No VPS.
- **Account = FTMO-Demo, $100k USD.** This is a **DEMO forward-test**, not funded
  money. Do **not** switch to any live/funded account — only the user does that,
  and only after the demo forward-test passes (§7).
- **Never override a risk halt.** If the bot trips its drawdown / daily /
  consecutive-loss halt (spec §6), STOP and alert the user. Do not restart it to
  "keep trading." A halt is the system working.
- **Never commit or print real credentials.** They live in the local config /
  environment only (§3). Nothing secret goes into git, logs you share, or chat.
- If anything is ambiguous or a step fails in a way not covered here, **stop and
  ask the user** rather than improvising around a live trading process.

---

## 1. Pre-flight checklist (verify BEFORE any setup)

Confirm each; if any is false, fix or ask the user before proceeding:

1. **Windows** (the `MetaTrader5` Python package is Windows-only). `[verify OS]`
2. **FTMO MT5 terminal installed**, and you know its `terminal64.exe` path.
3. MT5 is **logged into the FTMO-Demo account** and shows live prices.
4. In MT5: **Tools → Options → Expert Advisors → "Allow Algo Trading"** is ON,
   and the toolbar **Algo Trading** button is green.
5. **Python 3.11+** installed and on PATH (`python --version`).
6. Internet reachable, including `https://nfs.faireconomy.media` (the news feed).
   Test: fetch it once; if blocked, the bot fail-safes to *not* trading, so this
   must work for the bot to trade at all.

---

## 2. Get the code

1. Clone/pull the repo branch that contains the built bot:
   `git clone -b claude/algay-audit-backtest-jk84nh <repo-url>` (or `git pull`).
2. Files you will use (from spec §14): `[FILL AFTER BUILD: exact bot entry
   filename, e.g. bot/dow_bot.py]`, `bot/dow_config.py`, `bot/news_filter.py`,
   `backtest/dow_acceptance.py`.

---

## 3. Configure — where the user's details go

Open `bot/dow_config.py` → the clearly-marked credentials block (spec §7.1).
Preferred: set **environment variables** (so nothing secret is in a file):

```
setx MT_LOGIN     <ftmo_demo_login>
setx MT_PASSWORD  <ftmo_demo_password>
setx MT_SERVER    FTMO-Demo
setx MT_PATH      "C:\Program Files\FTMO MetaTrader 5\terminal64.exe"   # your real path
setx TG_BOT_TOKEN <telegram_token>        # optional but strongly recommended
setx TG_CHAT_ID   <telegram_chat_id>
```

Then open a NEW terminal (so the vars load). Do **not** hardcode these into any
committed file. Verify `MT_PATH` points at the **FTMO** terminal (its path
differs from a stock MT5 install).

---

## 4. Install dependencies

```
python -m pip install --upgrade pip
python -m pip install MetaTrader5 pandas numpy pyarrow requests
```
(Exact list `[FILL AFTER BUILD]` from the bot's imports / requirements file.)

---

## 5. ACCEPTANCE GATE — must pass before launching the live loop

Run the acceptance backtest and confirm it is green:
```
python backtest/dow_acceptance.py
```
Expected (spec §11): all four EUR/GBP 2025-26 slices positive, combined t>2,
max drawdown < 8%, stop binds ~5%. **If any gate fails, do NOT start the bot —
report to the user and stop.** A failed gate means the code doesn't match the
validated strategy.

Also run the unit tests: `python -m pytest bot/test_dow_unit.py -q` (or
`[FILL AFTER BUILD: exact test command]`). All must pass.

---

## 6. Launch (the "press run" step)

1. In a **dedicated terminal** (VS Code integrated terminal is fine), run:
   `[FILL AFTER BUILD: exact run command, e.g. python bot/dow_bot.py]`
2. Confirm within ~1 minute:
   - a **"connected to FTMO-Demo"** log line,
   - a **startup Telegram alert** arrives (proves alerting works),
   - the log shows the computed **London time** and **next Monday/Wednesday**
     schedule, and no error loop.
3. Leave that terminal running. The bot now loops hands-off: it enters at 00:15
   London on Mon/Wed, exits 21:45, skips red-news days, and self-halts on limits.

**Auto-start on boot** (so a reboot resumes trading): create a Windows **Task
Scheduler** task → trigger "At log on / At startup" → action: run the same
command in the repo directory. `[FILL AFTER BUILD: exact command + working dir]`.

---

## 7. DEMO-FIRST discipline (do not skip)

This is a forward-test on FTMO-Demo. For the first **≥ 8 weeks**:
- Let it run; do not tune parameters mid-test (that re-introduces overfitting).
- Weekly, compare what it did to the backtest's expectation: ~2 trades/day on
  Mon/Wed, direction Mon=long/Wed=short, red days skipped, ~0.5–1%/mo in a good
  regime, drawdown small.
- Only after the demo forward-test looks consistent does the user consider a
  funded account. **You (dispatch) never make that switch.**

---

## 8. Health-check routine (when invoked / scheduled)

Continuous monitoring is primarily the **bot's own Telegram alerts** (every
entry/exit/skip/halt) plus an optional watchdog. When you are (re)invoked to
check health, verify:

1. **Process alive** — the bot terminal/process is still running. If dead →
   check the last log lines for the cause, report, and restart only if it was a
   transient crash (not a risk halt).
2. **MT5 connected** — recent "connected"/tick activity in the log; MT5 terminal
   still logged in.
3. **Today's behaviour** — on a Mon/Wed: did it enter ~00:15 and exit ~21:45, or
   log a valid skip reason (news/holiday/spread/late)? On Tue/Thu/Fri: correctly
   idle.
4. **No halt tripped** — if `MAX_DD_HALT`, `DAILY_HALT`, or `MAX_CONSEC_LOSSES`
   fired, the bot has stopped on purpose → **do not silently restart**; surface
   it to the user with the numbers.
5. **Calendar feed** — being fetched daily; if it's failing, the bot is
   skipping trades (fail-safe) — tell the user to fix connectivity.
6. **State file** consistent (no stuck "open" from a crash mid-day).

---

## 9. Failure playbook

| Situation | Dispatch action |
|---|---|
| Bot process crashed (transient error) | Inspect last logs; if not a risk halt, restart; report |
| MT5 disconnected | The bot auto-reconnects (reused ALGAY logic); if it can't for long, check MT5 login + report |
| Calendar fetch failing | Bot skips trading (fail-safe) — fix internet/feed; do NOT disable the filter |
| Risk halt tripped (DD / daily / consec) | **STOP. Alert user with figures. Do not override.** Likely regime decay (the known risk) |
| PC rebooted | Task Scheduler should relaunch; verify it did (§6) |
| Position stuck open past 21:45 after a crash | Bot's restart-safety closes it; verify flat; report |
| Acceptance gate fails on a fresh pull | Do not run live; report to user |

---

## 10. Escalate to the user (stop and ask) when:

- any risk halt trips, or a losing streak is building;
- the bot can't connect to MT5/FTMO for an extended period;
- the news feed is unreachable (bot is skipping everything);
- behaviour diverges from the backtest expectation (wrong days/direction, no
  news skips, unexpected sizes);
- anything requiring a change to strategy, sizing, or the live/funded switch —
  **those are the user's calls, never yours.**

---

## 11. To finalize after the build (checklist)

- [ ] Fill exact **filenames**, **run command**, **requirements**, **test
      command** placeholders above.
- [ ] Re-run `dow_acceptance.py` on the built code; paste the green results here.
- [ ] Add the built bot's **README** link and any bot-specific flags.
- [ ] Confirm the **Task Scheduler** command + working directory.
- [ ] Confirm the **news feed reachability** from this PC.

Once these are filled and the gate is green, this runbook is the complete
hands-off operating manual for dispatch.
