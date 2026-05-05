# Phase 8 — Landing Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship the public Plätzchen landing page on `/` with Live-Karte hero + Living-Numbers section, move the map to `/map` with anon-tauglichem Read-Only-Modus, and wire it all up for v0.8.0 release.

**Architecture:** Server-Component Landing in a new `(marketing)` route group with separate layout (no app chrome). Map migrates from `app/(app)/page.tsx` to `app/(app)/map/page.tsx`. Anonymous users on `/map` see only `visibility='public'` Spots (RLS-natural via `can_see_spot()`); UI-Aktionen (Add/Edit/Favorite) sind ausgeblendet. Living-Numbers nutzt Supabase real-time auf `spots` INSERT-Events. Topo-Höhenlinien-SVG durchläuft alle Sektionen mit Parallax via `motion`.

**Tech Stack:** Next.js 16.2.4 App Router · React 19 · TypeScript · Tailwind v4 · Supabase SSR · `motion` (neu) · `next/font/google` für Fraunces (neu) · vitest 4 · react-leaflet (existing, dynamic-imported)

**Spec source:** `docs/superpowers/specs/2026-05-05-phase8-landing-page-design.md`

**Testing scope deviation from spec:** Spec mentioned Playwright e2e tests, but the project has no Playwright setup. To keep Phase 8 focused, e2e is covered via **manual real-device smoke (Task 13)** instead. Setting up Playwright + CI integration is a separate workstream — defer to a future testing-infra phase. Vitest unit tests for `lib/marketing-stats` cover the helper logic (Task 6).

---

## File Structure

### New Files

```
app/(marketing)/
  layout.tsx                                    Marketing-Chrome, font-loader
  page.tsx                                      Landing Server Component
  _components/
    HeroSection.tsx                             Server, composes left-text + right-map
    HeroMapPreview.tsx                          Client, dynamic-imported react-leaflet
    SpotTypesShowcase.tsx                       Server, fetches counts via lib/marketing-stats
    LivingNumbersSection.tsx                    Server, fetches initial counts
    LivingNumbersClient.tsx                     Client, realtime subscription + tick-up anim
    ActivityTicker.tsx                          Server fetch + Client component
    HowItWorks.tsx                              Server, static 3 steps
    BetaCtaSection.tsx                          Server, auth-aware CTA
    MarketingFooter.tsx                         Server, minimal
    TopoBackground.tsx                          Client, parallax-shift on scroll
    SectionMeta.tsx                             Shared element: ◆ NN · Title

lib/
  marketing-stats.ts                            getSpotCounts, getLivingNumbers, getRecentActivity, getHeroSampleSpots, formatTimeAgo

__tests__/lib/
  marketing-stats.test.ts                       vitest unit tests

app/(app)/map/
  page.tsx                                      Moved from app/(app)/page.tsx
```

### Modified Files

```
proxy.ts                                        Drop /spots from protectedRoutes; add /admin, /friends; edit-routes auth-checked at page-level
components/MapLayout.tsx                        Treat !isAuthenticated as readonly: hide AddSpot/Favorite/Edit, show guest-banner; deep-link redirect target → /map
components/AddSpotForm.tsx                      Render null if !isAuthenticated
components/FavoriteToggle.tsx                   Render null if !isAuthenticated  (already conditional? verify)
components/SpotActionMenu.tsx                   Render null if !isAuthenticated
components/SpotShareButton.tsx                  URL builder uses /map?spot=<id> not /?spot=<id>
app/layout.tsx                                  Add Fraunces font via next/font/google + variable
app/globals.css                                 Add prefers-reduced-motion override + Fraunces CSS-var
package.json                                    Add motion dep
CHANGELOG.md                                    Add 0.8.0 entry
```

---

## Task 1: Add `motion` library + Fraunces Font

**Files:**
- Modify: `package.json`
- Modify: `app/layout.tsx`
- Modify: `app/globals.css`

- [ ] **Step 1: Install motion**

Run: `npm install motion`

Expected: `added 1 package`. New dep visible in `package.json` `dependencies`.

- [ ] **Step 2: Add Fraunces to app/layout.tsx font loader**

Open `app/layout.tsx`. Find the existing `next/font` imports (Geist Sans + Mono). Add:

```ts
import { Fraunces } from 'next/font/google'

const fraunces = Fraunces({
  variable: '--font-fraunces',
  subsets: ['latin'],
  weight: ['300', '500'],
  style: ['normal', 'italic'],
  display: 'swap',
})
```

In the `<body>` className, append the variable:

```tsx
<body className={`${geistSans.variable} ${geistMono.variable} ${fraunces.variable} antialiased`}>
```

- [ ] **Step 3: Wire Fraunces in globals.css**

Add to `app/globals.css` `@theme inline` block:

```css
@theme inline {
  /* ...existing vars... */
  --font-display: var(--font-fraunces);
}
```

- [ ] **Step 4: Add prefers-reduced-motion global override**

Append to `app/globals.css`:

```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}
```

- [ ] **Step 5: Verify build still passes**

Run: `npm run build`
Expected: builds successfully, no font/CSS errors.

- [ ] **Step 6: Commit**

```bash
git add package.json package-lock.json app/layout.tsx app/globals.css
git commit -m "feat(landing): add motion lib and Fraunces font"
```

---

## Task 2: Migrate Map from `/` to `/map`

**Files:**
- Create: `app/(app)/map/page.tsx`
- Delete: `app/(app)/page.tsx` (after move)
- Modify: `components/MapLayout.tsx` (deep-link redirect target)
- Modify: `components/SpotShareButton.tsx` (URL builder)

- [ ] **Step 1: Create new map route file**

Create `app/(app)/map/page.tsx` with the EXACT contents of the current `app/(app)/page.tsx` (no logic changes — pure file move).

Verify file is identical:
```bash
diff app/(app)/page.tsx app/(app)/map/page.tsx
```
Expected: no output.

- [ ] **Step 2: Delete old `app/(app)/page.tsx`**

```bash
rm app/(app)/page.tsx
```

- [ ] **Step 3: Update MapLayout deep-link redirect**

In `components/MapLayout.tsx`, find `router.replace('/', { scroll: false })` (in `handleSpotDeselect`). Change to:

```tsx
router.replace('/map', { scroll: false })
```

- [ ] **Step 4: Update SpotShareButton URL builder**

In `components/SpotShareButton.tsx`, find URL construction (look for `?spot=`). Change base from `/` to `/map`. Example:

