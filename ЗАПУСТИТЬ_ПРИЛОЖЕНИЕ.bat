@echo off
setlocal EnableExtensions

cd /d "%~dp0"

echo ========================================
echo   IT Hub Schedule - Launcher
echo ========================================
echo.

rem --- Node detection ---
where node.exe >nul 2>&1
if %errorlevel%==0 goto :NODE_OK

if defined NVM_SYMLINK (
  if exist "%NVM_SYMLINK%\node.exe" (
    set "PATH=%PATH%;%NVM_SYMLINK%"
    goto :NODE_OK
  )
)

set "NODE_CANDIDATE_1=%ProgramFiles%\nodejs"
set "NODE_CANDIDATE_2=%ProgramFiles(x86)%\nodejs"
set "NODE_CANDIDATE_3=%LocalAppData%\Programs\nodejs"

if exist "%NODE_CANDIDATE_1%\node.exe" (set "PATH=%PATH%;%NODE_CANDIDATE_1%" & goto :NODE_OK)
if exist "%NODE_CANDIDATE_2%\node.exe" (set "PATH=%PATH%;%NODE_CANDIDATE_2%" & goto :NODE_OK)
if exist "%NODE_CANDIDATE_3%\node.exe" (set "PATH=%PATH%;%NODE_CANDIDATE_3%" & goto :NODE_OK)

echo [ERROR] Node.js was not found.
echo Install Node.js (LTS) from: https://nodejs.org/
echo Then re-run this file.
pause
exit /b 1

:NODE_OK
where npm.cmd >nul 2>&1
if not %errorlevel%==0 (
  echo [ERROR] npm.cmd was not found. Reinstall Node.js (LTS).
  pause
  exit /b 1
)

if not exist "node_modules" (
  echo [INFO] Installing dependencies...
  call npm.cmd install
  if errorlevel 1 (
    echo [ERROR] Failed to install dependencies.
    pause
    exit /b 1
  )
)

netstat -an | findstr ":5173" >nul 2>&1
if %errorlevel%==0 (
  echo [INFO] Server already running on port 5173. Opening browser...
  start "" "http://localhost:5173"
  pause
  exit /b 0
)

echo [INFO] Starting dev server in a new window...
start "IT Hub Schedule - Dev Server" cmd /k "npm.cmd run dev"

timeout /t 5 /nobreak >nul
start "" "http://localhost:5173"

echo.
echo Done. To stop the server, close the "Dev Server" window.
pause
