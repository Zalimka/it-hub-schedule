@echo off
setlocal EnableExtensions
title IT Hub Schedule - Runner

cd /d "%~dp0"

echo Launching...
echo.

if exist "START_APP.cmd" (
  call "START_APP.cmd"
) else (
  echo [ERROR] START_APP.cmd not found.
  echo Current folder: %CD%
  echo.
  echo Files in this folder:
  dir /b
  pause
  exit /b 1
)

echo.
echo (This window is kept open so you can see errors.)
pause
