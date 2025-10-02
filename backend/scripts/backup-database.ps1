# Daily Database Backup Script
$ErrorActionPreference = "Stop"

# Configuration
$PGHOST = "localhost"
$PGPORT = "5432"
$PGUSER = "postgres"
$PGPASSWORD = "postgres"
$PGDATABASE = "nota"
$BACKUP_DIR = "backups"

# Set PostgreSQL password
$env:PGPASSWORD = $PGPASSWORD

# Create backup directory
if (-not (Test-Path $BACKUP_DIR)) {
    New-Item -ItemType Directory -Path $BACKUP_DIR | Out-Null
    Write-Host "Created backup directory: $BACKUP_DIR"
}

# Generate timestamp
$timestamp = Get-Date -Format "yyyy-MM-dd_HHmmss"
$backupFile = Join-Path $BACKUP_DIR "nota_backup_$timestamp.dump"

Write-Host "Starting backup..."

# Create backup
try {
    pg_dump -h $PGHOST -p $PGPORT -U $PGUSER -d $PGDATABASE -F c -f $backupFile
    
    if ($LASTEXITCODE -eq 0) {
        $fileSize = (Get-Item $backupFile).Length / 1KB
        Write-Host "Backup completed successfully!"
        Write-Host "File: $backupFile"
        Write-Host "Size: $([math]::Round($fileSize, 2)) KB"
        
        # Keep only last 7 backups
        Write-Host "Cleaning up old backups..."
        Get-ChildItem -Path $BACKUP_DIR -Filter "nota_backup_*.dump" | Sort-Object LastWriteTime -Descending | Select-Object -Skip 7 | ForEach-Object {
            Remove-Item $_.FullName
            Write-Host "Deleted: $($_.Name)"
        }
    } else {
        Write-Host "Backup failed!" -ForegroundColor Red
        exit 1
    }
} catch {
    Write-Host "Error: $_" -ForegroundColor Red
    exit 1
} finally {
    Remove-Item Env:PGPASSWORD -ErrorAction SilentlyContinue
}

Write-Host "Backup process completed!"
