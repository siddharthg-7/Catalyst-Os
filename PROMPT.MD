# TASK 01 — CATALYST OS COMPLETE CODEBASE AUDIT

## IMPORTANT

This is an AUDIT ONLY task.

DO NOT:

* modify any source code
* rename files
* move files
* delete files
* create new application files
* refactor code
* install dependencies
* change package.json
* change database schema
* change environment variables
* change application behavior
* "fix" bugs
* format the entire project

Your only job is to inspect and document the CURRENT state of the repository.

The project is Catalyst OS.

Before doing anything, inspect the complete repository structure and understand how the existing system actually works.

Do NOT rely only on README/documentation. Inspect the actual source code.

---

# 1. COMPLETE FILE INVENTORY

Generate a complete tree of the relevant project.

For every directory, identify its purpose.

Classify files into:

* FRONTEND
* NODE BACKEND
* PYTHON BACKEND
* DATABASE
* AI / AGENTS
* RAG / KNOWLEDGE
* AUTHENTICATION
* API
* UI COMPONENTS
* CONFIGURATION
* INFRASTRUCTURE
* TESTS
* DOCUMENTATION
* GENERATED FILES
* TEMPORARY / EXPERIMENTAL
* UNKNOWN

Do not delete or move anything.

---

# 2. ENTRY POINTS

Identify every actual runtime entry point.

For each one provide:

* file
* command used to start it
* technology
* what it initializes
* what it connects to

Examples may include:

* React/Vite entry
* Express server
* Python/FastAPI server
* LangGraph
* database initialization
* background workers

Trace the startup flow.

---

# 3. FRONTEND ARCHITECTURE

Inspect the React application.

Identify:

* App entry
* routing
* layouts
* pages
* components
* hooks
* contexts
* state management
* API/service layer
* types
* authentication
* AI/chat UI
* approval UI
* dashboard
* knowledge/RAG UI
* workflow UI

For each major area, identify its actual file path.

Also identify:

* duplicated components
* components that appear unused
* components that directly call APIs
* components containing business logic that should probably be elsewhere

DO NOT change them.

---

# 4. NODE BACKEND ARCHITECTURE

Trace the Express backend.

Identify:

* server entry
* routes
* controllers
* services
* middleware
* authentication
* database access
* AI services
* RAG services
* document parsing
* voice/STT/TTS
* agent orchestration
* approval system
* external integrations

For every API route provide:

METHOD
PATH
FILE
HANDLER
SERVICE USED
DATABASE USED
EXTERNAL SERVICE USED

---

# 5. PYTHON / FASTAPI ARCHITECTURE

Inspect the Python service completely.

Identify:

* FastAPI entry point
* routers
* services
* agents
* LangGraph graphs
* nodes
* tools
* models
* database access
* configuration
* audio processing
* simulation
* external AI providers

Trace the actual execution flow.

---

# 6. AI AGENT ARCHITECTURE

Identify every agent currently implemented.

For each agent provide:

* agent name
* file
* purpose
* model/provider
* tools
* inputs
* outputs
* dependencies
* whether it is actually called anywhere
* whether it is documented but not implemented

Then identify the orchestration mechanism.

Show the actual flow:

USER REQUEST
→ ORCHESTRATOR
→ AGENT
→ TOOLS
→ DATABASE / RAG
→ RESULT
→ APPROVAL / RESPONSE

Do not infer this from names. Trace imports and function calls.

---

# 7. RAG / KNOWLEDGE SYSTEM

Trace the complete RAG pipeline.

Identify:

DOCUMENT UPLOAD
→ PARSING
→ CHUNKING
→ EMBEDDING
→ STORAGE
→ RETRIEVAL
→ RERANKING (if any)
→ CONTEXT
→ LLM
→ RESPONSE

Identify the actual files implementing each stage.

Also identify duplicate or competing RAG implementations.

Do not modify them.

---

# 8. DATABASE

Inspect Prisma schema and all database-related code.

Identify:

* models
* relationships
* indexes
* vector-related fields
* migrations
* database services
* direct SQL
* Prisma usage
* duplicate database access patterns

Create a simple relationship diagram.

Example:

USER
↓
STARTUP
↓
COMMAND
↓
PLAN
↓
TASK
↓
APPROVAL

Only include relationships that actually exist.

---

# 9. API DEPENDENCIES

Create a map:

