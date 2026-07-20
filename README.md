> This repo also contains **[prep-a-constable/](prep-a-constable/)** — the Prep a
> Constable app workspace with its own full audit
> ([prep-a-constable/AUDIT.md](prep-a-constable/AUDIT.md)) and project rules
> ([prep-a-constable/CLAUDE.md](prep-a-constable/CLAUDE.md)).

# ALGAY 3.0 "inversion" — audit & backtest

EURUSD mean-reversion bot (15M signals inside UK-anchored 4H sessions) plus a full
independent audit and backtest, produced 2026-07-14.

## Read these first

| File | What it says |
|---|---|
| **[backtest/REPORT.md](backtest/REPORT.md)** | Full backtest Jan 2023 – Jul 2026. **The strategy as coded loses (−29% at realistic costs, −12% at zero costs) and hits the +0.5%/month target in only 8 of 43 months. The profitable numbers quoted in the bot's docstring are reproduced only by a simulation with fractal look-ahead bias.** |
| **[AUDIT.md](AUDIT.md)** | Line-by-line code audit: 1 critical strategy finding, 5 high / 4 medium operational bugs, all patched in `bot/algay_3_inversion.py`. |

## Layout

```
bot/algay_3_inversion.py    the bot, with all audit fixes applied (original logic preserved)
bot/test_bot_unit.py        21 offline unit tests (MetaTrader5 stubbed)  — python3 bot/test_bot_unit.py
backtest/engine.py          faithful re-implementation of the session logic for backtesting
backtest/test_fidelity.py   cross-validates engine vs the bot's own functions on real data
backtest/run_backtest.py    full backtest + cost-sensitivity grid       — python3 backtest/run_backtest.py
backtest/make_charts.py     equity + monthly-returns charts
backtest/merge_data.py      merges the fetched FMP 5-min dumps into the parquet dataset
backtest/data/eurusd_m5.parquet   EURUSD 5-min bars Dec 2022 – Jul 2026 (263,632 bars)
backtest/out/               trades.csv, monthly.csv, summary.txt, equity.png, monthly.png
```

Dependencies for the backtest: `pandas`, `numpy`, `pyarrow`, `matplotlib`.
The bot itself additionally needs `MetaTrader5` and `requests` on a Windows host.

## Bottom line

Software reliability was fixable and is fixed (reconnect-forever, verified orders and
flatten, crash-safe session state, boundary-race guard). Market performance is not a
software property: on 3.5 years of data this strategy's edge disappears once the
backtest is done without look-ahead. Do not fund it in its current form; forward-test
on demo and re-validate with `backtest/run_backtest.py` after any change.
