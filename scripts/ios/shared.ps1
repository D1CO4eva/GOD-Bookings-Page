$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

function Get-RepoRoot {
  param(
    [Parameter(Mandatory = $true)]
    [string]$ScriptRoot
  )

  return (Split-Path -Parent (Split-Path -Parent $ScriptRoot))
}

function Get-MobileDir {
  param(
    [Parameter(Mandatory = $true)]
    [string]$RepoRoot
  )

  $mobileDir = Join-Path $RepoRoot 'apps/mobile'
  if (!(Test-Path $mobileDir)) {
    throw "Mobile app directory not found: $mobileDir"
  }

  return $mobileDir
}

function Get-MobileAppConfig {
  param(
    [Parameter(Mandatory = $true)]
    [string]$MobileDir
  )

  $appJsonPath = Join-Path $MobileDir 'app.json'
  if (!(Test-Path $appJsonPath)) {
    throw "Missing Expo config file: $appJsonPath"
  }

  $raw = Get-Content -Raw $appJsonPath
  return ($raw | ConvertFrom-Json)
}

function Get-MobileEasConfig {
  param(
    [Parameter(Mandatory = $true)]
    [string]$MobileDir
  )

  $easJsonPath = Join-Path $MobileDir 'eas.json'
  if (!(Test-Path $easJsonPath)) {
    throw "Missing EAS config file: $easJsonPath"
  }

  $raw = Get-Content -Raw $easJsonPath
  return ($raw | ConvertFrom-Json)
}

function Test-IsMacHost {
  if (Test-Path variable:IsMacOS) {
    return [bool]$IsMacOS
  }

  return $false
}

function Invoke-IosPreflight {
  param(
    [Parameter(Mandatory = $true)]
    [string]$ScriptRoot,
    [switch]$SkipAuthCheck,
    [switch]$Quiet
  )

  $repoRoot = Get-RepoRoot -ScriptRoot $ScriptRoot
  $mobileDir = Get-MobileDir -RepoRoot $repoRoot
  $appConfig = Get-MobileAppConfig -MobileDir $mobileDir
  $easConfig = Get-MobileEasConfig -MobileDir $mobileDir

  if (!$appConfig.expo) {
    throw 'Invalid app.json: missing "expo" root object.'
  }
  if (!$appConfig.expo.ios) {
    throw 'Invalid app.json: missing "expo.ios" object.'
  }
  if ([string]::IsNullOrWhiteSpace([string]$appConfig.expo.ios.bundleIdentifier)) {
    throw 'Invalid app.json: "expo.ios.bundleIdentifier" must be set.'
  }
  if ([string]::IsNullOrWhiteSpace([string]$appConfig.expo.ios.buildNumber)) {
    throw 'Invalid app.json: "expo.ios.buildNumber" must be set.'
  }
  if ($null -eq $appConfig.expo.ios.infoPlist.ITSAppUsesNonExemptEncryption) {
    throw 'Invalid app.json: "expo.ios.infoPlist.ITSAppUsesNonExemptEncryption" must be set.'
  }
  if ([string]::IsNullOrWhiteSpace([string]$appConfig.expo.extra.eas.projectId)) {
    throw 'Invalid app.json: "expo.extra.eas.projectId" must be set.'
  }
  if (!$easConfig.build.testflight) {
    throw 'Invalid eas.json: missing "build.testflight" profile.'
  }
  if (!$easConfig.submit.testflight) {
    throw 'Invalid eas.json: missing "submit.testflight" profile.'
  }

  if (!$SkipAuthCheck) {
    & npm --prefix $mobileDir run eas:whoami | Out-Host
    if ($LASTEXITCODE -ne 0) {
      throw 'EAS auth check failed. Run "npm run mobile:eas:whoami" and login to Expo.'
    }
  }

  if (!$Quiet) {
    Write-Host "iOS preflight passed for $mobileDir"
    Write-Host "Bundle identifier: $($appConfig.expo.ios.bundleIdentifier)"
    Write-Host "Current iOS build number: $($appConfig.expo.ios.buildNumber)"
    Write-Host "EAS project id: $($appConfig.expo.extra.eas.projectId)"
  }
}
