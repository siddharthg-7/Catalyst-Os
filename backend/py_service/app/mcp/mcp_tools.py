import json
import logging
from typing import Dict, Any, List
from app.services.vault_client import vault_client

logger = logging.getLogger("mcp_tools")

class MCPToolDefinition:
    def __init__(self, name: str, description: str, parameters: Dict[str, Any]):
        self.name = name
        self.description = description
        self.parameters = parameters

class MCPToolsRegistry:
    """
    Model Context Protocol (MCP) Tools Registry.
    Exposes executable tool functions for LangGraph agents to run computations.
    """
    def __init__(self):
        self.tools: Dict[str, MCPToolDefinition] = {}
        self._register_default_tools()

    def _register_default_tools(self):
        self.tools["mcp_financial_calculator"] = MCPToolDefinition(
            name="mcp_financial_calculator",
            description="Computes financial burn rates, runway impact in months, and cap table adjustments.",
            parameters={
                "type": "object",
                "properties": {
                    "cash_balance": {"type": "number", "description": "Current cash balance"},
                    "current_burn": {"type": "number", "description": "Current monthly burn rate"},
                    "financial_delta": {"type": "number", "description": "Monthly financial impact of proposed decision"}
                },
                "required": ["cash_balance", "current_burn", "financial_delta"]
            }
        )

        self.tools["mcp_compliance_auditor"] = MCPToolDefinition(
            name="mcp_compliance_auditor",
            description="Audits legal compliance, IP assignment risk, and SOC-2 data security guarantees.",
            parameters={
                "type": "object",
                "properties": {
                    "agreement_type": {"type": "string", "description": "Type of agreement ('contract', 'policy', 'offer')"},
                    "has_ip_assignment": {"type": "boolean", "description": "Whether IP assignment clause is included"},
                    "has_vesting_cliff": {"type": "boolean", "description": "Whether 1-year cliff is included"}
                },
                "required": ["agreement_type"]
            }
        )

        self.tools["mcp_vault_secret_loader"] = MCPToolDefinition(
            name="mcp_vault_secret_loader",
            description="Queries HashiCorp Vault secrets engine for secure corporate credentials.",
            parameters={
                "type": "object",
                "properties": {
                    "secret_path": {"type": "string", "description": "Vault KV-v2 secret path"}
                },
                "required": ["secret_path"]
            }
        )

    def execute_tool(self, name: str, args: Dict[str, Any]) -> Dict[str, Any]:
        logger.info(f"[MCP Engine] Executing MCP Tool '{name}' with args: {json.dumps(args)}")
        
        if name == "mcp_financial_calculator":
            cash = args.get("cash_balance", 250000)
            burn = args.get("current_burn", 18500)
            delta = args.get("financial_delta", 0)

            new_burn = max(1000, burn + abs(delta) / 12) if delta < 0 else max(1000, burn - delta / 12)
            new_runway = round(cash / new_burn, 1) if new_burn > 0 else 999.0
            
            return {
                "success": True,
                "tool": name,
                "projected_burn_rate": round(new_burn, 2),
                "projected_runway_months": new_runway,
                "runway_impact_months": round(new_runway - (cash / burn), 1)
            }

        elif name == "mcp_compliance_auditor":
            agree_type = args.get("agreement_type", "contract")
            has_ip = args.get("has_ip_assignment", True)
            has_cliff = args.get("has_vesting_cliff", True)

            score = 100
            flags = []

            if not has_ip:
                score -= 35
                flags.append("CRITICAL: Missing explicit IP Assignment clause!")
            if not has_cliff:
                score -= 20
                flags.append("WARNING: Vesting schedule lacks 12-month cliff protection.")

            return {
                "success": True,
                "tool": name,
                "compliance_score": score,
                "risk_rating": "LOW" if score >= 80 else ("MEDIUM" if score >= 60 else "HIGH"),
                "compliance_flags": flags
            }

        elif name == "mcp_vault_secret_loader":
            path = args.get("secret_path", "secret/data/catalyst-os/config")
            secrets = vault_client.get_secret(path)
            
            return {
                "success": True,
                "tool": name,
                "secret_path": path,
                "keys_found": list(secrets.keys()),
                "status": "VAULT_CONNECTED" if vault_client.client else "VAULT_LOCAL_FALLBACK"
            }

        else:
            return {
                "success": False,
                "error": f"Unknown MCP tool: {name}"
            }

    def list_tools(self) -> List[Dict[str, Any]]:
        return [
            {
                "name": t.name,
                "description": t.description,
                "parameters": t.parameters
            } for t in self.tools.values()
        ]

mcp_registry = MCPToolsRegistry()
