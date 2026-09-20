# CATALYST OS

# FRESH USER WORKSPACE + FOUNDER CONTEXT + JARVIS + MULTI-AGENT ORCHESTRATION

You are working on the existing Catalyst OS repository:

https://github.com/siddharthg-7/Catalyst-Os

This is a NEW workflow implementation task.

Do not treat this as a UI-only change.

We need to establish the correct foundation connecting:

```text
SIGNUP
   ↓
FRESH WORKSPACE
   ↓
FOUNDER / STARTUP ONBOARDING
   ↓
PERSISTENT STARTUP CONTEXT
   ↓
DASHBOARD
   ↓
JARVIS COMMAND
   ↓
CEO ORCHESTRATOR
   ↓
RAG + DATABASE + DETERMINISTIC TOOLS
   ↓
MULTI-AGENT COLLABORATION
   ↓
AUDITOR
   ↓
CEO SYNTHESIS
   ↓
ANSWER + SUPPORTING DATA
   ↓
NOTIFICATIONS
   ↓
PERSISTENT DECISION / ACTIVITY STATE
```

The goal is to make this the actual product workflow.

Do NOT fake this with frontend state or hardcoded objects.

---

# 1. CRITICAL: START FRESH

For the current development environment, we want to start with a clean user data state.

Before implementing the new workflow:

## Inspect existing data

Identify:

* users
* startups
* startup profiles
* documents
* knowledge chunks
* embeddings
* commands
* plans
* tasks
* approvals
* decisions
* notifications
* timeline items
* health scores
* executive agent state
* any seed/demo data
* local-memory state
* cached startup context

Determine exactly where current user/company data is coming from.

---

# 2. RESET CURRENT USER DATA

We are intentionally starting fresh.

Create a SAFE DEVELOPMENT RESET mechanism.

Do NOT blindly delete production data.

The reset should only operate in development/test mode.

Conceptually:

```text
DEV RESET

Users
   ↓
Startups
   ↓
Documents
   ↓
Knowledge Chunks
   ↓
Embeddings
   ↓
Commands
   ↓
Plans
   ↓
Tasks
   ↓
Approvals
   ↓
Decision Logs
   ↓
Notifications
   ↓
Timeline
   ↓
Health Scores
```

Clear all existing demo/test startup data that would interfere with a new signup.

Do NOT delete:

* Prisma schema
* database structure
* application code
* agent definitions
* system configuration
* migration history

Do NOT hardcode:

```text
startupId = "st_catalystos"
```

as the real user's startup.

After reset:

```text
DATABASE
   ↓
NO ACTIVE USER STARTUP DATA
```

until a new user signs up/onboards.

---

# 3. NEW USER SIGNUP MUST CREATE A REAL WORKSPACE

When a user signs up:

```text
User Signup
     ↓
Authentication
     ↓
Create User
     ↓
Create Startup / Workspace
     ↓
Initialize Founder Context
     ↓
Initialize Executive Team
     ↓
Initialize Dashboard State
     ↓
Redirect to onboarding
```

The startup/workspace must belong to the authenticated user.

Relationship:

```text
User
  │
  └── owns
        │
        ▼
     Startup
        │
        ├── Documents
        ├── Knowledge
        ├── Commands
        ├── Plans
        ├── Tasks
        ├── Approvals
        ├── Decisions
        ├── Notifications
        ├── Timeline
        └── Executive Agents
```

---

# 4. DO NOT ASK FOR TOO MUCH ON SIGNUP

Signup should be lightweight.

Do NOT turn authentication into a giant form.

Separate:

## STEP 1 — Account

Collect only what authentication requires.

```text
Name
Email
Password / OAuth
```

Use the existing authentication provider.

---

# 5. ONBOARDING SHOULD COLLECT STARTUP CONTEXT

After signup, collect the minimum information required for Catalyst OS to become useful.

The onboarding should be optimized.

Do not ask 30 questions.

Use progressive disclosure.

## Required Core Context

