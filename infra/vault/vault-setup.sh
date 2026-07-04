#!/usr/bin/env bash
# Catalyst OS HashiCorp Vault Initializer Script

set -e

VAULT_ADDR=${VAULT_ADDR:-"http://localhost:8200"}
VAULT_TOKEN=${VAULT_TOKEN:-"root"}

echo "🔒 Initializing HashiCorp Vault at ${VAULT_ADDR}..."

# Enable KV-v2 secret engine
curl --silent --request POST \
    --header "X-Vault-Token: ${VAULT_TOKEN}" \
    --data '{"type": "kv-v2"}' \
    "${VAULT_ADDR}/v1/sys/mounts/secret" || true

# Put default config secret
curl --silent --request POST \
    --header "X-Vault-Token: ${VAULT_TOKEN}" \
    --header "Content-Type: application/json" \
    --data '{
      "data": {
        "GEMINI_API_KEY": "'"${GEMINI_API_KEY}"'",
        "DATABASE_URL": "'"${DATABASE_URL}"'",
        "JWT_SECRET": "catalyst-os-production-vault-secret-key-2026",
        "ENVIRONMENT": "production"
      }
    }' \
    "${VAULT_ADDR}/v1/secret/data/catalyst-os/config"

echo "✅ HashiCorp Vault secret path 'secret/data/catalyst-os/config' successfully configured."
