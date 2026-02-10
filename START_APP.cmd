@echo off
setlocal EnableExtensions
title IT Hub Schedule - Start

rem Always resolve absolute script directory (works even when called relatively)
set "SCRIPT_DIR="
for %%I in ("%~f0") do set "SCRIPT_DIR=%%~dpI"
if not defined SCRIPT_DIR (
  echo [ERROR] Could not determine script directory.
  pause
  exit /b 1
)
pushd "%SCRIPT_DIR%" >nul 2>&1
if not %errorlevel%==0 (
  echo [ERROR] Cannot switch to script directory:
  echo %SCRIPT_DIR%
  pause
  exit /b 1
)

set "LOG_FILE=%SCRIPT_DIR%start_app_debug.log"
> "%LOG_FILE%" echo START %DATE% %TIME%
>>"%LOG_FILE%" echo SCRIPT_DIR=%SCRIPT_DIR%
>>"%LOG_FILE%" echo CD=%CD%

echo ========================================
echo   IT Hub Schedule - Launcher
echo ========================================
echo.

rem --- Node detection ---
>>"%LOG_FILE%" echo STEP=NODE_DETECT_BEGIN
where node.exe >nul 2>nul
>>"%LOG_FILE%" echo STEP=AFTER_WHERE_NODE ERRORLEVEL=%ERRORLEVEL%
if not errorlevel 1 goto :NODE_OK

if not defined NVM_SYMLINK goto :NODE_CANDIDATES
if exist "%NVM_SYMLINK%\node.exe" goto :NODE_USE_NVM
goto :NODE_CANDIDATES

:NODE_USE_NVM
set "PATH=%PATH%;%NVM_SYMLINK%"
>>"%LOG_FILE%" echo STEP=NODE_FOUND_NVM
goto :NODE_OK

:NODE_CANDIDATES

set "NODE_CANDIDATE_1=%ProgramFiles%\nodejs"
set "NODE_CANDIDATE_2=%ProgramFiles(x86)%\nodejs"
set "NODE_CANDIDATE_3=%LocalAppData%\Programs\nodejs"

if exist "%NODE_CANDIDATE_1%\node.exe" goto :NODE_USE_CANDIDATE_1
if exist "%NODE_CANDIDATE_2%\node.exe" goto :NODE_USE_CANDIDATE_2
if exist "%NODE_CANDIDATE_3%\node.exe" goto :NODE_USE_CANDIDATE_3
goto :NODE_NOT_FOUND

:NODE_USE_CANDIDATE_1
set "PATH=%PATH%;%NODE_CANDIDATE_1%"
goto :NODE_OK

:NODE_USE_CANDIDATE_2
set "PATH=%PATH%;%NODE_CANDIDATE_2%"
goto :NODE_OK

:NODE_USE_CANDIDATE_3
set "PATH=%PATH%;%NODE_CANDIDATE_3%"
goto :NODE_OK

>>"%LOG_FILE%" echo STEP=NODE_NOT_FOUND
:NODE_NOT_FOUND
echo [ERROR] Node.js was not found.
echo Install Node.js (LTS) from: https://nodejs.org/
echo Then run START_APP.cmd again.
pause
exit /b 1

:NODE_OK
>>"%LOG_FILE%" echo STEP=NODE_OK_BEGIN
where npm.cmd >nul 2>nul
>>"%LOG_FILE%" echo STEP=AFTER_WHERE_NPM ERRORLEVEL=%ERRORLEVEL%
if errorlevel 1 goto :NPM_MISSING

>>"%LOG_FILE%" echo STEP=BEFORE_NODE_MODULES_CHECK
if exist "node_modules" goto :AFTER_INSTALL
echo [INFO] Installing dependencies...
>>"%LOG_FILE%" echo STEP=NPM_INSTALL_BEGIN
call npm.cmd install
>>"%LOG_FILE%" echo STEP=NPM_INSTALL_END ERRORLEVEL=%ERRORLEVEL%
if errorlevel 1 goto :NPM_INSTALL_FAILED

:AFTER_INSTALL

>>"%LOG_FILE%" echo STEP=CHECK_PORT_BEGIN
netstat -an | findstr ":5173" >nul 2>nul
>>"%LOG_FILE%" echo STEP=CHECK_PORT_END ERRORLEVEL=%ERRORLEVEL%
if %errorlevel%==0 (
  echo [INFO] Server already running on port 5173. Opening browser...
  start "" "http://localhost:5173"
  pause
  exit /b 0
)

echo [INFO] Starting dev server in this window...
echo Open: http://localhost:5173
>>"%LOG_FILE%" echo STEP=RUN_DEV_SERVER
echo.
call npm.cmd run dev

echo.
echo Dev server stopped (window was closed or Ctrl+C).
pause

goto :EOF

:NPM_MISSING
echo [ERROR] npm.cmd was not found. Reinstall Node.js (LTS).
pause
exit /b 1

:NPM_INSTALL_FAILED
echo [ERROR] Failed to install dependencies.
pause
exit /b 1

