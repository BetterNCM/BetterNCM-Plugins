# This file is licensed under the GNU/GPL-3.0
# Copyright (C) 2025 Lukoning
param(
    [ValidateSet("Hide", "Show")]
    [string]$action = "Hide"  # 默认操作为隐藏
)
Add-Type @"
using System;
using System.Runtime.InteropServices;
using System.Text;

public class WindowUtils {
    [DllImport("user32.dll")] public static extern IntPtr FindWindow(string lpClassName, string lpWindowName);
    [DllImport("user32.dll")] public static extern bool EnumWindows(EnumWindowsProc enumProc, IntPtr lParam);
    [DllImport("user32.dll")] public static extern int GetWindowText(IntPtr hWnd, StringBuilder lpString, int nMaxCount);
    [DllImport("user32.dll")] public static extern int GetClassName(IntPtr hWnd, StringBuilder lpClassName, int nMaxCount);
    [DllImport("user32.dll")] public static extern uint GetWindowThreadProcessId(IntPtr hWnd, out uint lpdwProcessId);
    [DllImport("user32.dll")] public static extern int GetWindowLong(IntPtr hWnd, int nIndex);
    [DllImport("user32.dll")] public static extern int SetWindowLong(IntPtr hWnd, int nIndex, int dwNewLong);
    
    public const int GWL_EXSTYLE = -20;
    public const int WS_EX_APPWINDOW = 0x40000;
    public const int WS_EX_TOOLWINDOW = 0x80;
    
    public delegate bool EnumWindowsProc(IntPtr hWnd, IntPtr lParam);

    public struct Window {
        public IntPtr Handle;
    }
}
"@
function setWindowStyle {
    param ([IntPtr]$window)
    $exStyle = [WindowUtils]::GetWindowLong($window, [WindowUtils]::GWL_EXSTYLE)
    if ($action -eq "Hide") {
        # 隐藏任务栏图标：ban掉APPWINDOW，按上TOOLWINDOW
        $exStyle = $exStyle -band (-bnot [WindowUtils]::WS_EX_APPWINDOW)
        $exStyle = $exStyle -bor [WindowUtils]::WS_EX_TOOLWINDOW
    } else {
        # 显示任务栏图标：ban掉TOOLWINDOW，按上APPWINDOW
        $exStyle = $exStyle -bor [WindowUtils]::WS_EX_APPWINDOW
        $exStyle = $exStyle -band (-bnot [WindowUtils]::WS_EX_TOOLWINDOW)
    }
    [WindowUtils]::SetWindowLong($window, [WindowUtils]::GWL_EXSTYLE, $exStyle)
    Write-Host "已处理窗口:$($window)"
}
function planB { #备用方案
    # 收集窗口信息
    $targetWindows = New-Object System.Collections.Generic.List[WindowUtils+Window]

    # 枚举窗口的回调函数
    $callback = {
        param([IntPtr]$hWnd, [IntPtr]$lParam)

        # 获取类名
        $classBuilder = New-Object System.Text.StringBuilder 256
        [WindowUtils]::GetClassName($hWnd, $classBuilder, $classBuilder.Capacity) | Out-Null
        $className = $classBuilder.ToString()
        # 条件1：类名匹配
        if ($className -ne "Chrome_WidgetWin_0") { return $true }

        # 获取窗口标题
        $titleBuilder = New-Object System.Text.StringBuilder 256
        [WindowUtils]::GetWindowText($hWnd, $titleBuilder, $titleBuilder.Capacity) | Out-Null
        $title = $titleBuilder.ToString()
        # 条件2：标题包含关键词
        if (-not ($title -match "Picture in picture")) { return $true }

        # 获取进程ID
        $processId = 0
        [WindowUtils]::GetWindowThreadProcessId($hWnd, [ref]$processId) | Out-Null

        # 获取进程名称
        $processName = ""
        if ($processId -ne 0) {
            try {
                $process = Get-Process -Id $processId -ErrorAction Stop
                $processName = $process.Name
            }
            catch {
                $processName = ""
            }
        }
        # 条件3：进程名称匹配
        if ($processName -ne "cloudmusic") { return $true }

        # 添加到列表
        $Window = New-Object WindowUtils+Window
        $Window.Handle = $hWnd
        $targetWindows.Add($Window)
        return $true
    }

    # 枚举所有窗口
    [WindowUtils]::EnumWindows($callback, [IntPtr]::Zero) | Out-Null

    # 遍历符合条件的窗口(虽然应该只有一个)，一一修改样式
    foreach ($window in $targetWindows) {setWindowStyle -window $window.Handle}
}

# 查找窗口
$targetWindow = [WindowUtils]::FindWindow("Chrome_WidgetWin_0", "Picture in picture")

if ($targetWindow -ne [IntPtr]::Zero) {
    # 获取进程ID
    $processId = 0
    [WindowUtils]::GetWindowThreadProcessId($targetWindow, [ref]$processId)

    # 获取进程名称
    $processName = ""
    if ($processId -ne 0) {
        try {
            $process = Get-Process -Id $processId -ErrorAction Stop
            $processName = $process.Name
        }
        catch {
            $processName = ""
        }
    }
    # 匹配进程名称，不匹配的话启用备用方案
    if ($processName -eq "cloudmusic") {
        setWindowStyle -window $targetWindow
    } else {planB}
}