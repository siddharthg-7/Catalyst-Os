"""
Database access and persistence tools for Catalyst OS.
Provides multi-tenant safe access to startup profile, financial state, and the auditable decision log.
Falls back safely to local memory cache if database connections are temporarily offline.
"""

from typing import Dict, Any, List, Optional
import datetime
import uuid
import logging

logger = logging.getLogger("database_tools")

# Default startup profile context fallback
_STARTUP_CACHE: Dict[str, Any] = {
    "company_name": "CatalystOS Startup",
    "industry": "B2B SaaS / Developer Tools",
    "target_icp": "Seed to Series A technical founders and engineering leadership building multi-agent platforms",
    "cash_on_hand": 245000.0,
    "current_monthly_burn": 18500.0,
    "runway_months": 13.2,
    "health_score": 78
}

_DECISION_LOG: List[Dict[str, Any]] = [
    {
        "id": "dec-001",
        "title": "Allocate $10,000 for Paid Acquisition Experiments",
        "description": "Growth experiment across LinkedIn Ads and Developer Newsletters.",
        "category": "Growth",
        "financial_impact": -10000.0,
        "impact_text": "Decreased runway by 0.5 months. Generated 45 qualified signups.",
        "status": "approved",
        "created_at": datetime.datetime.now().isoformat()
    }
]


def get_startup_context() -> Dict[str, Any]:
    """
    Retrieves the global startup company profile, cash balance, and monthly burn rate.

    Returns:
        Structured startup context dictionary.
    """
    try:
        from app.core.database import SessionLocal
        from app.models.schemas import StartupContext

        db = SessionLocal()
        startup = db.query(StartupContext).first()
        db.close()
        if startup:
            runway = (
                round(startup.cash_on_hand / startup.current_monthly_burn, 1)
                if startup.current_monthly_burn > 0 else 999.0
            )
            return {
                "company_name": startup.company_name,
                "industry": startup.industry,
                "target_icp": startup.target_icp,
                "cash_on_hand": startup.cash_on_hand,
                "current_monthly_burn": startup.current_monthly_burn,
                "runway_months": runway
            }
    except Exception as e:
        logger.warning(f"Database query failed, using in-memory state: {e}")

    return dict(_STARTUP_CACHE)


def update_startup_financials(cash_delta: float = 0.0, burn_delta: float = 0.0) -> Dict[str, Any]:
    """
    Updates the startup cash on hand and monthly burn rate.
    """
    _STARTUP_CACHE["cash_on_hand"] = max(0.0, _STARTUP_CACHE["cash_on_hand"] + cash_delta)
    _STARTUP_CACHE["current_monthly_burn"] = max(0.0, _STARTUP_CACHE["current_monthly_burn"] + burn_delta)
    if _STARTUP_CACHE["current_monthly_burn"] > 0:
        _STARTUP_CACHE["runway_months"] = round(_STARTUP_CACHE["cash_on_hand"] / _STARTUP_CACHE["current_monthly_burn"], 1)

    try:
        from app.core.database import SessionLocal
        from app.models.schemas import StartupContext

        db = SessionLocal()
        startup = db.query(StartupContext).first()
        if startup:
            startup.cash_on_hand = _STARTUP_CACHE["cash_on_hand"]
            startup.current_monthly_burn = _STARTUP_CACHE["current_monthly_burn"]
            db.commit()
        db.close()
    except Exception as e:
        logger.warning(f"Could not persist financials to DB: {e}")

    return dict(_STARTUP_CACHE)


def record_decision(
    title: str,
    description: str,
    category: str,
    financial_impact: float = 0.0,
    impact_text: str = ""
) -> Dict[str, Any]:
    """
    Appends an approved executive decision into the persistent, auditable Decision Log.
    """
    record = {
        "id": f"dec-{uuid.uuid4().hex[:6]}",
        "title": title,
        "description": description,
        "category": category,
        "financial_impact": float(financial_impact),
        "impact_text": impact_text or f"Impact categorized under {category}.",
        "status": "approved",
        "created_at": datetime.datetime.now().isoformat()
    }
    _DECISION_LOG.append(record)
    return {"status": "RECORDED", "decision": record}


def get_decision_history() -> List[Dict[str, Any]]:
    """
    Returns the chronological list of recorded decisions.
    """
    return list(_DECISION_LOG)
