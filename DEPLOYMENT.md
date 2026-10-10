# 🚀 CatalystOS — Comprehensive Production Deployment Guide

This document provides complete, production-grade instructions to deploy **CatalystOS** across various cloud and on-premise environments.

---

## 🏗️ Architecture Overview

CatalystOS operates as a cohesive dual-service system:

```
                      ┌─────────────────────────────────────────┐
                      │    Internet / Client Requests           │
                      └────────────────────┬────────────────────┘
                                           │ (Port 80/443)
                                           ▼
                      ┌─────────────────────────────────────────┐
                      │    Nginx / Cloud Load Balancer (SSL)    │
                      └────────────────────┬────────────────────┘
                                           │
                    ┌──────────────────────┴──────────────────────┐
                    │ (Port 3000)                                 │ (Port 8000 via internal proxy)
                    ▼                                             ▼
  ┌───────────────────────────────────┐         ┌───────────────────────────────────┐
  │   CatalystOS Node.js Gateway       │◄───────►│    FastAPI Python AI Service      │
  │   • React 19 Frontend (Vite SPA)  │ Proxy   │    • Multi-Agent Executive Council│
  │   • Express REST & Voice APIs     │ /api/v1 │    • Google Gemini AI / Google ADK│
  │   • Prisma ORM & Auth Security    │         │    • LangGraph State Engine       │
  └─────────────────┬─────────────────┘         └─────────────────┬─────────────────┘
                    │                                             │
                    └──────────────────────┬──────────────────────┘
                                           ▼
                      ┌─────────────────────────────────────────┐
                      │  PostgreSQL 16 Database + pgvector      │
                      │  (Neon Cloud or Self-Hosted Container)  │
                      └─────────────────────────────────────────┘
```

---

## 🔑 Environment Variables Reference

