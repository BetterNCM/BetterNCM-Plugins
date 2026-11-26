# Atomic local cache update. Input is data, never executable text.
param([Parameter(Mandatory=$true)][string]$RequestBase64)
$ErrorActionPreference = 'Stop'
$job = $null
try {
    $job = [Text.Encoding]::UTF8.GetString([Convert]::FromBase64String($RequestBase64))
    $job = [IO.Path]::GetFullPath($job)
    if ([IO.Path]::GetFileName($job) -notmatch '^\d{1,20}\.json\.write-[a-f0-9]{32}$') { $job = $null; throw 'Invalid cache update path' }
    $destination = $job.Substring(0, $job.LastIndexOf('.write-'))
    $data = [IO.File]::ReadAllText($job, [Text.Encoding]::UTF8) | ConvertFrom-Json
    $exists = [IO.File]::Exists($destination)
    if (($null -eq $data.expected -and $exists) -or
        ($null -ne $data.expected -and (-not $exists -or [IO.File]::ReadAllText($destination, [Text.Encoding]::UTF8) -cne [string]$data.expected))) { throw 'Cache changed; reload before saving' }
    [void]([string]$data.next | ConvertFrom-Json)
    [IO.File]::WriteAllText($job + '.new', [string]$data.next, (New-Object Text.UTF8Encoding($false)))
    if ($exists) { [IO.File]::Replace($job + '.new', $destination, [NullString]::Value) }
    else { [IO.File]::Move($job + '.new', $destination) }
    $result = @{ ok = $true }
} catch { $result = @{ ok = $false; error = [string]$_.Exception.Message } }
finally {
    if ($job) {
        if ([IO.File]::Exists($job + '.new')) { [IO.File]::Delete($job + '.new') }
        [IO.File]::WriteAllText($job + '.result', ($result | ConvertTo-Json -Compress), (New-Object Text.UTF8Encoding($false)))
    }
}
