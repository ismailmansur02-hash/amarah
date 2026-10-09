import sys, numpy as np, pandas as pd
sys.path.insert(0,'backtest')
import godmode_test as GT

rng = np.random.default_rng(7)
rows=[]
print("A) Is it the spread, or the signal?  (same trades, costs switched off)")
print(f"   {'tf':<5}{'pair':<8}{'with spread':>14}{'ZERO cost':>12}{'n':>6}")
store={}
for tf in ("1D","4h","1h"):
    for pair in ("EURUSD","GBPUSD"):
        d,o,h,l,c,a14,sdir,bull,bear = GT.build(pair,tf)
        sig = GT.signals(sdir,bull,bear)
        t = GT.simulate(pair,o,h,l,c,a14,sig)
        store[(tf,pair)]=(o,h,l,c,a14,sig,t)
        old = GT.SPREAD[pair]; GT.SPREAD[pair]=0.0
        t0 = GT.simulate(pair,o,h,l,c,a14,sig)
        GT.SPREAD[pair]=old
        print(f"   {tf:<5}{pair:<8}{t.thirds.sum():>+13.1f}R{t0.thirds.sum():>+11.1f}R{len(t):>6}")
        rows.append((t.thirds.sum(), t0.thirds.sum(), len(t)))
tot=np.array(rows)
print(f"   {'TOTAL':<13}{tot[:,0].sum():>+13.1f}R{tot[:,1].sum():>+11.1f}R{int(tot[:,2].sum()):>6}")

print("\nB) Does the signal beat RANDOM entries with the identical SL/TP structure?")
print(f"   {'tf':<5}{'pair':<8}{'GODMODE':>11}{'random (1000x)':>17}{'percentile':>12}")
for (tf,pair),(o,h,l,c,a14,sig,t) in store.items():
    n_sig = len(t)
    valid = np.flatnonzero(np.isfinite(a14) & (np.arange(len(c))>60) & (np.arange(len(c))<len(c)-5))
    sims=[]
    for _ in range(1000):
        pick = rng.choice(valid, size=min(n_sig,len(valid)), replace=False)
        rs = np.zeros(len(c),dtype=int); rs[np.sort(pick)] = rng.choice([-1,1],size=len(pick))
        sims.append(GT.simulate(pair,o,h,l,c,a14,rs).thirds.mean())
    sims=np.array(sims); g=t.thirds.mean()
    pct = (sims < g).mean()*100
    print(f"   {tf:<5}{pair:<8}{g:>+10.4f}R{sims.mean():>+13.4f}R"
          f" ±{sims.std():.4f}{pct:>11.0f}%")
