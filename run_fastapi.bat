@echo off
TITLE CatalystOS — FastAPI Python AI Microservice
COLOR 0D

echo ===================================================================
echo   🐍 CatalystOS — FastAPI Python LangGraph AI Microservice
echo ===================================================================
echo.

cd backend\py_service

where python >nul 2>nul
if %errorlevel% neq 0 (
    echo [WARNING] Python not found in PATH.
    echo Node.js gateway will use local fallback simulation mode.
    pause
    exit /b 1
)

echo [INFO] Installing Python requirements...
python -m pip install -r requirements.txt >nul 2>&1

echo.
echo [INFO] Starting FastAPI Uvicorn Server on http://localhost:8000...
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload

pause
