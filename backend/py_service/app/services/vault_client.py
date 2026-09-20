import os
import logging
from typing import Dict, Any, Optional
from app.config import settings

logger = logging.getLogger("vault_client")

class VaultClient:
    """
    HashiCorp Vault Client for retrieving application secrets securely.
    Supports HTTP REST API and hvac driver with local fallback.
    """
    def __init__(self, vault_addr: Optional[str] = None, vault_token: Optional[str] = None):
        self.vault_addr = vault_addr or settings.vault_addr
        self.vault_token = vault_token or settings.vault_token
        self.client = None
        self._init_client()

    def _init_client(self):
        # 1. Local development fallback when Vault is disabled
        if not settings.vault_enabled:
            logger.info("Using local environment secrets; Vault disabled for local development.")
            self.client = None
            return

        # 2. When Vault is enabled, attempt connection
        try:
            import hvac
            self.client = hvac.Client(url=self.vault_addr, token=self.vault_token)
            if self.client.is_authenticated():
                logger.info(f"Successfully authenticated with Vault at {self.vault_addr}")
            else:
                self._handle_vault_failure("Vault authentication failed (token invalid or revoked)")
        except Exception as e:
            self._handle_vault_failure(f"Could not connect to Vault at {self.vault_addr}: {str(e)}")

    def _handle_vault_failure(self, reason: str):
        self.client = None
        # In production or when strictly required, refuse to run with insecure fallback
        if settings.environment == "production" or settings.vault_required:
            raise RuntimeError(
                f"[SECURITY ERROR] HashiCorp Vault is required in production, but failed to connect: {reason}. "
                f"Refusing to fall back to unmanaged local secrets."
            )
        logger.warning(f"Vault enabled but unreachable ({reason}). Falling back to local environment secrets.")


    def get_secret(self, path: str = "secret/data/catalyst-os/config") -> Dict[str, Any]:
        """
        Fetches secret payload from Vault KV-v2 engine or returns environment fallback.
        """
        if self.client:
            try:
                response = self.client.secrets.kv.v2.read_secret_version(path=path)
                return response.get('data', {}).get('data', {})
            except Exception as e:
                logger.error(f"Error reading Vault secret at path {path}: {str(e)}")

        # Fallback to current process environment variables
        return {
            "GEMINI_API_KEY": settings.gemini_api_key,
            "DATABASE_URL": settings.database_url,
            "VAULT_ADDR": settings.vault_addr,
        }

vault_client = VaultClient()
