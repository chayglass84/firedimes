# Fire Dimes launcher.
# - If the server isn't already running, builds the client and starts the
#   server (which serves the built client + API from one process).
# - Then opens the dashboard in your default browser (unless -NoBrowser).
#
# Safe to run repeatedly: if the server is already up, this just opens
# a browser tab against it instead of starting a second instance.
#
# Usage:
#   .\start.ps1              # start server if needed, open browser
#   .\start.ps1 -NoBrowser   # start server if needed, don't open browser
#                             # (used by the Windows Startup shortcut)

param(
    [switch]$NoBrowser
)

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$serverDir = Join-Path $root "server"
$url = "http://localhost:4000"
$logDir = Join-Path $root "logs"
$logFile = Join-Path $logDir "server.log"

function Test-ServerRunning {
    try {
        Invoke-WebRequest -Uri "$url/api/status" -UseBasicParsing -TimeoutSec 1 | Out-Null
        return $true
    } catch {
        return $false
    }
}

if (-not (Test-ServerRunning)) {
    Push-Location $root
    npm run build --workspace=client | Out-Null
    Pop-Location

    New-Item -ItemType Directory -Force -Path $logDir | Out-Null
    Add-Content -Path $logFile -Value "===== [$(Get-Date -Format o)] start.ps1 launching server ====="

    # Runs npm in the foreground of this cmd instance (so we can log its exit),
    # appending stdout+stderr to the log file, then logs the exit code once it dies.
    $cmdLine = "npm run start >> `"$logFile`" 2>&1 & echo [%date% %time%] server process exited with code %errorlevel% >> `"$logFile`""
    Start-Process -FilePath "cmd.exe" `
        -ArgumentList "/c", $cmdLine `
        -WorkingDirectory $serverDir `
        -WindowStyle Hidden

    $attempts = 0
    while (-not (Test-ServerRunning) -and $attempts -lt 20) {
        Start-Sleep -Milliseconds 500
        $attempts++
    }
}

if (-not $NoBrowser) {
    Start-Process $url
}
