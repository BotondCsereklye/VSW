param(
  [switch]$StartMenu,
  [switch]$Startup,
  [switch]$RemoveStartup
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
if ($Startup) {
  $shortcutDirectory = [Environment]::GetFolderPath("Startup")
}

$shortcutPath = Join-Path $shortcutDirectory "VSW Launcher.lnk"
$powershellPath = Join-Path $env:SystemRoot "System32\WindowsPowerShell\v1.0\powershell.exe"

if ($RemoveStartup) {
  $startupShortcutPath = Join-Path ([Environment]::GetFolderPath("Startup")) "VSW Launcher.lnk"
  if (Test-Path -LiteralPath $startupShortcutPath) {
    Remove-Item -LiteralPath $startupShortcutPath -Force
    Write-Host "Removed startup shortcut: $startupShortcutPath" -ForegroundColor Green
  }
  else {
    Write-Host "No startup shortcut found: $startupShortcutPath" -ForegroundColor Yellow
  }
  return
}

$shell = New-Object -ComObject WScript.Shell
$shortcut = $shell.CreateShortcut($shortcutPath)
$shortcut.TargetPath = $powershellPath
if ($Startup) {
  $shortcut.Arguments = "-NoProfile -ExecutionPolicy Bypass -File `"$launcherScript`" -StartServices"
}
else {
  $shortcut.Arguments = "-NoProfile -ExecutionPolicy Bypass -File `"$launcherScript`""
}
$shortcut.WorkingDirectory = $projectRoot
$shortcut.Description = if ($Startup) { "Start VSW backend and frontend at Windows login" } else { "Start VSW backend and frontend" }
$shortcut.Save()

Write-Host "Created shortcut: $shortcutPath" -ForegroundColor Green
if ($Startup) {
  Write-Host "VSW will start backend and frontend automatically after Windows login." -ForegroundColor Green
}
