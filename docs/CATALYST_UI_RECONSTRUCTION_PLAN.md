# CatalystOS UI Reconstruction Plan

---

## Critical Assessment of Current UI

### What's Wrong
1. **No design token system** — Colors are hardcoded hex values scattered across 55K lines of App.tsx
2. **No type scale** — Font sizes are ad-hoc (`text-3xl`, `text-xs`, `text-[10px]`) with no hierarchy
3. **No spacing rhythm** — Padding/margins vary randomly across components
4. **Monolithic App.tsx** — 1293 lines including all state, handlers, AND the entire shell layout
5. **Sidebar is decent but needs polish** — The `layoutId` animation works but the sidebar itself is visually flat
6. **Dashboard is a card grid** — Generic SaaS template feel, not an AI operating system
7. **No dark theme** — Light-only with hardcoded `bg-[#F3F0EE]` everywhere
8. **No page transitions** — Components swap instantly
9. **Toast is minimal** — No animation, no consistent state feedback
10. **Mobile drawer has no animation** — Uses conditional rendering, no `AnimatePresence`

### What Works (Preserve)
- Sidebar `layoutId` navigation pill ✅
- Aurora background ✅
- Mouse spotlight ✅
- Basic card hover utilities ✅
- Section reveal component ✅
- Glass utilities ✅
- Overall warm color identity ✅

---

## Reconstruction Phases

### PHASE 2: Design Tokens & Foundation
**Files to create/modify:**
- `src/index.css` — Complete rewrite with CSS custom properties

**Token categories:**
```
Colors (warm palette, light + dark)
Typography scale (display → caption)
Spacing scale (4px base)
Radius scale (sm → 2xl)
Shadow scale (subtle → elevated)
Motion tokens (duration, easing)
Z-index scale
```

### PHASE 3: Application Shell
**Files to modify:**
- `src/App.tsx` — Rebuild `renderDashboard()` layout

**Shell architecture:**
```
┌─────────────────────────────────────────────────┐
│ Top Bar (glass, breadcrumb, search, user)        │
├────────────┬────────────────────────────────────┤
│            │                                    │
│  Sidebar   │  Main Workspace (scrollable)       │
│  (240px)   │  ┌──────────────────────────────┐  │
│  glass     │  │  Page Content (max-w-6xl)    │  │
│  collapsible │  │  with Section reveal wraps  │  │
│            │  └──────────────────────────────┘  │
│            │                                    │
├────────────┴────────────────────────────────────┤
│ (Footer — inside scrollable area)                │
└─────────────────────────────────────────────────┘
```

**Improvements:**
- Sidebar: Add collapse animation (w-240 ↔ w-64), glass surface, tooltip on collapse
- Top bar: Glass on scroll, breadcrumb path, search command trigger
- Mobile: `AnimatePresence` drawer with spring physics
- Page transitions: Wrap route content in `AnimatePresence` with fade+slide

### PHASE 4: Core Components
Build reusable primitives in `src/components/ui/`:
- `Button.tsx` — Primary, secondary, ghost, danger variants + loading state
- `Card.tsx` — Surface levels, hover behavior, glass variant
- `Badge.tsx` — Status, category, count variants
- `Input.tsx` — With floating label, focus ring
- `StatusIndicator.tsx` — Idle, active, loading, success, error states
- `Skeleton.tsx` — Loading placeholder
- `EmptyState.tsx` — Empty view with icon + CTA
- `Toast.tsx` — Animated notifications with auto-dismiss

### PHASE 5: Page Reconstruction

#### Dashboard (`SaaSDashboard.tsx`)
**Current:** Generic cards + stats grid
**Target:** AI Command Center

Layout:
```
┌──────────────────────────────────────────┐
│ Greeting + Company Status Inline         │
├───────────────┬──────────────────────────┤
│ KPI Strip     │ AI Activity Feed         │
│ (4 cards,     │ (scrollable,             │
│  compact)     │  real-time feel)         │
├───────────────┴──────────────────────────┤
│ Active Initiatives (asymmetric grid)     │
│ ┌─────────────┐ ┌──────────────────────┐ │
│ │  Primary    │ │  Secondary  │ Third  │ │
│ │  (2x tall)  │ │             │        │ │
│ └─────────────┘ └──────────────────────┘ │
├──────────────────────────────────────────┤
│ Quick Actions Bar                         │
└──────────────────────────────────────────┘
```

#### Agent Workspace (`AgentWorkspace.tsx`)
**Current:** Chat-like interface
**Target:** Immersive execution environment

- Agent selector as horizontal tab strip (not sidebar repeat)
- State machine visualization (idle → thinking → executing → complete)
- Tool usage display
- Result panel with approve/reject inline

#### Approvals (`ApprovalQueue.tsx`)
- Table/list with inline expand
- Priority indicators
- Batch actions

#### Workflows, Decisions, Knowledge, People, Scenarios
- Each gets Section wrapping
- Consistent header pattern: Title + Description + Actions
- Consistent card/list patterns from component system

### PHASE 6: Motion System
- Global `framer-motion` variants file
- Section reveal (already done)
- Page transition wrapper
- Stagger utility for lists
- Toast entrance/exit
- Sidebar collapse animation
- Mobile drawer spring animation

### PHASE 7: Dark Theme
- CSS custom properties with `[data-theme="dark"]`
- Theme toggle in top bar
- LocalStorage persistence
- Smooth transition between themes

### PHASE 8: Responsive
- Breakpoints: 1440, 1280, 1024, 768, mobile
- Sidebar: visible > collapsed > hidden (drawer)
- Grid: 4col → 2col → 1col
- Top bar: full → compact
- Content: max-width scales down

### PHASE 9: Visual QA
- Screenshot every page
- Check hierarchy, spacing, alignment
- Verify motion consistency
- Test light + dark
- Test responsive breakpoints

---

## Implementation Priority (for hackathon)

Given time constraints, prioritize maximum visual impact:

1. **CSS tokens + type scale** (15 min) — Foundation for everything
2. **Shell rebuild** (sidebar glass, top bar, page transitions) (30 min)
3. **Dashboard reconstruction** (30 min) — First impression
4. **Dark theme toggle** (15 min) — Wow factor
5. **Agent workspace polish** (20 min) — Core product feature
6. **Motion pass** (15 min) — Stagger, page transitions
7. **Remaining pages** (as time permits)

Total estimated: ~2.5 hours for transformative improvement.
