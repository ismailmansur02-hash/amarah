"""Monthly returns of the sized both-pair DOW strategy, 2023-2026 (real data)."""
import os
import numpy as np
import pandas as pd
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import matplotlib.dates as mdates

SURFACE = "#fcfcfb"; INK = "#0b0b0b"; INK2 = "#52514e"; GRID = "#e6e5e2"
BLUE = "#2a78d6"; RED = "#e34948"
OUT = os.path.join(os.path.dirname(__file__), "out")
m = pd.read_csv(f"{OUT}/dow_monthly_all.csv", index_col=0, parse_dates=True)["r"]

plt.rcParams.update({
    "font.size": 11, "text.color": INK, "axes.edgecolor": GRID, "axes.labelcolor": INK2,
    "xtick.color": INK2, "ytick.color": INK2, "axes.grid": True, "grid.color": GRID,
    "grid.linewidth": 0.8, "axes.spines.top": False, "axes.spines.right": False,
    "figure.facecolor": SURFACE, "axes.facecolor": SURFACE, "savefig.facecolor": SURFACE})
fig, ax = plt.subplots(figsize=(11, 4.6), dpi=150)
colors = [BLUE if v >= 0 else RED for v in m.values]
ax.bar(m.index, m.values, width=22, color=colors, edgecolor=SURFACE, linewidth=0.6)
ax.axhline(0.5, color=INK2, lw=1.3, ls=(0, (4, 3)))
ax.annotate("target +0.5%/mo", (m.index[1], 0.5), xytext=(0, 5),
            textcoords="offset points", color=INK2, fontsize=9.5)
ax.axhline(0, color=INK2, lw=0.8)
ax.axvspan(pd.Timestamp("2024-01-01"), pd.Timestamp("2024-12-31"), color=RED, alpha=0.05)
ax.annotate("2024: edge went flat/negative\n(regime decay — the key risk)",
            (pd.Timestamp("2024-07-01"), -2.4), ha="center", color=RED, fontsize=9)
yr = {2023: 1.4, 2024: -1.8, 2025: 6.3, 2026: 9.2}
for y, tot in yr.items():
    ax.annotate(f"{y}: {tot:+.0f}%", (pd.Timestamp(f"{y}-06-15"), 3.4), ha="center",
                color=INK, fontsize=9, fontweight="bold")
ax.set_title("DOW bot — monthly returns, EURUSD+GBPUSD, 0.5%/pair on $100k (real FTMO/FMP data)\n"
             "All 2023-26: +15.5%, maxDD -6.2%, t=2.23  ·  2025-26 strong  ·  2024 dead",
             loc="left", color=INK, fontsize=12)
ax.set_ylabel("Monthly return (%)")
ax.xaxis.set_major_formatter(mdates.DateFormatter("%b %Y"))
ax.margins(x=0.01)
fig.savefig(f"{OUT}/dow_monthly_all.png", bbox_inches="tight")
print("chart written")
