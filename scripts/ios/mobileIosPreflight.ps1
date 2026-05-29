param(
  [switch]$SkipAuthCheck,
  [switch]$Quiet
)

$ErrorActionPreference = 'Stop'

. (Join-Path $PSScriptRoot 'shared.ps1')

Invoke-IosPreflight -ScriptRoot $PSScriptRoot -SkipAuthCheck:$SkipAuthCheck -Quiet:$Quiet
