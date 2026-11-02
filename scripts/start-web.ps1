<#
.SYNOPSIS
  Start the Event Analytics web dashboard (Vite).

.DESCRIPTION
  Ensures the shared contracts package is built (the web app imports it), checks
  whether the API is reachable (a non-fatal warning if not - the sign-in screen
  still renders), then starts the Vite dev server. With -Build it instead builds
  the production bundle and serves it with vite preview.

.PARAMETER Build
  Build the production bundle and serve it with `vite preview` instead of the dev server.

.EXAMPLE
  ./scripts/start-web.ps1
.EXAMPLE
  ./scripts/start-web.ps1 -Build
#>
[CmdletBinding()]
param(
  [switch]$Build
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$RepoRoot = Split-Path -Parent $PSScriptRoot
Push-Location $RepoRoot

function Write-Step([string]$msg) { Write-Host "`n==> $msg" -ForegroundColor Cyan }
function Write-Ok([string]$msg)   { Write-Host "    $msg" -ForegroundColor Green }
function Write-Warn2([string]$msg){ Write-Host "    $msg" -ForegroundColor Yellow }

try {
  # Determine the API base the web app will call (from apps/web/.env or default).
  $apiBase = 'http://localhost:8080'
  if (Test-Path 'apps/web/.env') {
    $m = Select-String -Path 'apps/web/.env' -Pattern '^\s*VITE_API_BASE\s*=\s*(\S+)' -ErrorAction SilentlyContinue | Select-Object -First 1
    if ($m) { $apiBase = $m.Matches[0].Groups[1].Value }
  }

  # The web app imports @ea/contracts from its built dist; ensure it exists.
  if (-not (Test-Path 'packages/contracts/dist/index.js')) {
    Write-Step 'Building @ea/contracts (required by the web app)'
    npm run build -w '@ea/contracts' | Out-Null
    if ($LASTEXITCODE -ne 0) { throw 'Failed to build @ea/contracts' }
    Write-Ok 'Contracts built'
  }

  # Reachability check - informational only.
  Write-Step "Checking API reachability ($apiBase)"
  try {
    $null = Invoke-RestMethod "$apiBase/health/live" -TimeoutSec 3
    Write-Ok 'API is reachable'
  } catch {
    Write-Warn2 "API not reachable at $apiBase. The web app will still start; sign-in will fail until the API is up (run ./scripts/start-api.ps1)."
  }

  if ($Build) {
    Write-Step 'Building the production bundle'
    npm run build -w '@ea/web'
    if ($LASTEXITCODE -ne 0) { throw 'web build failed' }
    Write-Step 'Serving the production bundle (vite preview)'
    npm run preview -w '@ea/web'
  } else {
    Write-Step 'Starting the Vite dev server (http://localhost:5173)'
    npm run dev:web
  }
}
finally {
  Pop-Location
}
