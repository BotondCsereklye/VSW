param(
  [switch]$SkipInstall
)

$ErrorActionPreference = "Stop"

$projectRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$backendPath = Join-Path $projectRoot "backend"
$frontendPath = Join-Path $projectRoot "frontend"
$backendVenvPython = Join-Path $backendPath ".venv\\Scripts\\python.exe"
$npmCmd = "C:\\Program Files\\nodejs\\npm.cmd"

if (-not (Test-Path $backendVenvPython)) {
  Write-Host "Creating backend virtual environment (.venv)..." -ForegroundColor Yellow
  py -3.12 -m venv (Join-Path $backendPath ".venv")
}

if (-not $SkipInstall) {
  Write-Host "Installing backend dependencies..." -ForegroundColor Yellow
  Set-Location -LiteralPath $backendPath
  & $backendVenvPython -m pip install -e ".[dev]"

  Write-Host "Installing frontend dependencies..." -ForegroundColor Yellow
  Set-Location -LiteralPath $frontendPath
  & $npmCmd install
}

Write-Host "Starting backend at http://127.0.0.1:8000 ..." -ForegroundColor Cyan
$backendJob = Start-Job -Name "vsw-backend" -ScriptBlock {
  param($backendDirectory, $pythonPath)
  Set-Location -LiteralPath $backendDirectory
  & $pythonPath -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
} -ArgumentList $backendPath, $backendVenvPython

try {
  Write-Host "Starting frontend at http://127.0.0.1:5173 ..." -ForegroundColor Cyan
  Set-Location -LiteralPath $frontendPath
  & $npmCmd run dev -- --host 127.0.0.1 --port 5173
}
finally {
  Write-Host "Stopping backend job..." -ForegroundColor Yellow
  if (Get-Job -Name "vsw-backend" -ErrorAction SilentlyContinue) {
    Stop-Job -Name "vsw-backend" -ErrorAction SilentlyContinue
    Remove-Job -Name "vsw-backend" -ErrorAction SilentlyContinue
  }
}
