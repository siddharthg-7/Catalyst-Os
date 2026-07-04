# Catalyst OS Architecture: Startup Health Scoring Engine

This document outlines the backend architecture, mathematical formulas, data schemas, and multi-agent reasoning flow for the **Startup Health Scoring Engine**. It aligns with the mandated technology stack (React, Node/FastAPI, LangGraph/Multi-Agent, MCP Tools, PostgreSQL/pgvector).

---

## 1. System Topology & Stack Alignment

The Health Scoring Engine compiles real-time corporate telemetry, RAG knowledge vectors, and historic human decisions into a multidimensional health index.

```text
       [State / Database telemetry] ──► (PostgreSQL)
       [Semantic Vector Store]      ──► (pgvector)
                     │
                     ▼
       ┌─────────────────────────────┐
       │   AI LangGraph Orchestrator  │ ◄── [MCP Tools Gateway]
       │   - Finance Evaluator Node  │     (Database, Web, API)
       │   - Operations Audit Node   │
       │   - Growth Analyzer Node    │
       │   - Talent Score Node       │
       └─────────────┬───────────────┘
                     │
                     ▼
       ┌─────────────────────────────┐
       │     Scoring Engine Core     │
       │  (Fuzzy Weighted Consensus) │
       └─────────────┬───────────────┘
                     │
                     ▼
       [Unified Multi-Score JSON Output]
```

### Technology Stack Specifications
- **Frontend Presentation**: React Single Page Application utilizing Recharts and fluid Tailwind SVG gauges.
- **Backend Routing**: FastAPI (Python) or Node.js (TypeScript) hosting microservices.
- **AI Orchestration**: LangGraph (StateGraph orchestration) utilizing specialized multi-agent evaluators.
- **Context & Knowledge Sharing**: MCP (Model Context Protocol) tools connecting the LLM nodes with local context (system terminal, database, files).
- **Data Persistence**: PostgreSQL with the `pgvector` extension for semantic history mapping.

---

## 2. LangGraph Execution Topology

The engine models health tracking as a **StateGraph** with cyclic feedback. Agents analyze logs, compare metrics against standard startup survival benchmarks, and validate performance before calculating scores.

```python
# python representation of LangGraph Topology
from typing import Dict, List, TypedDict
from langgraph.graph import StateGraph, END

# Define shared execution state
class HealthEngineState(TypedDict):
    startup_id: str
    raw_metrics: Dict[str, any]
    decision_history: List[Dict[str, any]]
    vector_context: List[str]
    evaluations: Dict[str, Dict[str, any]] # Holds scores & explanations per department
    consensus_met: bool
    overall_health: float
    risk_level: str
    confidence: float

# Initialize StateGraph
workflow = StateGraph(HealthEngineState)

# Define Evaluation Nodes
workflow.add_node("finance_audit", run_finance_audit_agent)
workflow.add_node("talent_audit", run_talent_audit_agent)
workflow.add_node("growth_audit", run_growth_audit_agent)
workflow.add_node("ops_audit", run_operations_audit_agent)
workflow.add_node("consensus_engine", run_consensus_calculator)

# Define Graph Paths
workflow.set_entry_point("finance_audit")
workflow.add_conditional_edges(
    "consensus_engine",
    should_continue,
    {
        "re_evaluate": "finance_audit",
        "complete": END
    }
)
```

---

## 3. Mathematical Modeling & Metric Aggregation

Each sub-score is computed on a scale of **0 - 100** based on analytical weights and dynamic penalization variables:

### Finance Sub-Score ($S_{fin}$)
$$S_{fin} = w_1 \cdot \min\left(100, \frac{\text{Runway (Months)}}{12} \times 100\right) - w_2 \cdot (\text{Burn Velocity Change}) - \delta_{risk}$$
- Where $\delta_{risk}$ is a penalty factor applied if current cash drops below a 6-month buffer.

### Hiring Sub-Score ($S_{hire}$)
$$S_{hire} = w_1 \cdot \text{Team Velocity} + w_2 \cdot \text{Option Pool Optimization} - w_3 \cdot (\text{Days to Hire})$$

### Growth Sub-Score ($S_{growth}$)
$$S_{growth} = w_1 \cdot \text{User Acquisition MoM} + w_2 \cdot \text{Waitlist Conversion} - w_3 \cdot \text{CAC-to-LTV Ratio}$$

