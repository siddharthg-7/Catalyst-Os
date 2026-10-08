# Portfolio Design System — Extracted Reference

> Source: `MyPortfolio` (Next.js 15 + Framer Motion + TailwindCSS 4)

---

## 1. Color System (CSS Custom Properties)

### Dark Theme (Default `:root`)
| Token | Value | Purpose |
|---|---|---|
| `--color-bg` | `#030712` | Page background |
| `--color-surface` | `#0D1117` | Card / panel surface |
| `--color-surface-2` | `#161B22` | Elevated surface |
| `--color-fg` | `#F9FAFB` | Primary text |
| `--color-fg-secondary` | `#E5E7EB` | Secondary text |
| `--color-muted` | `#6B7280` | Tertiary / captions |
| `--color-border` | `rgba(255,255,255,0.08)` | Borders |
| `--color-accent` | `#6366F1` | Indigo primary accent |
| `--color-accent-2` | `#8B5CF6` | Violet secondary accent |
| `--color-accent-3` | `#06B6D4` | Cyan tertiary accent |
| `--color-success` | `#10B981` | Success / positive |
| `--color-warning` | `#F59E0B` | Warning |
| `--color-danger` | `#EF4444` | Error / danger |

### Light Theme (`[data-theme="light"]`)
| Token | Value |
|---|---|
| `--color-bg` | `#F8FAFC` |
| `--color-surface` | `#FFFFFF` |
| `--color-surface-2` | `#F1F5F9` |
| `--color-fg` | `#0F172A` |
| `--color-muted` | `#64748B` |
| `--color-accent` | `#4F46E5` |
| `--color-accent-2` | `#7C3AED` |

### CatalystOS Current Palette
CatalystOS uses a warm, light-first palette:
- Background: `#F3F0EE` (warm off-white)
- Foreground: `#141413` (near-black)
- Muted: `#696969`
- Cards: `#FFFFFF`
- Active pill: `#141413` (inverted)
- Accent: `indigo-600` (via Tailwind)

**Decision**: CatalystOS will adopt the portfolio's **CSS variable architecture** while keeping its warm palette identity. Variables will be adapted, not copied.

---

## 2. Typography

### Portfolio
- Font: `Inter` (300–900)
- Headings: `font-black` (900), tight tracking
- Body: Regular (400), `leading-relaxed`
- Captions: `text-sm`, `text-muted`
- Code/Mono: System monospace
- Gradient text: `gradient-text` class (animated background-clip)

### CatalystOS Current
- Font: `Sofia Sans` + `JetBrains Mono`
- Inconsistent sizing (ad-hoc `text-3xl`, `text-xs` etc.)

**Decision**: Keep `Sofia Sans` for brand identity but standardize a type scale.

---

## 3. Spacing System

### Portfolio Pattern
- Sections: `py-16` / `py-20` (64–80px)
- Container: `max-w-5xl` / `max-w-6xl` / `max-w-7xl` + `mx-auto px-6`
- Card padding: `p-6` (24px)
- Grid gap: `gap-6` (24px)
- Element gap: `gap-2` / `gap-4` (8–16px)
- Vertical section spacing: `space-y-12` (48px)

### CatalystOS Current
- Mixed padding: `p-6`, inline `px-3 py-2.5` etc.
- Container: `max-w-80rem` (≈1280px)

**Decision**: Standardize on 4px base unit. Spacing scale: 4, 8, 12, 16, 20, 24, 32, 40, 48, 64, 80.

---

## 4. Motion System

### Portfolio Implementation
```tsx
// Section.tsx — Core reveal animation
<motion.section
  initial={{ opacity: 0, y: 40 }}
  whileInView={{ opacity: 1, y: 0 }}
  viewport={{ once: true, margin: '-80px' }}
  transition={{ duration: 0.7, delay, ease: [0.23, 1, 0.32, 1] }}
/>
```

