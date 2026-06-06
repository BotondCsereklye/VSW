param(
  [switch]$SkipInstall
)

$ErrorActionPreference = "Stop"

$projectRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$backendPath = Join-Path $projectRoot "backend"
$frontendPath = Join-Path $projectRoot "frontend"
$backendVenvPython = Join-Path $backendPath ".venv\Scripts\python.exe"
$npmCmd = "C:\Program Files\nodejs\npm.cmd"

function Test-CompatiblePython {
  param(
    [Parameter(Mandatory = $true)]
    [string]$PythonPath
  )

  if (-not (Test-Path $PythonPath)) {
    return $false
  }

  try {
    $version = & $PythonPath -c "import sys; print(f'{sys.version_info[0]}.{sys.version_info[1]}')"
    if (-not $version) {
      return $false
    }

    $parts = $version.Trim().Split(".")
    if ($parts.Length -ne 2) {
      return $false
    }

    return ([int]$parts[0] -gt 3) -or (([int]$parts[0] -eq 3) -and ([int]$parts[1] -ge 12))
  }
  catch {
    return $false
  }
}

function Find-CompatiblePython {
  $candidates = @()

  if ($env:VSW_PYTHON) {
    $candidates += $env:VSW_PYTHON
  }

  if (Test-Path $backendVenvPython) {
    $candidates += $backendVenvPython
  }

  $localAppData = [Environment]::GetFolderPath("LocalApplicationData")
  $candidates += @(
    (Join-Path $localAppData "Programs\Python\Python314\python.exe"),
    (Join-Path $localAppData "Programs\Python\Python313\python.exe"),
    (Join-Path $localAppData "Programs\Python\Python312\python.exe")
  )

  foreach ($candidate in $candidates) {
    if (Test-CompatiblePython -PythonPath $candidate) {
      return $candidate
    }
  }

  throw "No compatible Python 3.12+ runtime found. Install Python 3.12 or newer, or set VSW_PYTHON."
}

if (-not (Test-Path $npmCmd)) {
  throw "npm.cmd not found. Install Node.js first."
}

$bootstrapPython = Find-CompatiblePython

if ((Test-Path $backendVenvPython) -and (-not (Test-CompatiblePython -PythonPath $backendVenvPython))) {
  Write-Host "Removing incompatible backend virtual environment..." -ForegroundColor Yellow
  Remove-Item -Recurse -Force (Join-Path $backendPath ".venv")
}

if (-not (Test-Path $backendVenvPython)) {
  Write-Host "Creating backend virtual environment (.venv)..." -ForegroundColor Yellow
  & $bootstrapPython -m venv (Join-Path $backendPath ".venv")
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
  Write-Host "Opening browser at http://127.0.0.1:5173 ..." -ForegroundColor Cyan
  Start-Process "http://127.0.0.1:5173"

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
