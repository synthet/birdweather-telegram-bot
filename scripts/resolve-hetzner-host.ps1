# Print production server IPv4 via hcloud (or return HETZNER_SERVER_HOST if already set).
param(
  [string] $ServerName = $(if ($env:HETZNER_SERVER_NAME) { $env:HETZNER_SERVER_NAME } else { 'birdweather-bot' })
)

$ErrorActionPreference = 'Stop'

if ($env:HETZNER_SERVER_HOST) {
  Write-Output $env:HETZNER_SERVER_HOST.Trim()
  return
}

$Root = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$hc = $env:HCLOUD_BIN
if (-not $hc) {
  if (Get-Command hcloud -ErrorAction SilentlyContinue) {
    $hc = 'hcloud'
  } elseif (Test-Path (Join-Path $Root '.tools\hcloud\hcloud.exe')) {
    $hc = Join-Path $Root '.tools\hcloud\hcloud.exe'
  } else {
    throw 'hcloud not found. Install CLI, set HCLOUD_BIN, or set HETZNER_SERVER_HOST.'
  }
}

if ($env:HCLOUD_CONTEXT) {
  & $hc context use $env:HCLOUD_CONTEXT | Out-Null
}

$prevEap = $ErrorActionPreference
$ErrorActionPreference = 'Continue'
$raw = & $hc server ip $ServerName 2>&1
$exit = $LASTEXITCODE
$ErrorActionPreference = $prevEap
if ($exit -ne 0 -or "$raw" -match 'no active context|authentication|Error') {
  throw "hcloud failed for $ServerName. Set HCLOUD_TOKEN, run 'hcloud context use <name>', or set HETZNER_SERVER_HOST."
}
$ip = "$raw".Trim()
if (-not $ip) {
  throw "No IPv4 for server $ServerName."
}
Write-Output $ip
