@echo off
setlocal EnableDelayedExpansion

set SCRIPT_DIR=%~dp0
set PROJECT_ROOT=%SCRIPT_DIR%..
set SYNC_SCRIPT=%SCRIPT_DIR%sync-game-config-from-spreadsheet.py
set BUNDLED_PY=%USERPROFILE%\.cache\codex-runtimes\codex-primary-runtime\dependencies\python\python.exe

where py >nul 2>nul
if not errorlevel 1 (
  py -3 "%SYNC_SCRIPT%" %*
  exit /b !ERRORLEVEL!
)

where python >nul 2>nul
if not errorlevel 1 (
  python "%SYNC_SCRIPT%" %*
  exit /b !ERRORLEVEL!
)

if exist "%BUNDLED_PY%" (
  "%BUNDLED_PY%" "%SYNC_SCRIPT%" %*
  exit /b !ERRORLEVEL!
)

echo Python was not found. Install Python 3 or run this inside Codex with the bundled runtime available.
exit /b 1
