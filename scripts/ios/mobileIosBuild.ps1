param(
  [Parameter(Mandatory = $true)]
  [ValidateSet('testflight', 'production-ios')]
  [string]$Profile,
  [switch]$DryRun,
  [switch]$SkipAuthCheck
)

$ErrorActionPreference = 'Stop'

. (Join-Path $PSScriptRoot 'shared.ps1')

Invoke-IosPreflight -ScriptRoot $PSScriptRoot -SkipAuthCheck:$SkipAuthCheck

$repoRoot = Get-RepoRoot -ScriptRoot $PSScriptRoot
$mobileScript = if ($Profile -eq 'testflight') { 'build:ios:testflight' } else { 'build:ios:production' }
$commandDisplay = "npm --prefix apps/mobile run $mobileScript"

if ($DryRun) {
  Write-Host "Dry run mode. Would execute: $commandDisplay"
  exit 0
}

Set-Location $repoRoot
Write-Host "Executing: $commandDisplay"
$commandOutput = @()
& cmd.exe /d /c "npm --prefix apps/mobile run $mobileScript 2>&1" | Tee-Object -Variable commandOutput | Out-Host
$exitCode = $LASTEXITCODE

if ($exitCode -ne 0) {
  $outputText = (($commandOutput | ForEach-Object { $_.ToString() }) -join "`n")

  if ($outputText -match 'not registered as an Apple Developer') {
    throw @"
Apple authentication failed because this Apple ID is not enrolled in the Apple Developer Program.

Fix:
1. Enroll this Apple ID at https://developer.apple.com/register/
2. Ensure enrollment/payment is complete and legal agreements are accepted.
3. Re-run the build in interactive mode: npm run mobile:build:ios:testflight
"@
  }

  if ($outputText -match 'Credentials are not set up\. Run this command again in interactive mode\.') {
    throw @"
iOS credentials are not fully configured for non-interactive builds.

Fix:
1. Run an interactive build once: npm run mobile:build:ios:testflight
2. Complete Apple credential prompts (certificate/provisioning profile).
3. Retry automated/no-wait build flow.
"@
  }

  throw "iOS build command failed with exit code $exitCode."
}
