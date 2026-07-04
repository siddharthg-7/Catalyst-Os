import os
from pydantic import BaseModel

class Settings(BaseModel):
    app_name: str = "Catalyst OS AI Microservice"
    environment: str = os.getenv("ENVIRONMENT", "development")
    port: int = int(os.getenv("PORT", "8000"))
    gemini_api_key: str = os.getenv("GEMINI_API_KEY", "")
    database_url: str = os.getenv("DATABASE_URL", "postgresql://postgres:postgres@localhost:5432/catalyst_os")
    vault_addr: str = os.getenv("VAULT_ADDR", "http://localhost:8200")
    vault_token: str = os.getenv("VAULT_TOKEN", "root")
    mcp_enabled: bool = True

settings = Settings()