### Easing Curves
| Name | Value | Usage |
|---|---|---|
| `ease-smooth` | `[0.23, 1, 0.32, 1]` | Primary easing for all transitions |
| `spring-nav` | `type: spring, bounce: 0.2, duration: 0.4` | Navigation pill movement |
| `spring-drawer` | `damping: 25, stiffness: 200` | Mobile drawer |

### Timing
| Category | Duration |
|---|---|
| Micro (hover, focus) | 0.15–0.2s |
| UI (tabs, panels) | 0.3–0.4s |
| Section reveal | 0.7s |
| Stagger per item | 0.05–0.1s |

### Patterns
- `whileInView` with `viewport={{ once: true }}` for scroll-triggered reveals
- `layoutId` for shared element transitions (nav pill)
- `AnimatePresence` for mount/unmount transitions
- Staggered children with `delay: i * 0.1`

---

## 5. Glass & Surface Effects

```css
.glass {
  background: var(--glass-bg);
  backdrop-filter: blur(20px);
  border: 1px solid var(--glass-border);
}

.glass-light {
  background: var(--glass-light-bg);
  backdrop-filter: blur(12px);
  border: 1px solid var(--glass-border);
}
```

### Card Hover
```css
.card-hover:hover {
  transform: translateY(-4px);
  box-shadow: var(--card-shadow);
}
```

---

## 6. Layout Patterns

### NavBar
- Fixed top, hide-on-scroll-down, show-on-scroll-up
- Glass background when scrolled
- `layoutId="nav-active"` for pill animation
- Mobile: Side drawer with `AnimatePresence`

### Page Structure
```
AuroraBackground (fixed, z:-1)
MouseSpotlight (fixed, z:1)
NavBar (fixed, z:50)
Main (flex-1)
  Section (reveal animation wrapper)
    Container (max-w-5xl/6xl mx-auto px-6)
      Content
Footer
```

### Grids
- Stats: `grid-cols-2 md:grid-cols-4 gap-6`
- Expertise: `grid sm:grid-cols-2 lg:grid-cols-4 gap-6`
- Projects: `grid md:grid-cols-3 gap-6`
- Footer: `grid grid-cols-1 md:grid-cols-3 gap-12`

---

## 7. Component Patterns

### Tech Badge
```css
.tech-badge {
  padding: 4px 10px;
  background: var(--badge-bg);
  border: 1px solid var(--badge-border);
  border-radius: 6px;
  font-size: 0.75rem;
  font-weight: 600;
}
```

### Magnetic Button
- Radial gradient following cursor position
- Scale on hover, press feedback

### Card
- `glass rounded-2xl` + `card-hover`
- Gradient header section + content body
- Subtle border that strengthens on hover

---

## 8. Background Effects

### Aurora Orbs
- 3-4 fixed-position blurred circles
- `filter: blur(80px)`, opacity via CSS variable
- `aurora-drift` animation: translate + scale over 12s
- Light theme: reduced opacity (0.07 vs 0.15)

### Mouse Spotlight
- 600px radial gradient following cursor
- Subtle, pointer-events: none
- Color derived from accent via CSS variable

---

## 9. Reusable in CatalystOS

| Pattern | Reusable? | Notes |
|---|---|---|
| CSS variable architecture | ✅ YES | Adapt values for warm palette |
| Section reveal component | ✅ YES | Already partially ported |
| Glass utilities | ✅ YES | Already partially ported |
| Aurora background | ✅ YES | Already ported |
| Mouse spotlight | ✅ YES | Already ported |
| NavBar hide/show | ⚠️ ADAPT | CatalystOS uses sidebar, not top nav |
| Card hover pattern | ✅ YES | Already present |
| `layoutId` navigation | ✅ YES | Already ported for sidebar |
| Tech badge | ✅ YES | Already present |
| Magnetic button | ⚠️ ADAPT | Add to button system |
| Stagger animation | ✅ YES | Apply to lists/grids |
| Theme toggle | ⚠️ ADAPT | Need to build for CatalystOS |
