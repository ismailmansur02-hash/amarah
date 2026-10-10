"""The friend's exact proposal: use GODMODE only as the trend/entry trigger,
then a clean 2:1 — target +2R, stop -1R, NO breakeven move, first touch wins.
Bars touching both are scored as the stop (conservative)."""
import sys, numpy as np, pandas as pd
sys.path.insert(0,'backtest')
import godmode_test as GT

def sim_2to1(pair, h, l, c, a14, sig, rr=2.0, sl_mult=1.5, cost=True):
    sp = GT.SPREAD[pair] if cost else 0.0
    idx = np.flatnonzero(sig); n=len(c); out=[]
    for t,k in enumerate(idx):
        d=sig[k]
        if not np.isfinite(a14[k]) or a14[k]<=0: continue
        risk=max(a14[k]*sl_mult, a14[k]*0.3); e=c[k]
        slp=e-d*risk; tgt=e+d*rr*risk
        end = idx[t+1] if t+1<len(idx) else n-1
        r=None
        for j in range(k+1,end+1):
            hs=(l[j]<=slp) if d==1 else (h[j]>=slp)
            ht=(h[j]>=tgt) if d==1 else (l[j]<=tgt)
            if hs: r=-1.0; break          # stop checked first
            if ht: r=rr; break
        if r is None: r = d*(c[end]-e)/risk
        out.append(r - sp/risk)
    return np.array(out)

rng=np.random.default_rng(3)
print("THE FRIEND'S SETUP: GODMODE trigger + clean 2:1 (target 2R, stop 1R, no BE)")
print(f"  break-even win rate for 2:1 = 1/(1+2) = 33.3% before costs\n")
print(f"  {'tf':<6}{'pair':<8}{'n':>6}{'hit 2R%':>9}{'total R':>10}{'per trade':>11}{'t':>7}"
      f"{'  | RANDOM entries, same 2:1':>30}")
tot_g=[]; tot_r=[]
for tf in ("4h","1h"):
    for pair in ("EURUSD","GBPUSD"):
        d,o,h,l,c,a14,sdir,bull,bear = GT.build(pair,tf)
        sig = GT.signals(sdir,bull,bear)
        g = sim_2to1(pair,h,l,c,a14,sig)
        tot_g.append(g)
        # matched random entries
        valid=np.flatnonzero(np.isfinite(a14)&(np.arange(len(c))>60)&(np.arange(len(c))<len(c)-5))
        rs_all=[]
        for _ in range(200):
            pick=np.sort(rng.choice(valid,size=min(len(g),len(valid)),replace=False))
            rsig=np.zeros(len(c),dtype=int); rsig[pick]=rng.choice([-1,1],size=len(pick))
            rs_all.append(sim_2to1(pair,h,l,c,a14,rsig).mean())
        rs=np.array(rs_all); tot_r.append(rs.mean())
        se=g.std(ddof=1)/np.sqrt(len(g))
        print(f"  {tf:<6}{pair:<8}{len(g):>6}{(g>0).mean()*100:>8.1f}%{g.sum():>+9.1f}R"
              f"{g.mean():>+10.3f}R{g.mean()/se:>7.2f}"
              f"{rs.mean():>+22.3f}R/trade")
G=np.concatenate(tot_g); se=G.std(ddof=1)/np.sqrt(len(G))
print(f"\n  POOLED: {len(G)} trades, hit-2R rate {(G>0).mean()*100:.1f}% "
      f"(need 33.3%), total {G.sum():+.1f}R, {G.mean():+.4f}R/trade, t={G.mean()/se:+.2f}")
print(f"  Random entries, same 2:1, same bars: {np.mean(tot_r):+.4f}R/trade")

print("\n  Zero-cost check (is the spread the problem?):")
z=[]
for tf in ("4h","1h"):
    for pair in ("EURUSD","GBPUSD"):
        d,o,h,l,c,a14,sdir,bull,bear = GT.build(pair,tf)
        z.append(sim_2to1(pair,h,l,c,a14,GT.signals(sdir,bull,bear),cost=False))
Z=np.concatenate(z)
print(f"  with spread {G.mean():+.4f}R/trade  ->  zero cost {Z.mean():+.4f}R/trade "
      f"(hit rate {(Z>0).mean()*100:.1f}%)")
