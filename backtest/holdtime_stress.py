import sys, numpy as np, pandas as pd
sys.path.insert(0,'backtest')
import edge_holdtime as M
from edge_holdtime import book, perf

def dd(day): eq=(1+day).cumprod(); return (eq/eq.cummax()-1).min()*100

print("EXIT 12:00 vs CURRENT 21:45 — full stress test\n")
for em,lbl in ((12*60,"12:00"),(21*60+45,"21:45 (current)")):
    M.COST={"EURUSD":0.6e-4,"GBPUSD":0.8e-4}
    b=book(em)
    print(f"--- exit {lbl} ---")
    for y in (2023,2024,2025,2026):
        s=b[b.date.dt.year==y]
        if len(s)<10: continue
        d_=s.groupby("date").r.apply(lambda x:(1+x).prod()-1)
        print(f"   {y}: {((1+s.r).prod()-1)*100:+6.2f}%  maxDD {dd(d_):+5.2f}%  n={len(s)}")
    for p_ in ("EURUSD","GBPUSD"):
        s=b[b.sym==p_]
        print(f"   {p_}: {((1+s.r).prod()-1)*100:+6.2f}% "
              f"t={s.r.mean()/(s.r.std(ddof=1)/np.sqrt(len(s))):+.1f}")
    day=b.groupby("date").r.sum()
    print(f"   worst day {day.min()*100:+.2f}%  |  stops hit {b.stopped.mean()*100:.1f}%")
    # realistic-cost sizing: use 1.5pip (00-12 spans Asian+London), size to 8% DD
    M.COST={"EURUSD":1.5e-4,"GBPUSD":1.7e-4}
    b2=book(em); p2=perf(b2); k=8.0/abs(p2['dd'])
    d2=b2.groupby("date").r.apply(lambda s:(1+s*k).prod()-1).sort_index()
    yrs=(d2.index[-1]-d2.index[0]).days/365.25
    ann=((1+((1+d2).prod()-1))**(1/yrs)-1)*100
    worst_sized = b2.groupby("date").r.sum().min()*100*k
    print(f"   @1.5pip realistic spread: {p2['ann']:+.2f}%/yr, maxDD {p2['dd']:.1f}%, "
          f"size {k:.1f}x -> {ann:+.1f}%/yr, worst day at that size {worst_sized:+.1f}%\n")
M.COST={"EURUSD":0.6e-4,"GBPUSD":0.8e-4}
