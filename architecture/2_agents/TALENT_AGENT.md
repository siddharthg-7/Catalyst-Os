# FounderOS Architecture: Head of Talent Agent

This document details the operational capabilities, internal workflows, and backend interfaces for the **Head of Talent Agent (Evelyn Brooks)**.

---

## 1. Agent Capabilities

The Talent Agent manages team building, options pool structures, and hiring pipelines.
- **RAG Resume Parsing**: Ingests resume PDFs and cover letters to search and rank profiles based on role criteria.
- **Compensation Structuring**: Configures optimal salary/equity ratios in alignment with standard industry benchmarks.
- **Candidate Scoring**: Analyzes candidate interviews, technical test outputs, and background histories to score technical and cultural alignment.
- **Inter-agent Inquiries**: Automatically pings the Finance Agent (CFO) to verify if the budget accommodates a proposed salary package before final submission.

---

## 2. Agent Workflow

The Talent Agent operates using a multi-step parsing and validation loop:

```text
[Hiring Mandate Received] ── (e.g., "Need to hire a Senior Platform Engineer")
           │
           ▼
[Document Query] ── Search Knowledge Base for Job Templates & Resume files
           │
           ▼
[Resume Parsing & Scoring]
           ├─► Extract skills, experience, and education metadata
           ├─► Rank applicants from 0 to 100 based on alignment
           └─► Flag outstanding or exceptional profiles
           │
           ▼
[Budget Validation] ── Inquire CFO (Finance Agent) for current budget parameters
           │
           ▼
[Negotiation & Compensation Planning]
           ├─► Draft compensation option (e.g., $130,000 base + 1.2% options)
           └─► Define vesting schedules and cliffs
           │
           ▼
[Document Synthesis] ── Generate formal job descriptions and offer contracts
           │
           ▼
[Dispatch Output] ── Send parsed results and draft contracts back to CEO Planner
```

---

## 3. Backend Architecture & API Definitions

The Talent Agent relies on specific backend service endpoints and schemas to execute automated hiring simulations.

### Internal Agent APIs

#### `POST /api/talent/score-candidates`
- **Description**: Parses a set of uploaded resume PDFs, compares them to a job description draft, and scores them.
- **Payload Schema**:
  ```json
  {
    "jobDescriptionId": "jd_cloud_9",
    "resumes": [
      {
        "candidateName": "Jane Doe",
        "rawText": "...Senior Backend Engineer with 6 years experience in Node.js, Kubernetes, Rust..."
      }
    ]
  }
  ```
- **Response Schema**:
  ```json
  {
    "rankings": [
      {
        "candidateName": "Jane Doe",
        "score": 92,
        "alignmentSummary": "Exceptional technical alignment with Kubernetes and Node.js. Highlighted experience scaling distributed systems.",
        "recommendedCompensation": {
          "salaryBase": 130000,
          "equityPercent": 1.2
        }
      }
    ]
  }
  ```

#### `GET /api/talent/benchmarks`
- **Description**: Retrieves average salary and equity benchmarks based on funding stage and startup industry.
- **Response**:
  ```json
  {
    "industry": "B2B SaaS / DevTools",
    "fundingStage": "Pre-Seed",
    "role": "Lead Platform Engineer",
    "salaryP50": 125000,
    "salaryP90": 155000,
    "equityPercentRange": "1.0% - 2.0%"
  }
  ```

---

## 4. Prompt Template (System Persona)

```markdown
You are Evelyn Brooks, the Head of Talent Agent for FounderOS.
Your primary role is evaluating, scoring, and hiring world-class team members while designing optimal options pools.

### PIPELINE EXPECTATIONS:
1. Parse resume data objectively, scoring candidates out of 100 based on exact technical stack and startup compatibility.
2. Formulate highly attractive compensation proposals balancing base cash salary with options.
3. Always ask the Finance Agent ("Marcus Sterling") if the company runway and budget allow for a proposed base salary before finalizing an offer.
4. Draft comprehensive, clear, and compelling employment offer packages with standard 1-year cliff, 4-year vesting schedules.
```
