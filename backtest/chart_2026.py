"""Grouped bar chart: EURUSD 2026 monthly returns, both configurations."""
import os
import sys

import numpy as np
import pandas as pd
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt

SURFACE = "#fcfcfb"; INK = "#0b0b0b"; INK2 = "#52514e"; GRID = "#e6e5e2"
BLUE = "#2a78d6"; AMBER = "#eda100"
OUT = os.path.join(os.path.dirname(__file__), "out")

df = pd.read_csv(os.path.join(OUT, "monthly_2026.csv"))
months = df["month"].tolist()
A = df["bot_as_coded_pct"].to_numpy()
B = df["noninv_londonNY_pct"].to_numpy()
cA = df["bot_trades"].to_numpy()
cB = df["noninv_trades"].to_numpy()
x = np.arange(len(months))
w = 0.38

plt.rcParams.update({
    "font.size": 11, "text.color": INK, "axes.edgecolor": GRID,
    "axes.labelcolor": INK2, "xtick.color": INK2, "ytick.color": INK2,
    "axes.grid": True, "grid.color": GRID, "grid.linewidth": 0.8,
    "axes.spines.top": False, "axes.spines.right": False,
    "figure.facecolor": SURFACE, "axes.facecolor": SURFACE, "savefig.facecolor": SURFACE,
})
fig, ax = plt.subplots(figsize=(10.5, 5.0), dpi=150)
ax.bar(x - w / 2, A, w, color=BLUE, edgecolor=SURFACE, linewidth=1.5,
       label="A · bot as coded (inverted)")
ax.bar(x + w / 2, B, w, color=AMBER, edgecolor=SURFACE, linewidth=1.5,
       label="B · non-inverted, London/NY 14:00 only")
ax.axhline(0.5, color=INK2, lw=1.3, ls=(0, (4, 3)))
ax.annotate("target +0.5%/mo", (x[0] - 0.5, 0.5), xytext=(0, 5),
            textcoords="offset points", color=INK2, fontsize=9.5)
ax.axhline(0, color=INK2, lw=0.8)

for xi, v, c in zip(x - w / 2, A, cA):
    ax.annotate(f"{v:+.1f}", (xi, v), xytext=(0, 3 if v >= 0 else -11),
                textcoords="offset points", ha="center", color=INK, fontsize=8)
for xi, v, c in zip(x + w / 2, B, cB):
    ax.annotate(f"{v:+.1f}", (xi, v), xytext=(0, 3 if v >= 0 else -11),
                textcoords="offset points", ha="center", color=INK, fontsize=8)

ax.set_xticks(x)
ax.set_xticklabels([f"{m}\n({a}/{b} tr)" for m, a, b in zip(months, cA, cB)], fontsize=9)
ax.set_ylabel("Monthly return (%)")
ax.set_title("EURUSD 2026 monthly returns — $100k, 1% risk/trade, realistic costs\n"
             "A YTD +0.93% (55 trades)   ·   B YTD +9.13% (17 trades)   ·   Jul partial (1–14)",
             loc="left", color=INK, fontsize=12)
ax.legend(frameon=False, loc="upper right", fontsize=9.5)
ax.margins(x=0.02)
fig.savefig(os.path.join(OUT, "monthly_2026.png"), bbox_inches="tight")
print("chart written")
