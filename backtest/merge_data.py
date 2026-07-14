"""Merge FMP 5-min EURUSD tool-result JSON dumps into one parquet dataset.

Reads every mcp-FMP-forex-*.txt file in the session tool-results directory,
dedupes on timestamp, sorts, and reports coverage gaps so missing windows can
be re-fetched. Timestamps are America/New_York bar-open times (FMP intraday
convention, verified: Friday last bar 16:55, Sunday first bar ~17:00).
"""
import glob
import json
import sys

import pandas as pd

TOOL_RESULTS = sys.argv[1] if len(sys.argv) > 1 else (
    "/root/.claude/projects/-home-user-amarah/"
    "1350fd41-cc26-5ee6-88f6-d711025cef0e/tool-results"
)
OUT = "/home/user/amarah/backtest/data/eurusd_m5.parquet"

frames = []
for path in glob.glob(f"{TOOL_RESULTS}/mcp-FMP-forex-*.txt"):
    try:
        rows = json.load(open(path))
    except (json.JSONDecodeError, UnicodeDecodeError):
        print(f"skip unparseable {path}")
        continue
    if isinstance(rows, list) and rows and "date" in rows[0]:
        frames.append(pd.DataFrame(rows))

if not frames:
    print("no data found")
    sys.exit(1)

df = pd.concat(frames, ignore_index=True)
df["time_ny"] = pd.to_datetime(df["date"])
df = (df.drop_duplicates(subset="time_ny")
        .sort_values("time_ny")
        .reset_index(drop=True)[["time_ny", "open", "high", "low", "close", "volume"]])
df.to_parquet(OUT)

print(f"total bars: {len(df)}  range: {df.time_ny.iloc[0]} .. {df.time_ny.iloc[-1]}")

# gap report: any missing stretch > 30 min during Sun17:00-Fri17:00 NY
t = df["time_ny"]
gaps = t.diff()
mask = gaps > pd.Timedelta(minutes=30)
n_shown = 0
for i in t.index[mask]:
    prev, cur = t.iloc[i - 1], t.iloc[i]
    # weekend gap: Fri >=16:55 -> Sun >=17:00 is expected
    if prev.dayofweek == 4 and prev.hour >= 16 and cur.dayofweek == 6:
        continue
    print(f"GAP: {prev} -> {cur}  ({gaps.iloc[i]})")
    n_shown += 1
    if n_shown > 40:
        print("...more gaps suppressed")
        break
if n_shown == 0:
    print("no unexpected gaps > 30 min")
