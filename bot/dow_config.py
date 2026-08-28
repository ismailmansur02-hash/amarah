"""DOW bot configuration — single source of truth (DOW_BOT_SPEC.md §7.1, §10).

Every tunable lives here. Do NOT tune the strategy constants: the entry/exit
clock and sizing were validated on real data and are frozen (spec §1, §15).
"""

import os

# ============================================================
#  >>> PUT YOUR ACCOUNT DETAILS HERE  <<<
#  (env vars take priority; edit the fallbacks for a quick demo start)
# ============================================================
MT_LOGIN = int(os.environ.get("MT_LOGIN", "0"))              # <-- your FTMO login number
MT_PASSWORD = os.environ.get("MT_PASSWORD", "")              # <-- your FTMO password
MT_SERVER = os.environ.get("MT_SERVER", "FTMO-Demo")         # <-- demo server (default)
MT_PATH = os.environ.get(                                    # <-- your FTMO terminal64.exe
    "MT_PATH", r"C:\Program Files\FTMO MetaTrader 5\terminal64.exe")
TG_BOT_TOKEN = os.environ.get("TG_BOT_TOKEN", "")            # <-- Telegram alerts (optional)
TG_CHAT_ID = os.environ.get("TG_CHAT_ID", "")                # <-- Telegram chat id (optional)
# ============================================================

# ---- instruments & schedule (FROZEN — validated on real FTMO/FMP data) ----
PAIRS = ["EURUSD", "GBPUSD"]
SIDE_BY_WEEKDAY = {0: "BUY", 2: "SELL"}      # Monday long, Wednesday short (London weekday)
ENTRY_LON = (0, 15)                          # enter at/after 00:15 Europe/London
ENTRY_LATE_CUTOFF_LON = (1, 15)              # never enter at/after 01:15 London
EXIT_LON = (12, 0)                           # time-exit at/after 12:00 London
# Noon exit (changed 2026-08-24, see backtest/REPORT.md "Hold-time"): by 12:00
# the trade holds 81% of the full day's return with 38% of the drawdown. The
# lower drawdown is what permits the larger size below. Well clear of rollover,
# so no swap either.

# ---- risk & sizing (spec §3-§4) ----
RISK_PER_PAIR = 0.0075                       # 0.75% per pair (1.5x, funded by the
                                             # noon exit's halved drawdown; the
                                             # backtest supported 2.5x - 1.5x is
                                             # deliberately conservative because
                                             # the ATR stop fires only 0.8% of
                                             # the time on this shorter hold)
MAX_DAILY_RISK = 0.015                       # hard cap on total OPEN risk
                                             # MUST be >= 2 x RISK_PER_PAIR or the
                                             # second pair is silently refused
K_ATR = 1.5                                  # protective stop = K_ATR x ATR14(daily)
ATR_PERIOD = 14
CONTRACT_SIZE = 100_000
PIP = {"EURUSD": 0.0001, "GBPUSD": 0.0001}

# ---- news / red-day filter (spec §5) ----
CAL_URL = "https://nfs.faireconomy.media/ff_calendar_thisweek.json"
NEWS_IMPACT_BLOCK = ("High",)                # red folder
HOLIDAY_IMPACTS = ("Holiday",)               # bank holidays also block (spec §2/§9)
NEWS_CCYS = ("USD", "EUR", "GBP", "ALL")     # currencies whose events matter
NEWS_BLOCK_ANY_CCY = False                   # True = ANY currency's red event blocks
NEWS_BUFFER_MIN = 60                         # pre-entry buffer, minutes
CAL_CACHE_MAX_H = 48                         # stale-cache fail-safe threshold

# ---- guards & kill-switches (spec §6) ----
MAX_SPREAD_PIPS = {"EURUSD": 2.0, "GBPUSD": 2.5}
DAILY_HALT = 0.02                            # -2% on the day -> stop for the day
MAX_DD_HALT = 0.08                           # -8% from peak equity -> flatten + halt bot
MAX_CONSEC_LOSSES = 4                        # losing trade-days in a row -> halt bot
MAX_ENTRY_ATTEMPTS = 3                       # order rejections before giving up the day

# ---- infrastructure ----
POLL_SECONDS = 30
MAGIC = 31                                   # order tag (ALGAY uses 30)
DEVIATION = 20                               # max slippage, points
_BOT_DIR = os.path.dirname(os.path.abspath(__file__))
STATE_FILE = os.path.join(_BOT_DIR, "dow_state.json")
CAL_CACHE_FILE = os.path.join(_BOT_DIR, "dow_calendar_cache.json")
LOG_FILE = os.path.join(_BOT_DIR, "dow_bot.log")
KILL_FILE = os.path.join(_BOT_DIR, "KILL")
