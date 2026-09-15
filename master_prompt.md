# MASTER PROMPT — CATALYST OS

You are the lead AI architect and senior full-stack engineer responsible for transforming the existing Catalyst OS repository into a production-quality AI Startup Operating System using **Google Agent Development Kit (ADK)** and **Gemini**.

## 0. CRITICAL INSTRUCTION

This is an EXISTING project.

Repository:

https://github.com/siddharthg-7/Catalyst-Os

DO NOT blindly create a new project.

First inspect the complete existing repository and understand:

* current frontend
* current backend
* current database implementation
* current API routes
* existing AI/LLM code
* existing agent code
* existing RAG implementation
* existing authentication
* existing dashboard
* existing schemas/models
* existing environment configuration
* existing dependencies
* existing working features
* unfinished features
* bugs
* duplicated functionality
* architectural weaknesses

Preserve useful existing work.

Refactor where necessary.

Replace only what genuinely needs to be replaced.

Do not destroy working UI or backend functionality simply to introduce ADK.

The goal is:

> **Upgrade Catalyst OS into a Google ADK-based multi-agent startup operating system while preserving and improving the existing product.**

---

# 1. PRODUCT VISION

Catalyst OS is an AI Operating System for startup founders.

Core product philosophy:

> One Founder. One Command. An AI Executive Team.

The founder should interact primarily with one AI:

## AI CHIEF OF STAFF

The founder should NOT need to manually select agents.

The Chief of Staff understands the founder's request, startup context, memory, current priorities and permissions, then determines which specialist agents and tools are required.

Example:

Founder:

"Can we afford to hire two backend engineers and still launch next month?"

The system should determine:

```text
Founder
   ↓
AI Chief of Staff
   ↓
Finance Agent + Talent Agent
   ↓
Operations Agent
   ↓
Auditor
   ↓
Unified Recommendation
   ↓
Founder Approval
```

Another example:

Founder:

"Prepare everything for our October product launch."

Possible execution:

```text
Chief of Staff
      ↓
 ┌────┼────────────┐
 ↓    ↓            ↓
Growth Legal     Operations
 ↓    ↓            ↓
 └────┼────────────┘
      ↓
    Auditor
      ↓
Approval Center
```

Do NOT make every request go through every agent.

Use selective agent execution.

---

# 2. FINAL AI ARCHITECTURE

Use:

* Google ADK as the primary agent framework
* Gemini as the primary model
* FastAPI as backend API layer
* PostgreSQL as primary database
* pgvector for semantic retrieval
* Google ADK sessions/state where appropriate
* deterministic Python services for critical calculations
* tools for external actions
* human approval for high-risk actions
* structured outputs
* audit logging
* evaluation tests

Do NOT introduce LangGraph as a second orchestration framework unless there is a clearly demonstrated technical requirement that ADK cannot satisfy.

Avoid unnecessary framework proliferation.

---

# 3. GOOGLE ADK

Use the CURRENT Google ADK Python APIs and current official documentation.

Do not rely on outdated tutorials or deprecated APIs.

Before implementing ADK functionality, consult current Google ADK documentation.

Google's current tooling provides ADK development skills for:

* agents
* tools
* orchestration
* callbacks
* state management
* evaluation
* deployment
* observability

Use these capabilities where appropriate.

If the development environment supports Google Agents CLI, use its ADK development workflow rather than inventing an unrelated project structure.

Google's current Agents CLI supports scaffolding, running, evaluation, deployment and observability for ADK projects.

---

# 4. AGENT HIERARCHY

Implement the following architecture.

## LEVEL 1 — CHIEF OF STAFF

Agent:

`chief_of_staff`

Responsibilities:

* understand founder intent
* interpret ambiguous requests
* inspect startup context
* inspect relevant memory
* determine required specialists
* create execution plans
* delegate work
* combine specialist outputs
* resolve conflicts
* prioritize tasks
* maintain founder-facing conversation
* create reminders
* identify pending decisions
* escalate high-risk actions
* provide concise final responses

The Chief of Staff is the primary entry point.

The founder should normally interact with this agent.

---

# 5. SPECIALIST AGENTS

Create modular specialist agents.

Initial MVP:

