[CmdletBinding()]
param(
    [Parameter(Mandatory = $true)]
    [string]$JobPath
)

$ErrorActionPreference = "Stop"
$ProgressPreference = "SilentlyContinue"
$JobPath = [IO.Path]::GetFullPath($JobPath)

$ComponentVersion = "6.1.1"
$ComponentBase = if ($env:RNPVB_COMPONENT_ROOT) {
    $env:RNPVB_COMPONENT_ROOT
} else {
    Join-Path $env:LOCALAPPDATA "RNPVideoBackground"
}
$ComponentRoot = Join-Path $ComponentBase "ffmpeg-$ComponentVersion"
$FfmpegPath = Join-Path $ComponentRoot "ffmpeg.exe"
$FfprobePath = Join-Path $ComponentRoot "ffprobe.exe"
$ScriptRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$DataRoot = Split-Path -Parent $JobPath
$StatusPath = Join-Path $DataRoot "status.json"
$CancelPath = Join-Path $DataRoot "cancel.json"
$LogPath = Join-Path $DataRoot "worker.log"

$Assets = @(
    [pscustomobject]@{
        Name = "ffmpeg"
        FileName = "ffmpeg-win32-x64.gz"
        CompressedSha256 = "8883a3dffbd0a16cf4ef95206ea05283f78908dbfb118f73c83f4951dcc06d77"
        ExtractedSha256 = "04e1307997530f9cf2fe35cba2ca7e8875ca91da02f89d6c7243df819c94ad00"
    },
    [pscustomobject]@{
        Name = "ffprobe"
        FileName = "ffprobe-win32-x64.gz"
        CompressedSha256 = "f309e6223ad89d2fe54bccd420a7709b66fd27540674e92309578ed491a43c8d"
        ExtractedSha256 = "3a7e2dc003dc2cd1472827e4c7c4f056ae1ae0ae7c5bbc580c99b49827351ba4"
    }
)

