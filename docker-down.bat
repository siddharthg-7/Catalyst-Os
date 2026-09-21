@echo off
TITLE CatalystOS — Stop Docker Services
COLOR 0C

echo ===================================================================
echo   🛑 CatalystOS — Stopping All Docker Containers
echo ===================================================================
echo.

docker compose down

echo.
echo [OK] All CatalystOS containers stopped successfully.
pause
