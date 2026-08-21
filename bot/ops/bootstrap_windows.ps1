# DOW bot — one-command Windows setup (PowerShell 5.1+).
#
# Replaces runbook sections 2, 4, 5 and the manual Task Scheduler clicking in
# section 6. Run it from the repo root:
#
#     powershell -ExecutionPolicy Bypass -File bot\ops\bootstrap_windows.ps1
#
# What it does, in order, stopping on the first real failure:
#   1. verifies Windows / Python / the MT5 terminal path / credentials present
#   2. builds a venv and installs runtime + backtest dependencies
#   3. runs the 55 offline unit tests
#   4. runs the acceptance gate and refuses to arm anything if it is not green
#   5. registers two scheduled tasks: the bot itself (at logon, auto-restart on
#      failure) and the hourly status heartbeat
#
# It deliberately does NOT start live trading on its own: it ends by telling you
# the single command to start, so a human is still the one who says "go".
# Credentials are only ever read from the environment; nothing secret is
# printed, logged, or written to disk by this script.

[CmdletBinding()]
param(
    [switch]$SkipGate,      # only for re-runs after the gate already passed
    [switch]$NoTasks        # set up the environment but register no tasks
)

$ErrorActionPreference = 'Stop'
$repo = (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path
$venv = Join-Path $repo '.venv'
$py = Join-Path $venv 'Scripts\python.exe'

function Step($n, $msg) { Write-Host "`n[$n] $msg" -ForegroundColor Cyan }
function Ok($msg) { Write-Host "    OK  $msg" -ForegroundColor Green }
function Die($msg) { Write-Host "    FAIL  $msg" -ForegroundColor Red; exit 1 }

Write-Host "DOW bot bootstrap — repo: $repo"

# ---------------------------------------------------------------- 1. pre-flight
Step 1 'Pre-flight checks'

if ($env:OS -ne 'Windows_NT') {
    Die 'not Windows. The MetaTrader5 package is Windows-only; the bot cannot run here.'
}
Ok 'Windows'

$sysPy = Get-Command python -ErrorAction SilentlyContinue
if (-not $sysPy) { Die 'python not on PATH. Install Python 3.11+ and re-run.' }
$pyVer = & python -c "import sys;print('%d.%d' % sys.version_info[:2])"
if ([version]$pyVer -lt [version]'3.11') { Die "Python $pyVer found; need 3.11+." }
Ok "Python $pyVer"

$mtPath = $env:MT_PATH
if (-not $mtPath) { $mtPath = 'C:\Program Files\FTMO MetaTrader 5\terminal64.exe' }
if (-not (Test-Path $mtPath)) {
    Die "MT5 terminal not found at: $mtPath`n    Set MT_PATH to your real terminal64.exe (setx MT_PATH ""...""), open a NEW terminal, re-run."
}
Ok "MT5 terminal found"

foreach ($v in 'MT_LOGIN', 'MT_PASSWORD', 'MT_SERVER') {
    if (-not [Environment]::GetEnvironmentVariable($v)) {
        Die "$v is not set. Set MT_LOGIN / MT_PASSWORD / MT_SERVER with setx, open a NEW terminal, then re-run. (Values are never printed or committed.)"
    }
}
Ok 'MT_LOGIN / MT_PASSWORD / MT_SERVER present (values not shown)'

if (-not $env:TG_BOT_TOKEN -or -not $env:TG_CHAT_ID) {
    Write-Host '    WARN  Telegram not configured — you will get no phone alerts.' -ForegroundColor Yellow
} else { Ok 'Telegram alerting configured' }

try {
    $null = Invoke-WebRequest -Uri 'https://nfs.faireconomy.media/ff_calendar_thisweek.json' `
        -UseBasicParsing -TimeoutSec 20
    Ok 'news calendar feed reachable'
} catch {
    Die "cannot reach the news calendar feed. The bot fail-safes to NOT trading without it, so fix connectivity first.`n    $($_.Exception.Message)"
}

# ------------------------------------------------------------- 2. dependencies
Step 2 'Python environment'
if (-not (Test-Path $py)) { & python -m venv $venv; Ok 'venv created' } else { Ok 'venv exists' }
& $py -m pip install --upgrade pip --quiet
& $py -m pip install --quiet -r (Join-Path $repo 'bot\requirements.txt')
& $py -m pip install --quiet pandas pyarrow      # needed by the acceptance gate
if ($LASTEXITCODE -ne 0) { Die 'dependency install failed' }
Ok 'dependencies installed'

# -------------------------------------------------------------- 3. unit tests
Step 3 'Offline unit tests'
& $py (Join-Path $repo 'bot\test_dow_unit.py')
if ($LASTEXITCODE -ne 0) { Die 'unit tests failed — do not deploy.' }
Ok 'unit tests passed'

# ----------------------------------------------------------- 4. acceptance gate
if (-not $SkipGate) {
    Step 4 'Acceptance gate (must be green before arming)'
    & $py (Join-Path $repo 'backtest\dow_acceptance.py')
    if ($LASTEXITCODE -ne 0) { Die 'acceptance gate failed — do not deploy. Report to the user.' }
    Ok 'acceptance gate ran green'
} else {
    Step 4 'Acceptance gate SKIPPED (-SkipGate)'
}

# -------------------------------------------------------- 5. scheduled tasks
if ($NoTasks) {
    Step 5 'Scheduled tasks SKIPPED (-NoTasks)'
} else {
    Step 5 'Registering scheduled tasks'

    # the bot: start at logon, restart automatically if it ever exits unexpectedly
    $botAction = New-ScheduledTaskAction -Execute $py `
        -Argument 'bot\dow_bot.py' -WorkingDirectory $repo
    $botTrigger = New-ScheduledTaskTrigger -AtLogOn
    $botSettings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries `
        -DontStopIfGoingOnBatteries -RestartCount 999 -RestartInterval (New-TimeSpan -Minutes 2) `
        -ExecutionTimeLimit ([TimeSpan]::Zero) -MultipleInstances IgnoreNew
    Register-ScheduledTask -TaskName 'DOWBot' -Action $botAction -Trigger $botTrigger `
        -Settings $botSettings -Description 'DOW bot trading loop' -Force | Out-Null
    Ok 'task "DOWBot" registered (starts at logon, auto-restarts on crash)'

    # heartbeat: publish status hourly so remote oversight can see the bot
    $hbAction = New-ScheduledTaskAction -Execute $py `
        -Argument 'bot\ops\status_push.py' -WorkingDirectory $repo
    $hbTrigger = New-ScheduledTaskTrigger -Once -At (Get-Date).Date `
        -RepetitionInterval (New-TimeSpan -Hours 1)
    $hbSettings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries `
        -DontStopIfGoingOnBatteries -MultipleInstances IgnoreNew
    Register-ScheduledTask -TaskName 'DOWBotStatus' -Action $hbAction -Trigger $hbTrigger `
        -Settings $hbSettings -Description 'DOW bot status heartbeat' -Force | Out-Null
    Ok 'task "DOWBotStatus" registered (hourly heartbeat)'
}

Write-Host @"

--------------------------------------------------------------------
Setup complete. Nothing is trading yet — that step is deliberately yours.

  Start now:      .venv\Scripts\python.exe bot\dow_bot.py
  Or reboot/log out and back in; the DOWBot task starts it automatically.

  Confirm within a minute: a "connected to" line in bot\dow_bot.log and a
  Telegram startup alert. Emergency stop: create the file bot\KILL

Remember this is the FTMO-Demo forward test. Do not point it at funded
money until the demo has run at least 8 weeks (runbook section 7).
--------------------------------------------------------------------
"@ -ForegroundColor White
