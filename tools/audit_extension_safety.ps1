Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$projectRoot = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
$extensionPath = Join-Path $projectRoot "extensions\vsw-link-capture"
$manifestPath = Join-Path $extensionPath "manifest.json"

if (-not (Test-Path -LiteralPath $manifestPath)) {
  throw "Extension manifest not found: $manifestPath"
}

$blockedPatterns = @(
  "eval\s*\(",
  "new\s+Function\s*\(",
  "document\.write\s*\(",
  "innerHTML\s*=",
  "outerHTML\s*=",
  "insertAdjacentHTML\s*\(",
  "chrome\.history",
  "chrome\.downloads",
  "chrome\.cookies",
  "chrome\.bookmarks",
  "chrome\.management",
  "nativeMessaging",
  "webRequestBlocking",
  "XMLHttpRequest"
)

$files = Get-ChildItem -LiteralPath $extensionPath -Recurse -File -Include *.js,*.html
$findings = @()

foreach ($file in $files) {
  foreach ($pattern in $blockedPatterns) {
    $matches = Select-String -Path $file.FullName -Pattern $pattern -CaseSensitive:$false
    foreach ($match in $matches) {
      $findings += [pscustomobject]@{
        File = $file.FullName.Substring($projectRoot.Length + 1)
        Line = $match.LineNumber
        Pattern = $pattern
        Text = $match.Line.Trim()
      }
    }
  }
}

$javascriptFiles = Get-ChildItem -LiteralPath $extensionPath -Recurse -File |
  Where-Object { $_.Extension -eq ".js" }
foreach ($file in $javascriptFiles) {
  $matches = Select-String -Path $file.FullName -Pattern "['`"]https?://(?!127\.0\.0\.1|localhost)" -CaseSensitive:$false
  foreach ($match in $matches) {
    $findings += [pscustomobject]@{
      File = $file.FullName.Substring($projectRoot.Length + 1)
      Line = $match.LineNumber
      Pattern = "external-url-in-js"
      Text = $match.Line.Trim()
    }
  }
}

$manifest = Get-Content -Raw -LiteralPath $manifestPath | ConvertFrom-Json
$permissions = @($manifest.permissions)
$hostPermissions = @($manifest.host_permissions)
$expectedPermissions = @("contextMenus", "activeTab", "storage", "webNavigation")
$unexpectedPermissions = @($permissions | Where-Object { $_ -notin $expectedPermissions })

Write-Host "VSW extension safety audit" -ForegroundColor Cyan
Write-Host "Permissions: $($permissions -join ', ')"
Write-Host "Host permissions: $($hostPermissions -join ', ')"

if ($unexpectedPermissions.Count -gt 0) {
  Write-Host "Unexpected permissions: $($unexpectedPermissions -join ', ')" -ForegroundColor Red
  exit 1
}

if ($findings.Count -gt 0) {
  Write-Host "Potentially dangerous patterns found:" -ForegroundColor Red
  $findings | Format-Table -AutoSize
  exit 1
}

Write-Host "No dangerous extension patterns found." -ForegroundColor Green
Write-Host "Note: broad host permissions are expected for live click capture and passive navigation reports." -ForegroundColor Yellow