FRONTEND
↓
API
↓
NODE
↓
PYTHON
↓
DATABASE / AI / EXTERNAL SERVICE

Identify direct frontend-to-database or frontend-to-AI connections if they exist.

---

# 10. ENVIRONMENT VARIABLES

Inspect all configuration references.

Create a table:

VARIABLE
USED BY
PURPOSE
REQUIRED/OPTIONAL
DEFAULT/FALLBACK
WHERE REFERENCED

DO NOT expose actual secret values.

Never print API keys, tokens, passwords, database passwords, private keys, or credentials.

Use:

<REDACTED>

instead.

---

# 11. DUPLICATION / TECHNICAL DEBT

Identify:

* duplicate files
* duplicate services
* duplicate APIs
* duplicate agent implementations
* old implementations
* abandoned experiments
* conflicting architectures
* unused dependencies
* dead code
* overly large files
* mixed responsibilities
* circular dependencies
* frontend business logic
* backend business logic duplicated across Node/Python

Do not fix anything.

---

# 12. BUILD / RUN HEALTH

Run ONLY SAFE, NON-MUTATING verification commands if available.

Examples:

* dependency/type checking
* build
* lint
* tests

Do NOT install packages.

Do NOT automatically modify lockfiles.

Report:

COMMAND
RESULT
ERROR/WARNING
LIKELY LOCATION

If a command modifies files, DO NOT run it.

---

# 13. CRITICAL: DOCUMENTED VS ACTUAL

Create three categories:

### A. DOCUMENTED + IMPLEMENTED

Features clearly documented and actually implemented.

### B. DOCUMENTED BUT PARTIALLY IMPLEMENTED

Documentation claims something that is incomplete.

### C. DOCUMENTED BUT NOT FOUND

Documentation claims functionality that you cannot locate in the source.

Also create:

### D. IMPLEMENTED BUT NOT DOCUMENTED

Important functionality found in source code but missing from the documentation.

---

# 14. ARCHITECTURAL PROBLEMS

Identify the TOP 15 structural problems that make this project difficult to maintain.

For each:

PROBLEM
LOCATION
EVIDENCE
WHY IT IS A PROBLEM
RISK
SUGGESTED FUTURE DIRECTION

Do NOT implement the solution.

---

# 15. PROPOSED CLEAN ARCHITECTURE

Based ONLY on the existing implementation, propose a cleaner target architecture.

Do NOT modify the repository.

Show:

* frontend structure
* Node backend structure
* Python AI structure
* shared types
* database layer
* agent layer
* RAG layer
* integration layer
* configuration
* tests

Clearly distinguish:

CURRENT
vs
PROPOSED

---

# 16. CLEANUP PLAN

Create a phased cleanup plan.

Example:

PHASE 1 — Inventory
PHASE 2 — Remove obvious junk
PHASE 3 — Organize frontend
PHASE 4 — Organize Node backend
PHASE 5 — Organize Python backend
PHASE 6 — Consolidate AI agents
PHASE 7 — Consolidate RAG
PHASE 8 — Database cleanup
PHASE 9 — Tests
PHASE 10 — Documentation

But do NOT assume these phases are correct. Adapt them to what you actually discover.

---

# 17. FINAL REPORT FORMAT

Return ONLY a structured report.

Use this structure:

# CATALYST OS — CODEBASE AUDIT

## 1. Executive Summary

## 2. Repository Tree

## 3. Runtime / Entry Points

## 4. Frontend Architecture

## 5. Node Backend Architecture

## 6. Python Backend Architecture

## 7. AI Agent Architecture

## 8. RAG Architecture

## 9. Database Architecture

## 10. API Map

## 11. Environment / Configuration

## 12. Duplication

## 13. Dead / Experimental Code

## 14. Build / Test Health

## 15. Documented vs Actual

## 16. Top Architectural Problems

## 17. Proposed Target Architecture

## 18. Recommended Cleanup Phases

## 19. Files That Should NOT Be Touched Yet

## 20. Questions / Unknowns

---

# MOST IMPORTANT RULE

DO NOT MODIFY THE PROJECT.

This task is purely reconnaissance.

At the end explicitly state:

AUDIT COMPLETE
FILES MODIFIED: 0
FILES DELETED: 0
FILES MOVED: 0
FILES CREATED: 0
DEPENDENCIES CHANGED: 0
DATABASE CHANGED: NO
