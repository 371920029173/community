#requires -version 5.1
<#
  download-warp.ps1
  ------------------
  适用于 Windows 7/8/10/11 的 Cloudflare WARP 客户端离线下载脚本。

  默认根据当前操作系统架构（32/64 位）自动选择对应的 MSI 安装包，
  也可以通过参数手动指定架构并设置输出目录。

  用法示例：
    # 自动检测架构，下载到当前目录
    powershell -NoProfile -ExecutionPolicy Bypass -File .\download-warp.ps1

    # 指定 64 位安装包，输出到 D:\Installers
    powershell -NoProfile -ExecutionPolicy Bypass -File .\download-warp.ps1 -Architecture x64 -OutputDir D:\Installers

  参数说明：
    -Architecture  (auto|x64|x86)  默认 auto
    -OutputDir     指定保存目录，默认脚本所在目录
    -Force         若文件已存在则覆盖

  下载链接采用 Cloudflare 官方 CDN，多重回退；下载成功后会显示 SHA256，方便校验完整性。
#>

[CmdletBinding()]
param(
  [ValidateSet('auto','x64','x86')]
  [string]$Architecture = 'auto',

  [string]$OutputDir = (Get-Location).Path,

  [switch]$Force
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

function Write-Info($msg)  { Write-Host "[INFO]  $msg"  -ForegroundColor Cyan }
function Write-Ok($msg)    { Write-Host "[ OK ]  $msg"  -ForegroundColor Green }
function Write-Warn($msg)  { Write-Host "[WARN] $msg"  -ForegroundColor Yellow }
function Write-Err($msg)   { Write-Host "[FAIL] $msg"  -ForegroundColor Red }

function Resolve-Architecture {
  param([string]$Arch)
  if ($Arch -eq 'auto') {
    return if ([Environment]::Is64BitOperatingSystem) { 'x64' } else { 'x86' }
  }
  return $Arch
}

function Get-DownloadUrls {
  param([string]$Arch)

  $fileName = if ($Arch -eq 'x86') {
    'Cloudflare_WARP_Release-x86.msi'
  } else {
    'Cloudflare_WARP_Release-x64.msi'
  }

  return @(
    "https://downloads.cloudflareclient.com/v1/download/windows/installers/$fileName",
    "https://downloads.cloudflareclient.com/windows/$fileName",
    "https://1.1.1.1/$fileName"
  )
}

function Download-File {
  param(
    [string[]]$Urls,
    [string]$Destination
  )

  foreach ($url in $Urls) {
    try {
      Write-Info "尝试下载: $url"
      Invoke-WebRequest -Uri $url -OutFile $Destination -UseBasicParsing -TimeoutSec 120
      Write-Ok "下载成功: $url"
      return $true
    } catch {
      Write-Warn "下载失败: $url -> $($_.Exception.Message)"
    }
  }
  return $false
}

function Show-Hash {
  param([string]$Path)
  try {
    $hash = Get-FileHash -Path $Path -Algorithm SHA256
    Write-Info "文件 SHA256: $($hash.Hash)"
  } catch {
    Write-Warn "计算 SHA256 失败: $($_.Exception.Message)"
  }
}

# --- 主流程 ---

$resolvedArch = Resolve-Architecture -Arch $Architecture
Write-Info "当前操作系统架构: $([Environment]::Is64BitOperatingSystem ? '64 位' : '32 位')"
Write-Info "将下载: $resolvedArch 版本"

if (-not (Test-Path $OutputDir)) {
  Write-Info "输出目录不存在，正在创建: $OutputDir"
  New-Item -ItemType Directory -Path $OutputDir | Out-Null
}

$fileName = if ($resolvedArch -eq 'x86') { 'Cloudflare_WARP_Release-x86.msi' } else { 'Cloudflare_WARP_Release-x64.msi' }
$destinationPath = Join-Path $OutputDir $fileName

if ((Test-Path $destinationPath) -and -not $Force) {
  Write-Warn "文件已存在: $destinationPath"
  Write-Warn "若需重新下载，请使用 -Force 参数或先删除文件。"
  exit 0
}

$urls = Get-DownloadUrls -Arch $resolvedArch
$success = Download-File -Urls $urls -Destination $destinationPath

if (-not $success) {
  Write-Err "所有下载源均失败，请检查网络或稍后重试。"
  exit 1
}

Show-Hash -Path $destinationPath
Write-Ok "WARP 安装包已保存到: $destinationPath"
exit 0




