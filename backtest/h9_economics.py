import sys, numpy as np, pandas as pd
sys.path.insert(0,'backtest')
from edge_crossasset import build, DATA, tstat

t = build()
legs={"eurusd":1,"gbpusd":1,"audusd":1,"nzdusd":1,"usdjpy":-1,"usdchf":-1,"usdcad":-1}
br=None
for f,sgn in legs.items():
    d=pd.read_csv(f"{DATA}/{f}_eod.csv",parse_dates=["date"]).sort_values("date")
    cur=pd.DataFrame({"date":d.date,f:np.sign(d.close.pct_change(5))*sgn})
    br=cur if br is None else br.merge(cur,on="date",how="outer")
br=br.sort_values("date"); br["agree"]=br[list(legs)].sum(axis=1).abs()
t=pd.merge_asof(t,br[["date","agree"]],on="date",allow_exact_matches=False,direction="backward").dropna(subset=["agree"])

def dd(day):
    eq=(1+day).cumprod(); return (eq/eq.cummax()-1).min()*100

def summarise(x, lbl, mult=1.0):
    day = x.groupby("date").r.apply(lambda s:(1+s*mult).prod()-1).sort_index()
    yrs = (day.index[-1]-day.index[0]).days/365.25
    tot = ((1+day).prod()-1)*100
    ann = ((1+tot/100)**(1/yrs)-1)*100
    dpm = len(day)/(yrs*12)
    sh = day.mean()/day.std(ddof=1)*np.sqrt(dpm*12)
    print(f"  {lbl:<34}{ann:>+7.1f}%/yr  Sh{sh:>+5.2f}  maxDD{dd(day):>+7.1f}%  "
          f"{len(x):>4} trades  {dpm:>4.1f} days/mo")
    return ann, sh, dd(day)

print("FULL PERIOD 2023-2026 (in-sample contaminated — H9 was found by looking at test):")
b_ann,b_sh,b_dd = summarise(t, "BASELINE all days @0.5%/pair")
h_ann,h_sh,h_dd = summarise(t[t.agree>=5], "H9 on (USD trending) @0.5%/pair")
summarise(t[t.agree<5], "H9 off @0.5%/pair")

# size H9 up until its drawdown matches the baseline's
k = abs(b_dd)/abs(h_dd)
print(f"\n  H9 uses {(t.agree>=5).mean()*100:.0f}% of days and has {abs(h_dd):.1f}% maxDD "
      f"vs baseline {abs(b_dd):.1f}%.")
print(f"  Sizing H9 up by {k:.1f}x to match baseline drawdown:")
summarise(t[t.agree>=5], f"H9 on @{0.5*k:.2f}%/pair", mult=k)
print(f"\n  For the EV question: baseline was +4.2%/yr -> ~$352/mo on $100k.")