### Operations Sub-Score ($S_{ops}$)
$$S_{ops} = w_1 \cdot \text{Sprint Efficiency} + w_2 \cdot \text{Compliance Index} - w_3 \cdot \text{Server Failure Rates}$$

### Overall Health Score ($S_{overall}$)
The overall health score is a weighted average adjusted dynamically by **Decision Volatility** (derived from PostgreSQL decision ledger audits):
$$S_{overall} = \left( \sum_{i} \alpha_i \cdot S_i \right) - \sigma_{dec}$$
- Where $\sigma_{dec}$ is the penalty score for rejected compliance reviews and high-frequency pivots over a 30-day window.

---

## 4. MCP Tools Integration

The multi-agent scoring workflow accesses real-time data using **Model Context Protocol (MCP)** tools. This decouples database querying and system command structures from model logic:

1. **`mcp:postgres_query`**: Allows the LLM nodes to fetch the past 30 days of financials, payroll records, and operational statuses directly from PostgreSQL.
2. **`mcp:vector_search`**: Searches the RAG pipeline using `pgvector` to compare current state objectives against the original business policies.
3. **`mcp:system_audit`**: Accesses container memory and API gateway logs to evaluate server load and API latency metrics for Operations scoring.

---

## 5. Input / Output JSON Protocols

The engine exposes a single, highly performant endpoint (`/api/health/calculate`) designed to return comprehensive calculations and human-readable strategic explanations:

### Engine Request Payload
```json
{
  "startupId": "0404b094-7555-4e20-9413-23f92a4ea1e5",
  "historicalLimitDays": 30
}
```

### Response Payload (Output Schema)
```json
{
  "startupId": "0404b094-7555-4e20-9413-23f92a4ea1e5",
  "calculatedAt": "2026-07-03T11:28:10-07:00",
  "overallHealthScore": 78,
  "riskLevel": "Medium",
  "confidence": 0.94,
  "metrics": {
    "finance": {
      "score": 72,
      "explanation": "Runway sits at a comfortable 13.2 months. However, the recent increase in operational burn rate due to hiring plans introduces a medium-term risk. Preserves standard safety cushion.",
      "riskFactors": ["Burn rate increased by 8% over last 14 days."]
    },
    "hiring": {
      "score": 58,
      "explanation": "Option pool allocation remains healthy (1.3% committed), but pipeline speed is slow, averaging 58 days to secure mid-level hires. Engineering backlog is growing.",
      "riskFactors": ["Critical Platform Architect role has been vacant for 45+ days."]
    },
    "growth": {
      "score": 45,
      "explanation": "Signups are growing at +45% MoM, but pilot program conversion is constrained due to delayed SLA and pricing approvals.",
      "riskFactors": ["High waitlist decay rate due to slow onboarding cycles."]
    },
    "operations": {
      "score": 70,
      "explanation": "Sprints are operating at 65 points of velocity with standard deployment success rates. Infrastructure load is well below auto-scaling limits.",
      "riskFactors": []
    }
  },
  "decisionHistoryImpact": {
    "scoreImpact": -3,
    "explanation": "One high-priority enterprise pilot proposal was rejected by the founder, causing a minor growth velocity delay. Vetted recruitment approvals offset negative performance impacts."
  }
}
```

---

## 6. PostgreSQL Database Schemas for Health Telemetry

Below are the tables tracking historical scores, ensuring full logging of company trajectory:

```sql
-- Historical Health Snapshots for Progression Charts
CREATE TABLE health_score_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    startup_id UUID REFERENCES startups(id) ON DELETE CASCADE,
    overall_score INT NOT NULL,
    finance_score INT NOT NULL,
    hiring_score INT NOT NULL,
    growth_score INT NOT NULL,
    operations_score INT NOT NULL,
    risk_level VARCHAR(50) NOT NULL, -- 'Low' | 'Medium' | 'High'
    confidence_rating DECIMAL(3, 2) NOT NULL,
    finance_explanation TEXT NOT NULL,
    hiring_explanation TEXT NOT NULL,
    growth_explanation TEXT NOT NULL,
    operations_explanation TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Index vector embeddings of strategic decisions using pgvector
CREATE INDEX ON decision_log USING ivfflat (embedding vector_cosine_ops);
```
