# One-shot HTTPS transport for BetterNCM. No server, installation or policy changes.
# All user data is decoded as JSON; it is never evaluated as PowerShell or a command.
param([Parameter(Mandatory=$true)][string]$RequestBase64)
$ErrorActionPreference = 'Stop'
$replyPath = $null
$curlProcess = $null
$headersPath = $null
$curlCode = 0
function Test-LyricUrl([string]$value) {
    $uri = [Uri]$value
    return $uri.IsAbsoluteUri -and $uri.Scheme -eq 'https' -and $uri.Port -eq 443 -and
        -not $uri.UserInfo -and @('utaten.com','www.utaten.com','uta-net.com','www.uta-net.com').Contains($uri.DnsSafeHost)
}
function Config-String([string]$value) {
    if ($value.Contains("`r") -or $value.Contains("`n") -or $value.Contains([char]0)) { throw 'Invalid request value' }
    return '"' + $value.Replace('\','\\').Replace('"','\"') + '"'
}
try {
    $request = [Text.Encoding]::UTF8.GetString([Convert]::FromBase64String($RequestBase64)) | ConvertFrom-Json
    $replyPath = [IO.Path]::GetFullPath([string]$request.reply)
    if ([IO.Path]::GetFileName($replyPath) -notmatch '^request-[a-f0-9]{32}\.json$') { $replyPath = $null; throw 'Invalid response filename' }
    if (-not [IO.Directory]::Exists([IO.Path]::GetDirectoryName($replyPath))) { $replyPath = $null; throw 'Response directory missing' }
    if (-not (Test-LyricUrl $request.url)) { throw 'Unsupported lyric URL' }
    $proxy = [string]$request.proxy
    if ($proxy) {
        $proxyUri = [Uri]$proxy
        if (-not $proxyUri.IsAbsoluteUri -or @('http','https','socks5','socks5h') -notcontains $proxyUri.Scheme -or
            -not $proxyUri.Host -or $proxyUri.UserInfo -or $proxyUri.Query -or $proxyUri.Fragment -or
            ($proxyUri.AbsolutePath -and $proxyUri.AbsolutePath -ne '/')) { throw 'Unsupported proxy address' }
    }
    $curl = Join-Path ([Environment]::GetFolderPath('System')) 'curl.exe'
    if (-not [IO.File]::Exists($curl)) { throw 'Windows curl.exe is unavailable (Windows 10 1803 or newer required)' }
    $url = [string]$request.url
    $result = $null
    $headersPath = $replyPath + '.headers'
    # Share a 30-second budget across redirects instead of resetting it per URL.
    $watch = [Diagnostics.Stopwatch]::StartNew()
    for ($redirect = 0; $redirect -le 2; $redirect++) {
        if (-not (Test-LyricUrl $url)) { throw 'Redirect outside lyric websites refused' }
        if ([IO.File]::Exists($replyPath + '.cancel')) { throw 'Cancelled' }
        $remaining = [Math]::Ceiling((30000 - $watch.ElapsedMilliseconds) / 1000)
        if ($remaining -le 0) { $curlCode = 28; throw 'Request timeout' }
        $info = New-Object Diagnostics.ProcessStartInfo
        $info.FileName = $curl
        $info.Arguments = '-q --config -'
        $info.UseShellExecute = $false
        $info.CreateNoWindow = $true
        $info.WindowStyle = [Diagnostics.ProcessWindowStyle]::Hidden
        $info.RedirectStandardInput = $true
        $info.RedirectStandardOutput = $true
        $info.RedirectStandardError = $true
        $info.StandardOutputEncoding = New-Object Text.UTF8Encoding($false)
        $info.StandardErrorEncoding = New-Object Text.UTF8Encoding($false)
        $curlProcess = New-Object Diagnostics.Process
        $curlProcess.StartInfo = $info
        [void]$curlProcess.Start()
        # Explicit empty proxy disables environment proxies when the UI selects direct access.
        $curlConfig = @('silent','show-error','compressed','globoff',
            ('connect-timeout = ' + [Math]::Min(10, $remaining)), ('max-time = ' + $remaining),
            'max-filesize = 2097152','proto = "=https"','noproxy = ""',
            ('proxy = ' + (Config-String $proxy)), ('url = ' + (Config-String $url)),
            ('dump-header = ' + (Config-String $headersPath)), 'header = "Accept: text/html,application/xhtml+xml"',
            'write-out = "\n%{http_code}\n%{redirect_url}"') -join "`n"
        # UtaTen's search endpoint returns HTTP 200 with a zero-length body when
        # the request has no site Referer. Match the public site's search form;
        # a browser User-Agent alone does not fix it. Keep this origin constant
        # so no playing-song, proxy or local-path data is sent in this header.
        if (@('utaten.com','www.utaten.com').Contains(([Uri]$url).DnsSafeHost)) {
            $curlConfig += "`n" + 'referer = "https://utaten.com/"'
        }
        $outTask = $curlProcess.StandardOutput.ReadToEndAsync()
        $errorTask = $curlProcess.StandardError.ReadToEndAsync()
        $curlProcess.StandardInput.WriteLine($curlConfig)
        $curlProcess.StandardInput.Close()
        while (-not $curlProcess.WaitForExit(200)) {
            if ([IO.File]::Exists($replyPath + '.cancel')) { $curlProcess.Kill(); throw 'Cancelled' }
            if ($watch.ElapsedMilliseconds -gt 32000) { $curlProcess.Kill(); $curlCode = 28; throw 'Request timeout' }
        }
        $body = $outTask.GetAwaiter().GetResult()
        $errorText = $errorTask.GetAwaiter().GetResult()
        $curlCode = $curlProcess.ExitCode
        if ($curlCode -ne 0) { throw ('curl error ' + $curlCode) }
        $curlProcess.Dispose(); $curlProcess = $null
        if ($body.Length -gt 2097152) { throw 'Response too large' }
        $last = $body.LastIndexOf("`n")
        $previous = $body.LastIndexOf("`n", $last - 1)
        if ($previous -lt 0) { throw 'Invalid HTTP response' }
        $status = [int]$body.Substring($previous + 1, $last - $previous - 1)
        $next = $body.Substring($last + 1).Trim()
        if ($status -ge 300 -and $status -lt 400 -and $next) { $url = $next; continue }
        $result = @{ ok = ($status -eq 200); status = $status; url = $url; body = '' }
        if ([IO.File]::Exists($headersPath)) {
            $headers = [IO.File]::ReadAllText($headersPath)
            $retryHeaders = [regex]::Matches($headers, '(?im)^Retry-After:\s*([^\r\n]+)')
            if ($retryHeaders.Count -gt 0) { $result.retryAfter = $retryHeaders[$retryHeaders.Count - 1].Groups[1].Value.Trim() }
        }
        if ($status -eq 200) { $result.body = $body.Substring(0, $previous) }
        break
    }
    if (-not $result) { throw 'Too many redirects' }
} catch {
    $result = @{ ok = $false; error = [string]$_.Exception.Message; curlCode = $curlCode }
} finally {
    if ($curlProcess) {
        try { if (-not $curlProcess.HasExited) { $curlProcess.Kill() }; $curlProcess.Dispose() } catch {}
    }
    if ($replyPath) {
        if ($headersPath -and [IO.File]::Exists($headersPath)) { [IO.File]::Delete($headersPath) }
        $json = $result | ConvertTo-Json -Compress -Depth 4
        $partial = $replyPath + '.partial'
        [IO.File]::WriteAllText($partial, $json, (New-Object Text.UTF8Encoding($false)))
        [IO.File]::Move($partial, $replyPath)
    }
}