## Finance Agent

Responsibilities:

* revenue analysis
* expense analysis
* burn rate
* runway
* budget analysis
* cash-flow analysis
* hiring affordability
* scenario simulation
* financial alerts
* financial summaries

CRITICAL:

The LLM must NOT perform critical financial arithmetic itself.

Use deterministic Python functions / database queries for:

* burn rate
* runway
* totals
* percentages
* budget calculations
* projections

The agent explains deterministic results.

---

## Growth Agent

Responsibilities:

* GTM strategy
* marketing planning
* social media planning
* campaign creation
* content drafts
* launch planning
* customer messaging
* marketing KPI suggestions

The Growth Agent should use tools rather than pretending that content has been published.

---

## Operations Agent

Responsibilities:

* tasks
* projects
* roadmaps
* deadlines
* dependencies
* launch planning
* milestones
* operational priorities
* founder reminders

---

## Talent Agent

Responsibilities:

* job descriptions
* candidate analysis
* resume analysis
* candidate ranking
* interview planning
* hiring recommendations
* hiring pipeline

Talent must consult Finance for budget-sensitive recommendations.

---

## Legal Agent

Responsibilities:

* contract analysis
* NDA drafts
* compliance checklists
* legal risk identification
* policy review

The Legal Agent must NOT claim to provide professional legal advice.

For high-risk legal actions, require human approval.

---

## Investment Agent

Responsibilities:

* fundraising readiness
* investor updates
* investor CRM
* KPI analysis
* pitch-deck feedback
* fundraising preparation

---

# 6. AUDITOR

Create an independent:

`auditor_agent`

The Auditor should validate agent outputs before high-impact recommendations reach the approval layer.

Check:

1. unsupported claims
2. missing evidence
3. missing citations
4. contradictory recommendations
5. invalid calculations
6. missing assumptions
7. stale data
8. permission violations
9. unsafe actions
10. inconsistent startup state

Output:

```json
{
  "status": "PASS | FAIL | NEEDS_REVIEW",
  "issues": [],
  "unsupported_claims": [],
  "missing_evidence": [],
  "calculation_errors": [],
  "required_human_review": false
}
```

If FAIL:

Return the work to the responsible agent.

Do not silently pass invalid information.

---

# 7. AGENTS ARE NOT TOOLS

Follow this architectural rule:

> Agents make decisions. Tools perform capabilities.

DO NOT create unnecessary agents such as:

* Database Agent
* Email Agent
* Calendar Agent
* Calculator Agent
* PDF Agent
* Search Agent

Instead expose capabilities as tools.

Example:

```text
Finance Agent
 ├── calculate_runway()
 ├── calculate_burn_rate()
 ├── get_expenses()
 ├── get_revenue()
 └── simulate_hiring()

Operations Agent
 ├── create_task()
 ├── update_task()
 ├── create_project()
 └── update_deadline()

Growth Agent
 ├── create_campaign()
 ├── create_social_draft()
 └── get_marketing_metrics()
```

---

# 8. TOOL ARCHITECTURE

Create a clean tool layer.

Suggested categories:

## Database Tools

* get_startup()
* get_startup_metrics()
* get_tasks()
* get_projects()
* get_team()
* get_expenses()
* get_revenue()
* get_decisions()
* get_pending_approvals()

## Task Tools

* create_task()
* update_task()
* complete_task()
* assign_task()
* create_reminder()

## Calendar Tools

Prepare an abstraction layer for:

* get_calendar_events()
* create_calendar_event()
* update_calendar_event()

Do not require Google Calendar integration before the internal architecture is ready.

## Email Tools

Prepare:

* search_email()
* draft_email()
* send_email()

Sending must require permission/approval where appropriate.

## Document Tools

* upload_document()
* extract_document_text()
* retrieve_relevant_chunks()
* cite_document()

## Finance Tools

* calculate_burn_rate()
* calculate_runway()
* calculate_cash_flow()
* validate_budget()
* simulate_hiring_cost()

These calculations must be deterministic.

---

# 9. HUMAN APPROVAL SYSTEM

Implement:

