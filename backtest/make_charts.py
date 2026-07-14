"""Render backtest charts: equity comparison + monthly returns vs target."""
import sys, os, bisect
sys.path.insert(0, os.path.dirname(__file__))

import pandas as pd
import numpy as np
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import matplotlib.dates as mdates

import engine

SURFACE = "#fcfcfb"; INK = "#0b0b0b"; INK2 = "#52514e"; GRID = "#e6e5e2"
BLUE = "#2a78d6"; RED = "#e34948"
OUT = os.path.join(os.path.dirname(__file__), "out")

m5, m15 = engine.load_bars(os.path.join(os.path.dirname(__file__), "data/eurusd_m5.parquet"))
START, END = pd.Timestamp("2023-01-01"), pd.Timestamp("2026-07-12")


def equity(bt):
    tr, _, _ = bt.run(start=START, end=END)
    rows = [(t.t_exit, t.balance_after) for t in tr if t.status == "filled"]
    df = pd.DataFrame(rows, columns=["t", "bal"]).sort_values("t")
    df = pd.concat([pd.DataFrame({"t": [START], "bal": [bt.balance0]}), df])
    return df


class LookaheadBT(engine.Backtest):
    def latest_confirmed(self, idx_arr, j):
        k = bisect.bisect_right(idx_arr, j) - 1
        if k < 0:
            return -1
        i = idx_arr[k]
        return int(i) if i >= j - (engine.WINDOW - 1) else -1


real = equity(engine.Backtest(m5, m15, costs=engine.Costs(), ambiguity="worst"))
la = equity(LookaheadBT(m5, m15, costs=engine.Costs(spread=0, commission_rt=0, slippage=0),
                        ambiguity="worst", pending_cancel="end", flatten_mode="none"))

plt.rcParams.update({
    "font.size": 11, "text.color": INK, "axes.edgecolor": GRID,
    "axes.labelcolor": INK2, "xtick.color": INK2, "ytick.color": INK2,
    "axes.grid": True, "grid.color": GRID, "grid.linewidth": 0.8,
    "axes.spines.top": False, "axes.spines.right": False,
    "figure.facecolor": SURFACE, "axes.facecolor": SURFACE, "savefig.facecolor": SURFACE,
})

# ---- chart 1: equity curves ----
fig, ax = plt.subplots(figsize=(10.5, 4.6), dpi=150)
ax.plot(la.t, la.bal / 1000, color=RED, lw=2,
        label="Original backtest reconstruction (fractal look-ahead, no flatten)")
ax.plot(real.t, real.bal / 1000, color=BLUE, lw=2,
        label="Bot as coded (confirmed fractals, session flatten, realistic costs)")
ax.axhline(100, color=INK2, lw=1, ls=(0, (4, 4)), alpha=0.7)
ax.annotate(f"${la.bal.iloc[-1]/1000:,.0f}k", (la.t.iloc[-1], la.bal.iloc[-1] / 1000),
            xytext=(6, 0), textcoords="offset points", color=INK, fontweight="bold", va="center")
ax.annotate(f"${real.bal.iloc[-1]/1000:,.0f}k", (real.t.iloc[-1], real.bal.iloc[-1] / 1000),
            xytext=(6, -4), textcoords="offset points", color=INK, fontweight="bold", va="center")
ax.set_title("ALGAY 3.0 inversion - the claimed edge is look-ahead bias\n"
             "Equity on $100k, 1% risk per trade, EURUSD, Jan 2023 - Jul 2026",
             loc="left", color=INK, fontsize=12)
ax.set_ylabel("Balance ($k)")
ax.legend(frameon=False, loc="upper left", fontsize=9.5)
ax.xaxis.set_major_formatter(mdates.DateFormatter("%b %Y"))
ax.margins(x=0.01)
fig.subplots_adjust(right=0.93)
fig.savefig(os.path.join(OUT, "equity.png"), bbox_inches="tight")
plt.close(fig)

# ---- chart 2: monthly returns of the bot as coded ----
mo = pd.read_csv(os.path.join(OUT, "monthly.csv"), index_col=0, parse_dates=True)["ret_pct"]
fig, ax = plt.subplots(figsize=(10.5, 4.2), dpi=150)
colors = [BLUE if v >= 0 else RED for v in mo.values]
ax.bar(mo.index, mo.values, width=22, color=colors, edgecolor=SURFACE, linewidth=1)
ax.axhline(0.5, color=INK2, lw=1.4, ls=(0, (4, 3)))
ax.annotate("target +0.5%/mo", (mo.index[1], 0.5), xytext=(0, 5),
            textcoords="offset points", color=INK2, fontsize=9.5)
ax.axhline(0, color=INK2, lw=0.8)
n_hit = int((mo >= 0.5).sum())
ax.set_title(f"Monthly returns - bot as coded, realistic costs "
             f"(hit +0.5% target in {n_hit} of {len(mo)} months)",
             loc="left", color=INK, fontsize=12)
ax.set_ylabel("Return (%)")
ax.xaxis.set_major_formatter(mdates.DateFormatter("%b %Y"))
ax.margins(x=0.01)
fig.savefig(os.path.join(OUT, "monthly.png"), bbox_inches="tight")
plt.close(fig)
print("charts written")
