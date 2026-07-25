# FUGUSAU Portal — Frontend Redesign Migration Guide

## Overview

This redesign covers five core requirements:
1. **Single login page with auto-role detection** — no manual role selection
2. **Modern glassy design** — glassmorphism throughout
3. **No emoji** — all emoji replaced with SVG icons
4. **Custom SVG icon library** — consistent, crisp icons
5. **Modern charts** — Recharts with custom glass tooltips

---

## Files Changed

### New / Replaced Files

| File | Change |
|------|--------|
| `src/pages/LoginPage.tsx` | Full rewrite — auto-role, glassy, SVG icons |
| `src/pages/PortalLayout.tsx` | Full rewrite — glassy sidebar, SVG nav icons |
| `src/pages/DashboardPage.tsx` | Full rewrite — AreaChart, BarChart, RadialBarChart |
| `src/pages/CoursesPage.tsx` | Rewrite — glassy cards, SVG icons |
| `src/pages/FeesPage.tsx` | Rewrite — PieChart, glassy |
| `src/pages/ProfilePage.tsx` | Rewrite — glassy, tabs, SVG icons |
| `src/store/authStore.ts` | Role removed from login call — server assigns it |
| `src/components/icons/index.tsx` | **NEW** — 40+ SVG icon components |
| `src/styles/globals.css` | New glass utilities, Sora font, animations |
| `tailwind.config.js` | Extended with glass shadows, backdrop-blur |
| `src/App.tsx` | Cleaned up, same routes preserved |

### Unchanged Files (no modifications needed)
- `src/types/index.ts`
- `src/hooks/useRole.ts`
- `src/services/api.ts`
- `src/services/apiExtensions.ts`
- `src/services/websocket.ts`
- `src/components/common/ProtectedRoute.tsx`
- All backend files
- All other pages not listed above (ExamsPage, ResultsPage, LibraryPage, ChatPage, etc. — apply the same patterns below to redesign them)

---

## Design System

### Glass Card Pattern
```tsx
<div className="glass glass-hover border border-white/[0.07] rounded-2xl p-5">
  {/* content */}
</div>
```

### Glass Input Pattern
```tsx
<input className="glass-input w-full rounded-xl px-4 py-3.5 text-sm text-white placeholder-white/25" />
```

### Primary Button Pattern
```tsx
<button className="btn-primary rounded-xl px-6 py-3 text-sm font-bold text-white">
  Action
</button>
```

### SVG Icon Usage
```tsx
import { IconCourses, IconCheck } from '@/components/icons'

<IconCourses size={20} className="text-primary-light" />
```

### Chart Tooltip (Recharts)
```tsx
const GlassTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null
  return (
    <div className="glass rounded-xl px-4 py-3 border border-white/[0.1] shadow-glass">
      <p className="text-[11px] text-white/50 mb-1">{label}</p>
      <p className="text-sm font-bold text-primary-light">{payload[0].value}</p>
    </div>
  )
}
```

---

## Auto-Role Implementation

### What changed
The original `LoginPage.tsx` had a 4-button role selector that sent the selected role alongside credentials. This was **purely cosmetic** — it only changed the label on the submit button. The actual role was always determined by the backend.

### New behavior
- Login form has **no role selector** — just email + password
- `authStore.login()` sends only `{ email, password }` to the backend
- The backend JWT response includes `user.role` — this is the authoritative role
- `useRole()` hook and `filterNavByRole()` in `PortalLayout` work exactly as before
- Role-based nav filtering is unchanged — it reads from `user.role` returned by the server

### If your backend requires a role hint
If your `authAPI.login()` actually sends role to the backend, add it back in `authStore.ts`:
```ts
// In authStore.login(), if the API truly needs the role:
const { data } = await authAPI.login(email, password, detectedRole)
// But the returned user.role is still the source of truth.
```

---

## Applying the Design to Remaining Pages

For pages not yet redesigned (ExamsPage, ResultsPage, LibraryPage, ChatPage, etc.), use these patterns:

1. Replace all emoji (``, ``, etc.) with imports from `@/components/icons`
2. Replace `bg-surface border border-primary/20 rounded-2xl` with `glass border border-white/[0.07] rounded-2xl`
3. Replace solid backgrounds with `glass` or `glass-strong`
4. Add `glass-hover` for interactive cards
5. Replace `bg-surface` input fields with `glass-input`
6. Replace emoji-icon sidebar items in any remaining places with SVG icons

---

## Dependencies

No new dependencies required. The design uses:
- **Recharts** — already in `package.json`
- **Tailwind CSS** — already in `package.json`
- **Sora font** — loaded via Google Fonts CDN in `globals.css`
- All SVG icons are inline React components (zero external icon library dependency)

---

## Color Reference

| Variable | Value | Usage |
|----------|-------|-------|
| `#006B3F` | Primary green (dark) | Borders, accent tops |
| `#00A85A` | Primary green (light) | Active states, icons |
| `#D4A017` | Gold | RRR, session badge |
| `#F5C842` | Gold light | Gradient text, stats |
| `rgba(13,26,18,0.6)` | Glass bg | `.glass` class |
| `rgba(255,255,255,0.07)` | Glass border | Card borders |