```tsx
const url = `${window.location.origin}/map?spot=${spotId}`
```

- [ ] **Step 5: Verify dev-server renders /map**

Run: `npm run dev`
Manual: visit `http://localhost:3000/map` — map should render exactly as before. Visit `http://localhost:3000/` — should 404 (Landing comes in Task 5).

Stop dev server.

- [ ] **Step 6: Run tests**

Run: `npm test`
Expected: 113 passed (no test changes needed — no test referenced `/` directly).

- [ ] **Step 7: Commit**

```bash
git add app/\(app\)/map/page.tsx components/MapLayout.tsx components/SpotShareButton.tsx
git rm app/\(app\)/page.tsx
git commit -m "refactor(map): move map route from / to /map"
```

---

## Task 3: Update `proxy.ts` Public Routes

**Files:**
- Modify: `proxy.ts`

- [ ] **Step 1: Replace protectedRoutes**

In `proxy.ts`, change line 4 from:

```ts
const protectedRoutes = ['/spots']
```

to:

```ts
// /spots/[id] is public (RLS filters on visibility); /spots/[id]/edit checks auth at page-level
const protectedRoutes = ['/admin', '/friends']
```

- [ ] **Step 2: Verify edit-page already checks auth**

Open `app/(app)/spots/[id]/edit/page.tsx`. Confirm it calls `getUser()` and redirects on null. If it does NOT, add at top of the page server component:

```tsx
const { data: { user } } = await supabase.auth.getUser()
if (!user) redirect('/login')
```

(Use `redirect` from `next/navigation`.)

- [ ] **Step 3: Verify /admin and /friends pages still work**

Run `npm run dev`. Manual:
- Visit `/admin` while logged out → redirected to `/login` ✓
- Visit `/friends` while logged out → redirected to `/login` ✓
- Visit `/map` while logged out → reaches map (anon view, Task 4 makes it pretty) ✓
- Visit `/spots/<some-public-uuid>` while logged out → reaches detail page ✓

Stop dev server.

- [ ] **Step 4: Commit**

```bash
git add proxy.ts app/\(app\)/spots/\[id\]/edit/page.tsx
git commit -m "feat(routes): make /map and /spots/[id] anon-accessible; tighten edit/admin/friends auth"
```

---

## Task 4: MapLayout Readonly-Mode for Anon

**Files:**
- Modify: `components/MapLayout.tsx`
- Modify: `components/AddSpotForm.tsx`
- Modify: `components/FavoriteToggle.tsx`
- Modify: `components/SpotActionMenu.tsx`
- Modify: `components/SpotDescriptionFeed.tsx` (description-add-form gating)

- [ ] **Step 1: Verify existing conditional rendering**

Run: `grep -n "isAuthenticated" components/AddSpotForm.tsx components/FavoriteToggle.tsx components/SpotActionMenu.tsx`

Expected: each component already receives or accepts an `isAuthenticated` (or `userId`) prop.

If any component does NOT yet hide itself for anon, add at top of its render:

```tsx
if (!isAuthenticated) return null
```

(Adapt prop name to whatever the component already takes. Do NOT add new props unless missing.)

- [ ] **Step 2: Add guest banner to MapLayout**

In `components/MapLayout.tsx`, immediately after the `MapHeader` (or wherever the top of the visible map shell is, NOT inside the BottomSheet), render conditionally:

```tsx
{!isAuthenticated && (
  <div className="absolute top-3 left-1/2 -translate-x-1/2 z-[9999] bg-[#1d2218]/95 backdrop-blur-sm border border-[#5e9e3e]/40 rounded-full px-4 py-2 text-sm text-[#c8c8c0] flex items-center gap-3 shadow-lg">
    <span>Du erkundest als Gast</span>
    <a href="/signup" className="text-[#5e9e3e] font-semibold hover:underline">Beta beitreten →</a>
  </div>
)}
```

Adjust z-index if it conflicts with the BottomSheet drag-handle. Read MapLayout's existing z-index hierarchy first.

- [ ] **Step 3: Manual smoke test**

Run: `npm run dev`. Visit `/map` while logged out:
- Banner visible at top center ✓
- No FAB / AddSpot button ✓
- Click public spot marker → BottomSheet opens, but no Favorite-Heart, no SpotActionMenu (kebab) ✓

Login → Banner disappears, FAB appears, Favorite-Heart shows ✓

Stop dev server.

- [ ] **Step 4: Run tests**

Run: `npm test`
Expected: 113 passed.

- [ ] **Step 5: Commit**

```bash
git add components/MapLayout.tsx components/AddSpotForm.tsx components/FavoriteToggle.tsx components/SpotActionMenu.tsx components/SpotDescriptionFeed.tsx
git commit -m "feat(map): readonly-mode for anonymous users — banner, hide actions"
```

---

## Task 5: Marketing Layout + Empty Landing Skeleton

**Files:**
- Create: `app/(marketing)/layout.tsx`
- Create: `app/(marketing)/page.tsx`
- Create: `app/(marketing)/_components/TopoBackground.tsx`
- Create: `app/(marketing)/_components/SectionMeta.tsx`

- [ ] **Step 1: Create marketing layout**

Create `app/(marketing)/layout.tsx`:

```tsx
import type { ReactNode } from 'react'

export default function MarketingLayout({ children }: { children: ReactNode }) {
  return (
    <div className="relative min-h-screen bg-[#1d2218] text-[#e6e3d3] overflow-x-hidden">
      {children}
    </div>
  )
}
```

- [ ] **Step 2: Create SectionMeta shared component**

Create `app/(marketing)/_components/SectionMeta.tsx`:

```tsx
export default function SectionMeta({ number, label, live = false }: { number?: string; label: string; live?: boolean }) {
  return (
    <div className="font-mono text-[11px] tracking-[0.16em] uppercase text-[#8aa376] flex items-center gap-2">
      <span className="text-[#5e9e3e]">◆</span>
      {live && <><span className="font-bold">LIVE</span><span>·</span></>}
      {number && <><span>{number}</span><span>·</span></>}
      <span>{label}</span>
      {live && <span className="ml-2 inline-block w-2 h-2 rounded-full bg-[#5e9e3e] animate-pulse" />}
    </div>
  )
}
```

- [ ] **Step 3: Create TopoBackground client component**

Create `app/(marketing)/_components/TopoBackground.tsx`:

