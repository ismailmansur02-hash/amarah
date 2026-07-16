"""Per-pair day-of-week (USD-aligned) effect: which pairs carry it."""
import os
import sys
import numpy as np
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import pandas as pd

sys.path.insert(0, os.path.dirname(__file__))
import multi_pair_dow as MP

SURFACE = "#fcfcfb"; INK = "#0b0b0b"; INK2 = "#52514e"; GRID = "#e6e5e2"
BLUE = "#2a78d6"; GREY = "#b8b7b0"
OUT = os.path.join(os.path.dirname(__file__), "out")

MP.save_new()
pairs = {**MP.EXIST, **{k: (v[1], v[2], v[3]) for k, v in MP.NEW.items()}}
order = ["GBPUSD", "EURUSD", "AUDUSD", "NZDUSD", "USDCHF", "USDJPY", "USDCAD"]
vals, ts, cols, kinds = [], [], [], []
for sym in order:
    side, sp, pip = pairs[sym]
    t = MP.pair_returns(sym, side, sp, pip)
    r = MP.stats(t, pd.Timestamp("2025-01-01"), pd.Timestamp("2026-07-20"))
    vals.append(r[0]); ts.append(r[1])
    risk_ccy = side == "quote"          # EUR/GBP/AUD/NZD
    cols.append(BLUE if risk_ccy else GREY)
    kinds.append("risk ccy (works)" if risk_ccy else "haven/oil (no edge)")
x = np.arange(len(order))

plt.rcParams.update({
    "font.size": 11, "text.color": INK, "axes.edgecolor": GRID, "axes.labelcolor": INK2,
    "xtick.color": INK2, "ytick.color": INK2, "axes.grid": True, "grid.color": GRID,
    "grid.linewidth": 0.8, "axes.spines.top": False, "axes.spines.right": False,
    "figure.facecolor": SURFACE, "axes.facecolor": SURFACE, "savefig.facecolor": SURFACE})
fig, ax = plt.subplots(figsize=(10, 5), dpi=150)
ax.bar(x, vals, 0.62, color=cols, edgecolor=SURFACE, linewidth=1.2)
ax.axhline(0, color=INK2, lw=0.8)
for xi, v, t in zip(x, vals, ts):
    ax.annotate(f"{v:+.0f}%\nt{t:.1f}", (xi, v), xytext=(0, 5 if v >= 0 else -18),
                textcoords="offset points", ha="center", color=INK, fontsize=8.5)
ax.set_xticks(x); ax.set_xticklabels(order, fontsize=9)
ax.set_ylabel("Day-of-week return, 2025→Jul2026 (%)")
from matplotlib.patches import Patch
ax.legend(handles=[Patch(color=BLUE, label="USD-quote risk currency — edge holds"),
                   Patch(color=GREY, label="USD-base haven/oil — no edge")],
          frameon=False, loc="upper right", fontsize=9.5)
ax.set_title("Day-of-week (USD) effect generalises to RISK currencies, not havens\n"
             "EUR/GBP/AUD/NZD carry it (real, economically sensible); JPY/CHF/CAD don't",
             loc="left", color=INK, fontsize=12)
ax.margins(y=0.16)
fig.savefig(f"{OUT}/multipair_effect.png", bbox_inches="tight")
print("chart written")
