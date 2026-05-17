# Downloads Google MCP Toolbox for Databases (SQLite prebuilt) into .cursor/toolbox/
$ErrorActionPreference = "Stop"
$version = "v1.2.0"
$outDir = Join-Path $PSScriptRoot ".." ".cursor" "toolbox"
$outFile = Join-Path $outDir "toolbox.exe"
$uri = "https://storage.googleapis.com/mcp-toolbox-for-databases/$version/windows/amd64/toolbox.exe"

New-Item -ItemType Directory -Force -Path $outDir | Out-Null
Write-Host "Downloading MCP Toolbox $version ..."
Invoke-WebRequest -Uri $uri -OutFile $outFile -UseBasicParsing
& $outFile --version
Write-Host "Installed: $outFile"