```tsx
'use client'

import { motion, useScroll, useTransform, useReducedMotion } from 'motion/react'

export default function TopoBackground() {
  const { scrollYProgress } = useScroll()
  const reduce = useReducedMotion()
  const y = useTransform(scrollYProgress, [0, 1], [0, reduce ? 0 : -40])

  return (
    <motion.div
      aria-hidden
      className="pointer-events-none fixed inset-0 -z-10 opacity-90"
      style={{ y }}
    >
      <svg
        className="w-full h-full"
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 1600 1000"
        preserveAspectRatio="xMidYMid slice"
      >
        <g fill="none" stroke="#48583a" strokeWidth="0.7">
          <path d="M-50 200 Q 400 80 800 220 T 1650 180" />
          <path d="M-50 320 Q 400 200 800 340 T 1650 300" />
          <path d="M-50 440 Q 400 320 800 460 T 1650 420" />
          <path d="M-50 560 Q 400 440 800 580 T 1650 540" />
          <path d="M-50 680 Q 400 560 800 700 T 1650 660" />
          <path d="M-50 800 Q 400 680 800 820 T 1650 780" />
          <path d="M-50 920 Q 400 800 800 940 T 1650 900" />
        </g>
      </svg>
    </motion.div>
  )
}
```

- [ ] **Step 4: Create empty landing page**

Create `app/(marketing)/page.tsx`:

```tsx
import { redirect } from 'next/navigation'
import TopoBackground from './_components/TopoBackground'

export default async function LandingPage({
  searchParams,
}: {
  searchParams: Promise<{ spot?: string }>
}) {
  const { spot } = await searchParams

  // Phase 7 deep-link compatibility: ?spot=<id> on / belongs to /map
  if (spot) redirect(`/map?spot=${encodeURIComponent(spot)}`)

  return (
    <>
      <TopoBackground />
      <main className="relative">
        <section className="min-h-screen flex items-center justify-center">
          <p className="font-mono text-sm text-[#8aa376]">Landing skeleton — sections come in following tasks</p>
        </section>
      </main>
    </>
  )
}
```

- [ ] **Step 5: Manual smoke**

Run `npm run dev`. Visit `/` → renders dark bg with topo-lines and skeleton text. Visit `/?spot=test-id` → redirects to `/map?spot=test-id`.

Stop dev server.

- [ ] **Step 6: Run tests**

Run: `npm test`
Expected: 113 passed.

- [ ] **Step 7: Commit**

```bash
git add app/\(marketing\)/
git commit -m "feat(landing): marketing layout group + empty page skeleton with topo background"
```

---

## Task 6: `lib/marketing-stats.ts` Helpers + Tests

**Files:**
- Create: `lib/marketing-stats.ts`
- Create: `__tests__/lib/marketing-stats.test.ts`

- [ ] **Step 1: Write failing test for `formatTimeAgo`**

Create `__tests__/lib/marketing-stats.test.ts`:

```ts
import { describe, it, expect, vi } from 'vitest'
import { formatTimeAgo } from '@/lib/marketing-stats'

describe('formatTimeAgo', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-05-05T20:00:00Z'))
  })
  afterEach(() => vi.useRealTimers())

  it('returns "vor 4 Min" for 4 minutes ago', () => {
    expect(formatTimeAgo(new Date('2026-05-05T19:56:00Z'))).toBe('vor 4 Min')
  })
  it('returns "vor 2 Std" for 2 hours ago', () => {
    expect(formatTimeAgo(new Date('2026-05-05T18:00:00Z'))).toBe('vor 2 Std')
  })
  it('returns "vor 3 Tagen" for 3 days ago', () => {
    expect(formatTimeAgo(new Date('2026-05-02T20:00:00Z'))).toBe('vor 3 Tagen')
  })
  it('returns "gerade eben" for under 60s', () => {
    expect(formatTimeAgo(new Date('2026-05-05T19:59:30Z'))).toBe('gerade eben')
  })
})
```

(Add `beforeEach`/`afterEach` to the imports from vitest.)

- [ ] **Step 2: Run test — verify it fails**

Run: `npm test -- marketing-stats`
Expected: FAIL with "module not found" or similar.

- [ ] **Step 3: Implement formatTimeAgo**

Create `lib/marketing-stats.ts`:

```ts
export function formatTimeAgo(date: Date | string, now: Date = new Date()): string {
  const d = typeof date === 'string' ? new Date(date) : date
  const diffMs = now.getTime() - d.getTime()
  const sec = Math.floor(diffMs / 1000)
  if (sec < 60) return 'gerade eben'
  const min = Math.floor(sec / 60)
  if (min < 60) return `vor ${min} Min`
  const hr = Math.floor(min / 60)
  if (hr < 24) return `vor ${hr} Std`
  const days = Math.floor(hr / 24)
  return `vor ${days} ${days === 1 ? 'Tag' : 'Tagen'}`
}
```

- [ ] **Step 4: Verify tests pass**

Run: `npm test -- marketing-stats`
Expected: 4 passed.

- [ ] **Step 5: Add server-side stat helpers**

Append to `lib/marketing-stats.ts`:

```ts
import { createClient } from '@/lib/supabase/server'
import { SPOT_TYPES, type SpotType } from '@/lib/spot-types'

export type SpotTypeCounts = Record<SpotType, number>

export async function getSpotCounts(): Promise<SpotTypeCounts> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('spots')
    .select('type')
    .eq('visibility', 'public')

  const counts = SPOT_TYPES.reduce<SpotTypeCounts>((acc, t) => {
    acc[t.id] = 0
    return acc
  }, {} as SpotTypeCounts)

  for (const row of data ?? []) {
    if (row.type in counts) counts[row.type as SpotType]++
  }
  return counts
}

export type LivingNumbers = { total: number; thisWeek: number; betaUsers: number }

export async function getLivingNumbers(): Promise<LivingNumbers> {
  const supabase = await createClient()
  const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()

  const [totalRes, weekRes, usersRes] = await Promise.all([
    supabase.from('spots').select('id', { count: 'exact', head: true }).eq('visibility', 'public'),
    supabase.from('spots').select('id', { count: 'exact', head: true }).eq('visibility', 'public').gte('created_at', oneWeekAgo),
    supabase.from('profiles').select('id', { count: 'exact', head: true }),
  ])

  return {
    total: totalRes.count ?? 0,
    thisWeek: weekRes.count ?? 0,
    betaUsers: usersRes.count ?? 0,
  }
}

export type ActivityEvent = {
  id: string
  kind: 'spot_created' | 'description_added'
  spotType: SpotType
  createdAt: string
}

export async function getRecentActivity(limit = 3): Promise<ActivityEvent[]> {
  const supabase = await createClient()

  const { data: spots } = await supabase
    .from('spots')
    .select('id, type, created_at')
    .eq('visibility', 'public')
    .order('created_at', { ascending: false })
    .limit(limit)

  return (spots ?? []).map((s) => ({
    id: s.id,
    kind: 'spot_created' as const,
    spotType: s.type as SpotType,
    createdAt: s.created_at,
  }))
}

export type HeroSpot = { id: string; lat: number; lng: number; type: SpotType }

export async function getHeroSampleSpots(limit = 6): Promise<HeroSpot[]> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('spots')
    .select('id, lat, lng, type')
    .eq('visibility', 'public')
    .order('created_at', { ascending: false })
    .limit(limit)

  return (data ?? []).map((s) => ({
    id: s.id,
    lat: s.lat,
    lng: s.lng,
    type: s.type as SpotType,
  }))
}
```

