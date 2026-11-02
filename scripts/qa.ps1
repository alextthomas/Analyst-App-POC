<#
.SYNOPSIS
  QA gate: typecheck, build, and run all tests with coverage.

.DESCRIPTION
  One-command verification for the whole repo:
    1. typecheck every workspace
    2. build every workspace
    3. detect whether Docker Postgres and the API are reachable (informational)
    4. run all tests with coverage

  Integration tests are skip-if-unavailable: if Postgres or the running API are
  not reachable, those suites self-skip (via their runtime guards) and the run
  still passes on the unit + coverage gate. This script therefore never fails
  merely because infrastructure is down - only because real checks fail.

.PARAMETER NoCoverage
  Run tests without coverage (faster).

.PARAMETER SkipBuild
  Skip the typecheck + build steps and only run tests.

.EXAMPLE
  ./scripts/qa.ps1
.EXAMPLE
  ./scripts/qa.ps1 -NoCoverage
#>
[CmdletBinding()]
param(
  [switch]$NoCoverage,
  [switch]$SkipBuild
)

Set-StrictMode -Version Latest
# Do NOT stop on first error: we run every stage and aggregate the result.
$ErrorActionPreference = 'Continue'

$RepoRoot = Split-Path -Parent $PSScriptRoot
Push-Location $RepoRoot

function Write-Step([string]$msg) { Write-Host "`n==> $msg" -ForegroundColor Cyan }
function Write-Ok([string]$msg)   { Write-Host "    PASS: $msg" -ForegroundColor Green }
function Write-Fail([string]$msg) { Write-Host "    FAIL: $msg" -ForegroundColor Red }
function Write-Info([string]$msg) { Write-Host "    $msg" -ForegroundColor Yellow }

# Run a command, routing stderr to nul so tool warnings (e.g. Vite's CJS notice)
# do not trip PowerShell's native-error handling. Streams the command's output
# to the host and returns ONLY the integer exit code (via [int] cast so the
# caller never captures stray pipeline output).
function Invoke-Stage([string]$label, [string]$command) {
  Write-Step $label
  # Write command output straight to the host so it is not captured by the
  # function's return value; only $LASTEXITCODE matters for the result.
  cmd /c "$command 2>nul" | Out-Host
  $code = $LASTEXITCODE
  if ($code -eq 0) { Write-Ok $label } else { Write-Fail "$label (exit $code)" }
  return [int]$code
}

$results = [ordered]@{}

try {
  if (-not $SkipBuild) {
    $results['Typecheck'] = Invoke-Stage 'Typecheck (all workspaces)' 'npm run typecheck'
    $results['Build']     = Invoke-Stage 'Build (all workspaces)' 'npm run build'
  }

  # --- infrastructure detection (informational) ---------------------------
  Write-Step 'Detecting infrastructure for integration tests'
  $dockerUp = $false
  try {
    $pg = docker inspect --format '{{.State.Health.Status}}' ea-postgres 2>$null
    if ($pg -eq 'healthy') { $dockerUp = $true }
  } catch { }

  $apiUp = $false
  try {
    $null = Invoke-RestMethod 'http://localhost:8080/health/live' -TimeoutSec 3
    $apiUp = $true
  } catch { }

  if ($dockerUp) { Write-Ok 'Postgres reachable - intake integration tests will run' }
  else { Write-Info 'Postgres not reachable - intake integration tests will self-skip' }
  if ($apiUp) { Write-Ok 'API reachable - HTTP integration tests will run' }
  else { Write-Info 'API not reachable - HTTP integration tests will self-skip' }

  # --- tests ---------------------------------------------------------------
  $testCmd = if ($NoCoverage) { 'npm test' } else { 'npm run test:cov' }
  $results['Tests'] = Invoke-Stage "Tests ($(if($NoCoverage){'no coverage'}else{'with coverage'}))" $testCmd

  # --- summary -------------------------------------------------------------
  Write-Step 'QA summary'
  $failed = 0
  foreach ($k in $results.Keys) {
    if ($results[$k] -eq 0) { Write-Ok $k }
    else { Write-Fail $k; $failed++ }
  }

  if ($failed -eq 0) {
    Write-Host "`nQA PASSED" -ForegroundColor Green
    if (-not ($dockerUp -and $apiUp)) {
      Write-Info 'Note: some integration suites self-skipped because infra/API was not fully up.'
      Write-Info 'For the full integration run: ./scripts/start-api.ps1  then re-run ./scripts/qa.ps1'
    }
    exit 0
  } else {
    Write-Host "`nQA FAILED ($failed stage(s))" -ForegroundColor Red
    exit 1
  }
}
finally {
  Pop-Location
}
