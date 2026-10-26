# Renders the Halloween reel with Blender, restarting it if it crashes (e.g. out of
# memory) until all 480 frames exist, then encodes the MP4.
#   powershell -ExecutionPolicy Bypass -File scripts\render_halloween_reel.ps1
$ErrorActionPreference = "Continue"  # Blender prints harmless importer warnings on stderr
$blender = "C:\Program Files\Blender Foundation\Blender 3.6\blender.exe"
$app = Split-Path -Parent $PSScriptRoot
$script = Join-Path $app "scripts\halloween_reel_blender.py"
$frames = Join-Path $app "exports\halloween-reel\frames"
$log = Join-Path $app "exports\halloween-render.log"
New-Item -ItemType Directory -Force $frames | Out-Null
Get-ChildItem $frames -Filter "tmp_*.png" -ErrorAction SilentlyContinue | Remove-Item

for ($attempt = 1; $attempt -le 40; $attempt++) {
    $done = @(Get-ChildItem $frames -Filter "f_*.png" | Where-Object Length -gt 0).Count
    if ($done -ge 480) { break }
    Add-Content $log "=== attempt $attempt, $done/480 frames done, $(Get-Date -Format T)"
    & $blender -b -P $script 2>&1 | Where-Object { $_ -match "FRAME|Error|Traceback|MP4" } | ForEach-Object { Add-Content $log $_ }
}
$done = @(Get-ChildItem $frames -Filter "f_*.png" | Where-Object Length -gt 0).Count
if ($done -lt 480) { Add-Content $log "STOPPED: only $done/480 frames"; exit 1 }
$mp4 = Join-Path $app "exports\halloween-bbq-ride-reel.mp4"
if (-not (Test-Path $mp4)) {
    Add-Content $log "=== encoding $(Get-Date -Format T)"
    & $blender -b -P $script -- --encode 2>&1 | Where-Object { $_ -match "MP4|Error|Traceback" } | ForEach-Object { Add-Content $log $_ }
}
Add-Content $log "=== finished $(Get-Date -Format T)"
