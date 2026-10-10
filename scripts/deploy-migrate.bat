@echo off
TITLE CatalystOS — Database Migration Runner
COLOR 0B

echo =================================================================
echo   📦 CatalystOS — Database Migration Runner
echo =================================================================
echo.

echo [1/3] Generating Prisma Client...
call npx prisma generate
if %errorlevel% neq 0 (
    echo [ERROR] Prisma generate failed.
    pause
    exit /b %errorlevel%
)

echo [2/3] Applying schema migrations to database...
call npx prisma db push --accept-data-loss
if %errorlevel% neq 0 (
    echo [ERROR] Prisma db push failed.
    pause
    exit /b %errorlevel%
)

echo.
echo [3/3] Database schema is up to date!
echo Optional: Run "npx tsx prisma/seed.ts" to seed initial data.
echo [OK] Migration complete.