Collect:

### Founder

```text
Founder name
Role
```

### Startup

```text
Startup name
One-line description
Industry
Current stage
```

### Business

```text
Business model
Target customer / ICP
Primary product/service
```

### Financial baseline

Only ask what is necessary:

```text
Current cash
Approximate monthly burn
```

Calculate:

```text
runway = currentCash / monthlyBurn
```

using deterministic application logic.

Do NOT ask the user to manually enter runway.

---

# 6. OPTIONAL CONTEXT

After the required information, allow optional context:

```text
Funding stage
Team size
Current revenue
Monthly revenue
Target market
Current priorities
Major goals
Upcoming milestones
Known challenges
```

Do not force all of these.

Use:

```text
Skip for now
```

where appropriate.

The system can collect more context later.

---

# 7. DOCUMENT UPLOAD SHOULD BE PART OF ONBOARDING

Allow the founder to optionally provide:

```text
Pitch deck
Business plan
Financial statements
Product roadmap
Hiring plan
Contracts
Policies
Market research
Other company documents
```

Use the existing document ingestion pipeline.

Expected flow:

```text
Upload
 ↓
Parse
 ↓
Extract text
 ↓
Chunk
 ↓
Embed
 ↓
Store
 ↓
Index
 ↓
Associate with Startup
```

Do NOT make document processing block the entire onboarding UI if it can safely happen asynchronously.

Show:

```text
Uploading...
Processing...
Indexing...
Ready
```

---

# 8. CREATE A CANONICAL STARTUP CONTEXT

This is one of the most important changes.

The founder's data must become a structured startup context.

Do NOT rely on an LLM to reconstruct everything from random documents every time.

Create/use a canonical context concept containing:

```text
Startup Identity
Business
Founder
Financial Baseline
Product
ICP
Current Goals
Priorities
Team
Milestones
Current Risks
Relevant Documents
```

Conceptually:

```typescript
StartupContext {
  startupId
  founder
  startup
  business
  financials
  product
  icp
  team
  goals
  priorities
  milestones
  risks
  documents
}
```

Use the project's existing Prisma models/types if they already support this.

Do NOT duplicate existing schemas unnecessarily.

---

# 9. STARTUP CONTEXT MUST BE THE SOURCE OF TRUTH

The AI should have access to:

```text
STRUCTURED STARTUP DATA
+
RELEVANT DOCUMENTS
+
CURRENT DATABASE STATE
+
DECISION HISTORY
+
ACTIVE INITIATIVES
```

The AI must NOT rely only on RAG.

RAG is memory for unstructured information.

The database is the source of truth for structured operational state.

Therefore:

```text
                   STARTUP CONTEXT
                         │
          ┌──────────────┼──────────────┐
          ▼              ▼              ▼
     Structured DB      RAG       Operational State
          │              │              │
          └──────────────┼──────────────┘
                         ▼
                   CEO ORCHESTRATOR
```

---

# 10. JARVIS MUST USE THE USER'S DATA

After onboarding, when the founder enters a command:

```text
What should I focus on this week?
```

JARVIS must use that specific startup's context.

It must NOT use:

* demo data
* global data
* another user's data
* hardcoded startup data
* generic seed context

The request should resolve:

```text
Authenticated User
       ↓
Startup / Workspace
       ↓
Startup Context
       ↓
JARVIS
```

---

# 11. EVERY COMMAND MUST BE STARTUP-SCOPED

Every command should carry a trustworthy context:

```text
userId
startupId
commandId
conversationId
```

The backend should derive these from authentication/session state wherever possible.

Do not trust a random frontend-provided startup ID without authorization validation.

---

# 12. JARVIS COMMAND WORKFLOW

When a founder enters a command:

