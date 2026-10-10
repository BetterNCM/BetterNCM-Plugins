param([Parameter(Mandatory=$true)][string]$Destination,[string]$SourceDirectory=$PSScriptRoot)
$ErrorActionPreference = 'Stop'
$taskDestination = [IO.Path]::GetFullPath($Destination)
$taskSource = [IO.Path]::GetFullPath($SourceDirectory)
New-Item -ItemType Directory -Path $taskDestination -Force | Out-Null
try {
    $taskConfig = Get-Content -Raw -LiteralPath (Join-Path $taskDestination 'bridge-config.json') | ConvertFrom-Json
    $taskHealth = $null
    try { $taskHealth = Invoke-RestMethod ('http://127.0.0.1:'+$taskConfig.port+'/health') -TimeoutSec 2 } catch {}
    if ($taskHealth -and $taskHealth.service -ne 'lyricbar-obs') { throw 'Configured port belongs to another service.' }
    $taskFiles = @('bridge-server.cjs') + @(Get-ChildItem -LiteralPath (Join-Path $taskSource 'public') -File | ForEach-Object {'public/'+$_.Name})
    $taskChanged = $false
    foreach ($taskFile in $taskFiles) {
        $taskTarget = Join-Path $taskDestination $taskFile
        if (-not (Test-Path -LiteralPath $taskTarget) -or (Get-FileHash -LiteralPath $taskTarget).Hash -ne (Get-FileHash -LiteralPath (Join-Path $taskSource $taskFile)).Hash) { $taskChanged = $true }
    }
    if ($taskHealth -and -not $taskChanged) { return }
    $taskNode = (Get-Command node.exe -ErrorAction SilentlyContinue).Source
    if (-not $taskNode) { $taskNode = Join-Path $env:ProgramFiles 'nodejs\node.exe' }
    if (-not (Test-Path -LiteralPath $taskNode)) { throw 'Node.js 20+ is required. Install it, then click Start / Check connection in the plugin.' }
    $taskNodeMajor = [int]((& $taskNode --version).Trim().TrimStart('v').Split('.')[0])
    if ($taskNodeMajor -lt 20) { throw 'Node.js 20 or newer is required.' }
    if ($taskHealth) {
        $taskOwnerIds = @(Get-NetTCPConnection -LocalAddress '127.0.0.1' -LocalPort $taskConfig.port -State Listen -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess)
        Get-CimInstance Win32_Process -Filter "Name='node.exe'" | Where-Object { $_.ProcessId -in $taskOwnerIds -and $_.CommandLine -match '(?:^|[\\/"\s])bridge-server\.cjs(?:["\s]|$)' } | ForEach-Object { Stop-Process -Id $_.ProcessId }
    }
    New-Item -ItemType Directory -Path (Join-Path $taskDestination 'public') -Force | Out-Null
    foreach ($taskFile in $taskFiles) { Copy-Item -LiteralPath (Join-Path $taskSource $taskFile) -Destination (Join-Path $taskDestination $taskFile) -Force }
    Start-Process -FilePath $taskNode -ArgumentList ('"'+(Join-Path $taskDestination 'bridge-server.cjs')+'"') -WorkingDirectory $taskDestination -WindowStyle Hidden -RedirectStandardOutput (Join-Path $taskDestination 'service.log') -RedirectStandardError (Join-Path $taskDestination 'service-error.log')
    [pscustomobject]@{ok=$true} | ConvertTo-Json | Set-Content -LiteralPath (Join-Path $taskDestination 'runtime-status.json') -Encoding UTF8
} catch {
    [pscustomobject]@{ok=$false;message=$_.Exception.Message} | ConvertTo-Json | Set-Content -LiteralPath (Join-Path $taskDestination 'runtime-status.json') -Encoding UTF8
    throw
}
