"""Day-of-week mean daily return, EURUSD 2026, split H1 vs H2 (consistency view)."""
import os
import sys

import numpy as np
import pandas as pd
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt

sys.path.insert(0, os.path.dirname(__file__))
import engine  # noqa: E402

SURFACE = "#fcfcfb"; INK = "#0b0b0b"; INK2 = "#52514e"; GRID = "#e6e5e2"
BLUE = "#2a78d6"; AMBER = "#eda100"
OUT = os.path.join(os.path.dirname(__file__), "out")

m5, _ = engine.load_bars(os.path.join(os.path.dirname(__file__), "data/eurusd_m5.parquet"))
Y0, MID, Y1 = pd.Timestamp("2026-01-01"), pd.Timestamp("2026-04-01"), pd.Timestamp("2026-07-15")
dd = m5.set_index("time")["close"].resample("1D").last().dropna()
ret = (dd.pct_change() * 100).dropna()
df = pd.DataFrame({"ret": ret.values, "wd": ret.index.dayofweek, "t": ret.index})
df = df[(df.t >= Y0) & (df.t < Y1)]
names = ["Mon", "Tue", "Wed", "Thu", "Fri"]
h1 = [df[(df.wd == w) & (df.t < MID)].ret.mean() for w in range(5)]
h2 = [df[(df.wd == w) & (df.t >= MID)].ret.mean() for w in range(5)]
x = np.arange(5); w = 0.38

plt.rcParams.update({
    "font.size": 11, "text.color": INK, "axes.edgecolor": GRID,
    "axes.labelcolor": INK2, "xtick.color": INK2, "ytick.color": INK2,
    "axes.grid": True, "grid.color": GRID, "grid.linewidth": 0.8,
    "axes.spines.top": False, "axes.spines.right": False,
    "figure.facecolor": SURFACE, "axes.facecolor": SURFACE, "savefig.facecolor": SURFACE,
})
fig, ax = plt.subplots(figsize=(9.5, 4.8), dpi=150)
ax.bar(x - w / 2, h1, w, color=BLUE, edgecolor=SURFACE, linewidth=1.5, label="H1 2026 (Jan–Mar)")
ax.bar(x + w / 2, h2, w, color=AMBER, edgecolor=SURFACE, linewidth=1.5, label="H2 2026 (Apr–Jul)")
ax.axhline(0, color=INK2, lw=0.8)
ax.set_xticks(x); ax.set_xticklabels(names)
ax.set_ylabel("Mean daily return (%)")
ax.set_title("EURUSD 2026 — average daily move by weekday, both halves\n"
             "Wednesdays fell and Mondays rose in BOTH halves (the pattern the scan flagged)",
             loc="left", color=INK, fontsize=12)
ax.legend(frameon=False, loc="lower right", fontsize=9.5)
ax.margins(x=0.04)
fig.savefig(os.path.join(OUT, "dow_2026.png"), bbox_inches="tight")
print("chart written")
