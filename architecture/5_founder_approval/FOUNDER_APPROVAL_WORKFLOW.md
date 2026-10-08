# Catalyst OS Architecture: Founder Approval Workflow

This document details the backend APIs, database schemas, and state machine configurations for the **Founder Approval Workflow**. It integrates with the mandated tech stack (**Frontend: React**, **Backend: FastAPI/Node**, **AI: LangGraph/multi-agent, MCP tools**, **Data: PostgreSQL, pgvector**).

---

## 1. System Topology & Event Flow

The Founder Approval Workflow acts as the final "Human-in-the-Loop" (HITL) gatekeeper for all high-risk autonomous agent operations. Agents formulate proposals, but execution is blocked until the Founder reviews, approves, rejects, or modifies the transaction.

```text
       [Autonomous Agents Group] ──► (Generates high-risk proposal)
                                                │
                                                ▼
                                    [Risk Auditing Engine]
                                                │
                 ┌──────────────────────────────┴──────────────────────────────┐
                 ▼ (Risk Threshold Passed)                                     ▼ (Low Risk)
         [Pending Approval Queue]                                      [Direct Execution]
                 │                                                             │
                 ├─► APPROVE ──► Mutate State & DB ──► Success Notification    │
                 ├─► REJECT  ──► Log Rejection     ──► Notify Agent Re-route   │
                 └─► MODIFY  ──► AI Re-synthesis   ──► Loop back to Queue       │
                                                                               │
                                                ┌──────────────────────────────┘
                                                ▼
                                    [Immutable Audit Log]
                                                │
                                                ▼
                                  [PostgreSQL / pgvector Sync]
```

---

## 2. PostgreSQL Relational Schema

The PostgreSQL schema enforces relational consistency, immutable transaction histories, and vector indexing for historical decisions to support semantic auditing.

```sql
-- PostgreSQL Schema Configuration

-- 1. Enum for Approval Categories
CREATE TYPE approval_category AS ENUM (
    'Hiring',
    'Budget',
    'Marketing Spend',
    'Legal Documents',
    'Investor Updates'
);

-- 2. Enum for Approval Status
CREATE TYPE approval_status AS ENUM (
    'pending',
    'approved',
    'rejected',
    'modified_and_approved'
);

-- 3. Core Approval Queue Table
CREATE TABLE approval_queue (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    startup_id UUID NOT NULL,
    category approval_category NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    proposed_by VARCHAR(100) NOT NULL, -- e.g., 'Marcus Sterling (Finance)', 'Evelyn Brooks (Talent)'
    financial_impact DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
    metric_impact_preview JSONB NOT NULL, -- e.g., {"velocity": +15, "financialHealth": -3}
    raw_payload JSONB NOT NULL, -- Full strategic draft or contract schema
    status approval_status NOT NULL DEFAULT 'pending',
    risk_level VARCHAR(50) NOT NULL DEFAULT 'High',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4. Immutable Audit & Decision Tracking Log
CREATE TABLE approval_audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    approval_id UUID REFERENCES approval_queue(id) ON DELETE SET NULL,
    startup_id UUID NOT NULL,
    action_taken VARCHAR(50) NOT NULL, -- 'APPROVE', 'REJECT', 'MODIFY'
    performed_by VARCHAR(100) NOT NULL, -- 'Human Founder' or 'System Override'
    feedback TEXT, -- Founder remarks or modification inputs
    previous_state JSONB,
    new_state JSONB,
    embedding vector(768), -- Embedding vector of the action and reasoning for semantic audits (pgvector)
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 5. System Notifications Queue
CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    startup_id UUID NOT NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    category VARCHAR(50) NOT NULL, -- 'approval_required', 'system_alert'
    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create HNSW Vector Index for efficient semantic audit logs (pgvector)
CREATE INDEX ON approval_audit_log USING hnsw (embedding vector_cosine_ops);
```

---

## 3. Backend REST APIs (FastAPI / Node.js)

The API coordinates interactions among React clients, LangGraph engines, and PostgreSQL storage.

### FastAPI (Python) Endpoints

