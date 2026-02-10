@echo off
setlocal EnableExtensions
title IT Hub Schedule - install and run

rem Go to project directory (where this file is located)
cd /d "%~dp0"

echo ========================================
echo   IT Hub Schedule - install_and_run.cmd
echo ========================================
echo.

rem 1. Check that Node.js and npm are available
where node.exe >nul 2>nul
if errorlevel 1 (
  echo [ERROR] Node.js (node.exe) not found in PATH.
  echo Please install Node.js LTS from https://nodejs.org/ and then run this file again.
  echo.
  pause
  exit /b 1
)

where npm.cmd >nul 2>nul
if errorlevel 1 (
  echo [ERROR] npm.cmd not found. Node.js seems to be installed incorrectly.
  echo Please reinstall Node.js LTS from https://nodejs.org/ and then run this file again.
  echo.
  pause
  exit /b 1
)

rem 2. Install dependencies (always safe to run)
echo [INFO] Installing npm dependencies (npm install)...
echo This may take a few minutes on first run.
echo.

npm.cmd install
if errorlevel 1 (
  echo.
  echo [ERROR] npm install failed. See the error above.
  echo Copy the text from this window and send it to the developer.
  echo.
  pause
  exit /b 1
)

echo.
echo [INFO] Starting dev server (npm run dev)...
echo Open this URL in your browser: http://localhost:5173
echo.

npm.cmd run dev

echo.
echo Dev server stopped (window was closed or Ctrl+C was pressed).
pause

