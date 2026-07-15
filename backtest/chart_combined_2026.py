"""Combined bot 2026: stacked monthly account-P&L% contribution by sleeve."""
import os
import sys

import numpy as np
import pandas as pd
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt

sys.path.insert(0, os.path.dirname(__file__))
import combined_2026 as C  # noqa: E402  (reuse streams)

SURFACE = "#fcfcfb"; INK = "#0b0b0b"; INK2 = "#52514e"; GRID = "#e6e5e2"
BLUE = "#2a78d6"; AMBER = "#eda100"
OUT = os.path.join(os.path.dirname(__file__), "out")
MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul"]


def sleeve_monthly_pct(stream):
    """Standalone monthly account P&L% for a sleeve (reset each month to base)."""
    trades = sorted(stream, key=lambda x: x[0])
    out = {}
    for month in sorted({pd.Period(t, "M") for t, _, _ in trades}):
        eq = 1.0
        for t, r, _ in trades:
            if pd.Period(t, "M") == month:
                eq *= (1 + r)
        out[pd.Period(month).strftime("%b")] = (eq - 1) * 100
    return [out.get(m, 0.0) for m in MONTHS]


algay = sleeve_monthly_pct(C.algay_stream())
dow = sleeve_monthly_pct(C.dow_stream())
x = np.arange(len(MONTHS))

plt.rcParams.update({
    "font.size": 11, "text.color": INK, "axes.edgecolor": GRID,
    "axes.labelcolor": INK2, "xtick.color": INK2, "ytick.color": INK2,
    "axes.grid": True, "grid.color": GRID, "grid.linewidth": 0.8,
    "axes.spines.top": False, "axes.spines.right": False,
    "figure.facecolor": SURFACE, "axes.facecolor": SURFACE, "savefig.facecolor": SURFACE,
})
fig, ax = plt.subplots(figsize=(10.5, 5.0), dpi=150)
# stack positives and negatives separately so both sleeves read cleanly
algay = np.array(algay); dow = np.array(dow)
ax.bar(x, algay, 0.6, color=BLUE, edgecolor=SURFACE, linewidth=1.2,
       label="ALGAY London/NY sleeve")
# DoW stacked on top of ALGAY, respecting sign
base_pos = np.where(algay > 0, algay, 0)
base_neg = np.where(algay < 0, algay, 0)
dow_bottom = np.where(dow >= 0, base_pos, base_neg)
ax.bar(x, dow, 0.6, bottom=dow_bottom, color=AMBER, edgecolor=SURFACE, linewidth=1.2,
       label="Day-of-week sleeve")
ax.axhline(0.5, color=INK2, lw=1.2, ls=(0, (4, 3)))
ax.annotate("target +0.5%/mo", (x[0] - 0.45, 0.5), xytext=(0, 4),
            textcoords="offset points", color=INK2, fontsize=9)
ax.axhline(0, color=INK2, lw=0.8)
for xi, a, d in zip(x, algay, dow):
    tot = a + d
    ax.annotate(f"{tot:+.1f}", (xi, tot), xytext=(0, 4 if tot >= 0 else -12),
                textcoords="offset points", ha="center", color=INK, fontsize=8.5)
ax.set_xticks(x); ax.set_xticklabels(MONTHS)
ax.set_ylabel("Account P&L contribution (%)")
ax.set_title("Combined bot on $200k — 2026 monthly account P&L by sleeve\n"
             "Combined take-home £15,302 (£12,242 after 20% tax) · but the "
             "amber (day-of-week) sleeve does most of the lifting",
             loc="left", color=INK, fontsize=12)
ax.legend(frameon=False, loc="upper right", fontsize=9.5)
ax.margins(x=0.03, y=0.16)
fig.savefig(os.path.join(OUT, "combined_2026.png"), bbox_inches="tight")
print("chart written")
