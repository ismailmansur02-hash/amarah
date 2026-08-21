# Hands-off setup — what Claude runs, and the one part it can't

**Short version:** everything *ongoing* is now automated. The one-time setup
needs a human for about 20 minutes, because of a hard platform constraint
explained below. After that you should not have to touch this again.

---

## 1. Why the bot cannot run in Cowork / the cloud

This is not a permissions or configuration problem, and no amount of setup
fixes it. Three independent blockers:

1. **MetaTrader 5 is Windows-only.** `bot/broker.py` imports the `MetaTrader5`
   package, which is a wrapper around the Windows MT5 terminal's local IPC
   interface. It does not exist for Linux. Every Anthropic cloud environment
   (including the one available on this account, "Amara") is Linux.
2. **No broker terminal, no connection.** Even with the package, the bot talks
   to a *running, logged-in* MT5 terminal on the same machine. A cloud session
   has none.
3. **Cloud sessions are ephemeral.** They are reclaimed after inactivity. The
   bot is a permanent `while True` loop that must be alive at 00:15 London every
   Monday and Wednesday, indefinitely. That is a daemon on an always-on machine,
   which is a different thing from an agent session.

So the *execution* layer needs a Windows machine that stays on. That is the
whole of the irreducible human requirement.

## 2. What IS automated now

| Layer | Runs where | Who does it |
|---|---|---|
| Setup (deps, tests, acceptance gate, auto-start) | Windows PC | `bot/ops/bootstrap_windows.ps1` — one command |
| Trading loop | Windows PC | the bot, hands-off, auto-restarts on crash and on reboot |
| Alerts (entry/exit/skip/halt) | your phone | the bot's Telegram alerts |
| Status publishing | Windows PC | `bot/ops/status_push.py`, hourly scheduled task |
| **Weekly health review** | **cloud, automatic** | **a scheduled Claude session — Fridays 17:00 UTC** |

The weekly review reads the heartbeat your PC publishes to the `bot-status`
branch, checks it against the expected behaviour (traded Mon/Wed, right
direction, news days skipped, no halts, drawdown small), and pushes/emails you a
short verdict. If a risk halt has tripped it tells you loudly and does **not**
restart anything. If the bot isn't deployed yet it sends one line and stops.

To change or stop it, ask Claude to update or delete the routine
"DOW bot weekly health review", or manage it in the claude.ai Routines UI.

## 3. Your one-time setup (~20 min)

You need an always-on Windows machine. Two options:

- **Your own PC**, left on. Free, but it must not sleep.
- **A Windows VPS** (~$15–30/month; FTMO and several brokers offer one, often
  free above a certain account size). This is the "I truly never think about it"
  option. You must rent it and log in yourself — payment and broker credentials
  are yours alone; never send them to Claude.

Then, on that machine:

1. Install MT5, log into the FTMO-Demo account, enable **Tools → Options →
   Expert Advisors → Allow Algo Trading** (toolbar button green).
2. Install Python 3.11+ and git.
3. Clone the repo and set five environment variables (values never leave the
   machine, never go in git):
   ```
   setx MT_LOGIN     <your demo login>
   setx MT_PASSWORD  <your demo password>
   setx MT_SERVER    FTMO-Demo
   setx MT_PATH      "C:\Program Files\FTMO MetaTrader 5\terminal64.exe"
   setx TG_BOT_TOKEN <telegram token>     # optional but strongly recommended
   setx TG_CHAT_ID   <telegram chat id>
   ```
4. Open a **new** terminal and run one command from the repo root:
   ```
   powershell -ExecutionPolicy Bypass -File bot\ops\bootstrap_windows.ps1
   ```
   It verifies the machine, installs dependencies, runs the 55 unit tests, runs
   the acceptance gate, and registers both scheduled tasks. It refuses to arm
   anything if the tests or the gate fail.
5. Start it: `.venv\Scripts\python.exe bot\dow_bot.py` — or just reboot, since
   the task now starts it at logon.

If you would rather not do steps 1–5 by hand, install Claude Code on that
machine and point it at `bot/DISPATCH_RUNBOOK.md`; it will drive the whole thing
except entering your credentials, which only you should ever type.

## 4. After that

Nothing, by design. The bot trades, alerts you on Telegram, and halts itself if
risk limits trip. The Friday review lands on your phone. The standing rules do
not change: this is a **demo forward-test for at least 8 weeks**, no parameter
tuning mid-test, and the switch to funded money is **your** decision, never
Claude's and never automatic.
