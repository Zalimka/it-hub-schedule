# PowerShell скрипт для запуска IT Hub Schedule
# Использование: правый клик -> "Выполнить с помощью PowerShell"

$ErrorActionPreference = "Stop"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  IT Hub Schedule - Генератор расписания" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Переходим в папку скрипта
$scriptPath = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $scriptPath

# Добавляем Node.js в PATH
$nodePath = "C:\Program Files\nodejs"
if (Test-Path "$nodePath\node.exe") {
    $env:Path += ";$nodePath"
} else {
    Write-Host "[ОШИБКА] Node.js не найден в $nodePath" -ForegroundColor Red
    Write-Host "Установите Node.js: https://nodejs.org/" -ForegroundColor Yellow
    Read-Host "Нажмите Enter для выхода"
    exit 1
}

# Проверяем зависимости
if (-not (Test-Path "node_modules")) {
    Write-Host "[ИНФО] Устанавливаю зависимости..." -ForegroundColor Yellow
    & npm.cmd install
    if ($LASTEXITCODE -ne 0) {
        Write-Host "[ОШИБКА] Не удалось установить зависимости" -ForegroundColor Red
        Read-Host "Нажмите Enter для выхода"
        exit 1
    }
    Write-Host ""
}

# Проверяем, не запущен ли уже сервер
$portInUse = Get-NetTCPConnection -LocalPort 5173 -ErrorAction SilentlyContinue
if ($portInUse) {
    Write-Host "[ИНФО] Сервер уже запущен на порту 5173" -ForegroundColor Green
    Write-Host "Открываю браузер..." -ForegroundColor Yellow
    Start-Sleep -Seconds 1
    Start-Process "http://localhost:5173"
    Write-Host ""
    Write-Host "Готово! Приложение открыто в браузере." -ForegroundColor Green
    Write-Host "Чтобы остановить сервер, найдите процесс node.exe и завершите его." -ForegroundColor Yellow
    Read-Host "Нажмите Enter для выхода"
    exit 0
}

Write-Host "[ИНФО] Запускаю dev-сервер..." -ForegroundColor Yellow
Write-Host ""
Write-Host "Сервер будет запущен в новом окне." -ForegroundColor Cyan
Write-Host "Браузер откроется автоматически через 5 секунд..." -ForegroundColor Cyan
Write-Host ""
Write-Host "Чтобы остановить сервер, закройте окно с сервером." -ForegroundColor Yellow
Write-Host ""

# Запускаем сервер в новом окне PowerShell
$serverScript = @"
`$nodePath = 'C:\Program Files\nodejs'
if (Test-Path `"`$nodePath\node.exe`") { `$env:Path += `";`$nodePath`" }
Set-Location '$scriptPath'
npm.cmd run dev
Write-Host "`nНажмите любую клавишу для закрытия..." -ForegroundColor Yellow
`$null = `$Host.UI.RawUI.ReadKey(`"NoEcho,IncludeKeyDown`")
"@

$tempScript = [System.IO.Path]::GetTempFileName() + ".ps1"
$serverScript | Out-File -FilePath $tempScript -Encoding UTF8

Start-Process powershell.exe -ArgumentList "-NoExit", "-File", $tempScript

# Ждем 5 секунд
Write-Host "Ожидание запуска сервера..." -ForegroundColor Yellow
Start-Sleep -Seconds 5

# Открываем браузер
Write-Host "Открываю браузер..." -ForegroundColor Green
Start-Process "http://localhost:5173"

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "  Готово! Приложение открыто в браузере." -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "Сервер работает в отдельном окне PowerShell." -ForegroundColor Cyan
Write-Host "Чтобы остановить сервер, закройте окно с сервером." -ForegroundColor Yellow
Write-Host ""
Read-Host "Нажмите Enter для выхода"