```text
AI Recommendation
       ↓
Risk Classification
       ↓
 ┌─────┴─────┐
 ↓           ↓
LOW         HIGH
 ↓           ↓
Execute    Approval
             ↓
       Founder Decision
        ↓    ↓    ↓
      Approve Reject Edit
             ↓
          Execute
```

High-risk actions include:

* sending external emails
* publishing social content
* spending money
* hiring/rejecting candidates
* signing or sending legal documents
* changing important company configuration
* communicating externally on behalf of the founder

The system must never silently execute these.

---

# 10. FOUNDER MEMORY

Catalyst must have persistent startup memory.

Separate:

## Structured Memory

PostgreSQL:

```text
users
workspaces
startups
startup_members
startup_metrics
team_members
projects
tasks
deadlines
expenses
revenue
budgets
decisions
approvals
notifications
agent_runs
agent_messages
activity_events
scenario_runs
integrations
```

## Semantic Memory

pgvector:

```text
pitch decks
business plans
financial documents
roadmaps
meeting notes
contracts
policies
research
resumes
strategy documents
```

Do NOT put everything into vector search.

Use PostgreSQL for structured facts.

Use pgvector/RAG for semantic documents and unstructured knowledge.

---

# 11. MULTI-TENANCY

Every startup must have strict data isolation.

Use:

```text
user_id
workspace_id
startup_id
```

as appropriate.

An agent belonging to Startup A must NEVER retrieve Startup B's information.

Validate ownership and authorization at the tool/data layer, not only in prompts.

Never trust an LLM to enforce authorization.

---

# 12. RAG

Implement grounded RAG.

Pipeline:

```text
Document
 ↓
Extract
 ↓
Chunk
 ↓
Embed
 ↓
pgvector
 ↓
Retrieve relevant chunks
 ↓
Agent
 ↓
Answer with evidence
```

Every evidence-based recommendation should be able to identify its sources.

Example:

```json
{
  "claim": "Hiring two engineers reduces runway below six months",
  "sources": [
    "Q3_financials.xlsx",
    "hiring_budget.pdf"
  ]
}
```

If required evidence is unavailable:

```text
DATA_MISSING
```

Never invent missing information.

---

# 13. STRUCTURED AGENT OUTPUTS

Do not rely on free-form text between agents.

Use structured schemas.

Example:

```json
{
  "agent": "finance",
  "status": "completed",
  "recommendation": "Hire one engineer",
  "reasons": [
    "Current hiring budget supports one engineer",
    "Two hires reduce projected runway below the configured threshold"
  ],
  "confidence": 0.91,
  "evidence": [
    "financial_report.pdf",
    "hiring_budget.xlsx"
  ],
  "requires_approval": true
}
```

Use Pydantic models / typed schemas wherever practical.

---

# 14. AGENT COLLABORATION

Do NOT implement uncontrolled agent-to-agent conversation.

Use explicit workflows.

Example:

```text
Founder
 ↓
Chief of Staff
 ↓
Finance + Talent
 ↓
Operations
 ↓
Auditor
 ↓
Final recommendation
```

For independent work, run specialists in parallel.

For dependent work, use sequential execution.

Example:

```text
Finance ─────┐
             ├──→ Operations → Auditor
Talent ──────┘
```

Talent may need Finance's budget result.

Therefore:

```text
Finance
 ↓
Talent
```

when the dependency actually exists.

---

# 15. STARTUP HEALTH SCORE

Implement:

```text
Overall Health
 ├── Finance
 ├── Growth
 ├── Hiring
 └── Operations
```

Do not allow the LLM to arbitrarily invent the score.

Create deterministic scoring functions with documented weights.

Store:

* score
* timestamp
* input metrics
* scoring version
* explanation

Example:

```json
{
  "overall": 83,
  "finance": 92,
  "growth": 88,
  "hiring": 71,
  "operations": 82,
  "calculated_at": "...",
  "scoring_version": "1.0"
}
```

---

# 16. DAILY EXECUTIVE BRIEF

The Chief of Staff should be able to generate:

```text
Good morning.

Today's priorities

1. Approve marketing campaign
2. Review backend hiring decision
3. Investor follow-up is overdue

Startup Health: 83

Runway: 5.2 months

Critical Alert:
Burn increased 12% this month.

Pending approvals:
3
```

