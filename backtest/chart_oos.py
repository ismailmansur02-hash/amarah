"""Out-of-sample grid chart: avg monthly return of the day-of-week algo
across EURUSD/GBPUSD x 2025/2026, vs the +0.5%/mo target."""
import os
import sys

import numpy as np
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import pandas as pd

sys.path.insert(0, os.path.dirname(__file__))
import oos_test as O  # noqa: E402

SURFACE = "#fcfcfb"; INK = "#0b0b0b"; INK2 = "#52514e"; GRID = "#e6e5e2"
BLUE = "#2a78d6"; AMBER = "#eda100"
OUT = os.path.join(os.path.dirname(__file__), "out")

spans = O.spans
labels, avgs, tstats, colors, totals = [], [], [], [], []
for sym, col in [("EURUSD", BLUE), ("GBPUSD", AMBER)]:
    d = O.load(sym)
    for yr, (a, b) in spans.items():
        r = O.evaluate(d, a, b)
        labels.append(f"{sym}\n{yr}")
        avgs.append(r["avgm"]); tstats.append(r["t"]); totals.append(r["total"])
        colors.append(col)
x = np.arange(len(labels))

plt.rcParams.update({
    "font.size": 11, "text.color": INK, "axes.edgecolor": GRID,
    "axes.labelcolor": INK2, "xtick.color": INK2, "ytick.color": INK2,
    "axes.grid": True, "grid.color": GRID, "grid.linewidth": 0.8,
    "axes.spines.top": False, "axes.spines.right": False,
    "figure.facecolor": SURFACE, "axes.facecolor": SURFACE, "savefig.facecolor": SURFACE,
})
fig, ax = plt.subplots(figsize=(9.5, 5.0), dpi=150)
bars = ax.bar(x, avgs, 0.6, color=colors, edgecolor=SURFACE, linewidth=1.5)
ax.axhline(0.5, color=INK2, lw=1.4, ls=(0, (4, 3)))
ax.annotate("target +0.5%/mo", (x[0] - 0.45, 0.5), xytext=(0, 5),
            textcoords="offset points", color=INK2, fontsize=9.5)
ax.axhline(0, color=INK2, lw=0.8)
for xi, a, t, tot in zip(x, avgs, tstats, totals):
    sig = "  t=%.1f%s" % (t, "*" if abs(t) > 2 else "")
    ax.annotate(f"{a:+.2f}%/mo", (xi, a), xytext=(0, 5), textcoords="offset points",
                ha="center", color=INK, fontsize=9, fontweight="bold")
    ax.annotate(f"({tot:+.0f}% total,{sig})", (xi, 0), xytext=(0, -22),
                textcoords="offset points", ha="center",
                color=(INK if abs(t) > 2 else INK2), fontsize=8)
from matplotlib.patches import Patch
ax.legend(handles=[Patch(color=BLUE, label="EURUSD"), Patch(color=AMBER, label="GBPUSD")],
          frameon=False, loc="upper left", fontsize=9.5)
ax.set_xticks(x); ax.set_xticklabels(labels)
ax.set_ylabel("Average monthly return (%)")
ax.set_title("Day-of-week algo — out-of-sample: new year (2025) AND new pair (GBP)\n"
             "Positive on all 4 slices; statistically significant (t>2) on 3 of 4",
             loc="left", color=INK, fontsize=12)
ax.margins(y=0.2)
fig.savefig(os.path.join(OUT, "oos_grid.png"), bbox_inches="tight")
print("chart written")
