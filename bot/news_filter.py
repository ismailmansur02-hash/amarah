"""Red-day news filter (DOW_BOT_SPEC.md §5).

User rule: "all red days I never used to trade." A red day = a day carrying a
High-impact (red folder) ForexFactory event for a currency that drives our
pairs. Bank holidays (impact "Holiday") also block (spec §2/§9).

FAIL-SAFE (critical): if the calendar cannot be fetched/parsed and no cached
copy younger than CAL_CACHE_MAX_H exists, is_blocked() returns True for
everything — "no data" must never mean "trade blind".
"""

import json
import os
from datetime import datetime, timedelta, timezone
from zoneinfo import ZoneInfo

import requests

import dow_config as cfg

UK_TZ = ZoneInfo("Europe/London")


def fetch_forexfactory():
    """Primary source: ForexFactory weekly JSON feed. Returns the raw event
    list or raises. Fields used: title, country (currency), impact, date."""
    r = requests.get(cfg.CAL_URL, timeout=20,
                     headers={"User-Agent": "Mozilla/5.0 (dow-bot)"})
    r.raise_for_status()
    data = r.json()
    if not isinstance(data, list):
        raise ValueError("calendar feed returned non-list payload")
    return data


class Calendar:
    """Weekly economic calendar with disk cache and hard fail-safe.

    sources: ordered list of zero-arg callables returning a raw event list —
    pluggable so a second feed can be dropped in if the URL changes.
    """

    def __init__(self, sources=None, cache_path=cfg.CAL_CACHE_FILE,
                 cache_max_h=cfg.CAL_CACHE_MAX_H, alert=print):
        self.sources = sources or [fetch_forexfactory]
        self.cache_path = cache_path
        self.cache_max_h = cache_max_h
        self.alert = alert
        self.raw = None                 # raw event list
        self.fetched_at = None          # aware UTC datetime
        self._load_cache()

    # ---- cache ----
    def _load_cache(self):
        try:
            with open(self.cache_path, encoding="utf-8") as fh:
                blob = json.load(fh)
            self.raw = blob["events"]
            self.fetched_at = datetime.fromisoformat(blob["fetched_at"])
        except (OSError, ValueError, KeyError):
            self.raw, self.fetched_at = None, None

    def _save_cache(self):
        try:
            tmp = self.cache_path + ".tmp"
            with open(tmp, "w", encoding="utf-8") as fh:
                json.dump({"fetched_at": self.fetched_at.isoformat(),
                           "events": self.raw}, fh)
            os.replace(tmp, self.cache_path)
        except OSError as e:
            self.alert(f"WARNING: could not cache calendar: {e}")

    def _stale(self) -> bool:
        if self.fetched_at is None:
            return True
        age = datetime.now(timezone.utc) - self.fetched_at
        return age > timedelta(hours=self.cache_max_h)

    # ---- refresh ----
    def refresh(self) -> bool:
        """Try each source; keep a fresh-enough cache on failure; go into
        fail-safe (blocked) mode when nothing usable exists."""
        for src in self.sources:
            try:
                raw = src()
                self.raw = raw
                self.fetched_at = datetime.now(timezone.utc)
                self._save_cache()
                return True
            except Exception as e:            # noqa: BLE001 - any source failure
                self.alert(f"calendar source {getattr(src, '__name__', src)} "
                           f"failed: {e}")
        if self.raw is not None and not self._stale():
            self.alert("WARNING: calendar refresh failed - using cached copy "
                       f"from {self.fetched_at:%Y-%m-%d %H:%M}Z")
            return False
        self.alert("CRITICAL: no usable calendar (fetch failed, cache stale/"
                   "missing) - FAIL-SAFE: all trading blocked until it returns")
        return False

    # ---- event interpretation ----
    @staticmethod
    def _event_time_london(ev):
        """Aware London datetime of the event, or None for all-day/unknown."""
        raw = ev.get("date") or ""
        try:
            dt = datetime.fromisoformat(raw)
        except (ValueError, TypeError):
            return None
        if dt.tzinfo is None:
            return None                      # ambiguous -> treat as all-day
        return dt.astimezone(UK_TZ)

    @staticmethod
    def _event_date_guess(ev):
        """Calendar date (London) for all-day events; None if unparseable."""
        raw = (ev.get("date") or "")[:10]
        try:
            return datetime.strptime(raw, "%Y-%m-%d").date()
        except ValueError:
            return None

    def _relevant(self, ev, pair) -> bool:
        ccy = (ev.get("country") or "").upper()
        if cfg.NEWS_BLOCK_ANY_CCY:
            return True
        if ccy not in cfg.NEWS_CCYS:
            return False
        if ccy in ("USD", "ALL"):
            return True                      # USD drives both pairs
        return (pair == "EURUSD" and ccy == "EUR") or \
               (pair == "GBPUSD" and ccy == "GBP")

    def is_blocked(self, pair, entry_dt_lon, exit_dt_lon):
        """(blocked, reason) for holding `pair` over [entry, exit] London.
        Blocks on High-impact / Holiday events for the pair's currencies inside
        the window or within NEWS_BUFFER_MIN before entry; all-day events block
        their whole calendar date. Fail-safe blocks when no usable calendar."""
        if self.raw is None or self._stale():
            return True, "calendar unavailable (fail-safe: not trading blind)"
        buf_start = entry_dt_lon - timedelta(minutes=cfg.NEWS_BUFFER_MIN)
        blocking = tuple(cfg.NEWS_IMPACT_BLOCK) + tuple(cfg.HOLIDAY_IMPACTS)
        for ev in self.raw:
            if (ev.get("impact") or "") not in blocking:
                continue
            if not self._relevant(ev, pair):
                continue
            t = self._event_time_london(ev)
            name = f"{ev.get('country', '?')} {ev.get('title', 'event')} " \
                   f"[{ev.get('impact')}]"
            if t is None:
                d = self._event_date_guess(ev)
                if d is not None and d == entry_dt_lon.date():
                    return True, f"{name} (all-day)"
                continue
            if buf_start <= t <= exit_dt_lon:
                return True, f"{name} @ {t:%H:%M} London"
        return False, ""
