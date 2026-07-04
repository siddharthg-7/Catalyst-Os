# Catalyst OS Architecture: Finance Executive Agent

This document details the operational specification, prompting strategies, and programmatic interfaces for the **Finance Executive Agent (Marcus Sterling)**.

---

## 1. Agent Workflow

The Finance Agent monitors and protects the company's financial health, specifically protecting the runway and cash balances from excessive burn rate.

```text
[Subtask Received from CEO]
            │
            ▼
[RAG Ingestion] ── Read bank state, balance sheets, and historical burn records
            │
            ▼
[Calculations Loop]
            ├─► Calculate runway: Runway = Cash Balance / Burn Rate
            ├─► Affordability Index: Verify if (Current cash - hiring cost) preserves 12-month runway
            └─► Cost Optimization: Search for redundant SaaS/cloud infrastructure expenses
            │
            ▼
[Financial Recommendation Generation] ── Write detailed, reasoned budget limits
            │
            ▼
[Conflict Verification] ── Tag clashes with other agent demands (e.g. Growth budget increases)
            │
            ▼
[Dispatch Output] ── Send parsed JSON results back to CEO
```

---

## 2. Prompt Template (System Persona)

The standard prompt template used to configure the Finance Agent's reasoning:

```markdown
You are Marcus Sterling, the automated Chief Financial Officer (CFO) for Catalyst OS.
Your core priority is ensuring financial sustainability, protecting runway, and structuring unit economics.

### FINANCIAL STRATEGY STANDARDS:
1. Always calculate exact runway: Cash / Burn. Highlight when runway dips below 12 months.
2. Ingest and review financial worksheets, cap tables, and balance sheets retrieved via RAG.
3. Every recommendation you make MUST contain an explicit mathematical explanation of:
   - Base cash reduction.
   - Project run-rate changes.
   - Long-term runway shifts.
4. When other agents propose expenses (e.g. Talent proposing a high hire, Growth demanding a marketing spend):
   - Check if current cash balance accommodates the outlay.
   - If runway drops below 11 months, raise a formal financial conflict ("isConflict: true").
   - Offer an alternative cost-savings compromise (e.g., higher stock equity in lieu of cash salary, or staggered marketing budgets).
```

---

## 3. Tool Calls & RAG Integration

The Finance Agent uses the following programmatic tools to read actual corporate records:

### Tool: `get_financial_sheets`
- **Description**: Accesses the current financial worksheets, ledger CSVs, and SaaS invoices stored in the Knowledge Base.
- **Arguments**:
  ```json
  {
    "quarter": "Q3_2026",
    "requiredCategories": ["payroll", "cloud_spend", "marketing"]
  }
  ```

### Tool: `calculate_runway_impact`
- **Description**: Simulates the effect of adding new ongoing expenses on the company's survival horizon.
- **Arguments**:
  ```json
  {
    "baseSalary": 128000,
    "oneTimeFees": 5000,
    "equityDilution": 0.012
  }
  ```

---

## 4. Input / Output Protocol (JSON Schema)

The Finance Agent outputs structured data indicating the results of its treasury auditing.

### Output Schema
```json
{
  "agentId": "finance",
  "runwayMonthsBefore": 13.2,
  "runwayMonthsAfter": 12.1,
  "treasuryDelta": -10666.00,
  "recommendations": [
    {
      "id": "rec_fin_01",
      "title": "Stagger lead engineer hire to Q4",
      "description": "Adjusting base salary to $128,000 saves $1,416/mo in burn compared to Talent's proposal, securing 1.1 additional months of runway.",
      "financialImpact": -10666.00,
      "riskRating": "low"
    }
  ],
  "isConflict": true,
  "conflictReason": "Talent proposed $145,000 base salary, which pushes the company's operational monthly burn rate to $30,500, dropping runway to 8.0 months. This is a violation of our 11-month buffer guideline."
}
```

---

## 5. Integration APIs

The Finance Agent coordinates with other microservices via the following internal routes:

- **`/api/finance/burn-chart`**: Generates a dynamic projection chart of cash-depletion velocity over time.
- **`/api/finance/affordability-check`**: Accessible by the Talent Agent before drafting employment contracts to instantly verify budget availability.
- **`/api/finance/reconciliation`**: Automatically registers approved deliverables, mutating the state metrics on the core startup profile.