- [ ] **Step 6: Run tests + build to verify imports**

Run: `npm test`
Expected: 117 passed (113 baseline + 4 new).

Run: `npm run build`
Expected: builds clean.

- [ ] **Step 7: Commit**

```bash
git add lib/marketing-stats.ts __tests__/lib/marketing-stats.test.ts
git commit -m "feat(landing): marketing-stats helpers (counts, living numbers, activity, hero spots)"
```

---

## Task 7: Hero Section + Live-Map-Preview

**Files:**
- Create: `app/(marketing)/_components/HeroMapPreview.tsx`
- Create: `app/(marketing)/_components/HeroSection.tsx`

- [ ] **Step 1: Create HeroMapPreview client component**

Create `app/(marketing)/_components/HeroMapPreview.tsx`:

```tsx
'use client'

import dynamic from 'next/dynamic'
import { useMemo } from 'react'
import type { HeroSpot } from '@/lib/marketing-stats'
import { SPOT_TYPE_MAP } from '@/lib/spot-types'

const MapContainer = dynamic(() => import('react-leaflet').then((m) => m.MapContainer), { ssr: false })
const TileLayer = dynamic(() => import('react-leaflet').then((m) => m.TileLayer), { ssr: false })
const Marker = dynamic(() => import('react-leaflet').then((m) => m.Marker), { ssr: false })

export default function HeroMapPreview({ spots }: { spots: HeroSpot[] }) {
  const center = useMemo(() => {
    if (!spots.length) return [50.94, 6.96] as [number, number]
    const lat = spots.reduce((s, x) => s + x.lat, 0) / spots.length
    const lng = spots.reduce((s, x) => s + x.lng, 0) / spots.length
    return [lat, lng] as [number, number]
  }, [spots])

  return (
    <div
      className="relative w-full h-full min-h-[360px] rounded-xl overflow-hidden bg-[#2a2f1f]"
      role="img"
      aria-label={`Karte mit ${spots.length} Beispiel-Plätzchen`}
    >
      <MapContainer
        center={center}
        zoom={9}
        scrollWheelZoom={false}
        dragging={false}
        touchZoom={false}
        doubleClickZoom={false}
        zoomControl={false}
        attributionControl={false}
        style={{ height: '100%', width: '100%', background: '#2a2f1f' }}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          opacity={0.5}
        />
        {spots.map((spot, idx) => {
          const meta = SPOT_TYPE_MAP[spot.type]
          return (
            <Marker
              key={spot.id}
              position={[spot.lat, spot.lng]}
              icon={createPulseIcon(meta?.emoji ?? '📍', idx)}
            />
          )
        })}
      </MapContainer>
    </div>
  )
}

function createPulseIcon(emoji: string, idx: number) {
  const L = require('leaflet')
  return L.divIcon({
    className: 'hero-marker',
    html: `<div class="hero-marker-inner" style="animation-delay: ${idx * 0.4}s">${emoji}</div>`,
    iconSize: [36, 36],
    iconAnchor: [18, 18],
  })
}
```

- [ ] **Step 2: Add hero-marker CSS to globals.css**

Append to `app/globals.css`:

```css
.hero-marker { background: transparent !important; border: none !important; }
.hero-marker-inner {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: #5e9e3e;
  border: 2px solid #1d2218;
  box-shadow: 0 0 0 4px rgba(94,158,62,.25), 0 6px 12px rgba(0,0,0,.4);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  position: relative;
  animation: hero-marker-bob 3s ease-in-out infinite;
}
.hero-marker-inner::after {
  content: '';
  position: absolute;
  inset: -2px;
  border-radius: 50%;
  border: 2px solid rgba(94,158,62,.5);
  animation: hero-marker-pulse 2s ease-out infinite;
}
@keyframes hero-marker-pulse { 0% { transform: scale(1); opacity: 1; } 100% { transform: scale(2.4); opacity: 0; } }
@keyframes hero-marker-bob   { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-3px); } }
```

- [ ] **Step 3: Create HeroSection server component**

Create `app/(marketing)/_components/HeroSection.tsx`:

```tsx
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { getHeroSampleSpots } from '@/lib/marketing-stats'
import HeroMapPreview from './HeroMapPreview'
import SectionMeta from './SectionMeta'

export default async function HeroSection() {
  const supabase = await createClient()
  const [{ data: { user } }, spots] = await Promise.all([
    supabase.auth.getUser(),
    getHeroSampleSpots(6),
  ])

  return (
    <section className="relative min-h-screen grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 px-6 lg:px-12 py-16 lg:py-20">
      <div className="flex flex-col justify-between gap-12">
        <SectionMeta label="50.94° N · BETA · FRÜHJAHR 26" />
        <div className="flex flex-col gap-6">
          <h1 className="font-bold uppercase text-[56px] lg:text-[88px] leading-[0.95] tracking-tight">
            PLÄTZ
            <span className="font-[var(--font-display)] font-light italic text-[#5e9e3e] normal-case tracking-normal">chen</span>
          </h1>
          <p className="text-lg lg:text-xl text-[#c8c8c0] leading-snug max-w-md">
            Eine Karte für Orte, die nirgendwo stehen.
          </p>
          <p className="text-sm text-[#a8a89a] max-w-md">
            Bänke, Aussichten, Schutzhütten, Liegewiesen — die Plätze, die Google nicht kennt.
          </p>
          <div className="flex flex-wrap gap-3 pt-2">
            <Link
              href="/map"
              className="bg-[#5e9e3e] text-[#14180f] px-5 py-3 rounded-md text-sm font-bold uppercase tracking-wider hover:bg-[#6cb046] transition-colors"
            >
              {user ? 'Zur Karte' : 'Karte ansehen'}
            </Link>
            {!user && (
              <Link
                href="/signup"
                className="border border-[#e6e3d3]/40 text-[#e6e3d3] px-5 py-3 rounded-md text-sm font-medium uppercase tracking-wider hover:bg-[#e6e3d3]/10 transition-colors"
              >
                Beta beitreten
              </Link>
            )}
          </div>
        </div>
      </div>
      <div className="relative min-h-[360px] lg:min-h-0">
        <HeroMapPreview spots={spots} />
      </div>
    </section>
  )
}
```

