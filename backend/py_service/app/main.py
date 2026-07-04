import logging
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings
from app.routers import simulation
from app.services.vault_client import vault_client

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("main")

app = FastAPI(
    title=settings.app_name,
    version="1.0.0",
    description="Catalyst OS FastAPI AI Microservice (LangGraph Multi-Agent Engine, MCP Tools, HashiCorp Vault, pgvector RAG)"
)

# CORS middleware for Node.js API Gateway & React Frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount Routers
app.include_router(simulation.router)

@app.get("/health")
def health_check():
    secrets = vault_client.get_secret()
    return {
        "status": "healthy",
        "app": settings.app_name,
        "environment": settings.environment,
        "vault_connected": vault_client.client is not None,
        "vault_keys": list(secrets.keys()),
        "mcp_tools_active": True
    }

@app.get("/api/py/info")
def info():
    return {
        "service": "Catalyst OS Python FastAPI AI Engine",
        "tech_stack": {
            "ai_framework": "LangGraph / Multi-agent State Graph",
            "protocol": "Model Context Protocol (MCP)",
            "secrets": "HashiCorp Vault KV Engine",
            "database": "PostgreSQL + pgvector"
        }
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=settings.port, reload=True)
