Option Explicit

Dim shell, fso, scriptDir, workerPath, jobPath, command
Set shell = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")

scriptDir = fso.GetParentFolderName(WScript.ScriptFullName)
workerPath = fso.BuildPath(scriptDir, "worker.ps1")
If WScript.Arguments.Count > 0 Then
  jobPath = WScript.Arguments.Item(0)
Else
  jobPath = fso.BuildPath(scriptDir, "job.json")
End If
command = "powershell.exe -NoProfile -NonInteractive -ExecutionPolicy Bypass -File " & _
  Chr(34) & workerPath & Chr(34) & " -JobPath " & Chr(34) & jobPath & Chr(34)

' 0 = hidden window, False = return immediately.
shell.Run command, 0, False