- [ ] **Step 4: Wire HeroSection into landing page**

Open `app/(marketing)/page.tsx`. Replace the placeholder `<section>` with `<HeroSection />`. Add the import at top:

```tsx
import HeroSection from './_components/HeroSection'
```

The page should now be:

```tsx
return (
  <>
    <TopoBackground />
    <main className="relative">
      <HeroSection />
    </main>
  </>
)
```

- [ ] **Step 5: Manual smoke**

Run `npm run dev`. Visit `/` → Hero with title + map. Markers visible and pulsing. CTAs visible.

Visit `/` while logged in → only "Zur Karte"-CTA visible.

Stop dev server.

- [ ] **Step 6: Tests + build**

```bash
npm test     # 117 passed (no new tests)
npm run build  # clean
```

- [ ] **Step 7: Commit**

```bash
git add app/\(marketing\)/_components/HeroSection.tsx app/\(marketing\)/_components/HeroMapPreview.tsx app/\(marketing\)/page.tsx app/globals.css
git commit -m "feat(landing): hero section with live map preview"
```

---

## Task 8: Sechs Typen Showcase

**Files:**
- Create: `app/(marketing)/_components/SpotTypesShowcase.tsx`

- [ ] **Step 1: Create component**

Create `app/(marketing)/_components/SpotTypesShowcase.tsx`:

```tsx
import { SPOT_TYPES } from '@/lib/spot-types'
import { getSpotCounts } from '@/lib/marketing-stats'
import SectionMeta from './SectionMeta'

export default async function SpotTypesShowcase() {
  const counts = await getSpotCounts()

  return (
    <section className="relative px-6 lg:px-12 py-16 lg:py-24">
      <div className="flex flex-col gap-2 mb-10">
        <SectionMeta number="02" label="Sechs Typen" />
        <h2 className="font-bold uppercase text-3xl lg:text-5xl tracking-tight max-w-3xl">
          Was zählt als <span className="font-[var(--font-display)] font-light italic text-[#5e9e3e] normal-case">Plätzchen?</span>
        </h2>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {SPOT_TYPES.map((t) => (
          <div
            key={t.id}
            className="rounded-lg border border-[#5e9e3e]/22 bg-[#5e9e3e]/[0.06] px-3 py-5 text-center"
          >
            <div className="text-3xl mb-2">{t.emoji}</div>
            <div className="font-mono text-[10px] uppercase tracking-wider text-[#c8c8c0]">{t.label}</div>
            <div className="font-mono text-[10px] text-[#5e9e3e] mt-1">{counts[t.id] ?? 0}</div>
          </div>
        ))}
      </div>
    </section>
  )
}
```

- [ ] **Step 2: Wire into page.tsx**

In `app/(marketing)/page.tsx`, import and add after `<HeroSection />`:

```tsx
import SpotTypesShowcase from './_components/SpotTypesShowcase'
// ...
<HeroSection />
<SpotTypesShowcase />
```

- [ ] **Step 3: Smoke test**

Run `npm run dev`. Visit `/` → after Hero, see 6-type grid with counts. On mobile, 2-column. On desktop, 6-column.

Stop dev server.

- [ ] **Step 4: Tests + build**

```bash
npm test
npm run build
```

- [ ] **Step 5: Commit**

```bash
git add app/\(marketing\)/_components/SpotTypesShowcase.tsx app/\(marketing\)/page.tsx
git commit -m "feat(landing): six-types showcase with live counts"
```

---

## Task 9: Living Numbers Section + Activity Ticker

**Files:**
- Create: `app/(marketing)/_components/LivingNumbersSection.tsx`
- Create: `app/(marketing)/_components/LivingNumbersClient.tsx`
- Create: `app/(marketing)/_components/ActivityTicker.tsx`

- [ ] **Step 1: Create LivingNumbersSection (server)**

Create `app/(marketing)/_components/LivingNumbersSection.tsx`:

```tsx
import { getLivingNumbers, getRecentActivity } from '@/lib/marketing-stats'
import LivingNumbersClient from './LivingNumbersClient'
import ActivityTicker from './ActivityTicker'
import SectionMeta from './SectionMeta'

export default async function LivingNumbersSection() {
  const [numbers, activity] = await Promise.all([
    getLivingNumbers(),
    getRecentActivity(3),
  ])

  return (
    <section className="relative px-6 lg:px-12 py-16 lg:py-24">
      <div className="mb-8">
        <SectionMeta number="03" label="Aktuell" live />
      </div>
      <LivingNumbersClient initial={numbers} />
      <ActivityTicker initialEvents={activity} />
    </section>
  )
}
```

- [ ] **Step 2: Create LivingNumbersClient (client, realtime + tick-up)**

Create `app/(marketing)/_components/LivingNumbersClient.tsx`:

```tsx
'use client'

import { useState, useEffect, useRef } from 'react'
import { motion, useInView } from 'motion/react'
import { createClient } from '@/lib/supabase/client'
import type { LivingNumbers } from '@/lib/marketing-stats'

export default function LivingNumbersClient({ initial }: { initial: LivingNumbers }) {
  const [numbers, setNumbers] = useState(initial)
  const ref = useRef<HTMLDivElement>(null)
  const inView = useInView(ref, { once: true, margin: '-100px' })

  useEffect(() => {
    const supabase = createClient()
    const channel = supabase
      .channel('living-numbers')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'spots' }, (payload) => {
        if ((payload.new as { visibility?: string }).visibility !== 'public') return
        setNumbers((n) => ({ ...n, total: n.total + 1, thisWeek: n.thisWeek + 1 }))
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'profiles' }, () => {
        setNumbers((n) => ({ ...n, betaUsers: n.betaUsers + 1 }))
      })
      .subscribe()

    return () => { void supabase.removeChannel(channel) }
  }, [])

  return (
    <div ref={ref} className="grid grid-cols-1 sm:grid-cols-3 gap-6 lg:gap-10 items-end">
      <Stat value={numbers.total} label="Plätzchen entdeckt" size="big" inView={inView} />
      <Stat value={numbers.thisWeek} label="diese Woche" size="mid" prefix="+" inView={inView} />
      <Stat value={numbers.betaUsers} label="Beta-Tester" size="small" inView={inView} />
    </div>
  )
}

function Stat({ value, label, size, prefix = '', inView }: { value: number; label: string; size: 'big' | 'mid' | 'small'; prefix?: string; inView: boolean }) {
  const cls = size === 'big' ? 'text-7xl lg:text-[84px]' : size === 'mid' ? 'text-5xl lg:text-6xl' : 'text-4xl lg:text-5xl'
  return (
    <div>
      <motion.div
        className={`${cls} font-bold leading-none tracking-tight text-white tabular-nums`}
        initial={{ opacity: 0 }}
        animate={inView ? { opacity: 1 } : {}}
        transition={{ duration: 0.4 }}
      >
        {prefix}<TickUp value={value} active={inView} />
      </motion.div>
      <div className="font-mono text-[11px] uppercase tracking-wider text-[#8aa376] mt-2">{label}</div>
    </div>
  )
}

function TickUp({ value, active }: { value: number; active: boolean }) {
  const [display, setDisplay] = useState(0)
  useEffect(() => {
    if (!active) return
    const start = performance.now()
    const duration = 1200
    let raf = 0
    const step = (now: number) => {
      const t = Math.min((now - start) / duration, 1)
      const eased = 1 - Math.pow(1 - t, 3)
      setDisplay(Math.round(value * eased))
      if (t < 1) raf = requestAnimationFrame(step)
    }
    raf = requestAnimationFrame(step)
    return () => cancelAnimationFrame(raf)
  }, [value, active])
  return <>{display.toLocaleString('de-DE')}</>
}
```

- [ ] **Step 3: Create ActivityTicker (client component, CSS rotation)**

Create `app/(marketing)/_components/ActivityTicker.tsx`:

```tsx
'use client'

import { useEffect, useState } from 'react'
import { SPOT_TYPE_MAP } from '@/lib/spot-types'
import { formatTimeAgo, type ActivityEvent } from '@/lib/marketing-stats'

export default function ActivityTicker({ initialEvents }: { initialEvents: ActivityEvent[] }) {
  const [now, setNow] = useState(() => new Date())
  const [index, setIndex] = useState(0)

  useEffect(() => {
    const tick = setInterval(() => setNow(new Date()), 30_000)
    const rotate = setInterval(() => setIndex((i) => (i + 1) % Math.max(initialEvents.length, 1)), 3000)
    return () => { clearInterval(tick); clearInterval(rotate) }
  }, [initialEvents.length])

  if (!initialEvents.length) return null

  const ev = initialEvents[index]
  const meta = SPOT_TYPE_MAP[ev.spotType]

  return (
    <div className="mt-8 pt-4 border-t border-[#e6e3d3]/12 font-mono text-xs text-[#c8c8c0] tracking-wide h-6 overflow-hidden">
      <div key={ev.id} className="opacity-0 animate-[fadeIn_0.5s_forwards]">
        <span className="text-[#5e9e3e]">→ </span>
        Neue {meta?.label ?? 'Eintrag'} · {formatTimeAgo(ev.createdAt, now)}
      </div>
    </div>
  )
}
```

Append `@keyframes fadeIn` to `app/globals.css`:

```css
@keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
```

- [ ] **Step 4: Wire into page.tsx**

```tsx
import LivingNumbersSection from './_components/LivingNumbersSection'
// ...
<HeroSection />
<SpotTypesShowcase />
<LivingNumbersSection />
```

- [ ] **Step 5: Smoke test**

Run `npm run dev`. Visit `/` → scroll past hero + types → see 3 numbers. Numbers tick up from 0 when scrolled into view. Activity ticker rotates every 3s.

Add a public spot via `/map` (logged in) → numbers update live without refresh.

Stop dev server.

- [ ] **Step 6: Tests + build**

```bash
npm test
npm run build
```

- [ ] **Step 7: Commit**

```bash
git add app/\(marketing\)/_components/LivingNumbersSection.tsx app/\(marketing\)/_components/LivingNumbersClient.tsx app/\(marketing\)/_components/ActivityTicker.tsx app/\(marketing\)/page.tsx app/globals.css
git commit -m "feat(landing): living numbers section with realtime tick-up + activity ticker"
```

---

## Task 10: Wie's funktioniert (How-It-Works) Section

**Files:**
- Create: `app/(marketing)/_components/HowItWorks.tsx`

- [ ] **Step 1: Create component**

Create `app/(marketing)/_components/HowItWorks.tsx`:

```tsx
import SectionMeta from './SectionMeta'

const STEPS = [
  { num: '01', title: 'Pin setzen', body: 'Ort gefunden? GPS macht den Rest.' },
  { num: '02', title: 'Bewerten', body: 'Komfort, Aussicht, Schatten zur Tageszeit, Foto dazu.' },
  { num: '03', title: 'Teilen', body: 'Öffentlich, nur Freunde, oder privat. Du entscheidest.' },
] as const

export default function HowItWorks() {
  return (
    <section className="relative px-6 lg:px-12 py-16 lg:py-24">
      <div className="flex flex-col gap-2 mb-10">
        <SectionMeta number="04" label="So geht's" />
        <h2 className="font-bold uppercase text-3xl lg:text-5xl tracking-tight max-w-3xl">
          Eintragen, bewerten,{' '}
          <span className="font-[var(--font-display)] font-light italic text-[#5e9e3e] normal-case">teilen.</span>
        </h2>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {STEPS.map((s) => (
          <div key={s.num} className="flex flex-col gap-3">
            <div className="font-mono text-2xl text-[#5e9e3e] tabular-nums">{s.num}</div>
            <div className="font-bold text-xl uppercase tracking-tight text-white">{s.title}</div>
            <div className="text-[#c8c8c0] leading-relaxed">{s.body}</div>
          </div>
        ))}
      </div>
    </section>
  )
}
```

