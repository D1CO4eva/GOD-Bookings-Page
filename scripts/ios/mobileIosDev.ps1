param(
  [switch]$DryRun,
  [switch]$SkipAuthCheck
)

$ErrorActionPreference = 'Stop'

. (Join-Path $PSScriptRoot 'shared.ps1')

Invoke-IosPreflight -ScriptRoot $PSScriptRoot -SkipAuthCheck:$SkipAuthCheck

$repoRoot = Get-RepoRoot -ScriptRoot $PSScriptRoot

if (!(Test-IsMacHost)) {
  Write-Host 'Local iOS simulator builds require macOS with Xcode.'
  Write-Host 'Use TestFlight cloud builds from this machine: npm run mobile:build:ios:testflight'
  exit 0
}

$commandDisplay = 'npm --prefix apps/mobile run ios'
if ($DryRun) {
  Write-Host "Dry run mode. Would execute: $commandDisplay"
  exit 0
}

Set-Location $repoRoot
Write-Host "Executing: $commandDisplay"
npm --prefix apps/mobile run ios

if ($LASTEXITCODE -ne 0) {
  throw "iOS dev command failed with exit code $LASTEXITCODE."
}
