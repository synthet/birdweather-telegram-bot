# Rebuild and restart the bot container. Binds ./data into the container — never deleted here.
$ErrorActionPreference = 'Stop'

$Root = Resolve-Path (Join-Path $PSScriptRoot '..')
Set-Location $Root

$DataDir = Join-Path $Root 'data'
$BackupDir = Join-Path $DataDir 'backups'
$DbFile = Join-Path $DataDir 'birdweather-bot.sqlite'
$KeepBackups = if ($env:KEEP_BACKUPS) { [int]$env:KEEP_BACKUPS } else { 10 }

New-Item -ItemType Directory -Force -Path $DataDir, $BackupDir | Out-Null

function Backup-Database {
    if (-not (Test-Path -LiteralPath $DbFile)) {
        Write-Host "No database at $DbFile — nothing to back up."
        return
    }

    $stamp = Get-Date -Format 'yyyyMMdd-HHmmss'
    $backupPath = Join-Path $BackupDir "birdweather-bot-$stamp.sqlite"

    $sqlite3 = Get-Command sqlite3 -ErrorAction SilentlyContinue
    if ($sqlite3) {
        & sqlite3 $DbFile ".backup '$backupPath'"
    } else {
        Copy-Item -LiteralPath $DbFile -Destination $backupPath
        foreach ($suffix in '-wal', '-shm') {
            $sidecar = "$DbFile$suffix"
            if (Test-Path -LiteralPath $sidecar) {
                Copy-Item -LiteralPath $sidecar -Destination "$backupPath$suffix"
            }
        }
    }

    Write-Host "Backup: $backupPath"

    if ($KeepBackups -gt 0) {
        $old = Get-ChildItem -Path $BackupDir -Filter 'birdweather-bot-*.sqlite' |
            Sort-Object LastWriteTime -Descending
        foreach ($file in $old | Select-Object -Skip $KeepBackups) {
            Remove-Item -LiteralPath $file.FullName -Force -ErrorAction SilentlyContinue
            Remove-Item -LiteralPath "$($file.FullName)-wal" -Force -ErrorAction SilentlyContinue
            Remove-Item -LiteralPath "$($file.FullName)-shm" -Force -ErrorAction SilentlyContinue
        }
    }
}

Write-Host '==> Stopping bot (./data is kept on the host)'
docker compose stop bot 2>$null
if ($LASTEXITCODE -gt 1) { $LASTEXITCODE = 0 }

Write-Host '==> Backing up SQLite'
Backup-Database

Write-Host '==> Rebuilding image'
docker compose build
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Host '==> Starting bot'
docker compose up -d --force-recreate
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Host '==> Done'
docker compose ps
Write-Host 'Logs: docker compose logs -f bot'