Every statement must come from actual startup data.

---

# 17. REMIND + FOLLOW-UP ENGINE

This is a core differentiator.

The founder should be able to say:

> "Remind me Friday to follow up with the investor."

Create a persistent task/reminder.

More advanced:

> "Follow up with the investor if they haven't replied by Friday."

Represent this as a conditional workflow:

```text
Wait until Friday
 ↓
Check email/CRM
 ↓
Response?
 ├── YES → complete
 └── NO → create follow-up draft
```

Do not implement this as an LLM pretending to remember.

Use real persistent state / scheduling infrastructure.

---

# 18. SCENARIO SIMULATOR

Support:

> "What happens if we hire three engineers?"

The system should:

```text
Current state
     ↓
Scenario inputs
     ↓
Deterministic calculations
     ↓
Projected state
     ↓
Health score
     ↓
Agent explanation
```

Return:

```text
Current runway: 8.2 months
Projected runway: 5.7 months

Monthly burn:
₹X → ₹Y

Hiring impact:
...

Launch impact:
...

Recommendation:
...
```

Calculations must be deterministic.

---

# 19. VOICE

Architecture:

```text
Voice
 ↓
Speech-to-text
 ↓
Chief of Staff
 ↓
Agent workflow
 ↓
Response
```

Keep voice as an interface layer.

Do not create a separate "voice agent."

---

# 20. DATABASE DESIGN

Inspect the existing database before changing it.

Create migrations rather than destroying existing tables.

Ensure indexes exist for:

* startup_id
* workspace_id
* user_id
* timestamps
* task status
* approval status
* agent run IDs

Add audit fields:

```text
created_at
updated_at
created_by
source
```

where appropriate.

---

# 21. AUDIT LOG

Every significant agent action should create an auditable record.

Store:

```text
founder_command
startup_id
agent
task
inputs
recommendation
evidence
confidence
tool_calls
approval_required
founder_decision
execution_status
timestamp
```

Example:

```text
Founder:
"Can we hire two engineers?"

Finance:
Reject two hires

Talent:
Approve hiring

Operations:
Approve one hire

Chief of Staff:
Hire one engineer now

Founder:
Approved

Final:
One engineer added to hiring plan
```

---

# 22. FAILURE HANDLING

Agents will fail.

Design for it.

If Finance fails:

```text
Finance unavailable
 ↓
Do not fabricate result
 ↓
Chief of Staff informs founder
```

If one parallel agent fails:

```text
Growth ✓
Finance ✓
Legal ✗

 ↓

Continue only if the missing agent is not required.

Otherwise:
NEEDS_REVIEW
```

Never fabricate a successful tool call.

Never claim an external action succeeded unless the tool confirms success.

---

# 23. OBSERVABILITY

Track:

* agent execution
* latency
* token/model usage
* tool calls
* errors
* workflow paths
* approval decisions
* failed outputs
* hallucination/validation failures

Use the Google ADK ecosystem and compatible observability tooling rather than building unnecessary custom infrastructure first.

---

# 24. EVALUATION

Create evaluation cases before declaring the agent production-ready.

Minimum tests:

### Finance

```text
Can we afford two engineers?
```

### Growth

```text
Create a launch campaign.
```

### Operations

```text
What are today's priorities?
```

### Cross-agent

```text
Can we hire two developers and launch next month?
```

### Missing data

```text
What is our runway?
```

when financial data is unavailable.

Expected:

```text
DATA_MISSING
```

### Security

Attempt to access another startup's data.

Expected:

```text
ACCESS_DENIED
```

### Approval

Ask agent to send an external email.

Expected:

```text
APPROVAL_REQUIRED
```

### Hallucination

Ask about a document that doesn't exist.

Expected:

```text
EVIDENCE_NOT_FOUND
```

Use automated evaluation wherever possible.

Google's current Agents CLI supports evaluation workflows and metrics; integrate those into development rather than relying only on manual testing.

---

# 25. FRONTEND

Do not redesign the entire existing frontend unless necessary.

Preserve the existing visual direction.

Improve the dashboard around:

## Founder Command

Large central input:

> "What do you need?"

Text + voice.

## Today's Brief

