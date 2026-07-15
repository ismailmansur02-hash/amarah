"""Final-audit equity curve: DOW strategy 2025-01 -> 2026-07, spec sizing."""
import os
import sys
import numpy as np
import pandas as pd
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import matplotlib.dates as mdates

sys.path.insert(0, os.path.dirname(__file__))
import dow_acceptance as A

SURFACE = "#fcfcfb"; INK = "#0b0b0b"; INK2 = "#52514e"; GRID = "#e6e5e2"
BLUE = "#2a78d6"; RED = "#e34948"
OUT = os.path.join(os.path.dirname(__file__), "out")

pairs = A.load_pairs()
S, E = pd.Timestamp("2025-01-01"), pd.Timestamp("2026-07-20")
tr = A.run(pairs, risk=0.005, start=S, end=E)
eq = tr[["day", "bal"]].copy()
eq = pd.concat([pd.DataFrame({"day": [S], "bal": [A.BAL0]}), eq], ignore_index=True)

plt.rcParams.update({
    "font.size": 11, "text.color": INK, "axes.edgecolor": GRID, "axes.labelcolor": INK2,
    "xtick.color": INK2, "ytick.color": INK2, "axes.grid": True, "grid.color": GRID,
    "grid.linewidth": 0.8, "axes.spines.top": False, "axes.spines.right": False,
    "figure.facecolor": SURFACE, "axes.facecolor": SURFACE, "savefig.facecolor": SURFACE})
fig, ax = plt.subplots(figsize=(10.5, 4.8), dpi=150)
ax.plot(eq["day"], eq["bal"] / 1000, color=BLUE, lw=2)
ax.axhline(100, color=INK2, lw=1, ls=(0, (4, 4)), alpha=0.7)
ax.fill_between(eq["day"], 100, eq["bal"] / 1000, where=(eq["bal"] / 1000 >= 100),
                color=BLUE, alpha=0.08)
ax.annotate(f"${eq.bal.iloc[-1]/1000:,.1f}k", (eq.day.iloc[-1], eq.bal.iloc[-1] / 1000),
            xytext=(6, 0), textcoords="offset points", color=INK, fontweight="bold", va="center")
ax.set_title("FINAL AUDIT — DOW bot equity, EURUSD+GBPUSD, 0.5%/pair on $100k\n"
             "2025-01 → 2026-07 (real FTMO/FMP): +16.0%, maxDD −3.1%, t=3.48, "
             "PF 1.65, 15/19 months up",
             loc="left", color=INK, fontsize=12)
ax.set_ylabel("Balance ($k)")
ax.xaxis.set_major_formatter(mdates.DateFormatter("%b %Y"))
ax.margins(x=0.01)
fig.subplots_adjust(right=0.94)
fig.savefig(f"{OUT}/dow_final_audit.png", bbox_inches="tight")
print("chart written")
