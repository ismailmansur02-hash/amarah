import sys, numpy as np, pandas as pd
sys.path.insert(0,'backtest')
import my_rules_test as M

print("DOES GODMODE ADD ANYTHING TO YOUR RULES?")
print("(same setups; GODMODE column keeps only those where its trend agrees)\n")
print(f"  {'tf':<6}{'disp':<6}{'pair':<8}{'RULES ALONE':>24}{'+ GODMODE FILTER':>26}")
print(f"  {'':<20}{'n':>6}{'mean R':>9}{'t':>7}{'n':>8}{'mean R':>9}{'t':>7}{'kept':>7}")
for tf in ("1h","4h"):
    for dm in (0.5,1.5):
        for pair in ("EURUSD","GBPUSD"):
            gm = M.gm_direction(pair, tf)
            a = M.run(pair, tf, disp_min=dm)
            b = M.run(pair, tf, disp_min=dm, gm_dir=gm)
            if not len(a) or not len(b): continue
            ta = a.r.mean()/(a.r.std(ddof=1)/np.sqrt(len(a)))
            tb = b.r.mean()/(b.r.std(ddof=1)/np.sqrt(len(b)))
            print(f"  {tf:<6}{dm:<6}{pair:<8}{len(a):>6}{a.r.mean():>+8.3f}R{ta:>7.2f}"
                  f"{len(b):>8}{b.r.mean():>+8.3f}R{tb:>7.2f}{len(b)/len(a)*100:>6.0f}%")

print("\nRANDOM BASELINE: same stop/target geometry, entries at random bars")
rng=np.random.default_rng(5)
for tf in ("1h","4h"):
    for pair in ("EURUSD","GBPUSD"):
        a = M.run(pair, tf, disp_min=0.5)
        d = M.load(pair, tf)
        h,l,c = (d[x].to_numpy(float) for x in ("high","low","close"))
        import godmode_port as G
        a14 = G.atr(h,l,c,14)
        risk_atr = a.risk_atr.mean()
        sims=[]
        valid=np.flatnonzero(np.isfinite(a14)&(np.arange(len(c))>60)&(np.arange(len(c))<len(c)-200))
        for _ in range(300):
            picks=rng.choice(valid,size=min(len(a),len(valid)),replace=False)
            sides=rng.choice([-1,1],size=len(picks))
            rs=[]
            for k,sd in zip(picks,sides):
                risk=risk_atr*a14[k]
                if risk<=0: continue
                e=c[k]; stop=e-sd*risk; tgt=e+sd*2*risk
                r=None
                for j in range(k+1,min(k+400,len(c))):
                    hs=(l[j]<=stop) if sd==1 else (h[j]>=stop)
                    ht=(h[j]>=tgt) if sd==1 else (l[j]<=tgt)
                    if hs: r=-1.0; break
                    if ht: r=2.0; break
                if r is None: r=sd*(c[min(k+400,len(c)-1)]-e)/risk
                rs.append(r - M.SPREAD[pair]/risk)
            sims.append(np.mean(rs))
        sims=np.array(sims); g=a.r.mean()
        print(f"  {tf} {pair}: your rules {g:+.4f}R  |  random {sims.mean():+.4f}R "
              f"±{sims.std():.4f}  -> percentile {(sims<g).mean()*100:.0f}%")
