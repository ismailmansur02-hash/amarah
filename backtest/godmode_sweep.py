import sys, numpy as np, pandas as pd
sys.path.insert(0,'backtest')
import godmode_test as GT

MODES={"Scalper":1.5,"Aggressive":2.2,"Balanced":3.0,"Conservative":4.0,"Swing":5.5}
print("C) Every built-in signal mode x confidence threshold (thirds model, net of spread)")
print("   totals in R, EURUSD+GBPUSD pooled; n = trades\n")
for tf in ("4h","1h"):
    print(f"   --- {tf} ---")
    print(f"   {'mode':<14}" + "".join(f"{'conf '+str(mc):>14}" for mc in (50,55,65,75)))
    for mode,fac in MODES.items():
        pre={}
        for pair in ("EURUSD","GBPUSD"):
            pre[pair]=GT.build(pair,tf,factor=fac)
        line=f"   {mode+' ('+str(fac)+')':<14}"
        for mc in (50,55,65,75):
            tot=0.0; n=0
            for pair in ("EURUSD","GBPUSD"):
                d,o,h,l,c,a14,sdir,bull,bear = pre[pair]
                sig=GT.signals(sdir,bull,bear,min_conf=mc)
                t=GT.simulate(pair,o,h,l,c,a14,sig)
                if len(t): tot+=t.thirds.sum(); n+=len(t)
            line+=f"{tot:>+9.1f}R/{n:<4}"
        print(line)
    print()
