<#
.SYNOPSIS
  Start the Event Analytics API and ingestion worker, with infrastructure.

.DESCRIPTION
  One-command local startup for the backend:
    1. ensures a .env exists (copies from .env.example)
    2. brings up Postgres + NATS via docker compose and waits for health
    3. generates the Prisma client, applies migrations and seeds demo data
    4. launches the NestJS API and the NATS ingestion worker
    5. waits for the API readiness probe

  Idempotent: safe to re-run. Use switches to skip steps.

.PARAMETER SkipInfra
  Do not touch docker compose (assume Postgres + NATS are already running).

.PARAMETER SkipSeed
  Skip prisma migrate/seed (assume the database is already prepared).

.PARAMETER NoWorker
  Start only the API, not the ingestion worker.

.EXAMPLE
  ./scripts/start-api.ps1
.EXAMPLE
  ./scripts/start-api.ps1 -SkipInfra -SkipSeed
#>
[CmdletBinding()]
param(
  [switch]$SkipInfra,
  [switch]$SkipSeed,
  [switch]$NoWorker
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

# Resolve repo root (parent of this script's folder) and work from there.
$RepoRoot = Split-Path -Parent $PSScriptRoot
Push-Location $RepoRoot

function Write-Step([string]$msg) { Write-Host "`n==> $msg" -ForegroundColor Cyan }
function Write-Ok([string]$msg)   { Write-Host "    $msg" -ForegroundColor Green }
function Write-Warn2([string]$msg){ Write-Host "    $msg" -ForegroundColor Yellow }

try {
  # --- 1. .env -------------------------------------------------------------
  Write-Step 'Checking environment file'
  if (-not (Test-Path '.env')) {
    Copy-Item '.env.example' '.env'
    Write-Ok 'Created .env from .env.example'
  } else {
    Write-Ok '.env present'
  }

  # Read API_PORT from .env (default 8080) for the readiness probe.
  $apiPort = 8080
  $portLine = Select-String -Path '.env' -Pattern '^\s*API_PORT\s*=\s*(\d+)' -ErrorAction SilentlyContinue | Select-Object -First 1
  if ($portLine) { $apiPort = [int]$portLine.Matches[0].Groups[1].Value }

  # --- 2. infrastructure ---------------------------------------------------
  if (-not $SkipInfra) {
    Write-Step 'Starting Postgres + NATS (docker compose)'
    docker compose up -d | Out-Null
    if ($LASTEXITCODE -ne 0) { throw 'docker compose up failed. Is Docker Desktop running?' }

    Write-Step 'Waiting for Postgres to be healthy'
    $deadline = (Get-Date).AddSeconds(60)
    do {
      Start-Sleep -Seconds 2
      $health = (docker inspect --format '{{.State.Health.Status}}' ea-postgres 2>$null)
    } while ($health -ne 'healthy' -and (Get-Date) -lt $deadline)
    if ($health -ne 'healthy') { throw "Postgres did not become healthy in time (status: $health)" }
    Write-Ok 'Postgres healthy'
  } else {
    Write-Warn2 'Skipping infrastructure (assuming Postgres + NATS are up)'
  }

  # --- 3. prisma generate / migrate / seed --------------------------------
  Write-Step 'Generating Prisma client'
  npm run prisma:generate | Out-Null
  if ($LASTEXITCODE -ne 0) { throw 'prisma generate failed' }
  Write-Ok 'Prisma client generated'

  if (-not $SkipSeed) {
    Write-Step 'Applying database migrations'
    npm run db:migrate | Out-Null
    if ($LASTEXITCODE -ne 0) { throw 'prisma migrate failed' }
    Write-Ok 'Migrations applied'

    Write-Step 'Seeding demo data'
    npm run db:seed | Out-Null
    if ($LASTEXITCODE -ne 0) { throw 'seed failed' }
    Write-Ok 'Seed complete (admin/admin12345, analyst/analyst12345)'
  } else {
    Write-Warn2 'Skipping migrate/seed'
  }

  # --- 4. launch API + worker ---------------------------------------------
  # Each runs in its own window so logs are visible and Ctrl+C stops one at a time.
  Write-Step 'Launching the API (new window)'
  Start-Process -FilePath 'powershell' -ArgumentList @(
    '-NoExit', '-Command', "Set-Location '$RepoRoot'; npm run dev:api"
  ) | Out-Null
  Write-Ok 'API starting'

  if (-not $NoWorker) {
    Write-Step 'Launching the ingestion worker (new window)'
    Start-Process -FilePath 'powershell' -ArgumentList @(
      '-NoExit', '-Command', "Set-Location '$RepoRoot'; npm run ingest"
    ) | Out-Null
    Write-Ok 'Ingestion worker starting'
  }

  # --- 5. wait for readiness ----------------------------------------------
  Write-Step "Waiting for the API readiness probe (http://localhost:$apiPort/health/ready)"
  $ready = $false
  $deadline = (Get-Date).AddSeconds(60)
  while (-not $ready -and (Get-Date) -lt $deadline) {
    Start-Sleep -Seconds 2
    try {
      $resp = Invoke-RestMethod "http://localhost:$apiPort/health/ready" -TimeoutSec 3
      if ($resp.status -eq 'ok') { $ready = $true }
    } catch { }
  }

  if ($ready) {
    Write-Host "`nAPI is up and ready at http://localhost:$apiPort" -ForegroundColor Green
    Write-Host "Emit demo traffic with: npm run demo:emit" -ForegroundColor Green
  } else {
    Write-Warn2 "API did not report ready within 60s. Check the API window for errors."
    exit 1
  }
}
finally {
  Pop-Location
}
