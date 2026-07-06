<div align="center">
  <h1> Catalyst OS</h1>
  <p><b>Autonomous Startup Operating System & AI Executive Team</b></p>
  <p align="center">
    <img src="https://img.shields.io/badge/Status-MVP--Development-brightgreen?style=for-the-badge" alt="Status" />
    <img src="https://img.shields.io/badge/React.js-Frontend-blue?style=for-the-badge&logo=react" alt="React" />
    <img src="https://img.shields.io/badge/FastAPI-Python-009688?style=for-the-badge&logo=fastapi" alt="FastAPI" />
    <img src="https://img.shields.io/badge/Gemini-AI-4285F4?style=for-the-badge&logo=google" alt="Gemini" />
    <img src="https://img.shields.io/badge/PostgreSQL-pgvector-336791?style=for-the-badge&logo=postgresql" alt="PostgreSQL" />
  </p>
  <p>
    An AI-powered operating system for founders that coordinates Finance, Hiring, Growth, Legal, Investment, and Operations through collaborating AI executives.
  </p>
  <blockquote>
    <b>One Founder. One Command. An Entire AI Executive Team.</b>
  </blockquote>
</div>

---

## 📑 Table of Contents
- [ Key Features](#-key-features)
- [ Technology Stack](#️-technology-stack)
- [ System Architecture](#️-system-architecture)
- [ User Flow](#-user-flow)
- [ Hallucination Prevention & AI Safety](#-hallucination-prevention--ai-safety)
- [ Agent Loading States](#-agent-loading-states)
- [ Project Structure](#-project-structure)
- [ Getting Started](#-getting-started)
- [ Configuration](#️-configuration)
- [ Run Locally](#️-run-locally)
- [ API Reference](#-api-reference)
- [ Usage / Examples](#-usage--examples)
- [ Database Design](#-database-design)
- [ Scalability](#-scalability)
- [ Roadmap](#️-roadmap)
- [ Optimizations](#-optimizations)
- [ Lessons Learned](#-lessons-learned)
- [ Challenges Faced](#-challenges-faced)
- [ Future Scope](#-future-scope)
- [ Demo Story](#-demo-story)
- [Product Philosophy](#-product-philosophy)
- [ Authors](#-authors)
- [ Feedback &  Support](#-feedback)

---

##  Key Features

###  Smart Founder Onboarding
* **Two onboarding paths:** Start fresh or import an existing startup.
* **Startup context capture:** Industry, stage, team size, revenue, burn rate, runway, funding, budget, and timeline.
* **Document intelligence:** Upload pitch decks, financial statements, roadmaps, hiring documents, policies, contracts, and business plans.
* **Shared context:** Structured startup data becomes grounded context for relevant AI executives.

### Executive Dashboard
* **Startup Health Score:** Real-time metrics with Finance, Hiring, Growth, and Operations sub-scores.
* **Today's Priorities:** Proactive alerts and items needing attention.
* **Executive Cards:** Real-time visibility into agent tasks, status, and latest recommendations.
* **Comprehensive Tracking:** Pending Approvals, Activity Timeline, Notifications, and Daily Executive Brief.
* **Founder Command Box:** Issue objectives via text or voice.

###  CEO Orchestrator
* Understands high-level founder goals and decomposes them into business tasks.
* Selectively routes work to relevant departments.
* Coordinates cross-agent consultation and resolves conflicting recommendations.
* Produces one unified execution plan.

###  Finance / CFO Agent
* Burn-rate and runway calculation.
* Expense and cash-flow analysis & budget validation.
* Hiring affordability checks and scenario simulation.

### Head of Talent
* Resume analysis, candidate ranking, and skill matching.
* Job-description generation and outreach email drafts.
* Mandatory proactive CFO consultation before advancing budget-sensitive hiring recommendations.

###  Head of Growth
* Go-to-market strategy, marketing, and campaign plans.
* LinkedIn, social content, and customer email drafts.
* Launch calendar and KPI suggestions.

###  Legal Executive
* NDA and contract drafting with compliance checklists.
* Policy review, legal-risk flagging, and launch-readiness validation.

###  Investment Executive
* Fundraising-readiness analysis and KPI reviews.
* Investor CRM support, updates, and pitch-deck feedback.

### 🗂 Operations Executive
* Roadmaps, sprint planning, and milestone tracking.
* Deadline, dependency management, and launch-plan adjustment.

###  Executive Collaboration
```text
Founder: "Hire Developers"
          │
          ▼
     Head of Talent
          │
          ▼
 asks CFO: "Can we afford it?"
          │
          ▼
 CFO: "Budget supports one senior hire"
          │
          ▼
 Talent updates recommendation
          │
          ▼
 Operations shifts roadmap
          │
          ▼
 Growth adjusts launch date
          │
          ▼
 CEO presents unified strategy
```

###  Board Vote
```text
Finance Agent:
Reject hiring two engineers

Hiring Agent:
✅ Approve hiring

Operations Agent:
 Approve one hire only

CEO Recommendation:
 Hire one engineer now and review runway next month
```

###  Founder Approval Center
* High-risk actions (hiring, spending, campaigns, legal documents, external communications) require **explicit human approval**.
* **Approve, Reject, or Edit** directly within the UI.
* Rejected actions are logged securely without silently disrupting the startup state.

###  Explainable AI
```text
Recommendation:
Hire Rahul

Why?
✓ 94% Skill Match
✓ Salary Within Approved Budget
✓ Relevant Startup Experience

Confidence:
91%

Sources:
- backend_role_requirements.pdf
- candidate_rahul_resume.pdf
- hiring_budget_q3.xlsx
```

###  Auditable Decision Log
* Securely stores timestamp, founder command, executive, recommendation, reason, confidence, evidence, founder decision, and final status.

### Startup Health Score
| Department | Score |
| :--- | :--- |
| **Overall** | **83** |
| Finance | 92 |
| Hiring | 71 |
| Growth | 88 |
| Operations | 82 |

###  Knowledge Base & RAG
* Upload pitch decks, financial reports, roadmaps, policies, contracts, business plans, and resumes.
* Retrieve **only relevant chunks** to ground recommendations in startup-specific evidence.
* Semantic memory powered by **PostgreSQL** and **pgvector**.

###  Scenario Simulator
* Ask *"What if we hire three more engineers?"* and automatically recalculate runway, burn rate, Health Score, hiring plan, launch date, and marketing timeline.

###  Voice Interface
* Issue founder commands using voice, accurately transcribed via **Whisper / Faster-Whisper**, and routed intuitively through the CEO Orchestrator.

###  Daily Executive Brief
```text
Good Morning.

Today's Priorities
- 3 approvals pending
- Hiring is behind schedule
- Launch is on track

Runway
- 5.2 months

Critical Alert
- Burn rate increased this week
```

---

##  Technology Stack

| Layer | Technology |
| :--- | :--- |
| **Frontend** | React.js, Tailwind CSS |
| **Backend** | FastAPI (Python) |
| **AI Orchestration** | LangGraph / LangChain |
| **LLM** | Gemini |
| **Voice AI** | Whisper, Faster-Whisper |
| **RAG Pipeline** | LlamaIndex + pgvector |
| **Database / Storage** | PostgreSQL |
| **Vector Database** | pgvector |
| **Authentication** | Clerk |
| **Deployment** | Render |

---

##  System Architecture

```text
                    Founder UI
                (Text / Voice Input)
                         │
                         ▼
                 CEO Orchestrator
                         │
          ┌──────────────┼──────────────┐
          ▼              ▼              ▼
       Finance        Hiring          Growth
          │              │              │
          ├──────────────┼──────────────┤
          ▼              ▼              ▼
        Legal        Investment      Operations
          │              │              │
          └──────────────┼──────────────┘
                         ▼
                Shared Startup Memory
              PostgreSQL + pgvector
                         │
                         ▼
                   Auditor Agent
                         │
                         ▼
                  Approval Center
                         │
                         ▼
        Dashboard • Timeline • Health Score
```

### Selective Agent Execution
```text
"Generate an NDA"
Planner → Legal → Auditor → Approval
```
```text
"Can we hire two engineers?"
Planner → Finance + Hiring → CEO → Auditor → Approval
```

---

##  User Flow

```text
Landing Page
     │
     ▼
Get Started / Demo Startup
     │
     ├───────────────┐
     ▼               ▼
Start Fresh      Import Data
     │               │
     └───────┬───────┘
             ▼
   Company Context Created
             │
             ▼
      Dashboard Loads
       + Daily Brief
             │
             ▼
 Founder Issues Command
      Text or Voice
             │
             ▼
Collaboration Engine Runs
             │
             ▼
   Final Summary Appears
             │
             ▼
 Founder Expands "Why?"
             │
             ▼
      Approval Center
       /      |      \
      ▼       ▼       ▼
  Approve   Reject    Edit
      \       |       /
             ▼
     Dashboard Updates
             │
             └──────────────► Next Founder Command
```

---

##  Hallucination Prevention & AI Safety

### Structured Outputs
```json
{
  "recommendation_name": "Hire one backend engineer",
  "why_reasons": [
    "Current roadmap contains a backend delivery dependency",
    "Approved hiring budget supports one role"
  ],
  "confidence_score": 0.91,
  "source_documents": [
    "roadmap_q3.pdf",
    "hiring_budget.xlsx"
  ]
}
```

### Missing-Data Rules
```text
If evidence is unavailable:
Return DATA_MISSING.

Do not guess.
Do not invent.
Do not silently extrapolate.
```

### Deterministic Critical Calculations
Critical calculations use Python functions, SQL queries, validated business logic, and structured source data. The LLM explains results; deterministic tools calculate critical numbers.

###  Auditor Agent
```text
Executive Outputs
       │
       ▼
Unified Plan
       │
       ▼
Auditor Agent
       │
       ▼
Check:
- Unsupported claims?
- Missing citations?
- Contradictions?
- Invalid calculations?
- Hidden assumptions?
       │
   ┌───┴───┐
   ▼       ▼
 PASS     FAIL
   │       │
   ▼       ▼
Approval  Return to
Center    Responsible Agent
```

---

##  Agent Loading States

| Department | Loading Examples |
| :--- | :--- |
| **Finance** | Checking runway • Forecasting expenses • Validating budget • Reviewing burn rate |
| **Hiring** | Creating JD • Searching applicants • Ranking resumes • Scheduling interviews • Drafting emails |
| **Growth** | Planning campaign • Building GTM strategy • Forecasting user acquisition • Generating content |
| **Legal** | Reviewing compliance • Preparing contracts • Validating launch readiness • Checking policy requirements |
| **Investments** | Analyzing KPIs • Reviewing fundraising readiness • Drafting investor update • Evaluating valuation signals |
| **CEO / Orchestrator** | Breaking down objective • Coordinating departments • Resolving conflicts • Building execution plan |

---

##  Project Structure

```text
Catalyst-Os/
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── dashboard/
│   │   │   ├── agents/
│   │   │   ├── approvals/
│   │   │   ├── onboarding/
│   │   │   └── shared/
│   │   ├── pages/
│   │   ├── hooks/
│   │   ├── services/
│   │   └── utils/
│   ├── public/
│   └── package.json
├── backend/
│   ├── app/
│   │   ├── main.py
│   │   ├── api/
│   │   ├── agents/
│   │   ├── orchestration/
│   │   ├── rag/
│   │   ├── schemas/
│   │   ├── services/
│   │   └── db/
│   ├── requirements.txt
│   └── tests/
├── docs/
├── .env.example
├── .gitignore
├── LICENSE
└── README.md
```
> *Adjust this structure to match the actual repository before release.*

---

##  Getting Started

### Prerequisites
- Node.js v18+
- npm
- Python 3.11+
- PostgreSQL
- pgvector extension
- Git

### Installation

1. **Clone the repository:**
   ```bash
   git clone <YOUR_REPOSITORY_URL>
   cd Catalyst-Os
   ```

2. **Install frontend dependencies:**
   ```bash
   cd frontend
   npm install
   ```

3. **Create backend virtual environment:**
   ```bash
   cd ../backend
   python -m venv venv
   ```

4. **Activate the virtual environment:**
   *Windows:*
   ```bash
   venv\Scripts\activate
   ```
   *macOS / Linux:*
   ```bash
   source venv/bin/activate
   ```

5. **Install backend dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

---

## 🛠️ Configuration

Create a `.env` file in the backend directory:

```env
APP_ENV=development
FRONTEND_URL=http://localhost:3000
BACKEND_URL=http://localhost:8000

DATABASE_URL=postgresql://USER:PASSWORD@HOST:5432/DATABASE_NAME

CLERK_SECRET_KEY=your_clerk_secret_key
CLERK_PUBLISHABLE_KEY=your_clerk_publishable_key

GEMINI_API_KEY=your_gemini_api_key

WHISPER_MODEL=base

GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
```
> **Security Note:** Never commit real API keys, passwords, access tokens, private keys, or production credentials to Git.

### PostgreSQL + pgvector Setup
```sql
CREATE EXTENSION IF NOT EXISTS vector;
```

---

##  Run Locally

**Start Frontend**
```bash
cd frontend
npm run dev
```

**Start Backend**
Open another terminal:
```bash
cd backend
uvicorn app.main:app --reload
```

**Typical local addresses:**
```text
Frontend: http://localhost:3000
Backend:  http://localhost:8000
API Docs: http://localhost:8000/docs
```

---

##  API Reference

### Create Startup Context
```http
POST /api/v1/onboarding
```
| Parameter | Type | Description |
| :--- | :--- | :--- |
| `startup_name` | string | **Required.** Startup name |
| `industry` | string | **Required.** Startup industry |
| `stage` | string | Startup stage |
| `team_size` | integer | Current team size |
| `revenue` | number | Current revenue |
| `burn_rate` | number | Monthly burn rate |
| `runway` | number | Current runway |

### Submit Founder Command
```http
POST /api/v1/commands
```
| Parameter | Type | Description |
| :--- | :--- | :--- |
| `startup_id` | string | **Required.** Startup identifier |
| `command` | string | **Required.** Founder objective |
| `input_type` | string | `text` or `voice` |

### Approval APIs
```http
GET /api/v1/approvals
POST /api/v1/approvals/{id}/approve
POST /api/v1/approvals/{id}/reject
PATCH /api/v1/approvals/{id}
```

### Other APIs
```http
POST /api/v1/documents
GET  /api/v1/decisions
GET  /api/v1/health-score
POST /api/v1/scenarios/simulate
POST /api/v1/voice/transcribe
```

---

##  Usage / Examples

### Founder Workflow
1. Register or log in.
2. Create or import a startup via smart onboarding.
3. Upload startup documents.
4. Open the Executive Dashboard.
5. Enter one high-level command.
6. Watch relevant executives collaborate.
7. Review the Board Vote.
8. Expand **Why?** to inspect evidence and confidence ratings.
9. Approve, reject, or edit.
10. View the updated dashboard and Health Score.
11. Run a what-if scenario.

### Example Command
```text
"Can we hire a backend engineer and still launch next month?"
```

---

##  Database Design
Suggested core entities scoped using `user_id`, `startup_id`, and `workspace_id` to prevent context leakage:
```text
users
workspaces
startups
startup_members
startup_metrics
documents
document_chunks
founder_commands
agent_runs
agent_messages
recommendations
board_votes
approvals
decisions
tasks
notifications
activity_events
health_scores
scenario_runs
integration_connections
```

---

##  Scalability

### Horizontal Agent Scalability
```text
Create Tools
    │
    ▼
Create Agent Prompt
    │
    ▼
Define Structured Schema
    │
    ▼
Register Graph Node
    │
    ▼
Add Routing Rule
```

### Infrastructure Scalability
- Stateless FastAPI instances
- Load balancing
- PostgreSQL replicas
- Redis caching
- Celery background workers
- WebSocket event streams
- Dedicated STT/TTS workers
- Object storage

### AI Cost Scalability
- Conditional agent activation
- RAG-based context minimization
- Cached startup context
- Deterministic tools before LLM calls
- Smaller models for classification
- Larger models only for complex reasoning
- Parallel execution where appropriate

---

##  Roadmap

### Tier 1 — Core MVP
- [ ] Founder onboarding
- [ ] Real authentication
- [ ] Persistent PostgreSQL state
- [ ] CEO Orchestrator
- [ ] Finance Agent
- [ ] Hiring Agent
- [ ] Legal Agent
- [ ] Founder command dashboard
- [ ] Approval gate
- [ ] Decision log
- [ ] RAG over startup documents
- [ ] Error handling
- [ ] Responsive UI

### Tier 2 — Differentiators
- [ ] Startup Health Score
- [ ] Explainable AI decisions
- [ ] Live collaboration visualization
- [ ] Task and decision timeline
- [ ] Approval queue
- [ ] Confidence indicators
- [ ] Cross-agent context sharing
- [ ] Notifications
- [ ] Search and filtering
- [ ] Demo startup seed mode
- [ ] Board Vote
- [ ] Auditor Agent

### Tier 3 — Stretch
- [ ] Voice interface
- [ ] Scenario simulation
- [ ] Real-time streaming responses
- [ ] Investor update generator
- [ ] Board report generation
- [ ] Meeting notes to tasks
- [ ] Risk prediction
- [ ] Startup memory search
- [ ] Smart goal tracker
- [ ] Google Workspace integration
- [ ] AI usage and cost dashboard
- [ ] Guardrail demonstration

---

##  Optimizations
* Selective agent execution
* PostgreSQL for structured persistent state
* pgvector for semantic retrieval
* RAG for relevant document chunks
* Structured outputs to reduce text drift
* Deterministic critical calculations
* Auditor Agent validation
* Explicit approval for high-risk actions
* Searchable decision history
* Parallel execution for independent agents
* Modular orchestration, agent, RAG, API, and database layers
* Graceful degradation when AI or external APIs fail

---

## Lessons Learned
* Designing hierarchical multi-agent AI systems
* Building cross-agent collaboration workflows
* Implementing task routing with LangGraph and LangChain
* Creating FastAPI AI services
* Managing persistent state with PostgreSQL
* Building RAG pipelines with LlamaIndex and pgvector
* Designing human-in-the-loop workflows
* Reducing hallucinations with structured outputs and evidence validation
* Managing context across specialized AI departments
* Building explainable recommendations
* Designing scalable multi-tenant systems
* Integrating voice input

---

##  Challenges Faced
* Maintaining consistent shared context across agents
* Preventing hallucinated financial and hiring metrics
* Resolving conflicting recommendations
* Keeping multi-agent latency manageable
* Designing safe approval gates
* Structuring startup memory efficiently
* Isolating multi-tenant startup data
* Balancing reasoning quality with API cost
* Building smooth live collaboration
* Handling failures without exposing raw errors

---

##  Future Scope
* Additional AI departments
* Multi-startup workspace switching
* Advanced role-based access
* Gmail, Calendar, Drive, and Slack integrations
* Board-report generation
* Risk prediction
* Advanced financial forecasting
* Redis caching
* Celery task queues
* WebSocket collaboration streams
* Enterprise audit controls

---

##  Demo Story
```text
Founder Logs In
      │
      ▼
Dashboard Loads
Health Score + Today's Priorities
      │
      ▼
Founder Enters One Goal
      │
      ▼
CEO Analyzes Request
      │
      ▼
Executive Collaboration Animates
      │
      ▼
Departments Consult Each Other
      │
      ▼
Board Vote Shows Agreement / Conflict
      │
      ▼
CEO Produces Unified Recommendation
      │
      ▼
Founder Opens "Why?"
      │
      ▼
Auditor-Validated Evidence Appears
      │
      ▼
High-Risk Action Enters Approval Center
      │
      ▼
Founder Approves / Rejects / Edits
      │
      ▼
Dashboard + Health Score Update
      │
      ▼
Scenario Simulation:
"What if we hire one more engineer?"
```

---

##  Product Philosophy

> **"Does this reduce the founder's workload by automating an entire workflow, or is it just another AI tool?"**

If it automates an end-to-end workflow such as hiring, launching, budgeting, or planning, it belongs in Catalyst OS. If it only generates isolated content, it is not enough.

> **That is the difference between an AI assistant and an AI operating system.**

---

##  Authors
Add your team members here:
* [@your-github-username](https://github.com/your-github-username)
* [@team-member-2](https://github.com/team-member-2)
* [@team-member-3](https://github.com/team-member-3)

---

##  Feedback
If you have feedback, suggestions, or feature requests, feel free to open an issue in the repository or connect with the team through GitHub.

##  Support
If you found this project useful, consider giving it a STAR on GitHub!

##  License
This project is licensed under the MIT License - see the `LICENSE` file for details.

---

<div align="center">
  <h2> Catalyst OS</h2>
  <p><b>One Founder. One Command. An Entire AI Executive Team.</b></p>
  <i>Today's founders do not need another AI tool. They need an operating system that thinks, collaborates, explains, and executes alongside them.</i>
</div>
