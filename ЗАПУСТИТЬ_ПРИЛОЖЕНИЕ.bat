@echo off
setlocal EnableExtensions

cd /d "%~dp0"

if exist "install_and_run.cmd" (
  call "install_and_run.cmd"
) else (
  echo [ERROR] File install_and_run.cmd not found in:
  echo %CD%
  echo.
  pause
)
