@echo off
setlocal EnableExtensions
title IT Hub Schedule - run

rem Переходим в папку проекта (где лежит этот файл)
cd /d "%~dp0"

echo ========================================
echo   IT Hub Schedule - run_app.cmd
echo ========================================
echo.

rem 1. Проверяем, что node/npm видны в PATH
where node.exe >nul 2>nul
if errorlevel 1 (
  echo [ERROR] Node.js (node.exe) не найден в PATH.
  echo Установите Node.js LTS с https://nodejs.org/ и перезапустите это окно.
  echo.
  pause
  exit /b 1
)

where npm.cmd >nul 2>nul
if errorlevel 1 (
  echo [ERROR] npm.cmd не найден. Похоже, Node.js установлен некорректно.
  echo Переустановите Node.js LTS с https://nodejs.org/ и перезапустите это окно.
  echo.
  pause
  exit /b 1
)

rem 2. Устанавливаем зависимости только если ещё нет node_modules
if not exist "node_modules" (
  echo [INFO] Устанавливаю зависимости (npm install)...
  npm.cmd install
  if errorlevel 1 (
    echo.
    echo [ERROR] npm install завершился с ошибкой.
    echo Скопируйте сообщение выше и отправьте его мне.
    echo.
    pause
    exit /b 1
  )
  echo.
)

rem 3. Запускаем dev-сервер в этом же окне
echo [INFO] Запускаю dev-сервер (npm run dev)...
echo Откройте в браузере: http://localhost:5173
echo.

npm.cmd run dev

echo.
echo Сервер остановлен (вы закрыли окно или нажали Ctrl+C).
pause

