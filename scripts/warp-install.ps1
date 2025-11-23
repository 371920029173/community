#requires -version 5.1
<#
  Name: warp-install.ps1
  Purpose: Detect and (silently) install Cloudflare WARP on Windows.
  Usage:
    powershell -NoProfile -ExecutionPolicy Bypass -File ".\scripts\warp-install.ps1"

  Exit codes:
    0 = WARP present (already installed or installed successfully)
    1 = Installation failed
    2 = Download failed
    3 = Elevation required but user declined

  Notes:
    - Non-interactive, safe for calling from packaged EXE (subprocess)
    - Tries PATH, default install dir and registry to detect WARP
#>

param(
  [switch]$ForceReinstall = $false
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

function Write-Info($msg)  { Write-Host "[INFO]  $msg"  -ForegroundColor Cyan }
function Write-Ok($msg)    { Write-Host "[ OK ]  $msg"  -ForegroundColor Green }
function Write-Warn($msg)  { Write-Host "[WARN]  $msg"  -ForegroundColor Yellow }
function Write-Err($msg)   { Write-Host "[FAIL]  $msg"  -ForegroundColor Red }

function Test-IsAdmin {
  $id = [Security.Principal.WindowsIdentity]::GetCurrent()
  $p  = New-Object Security.Principal.WindowsPrincipal($id)
  return $p.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
}

function Ensure-Admin {
  if (Test-IsAdmin) { return $true }
  Write-Warn 'Administrator privileges required. Elevating...'
  $psi = New-Object System.Diagnostics.ProcessStartInfo
  $psi.FileName = 'powershell.exe'
  $psi.Arguments = "-NoProfile -ExecutionPolicy Bypass -File `"$PSCommandPath`" $($PSBoundParameters.Keys | ForEach-Object { if ($PSBoundParameters[$_]) { '-' + $_ } })"
  $psi.Verb = 'runas'
  try {
    $p = [System.Diagnostics.Process]::Start($psi)
    $p.WaitForExit()
    exit $p.ExitCode
  } catch {
    Write-Err 'Elevation denied by user.'
    exit 3
  }
}

function Get-WarpCliPath {
  try {
    $cmd = Get-Command warp-cli -ErrorAction Stop
    return $cmd.Source
  } catch {}

  $default = 'C:\\Program Files\\Cloudflare\\Cloudflare WARP\\warp-cli.exe'
  if (Test-Path $default) { return $default }

  $regPaths = @(
    'HKLM:\SOFTWARE\Cloudflare\Cloudflare WARP',
    'HKLM:\SOFTWARE\WOW6432Node\Cloudflare\Cloudflare WARP'
  )
  foreach ($rp in $regPaths) {
    try {
      $inst = (Get-ItemProperty -Path $rp -ErrorAction Stop)
      if ($inst.InstallLocation) {
        $p = Join-Path $inst.InstallLocation 'warp-cli.exe'
        if (Test-Path $p) { return $p }
      }
    } catch {}
  }
  return $null
}

function Get-WarpMsiUrl {
  # Try to parse latest MSI link from 1.1.1.1 landing page
  try {
    Write-Info 'Fetching latest MSI link from https://1.1.1.1/'
    $html = Invoke-WebRequest -Uri 'https://1.1.1.1/' -UseBasicParsing -TimeoutSec 30
    $link = ($html.Links | Where-Object { $_.href -match '\\.msi$' } | Select-Object -First 1).href
    if ($null -ne $link) {
      if ($link -notmatch '^https?://') { $link = 'https://1.1.1.1' + $link }
      return $link
    }
  } catch {}

  # Fallback known CDN path (may change over time)
  $fallbacks = @(
    'https://1.1.1.1/Cloudflare_WARP_Release-x64.msi',
    'https://downloads.cloudflareclient.com/windows/Cloudflare_WARP_Release-x64.msi'
  )
  foreach ($u in $fallbacks) {
    try {
      $head = Invoke-WebRequest -Method Head -Uri $u -UseBasicParsing -TimeoutSec 15
      if ($head.StatusCode -ge 200 -and $head.StatusCode -lt 400) { return $u }
    } catch {}
  }
  return $null
}

function Install-Warp($msiPath) {
  Write-Info 'Installing Cloudflare WARP (silent)...'
  $args = "/i `"$msiPath`" /quiet /qn /norestart"
  $p = Start-Process msiexec.exe -ArgumentList $args -PassThru -Wait -WindowStyle Hidden
  if ($p.ExitCode -ne 0) {
    Write-Err "MSI installer exit code: $($p.ExitCode)"
    return $false
  }
  return $true
}

# Main
if (-not (Test-IsAdmin)) { Ensure-Admin }

if (-not $ForceReinstall) {
  $existing = Get-WarpCliPath
  if ($existing) {
    Write-Ok "Cloudflare WARP is already installed: $existing"
    exit 0
  }
}

Write-Info 'Cloudflare WARP not found. Downloading installer...'
$url = Get-WarpMsiUrl
if (-not $url) {
  Write-Err 'Failed to resolve MSI download URL.'
  exit 2
}

$tmp = Join-Path $env:TEMP 'warp-installer.msi'
try {
  Invoke-WebRequest -Uri $url -OutFile $tmp -UseBasicParsing -TimeoutSec 600
} catch {
  Write-Err "Download failed: $($_.Exception.Message)"
  exit 2
}

if (-not (Test-Path $tmp)) {
  Write-Err 'Downloaded file missing.'
  exit 2
}

if (-not (Install-Warp -msiPath $tmp)) {
  exit 1
}

Remove-Item $tmp -Force -ErrorAction SilentlyContinue

$path = Get-WarpCliPath
if ($path) {
  Write-Ok "Cloudflare WARP installed: $path"
  exit 0
}

Write-Err 'Installation completed but warp-cli not found.'
exit 1




