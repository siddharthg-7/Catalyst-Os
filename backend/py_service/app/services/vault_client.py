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
        try:
            import hvac
            self.client = hvac.Client(url=self.vault_addr, token=self.vault_token)
            if self.client.is_authenticated():
                logger.info(f"Successfully authenticated with Vault at {self.vault_addr}")
            else:
                logger.warning("Vault authentication failed. Operating in fallback mode.")
                self.client = None
        except Exception as e:
            logger.warning(f"Could not connect to Vault instance ({str(e)}). Using local environment fallback.")
            self.client = None

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
