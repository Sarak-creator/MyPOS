@echo off
chcp 65001 >nul
echo ========================================================
echo   Anachak POS - Auto Push to GitHub
echo ========================================================
echo.

git status --short

echo.
echo [1/3] Staging all changes...
git add -A

set msg=%*
if "%msg%"=="" (
    set msg=auto update: %date% %time%
)

echo [2/3] Committing changes ("%msg%")...
git commit -m "%msg%"

echo.
echo [3/3] Pushing to GitHub (origin main)...
git push origin main

echo.
echo ========================================================
echo   PUSH COMPLETED!
echo ========================================================
pause
