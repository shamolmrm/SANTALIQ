# Pull SANTALIQ server backups onto this PC (off-server copy, ADR 017).
# Usage:  .\scripts\pull-backup.ps1            (runs daily via the "SANTALIQ backup pull" scheduled task)
# Copies the newest nightly database dump (keeps 30 days) and a snapshot of the voice recordings.
# Restore a dump on the server:
#   gunzip -c FILE | docker exec -i santaliq-postgres psql -U santaliq -d santaliq
param(
    [string]$Dest = "D:\SANTALIQ-backups",
    [string]$Server = "root@144.91.74.148",
    [int]$KeepDays = 30
)

$ErrorActionPreference = "Stop"
$remote = "/home/ubuntu/backups/santaliq"
New-Item -ItemType Directory -Force "$Dest\db" | Out-Null
$log = "$Dest\pull.log"
function Log($msg) { "$(Get-Date -Format s) $msg" | Add-Content -Encoding utf8 $log; Write-Output $msg }

try {
    # 1. newest database dump
    $latest = (ssh -o BatchMode=yes $Server "ls -1t $remote/santaliq-*.sql.gz | head -1").Trim()
    if (-not $latest) { throw "no dump found on server" }
    $name = Split-Path $latest -Leaf
    if (-not (Test-Path "$Dest\db\$name")) {
        scp -q -o BatchMode=yes "${Server}:$latest" "$Dest\db\$name"
        if ($LASTEXITCODE -ne 0) { throw "scp of $name failed" }
        Log "db: $name"
    } else {
        Log "db: $name already here"
    }

    # 2. voice recordings snapshot (mirrors deletions, so withdrawn voices disappear here too)
    ssh -o BatchMode=yes $Server "if [ -d $remote/voice ]; then tar -C $remote -czf /root/santaliq-voice.tar.gz voice; else tar -czf /root/santaliq-voice.tar.gz -T /dev/null; fi"
    scp -q -o BatchMode=yes "${Server}:/root/santaliq-voice.tar.gz" "$Dest\voice-latest.tar.gz.part"
    if ($LASTEXITCODE -ne 0) { throw "scp of voice snapshot failed" }
    Move-Item -Force "$Dest\voice-latest.tar.gz.part" "$Dest\voice-latest.tar.gz"
    ssh -o BatchMode=yes $Server "rm -f /root/santaliq-voice.tar.gz"
    Log "voice: snapshot $([math]::Round((Get-Item "$Dest\voice-latest.tar.gz").Length / 1KB)) KB"

    # 3. prune old dumps
    Get-ChildItem "$Dest\db\santaliq-*.sql.gz" | Where-Object { $_.LastWriteTime -lt (Get-Date).AddDays(-$KeepDays) } | Remove-Item
    Log "ok"
} catch {
    Log "FAILED: $_"
    exit 1
}
