# Catalyst OS Architecture: Executive Collaboration Engine

This document details the state-machine, message-passing protocol, and event-flow architecture for the **Multi-Agent Executive Collaboration Engine**.

---

## 1. Engine Philosophy: Anti-Chatbot Design

Unlike linear chatbots that reply on simple, conversational prompts, the Catalyst OS Collaboration Engine is built as an **automated, state-driven corporate matrix**.
- **Server-Authoritative State**: Agents do not talk at random. They follow a strict strategic workflow dictated by the CEO Planner.
- **Message Queues**: Agents write structured messages into a transactional log.
- **Conflict Resolution**: When agents make overlapping or contradictory recommendations (e.g. Talent wants to spend $145k on hiring, but Finance restricts the payroll budget to $115k), the system flags the conflict and routes it to the **ConflictResolver** to inject a mediated compromises.
- **Structured Output Synthesis**: The final output is NOT a conversational response, but a high-fidelity business deliverable (e.g. an Employment Contract, a Pitch Deck Draft, or a Marketing Plan) written in complete Markdown.

---

## 2. Agent Communication Flow

Below is the state-machine depicting the communication loop for a strategic sprint:

```text
       [Founder Intent]
              │
              ▼
    1. CEO Plan & Task
       Decomposition
              │
              ▼
   ┌───────────────────────┐
   │ 2. Concurrent Agent   │
   │    Execution Cycle    │
   └──────────┬────────────┘
              │
              ├─► Finance (Audits Runway)
              ├─► Talent (Drafts Compensation)
              ├─► Growth (Structures Campaign)
              └─► Legal (Reviews Contracts)
              │
              ▼
   ┌───────────────────────┐
   │ 3. State & Message    │
   │    Analysis Loop      │
   └──────────┬────────────┘
              │
              ▼
    Is there a contradiction?
              ├─► YES ──► 4. Trigger ConflictResolver (Synthesize Compromise)
              │                  │
              │                  ▼
              └─────────► 5. Merge Strategy & Generate Deliverables
                                 │
                                 ▼
                          6. Human-in-the-Loop Approval Queue
```

---

## 3. Communication Protocol (JSON Schema)

The core communication logs are structured as an array of strictly typed message objects:

```typescript
interface AgentMessage {
  id: string;
  sender: 'CEO' | 'Finance' | 'Talent' | 'Growth' | 'Operations' | 'Legal' | 'ConflictResolver' | 'ApprovalManager';
  receiver: 'Finance' | 'Talent' | 'Growth' | 'Operations' | 'Legal' | 'All';
  content: string;         // High-fidelity executive reasoning
  timestamp: string;       // ISO Timestamp
  isConflict?: boolean;    // Flagged by the engine when contradiction occurs
}

interface WorkflowTask {
  id: string;
  title: string;
  assignedTo: 'CEO' | 'Finance' | 'Talent' | 'Growth' | 'Operations' | 'Legal';
  status: 'pending' | 'completed';
  result?: string;         // Concrete output of task execution
}
```

---

## 4. Conflict Identification Mechanics

The Conflict Analyzer is a specialized parser that scans active agent suggestions:
1. **Constraint Boundary Verification**: Compares numerical demands (e.g. Salary, Marketing Budget) against Finance-mandated limits.
2. **Flagging (isConflict)**: If a limit is breached, the message is marked `isConflict: true`.
3. **Resolution Dispatch**: The message history and active startup profile are dispatched to the `ConflictResolver` (Pax-9 Synthesis) with the prompt:
   ```markdown
   Analyze the clash between [Agent A] and [Agent B].
   Formulate a balanced compromise that:
   - Accomplishes at least 80% of [Agent A]'s technical goals.
   - Satisfies 100% of [Agent B]'s financial/regulatory constraints.
   - Outputs the resolved metrics (e.g. Base salary adjusted down, offset by a proportional increase in equity options).
   ```
4. **Synthesis**: The resolution is posted back, allowing the CEO to generate a unified, compliant final Deliverable.
