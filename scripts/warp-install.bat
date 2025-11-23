@echo off
setlocal enabledelayedexpansion

REM Detect and install Cloudflare WARP using PowerShell helper
set PS_CMD=powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0warp-install.ps1"

%PS_CMD%
set ERR=%ERRORLEVEL%
if %ERR% EQU 0 (
  echo [OK] Cloudflare WARP is installed.
  exit /b 0
) else (
  echo [FAIL] Warp install script exited with code %ERR%.
  exit /b %ERR%
)



