@echo off
TITLE FounderOS — Production Multi-Agent AI OS Launcher
COLOR 0A

echo ===================================================================
echo   🚀 FounderOS — Executive Multi-Agent AI Operating System
echo ===================================================================
echo.

:: Check Node.js installation
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] Node.js is not installed or not found in PATH.
    echo Please install Node.js from https://nodejs.org/ before running.
    pause
    exit /b 1
)

:: Check for .env file
if not exist .env (
    echo [INFO] .env file not found. Creating from .env.example...
    copy .env.example .env >nul
    echo [OK] .env file initialized.
)

:: Check for node_modules
if not exist node_modules (
    echo [INFO] Dependencies not installed. Running npm install...
    call npm install
    if %errorlevel% neq 0 (
        echo [ERROR] Failed to install dependencies.
        pause
        exit /b 1
    )
)

echo.
echo [INFO] Starting FounderOS Full-Stack Server on http://localhost:3000...
echo [INFO] Launching browser window...
echo.

:: Automatically open default web browser after 3 seconds
start "" http://localhost:3000

:: Run development server
call npm run dev

pause