* priorities
* alerts
* pending approvals
* upcoming deadlines

## AI Executive Team

Cards:

```text
Finance
Healthy

Growth
Attention Needed

Operations
On Track

Talent
2 decisions pending
```

## Live Execution

When a workflow runs:

```text
Chief of Staff
Understanding request...

Finance
Checking runway...

Talent
Reviewing hiring plan...

Operations
Checking launch dependency...

Auditor
Validating recommendation...
```

Do not fake these states.

They should be driven by backend events/status.

---

# 26. APPROVAL CENTER

Build:

```text
Pending Approvals

┌─────────────────────────────┐
│ Hire Backend Engineer       │
│ Finance + Talent            │
│ Risk: Medium                │
│                             │
│ [Approve] [Edit] [Reject]  │
└─────────────────────────────┘
```

Show:

* what will happen
* why
* evidence
* agent recommendation
* confidence
* affected startup data
* risk level

---

# 27. API DESIGN

Preserve existing APIs where possible.

Refactor only where necessary.

Suggested:

```text
POST /api/v1/commands

GET /api/v1/brief

GET /api/v1/agents

GET /api/v1/agent-runs

GET /api/v1/approvals

POST /api/v1/approvals/{id}/approve

POST /api/v1/approvals/{id}/reject

PATCH /api/v1/approvals/{id}

GET /api/v1/decisions

GET /api/v1/tasks

POST /api/v1/tasks

POST /api/v1/documents

POST /api/v1/scenarios/simulate

GET /api/v1/health-score

POST /api/v1/voice/transcribe
```

Keep API schemas typed and documented.

---

# 28. PROJECT STRUCTURE

Adapt the existing structure rather than blindly replacing it.

A target architecture should look approximately like:

```text
Catalyst-Os/

frontend/
    src/
        components/
        pages/
        hooks/
        services/
        types/

backend/
    app/
        main.py

        api/
            commands.py
            approvals.py
            tasks.py
            documents.py
            health.py
            scenarios.py

        agents/
            chief_of_staff/
            finance/
            growth/
            operations/
            talent/
            legal/
            investment/
            auditor/

        tools/
            database/
            finance/
            tasks/
            calendar/
            email/
            documents/

        orchestration/
            workflows/
            routing/
            state/

        rag/
            ingestion/
            retrieval/
            embeddings/

        services/
            memory/
            approvals/
            audit/
            scheduling/

        models/
        schemas/
        db/

        config.py

    tests/
        unit/
        integration/
        agents/
        eval/

```

Adapt this to the repository's actual structure.

---

# 29. ENVIRONMENT VARIABLES

Never commit secrets.

Use environment variables for:

```text
GEMINI_API_KEY
GOOGLE_CLOUD_PROJECT
GOOGLE_CLOUD_LOCATION
DATABASE_URL
CLERK_SECRET_KEY
CLERK_PUBLISHABLE_KEY
STORAGE_BUCKET
```

Use the appropriate Google authentication mechanism for the selected deployment environment.

---

# 30. SECURITY

Implement:

* authentication
* authorization
* startup/workspace isolation
* input validation
* secret protection
* tool permission checks
* approval gates
* audit logging
* rate limiting where appropriate
* safe error messages

Never put secrets in prompts.

Never trust user-provided startup IDs without authorization checks.

Never let the model directly execute arbitrary SQL.

Never let the model directly execute shell commands in production.

---

# 31. DEVELOPMENT PROCESS

Follow this order.

## PHASE 1 — AUDIT

First inspect the entire repository.

Do NOT modify anything.

Produce:

```text
CURRENT ARCHITECTURE
WHAT WORKS
WHAT DOESN'T
WHAT SHOULD BE PRESERVED
WHAT SHOULD BE REFACTORED
WHAT SHOULD BE REPLACED
ADK MIGRATION PLAN
```

Then proceed.

---

## PHASE 2 — FOUNDATION

Implement/verify:

* ADK installation
* Gemini configuration
* Chief of Staff
* session/state
* FastAPI integration
* PostgreSQL connection
* existing authentication

Get ONE agent working end-to-end before adding others.

---

## PHASE 3 — FINANCE

Implement:

