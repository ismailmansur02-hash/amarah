"""Publish a DOW bot status heartbeat so it can be supervised remotely.

Run hourly by the DOWBotStatus scheduled task (see ops/bootstrap_windows.ps1).
It reads the bot's own state file and log, writes a small JSON summary, and
pushes it to the `bot-status` branch of origin.

Two properties matter more than anything else here:

  1. It never touches the working tree or the checked-out branch. The commit is
     built with git plumbing (hash-object / mktree / commit-tree / update-ref)
     directly against the object database, so this cannot disturb a repo that a
     human or another agent is using at the same time.
  2. It never raises. A monitoring script that can crash the machine it monitors
     is worse than no monitoring, and this shares a box with a live trading
     loop. Every failure path degrades to "write the file locally and give up".

No credentials are read or written; the bot's state file holds none. Account
balances DO go into the heartbeat because a supervisor cannot judge drawdown
without them — set DOW_STATUS_NO_PUSH=1 to keep it local-only.
"""

import json
import os
import subprocess
import sys
import time
from datetime import datetime, timezone

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), ".."))

import dow_config as cfg                                     # noqa: E402

BRANCH = "bot-status"
HEARTBEAT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "heartbeat.json")
STALE_AFTER_S = 300          # bot polls every 30 s; 5 min of silence == not alive
LOG_TAIL_LINES = 40


def _run(args, **kw):
    """git helper: returns stdout, or None on any failure."""
    try:
        p = subprocess.run(args, capture_output=True, text=True, timeout=60, **kw)
        return p.stdout if p.returncode == 0 else None
    except Exception:
        return None


def read_state():
    try:
        with open(cfg.STATE_FILE, encoding="utf-8") as fh:
            return json.load(fh)
    except Exception:
        return None


def log_tail(n=LOG_TAIL_LINES):
    try:
        with open(cfg.LOG_FILE, encoding="utf-8", errors="replace") as fh:
            return [ln.rstrip() for ln in fh.readlines()[-n:]]
    except Exception:
        return []


def build():
    now = datetime.now(timezone.utc)
    state = read_state()

    try:
        log_age = time.time() - os.path.getmtime(cfg.LOG_FILE)
    except Exception:
        log_age = None

    alive = log_age is not None and log_age < STALE_AFTER_S
    peak = (state or {}).get("peak_equity")
    day_start = (state or {}).get("day_start_balance")

    hb = {
        "generated_utc": now.isoformat(timespec="seconds"),
        "host": os.environ.get("COMPUTERNAME", "unknown"),
        "server": cfg.MT_SERVER,
        "pairs": cfg.PAIRS,
        "risk_per_pair": cfg.RISK_PER_PAIR,
        # liveness
        "process_alive": alive,
        "log_age_seconds": round(log_age) if log_age is not None else None,
        "kill_file_present": os.path.exists(cfg.KILL_FILE),
        # risk posture — what a supervisor actually needs to judge health
        "bot_halted": (state or {}).get("bot_halted"),
        "day_halted": (state or {}).get("day_halted"),
        "halt_reason": (state or {}).get("halt_reason", ""),
        "consec_losses": (state or {}).get("consec_losses"),
        "peak_equity": peak,
        "day_start_balance": day_start,
        "open_positions": {
            p: ps.get("status") for p, ps in ((state or {}).get("pairs") or {}).items()
        },
        "state_file_found": state is not None,
        "log_tail": log_tail(),
    }
    return hb


def push(path):
    """Commit `path` as heartbeat.json on BRANCH via plumbing, then push."""
    if os.environ.get("DOW_STATUS_NO_PUSH"):
        return "push disabled by DOW_STATUS_NO_PUSH"

    repo = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..")
    git = ["git", "-C", repo]

    with open(path, "rb") as fh:
        blob_in = fh.read()
    try:
        p = subprocess.run(git + ["hash-object", "-w", "--stdin"],
                           input=blob_in, capture_output=True, timeout=60)
        blob = p.stdout.decode().strip() if p.returncode == 0 else None
    except Exception:
        blob = None
    if not blob:
        return "could not write blob"

    tree_in = f"100644 blob {blob}\theartbeat.json\n".encode()
    try:
        p = subprocess.run(git + ["mktree"], input=tree_in,
                           capture_output=True, timeout=60)
        tree = p.stdout.decode().strip() if p.returncode == 0 else None
    except Exception:
        tree = None
    if not tree:
        return "could not build tree"

    parent = (_run(git + ["rev-parse", "--verify", "--quiet", f"refs/heads/{BRANCH}"])
              or "").strip()
    args = git + ["commit-tree", tree, "-m", f"status {datetime.now(timezone.utc):%Y-%m-%d %H:%M} UTC"]
    if parent:
        args += ["-p", parent]
    commit = (_run(args) or "").strip()
    if not commit:
        return "could not create commit"

    if _run(git + ["update-ref", f"refs/heads/{BRANCH}", commit]) is None:
        return "could not update ref"
    if _run(git + ["push", "-q", "origin", f"{BRANCH}:{BRANCH}"]) is None:
        return "commit made locally but push failed (check git auth/network)"
    return "pushed"


def main():
    try:
        hb = build()
    except Exception as e:                     # never let monitoring crash the box
        hb = {"generated_utc": datetime.now(timezone.utc).isoformat(timespec="seconds"),
              "error": f"heartbeat build failed: {e!r}", "process_alive": None}
    try:
        with open(HEARTBEAT, "w", encoding="utf-8") as fh:
            json.dump(hb, fh, indent=1)
    except Exception as e:
        print(f"could not write heartbeat file: {e!r}")
        return
    try:
        print(f"heartbeat: alive={hb.get('process_alive')} halted={hb.get('bot_halted')} "
              f"-> {push(HEARTBEAT)}")
    except Exception as e:
        print(f"push failed: {e!r}")


if __name__ == "__main__":
    main()
