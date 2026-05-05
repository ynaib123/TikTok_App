param(
    [string]$OutputDir = "$PSScriptRoot/../../backups",
    [string]$PostgresContainer = "tiktok-app-postgres",
    [string]$N8nContainer = "tiktok-app-n8n",
    [string]$Database = "tiktok_app",
    [string]$DbUser = "tiktok_app",
    [int]$RetainDays = 14
)

$ErrorActionPreference = "Stop"

$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$targetDir = Join-Path $OutputDir $timestamp
New-Item -ItemType Directory -Force -Path $targetDir | Out-Null

Write-Host "Backup target: $targetDir"

# Postgres dump (data + schema)
$pgFile = Join-Path $targetDir "postgres-$Database.sql.gz"
Write-Host "Dumping Postgres database '$Database'..."
docker exec $PostgresContainer sh -c "pg_dump -U $DbUser -d $Database --no-owner --no-privileges | gzip" `
    | Set-Content -Path $pgFile -Encoding Byte

if (-not (Test-Path $pgFile) -or (Get-Item $pgFile).Length -eq 0) {
    throw "Postgres dump produced an empty file."
}

# n8n: copy the SQLite DB and the credentials key
$n8nDbFile = Join-Path $targetDir "n8n-database.sqlite"
$n8nConfigFile = Join-Path $targetDir "n8n-config"
Write-Host "Copying n8n SQLite DB..."
docker cp "$($N8nContainer):/home/node/.n8n/database.sqlite" $n8nDbFile
docker cp "$($N8nContainer):/home/node/.n8n/config" $n8nConfigFile

# Workflow JSON snapshot (matches whatever is currently in the running n8n)
$wfDir = Join-Path $targetDir "n8n-workflows"
New-Item -ItemType Directory -Force -Path $wfDir | Out-Null
Write-Host "Exporting workflow JSON..."
docker exec $N8nContainer sh -c "mkdir -p /tmp/wf-backup && n8n export:workflow --all --output=/tmp/wf-backup/all.json"
docker cp "$($N8nContainer):/tmp/wf-backup/all.json" (Join-Path $wfDir "all.json")

# Retention sweep
Write-Host "Pruning backups older than $RetainDays days..."
Get-ChildItem -Path $OutputDir -Directory -ErrorAction SilentlyContinue |
    Where-Object { $_.LastWriteTime -lt (Get-Date).AddDays(-$RetainDays) } |
    ForEach-Object {
        Write-Host "  removing $($_.FullName)"
        Remove-Item -Recurse -Force $_.FullName
    }

Write-Host ""
Write-Host "Backup complete:"
Get-ChildItem $targetDir | ForEach-Object { Write-Host "  $($_.Name) ($([math]::Round($_.Length / 1KB, 1)) KB)" }
Write-Host ""
Write-Host "Restore: see docs/backup-restore.md"