- [ ] **Step 2: Wire into page.tsx**

```tsx
import HowItWorks from './_components/HowItWorks'
// ...
<LivingNumbersSection />
<HowItWorks />
```

- [ ] **Step 3: Smoke + tests + commit**

```bash
npm run dev   # visit /, verify section renders
npm test
npm run build
git add app/\(marketing\)/_components/HowItWorks.tsx app/\(marketing\)/page.tsx
git commit -m "feat(landing): how-it-works 3-step section"
```

---

## Task 11: Beta-CTA Section + Footer

**Files:**
- Create: `app/(marketing)/_components/BetaCtaSection.tsx`
- Create: `app/(marketing)/_components/MarketingFooter.tsx`

- [ ] **Step 1: Create BetaCtaSection (server, auth-aware)**

Create `app/(marketing)/_components/BetaCtaSection.tsx`:

```tsx
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import SectionMeta from './SectionMeta'

export default async function BetaCtaSection() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  return (
    <section className="relative px-6 lg:px-12 py-20 lg:py-28 text-center max-w-3xl mx-auto">
      <div className="mb-8 flex justify-center">
        <SectionMeta number="05" label="Beta" />
      </div>
      <h2 className="font-bold uppercase text-3xl lg:text-5xl tracking-tight">
        Wir sind im Beta.{' '}
        <span className="font-[var(--font-display)] font-light italic text-[#5e9e3e] normal-case">Du gestaltest mit.</span>
      </h2>
      <p className="text-[#c8c8c0] text-lg mt-4 leading-relaxed">
        Feedback fließt direkt rein. Was hier wackelt, wird nächste Woche stabiler.
      </p>
      <div className="mt-10 flex flex-col items-center gap-3">
        <Link
          href={user ? '/map' : '/signup'}
          className="bg-[#5e9e3e] text-[#14180f] px-7 py-4 rounded-md text-base font-bold uppercase tracking-wider hover:bg-[#6cb046] transition-colors"
        >
          {user ? 'Zur Karte' : 'Beta beitreten'}
        </Link>
        {!user && (
          <Link href="/map" className="text-[#8aa376] text-sm underline-offset-4 hover:underline">
            oder erst die Karte ansehen
          </Link>
        )}
      </div>
    </section>
  )
}
```

- [ ] **Step 2: Create MarketingFooter**

Create `app/(marketing)/_components/MarketingFooter.tsx`:

```tsx
import Link from 'next/link'

export default function MarketingFooter() {
  return (
    <footer className="relative px-6 lg:px-12 py-10 border-t border-[#e6e3d3]/10 text-sm text-[#8aa376] flex flex-wrap justify-between gap-3">
      <div className="flex flex-col gap-1">
        <div>© {new Date().getFullYear()} Plätzchen · Beta</div>
        <div className="text-[11px] text-[#8aa376]/70">
          Karten-Tiles ©{' '}
          <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer" className="underline">
            OpenStreetMap
          </a>{' '}
          contributors
        </div>
      </div>
      <nav className="flex gap-5">
        <Link href="/changelog" className="hover:text-[#c8c8c0]">Changelog</Link>
        <Link href="/login" className="hover:text-[#c8c8c0]">Login</Link>
      </nav>
    </footer>
  )
}
```

- [ ] **Step 3: Wire both into page.tsx**

```tsx
import BetaCtaSection from './_components/BetaCtaSection'
import MarketingFooter from './_components/MarketingFooter'
// ...
<HowItWorks />
<BetaCtaSection />
<MarketingFooter />
```

- [ ] **Step 4: Smoke + tests + commit**

```bash
npm run dev   # full landing flow visible end to end
npm test
npm run build
git add app/\(marketing\)/_components/BetaCtaSection.tsx app/\(marketing\)/_components/MarketingFooter.tsx app/\(marketing\)/page.tsx
git commit -m "feat(landing): beta-CTA section + marketing footer"
```

---

## Task 12: Section-Reveal Animations

**Files:**
- Create: `app/(marketing)/_components/RevealSection.tsx`
- Modify: All section components to wrap in RevealSection

- [ ] **Step 1: Create RevealSection wrapper**

Create `app/(marketing)/_components/RevealSection.tsx`:

```tsx
'use client'

import { motion, useReducedMotion } from 'motion/react'
import type { ReactNode } from 'react'

export default function RevealSection({ children, delay = 0 }: { children: ReactNode; delay?: number }) {
  const reduce = useReducedMotion()
  return (
    <motion.div
      initial={reduce ? {} : { opacity: 0, y: 12 }}
      whileInView={reduce ? {} : { opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-50px' }}
      transition={{ duration: 0.6, ease: 'easeOut', delay }}
    >
      {children}
    </motion.div>
  )
}
```

- [ ] **Step 2: Wrap each section in page.tsx**

In `app/(marketing)/page.tsx`, wrap sections (NOT the Hero — first paint should be instant):

```tsx
import RevealSection from './_components/RevealSection'
// ...
<HeroSection />
<RevealSection><SpotTypesShowcase /></RevealSection>
<RevealSection><LivingNumbersSection /></RevealSection>
<RevealSection><HowItWorks /></RevealSection>
<RevealSection><BetaCtaSection /></RevealSection>
<MarketingFooter />
```

- [ ] **Step 3: Smoke**

`npm run dev` → scroll: each section fades-up nicely. Toggle "Reduce Motion" in OS settings → reveals are instant.

- [ ] **Step 4: Tests + commit**

```bash
npm test
npm run build
git add app/\(marketing\)/_components/RevealSection.tsx app/\(marketing\)/page.tsx
git commit -m "feat(landing): scroll-triggered section reveals (motion-aware)"
```

---

## Task 13: Manual Real-Device + Lighthouse Pass

**Files:** none

- [ ] **Step 1: Build production bundle**

```bash
npm run build
npm run start
```

- [ ] **Step 2: Lighthouse Mobile-Audit**

Open Chrome DevTools → Lighthouse tab → mobile + Performance/A11y/BP/SEO → Run.

Targets:
- Performance ≥90
- Accessibility ≥95
- Best Practices ≥95
- SEO ≥85

If any target missed: identify culprit in report, fix, re-run.

