"""Does Q14's finding improve the bot? On up-days the low forms early (00-03 NY
= 05-08 London), so entering the Monday long at 00:15 London may be too early.
Test: shift ONLY the entry time, keep everything else identical.
6 pre-registered entry hours, TRAIN 2023-01..2025-03 / TEST 2025-04..2026-07."""
import sys, numpy as np, pandas as pd
sys.path.insert(0,'backtest')
from ict_questions import load, COST, PIP

TRAIN=(pd.Timestamp("2023-01-01"),pd.Timestamp("2025-04-01"))
TEST=(pd.Timestamp("2025-04-01"),pd.Timestamp("2026-08-01"))
RISK,K=0.005,1.5
SIDE={0:"BUY",2:"SELL"}

def run(pair, entry_lon_min):
    d = load(pair)
    ldn = d["london"]
    d = d.assign(lday=ldn.dt.tz_localize(None).dt.normalize(),
                 lmin=ldn.dt.hour*60+ldn.dt.minute)
    d = d.assign(lwd=d.lday.dt.dayofweek)
    # daily ATR14 on London days
    day = d.groupby("lday").agg(h=("high","max"),l=("low","min"),c=("close","last"))
    pc = day.c.shift(1)
    tr = pd.concat([day.h-day.l,(day.h-pc).abs(),(day.l-pc).abs()],axis=1).max(axis=1)
    atr = tr.rolling(14).mean().shift(1)
    out=[]
    for lday, g in d[(d.lmin>=entry_lon_min)&(d.lmin<21*60+45)].groupby("lday"):
        wd = lday.dayofweek
        if wd not in SIDE: continue
        a = atr.get(lday, np.nan)
        if not np.isfinite(a) or a<=0 or len(g)<20: continue
        side=SIDE[wd]; e=g.iloc[0]["open"]; sd=K*a
        if side=="BUY":
            hit=(g.low<=e-sd).any(); px=(e-sd) if hit else g.iloc[-1]["close"]; gr=px-e
        else:
            hit=(g.high>=e+sd).any(); px=(e+sd) if hit else g.iloc[-1]["close"]; gr=e-px
        out.append({"date":lday,"r":(gr-COST[pair])/sd*RISK})
    return pd.DataFrame(out)

def stat(t,a,b):
    s=t[(t.date>=a)&(t.date<b)]
    if len(s)<5: return None
    tot=((1+s.r).prod()-1)*100
    return tot, s.r.mean()/(s.r.std(ddof=1)/np.sqrt(len(s))), len(s)

print("Entry-time shift (exit unchanged at 21:45 London), both pairs pooled:")
print(f"  {'entry (London)':<16}{'TRAIN':>20}{'TEST':>20}")
for h,m in ((0,15),(5,0),(6,0),(7,0),(8,0),(9,0)):
    t=pd.concat([run(p,h*60+m) for p in ("EURUSD","GBPUSD")]).sort_values("date")
    tr_=stat(t,*TRAIN); te_=stat(t,*TEST)
    f=lambda x: f"{x[0]:+7.1f}% t{x[1]:+4.1f}" if x else "      n/a"
    print(f"  {h:02d}:{m:02d}{'  <- current' if (h,m)==(0,15) else '':<12}"
          f"{f(tr_):>20}{f(te_):>20}")
