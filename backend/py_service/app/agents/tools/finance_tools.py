"""
Deterministic financial calculation tools for Catalyst OS.
CRITICAL: Financial calculations must NEVER be performed by the LLM.
All figures are computed deterministically via these Python functions.
"""

from typing import Dict, Any, List, Optional
import logging

logger = logging.getLogger("finance_tools")

# Standard benchmark compensation reference if market rate lookup is unavailable
BENCHMARK_SALARIES: Dict[str, float] = {
    "backend engineer": 130000.0,
    "frontend engineer": 120000.0,
    "fullstack engineer": 135000.0,
    "senior engineer": 160000.0,
    "lead engineer": 180000.0,
    "product manager": 130000.0,
    "growth marketer": 95000.0,
    "sales executive": 85000.0,
    "designer": 105000.0,
    "data scientist": 140000.0,
}


def calculate_runway(cash_on_hand: float, current_monthly_burn: float) -> Dict[str, Any]:
    """
    Deterministically computes the startup runway in months based on cash and burn rate.

    Args:
        cash_on_hand: Current total cash balance in USD.
        current_monthly_burn: Current net monthly burn rate in USD.

    Returns:
        Dictionary containing cash, burn, runway months, and status assessment.
    """
    if cash_on_hand is None or current_monthly_burn is None:
        return {"status": "DATA_MISSING", "error": "Both cash_on_hand and current_monthly_burn are required"}

    cash = float(cash_on_hand)
    burn = float(current_monthly_burn)

    if burn <= 0:
        runway_months = 999.0
        health_status = "PROFITABLE_OR_ZERO_BURN"
    else:
        runway_months = round(cash / burn, 1)
        if runway_months < 3.0:
            health_status = "CRITICAL_RUNWAY"
        elif runway_months < 6.0:
            health_status = "WARNING_LOW_RUNWAY"
        elif runway_months < 12.0:
            health_status = "MODERATE_RUNWAY"
        else:
            health_status = "HEALTHY_RUNWAY"

    return {
        "cash_on_hand": cash,
        "monthly_burn": burn,
        "runway_months": runway_months,
        "health_status": health_status,
        "is_critical": runway_months < 6.0
    }


def simulate_hiring_cost(
    role_title: str,
    number_of_hires: int,
    cash_on_hand: float,
    current_monthly_burn: float,
    annual_salary: Optional[float] = None
) -> Dict[str, Any]:
    """
    Deterministically calculates the financial runway impact of hiring one or more team members.

    Args:
        role_title: Title of the role being hired (e.g., 'backend engineer').
        number_of_hires: Quantity of headcount to add.
        cash_on_hand: Current cash balance in USD.
        current_monthly_burn: Current monthly burn rate in USD.
        annual_salary: Optional override for annual salary per person. If omitted, uses standard industry benchmarks.

    Returns:
        Structured breakdown showing salary, burn increase, old runway, new runway, and affordability verdict.
    """
    if cash_on_hand is None or current_monthly_burn is None:
        return {"status": "DATA_MISSING", "error": "Financial baseline data missing"}

    hires = max(1, int(number_of_hires))
    normalized_role = role_title.lower().strip()

    if annual_salary is not None and float(annual_salary) > 0:
        salary_per_hire = float(annual_salary)
    else:
        # Match benchmark or default to $120k
        salary_per_hire = 120000.0
        for title_key, bench_val in BENCHMARK_SALARIES.items():
            if title_key in normalized_role:
                salary_per_hire = bench_val
                break

    total_annual_cost = salary_per_hire * hires
    monthly_burn_increase = round(total_annual_cost / 12.0, 2)
    new_monthly_burn = round(current_monthly_burn + monthly_burn_increase, 2)

    current_runway = round(cash_on_hand / current_monthly_burn, 1) if current_monthly_burn > 0 else 999.0
    projected_runway = round(cash_on_hand / new_monthly_burn, 1) if new_monthly_burn > 0 else 999.0
    runway_decrease = round(max(0.0, current_runway - projected_runway), 1)

    # Affordability threshold: minimum 6 months projected runway
    can_afford = projected_runway >= 6.0

    return {
        "role_title": role_title,
        "number_of_hires": hires,
        "salary_per_hire": salary_per_hire,
        "monthly_burn_increase": monthly_burn_increase,
        "current_monthly_burn": current_monthly_burn,
        "new_monthly_burn": new_monthly_burn,
        "current_runway_months": current_runway,
        "projected_runway_months": projected_runway,
        "runway_decrease_months": runway_decrease,
        "can_afford": can_afford,
        "recommendation": "AFFORDABLE" if can_afford else "UNSUSTAINABLE_RUNWAY_RISK",
        "requires_approval": not can_afford or total_annual_cost > 100000.0
    }


def simulate_scenario(
    cash_on_hand: float,
    current_burn: float,
    hiring_roles: Optional[List[Dict[str, Any]]] = None,
    marketing_budget_change: float = 0.0,
    expected_mrr_growth: float = 0.0
) -> Dict[str, Any]:
    """
    Runs an exhaustive deterministic what-if scenario simulation.
    Combines hiring adjustments, marketing spend fluctuations, and revenue projections.
    """
    additional_monthly_burn = 0.0
    hiring_breakdown = []

    if hiring_roles:
        for item in hiring_roles:
            role = item.get("role", "Engineer")
            count = item.get("count", 1)
            salary = item.get("salary")
            calc = simulate_hiring_cost(role, count, cash_on_hand, current_burn, salary)
            additional_monthly_burn += calc["monthly_burn_increase"]
            hiring_breakdown.append(calc)

    additional_monthly_burn += float(marketing_budget_change)
    net_burn_change = additional_monthly_burn - float(expected_mrr_growth)
    projected_burn = max(1000.0, round(current_burn + net_burn_change, 2))

    current_runway = round(cash_on_hand / current_burn, 1) if current_burn > 0 else 999.0
    projected_runway = round(cash_on_hand / projected_burn, 1) if projected_burn > 0 else 999.0

    return {
        "current_state": {
            "cash_on_hand": cash_on_hand,
            "monthly_burn": current_burn,
            "runway_months": current_runway
        },
        "projected_state": {
            "monthly_burn": projected_burn,
            "runway_months": projected_runway,
            "burn_delta": round(projected_burn - current_burn, 2),
            "runway_delta": round(projected_runway - current_runway, 1)
        },
        "hiring_breakdown": hiring_breakdown,
        "recommendation": "PROCEED" if projected_runway >= 6.0 else "REVISE_OR_REDUCE_SCOPE"
    }
