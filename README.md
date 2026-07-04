# 🚀 Catalyst OS — Executive Multi-Agent AI Operating System

Catalyst OS is a production-ready AI Operating System designed for startup founders, bringing together an **Executive AI Council** (CEO, CFO, Talent, Growth, Operations, Legal, ConflictResolver, ApprovalManager) to automate startup workflows, simulate strategic decisions, and manage corporate growth.

---

## 🛠 Tech Stack Overview

- **Frontend**: React 19 + TypeScript + Vite + Tailwind CSS v4 + Framer Motion + Recharts
- **Backend API Gateway**: Node.js + Express + TypeScript + Prisma ORM
- **AI Microservice**: FastAPI (Python) + LangGraph Multi-Agent Engine + Model Context Protocol (MCP) Tools
- **Database**: PostgreSQL with native `pgvector` extension for semantic vector search
- **Infrastructure**: Production Kubernetes manifests (`infra/k8s/`) + HashiCorp Vault secret manager

---

## ⚡ How to Run Catalyst OS

### Option 1: Single-Click Batch Launcher (Windows)
Double-click `run.bat` or run in PowerShell / CMD:
```cmd
run.bat
```
> This script automatically checks Node.js, installs missing dependencies, initializes `.env`, launches the full-stack server on `http://localhost:3000`, and opens your web browser!

---

### Option 2: Standard Command Line (Cross-Platform)

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Configure environment variables**:
   Ensure `.env` contains your settings (or use defaults in `.env.example`). Set `GEMINI_API_KEY` for live LLM inference:
   ```env
   GEMINI_API_KEY=your_gemini_api_key_here
   ```

3. **Start the application**:
   ```bash
   npm run dev
   ```

4. Open your browser and navigate to:
   ```text
   http://localhost:3000
   ```

---

### Option 3: Python FastAPI AI Microservice (Optional)
To run the Python FastAPI LangGraph microservice alongside Node:
```cmd
run_fastapi.bat
```
or manually:
```bash
cd backend/py_service
pip install -r requirements.txt
python -m uvicorn app.main:app --port 8000 --reload
```

---

## 🔑 Demo Account Credentials

Use these pre-configured accounts to sign in immediately:
- **Founder**: `founder@founder.os` / `password123`
- **Executive**: `exec@founder.os` / `password123`
- **Admin**: `admin@founder.os` / `password123`

---

## 📜 Milestone 1 Verification Checklist

- [x] Project runs successfully (`npm run dev` / `run.bat`)
- [x] No TypeScript errors (`npx tsc --noEmit` verified with 0 errors)
- [x] Full PostgreSQL + pgvector Prisma schema and migrations configured
- [x] JWT Authentication & User Role authorization (Founder, Executive, Admin)
- [x] Smart Onboarding pathways (Existing Startup & New Startup)
- [x] Executive Dashboard, Founder Command Box, Approval Queue & Decision Ledger
- [x] Scenario Simulator, Risk Prediction Engine, Daily Brief & Meeting Notes Extractor
- [x] Kubernetes K8s manifests & HashiCorp Vault secrets management
