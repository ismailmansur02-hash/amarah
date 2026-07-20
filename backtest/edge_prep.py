"""Unify the 5-min data for the edge search: one parquet per pair, indexed UTC,
with London/NY local columns. Verifies the GBPUSD (FTMO server time) alignment
against EURUSD (NY time) by cross-correlating hourly returns — the two series
are ~85% correlated, so the peak must be at lag 0 if the clocks are right.

FTMO server time is "NY+7" (daily candle closes 17:00 New York = 00:00 server),
i.e. server clock follows US DST. So: NY = server - 7h, then localize NY -> UTC.
"""
import os

import numpy as np
import pandas as pd

DATA = os.path.join(os.path.dirname(__file__), "data")
NY = "America/New_York"


def build():
    e = pd.read_parquet(f"{DATA}/eurusd_m5.parquet")
    e["utc"] = (pd.to_datetime(e["time_ny"]).dt.tz_localize(NY, ambiguous="NaT",
                nonexistent="NaT").dt.tz_convert("UTC"))
    e = e.dropna(subset=["utc"])[["utc", "open", "high", "low", "close", "volume"]]

    g = pd.read_parquet(f"{DATA}/gbpusd_m5_ftmo.parquet").rename(columns={"vol": "volume"})
    ny_time = pd.to_datetime(g["dt"]) - pd.Timedelta(hours=7)
    g["utc"] = (ny_time.dt.tz_localize(NY, ambiguous="NaT", nonexistent="NaT")
                .dt.tz_convert("UTC"))
    g = g.dropna(subset=["utc"])[["utc", "open", "high", "low", "close", "volume"]]

    for name, d in (("eurusd", e), ("gbpusd", g)):
        d = d.drop_duplicates("utc").sort_values("utc").set_index("utc")
        d["london"] = d.index.tz_convert("Europe/London")
        d.to_parquet(f"{DATA}/{name}_m5_utc.parquet")
        print(name, len(d), "bars |", d.index.min(), "->", d.index.max())

    # alignment check: hourly close-to-close returns, cross-correlation by lag
    eh = (pd.read_parquet(f"{DATA}/eurusd_m5_utc.parquet")["close"]
          .resample("1h").last().pct_change())
    gh = (pd.read_parquet(f"{DATA}/gbpusd_m5_utc.parquet")["close"]
          .resample("1h").last().pct_change())
    m = pd.concat([eh, gh], axis=1, keys=["e", "g"]).dropna()
    print("\nalignment check (corr of hourly returns by lag, peak must be lag 0):")
    for lag in (-2, -1, 0, 1, 2):
        c = np.corrcoef(m["e"].iloc[2:-2], m["g"].shift(lag).iloc[2:-2])[0, 1]
        print(f"  lag {lag:+d}h: {c:+.3f}")


if __name__ == "__main__":
    build()
