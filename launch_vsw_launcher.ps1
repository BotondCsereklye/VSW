Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$projectRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$launcherPath = Join-Path $projectRoot "tools\vsw_launcher.pyw"

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

  $localAppData = [Environment]::GetFolderPath("LocalApplicationData")
  $candidates += Join-Path $projectRoot "backend\.venv\Scripts\python.exe"
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

$pythonPath = Find-CompatiblePython
Start-Process -FilePath $pythonPath -ArgumentList @($launcherPath) -WorkingDirectory $projectRoot
