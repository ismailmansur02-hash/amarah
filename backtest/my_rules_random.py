import sys, numpy as np
sys.path.insert(0,'backtest')
import my_rules_test as M, godmode_port as G
rng=np.random.default_rng(5)
print("FAIR comparison — both your rules and random capped at a 400-bar hold\n")
print(f"  {'tf':<5}{'pair':<8}{'your rules':>13}{'random':>21}{'percentile':>12}")
for tf in ("1h","4h"):
    for pair in ("EURUSD","GBPUSD"):
        a=M.run(pair,tf,disp_min=0.5,max_hold=400)
        d=M.load(pair,tf); h,l,c=(d[x].to_numpy(float) for x in ("high","low","close"))
        a14=G.atr(h,l,c,14); risk_atr=a.risk_atr.mean()
        valid=np.flatnonzero(np.isfinite(a14)&(np.arange(len(c))>60)&(np.arange(len(c))<len(c)-400))
        sims=[]
        for _ in range(300):
            picks=rng.choice(valid,size=min(len(a),len(valid)),replace=False)
            sides=rng.choice([-1,1],size=len(picks)); rs=[]
            for k,sd in zip(picks,sides):
                risk=risk_atr*a14[k]
                if risk<=0: continue
                e=c[k]; stop=e-sd*risk; tgt=e+sd*2*risk; r=None
                for j in range(k+1,min(k+401,len(c))):
                    hs=(l[j]<=stop) if sd==1 else (h[j]>=stop)
                    ht=(h[j]>=tgt) if sd==1 else (l[j]<=tgt)
                    if hs: r=-1.0; break
                    if ht: r=2.0; break
                if r is None: r=sd*(c[min(k+400,len(c)-1)]-e)/risk
                rs.append(r-M.SPREAD[pair]/risk)
            sims.append(np.mean(rs))
        sims=np.array(sims); g=a.r.mean()
        print(f"  {tf:<5}{pair:<8}{g:>+12.4f}R{sims.mean():>+16.4f}R ±{sims.std():.4f}"
              f"{(sims<g).mean()*100:>10.0f}%")