```text
Founder Command
      ↓
Authenticate
      ↓
Resolve Startup
      ↓
Load Startup Context
      ↓
Understand Intent
      ↓
Determine Required Data
      ↓
Retrieve Relevant RAG Context
      ↓
Select Relevant Agents
      ↓
Execute Required Tools
      ↓
Multi-Agent Collaboration
      ↓
Auditor Verification
      ↓
CEO Synthesis
      ↓
Risk / Approval Check
      ↓
Persist Result
      ↓
Notify Founder
      ↓
Return Answer
```

This is the canonical workflow.

---

# 13. DO NOT RUN ALL AGENTS FOR EVERY QUESTION

The workflow must be optimized.

Example:

## Question

```text
What is our current runway?
```

Do:

```text
CEO / intent
 ↓
Startup financial state
 ↓
Deterministic calculation
 ↓
CFO interpretation
 ↓
Answer
```

Do NOT run:

```text
Talent
Growth
Legal
Operations
Investment
```

---

# 14. COMPLEX QUESTIONS SHOULD ACTIVATE MULTIPLE AGENTS

Example:

```text
Can we hire two senior engineers and launch the product next month?
```

Potential workflow:

```text
CEO
 │
 ├── Talent
 │
 ├── CFO
 │
 ├── Operations
 │
 ├── Growth
 │
 └── Legal
        ↓
     Auditor
        ↓
     CEO synthesis
        ↓
     Approval
```

The CEO should dynamically decide which agents are relevant.

Do not hardcode:

```text
if message contains "hire"
```

as the only routing mechanism.

Use structured intent/orchestration.

---

# 15. QUESTION → SUPPORTING DATA → AI SYNTHESIS

This is a critical UX requirement.

Every meaningful JARVIS response should have two layers:

## Layer 1 — Supporting Data

Show the actual evidence used.

For example:

```text
SUPPORTING DATA

Cash Balance
₹2,45,000

Monthly Burn
₹18,500

Runway
13.2 months

Source
Financial Model
```

or:

```text
SUPPORTING DATA

Current Team
8 employees

Hiring Budget
₹...
```

or:

```text
SOURCES

[CIT-1] Pitch Deck
[CIT-2] Financial Plan
```

Only display data that actually supports the answer.

---

# 16. LAYER 2 — AI EXECUTIVE SYNTHESIS

Then show:

```text
JARVIS

Based on the current company data, your runway is
approximately 13.2 months.

The main consideration is...

I would prioritize...
```

This should be actual AI synthesis.

Do NOT expose private chain-of-thought.

Use:

```text
Executive reasoning summary
```

rather than internal model reasoning.

---

# 17. NEVER INVENT SUPPORTING DATA

If the answer requires data that does not exist:

```text
I don't have verified data for this yet.
```

Do NOT fabricate.

Do NOT use another metric as a substitute.

Do NOT use demo values.

---

# 18. CITATIONS MUST SUPPORT CLAIMS

If JARVIS says:

```text
Your product targets SMBs.
```

there should be a supporting source if that information came from a document.

Example:

```text
[CIT-1] Pitch Deck — Target Market
```

If it came from structured startup profile data:

```text
Source:
Startup Profile
```

Do not add citations just because RAG returned a document.

---

# 19. OPTIMIZED ORCHESTRATION

We need a tiered orchestration model.

## LEVEL 1 — DIRECT DATA

For simple factual queries:

```text
What is our cash balance?
What is our startup name?
What industry are we in?
```

Use structured startup context.

No unnecessary LLM calls.

---

## LEVEL 2 — DATA + DETERMINISTIC TOOL

For:

```text
What is our runway?
What happens to runway if burn increases 20%?
```

Use:

```text
structured data
+
deterministic calculations
+
CFO interpretation
```

---

## LEVEL 3 — RAG + ONE/MORE AGENTS

For:

```text
What are our biggest risks?
What contracts need attention?
What does our roadmap say about Q4?
```

Use relevant:

```text
RAG
+
appropriate agent
```

---

## LEVEL 4 — FULL MULTI-AGENT

For strategic/action-oriented requests:

```text
Should we hire?
Should we launch?
Should we raise?
Create a GTM strategy.
```

