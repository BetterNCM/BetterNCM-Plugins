param(
    [string]$installerPath
)

$cloudMusicProcess = Get-Process -name "cloudmusic" -ErrorAction SilentlyContinue
$cloudMusicProcess = $cloudMusicProcess[0]

if ($cloudMusicProcess -ne $null) {
    $cloudMusicFolder = (Get-Item $cloudMusicProcess.MainModule.FileName).DirectoryName.ToString()
    $cloudMusicPath = $cloudMusicProcess.MainModule.FileName
    
    Write-Host "| ---------  DowngradeOK  --------- |"
    $host.UI.RawUI.WindowTitle = "Downgrading cloudmusic..."
    Write-Host "| Detected: cloudmusic.exe is running at $cloudMusicPath."
    Write-Host "| Downgrading..."
    Stop-Process -Name "cloudmusic" -Force
    Start-Sleep -Seconds 1

    Start-Process $installerPath -ArgumentList "/S /D=$cloudMusicFolder" -Wait
    Start-Sleep -Seconds 1
    Write-Host "| Reinstall finished."
    $cloudMusicDllPath = Join-Path $cloudMusicFolder "cloudmusic.dll"

    Write-Host "| Patching update function..."
    Write-Host "| cloudmusic.dll is located at $cloudMusicDllPath."
    if (-not (Test-Path $cloudMusicDllPath)) {
        Write-Host "| cloudmusic.dll not found."
        exit
    }
    # from: e881f3ffff (call sub_100f0890)
    # to: b800000000 (mov eax, 0)

    $cloudMusicContent = [System.IO.File]::ReadAllBytes($cloudMusicDllPath)
    Write-Host "| cloudmusic.dll length: $($cloudMusicContent.Length)"
    $fromBytes = @([byte]0xe8, [byte]0x81, [byte]0xf3, [byte]0xff, [byte]0xff)
    $toBytes = @([byte]0xb8, [byte]0x00, [byte]0x00, [byte]0x00, [byte]0x00)

    for ($i = 0; $i -lt $cloudMusicContent.Length; $i++) {
        $found = $true
        for ($j = 0; $j -lt $fromBytes.Length; $j++) {
            if ($cloudMusicContent[$i + $j] -ne $fromBytes[$j]) {
                $found = $false
                break
            }
        }
        if ($found) {
            Write-Host "| Update function call found at $i."
            [System.Array]::Copy($toBytes, 0, $cloudMusicContent, $i, $toBytes.Length)
        }
    }

    [System.IO.File]::WriteAllBytes($cloudMusicDllPath, $cloudMusicContent)
    Write-Host "| cloudmusic.dll patched."
    Write-Host "| Setting privs..."
    $updateFolder = "$env:AppData/../Local/NetEase/CloudMusic/update"
    rm $updateFolder -Recurse -ErrorAction SilentlyContinue
    New-Item -Pat $updateFolder -ItemType File -Force
    
    Write-Host "| Finished! Starting cloudmusic.exe..."
    Start-Process -FilePath $cloudMusicPath -Verb RunAs
    Set-ItemProperty -Path $updateFolder -Name IsReadOnly -Value $true
}
else {
    Write-Host "cloudmusic.exe is not running."
    exit
}
