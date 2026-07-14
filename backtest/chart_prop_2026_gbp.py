"""2026 prop take-home in GBP (today's FX), candidate strategy."""
import os
import sys

import numpy as np
import pandas as pd
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt

sys.path.insert(0, os.path.dirname(__file__))
import prop_sim  # noqa: E402

FX = 1.33802     # GBP/USD today
SURFACE = "#fcfcfb"; INK = "#0b0b0b"; INK2 = "#52514e"; GRID = "#e6e5e2"
BLUE = "#2a78d6"; AMBER = "#eda100"; RED = "#e34948"
OUT = os.path.join(os.path.dirname(__file__), "out")

m, _, _ = prop_sim.simulate((pd.Timestamp("2026-01-01"), pd.Timestamp("2026-07-15")), "2026")
months = [pd.Period(x, "M").strftime("%b") for x in m["month"]]
your = m["your_80"].to_numpy() / FX
aftertax = your * 0.8
acctpl = m["acct_pl_pct"].to_numpy()
x = np.arange(len(months)); w = 0.38

plt.rcParams.update({
    "font.size": 11, "text.color": INK, "axes.edgecolor": GRID,
    "axes.labelcolor": INK2, "xtick.color": INK2, "ytick.color": INK2,
    "axes.grid": True, "grid.color": GRID, "grid.linewidth": 0.8,
    "axes.spines.top": False, "axes.spines.right": False,
    "figure.facecolor": SURFACE, "axes.facecolor": SURFACE, "savefig.facecolor": SURFACE,
})
fig, ax = plt.subplots(figsize=(10.5, 5.0), dpi=150)
ax.bar(x - w / 2, your, w, color=BLUE, edgecolor=SURFACE, linewidth=1.5,
       label="Your 80% share (paid out)")
ax.bar(x + w / 2, aftertax, w, color=AMBER, edgecolor=SURFACE, linewidth=1.5,
       label="After 20% tax")
for xi, v in zip(x - w / 2, your):
    ax.annotate(f"£{v:,.0f}" if v else "£0", (xi, v), xytext=(0, 3),
                textcoords="offset points", ha="center", color=INK, fontsize=8)
for xi, pl, pay in zip(x, acctpl, your):
    col = INK2 if pay > 0 else RED
    note = f"{pl:+.1f}%" + ("\n(recovering)" if pl > 0 and pay == 0 else "")
    ax.annotate(note, (xi, 0), xytext=(0, -22), textcoords="offset points",
                ha="center", color=col, fontsize=8)
ax.axhline(0, color=INK2, lw=0.8)
ax.set_xticks(x); ax.set_xticklabels(months)
ax.set_ylabel("Your take-home (GBP)")
tot = your.sum()
ax.set_title("Prop £-equivalent, candidate strategy — YOUR 2026 monthly take-home\n"
             f"$200k acct, 80/20, GBP/USD {FX} · total £{tot:,.0f} "
             f"(£{tot*0.8:,.0f} after 20% tax) · Jul partial",
             loc="left", color=INK, fontsize=12)
ax.legend(frameon=False, loc="upper left", fontsize=9.5)
ax.margins(x=0.02, y=0.18)
fig.savefig(os.path.join(OUT, "prop_2026_gbp.png"), bbox_inches="tight")
print(f"chart written; 2026 total £{tot:,.0f} (£{tot*0.8:,.0f} after tax)")
