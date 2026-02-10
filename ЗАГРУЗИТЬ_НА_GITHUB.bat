@echo off
chcp 65001 >nul
echo ========================================
echo   ЗАГРУЗКА ПРОЕКТА НА GITHUB
echo ========================================
echo.

echo Шаг 1: Проверка Git...
git --version >nul 2>&1
if errorlevel 1 (
    echo [ОШИБКА] Git не установлен!
    echo Скачайте Git с https://git-scm.com/download/win
    pause
    exit /b 1
)
echo [OK] Git установлен
echo.

echo Шаг 2: Инициализация репозитория...
if exist .git (
    echo [OK] Git уже инициализирован
) else (
    git init
    echo [OK] Git инициализирован
)
echo.

echo Шаг 3: Добавление файлов...
git add .
echo [OK] Файлы добавлены
echo.

echo Шаг 4: Создание коммита...
git commit -m "feat: IT Hub Schedule Generator v1.0.0" >nul 2>&1
if errorlevel 1 (
    echo [ПРЕДУПРЕЖДЕНИЕ] Коммит не создан (возможно, нет изменений)
) else (
    echo [OK] Коммит создан
)
echo.

echo Шаг 5: Настройка ветки...
git branch -M main
echo [OK] Ветка настроена
echo.

echo ========================================
echo   ВАЖНО: Следующие шаги вручную!
echo ========================================
echo.
echo 1. Создайте репозиторий на GitHub:
echo    - Откройте https://github.com
echo    - Нажмите "New repository"
echo    - Название: it-hub-schedule
echo    - НЕ ставьте галочки на README/gitignore/license
echo    - Нажмите "Create repository"
echo.
echo 2. Скопируйте URL вашего репозитория
echo    (будет показан на странице после создания)
echo.
echo 3. Выполните команды:
echo    git remote add origin https://github.com/ВАШ-USERNAME/it-hub-schedule.git
echo    git push -u origin main
echo.
echo    (Замените ВАШ-USERNAME на ваш username с GitHub!)
echo.
echo ========================================
echo.
echo Готово! Теперь выполните шаги выше.
pause

