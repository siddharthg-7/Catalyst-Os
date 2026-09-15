"""
Automated unit & integration test suite for Catalyst OS Google ADK pipeline.
Verifies mathematical determinism, agent configurations, and FastAPI v1 endpoints.
"""

import pytest
import os
import sys
from pathlib import Path

# Add py_service directory to sys.path
py_service_dir = Path(__file__).resolve().parent.parent
if str(py_service_dir) not in sys.path:
    sys.path.insert(0, str(py_service_dir))

from app.agents.tools.finance_tools import calculate_runway, simulate_hiring_cost, simulate_scenario
from app.services.health_service import calculate_startup_health
from app.agents.specialists.finance_agent import create_finance_agent
from app.agents.specialists.growth_agent import create_growth_agent
from app.agents.specialists.operations_agent import create_operations_agent
from app.agents.specialists.talent_agent import create_talent_agent
from app.agents.specialists.auditor_agent import create_auditor_agent
from app.agents.specialists.chief_of_staff import chief_pipeline
from fastapi.testclient import TestClient
from app.main import app


def test_calculate_runway_deterministic():
    """Verify runway calculation is mathematically exact."""
    res = calculate_runway(cash_on_hand=240000.0, current_monthly_burn=20000.0)
    assert res["runway_months"] == 12.0
    assert res["health_status"] == "HEALTHY_RUNWAY"
    assert res["is_critical"] is False

    # Low runway warning test
    res_low = calculate_runway(cash_on_hand=50000.0, current_monthly_burn=12000.0)
    assert res_low["runway_months"] == 4.2
    assert res_low["health_status"] == "WARNING_LOW_RUNWAY"
    assert res_low["is_critical"] is True


def test_simulate_hiring_cost_deterministic():
    """Verify hiring 2 engineers reduces runway accurately."""
    # 2 engineers at $130,000 each = $260,000/yr -> $21,666.67/mo
    # Initial burn: $20,000/mo, Cash: $240,000 -> Initial runway: 12.0 mos
    # New burn: $41,666.67/mo -> New runway: 240,000 / 41,666.67 = 5.76 mos
    res = simulate_hiring_cost(
        role_title="backend engineer",
        number_of_hires=2,
        cash_on_hand=240000.0,
        current_monthly_burn=20000.0,
        annual_salary=130000.0
    )
    assert res["number_of_hires"] == 2
    assert res["salary_per_hire"] == 130000.0
    assert res["current_runway_months"] == 12.0
    assert res["projected_runway_months"] == 5.8
    assert res["can_afford"] is False  # Projected runway < 6.0 months
    assert res["recommendation"] == "UNSUSTAINABLE_RUNWAY_RISK"
    assert res["requires_approval"] is True


def test_calculate_startup_health_deterministic():
    """Verify health score weights and boundary constraints."""
    res = calculate_startup_health(
        cash_on_hand=245000.0,
        monthly_burn=18500.0,
        active_tasks=3,
        pending_approvals=1
    )
    assert 0 <= res["overall"] <= 100
    assert res["scoring_version"] == "1.0"
    assert "finance" in res["weights"]
    assert "operations" in res["weights"]


def test_adk_agents_initialization():
    """Verify all Google ADK specialist agents construct cleanly."""
    fin = create_finance_agent()
    assert fin.name == "finance_agent"
    assert len(fin.tools) > 0

    gro = create_growth_agent()
    assert gro.name == "growth_agent"

    ops = create_operations_agent()
    assert ops.name == "operations_agent"

    tal = create_talent_agent()
    assert tal.name == "talent_agent"

    aud = create_auditor_agent()
    assert aud.name == "auditor_agent"


def test_fastapi_v1_endpoints():
    """Verify all standardized v1 REST endpoints return valid HTTP responses."""
    client = TestClient(app)

    # Health check
    res_health = client.get("/health")
    assert res_health.status_code == 200

    # Executive brief
    res_brief = client.get("/api/v1/brief")
    assert res_brief.status_code == 200
    brief_data = res_brief.json()
    assert "startup_health_score" in brief_data
    assert "today_priorities" in brief_data

    # Agents directory
    res_agents = client.get("/api/v1/agents")
    assert res_agents.status_code == 200
    assert len(res_agents.json()) >= 6

    # Health score
    res_score = client.get("/api/v1/health-score")
    assert res_score.status_code == 200
    assert "overall" in res_score.json()

    # Scenario simulate
    res_sim = client.post("/api/v1/scenarios/simulate", json={
        "cash_on_hand": 300000.0,
        "monthly_burn": 25000.0,
        "marketing_budget_change": 5000.0
    })
    assert res_sim.status_code == 200
    assert "projected_state" in res_sim.json()

    # Approvals list
    res_appr = client.get("/api/v1/approvals")
    assert res_appr.status_code == 200

    # Decisions list
    res_dec = client.get("/api/v1/decisions")
    assert res_dec.status_code == 200

    # Tasks list
    res_tasks = client.get("/api/v1/tasks")
    assert res_tasks.status_code == 200
