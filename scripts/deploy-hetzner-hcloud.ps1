# Deploy to Hetzner: resolve host via hcloud, then run deploy-hetzner.sh (Git Bash/WSL).
param(
  [switch] $SyncDb
)

$ErrorActionPreference = 'Stop'
$Root = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$env:HETZNER_SERVER_HOST = & (Join-Path $PSScriptRoot 'resolve-hetzner-host.ps1')
if ($SyncDb) { $env:SYNC_DB = '1' }

$bash = $null
# Prefer Git Bash over WSL's C:\Windows\system32\bash.exe (WSL does not map /d/... paths).
foreach ($candidate in @('C:\Program Files\Git\bin\bash.exe', 'C:\Program Files\Git\usr\bin\bash.exe')) {
  if (Test-Path $candidate) { $bash = $candidate; break }
}
if (-not $bash) {
  $onPath = Get-Command bash -ErrorAction SilentlyContinue
  if ($onPath -and $onPath.Source -notmatch '\\Windows\\system32\\bash\.exe$') {
    $bash = $onPath.Source
  }
}
if (-not $bash) {
  throw 'Git Bash or WSL bash required to run scripts/deploy-hetzner.sh. Install Git for Windows or use WSL.'
}

function ConvertTo-GitBashPath([string]$Path) {
  $normalized = $Path -replace '\\', '/'
  if ($normalized -match '^([A-Za-z]):(.*)$') {
    return "/$($Matches[1].ToLower())$($Matches[2])"
  }
  return $normalized
}

$unixRoot = ConvertTo-GitBashPath $Root
& $bash -lc "cd '$unixRoot' && bash scripts/deploy-hetzner.sh"