Use:

```text
CEO
+
relevant specialists
+
cross-agent collaboration
+
Auditor
+
approval if required
```

This prevents unnecessary token usage and makes the system faster.

---

# 20. CONVERSATION MEMORY

JARVIS must support follow-up questions.

Example:

Founder:

> What is our runway?

JARVIS:

> 13.2 months.

Founder:

> What if we hire two engineers?

The second command should understand the context.

Maintain:

```text
conversationId
command history
relevant previous context
```

But do not dump the entire conversation into every LLM request.

Use summarized/relevant context.

---

# 21. NOTIFICATIONS

The notification section must become an actual operational notification center.

Notifications should be generated from real events.

Examples:

```text
CFO completed analysis
```

```text
Runway risk detected
```

```text
Approval required
```

```text
New document indexed
```

```text
CEO completed strategic analysis
```

```text
Hiring plan requires founder approval
```

```text
Agent conflict detected
```

```text
New executive brief available
```

Do NOT create fake notifications just to populate the UI.

---

# 22. NOTIFICATION DATA MODEL

If an existing notification model exists, reuse it.

Otherwise create a proper model associated with:

```text
User
Startup
Notification
```

Conceptually:

```typescript
Notification {
  id
  startupId
  userId
  type
  title
  message
  severity
  read
  createdAt
  relatedEntityType
  relatedEntityId
}
```

Possible types:

```text
INFO
SUCCESS
WARNING
ACTION_REQUIRED
RISK
AGENT_UPDATE
DOCUMENT
APPROVAL
SYSTEM
```

---

# 23. NOTIFICATION FLOW

Example:

```text
CFO detects runway risk
        ↓
Risk event
        ↓
Notification created
        ↓
Notification panel updates
        ↓
Founder clicks notification
        ↓
Relevant dashboard/entity opens
```

For approval:

```text
Agent recommendation
       ↓
Approval required
       ↓
Notification
       ↓
Founder opens approval
       ↓
Approve / Reject / Modify
```

---

# 24. AGENT SIDE NAVBAR

Add a dedicated **Agents** section to the dashboard side navigation.

The sidebar should have:

```text
Agents
   ▼
   CEO Orchestrator
   CFO / Finance
   Talent
   Growth
   Legal
   Operations
   Investment
   Auditor
```

The main sidebar should remain clean.

Use a collapsible/dropdown interaction.

---

# 25. AGENT DETAIL PAGES / PANELS

When the user selects an agent:

```text
Agents
  ↓
CFO / Finance
```

show a dedicated agent workspace.

It should contain:

### Agent identity

```text
CFO
Finance Executive
```

### Current status

```text
Idle
Analyzing
Collaborating
Generating
Waiting for approval
```

### Responsibilities

Example:

```text
Cash-flow analysis
Runway
Budget constraints
Financial forecasting
Hiring affordability
```

### Current tasks

```text
Current active work
```

### Recent decisions

```text
Recent CFO recommendations
```

### Supporting data

```text
Financial metrics
```

### Relevant documents

```text
Financial plan
Budget
Forecast
```

### Recent activity

```text
Timeline
```

---

# 26. DO NOT FAKE AGENT STATUS

If CFO is shown as:

```text
Analyzing
```

there must be an actual backend execution event.

If CFO is idle:

```text
Idle
```

Do not animate it continuously.

The UI should reflect real orchestration state.

---

# 27. AGENT NAVIGATION SHOULD BE DATA-DRIVEN

Do not hardcode separate pages for every agent if the existing architecture can support a generic agent detail view.

Prefer:

```text
/agents/:agentId
```

with data:

```text
agentId
name
role
description
capabilities
status
tasks
activity
metrics
documents
```

Use the existing agent registry if available.

---

# 28. DASHBOARD INFORMATION ARCHITECTURE

Optimize the dashboard around:

```text
SIDEBAR

Overview
Command Center
Approvals
Knowledge
Decisions
Notifications

Agents
  CEO
  Finance
  Talent
  Growth
  Legal
  Operations
  Investment
  Auditor
```

Main area:

```text
TOP
Founder Command / JARVIS

MIDDLE
Current company state

LOWER
Active initiatives / agent activity / notifications
```

Do not overload the homepage with every detail.

Details belong in dedicated views.

---

# 29. JARVIS COMMAND UI

Keep the central command interface prominent.

Conceptually:

```text
┌──────────────────────────────────────────────┐
│ Ask Catalyst anything...                    │
│                                              │
│ What should I focus on this week?           │
│                                              │
│                            🎙        Send →  │
└──────────────────────────────────────────────┘
```

During execution:

```text
CEO
Understanding...

CFO
Checking financial state...

Operations
Checking milestones...
```

Then:

```text
ANSWER

[Executive synthesis]

SUPPORTING DATA

[Relevant metrics]

SOURCES

[CIT-1] ...
[CIT-2] ...

AGENTS INVOLVED

CEO • CFO • Operations

NEXT ACTION

[Review Plan]
```

---

# 30. ANSWER RENDERING MUST BE STRUCTURED

Do not return one giant text blob.

Use a structured response:

```typescript
{
  commandId,

  status,

  answer: {
    summary,
    details
  },

  supportingData: [
    {
      label,
      value,
      source
    }
  ],

  agents: [
    {
      id,
      role,
      status
    }
  ],

  citations: [
    {
      id,
      title,
      source,
      relevance
    }
  ],

  approval: {
    required,
    id
  },

  notifications: [
    ...
  ]
}
```

Adapt to existing project types.

---

# 31. AI SHOULD ANSWER BASED ON REAL STATE

Example:

User onboarding:

```text
Startup:
Acme AI

Industry:
FinTech

Product:
AI-powered accounting assistant

ICP:
Small businesses

Cash:
₹2,45,000

Burn:
₹18,500
```

Then user asks:

> Should we hire a marketing manager?

JARVIS should have access to that exact context.

The workflow should become:

```text
User
 ↓
Startup = Acme AI
 ↓
CEO
 ↓
Talent
 ↓
CFO
 ↓
Growth
 ↓
RAG relevant documents
 ↓
Financial calculation
 ↓
Auditor
 ↓
CEO synthesis
```

The response should be specific to Acme AI.

---

# 32. STARTUP CONTEXT SHOULD UPDATE OVER TIME

The onboarding information is not static.

If the founder changes:

```text
cash
burn
team
goals
product
ICP
funding
```

the canonical startup context should update.

Likewise:

```text
approved hiring plan
```

should update relevant operational state.

The AI should see the latest state.

---

# 33. DOCUMENTS SHOULD UPDATE KNOWLEDGE

When a founder uploads a document:

```text
Upload
 ↓
Parse
 ↓
Chunk
 ↓
Embed
 ↓
Index
 ↓
Associate with startup
 ↓
Notification:
"Document ready"
```

JARVIS can then use it in future queries.

---

# 34. SECURITY

Every piece of data must be scoped by startup/workspace.

Never allow:

```text
Startup A user
     ↓
Startup B documents
```

RAG queries must include startup/workspace filtering.

Database queries must verify ownership.

Notifications must also be startup/user scoped.

Agent data must be startup scoped.

---

# 35. NO GLOBAL SINGLETON STARTUP STATE

Do NOT keep:

```text
currentStartup = globalVariable
```

or:

```text
startupContext = global mutable object
```

for production user state.

Persistent startup context belongs to the authenticated workspace.

In-memory caches may exist only as caches and must be correctly keyed:

```text
startupId
```

---

# 36. OFFLINE / FAILURE BEHAVIOR

If database fails:

Do NOT silently use another founder's data.

If RAG fails:

```text
RAG unavailable
```

If Gemini fails:

```text
AI service unavailable
```

If an agent fails:

```text
CFO unavailable
```

Do not manufacture a successful synthesis.

