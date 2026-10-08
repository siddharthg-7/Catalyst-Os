import logging
from typing import Dict, Any
from fastapi import APIRouter, HTTPException
from app.langgraph.graph import langgraph_engine
from app.mcp.mcp_tools import mcp_registry

logger = logging.getLogger("simulation_router")
router = APIRouter(prefix="/api/py", tags=["simulation"])

@router.post("/simulate")
async def run_simulation(payload: Dict[str, Any]):
    """
    Triggers the LangGraph multi-agent orchestration graph for an initiative payload.
    """
    try:
        logger.info(f"Received simulation payload: {payload.get('title')}")
        result = langgraph_engine.run_simulation(payload)
        return result
    except Exception as e:
        logger.error(f"Error running LangGraph simulation: {str(e)}")
        raise HTTPException(status_code=500, detail=f"LangGraph simulation error: {str(e)}")

@router.get("/mcp/tools")
async def list_mcp_tools():
    """
    Returns list of registered Model Context Protocol (MCP) tools.
    """
    return {
        "status": "active",
        "mcp_version": "1.0.0",
        "tools": mcp_registry.list_tools()
    }

@router.post("/mcp/execute")
async def execute_mcp_tool(payload: Dict[str, Any]):
    """
    Executes a specific MCP tool by name with arguments.
    """
    tool_name = payload.get("tool")
    args = payload.get("args", {})
    if not tool_name:
        raise HTTPException(status_code=400, detail="Missing 'tool' parameter")

    result = mcp_registry.execute_tool(tool_name, args)
    return result
