$ErrorActionPreference = 'Stop'

$repoRoot = Split-Path -Parent $PSScriptRoot
$sdkRoot = if ($env:ANDROID_SDK_ROOT) { $env:ANDROID_SDK_ROOT } elseif ($env:ANDROID_HOME) { $env:ANDROID_HOME } else { Join-Path $env:LOCALAPPDATA 'Android\Sdk' }
$avdName = if ($env:ANDROID_EMULATOR_NAME) { $env:ANDROID_EMULATOR_NAME } else { 'Pixel_7_API_35' }

$emulatorExe = Join-Path $sdkRoot 'emulator\emulator.exe'
$adbExe = Join-Path $sdkRoot 'platform-tools\adb.exe'

if (!(Test-Path $emulatorExe)) {
  throw "Android emulator not found at $emulatorExe"
}
if (!(Test-Path $adbExe)) {
  throw "adb not found at $adbExe"
}

if (-not $env:JAVA_HOME -or -not (Test-Path (Join-Path $env:JAVA_HOME 'bin\java.exe'))) {
  $javaExe = Get-ChildItem 'C:\Program Files\Eclipse Adoptium' -Recurse -Filter java.exe -ErrorAction SilentlyContinue |
    Select-Object -First 1 -ExpandProperty FullName
  if ($javaExe) {
    $env:JAVA_HOME = Split-Path (Split-Path $javaExe -Parent) -Parent
  }
}

if (-not $env:JAVA_HOME -or -not (Test-Path (Join-Path $env:JAVA_HOME 'bin\java.exe'))) {
  throw 'JAVA_HOME is not configured and Java could not be auto-detected.'
}

$env:ANDROID_HOME = $sdkRoot
$env:ANDROID_SDK_ROOT = $sdkRoot
$env:Path = "$env:Path;$env:JAVA_HOME\bin;$sdkRoot\platform-tools;$sdkRoot\emulator;$sdkRoot\cmdline-tools\latest\bin"
$env:RCT_METRO_PORT = '8081'

function Get-ListeningPid {
  param([int]$Port)

  $line = netstat -ano | Select-String "LISTENING\s+\d+$" | Select-String ":$Port\s" | Select-Object -First 1
  if (-not $line) {
    return $null
  }

  $tokens = ($line.ToString().Trim() -split '\s+')
  if ($tokens.Length -lt 5) {
    return $null
  }

  return [int]$tokens[-1]
}

function Wait-ForMetro {
  param(
    [int]$Port = 8081,
    [int]$TimeoutSeconds = 90
  )

  $deadline = (Get-Date).AddSeconds($TimeoutSeconds)
  while ((Get-Date) -lt $deadline) {
    try {
      $response = Invoke-WebRequest -Uri "http://127.0.0.1:$Port/status" -UseBasicParsing -TimeoutSec 3
      $content = $response.Content
      if ($content -is [byte[]]) {
        $content = [System.Text.Encoding]::UTF8.GetString($content)
      }

      if ($content.Trim() -eq 'packager-status:running') {
        return $true
      }
    } catch {
      # keep retrying until timeout
    }

    Start-Sleep -Seconds 2
  }

  return $false
}

$metroPid = Get-ListeningPid -Port 8081
if ($metroPid) {
  $metroProcess = Get-Process -Id $metroPid -ErrorAction SilentlyContinue
  if ($metroProcess -and $metroProcess.ProcessName -eq 'node') {
    Write-Host "Restarting Metro process on port 8081 (PID $metroPid)..."
    Stop-Process -Id $metroPid -Force
    Start-Sleep -Seconds 1
  } elseif ($metroProcess) {
    throw "Port 8081 is in use by process '$($metroProcess.ProcessName)' (PID $metroPid). Stop that process and retry."
  }
}

Write-Host 'Starting Metro bundler on port 8081 (clean cache)...'
Start-Process -FilePath 'cmd.exe' -ArgumentList '/c', 'npm --prefix apps/mobile run start -- --port 8081 --dev-client --clear' -WorkingDirectory $repoRoot -WindowStyle Minimized

if (-not (Wait-ForMetro -Port 8081 -TimeoutSeconds 90)) {
  throw 'Metro did not become ready on http://127.0.0.1:8081/status within 90 seconds.'
}

$devicesOutput = (& $adbExe devices) -join "`n"
$hasBootedDevice = $devicesOutput -match "emulator-\d+\s+device"

if (-not $hasBootedDevice) {
  $hasEmulatorProcess = Get-Process emulator -ErrorAction SilentlyContinue
  if (-not $hasEmulatorProcess) {
    Write-Host "Starting Android emulator: $avdName"
    Start-Process -FilePath $emulatorExe -ArgumentList "-avd $avdName -netdelay none -netspeed full"
  } else {
    Write-Host "Emulator process is running; waiting for Android to finish booting..."
  }

  $maxAttempts = 48
  for ($i = 0; $i -lt $maxAttempts; $i += 1) {
    Start-Sleep -Seconds 5
    $devicesOutput = (& $adbExe devices) -join "`n"
    if ($devicesOutput -match "emulator-\d+\s+device") {
      break
    }
  }

  $devicesOutput = (& $adbExe devices) -join "`n"
  if ($devicesOutput -notmatch "emulator-\d+\s+device") {
    throw "Emulator did not reach 'device' state in time. Current adb output:`n$devicesOutput"
  }
}

& $adbExe reverse tcp:8081 tcp:8081 | Out-Null

Write-Host 'Emulator is ready. Running mobile Android app...'
Set-Location $repoRoot
npm --prefix apps/mobile run android

if ($LASTEXITCODE -ne 0) {
  throw "Android build/run failed with exit code $LASTEXITCODE."
}

$devClientUrl = 'org.godivinity.atlanta.homebookings://expo-development-client/?url=http%3A%2F%2F127.0.0.1%3A8081'
& $adbExe shell am start -a android.intent.action.VIEW -d $devClientUrl org.godivinity.atlanta.homebookings | Out-Null