---

# 37. GEMINI QUOTA

The existing system has demonstrated Gemini quota errors.

Do not hide them.

Implement proper provider handling.

One command must not create an uncontrolled series of retries.

For:

```text
429 quota exceeded
```

return:

```text
provider_unavailable
```

with an appropriate user-facing message.

Do not fabricate a response.

---

# 38. COMMAND AUDIT TRAIL

Every meaningful JARVIS command should create:

```text
Command
```

with:

```text
commandId
startupId
userId
input
intent
status
createdAt
completedAt
```

If agents execute:

```text
agent activity
```

If an approval is required:

```text
approval
```

If a decision is made:

```text
decision log
```

This creates a real operational history.

---

# 39. OPTIMIZED WORKFLOW

The final system should NOT be:

```text
Every question
 ↓
Every agent
 ↓
Every RAG document
 ↓
Every tool
 ↓
Every LLM
```

Instead:

```text
Question
 ↓
Intent
 ↓
What information is needed?
 ↓
What tools are needed?
 ↓
Which agents are needed?
 ↓
Execute minimum necessary workflow
 ↓
Verify
 ↓
Synthesize
```

This is the optimization principle.

---

# 40. IMPLEMENTATION ORDER

Do this in phases.

## PHASE 1 — DATA RESET

Inspect and safely clear development data.

Verify a clean database.

---

## PHASE 2 — AUTH + USER

Verify signup/login.

Verify authenticated user identity.

---

## PHASE 3 — STARTUP CREATION

Create startup/workspace automatically after signup.

---

## PHASE 4 — ONBOARDING

Build optimized onboarding.

Collect minimum useful startup context.

---

## PHASE 5 — CANONICAL STARTUP CONTEXT

Connect onboarding data to persistent startup state.

---

## PHASE 6 — DOCUMENT INGESTION

Connect uploaded documents to startup-scoped RAG.

---

## PHASE 7 — JARVIS CONTEXT

Make JARVIS load:

```text
startup context
+
current state
+
relevant RAG
```

---

## PHASE 8 — ORCHESTRATOR

Connect JARVIS to the real CEO orchestration workflow.

---

## PHASE 9 — AGENT ROUTING

Implement optimized dynamic agent selection.

---

## PHASE 10 — SUPPORTING DATA + AI SYNTHESIS

Return:

```text
supporting data
+
citations
+
executive synthesis
```

---

## PHASE 11 — NOTIFICATIONS

Connect real events to notification center.

---

## PHASE 12 — AGENT NAVIGATION

Add agent sidebar and detailed agent views.

---

## PHASE 13 — AUDIT + TEST

Test the complete system.

---

# 41. FINAL USER JOURNEY

The final product should feel like:

```text
                NEW USER
                    │
                    ▼
                 SIGN UP
                    │
                    ▼
             CREATE WORKSPACE
                    │
                    ▼
             STARTUP ONBOARDING
                    │
        ┌───────────┼───────────┐
        ▼           ▼           ▼
     Founder     Startup      Business
     Context     Context      Context
                    │
                    ▼
              OPTIONAL DOCS
                    │
                    ▼
              KNOWLEDGE BASE
                    │
                    ▼
                DASHBOARD
                    │
          ┌─────────┼─────────┐
          ▼         ▼         ▼
       JARVIS     AGENTS   NOTIFICATIONS
          │
          ▼
      USER COMMAND
          │
          ▼
    CEO ORCHESTRATOR
          │
    ┌─────┼─────┐
    ▼     ▼     ▼
   RAG   DATA  TOOLS
    │     │     │
    └─────┼─────┘
          ▼
    DYNAMIC AGENTS
          │
          ▼
       AUDITOR
          │
          ▼
    CEO SYNTHESIS
          │
     ┌────┴─────┐
     ▼          ▼
  SUPPORTING   ANSWER
    DATA
     │
     ▼
 NOTIFICATION
     │
     ▼
 PERSISTENT HISTORY
```

