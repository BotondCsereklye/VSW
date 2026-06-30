param(
  [switch]$StartMenu
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$projectRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$launcherScript = Join-Path $projectRoot "launch_vsw_launcher.ps1"

if (-not (Test-Path -LiteralPath $launcherScript)) {
  throw "Launcher script not found: $launcherScript"
}

$desktopPath = [Environment]::GetFolderPath("Desktop")
$shortcutDirectory = $desktopPath
if ($StartMenu) {
  $shortcutDirectory = Join-Path ([Environment]::GetFolderPath("Programs")) "VSW"
  New-Item -ItemType Directory -Path $shortcutDirectory -Force | Out-Null
}

$shortcutPath = Join-Path $shortcutDirectory "VSW Launcher.lnk"
$powershellPath = Join-Path $env:SystemRoot "System32\WindowsPowerShell\v1.0\powershell.exe"

$shell = New-Object -ComObject WScript.Shell
$shortcut = $shell.CreateShortcut($shortcutPath)
$shortcut.TargetPath = $powershellPath
$shortcut.Arguments = "-NoProfile -ExecutionPolicy Bypass -File `"$launcherScript`""
$shortcut.WorkingDirectory = $projectRoot
$shortcut.Description = "Start VSW backend and frontend"
$shortcut.Save()

Write-Host "Created shortcut: $shortcutPath" -ForegroundColor Green