Common fixes:
- Images: ensure `<img>` has explicit width/height
- Fonts: `display: 'swap'` already set ✓
- LCP: check Hero text is server-rendered ✓

- [ ] **Step 3: Real-device smoke (mobile widths)**

In DevTools, switch to:
- iPhone SE (375×667)
- Pixel 7 (412×915)
- iPad (768×1024)
- Desktop (1280×800)

Verify each section: layout doesn't break, text readable, CTAs reachable, map renders.

- [ ] **Step 4: Reduced-motion smoke**

OS setting → enable reduced motion. Reload `/`. Verify:
- No section-reveal animation
- Hero markers don't pulse
- Living numbers don't tick (jump to final)
- Activity ticker doesn't rotate

Disable reduced motion. Verify all animations resume.

- [ ] **Step 5: Auth-state smoke**

- Logged out: visit `/` → Hero shows 2 CTAs → click "Karte ansehen" → `/map` (read-only) → click "Beta beitreten" in CTA section → `/signup`
- Log in: visit `/` → Hero shows "Zur Karte" only → CTA section shows "Zur Karte" only → click → `/map` (full mode)

- [ ] **Step 6: Document any deferred issues**

If real-device or Lighthouse uncovers issues that weren't blocking but should be tracked, append to a section in `docs/feature-status.md` under "Known Phase 8 follow-ups". Don't fix them now unless they're blockers.

- [ ] **Step 7: Stop server**

Stop `npm run start`.

---

## Task 14: Update Docs (CHANGELOG, AGENTS, feature-status, memory)

**Files:**
- Modify: `CHANGELOG.md`
- Modify: `AGENTS.md`
- Modify: `docs/feature-status.md`
- Modify: `docs/agent-handoff.md`

- [ ] **Step 1: Add CHANGELOG entry**

Prepend to `CHANGELOG.md` (above existing 0.7.1):

```md
## 0.8.0 — Landing Page
*5. Mai 2026*

- 🌿 Neue Startseite: erklärt was Plätzchen ist, mit Live-Karte und Live-Counter
- 🗺️ Die Karte ist jetzt unter `/map` — alte `/`-Bookmarks zeigen jetzt die Landing
- 👀 Karte funktioniert auch ohne Login (nur öffentliche Plätzchen, kein Eintragen/Bewerten)
- ⚡ Live-Zähler: neue Plätzchen erscheinen ohne Refresh
- ♿ Animationen respektieren "Reduzierte Bewegung" in den Systemeinstellungen
```

- [ ] **Step 2: Update AGENTS.md current state**

Find the line `**Current state: Phase 7 + 7.5 Security-Patch complete (v0.7.1).**`. Change to:

```md
**Current state: Phase 8 Landing Page complete (v0.8.0).** Next: Phase 7+ remaining items (SpotMap-Refactor, PWA, Vector Icons, Block), Phase 8.1 SEO/OG-Tags, oder Phase 9 Notifications.
```

Add to the key-rules list:

```md
- `/` is the public Landing Page (Server Component, in `app/(marketing)/`); the map lives at `/map` (in `app/(app)/map/`)
- The map is anon-aware: anonymous users see only `visibility='public'` Spots and have AddSpot/Edit/Favorite hidden via `isAuthenticated={false}` propagation
- All scroll-trigger animations honor `prefers-reduced-motion: reduce` (global override in `globals.css` + `useReducedMotion()` hooks in motion components)
```

- [ ] **Step 3: Update feature-status.md**

Add a `## Phase 8 ✅` section near the top with bullet list of what shipped.

- [ ] **Step 4: Update agent-handoff.md**

Append a "Phase 8 patterns" subsection documenting:
- Marketing route group (no app chrome)
- Reveal-section wrapper pattern (motion + reduced-motion)
- Realtime stat propagation (server initial + client subscription)
- Anon-aware map via `isAuthenticated` prop

- [ ] **Step 5: Update memory**

Update `C:\Users\nikla\.claude\projects\c--Users-nikla-projects-banking-app\memory\project_phase_status.md` to reflect Phase 8 done, v0.8.0 tagged.

Update `MEMORY.md` index entry for phase status.

- [ ] **Step 6: Commit**

```bash
git add CHANGELOG.md AGENTS.md docs/feature-status.md docs/agent-handoff.md
git commit -m "docs(phase8): changelog 0.8.0 + agent docs + handoff patterns"
```

(Memory files are outside the worktree — commit them separately if the user agrees, OR they live outside git entirely.)

---

## Task 15: Merge + Tag + Push

**Files:** none

- [ ] **Step 1: Verify final test + build**

```bash
npm test       # 117 passed
npm run build  # clean
```

- [ ] **Step 2: Hand off to `superpowers:finishing-a-development-branch`**

Don't merge manually here. The finishing-a-development-branch skill will:
- Verify tests pass
- Present 4 options (merge / PR / keep / discard)
- Execute chosen option
- Clean up worktree

- [ ] **Step 3: After merge to master**

Tag `v0.8.0`:

```bash
git tag -a v0.8.0 -m "v0.8.0 — Landing Page

- New public landing page on /
- Map moved to /map
- Anonymous read-only map mode
- Live counter via Supabase realtime
- prefers-reduced-motion gating throughout"
git push origin master --tags
```

- [ ] **Step 4: Vercel deploy + post-deploy smoke**

(If Vercel project is set up.) Use `/deploy` skill or `vercel --prod`. Smoke-test the live URL.

---

## Acceptance (verify against spec)

- [ ] Anon visit `/` → Landing renders with all 5 sections + footer
- [ ] Anon click "Karte ansehen" → `/map` read-only (no AddSpot, no Favorite, no Edit)
- [ ] Anon click "Beta beitreten" → `/signup`
- [ ] Authed visit `/` → Hero shows "Zur Karte" CTA only; Beta section shows "Zur Karte"
- [ ] Living Numbers shows correct initial counts; insert into `spots` (any client) → counter ticks live
- [ ] Activity Ticker rotates 3 events every 3s
- [ ] Topo background has visible parallax shift on scroll
- [ ] `prefers-reduced-motion: reduce` stops all anim (markers, tick-up, ticker, reveals)
- [ ] Lighthouse Mobile: Performance ≥90, A11y ≥95
- [ ] Real-Device: 360–412px all sections legible
- [ ] CHANGELOG.md has 0.8.0 entry
- [ ] git tag `v0.8.0` annotated, pushed