```text
Chief of Staff
 ↓
Finance Agent
 ↓
Finance tools
 ↓
Deterministic calculations
 ↓
Structured result
```

Test thoroughly.

---

## PHASE 4 — MULTI-AGENT

Add:

* Growth
* Operations
* Talent

Implement selective routing.

---

## PHASE 5 — MEMORY + RAG

Implement:

* document ingestion
* chunking
* embeddings
* pgvector retrieval
* evidence references
* startup memory

---

## PHASE 6 — AUDITOR

Implement validation and evidence checking.

---

## PHASE 7 — APPROVALS

Implement human-in-the-loop.

---

## PHASE 8 — ACTIONS

Implement safe external integrations.

---

## PHASE 9 — DASHBOARD

Connect the existing UI to real agent state.

---

## PHASE 10 — EVALUATION

Create automated evaluation datasets.

Test:

* accuracy
* routing
* tool use
* security
* hallucination
* approvals
* multi-agent coordination
* failure recovery

---

# 32. IMPORTANT PRODUCT RULES

Always follow these.

### Rule 1

The founder talks primarily to the Chief of Staff.

### Rule 2

The Chief of Staff chooses specialists.

### Rule 3

Do not invoke irrelevant agents.

### Rule 4

Agents use tools for facts and actions.

### Rule 5

Critical calculations are deterministic.

### Rule 6

Missing data = DATA_MISSING.

### Rule 7

Unsupported claims must not pass the Auditor.

### Rule 8

High-risk external actions require founder approval.

### Rule 9

Never claim an action happened without tool confirmation.

### Rule 10

Never mix startup data between tenants.

### Rule 11

Every significant decision should be auditable.

### Rule 12

Prefer simple workflows over unnecessary agent-to-agent conversations.

---

# 33. DO NOT OVERENGINEER THE MVP

The first working version should contain:

```text
Chief of Staff
       │
 ┌─────┼──────┐
 ↓     ↓      ↓
CFO   Growth   Ops
       │
       ↓
    Auditor
       │
       ↓
 Approval Center
```

Then add:

```text
Talent
Legal
Investment
```

later.

Do not implement every possible integration immediately.

---

# 34. DEFINITION OF DONE

Catalyst OS is considered successful when a founder can say:

> "Can we hire two engineers and still launch next month?"

and the system can:

1. understand the request
2. retrieve startup context
3. determine relevant agents
4. execute Finance and Talent analysis
5. use Operations for launch impact
6. perform deterministic financial calculations
7. retrieve supporting documents
8. produce structured recommendations
9. show evidence
10. detect disagreements
11. run Auditor validation
12. produce a unified recommendation
13. determine whether approval is required
14. present the recommendation to the founder
15. allow Approve / Reject / Edit
16. execute the approved action
17. record the decision
18. update startup state
19. reflect the change in the dashboard
20. remember the decision for future conversations

That is the core Catalyst OS experience.

---

# 35. FINAL IMPLEMENTATION PRINCIPLE

Do not build:

> "A website with several AI chatbots."

Build:

> **"A persistent AI Chief of Staff that coordinates specialized AI executives, uses real startup data, performs real actions through controlled tools, remembers decisions, and keeps the founder in control."**

Before every implementation decision ask:

> Does this reduce the founder's workload?

If yes, build it.

If it only makes the AI demo look impressive but does not reduce founder workload, deprioritize it.

---

# 36. FIRST ACTION

START NOW.

Do NOT immediately rewrite the repository.

First inspect:

1. repository structure
2. frontend
3. backend
4. current agent implementation
5. current LLM implementation
6. database
7. RAG
8. authentication
9. APIs
10. environment configuration
11. existing UI
12. tests

Then provide a concise:

## CATALYST OS ADK MIGRATION REPORT

with:

* Current architecture
* Existing functionality
* Broken functionality
* ADK migration requirements
* Files to modify
* Files to create
* Files to delete, if any
* Database changes
* API changes
* Agent architecture
* Tool architecture
* Migration risks
* Implementation order

ONLY AFTER THIS AUDIT should you begin modifying the code.

Preserve existing working functionality.

Do not rewrite working code without a technical reason.

Use current Google ADK APIs and official documentation as the source of truth.
