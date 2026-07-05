import os
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    app_name: str = "Catalyst OS Backend"
    environment: str = "development"
    port: int = 8000
    gemini_api_key: str = os.getenv("GEMINI_API_KEY", "")
    database_url: str = os.getenv("DATABASE_URL", "postgresql://user:pass@localhost:5432/db")
    vault_addr: str = "http://localhost:8200"
    vault_token: str = "root"
    mcp_enabled: bool = True

    model_config = SettingsConfigDict(
        env_file=(".env", "../.env", "../../.env"),
        env_file_encoding="utf-8",
        extra="ignore"
    )

settings = Settings()
