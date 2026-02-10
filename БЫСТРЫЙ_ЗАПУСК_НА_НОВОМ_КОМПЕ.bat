@echo off
chcp 65001 >nul
echo ========================================
echo   БЫСТРЫЙ ЗАПУСК ПРОЕКТА НА НОВОМ КОМПЬЮТЕРЕ
echo ========================================
echo.

echo Шаг 1: Проверка Node.js...
node --version >nul 2>&1
if errorlevel 1 (
    echo [ОШИБКА] Node.js не установлен!
    echo.
    echo Скачайте Node.js с https://nodejs.org/
    echo Установите LTS версию и запустите этот файл снова.
    pause
    exit /b 1
)
echo [OK] Node.js установлен
node --version
echo.

echo Шаг 2: Проверка Git...
git --version >nul 2>&1
if errorlevel 1 (
    echo [ОШИБКА] Git не установлен!
    echo.
    echo Скачайте Git с https://git-scm.com/download/win
    echo Установите и запустите этот файл снова.
    pause
    exit /b 1
)
echo [OK] Git установлен
git --version
echo.

echo Шаг 3: Клонирование проекта с GitHub...
if exist "it-hub-schedule" (
    echo [ПРЕДУПРЕЖДЕНИЕ] Папка it-hub-schedule уже существует!
    echo Пропускаю клонирование...
) else (
    git clone https://github.com/Zalimka/it-hub-schedule.git
    if errorlevel 1 (
        echo [ОШИБКА] Не удалось клонировать проект!
        echo Проверьте интернет-соединение и попробуйте снова.
        pause
        exit /b 1
    )
    echo [OK] Проект склонирован
)
echo.

echo Шаг 4: Переход в папку проекта...
cd it-hub-schedule
if errorlevel 1 (
    echo [ОШИБКА] Не удалось перейти в папку проекта!
    pause
    exit /b 1
)
echo [OK] В папке проекта
echo.

echo Шаг 5: Установка зависимостей...
if exist "node_modules" (
    echo [OK] Зависимости уже установлены
) else (
    echo Это может занять 1-2 минуты...
    call npm install
    if errorlevel 1 (
        echo [ОШИБКА] Не удалось установить зависимости!
        pause
        exit /b 1
    )
    echo [OK] Зависимости установлены
)
echo.

echo ========================================
echo   ВСЕ ГОТОВО!
echo ========================================
echo.
echo Запускаю проект...
echo.
echo После запуска откройте в браузере:
echo http://localhost:5173
echo.
echo Для остановки нажмите Ctrl+C
echo.
pause

call npm run dev

