"""Challenge pass/fail vs sizing for the day-of-week edge."""
import os
import sys
import numpy as np
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt

sys.path.insert(0, os.path.dirname(__file__))
import challenge_sim as C
import dow_acceptance as A

SURFACE = "#fcfcfb"; INK = "#0b0b0b"; INK2 = "#52514e"; GRID = "#e6e5e2"
BLUE = "#2a78d6"; AMBER = "#eda100"; RED = "#e34948"
OUT = os.path.join(os.path.dirname(__file__), "out")

pairs = A.load_pairs()
risks = [0.005, 0.0075, 0.010, 0.0125, 0.015, 0.020]
pass_all, pass_good, fail_all = [], [], []
for r in risks:
    allw, good = C.analyze(pairs, r)
    a, _ = C.pct(allw); g, _ = C.pct(good)
    pass_all.append(a["pass"]); pass_good.append(g["pass"]); fail_all.append(a["fail"])
x = [r * 100 for r in risks]

plt.rcParams.update({
    "font.size": 11, "text.color": INK, "axes.edgecolor": GRID, "axes.labelcolor": INK2,
    "xtick.color": INK2, "ytick.color": INK2, "axes.grid": True, "grid.color": GRID,
    "grid.linewidth": 0.8, "axes.spines.top": False, "axes.spines.right": False,
    "figure.facecolor": SURFACE, "axes.facecolor": SURFACE, "savefig.facecolor": SURFACE})
fig, ax = plt.subplots(figsize=(10, 5), dpi=150)
ax.plot(x, pass_good, "-o", color=BLUE, lw=2, label="PASS % — good regime (2025+)")
ax.plot(x, pass_all, "-o", color=AMBER, lw=2, label="PASS % — all regimes")
ax.plot(x, fail_all, "-o", color=RED, lw=2, label="FAIL % (blew −10%) — all regimes")
for xi, v in zip(x, pass_good):
    ax.annotate(f"{v:.0f}%", (xi, v), xytext=(0, 6), textcoords="offset points",
                ha="center", color=BLUE, fontsize=8.5, fontweight="bold")
ax.set_xlabel("Risk per pair (%)  →  more aggressive")
ax.set_ylabel("% of 5-month windows")
ax.set_title("Passing a +10%/−10% challenge in 5 months with the day-of-week edge\n"
             "Even best-case (aggressive + good regime) is a coin-flip; safe sizing "
             "(0.5%) never gets there in time",
             loc="left", color=INK, fontsize=12)
ax.legend(frameon=False, fontsize=9.5, loc="upper left")
ax.set_ylim(-3, 75)
fig.savefig(f"{OUT}/challenge_odds.png", bbox_inches="tight")
print("chart written")