Before deploying, create your `.env` file (or set environment variables in your cloud provider's dashboard). See `.env.example` for a complete template.

| Variable | Required | Description | Example / Recommended |
| :--- | :---: | :--- | :--- |
| `NODE_ENV` | **Yes** | Server environment mode | `production` |
| `PORT` | No | Node server listening port | `3000` (defaults to 3000) |
| `DATABASE_URL` | **Yes** | Pooled PostgreSQL connection string | `postgresql://user:pass@host/db?sslmode=require&pgbouncer=true` |
| `DIRECT_URL` | **Yes** | Direct unpooled PostgreSQL connection (for migrations) | `postgresql://user:pass@host/db?sslmode=require` |
| `JWT_SECRET` | **Yes** | 256-bit secret for signing native authentication tokens | Generate via `openssl rand -hex 32` |
| `FASTAPI_URL` | **Yes** | Internal address of the Python FastAPI service | `http://fastapi-ai:8000` (Docker) or `http://127.0.0.1:8000` |
| `GEMINI_API_KEY` | **Yes** | Google Gemini API Key for multi-agent reasoning | `AIzaSy...` |
| `GEMINI_MODEL` | No | Default Gemini model identifier | `gemini-2.5-flash` |
| `DEEPGRAM_API_KEY` | No | Deepgram API key for speech-to-text / voice studio | `9be0b...` |
| `AWS_ENDPOINT_URL_S3` | No | S3-compatible storage endpoint (Neon Storage / Cloudflare R2 / AWS) | `https://...storage.neon.tech` |
| `AWS_ACCESS_KEY_ID` | No | S3 access key | `nak_live_...` |
| `AWS_SECRET_ACCESS_KEY`| No | S3 secret key | `nsk_live_...` |
| `AWS_REGION` | No | S3 region | `us-east-2` |
| `AWS_S3_BUCKET` | No | S3 storage bucket name | `catalyst-documents` |
| `STRICT_SECURITY` | No | Enforces hard abort on default secrets in production | `true` |

---

## 🗄️ Step 0: Database Migration & Setup

Before starting the application, ensure the PostgreSQL database schema is applied.

### Option A: Using Neon Serverless PostgreSQL (Recommended)
1. Create a free project on [Neon.tech](https://neon.tech).
2. Copy the **Pooled Connection String** to `DATABASE_URL` and **Direct Connection String** to `DIRECT_URL`.
3. In your terminal, run:
```bash
npm run db:generate
npm run db:migrate
```
*(On Windows: you can also double-click `scripts\deploy-migrate.bat`)*

### Option B: Using Self-Hosted Docker PostgreSQL with pgvector
The included `docker-compose.yml` mounts `prisma/migrations/init_pgvector.sql` to auto-enable the `pgvector` extension when the container initializes. Once the container starts:
```bash
docker compose exec node-gateway npx prisma db push
```

---

## 🚢 Deployment Method 1: Docker Compose (VPS / Single Server)

Recommended for **DigitalOcean Droplets, Hetzner, AWS EC2, Linode, or any Ubuntu/Debian server**.

### 1.1 Quick Start (Development & Local Testing)
```bash
# Clone the repository
git clone https://github.com/siddharthg-7/Catalyst-os.git
cd Catalyst-os

# Create and configure environment variables
cp .env.example .env
nano .env  # Add your GEMINI_API_KEY, DATABASE_URL, and a random JWT_SECRET

# Start all 3 services (Node Gateway, FastAPI AI, PostgreSQL)
docker compose up -d --build

# View logs
docker compose logs -f
```
Your application will be live at:
- **CatalystOS Web App & APIs**: `http://localhost:3000`
- **FastAPI Documentation**: `http://localhost:8000/docs`
- **Health Check**: `http://localhost:3000/health`

---

### 1.2 Production Setup with Nginx & SSL (`docker-compose.prod.yml`)
For a public domain with reverse proxy caching and SSL:

```bash
# Start with production compose configuration
docker compose -f docker-compose.prod.yml up -d --build
```

#### Configuring Let's Encrypt SSL with Certbot
On your Ubuntu server:
```bash
sudo apt update && sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d yourdomain.com
```

#### Systemd Auto-Start on System Boot
Create `/etc/systemd/system/catalyst.service`:
```ini
[Unit]
Description=CatalystOS Docker Services
Requires=docker.service
After=docker.service

[Service]
Type=oneshot
RemainAfterExit=yes
WorkingDirectory=/opt/catalyst-os
ExecStart=/usr/bin/docker compose -f docker-compose.prod.yml up -d
ExecStop=/usr/bin/docker compose -f docker-compose.prod.yml down

[Install]
WantedBy=multi-user.target
```
Enable and start the service:
```bash
sudo systemctl daemon-reload
sudo systemctl enable catalyst
sudo systemctl start catalyst
```

---

## ☁️ Deployment Method 2: Render (One-Click Blueprint)

The repository includes a ready-to-deploy [`render.yaml`](file:///c:/project-self-1/catalyst-os/render.yaml) blueprint.

1. Push your repository to **GitHub** or **GitLab**.
2. Log into the [Render Dashboard](https://dashboard.render.com).
3. Click **New +** ➡️ **Blueprint**.
4. Select your `Catalyst-os` repository. Render will automatically detect [`render.yaml`](file:///c:/project-self-1/catalyst-os/render.yaml).
5. In the configuration screen, supply your sensitive keys:
   - `DATABASE_URL` (Neon or Render Postgres connection string)
   - `DIRECT_URL` (Direct Postgres connection string)
   - `GEMINI_API_KEY`
   - `DEEPGRAM_API_KEY`
6. Click **Apply**.
   Render will automatically build and deploy:
   - `catalyst-node-gateway` (Web Service on port 3000 with public URL)
   - `catalyst-fastapi` (AI Microservice on port 8000 connected via private internal network)

---

## 🚂 Deployment Method 3: Railway

Railway can deploy both services effortlessly:

1. Go to [Railway.app](https://railway.app) and create a **New Project**.
2. Choose **Deploy from GitHub repo** and select `Catalyst-os`.
3. Railway will pick up [`railway.json`](file:///c:/project-self-1/catalyst-os/railway.json) and [`Dockerfile`](file:///c:/project-self-1/catalyst-os/Dockerfile).
4. Add your environment variables in Railway's **Variables** tab:
   - `NODE_ENV=production`
   - `DATABASE_URL=<your-neon-or-railway-db-url>`
   - `DIRECT_URL=<your-neon-db-direct-url>`
   - `JWT_SECRET=<openssl-generated-secret>`
   - `GEMINI_API_KEY=<your-gemini-key>`
   - `FASTAPI_URL=<url-of-fastapi-service>`
5. Add a second service from the same repo for the Python backend:
   - In Settings, set **Root Directory** to `backend/py_service`.
   - Set **Dockerfile Path** to `backend/py_service/Dockerfile`.
   - Set **PORT** to `8000`.

---

## 🌩️ Deployment Method 4: Google Cloud Run (Serverless Containers)

The repository includes an automated deployment script in [`infra/cloudrun/deploy-cloudrun.sh`](file:///c:/project-self-1/catalyst-os/infra/cloudrun/deploy-cloudrun.sh).

### 4.1 Prerequisites
- [Google Cloud SDK (`gcloud`)](https://cloud.google.com/sdk/docs/install) installed and authenticated:
```bash
gcloud auth login
gcloud config set project YOUR_PROJECT_ID
```

### 4.2 Run the Automated Cloud Run Deploy Script
```bash
chmod +x infra/cloudrun/deploy-cloudrun.sh
./infra/cloudrun/deploy-cloudrun.sh
```

The script will:
1. Enable `run.googleapis.com` and Artifact Registry.
2. Build and deploy `catalyst-fastapi` to Cloud Run.
3. Automatically capture the deployed FastAPI URL.
4. Build and deploy `catalyst-node-gateway`, injecting `FASTAPI_URL` into its configuration.
5. Print out the public application URL with HTTPS enabled out of the box.

---

## 🖥️ Deployment Method 5: Direct Bare-Metal / VPS (PM2 + Systemd)

If you prefer to run directly on an Ubuntu/Debian server without Docker containers:

### 5.1 System Prerequisites
```bash
# Update and install Node.js 20, Python 3.11+, and build tools
sudo apt update && sudo apt install -y curl build-essential python3 python3-pip python3-venv git

# Install Node.js 20 LTS
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Install PM2 Process Manager
sudo npm install -g pm2
```

### 5.2 Build and Set Up CatalystOS
```bash
cd /opt
git clone https://github.com/siddharthg-7/Catalyst-os.git
cd Catalyst-os

# Configure Environment
cp .env.example .env
nano .env

# Install Node dependencies & Build Frontend + Bundled Gateway
npm ci
npm run db:generate
npm run db:migrate
npm run build

# Set up Python Virtual Environment for FastAPI
cd backend/py_service
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cd ../..
```

### 5.3 Launch with PM2
Create `ecosystem.config.cjs`:
```javascript
module.exports = {
  apps: [
    {
      name: 'catalyst-gateway',
      script: 'node',
      args: 'dist/server.cjs',
      env: {
        NODE_ENV: 'production',
        PORT: 3000
      }
    },
    {
      name: 'catalyst-fastapi',
      cwd: 'backend/py_service',
      script: '.venv/bin/uvicorn',
      args: 'app.main:app --host 0.0.0.0 --port 8000',
      env: {
        ENVIRONMENT: 'production'
      }
    }
  ]
};
```
Start both services and persist them across server reboots:
```bash
pm2 start ecosystem.config.cjs
pm2 save
pm2 startup
```

---

## ✅ Post-Deployment Verification & Health Checks

Once deployed, verify each layer using the built-in probes:

### 1. Liveness Probe
```bash
curl -I https://your-domain.com/health
```
**Expected Response:**
```json
HTTP/1.1 200 OK
{
  "status": "alive",
  "uptime": 124.5,
  "nodeVersion": "v20.x.x"
}
```

### 2. Readiness Probe
```bash
curl -I https://your-domain.com/ready
```
**Expected Response:**
```json
HTTP/1.1 200 OK
{
  "status": "ready",
  "databaseConnected": true,
  "geminiConfigured": true,
  "rateLimiterMode": "IN_MEMORY_SINGLE_INSTANCE",
  "environment": "production"
}
```

### 3. FastAPI Service Probe
```bash
curl http://your-internal-fastapi:8000/
```
**Expected Response:**
```json
{"status": "healthy", "service": "Catalyst OS Backend"}
```

---

## 🔒 Security & Hardening Checklist for Production

- [ ] **Cryptographic JWT Secret**: Ensure `JWT_SECRET` is set to a 256-bit random key (`openssl rand -hex 32`).
- [ ] **Strict Security Mode**: Set `STRICT_SECURITY=true` to guarantee no default keys can boot in production.
- [ ] **Database Connection Pooling**: Ensure `DATABASE_URL` connects through a PgBouncer / Neon pooler to prevent connection pool exhaustion.
- [ ] **SSL / TLS Termination**: Ensure HTTPS is enforced on port 443 with HSTS headers.
- [ ] **Rate Limiting**: Verify rate limiting headers on authentication endpoints (`/api/auth/login`, `/api/auth/register`).
- [ ] **CORS Configuration**: In production, restrict `FASTAPI_URL` and `APP_URL` to your production domain origins.
