import os
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    app_name: str = "Catalyst OS Backend"
    environment: str = os.getenv("ENVIRONMENT", "development")
    port: int = 8000
    gemini_api_key: str = os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY", "")
    database_url: str = os.getenv("DATABASE_URL", "postgresql://user:pass@localhost:5432/db")
    vault_enabled: bool = os.getenv("VAULT_ENABLED", "false").lower() in ("true", "1", "yes")
    vault_required: bool = os.getenv("VAULT_REQUIRED", "false").lower() in ("true", "1", "yes")
    vault_addr: str = os.getenv("VAULT_ADDR", "http://localhost:8200")
    vault_token: str = os.getenv("VAULT_TOKEN", "root")
    mcp_enabled: bool = True


    model_config = SettingsConfigDict(
        env_file=(".env", "../.env", "../../.env"),
        env_file_encoding="utf-8",
        extra="ignore"
    )

settings = Settings()