function Write-Status {
    param(
        [string]$State,
        [string]$Message,
        [hashtable]$Extra = @{}
    )
    $payload = [ordered]@{
        protocol = 1
        jobId = $script:Job.id
        command = $script:Job.command
        state = $State
        message = $Message
        updatedAt = [DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds()
    }
    foreach ($key in $Extra.Keys) { $payload[$key] = $Extra[$key] }
    $tempPath = "$StatusPath.tmp"
    $payload | ConvertTo-Json -Depth 20 -Compress | Set-Content -LiteralPath $tempPath -Encoding UTF8
    Move-Item -LiteralPath $tempPath -Destination $StatusPath -Force
}

function Get-Sha256([string]$Path) {
    return (Get-FileHash -LiteralPath $Path -Algorithm SHA256).Hash.ToLowerInvariant()
}

function Test-Component {
    if (-not (Test-Path -LiteralPath $FfmpegPath) -or -not (Test-Path -LiteralPath $FfprobePath)) { return $false }
    $ffmpegHash = Get-Sha256 $FfmpegPath
    $ffprobeHash = Get-Sha256 $FfprobePath
    return $ffmpegHash -eq $Assets[0].ExtractedSha256 -and
           $ffprobeHash -eq $Assets[1].ExtractedSha256
}

function Expand-Gzip([string]$Source, [string]$Destination) {
    $inputStream = [IO.File]::OpenRead($Source)
    try {
        $gzip = New-Object IO.Compression.GZipStream($inputStream, [IO.Compression.CompressionMode]::Decompress)
        try {
            $outputStream = [IO.File]::Create($Destination)
            try { $gzip.CopyTo($outputStream) } finally { $outputStream.Dispose() }
        } finally { $gzip.Dispose() }
    } finally { $inputStream.Dispose() }
}

function Install-Online {
    New-Item -ItemType Directory -Path $ComponentRoot -Force | Out-Null
    $sources = @(
        "https://cdn.npmmirror.com/binaries/ffmpeg-static/b6.1.1",
        "https://github.com/eugeneware/ffmpeg-static/releases/download/b6.1.1"
    )
    for ($index = 0; $index -lt $Assets.Count; $index++) {
        $asset = $Assets[$index]
        $gzipPath = Join-Path $ComponentRoot ($asset.FileName + ".download")
        $exePath = Join-Path $ComponentRoot ($asset.Name + ".exe")
        $downloaded = $false
        foreach ($source in $sources) {
            try {
                Write-Status "installing" "正在下载 $($asset.Name)（$($index + 1)/$($Assets.Count)）" @{ progress = [math]::Round($index / $Assets.Count * 100); source = $source }
                Invoke-WebRequest -UseBasicParsing -Uri "$source/$($asset.FileName)" -OutFile $gzipPath -TimeoutSec 120
                if ((Get-Sha256 $gzipPath) -ne $asset.CompressedSha256) { throw "压缩包 SHA-256 校验失败" }
                Expand-Gzip $gzipPath $exePath
                if ((Get-Sha256 $exePath) -ne $asset.ExtractedSha256) { throw "程序 SHA-256 校验失败" }
                $downloaded = $true
                break
            } catch {
                Add-Content -LiteralPath $LogPath -Encoding UTF8 -Value "[$([DateTime]::Now)] $source/$($asset.FileName): $($_.Exception.Message)"
                Remove-Item -LiteralPath $gzipPath -Force -ErrorAction SilentlyContinue
                Remove-Item -LiteralPath $exePath -Force -ErrorAction SilentlyContinue
            }
        }
        Remove-Item -LiteralPath $gzipPath -Force -ErrorAction SilentlyContinue
        if (-not $downloaded) { throw "$($asset.Name) 从镜像和 GitHub 下载均失败" }
    }
}

function Install-Offline([string]$ArchivePath) {
    if (-not (Test-Path -LiteralPath $ArchivePath)) { throw "离线组件包不存在" }
    $extractRoot = Join-Path ([IO.Path]::GetTempPath()) ("rnpvb-offline-" + [guid]::NewGuid().ToString("N"))
    New-Item -ItemType Directory -Path $extractRoot -Force | Out-Null
    try {
        Expand-Archive -LiteralPath $ArchivePath -DestinationPath $extractRoot -Force
        $ffmpeg = Get-ChildItem -LiteralPath $extractRoot -Recurse -File -Filter "ffmpeg.exe" | Select-Object -First 1
        $ffprobe = Get-ChildItem -LiteralPath $extractRoot -Recurse -File -Filter "ffprobe.exe" | Select-Object -First 1
        if (-not $ffmpeg -or -not $ffprobe) { throw "离线包必须包含 ffmpeg.exe 和 ffprobe.exe" }
        if ((Get-Sha256 $ffmpeg.FullName) -ne $Assets[0].ExtractedSha256 -or
            (Get-Sha256 $ffprobe.FullName) -ne $Assets[1].ExtractedSha256) {
            throw "离线组件版本或 SHA-256 不匹配"
        }
        New-Item -ItemType Directory -Path $ComponentRoot -Force | Out-Null
        Copy-Item -LiteralPath $ffmpeg.FullName -Destination $FfmpegPath -Force
        Copy-Item -LiteralPath $ffprobe.FullName -Destination $FfprobePath -Force
    } finally {
        Remove-Item -LiteralPath $extractRoot -Recurse -Force -ErrorAction SilentlyContinue
    }
}

function Invoke-Probe([string]$InputPath) {
    if (-not (Test-Path -LiteralPath $InputPath)) { throw "视频文件不存在" }
    $jsonText = & $FfprobePath -v error -show_entries "format=filename,format_name,duration,size,bit_rate" -show_entries "stream=index,codec_type,codec_name,profile,pix_fmt,width,height,r_frame_rate,avg_frame_rate,channels,sample_rate" -of json -- $InputPath 2>> $LogPath
    if ($LASTEXITCODE -ne 0) { throw "ffprobe 无法读取该视频" }
    return ($jsonText -join "`n") | ConvertFrom-Json
}

function Get-SafeOutputPath([string]$InputPath) {
    $directory = Split-Path -Parent $InputPath
    $name = [IO.Path]::GetFileNameWithoutExtension($InputPath)
    $candidate = Join-Path $directory "$name.rnp-compatible.mp4"
    $number = 2
    while ((Test-Path -LiteralPath $candidate) -or $candidate -eq $InputPath) {
        $candidate = Join-Path $directory "$name.rnp-compatible-$number.mp4"
        $number++
    }
    return $candidate
}

function Quote-ProcessArgument([string]$Value) {
    if ($Value -notmatch '[\s"]') { return $Value }
    return '"' + ([regex]::Replace($Value, '(\\*)"', '$1$1\"') -replace '(\\+)$', '$1$1') + '"'
}

function Test-Cancelled {
    if (-not (Test-Path -LiteralPath $CancelPath)) { return $false }
    try {
        $cancel = Get-Content -Raw -LiteralPath $CancelPath -Encoding UTF8 | ConvertFrom-Json
        return $cancel.jobId -eq $script:Job.id
    } catch { return $false }
}

function Convert-ProgressSeconds([string]$Value) {
    if ([string]::IsNullOrWhiteSpace($Value) -or $Value -eq "N/A") { return $null }
    $microseconds = 0L
    if (-not [long]::TryParse(
        $Value.Trim(),
        [Globalization.NumberStyles]::Integer,
        [Globalization.CultureInfo]::InvariantCulture,
        [ref]$microseconds
    )) { return $null }
    return [double]$microseconds / 1000000.0
}

function Invoke-Transcode([string]$InputPath, [bool]$KeepAudio) {
    if (-not (Test-Path -LiteralPath $InputPath)) { throw "视频文件不存在" }
    $probe = Invoke-Probe $InputPath
    $duration = [double]$probe.format.duration
    $outputPath = if ($script:Job.outputPath) { [string]$script:Job.outputPath } else { Get-SafeOutputPath $InputPath }
    $sourceFull = [IO.Path]::GetFullPath($InputPath)
    $outputFull = [IO.Path]::GetFullPath($outputPath)
    if ($sourceFull.Equals($outputFull, [StringComparison]::OrdinalIgnoreCase)) { throw "输出路径不得覆盖原视频" }
    if (Test-Path -LiteralPath $outputFull) { throw "输出文件已经存在" }
    $temporaryPath = Join-Path (Split-Path -Parent $outputFull) ("." + [IO.Path]::GetFileNameWithoutExtension($outputFull) + ".rnpvb-" + [guid]::NewGuid().ToString("N") + ".tmp.mp4")
    $progressPath = Join-Path $ScriptRoot "ffmpeg-progress.txt"
    $errorPath = Join-Path $ScriptRoot "ffmpeg-error.log"
    Remove-Item -LiteralPath $progressPath, $errorPath, $CancelPath -Force -ErrorAction SilentlyContinue

    $arguments = @(
        "-hide_banner", "-y", "-i", $sourceFull,
        "-map", "0:v:0", "-vf", "scale=w='min(1920,iw)':h='min(1080,ih)':force_original_aspect_ratio=decrease:force_divisible_by=2,fps=30",
        "-c:v", "libx264", "-preset", "medium", "-crf", "23", "-pix_fmt", "yuv420p",
        "-movflags", "+faststart"
    )
    if ($KeepAudio) {
        $arguments += @("-map", "0:a?", "-c:a", "aac", "-b:a", "128k", "-ac", "2")
    } else {
        $arguments += "-an"
    }
    $arguments += @("-progress", $progressPath, "-nostats", $temporaryPath)

    $startInfo = New-Object Diagnostics.ProcessStartInfo
    $startInfo.FileName = $FfmpegPath
    $startInfo.Arguments = ($arguments | ForEach-Object { Quote-ProcessArgument ([string]$_) }) -join " "
    $startInfo.UseShellExecute = $false
    $startInfo.CreateNoWindow = $true
    $startInfo.RedirectStandardError = $true
    $process = New-Object Diagnostics.Process
    $process.StartInfo = $startInfo
    [void]$process.Start()
    $errorTask = $process.StandardError.ReadToEndAsync()

    try {
        $lastOutTime = 0.0
        while (-not $process.HasExited) {
            if (Test-Cancelled) {
                try { $process.Kill() } catch {}
                throw [OperationCanceledException]::new("转换已取消")
            }
            if (Test-Path -LiteralPath $progressPath) {
                $lines = Get-Content -LiteralPath $progressPath -ErrorAction SilentlyContinue
                $outLine = $lines | Where-Object { $_ -like "out_time_ms=*" } | Select-Object -Last 1
                $speedLine = $lines | Where-Object { $_ -like "speed=*" } | Select-Object -Last 1
                if ($outLine) {
                    $parsedOutTime = Convert-ProgressSeconds ($outLine -replace '^out_time_ms=', '')
                    if ($null -ne $parsedOutTime) { $lastOutTime = $parsedOutTime }
                }
                $percent = if ($duration -gt 0) { [math]::Min(99, [math]::Round($lastOutTime / $duration * 100, 1)) } else { 0 }
                Write-Status "transcoding" "正在转换视频：$percent%" @{ progress = $percent; speed = ($speedLine -replace '^speed=', ''); outputPath = $outputFull }
            }
            Start-Sleep -Milliseconds 500
        }
        $stderr = $errorTask.Result
        if ($process.ExitCode -ne 0) {
            Set-Content -LiteralPath $errorPath -Value $stderr -Encoding UTF8
            throw "FFmpeg 转换失败，诊断日志：$errorPath"
        }
        [void](Invoke-Probe $temporaryPath)
        Move-Item -LiteralPath $temporaryPath -Destination $outputFull
        return @{ outputPath = $outputFull; media = (Invoke-Probe $outputFull) }
    } finally {
        if (-not $process.HasExited) { try { $process.Kill() } catch {} }
        Remove-Item -LiteralPath $temporaryPath -Force -ErrorAction SilentlyContinue
        Remove-Item -LiteralPath $progressPath, $CancelPath -Force -ErrorAction SilentlyContinue
    }
}

try {
    if (-not (Test-Path -LiteralPath $JobPath)) { throw "任务文件不存在" }
    $script:Job = Get-Content -Raw -LiteralPath $JobPath -Encoding UTF8 | ConvertFrom-Json
    if (-not $Job.id -or -not $Job.command) { throw "任务格式无效" }
    Write-Status "running" "任务已启动"

    switch ([string]$Job.command) {
        "doctor" {
            $ready = Test-Component
            Write-Status "completed" $(if ($ready) { "FFmpeg 6.1.1 组件可用" } else { "尚未安装转换组件" }) @{
                success = $true; componentReady = $ready; componentVersion = $ComponentVersion; componentRoot = $ComponentRoot
            }
        }
        "install" {
            Install-Online
            if (-not (Test-Component)) { throw "组件安装后校验失败" }
            Write-Status "completed" "FFmpeg 6.1.1 组件安装完成" @{ success = $true; componentReady = $true; progress = 100; componentVersion = $ComponentVersion }
        }
        "installOffline" {
            Install-Offline ([string]$Job.archivePath)
            if (-not (Test-Component)) { throw "离线组件安装后校验失败" }
            Write-Status "completed" "离线组件安装完成" @{ success = $true; componentReady = $true; progress = 100; componentVersion = $ComponentVersion }
        }
        "probe" {
            if (-not (Test-Component)) { throw "转换组件未安装或校验失败" }
            $media = Invoke-Probe ([string]$Job.inputPath)
            Write-Status "completed" "媒体检测完成" @{ success = $true; media = $media; componentReady = $true }
        }
        "transcode" {
            if (-not (Test-Component)) { throw "转换组件未安装或校验失败" }
            $result = Invoke-Transcode ([string]$Job.inputPath) ([bool]$Job.keepAudio)
            Write-Status "completed" "视频转换完成" @{ success = $true; progress = 100; outputPath = $result.outputPath; media = $result.media; componentReady = $true }
        }
        default { throw "未知任务：$($Job.command)" }
    }
} catch [OperationCanceledException] {
    Write-Status "cancelled" $_.Exception.Message @{ success = $false }
} catch {
    Add-Content -LiteralPath $LogPath -Encoding UTF8 -Value "[$([DateTime]::Now)] $($_ | Out-String)"
    if (-not $script:Job) { $script:Job = [pscustomobject]@{ id = "unknown"; command = "unknown" } }
    Write-Status "error" $_.Exception.Message @{ success = $false; logPath = $LogPath }
}


