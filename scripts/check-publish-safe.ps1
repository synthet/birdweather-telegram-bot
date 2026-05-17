# Same checks as check-publish-safe.sh (Windows / pre-commit).
$ErrorActionPreference = 'Stop'
$Root = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
Set-Location $Root

$fail = $false

function Warn([string]$Message) {
  Write-Host "check-publish-safe: $Message" -ForegroundColor Red
  $script:fail = $true
}

function Test-ExcludedContent([string]$Path) {
  $rel = $Path.Replace('\', '/')
  return $rel -match '^\.env\.example$' -or
    $rel -match '^src/tests/' -or
    $rel -match '^scripts/check-publish-safe\.' -or
    $rel -match '^docs/(OPERATIONS|SPEC|ARCHITECTURE)\.md$'
}

function Test-BlockedPath([string]$Path) {
  $rel = $Path.Replace('\', '/')
  if ($rel -eq '.env.example') { return $false }
  if ($rel -match '^\.env(\.|$)') { return $true }
  if ($rel -match '^data/.+\.sqlite$' -or $rel -match '^data/backups/') { return $true }
  if ($rel -match '^docs/local') { return $true }
  if ($rel -match '\.(pem|key)$' -or $rel -match '^(credentials|secrets)\.json$') { return $true }
  return $false
}

function Test-SecretContent([string]$Path) {
  if (Test-ExcludedContent $Path) { return $false }
  $text = Get-Content -LiteralPath $Path -Raw -ErrorAction SilentlyContinue
  if (-not $text) { return $false }

  if ($text -match '-----BEGIN (OPENSSH |RSA |EC )?PRIVATE KEY-----') {
    Warn "private key material in $Path"
    return $true
  }
  if ($text -match '(HCLOUD_TOKEN|HETZNER_SSH_PRIVATE_KEY|HETZNER_ENV)=[^\s]+') {
    Warn "deployment credential env assignment in $Path"
    return $true
  }
  if ($text -match '\d{8,10}:[A-Za-z0-9_-]{30,}') {
    Warn "possible Telegram bot token in $Path"
    return $true
  }
  if ($text -match 'eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.') {
    Warn "possible JWT/API token in $Path"
    return $true
  }
  return $false
}

$files = @(git ls-files)
if ($env:CHECK_STAGED -eq '1') {
  $staged = @(git diff --cached --name-only --diff-filter=ACM 2>$null)
  if ($staged.Count -gt 0) { $files = $staged }
}

foreach ($f in $files) {
  if (-not (Test-Path -LiteralPath $f -PathType Leaf)) { continue }
  if (Test-BlockedPath $f) { Warn "blocked path must not be committed: $f"; continue }
  [void](Test-SecretContent $f)
}

if ($fail) {
  Write-Host 'check-publish-safe: remove secrets, keys, and operator-only paths before committing.' -ForegroundColor Red
  exit 1
}

Write-Host 'check-publish-safe: OK'
