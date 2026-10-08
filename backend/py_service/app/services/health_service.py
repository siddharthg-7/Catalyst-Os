"""
Deterministic Startup Health Score Engine for Catalyst OS.
Computes objective health metrics across Finance, Growth, Hiring, and Operations.
Guarantees transparent, mathematically calculated scores with documented weights.
"""

from typing import Dict, Any
import datetime


def calculate_startup_health(
    cash_on_hand: float = 245000.0,
    monthly_burn: float = 18500.0,
    active_tasks: int = 3,
    pending_approvals: int = 1,
    team_headcount: int = 5,
    mrr_growth_rate: float = 15.0
) -> Dict[str, Any]:
    """
    Computes a deterministic health score from 0 to 100 based on quantifiable startup indicators.

    Weights:
    - Finance: 35%
    - Operations: 25%
    - Growth: 20%
    - Hiring / Talent: 20%
    """
    # 1. Finance Score (0-100)
    runway = cash_on_hand / monthly_burn if monthly_burn > 0 else 999.0
    if runway >= 18.0:
        fin_score = 95
    elif runway >= 12.0:
        fin_score = 85
    elif runway >= 6.0:
        fin_score = 70
    elif runway >= 3.0:
        fin_score = 45
    else:
        fin_score = 20

    # 2. Operations Score (0-100)
    # Fewer unreviewed blockers and balanced active tasks = higher execution velocity
    ops_penalty = min(40, pending_approvals * 10)
    ops_score = max(30, 95 - ops_penalty)

    # 3. Growth Score (0-100)
    # Based on MRR / MoM velocity
    if mrr_growth_rate >= 20.0:
        growth_score = 90
    elif mrr_growth_rate >= 10.0:
        growth_score = 78
    elif mrr_growth_rate > 0:
        growth_score = 65
    else:
        growth_score = 40

    # 4. Hiring / Team Score (0-100)
    # Balanced team size and clear ownership
    hiring_score = 75 if team_headcount >= 3 else 60

    # Weighted Overall Score
    overall_score = round(
        (fin_score * 0.35) +
        (ops_score * 0.25) +
        (growth_score * 0.20) +
        (hiring_score * 0.20)
    )

    return {
        "overall": overall_score,
        "finance": fin_score,
        "operations": ops_score,
        "growth": growth_score,
        "hiring": hiring_score,
        "runway_months": round(runway, 1),
        "scoring_version": "1.0",
        "calculated_at": datetime.datetime.now().isoformat(),
        "weights": {
            "finance": "35%",
            "operations": "25%",
            "growth": "20%",
            "hiring": "20%"
        },
        "verdict": "STRONG" if overall_score >= 80 else "STABLE" if overall_score >= 65 else "NEEDS_ATTENTION"
    }