---

# 42. DEFINITION OF DONE

Do not declare complete until:

### User

* Can sign up.
* Gets a fresh workspace.
* Cannot see another user's data.

### Onboarding

* Collects useful startup information.
* Does not overwhelm the user.
* Stores data persistently.
* Supports optional documents.

### Startup Context

* Has one canonical source of truth.
* Is available to JARVIS.
* Updates when company state changes.

### JARVIS

* Uses the authenticated startup.
* Uses structured startup data.
* Uses RAG when needed.
* Uses deterministic calculations when needed.
* Dynamically selects agents.
* Does not run unnecessary agents.
* Produces grounded answers.
* Shows supporting data.
* Shows citations where applicable.
* Does not expose chain-of-thought.
* Handles failures honestly.

### Agents

* Appear in sidebar.
* Have detailed views.
* Show real status.
* Show relevant tasks/activity.
* Are startup-scoped.

### Notifications

* Are generated from real system events.
* Are persistent.
* Are user/startup scoped.
* Link to the relevant entity/action.

### Governance

* High-impact actions can require approval.
* Decisions are persisted.
* Decision history is auditable.

### Security

* No global startup context.
* No cross-workspace RAG.
* No unauthorized database access.
* No hardcoded startup ID in production.

### Performance

* Simple queries use simple workflows.
* Complex decisions use multi-agent orchestration.
* Unnecessary Gemini calls are avoided.
* No uncontrolled retry loops.

---

# 43. FINAL VERIFICATION COMMANDS

After implementation, create a fresh test account.

Complete onboarding with:

```text
Startup:
Example AI

Industry:
SaaS

Product:
AI workflow automation

ICP:
Early-stage startups

Cash:
₹2,45,000

Monthly Burn:
₹18,500

Goal:
Reach 100 paying customers
```

Then test:

### Test 1

```text
What is my startup?
```

Expected:
Startup-specific answer.

### Test 2

```text
What is our runway?
```

Expected:
Deterministic calculation.

### Test 3

```text
What should I focus on this month?
```

Expected:
CEO + relevant company context.

### Test 4

```text
Can we hire two engineers?
```

Expected:
Talent + CFO + relevant agents.

### Test 5

Upload a document.

Then ask:

```text
What does our roadmap say about the next milestone?
```

Expected:
RAG + citation + CEO synthesis.

### Test 6

Create an approval-required action.

Verify:

```text
Agent
 ↓
Approval
 ↓
Notification
 ↓
Founder decision
 ↓
Decision log
```

### Test 7

Log out.

Create/login as another test user.

Verify that the second user has a completely separate workspace.

---

# 44. FINAL REPORT

After implementation report:

```text
1. Data reset
2. Signup flow
3. Onboarding flow
4. Startup context architecture
5. JARVIS integration
6. RAG integration
7. Agent orchestration
8. Supporting-data system
9. Notification system
10. Agent sidebar
11. Approval flow
12. Security isolation
13. Performance optimization
14. Files changed
15. Tests performed
16. Remaining limitations
```

For every major claim, verify it against actual code.

Do not say "implemented" unless you tested it.

---

# FINAL PRODUCT PRINCIPLE

Catalyst OS should not feel like:

```text
A dashboard
+
a chatbot
+
some agent cards
```

It should feel like:

```text
A real operating system for a startup.
```

The founder provides context once.

Catalyst remembers the startup.

JARVIS understands the command.

The CEO determines the workflow.

Only the necessary executives participate.

Agents use the actual startup data.

RAG provides supporting evidence.

Deterministic tools provide trusted calculations.

The Auditor verifies the result.

JARVIS gives:

```
    SUPPORTING DATA
          +
    EXECUTIVE SYNTHESIS
          +
    NEXT ACTION
```

Important events become notifications.

High-impact actions go through approval.

Everything important becomes part of the startup's operational history.

Build this as one coherent workflow using the existing Catalyst OS architecture.
Do not create disconnected features.
