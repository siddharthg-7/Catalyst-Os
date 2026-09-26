@echo off
TITLE CatalystOS — Docker Production Launcher
COLOR 0B

echo ===================================================================
echo   🚀 CatalystOS — Docker Full-Stack Launcher (Frontend + Backend)
echo ===================================================================
echo.

:: 1. Verify Docker CLI is installed
where docker >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] Docker is not installed or not found in PATH.
    echo Please install Docker Desktop from https://www.docker.com/products/docker-desktop/
    echo.
    pause
    exit /b 1
)

:: 2. Check if Docker Daemon is running
docker info >nul 2>nul
if %errorlevel% neq 0 (
    echo [WARN] Docker daemon is not running yet.
    if exist "C:\Program Files\Docker\Docker\Docker Desktop.exe" (
        echo [INFO] Launching Docker Desktop...
        start "" "C:\Program Files\Docker\Docker\Docker Desktop.exe"
        echo [INFO] Waiting for Docker daemon to initialize (this may take 20-30 seconds)...
        :WAIT_LOOP
        timeout /t 5 /nobreak >nul
        docker info >nul 2>nul
        if %errorlevel% equ 0 goto DOCKER_READY
        echo [INFO] Still waiting for Docker daemon...
        goto WAIT_LOOP
    ) else (
        echo [ERROR] Please start Docker Desktop manually and re-run this script.
        echo.
        pause
        exit /b 1
    )
)

:DOCKER_READY
echo [OK] Docker daemon is active and responsive.
echo.

:: 3. Ensure .env exists
if not exist .env (
    echo [INFO] .env file not found. Creating from .env.example...
    copy .env.example .env >nul
    echo [OK] Initialized .env configuration.
)

echo [INFO] Services starting:
echo   - Frontend + Node.js Gateway : http://localhost:3000
echo   - FastAPI Python AI Service   : http://localhost:8000 (Docs: /docs)
echo   - PostgreSQL (pgvector)       : localhost:5433
echo.

echo [INFO] Building and starting containers with Docker Compose...
docker compose up -d --build

echo.
echo [INFO] Waiting for CatalystOS to be responsive at http://localhost:3000...
:WAIT_HTTP
timeout /t 3 /nobreak >nul
curl -s -f -o nul http://localhost:3000
if %errorlevel% equ 0 goto HTTP_READY
echo [INFO] Still waiting for services to initialize...
goto WAIT_HTTP

:HTTP_READY
echo [OK] CatalystOS is online and ready!
echo [INFO] Opening CatalystOS in your default browser...
start "" http://localhost:3000
echo.
echo [INFO] Streaming live container logs (Press Ctrl+C to detach without stopping):
docker compose logs -f
