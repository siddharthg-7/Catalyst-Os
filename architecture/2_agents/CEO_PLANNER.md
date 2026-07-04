# Catalyst OS Architecture: CEO Planner Agent

This document details the operational specification, prompts, and internal reasoning loops for the **CEO Planner Agent (Sophia Vance)**, the primary orchestrator of Catalyst OS.

---

## 1. Role and Core Responsibilities

The CEO Planner Agent acts as the central router and "brain" of the company. When the Human Founder inputs a broad business goal (e.g., *"We need to launch our pilot in 45 days"*), the CEO Agent:
1. **Queries RAG Context**: Calls the company knowledge base to retrieve roadmaps, pitch decks, and budgets.
2. **Decomposes Objectives**: Divides the goal into specialized tasks for the executive agents (Finance, Talent, Growth, Legal, Operations).
3. **Orchestrates Communication**: Initiates and manages the message passing loop among agents.
4. **Validates & Synthesizes**: Gathers agent responses, detects conflicts (e.g. Talent's high hiring speed vs. Finance's tight budget), and merges inputs into one unified strategy.
5. **Applies Approvals**: Isolates high-risk changes (e.g., hiring spend or contract adjustments) and redirects them to the Founder Approval Queue.

---

## 2. Prompt Template (System Persona)

Below is the standard system instruction prompt used to initialize the CEO Planner Agent in production:

```markdown
You are Sophia Vance, the autonomous CEO Planner Agent for a highly agile B2B SaaS startup.
Your core intelligence is dedicated to strategic orchestration, milestone planning, and resource balancing.

### CORE OBJECTIVES:
1. Receive raw operational goals from the human founder.
2. Ingest contextual document data (Pitch Deck, Business Plans, Financials) provided by the RAG pipeline.
3. Formulate a structured plan of execution, identifying which executive agents are required.
4. Delegate discrete objectives with strict boundaries to:
   - Finance: Burn rate, runway, cost offsets, pricing.
   - Talent: Hiring pipelines, option pools, compensation benchmarks.
   - Growth: Marketing channels, landing copies, user acquisition.
   - Legal: Contracts, IP, regulatory compliance.
   - Operations: Cloud scaling, SOC-2 readiness, sprint speed.
5. Identify conflicting trade-offs between departments and mediate them using the ConflictResolver agent.
6. Package final, vetted business outcomes in structured formats.

### BEHAVIOR RULES:
- Never exceed current treasury balance or reduce runway below 8 months without a high-priority warning.
- Always check Legal constraints before authorizing new public marketing initiatives or employee compensation packages.
- Always output decisions, tasks, and deliverables using structured JSON schemas to allow seamless programmatic execution.
```

---

## 3. Task Decomposition and Planner Logic

When a goal is received, the CEO Agent operates according to the following execution sequence:

```text
[Founder Goal]
      │
      ▼
[CEO Agent Queries RAG] ── Ingests Pitch Deck & Financial Context
      │
      ▼
[Decomposition Engine] ── Break goal into subtasks
      │
      ├─► Finance: Analyze budget impact
      ├─► Talent: Identify resource gaps
      ├─► Growth: Outline outreach plan
      └─► Legal: Audit regulatory risks
      │
      ▼
[Agent Discussion Loop] ── Capture and tag messages
      │
      ▼
[Conflict Analysis] ── Identify contradictions (e.g., Budget vs. Hire)
      │
      ▼
[Conflict Resolution] ── ConflictResolver crafts compromise
      │
      ▼
[Synthesis Engine] ── Compile unified strategy & Markdown Deliverables
      │
      ▼
[Human-in-the-Loop] ── Send to Founder Approval Queue
```

---

## 4. Input / Output Protocol (JSON Schema)

The CEO Planner expects and generates structured payloads to ensure full integration with the Express backend routing layer.

### Planner Execution Output Schema
```json
{
  "initiativeId": "init_123456",
  "founderGoal": "We need to hire a founding engineer in 45 days.",
  "requiredExecutives": ["Finance", "Talent", "Legal"],
  "ragQueryString": "founding engineer salary option pool cash balance",
  "decomposedTasks": [
    {
      "id": "task_finance_1",
      "assignedTo": "Finance",
      "title": "Evaluate budget limits for a founding engineer base salary and runway adjustments.",
      "constraints": "Keep runway above 12 months."
    },
    {
      "id": "task_talent_1",
      "assignedTo": "Talent",
      "title": "Define lead engineer job description and stock option allocation range.",
      "constraints": "Option pool cannot exceed 1.5%."
    },
    {
      "id": "task_legal_1",
      "assignedTo": "Legal",
      "title": "Draft standard IP protection and employment contract templates.",
      "constraints": "Standard 4-year vesting with a 1-year cliff."
    }
  ],
  "expectedDeliverables": [
    {
      "type": "contract",
      "title": "Founding Engineer Employment & IP Agreement"
    }
  ]
}
```

---

## 5. Error Handling and Recovery Rules

The CEO Planner uses the following safeguards:
- **RAG Missing Context**: If the RAG query returns empty or highly irrelevant records, the CEO planner falls back to standard startup financial projections based on the active state profile, rather than crashing or using generic mock variables.
- **Agent Defection / Timeout**: If any specialized agent fails to produce a response within the threshold (or returns an invalid schema), the CEO Planner automatically re-dispatches the subtask with simplified guidelines or falls back to standard heuristics.
- **Infinite Negotiation Loop**: If agents continue to clash after 3 exchanges, the CEO terminates discussions and forces the **ConflictResolver** to inject a binding compromises, preventing an infinite loop.
- **Low Runway Alert**: If a proposed strategy reduces company runway below 9 months, the CEO overrides standard approval schedules, tags the deliverable as `critical_high_risk`, and prompts the founder for an immediate override.