```python
from fastapi import FastAPI, HTTPException, Depends
from pydantic import BaseModel
from typing import Dict, List, Optional
from datetime import datetime
import uuid

app = FastAPI(title="Catalyst OS Approval Gateway")

# Data Models
class ApprovalRequest(BaseModel):
    category: str
    title: str
    description: str
    proposed_by: str
    financial_impact: float
    metric_impact_preview: Dict[str, int]
    raw_payload: Dict[str, any]

class ReviewAction(BaseModel):
    action: str # 'APPROVE' | 'REJECT' | 'MODIFY'
    feedback: Optional[str] = None
    modified_payload: Optional[Dict[str, any]] = None

# 1. POST: Submit a proposal to the Pending Queue
@app.post("/api/approvals", status_code=201)
async def submit_proposal(payload: ApprovalRequest):
    approval_id = uuid.uuid4()
    # In production, inserts record into PostgreSQL table 'approval_queue'
    # Generates a push notification inside the 'notifications' queue
    return {
        "status": "success",
        "approvalId": str(approval_id),
        "message": f"High-risk action '{payload.title}' queued for Founder review."
    }

# 2. GET: Retrieve the Pending Queue
@app.get("/api/approvals/pending")
async def get_pending_queue():
    # Queries database: SELECT * FROM approval_queue WHERE status = 'pending'
    return [
        {
            "id": "del_2",
            "category": "Legal Documents",
            "title": "Q3 Enterprise Pilot Terms & SLA Draft",
            "description": "Enterprise agreement template with $15,000 flat fees and data privacy clauses.",
            "proposed_by": "Helena Vance, Esq. (Legal)",
            "financial_impact": 15000.00,
            "metric_impact_preview": {"growthRate": 10, "financialHealth": 6, "operationsEfficiency": -2},
            "status": "pending",
            "risk_level": "High"
        }
    ]

# 3. POST: Execute a Founder review action (Approve, Reject, Modify)
@app.post("/api/approvals/{approval_id}/review")
async def review_proposal(approval_id: str, action: ReviewAction):
    if action.action not in ["APPROVE", "REJECT", "MODIFY"]:
        raise HTTPException(status_code=400, detail="Invalid action parameter.")
        
    # In-db record update
    # If APPROVE: Mutates primary company balance, recalculates runway, inserts into decision_log
    # If REJECT: Records rejection context, terminates task execution
    # If MODIFY: Calls LangGraph synthesis agent to re-adjust documents based on action.feedback
    
    return {
        "status": "success",
        "action": action.action,
        "message": f"Proposal {approval_id} processed successfully with action {action.action}."
    }

# 4. GET: Query the Semantic Audit Log (pgvector query)
@app.post("/api/approvals/audit/search")
async def search_audit_trail(query: str, limit: int = 5):
    # Generates embedding of query text: embedding = ai.embeddings.create(query)
    # Queries pgvector: SELECT * FROM approval_audit_log ORDER BY embedding <=> :query_vec LIMIT :limit
    return {
        "query": query,
        "results": [
            {
                "id": "audit_123",
                "action_taken": "APPROVE",
                "performed_by": "Human Founder",
                "feedback": "Vetted lead engineer compensation package, equity pool adjusted by 1.3%.",
                "relevance_score": 0.94
            }
        ]
    ]
```

---

## 4. Multi-Agent Synthesis (LangGraph Modify Integration)

When a Founder selects **MODIFY** (e.g. *"We cannot support $135k base salary. Adjust it to $120k and raise equity options to offset"*), the API launches an autonomous feedback loop to re-draft deliverables:

```python
# LangGraph Modification Feedback Loop
def run_modify_agent(state: HealthEngineState):
    founder_feedback = state["raw_metrics"]["latest_feedback"]
    previous_draft = state["raw_metrics"]["previous_draft"]
    
    # LangGraph instructs Gemini to reconstruct the asset with strict numerical constraints
    prompt = f"""
    The Human Founder has requested a change to the previous draft:
    FOUNDER FEEDBACK: "{founder_feedback}"
    
    PREVIOUS DRAFT:
    {previous_draft}
    
    Re-evaluate the draft. Adjust base parameters to comply with feedback. Recalculate financial offsets.
    Return the fully edited Markdown asset and adjusted numeric metric impacts.
    """
    
    revised_asset = call_gemini(prompt)
    return {"evaluations": {"modified_deliverable": revised_asset}}
```

---

## 5. UI Integration Map (React Interactions)

In the React presentation layer, these backend endpoints connect directly with active interactive elements:

1. **`ApprovalQueue.tsx` Component**:
   - Executes `fetch('/api/approvals/pending')` on mount to display a table of high-risk deliverables.
   - Houses three main buttons: **Approve** (green tick), **Reject** (red cross), and **Modify** (input field & return button).
2. **`DecisionLog.tsx` Component**:
   - Pulls data from `/api/decisions` and `/api/approvals/audit/search` to draw a clean, immutable timeline of historically signed documents.
3. **`MetricCards.tsx` Component**:
   - Automatically refreshes and pulls `/api/startup` whenever an approval action resolves, creating real-time visual metric updates.
