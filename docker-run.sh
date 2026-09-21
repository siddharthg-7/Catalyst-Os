#!/usr/bin/env bash
set -e

echo "==================================================================="
echo "  🚀 CatalystOS — Docker Full-Stack Launcher (Frontend + Backend)"
echo "==================================================================="
echo ""

# Check Docker
if ! command -v docker &> /dev/null; then
    echo "[ERROR] Docker is not installed or not in PATH."
    exit 1
fi

# Ensure .env exists
if [ ! -f .env ]; then
    echo "[INFO] .env not found. Copying from .env.example..."
    cp .env.example .env
fi

echo "[INFO] Starting all services:"
echo "  - Frontend + Node.js Gateway : http://localhost:3000"
echo "  - FastAPI Python AI Service   : http://localhost:8000"
echo "  - PostgreSQL (pgvector)       : localhost:5433"
echo ""

docker compose up --build
