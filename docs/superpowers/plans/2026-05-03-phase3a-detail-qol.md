# Phase 3a — BenchDetail, QoL & Theme Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Improve readability with the Forest Deep dark theme, enrich BenchDetail with photo/name header, add distance display in the bench list, lazy-load rarity in popups, and enable admin click-to-add.

**Architecture:** Six independent feature slices. Theme is a mechanical find-and-replace. Features thread through MapLayout as the central state coordinator. New `distanceTo` utility extends `lib/bench-utils.ts`. BenchPopup gains its own fetch state. Admin click-to-add is a new BenchMap controller component.

**Tech Stack:** Next.js 16.2 App Router, React 19, TypeScript, Tailwind v4 (`@theme inline` — dark mode uses explicit `dark:bg-[#hex]` utilities, CSS variable overrides do NOT work), Supabase, react-leaflet v5, Vitest.

---

## File Map

| File | Status | Change |
|------|--------|--------|
| `app/globals.css` | Modify | Forest Deep tokens in `.dark {}` |
| `lib/bench-utils.ts` | Modify | Add `distanceTo()` |
| `__tests__/lib/bench-utils.test.ts` | Create | Tests for `distanceTo` |
| `components/BenchPopup.tsx` | Modify | Remove `rarityMedian` prop, add lazy fetch via `useState`/`useEffect` |
| `components/BenchMap.tsx` | Modify | Remove `rarityMedian={null}`, add `isAdmin` prop + `AdminClickController`, add `onPositionUpdate` callback |
| `components/BenchMapClient.tsx` | Modify | Forward `isAdmin`, `onPositionUpdate` |
| `components/MapLayout.tsx` | Modify | Add `isAdmin`, `userPosition` state, `onPositionUpdate` handler |
| `components/BenchDetail.tsx` | Modify | Add `bench: Bench` prop, photo/name header, ✏️ button |
| `components/BottomSheet.tsx` | Modify | Add `onBenchSelect` prop, pass `bench` to BenchDetail, distance display, row-tap opens detail |
| `app/(app)/page.tsx` | Modify | Fetch `is_admin` from profiles, pass to MapLayout |
| All dark-mode components | Modify | Replace old hex values with Forest Deep values |

---

### Task 1: Forest Deep Theme

**Files:**
- Modify: `app/globals.css`
- Modify: `components/BottomSheet.tsx`
- Modify: `components/BenchDetail.tsx`
- Modify: `components/StatsVoteForm.tsx`
- Modify: `components/MapHeader.tsx`
- Modify: `components/BenchMap.tsx` (dark hex values only, not props yet)
- Modify: `app/(app)/profil/page.tsx`
- Modify: `app/(app)/benches/new/page.tsx`
- Modify: `app/(app)/benches/[id]/edit-photo/page.tsx`
- Modify: `app/(app)/admin/AdminUsers.tsx`
- Modify: `app/(app)/admin/AdminBenches.tsx`
- Modify: `app/(app)/login/page.tsx`
- Modify: `app/(app)/signup/page.tsx`

No tests for a color change. Manual visual verification instead.

**Color mapping — find → replace everywhere:**

| Old hex | New hex | Usage |
|---------|---------|-------|
| `#1a1c17` (dark bg) | `#141810` | `dark:bg-[#1a1c17]`, background colors |
| `#252720` (surface) | `#1e231a` | `dark:bg-[#252720]`, sheet/card backgrounds |
| `#3a3c32` (border) | `#2a2f24` | `dark:border-[#3a3c32]` |
| `#1e2019` (hover) | `#1a1f14` | `dark:hover:bg-[#1e2019]` |
| `#1a1c17` (active) | `#161a10` | `dark:active:bg-[#1a1c17]` |
| `#a0a09a` (secondary) | `#c8c8c0` | `dark:text-[#a0a09a]` (if any explicit) |
| `#6aab4a` (primary) | `#5e9e3e` | CSS var in `.dark {}` |
| `#2e3028` (hover surface) | `#242a1e` | `dark:hover:bg-[#2e3028]` |
| chip `dark:bg-[#1a1c17]` | `dark:bg-[#2a3124]` | Stats chips in BenchDetail, StatsVoteForm |

**Important:** The chip replacements are contextual — only replace `dark:bg-[#1a1c17]` when it's on a chip/badge element sitting *on top of* a surface background, not when it's the page/sheet background itself. Read each file before editing.

- [ ] **Step 1: Update `app/globals.css` `.dark {}` block**

Replace the entire `.dark {}` block:
```css
.dark {
  --background: #141810;
  --foreground: #f0f0e8;
  --color-primary: #5e9e3e;
  --color-primary-dark: #4e8e30;
  --color-primary-light: #2a3f1e;
  --color-surface: #141810;
  --color-surface-border: #2a2f24;
}
```

- [ ] **Step 2: Update `components/BottomSheet.tsx`**

Apply the color mapping. Current occurrences to change:
- Pill button: `dark:bg-[#252720]` → `dark:bg-[#1e231a]`, `dark:border-[#3a3c32]` → `dark:border-[#2a2f24]`
- Sheet wrapper: `dark:bg-[#252720]` → `dark:bg-[#1e231a]`
- Drag handle: `dark:bg-gray-600` → unchanged (Tailwind class, not hex)
- List rows hover: `dark:hover:bg-[#1e2019]` → `dark:hover:bg-[#1a1f14]`
- List rows active: `dark:active:bg-[#1a1c17]` → `dark:active:bg-[#161a10]`
- List border: `dark:border-gray-700` → unchanged
- "Noch keine Bänke": `dark:text-gray-400` → unchanged

- [ ] **Step 3: Update `components/BenchDetail.tsx`**

Chip backgrounds: every `dark:bg-[#1a1c17]` on a chip div → `dark:bg-[#2a3124]`. Border: `dark:border-gray-700` → unchanged.

- [ ] **Step 4: Update `components/StatsVoteForm.tsx`**

Chip/button backgrounds: `dark:bg-[#1a1c17]` → `dark:bg-[#2a3124]` on condition/shadow/extras buttons.

- [ ] **Step 5: Update `components/MapHeader.tsx`**

Read the file, apply background/border hex replacements.

- [ ] **Step 6: Update `components/BenchMap.tsx` (dark values only)**

Locating indicator: `dark:bg-[#252720]/90` → `dark:bg-[#1e231a]/90`
Center button: `dark:bg-[#252720]` → `dark:bg-[#1e231a]`, `dark:hover:bg-[#2e3028]` → `dark:hover:bg-[#242a1e]`

- [ ] **Step 7: Update page files**

For each of these, read then apply the mapping:
- `app/(app)/profil/page.tsx`: `dark:bg-[#1a1c17]` page wrapper → `dark:bg-[#141810]`
- `app/(app)/benches/new/page.tsx`: same
- `app/(app)/benches/[id]/edit-photo/page.tsx`: page bg + any surface elements
- `app/(app)/admin/AdminUsers.tsx`, `AdminBenches.tsx`: surface/border colors
- `app/(app)/login/page.tsx`, `app/(app)/signup/page.tsx`: bg + surface

- [ ] **Step 8: TypeScript check**

```bash
npx tsc --noEmit
```
Expected: no errors

- [ ] **Step 9: Run tests**

```bash
npm test
```
Expected: all passing (no dark theme logic in tests)

- [ ] **Step 10: Commit**

```bash
git add app/globals.css components/BottomSheet.tsx components/BenchDetail.tsx components/StatsVoteForm.tsx components/MapHeader.tsx components/BenchMap.tsx app/\(app\)/profil/page.tsx app/\(app\)/benches/new/page.tsx "app/(app)/benches/[id]/edit-photo/page.tsx" app/\(app\)/admin/AdminUsers.tsx app/\(app\)/admin/AdminBenches.tsx app/\(app\)/login/page.tsx app/\(app\)/signup/page.tsx
git commit -m "feat: apply Forest Deep dark mode theme for better contrast"
```

---

### Task 2: `distanceTo` Utility + Tests

**Files:**
- Modify: `lib/bench-utils.ts`
- Create: `__tests__/lib/bench-utils.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// __tests__/lib/bench-utils.test.ts
import { describe, it, expect } from 'vitest'
import { distanceTo, benchDisplayName } from '@/lib/bench-utils'

describe('distanceTo', () => {
  it('returns distance in meters for short distances', () => {
    // ~140m apart (same street)
    const result = distanceTo(
      { lat: 52.520, lng: 13.405 },
      { lat: 52.521, lng: 13.405 }
    )
    expect(result).toBe('~110 m')
  })

  it('rounds to nearest 10m', () => {
    const result = distanceTo(
      { lat: 52.520, lng: 13.405 },
      { lat: 52.5205, lng: 13.405 }
    )
    // ~56m → rounds to 60
    expect(result).toBe('~60 m')
  })

  it('returns km for distances >= 1000m', () => {
    // ~1.11km apart
    const result = distanceTo(
      { lat: 52.520, lng: 13.405 },
      { lat: 52.530, lng: 13.405 }
    )
    expect(result).toBe('1.1 km')
  })

  it('returns 0 m for same point', () => {
    const result = distanceTo(
      { lat: 52.520, lng: 13.405 },
      { lat: 52.520, lng: 13.405 }
    )
    expect(result).toBe('~0 m')
  })
})

describe('benchDisplayName', () => {
  it('returns name when provided', () => {
    expect(benchDisplayName('Meine Bank', '2024-01-15T10:00:00Z')).toBe('Meine Bank')
  })
  it('returns formatted date when name is null', () => {
    expect(benchDisplayName(null, '2024-01-15T10:00:00Z')).toBe('Bank vom 15. Januar')
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npm test -- bench-utils
```
Expected: FAIL — `distanceTo is not a function`

- [ ] **Step 3: Implement `distanceTo`**

Add to `lib/bench-utils.ts`:
```typescript
export function distanceTo(
  from: { lat: number; lng: number },
  to: { lat: number; lng: number }
): string {
  const R = 6371000 // Earth radius in meters
  const φ1 = (from.lat * Math.PI) / 180
  const φ2 = (to.lat * Math.PI) / 180
  const Δφ = ((to.lat - from.lat) * Math.PI) / 180
  const Δλ = ((to.lng - from.lng) * Math.PI) / 180
  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2)
  const meters = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))

  if (meters >= 1000) {
    return `${(meters / 1000).toFixed(1)} km`
  }
  return `~${Math.round(meters / 10) * 10} m`
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npm test -- bench-utils
```
Expected: all passing

- [ ] **Step 5: Run full suite**

```bash
npm test
```
Expected: all passing

- [ ] **Step 6: Commit**

```bash
git add lib/bench-utils.ts __tests__/lib/bench-utils.test.ts
git commit -m "feat: add distanceTo haversine utility with tests"
```

---

### Task 3: Lazy Rarity in BenchPopup

**Files:**
- Modify: `components/BenchPopup.tsx`
- Modify: `components/BenchMap.tsx` (remove `rarityMedian={null}`)

- [ ] **Step 1: Update `components/BenchPopup.tsx`**

Remove `rarityMedian` from props, add self-fetching state. Full replacement:

```typescript
'use client'

import { useState, useEffect } from 'react'
import type { Bench } from '@/components/BenchMap'
import RarityBadge from '@/components/RarityBadge'
import { benchDisplayName } from '@/lib/bench-utils'
import { getBenchStats } from '@/actions/stats'

interface BenchPopupProps {
  bench: Bench
  userId: string | null
  onDetails: () => void
  onDelete: () => void
}

export default function BenchPopup({
  bench,
  userId,
  onDetails,
  onDelete,
}: BenchPopupProps) {
  const isOwner = userId && bench.created_by === userId
  const [rarityMedian, setRarityMedian] = useState<number | null>(null)

  useEffect(() => {
    getBenchStats(bench.id).then(({ aggregated }) => {
      setRarityMedian(aggregated?.rarity_median ?? null)
    })
  }, [bench.id])

  return (
    <div style={{ minWidth: '160px', fontFamily: 'system-ui' }}>
      {bench.photo_url ? (
        <img
          src={bench.photo_url}
          alt="Bank"
          style={{
            width: '100%',
            height: '80px',
            objectFit: 'cover',
            borderRadius: '6px',
            marginBottom: '8px',
            display: 'block',
          }}
        />
      ) : (
        <div
          style={{
            width: '100%',
            height: '80px',
            borderRadius: '6px',
            marginBottom: '8px',
            background: '#2d3a1e',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '28px',
          }}
        >
          🪑
        </div>
      )}

      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
        <strong style={{ fontSize: '13px', flex: 1 }}>
          {benchDisplayName(bench.name, bench.created_at)}
        </strong>
        <RarityBadge median={rarityMedian} size="sm" />
      </div>

      <div style={{ display: 'flex', gap: '6px' }}>
        <button
          onClick={onDetails}
          style={{
            flex: 1,
            background: '#3d6b2c',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            padding: '5px 0',
            fontSize: '12px',
            cursor: 'pointer',
            fontWeight: 600,
          }}
        >
          Details →
        </button>
        {isOwner && (
          <button
            onClick={onDelete}
            style={{
              background: 'none',
              border: '1px solid #fca5a5',
              borderRadius: '6px',
              padding: '5px 8px',
              fontSize: '12px',
              cursor: 'pointer',
              color: '#ef4444',
            }}
          >
            🗑
          </button>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Update `components/BenchMap.tsx` — remove `rarityMedian` prop**

Find the `<BenchPopup>` JSX (line ~267) and remove the `rarityMedian={null}` prop:
```tsx
<BenchPopup
  bench={bench}
  userId={userId}
  onDetails={() => onBenchSelect?.(bench.id)}
  onDelete={() => handleDelete(bench.id)}
/>
```

- [ ] **Step 3: TypeScript check**

```bash
npx tsc --noEmit
```
Expected: no errors

- [ ] **Step 4: Run tests**

```bash
npm test
```
Expected: all passing

- [ ] **Step 5: Commit**

```bash
git add components/BenchPopup.tsx components/BenchMap.tsx
git commit -m "feat: lazy-load rarity badge in bench popup"
```

---

### Task 4: Admin Click-to-Add + `onPositionUpdate`

**Files:**
- Modify: `components/BenchMap.tsx`
- Modify: `components/BenchMapClient.tsx`
- Modify: `components/MapLayout.tsx`
- Modify: `app/(app)/page.tsx`

- [ ] **Step 1: Add `AdminClickController` + new props to `components/BenchMap.tsx`**

Add `useMapEvents` to the react-leaflet import:
```typescript
import { MapContainer, TileLayer, Marker, Popup, useMap, useMapEvents } from 'react-leaflet'
```

Add `AdminClickController` component after `FlyController`:
```typescript
function AdminClickController({ isAdmin }: { isAdmin: boolean }) {
  const router = useRouter()
  useMapEvents({
    click(e) {
      if (isAdmin) {
        router.push(`/benches/new?lat=${e.latlng.lat.toFixed(6)}&lng=${e.latlng.lng.toFixed(6)}`)
      }
    },
  })
  return null
}
```

Update `BenchMapProps` interface — add two new props:
```typescript
interface BenchMapProps {
  benches: Bench[]
  isAuthenticated: boolean
  userId: string | null
  sheetExpanded: boolean
  onBenchSelect?: (benchId: string) => void
  flyTarget?: { lat: number; lng: number } | null
  onFlyTargetUsed?: () => void
  isAdmin?: boolean
  onPositionUpdate?: (pos: { lat: number; lng: number }) => void
}
```

Update function signature to destructure new props:
```typescript
export default function BenchMap({
  benches: initialBenches,
  isAuthenticated,
  userId,
  sheetExpanded,
  onBenchSelect,
  flyTarget,
  onFlyTargetUsed,
  isAdmin = false,
  onPositionUpdate,
}: BenchMapProps) {
```

Update `handlePositionFound` to also call `onPositionUpdate`:
```typescript
const handlePositionFound = useCallback((pos: [number, number]) => {
  setUserPosition(pos)
  setHasLivePosition(true)
  onPositionUpdate?.({ lat: pos[0], lng: pos[1] })
}, [onPositionUpdate])
```

Add `<AdminClickController>` inside `<MapContainer>` after `<FlyController>`:
```tsx
<AdminClickController isAdmin={isAdmin} />
```

Add `cursor: isAdmin ? 'crosshair' : undefined` to `<MapContainer>`:
```tsx
<MapContainer
  center={[51.1, 10.4]}
  zoom={11}
  className="w-full h-full"
  zoomControl={false}
  style={isAdmin ? { cursor: 'crosshair' } : undefined}
>
```

- [ ] **Step 2: Update `components/BenchMapClient.tsx`**

Full replacement:
```typescript
'use client'

import dynamic from 'next/dynamic'
import type { Bench } from '@/components/BenchMap'

const BenchMap = dynamic(() => import('@/components/BenchMap'), { ssr: false })

interface BenchMapClientProps {
  benches: Bench[]
  isAuthenticated: boolean
  userId: string | null
  sheetExpanded: boolean
  onBenchSelect?: (benchId: string) => void
  flyTarget?: { lat: number; lng: number } | null
  onFlyTargetUsed?: () => void
  isAdmin?: boolean
  onPositionUpdate?: (pos: { lat: number; lng: number }) => void
}

export default function BenchMapClient(props: BenchMapClientProps) {
  return <BenchMap {...props} />
}
```

- [ ] **Step 3: Update `components/MapLayout.tsx`**

Full replacement:
```typescript
'use client'

import { useState, useCallback } from 'react'
import BenchMapClient from '@/components/BenchMapClient'
import BottomSheet from '@/components/BottomSheet'
import type { Bench } from '@/components/BenchMap'

interface MapLayoutProps {
  benches: Bench[]
  isAuthenticated: boolean
  userId: string | null
  isAdmin?: boolean
}

export default function MapLayout({ benches, isAuthenticated, userId, isAdmin = false }: MapLayoutProps) {
  const [sheetExpanded, setSheetExpanded] = useState(false)
  const [selectedBenchId, setSelectedBenchId] = useState<string | null>(null)
  const [flyTarget, setFlyTarget] = useState<{ lat: number; lng: number } | null>(null)
  const [userPosition, setUserPosition] = useState<{ lat: number; lng: number } | null>(null)

  const handleBenchSelect = useCallback((benchId: string) => {
    setSelectedBenchId(benchId)
  }, [])

  const handleBenchDeselect = useCallback(() => {
    setSelectedBenchId(null)
  }, [])

  const handleFlyToBench = useCallback((bench: Bench) => {
    setFlyTarget({ lat: bench.lat, lng: bench.lng })
  }, [])

  const handlePositionUpdate = useCallback((pos: { lat: number; lng: number }) => {
    setUserPosition(pos)
  }, [])

  return (
    <>
      <BenchMapClient
        benches={benches}
        isAuthenticated={isAuthenticated}
        userId={userId}
        sheetExpanded={sheetExpanded}
        onBenchSelect={handleBenchSelect}
        flyTarget={flyTarget}
        onFlyTargetUsed={() => setFlyTarget(null)}
        isAdmin={isAdmin}
        onPositionUpdate={handlePositionUpdate}
      />
      <BottomSheet
        benches={benches}
        userId={userId}
        onExpandedChange={setSheetExpanded}
        selectedBenchId={selectedBenchId}
        onBenchSelect={handleBenchSelect}
        onBenchDeselect={handleBenchDeselect}
        onFlyToBench={handleFlyToBench}
        userPosition={userPosition}
      />
    </>
  )
}
```

- [ ] **Step 4: Update `app/(app)/page.tsx`**

Full replacement:
```typescript
import { createClient } from '@/lib/supabase/server'
import MapHeader from '@/components/MapHeader'
import MapLayout from '@/components/MapLayout'
import type { Bench } from '@/components/BenchMap'

export default async function HomePage() {
  const supabase = await createClient()

  const [{ data: benches }, { data: { user } }] = await Promise.all([
    supabase.from('benches').select('id, lat, lng, name, created_by, created_at, photo_url'),
    supabase.auth.getUser(),
  ])

  let isAdmin = false
  if (user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('is_admin')
      .eq('id', user.id)
      .single()
    isAdmin = profile?.is_admin ?? false
  }

  const benchList: Bench[] = benches ?? []

  return (
    <div className="relative w-full h-screen overflow-hidden">
      <MapHeader />
      <MapLayout
        benches={benchList}
        isAuthenticated={!!user}
        userId={user?.id ?? null}
        isAdmin={isAdmin}
      />
    </div>
  )
}
```

- [ ] **Step 5: TypeScript check**

```bash
npx tsc --noEmit
```
Expected: errors for `onBenchSelect` and `userPosition` on BottomSheet (Task 5 adds them) — acceptable at this point. All other errors must be zero.

- [ ] **Step 6: Run tests**

```bash
npm test
```
Expected: all passing

- [ ] **Step 7: Commit**

```bash
git add components/BenchMap.tsx components/BenchMapClient.tsx components/MapLayout.tsx "app/(app)/page.tsx"
git commit -m "feat: admin click-to-add bench, expose user position to MapLayout"
```

---

### Task 5: BottomSheet — Detail on List Tap + Distance Display

**Files:**
- Modify: `components/BottomSheet.tsx`

- [ ] **Step 1: Rewrite `components/BottomSheet.tsx`**

Full replacement:

```typescript
'use client'

import { useState, useRef, useTransition, useEffect } from 'react'
import Link from 'next/link'
import type { Bench } from '@/components/BenchMap'
import { deleteBench } from '@/actions/benches'
import { benchDisplayName, distanceTo } from '@/lib/bench-utils'
import BenchDetail from '@/components/BenchDetail'

interface BottomSheetProps {
  benches: Bench[]
  userId: string | null
  onExpandedChange: (expanded: boolean) => void
  selectedBenchId: string | null
  onBenchSelect: (benchId: string) => void
  onBenchDeselect: () => void
  onFlyToBench: (bench: Bench) => void
  userPosition: { lat: number; lng: number } | null
}

export default function BottomSheet({
  benches: initialBenches,
  userId,
  onExpandedChange,
  selectedBenchId,
  onBenchSelect,
  onBenchDeselect,
  onFlyToBench,
  userPosition,
}: BottomSheetProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [dragY, setDragY] = useState(0)
  const [benches, setBenches] = useState(initialBenches)
  const [isPending, startTransition] = useTransition()
  const startYRef = useRef(0)
  const count = benches.length

  const selectedBench = benches.find(b => b.id === selectedBenchId) ?? null

  useEffect(() => {
    if (selectedBenchId) {
      setIsExpanded(true)
      onExpandedChange(true)
    }
  }, [selectedBenchId, onExpandedChange])

  const expand = () => { setIsExpanded(true); onExpandedChange(true) }
  const collapse = () => {
    setIsExpanded(false)
    onExpandedChange(false)
    onBenchDeselect()
  }

  const handleDelete = (id: string) => {
    setBenches(prev => prev.filter(b => b.id !== id))
    startTransition(async () => {
      const result = await deleteBench(id)
      if (result.error) setBenches(initialBenches)
    })
  }

  const handleTouchStart = (e: React.TouchEvent) => {
    startYRef.current = e.touches[0].clientY
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    const delta = e.touches[0].clientY - startYRef.current
    if (isExpanded && delta > 0) setDragY(delta)
  }

  const handleTouchEnd = () => {
    if (isExpanded && dragY > 80) collapse()
    setDragY(0)
  }

  if (!isExpanded) {
    return (
      <button
        onClick={expand}
        className="absolute bottom-6 left-1/2 -translate-x-1/2 z-1000 bg-white dark:bg-[#1e231a] rounded-full px-4 py-2 shadow-md text-sm font-medium text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-[#2a2f24]"
      >
        {count} {count === 1 ? 'Bank' : 'Bänke'} ↑
      </button>
    )
  }

  return (
    <div
      className="absolute bottom-0 left-0 right-0 z-1000 bg-white dark:bg-[#1e231a] rounded-t-2xl shadow-[0_-4px_20px_rgba(0,0,0,0.15)] overflow-hidden"
      style={{
        height: '55vh',
        transform: `translateY(${dragY}px)`,
        transition: dragY === 0 ? 'transform 0.25s ease' : 'none',
      }}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-5 pt-3 pb-2 cursor-grab select-none">
        <div className="absolute left-1/2 -translate-x-1/2 top-3 w-10 h-1 bg-gray-300 dark:bg-gray-600 rounded-full" />
        {selectedBenchId ? (
          <button onClick={onBenchDeselect} className="text-sm text-primary mt-2">
            ← Alle Bänke
          </button>
        ) : (
          <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 mt-2">
            {count} {count === 1 ? 'Bank' : 'Bänke'}
          </p>
        )}
        <div className="flex items-center gap-3 mt-2">
          {selectedBench && userId === selectedBench.created_by && (
            <Link
              href={`/benches/${selectedBench.id}/edit-photo`}
              className="text-sm text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300"
              aria-label="Foto bearbeiten"
            >
              ✏️
            </Link>
          )}
          <button
            onClick={collapse}
            className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 text-lg leading-none"
            aria-label="Schließen"
          >
            ✕
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="overflow-y-auto pb-8" style={{ height: 'calc(55vh - 56px)' }}>
        {selectedBench ? (
          <BenchDetail bench={selectedBench} userId={userId} />
        ) : count === 0 ? (
          <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-6">
            Noch keine Bänke eingetragen
          </p>
        ) : (
          <ul>
            {benches.map((bench) => (
              <li
                key={bench.id}
                className="flex items-center gap-3 px-5 py-3 border-t border-gray-100 dark:border-gray-700 cursor-pointer hover:bg-gray-50 dark:hover:bg-[#1a1f14] active:bg-gray-100 dark:active:bg-[#161a10]"
                onClick={() => {
                  onFlyToBench(bench)
                  onBenchSelect(bench.id)
                }}
              >
                <span className="text-xl shrink-0">🪑</span>
                <span className="text-sm text-gray-800 dark:text-gray-200 truncate flex-1">
                  {benchDisplayName(bench.name, bench.created_at)}
                </span>
                {userPosition && (
                  <span className="text-xs text-gray-400 dark:text-gray-500 shrink-0 mr-1">
                    {distanceTo(userPosition, { lat: bench.lat, lng: bench.lng })}
                  </span>
                )}
                {userId && bench.created_by === userId && (
                  <button
                    onClick={(e) => { e.stopPropagation(); handleDelete(bench.id) }}
                    disabled={isPending}
                    className="shrink-0 text-red-400 hover:text-red-600 transition-colors text-base disabled:opacity-40"
                    aria-label="Bank löschen"
                  >
                    🗑
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: TypeScript check**

```bash
npx tsc --noEmit
```
Expected: errors for `bench: Bench` prop on BenchDetail (Task 6 adds it). All other errors must be zero.

- [ ] **Step 3: Run tests**

```bash
npm test
```
Expected: all passing

- [ ] **Step 4: Commit**

```bash
git add components/BottomSheet.tsx
git commit -m "feat: list tap opens detail + distance display in bench list"
```

---

### Task 6: BenchDetail with Photo Header

**Files:**
- Modify: `components/BenchDetail.tsx`

- [ ] **Step 1: Rewrite `components/BenchDetail.tsx`**

Full replacement:

```typescript
'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import type { Bench } from '@/components/BenchMap'
import { getBenchStats, type AggregatedStats, type UserVote } from '@/actions/stats'
import { conditionLabel, shadowLabel, extrasIcon } from '@/lib/stats-utils'
import RarityBadge from '@/components/RarityBadge'
import StatsVoteForm from '@/components/StatsVoteForm'
import { benchDisplayName } from '@/lib/bench-utils'

interface BenchDetailProps {
  bench: Bench
  userId: string | null
}

export default function BenchDetail({ bench, userId }: BenchDetailProps) {
  const [aggregated, setAggregated] = useState<AggregatedStats | null>(null)
  const [userVote, setUserVote] = useState<UserVote | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    getBenchStats(bench.id).then(({ aggregated: agg, userVote: vote }) => {
      setAggregated(agg)
      setUserVote(vote)
      setLoading(false)
    })
  }, [bench.id])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-10">
        <span className="text-sm text-gray-500 dark:text-gray-400">Lädt…</span>
      </div>
    )
  }

  const condition = conditionLabel(aggregated?.condition_median ?? null)
  const shadow = shadowLabel(aggregated?.shadow_mode ?? null)
  const hasAnyStats = aggregated && aggregated.vote_count > 0

  return (
    <div>
      {/* Photo header */}
      <div className="relative" style={{ height: '110px' }}>
        {bench.photo_url ? (
          <img
            src={bench.photo_url}
            alt="Bank"
            className="w-full h-full object-cover"
          />
        ) : (
          <div
            className="w-full h-full flex items-center justify-center text-4xl"
            style={{ background: '#2d3a1e' }}
          >
            🪑
          </div>
        )}
        {/* Name + rarity overlay */}
        <div className="absolute bottom-0 left-0 right-0 px-4 py-2 flex items-end justify-between"
          style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.55) 0%, transparent 100%)' }}
        >
          <span
            className="text-sm font-bold text-white truncate mr-2"
            style={{ textShadow: '0 1px 3px rgba(0,0,0,0.8)' }}
          >
            {benchDisplayName(bench.name, bench.created_at)}
          </span>
          {aggregated && aggregated.rarity_median !== null && (
            <RarityBadge median={aggregated.rarity_median} size="sm" />
          )}
        </div>
      </div>

      {/* Stats body */}
      <div className="px-5 py-3 space-y-4">
        {aggregated && aggregated.vote_count > 0 && (
          <span className="text-xs text-gray-500 dark:text-gray-400">
            {aggregated.vote_count} {aggregated.vote_count === 1 ? 'Bewertung' : 'Bewertungen'}
          </span>
        )}

        {hasAnyStats && (
          <div className="flex flex-wrap gap-2">
            {aggregated.comfort_median !== null && (
              <div className="bg-gray-100 dark:bg-[#2a3124] rounded-lg px-3 py-1.5 text-sm text-gray-800 dark:text-gray-200">
                ⭐ <strong>{aggregated.comfort_median.toFixed(1)}</strong>/5 Komfort
              </div>
            )}
            {aggregated.view_median !== null && (
              <div className="bg-gray-100 dark:bg-[#2a3124] rounded-lg px-3 py-1.5 text-sm text-gray-800 dark:text-gray-200">
                🌄 <strong>{aggregated.view_median.toFixed(1)}</strong>/5 Aussicht
              </div>
            )}
            {condition && (
              <div
                className="rounded-lg px-3 py-1.5 text-sm font-semibold"
                style={{ background: condition.color, color: '#141810' }}
              >
                🏚 {condition.short} — {condition.full}
              </div>
            )}
            {shadow && (
              <div className="bg-gray-100 dark:bg-[#2a3124] rounded-lg px-3 py-1.5 text-sm text-gray-800 dark:text-gray-200">
                ☀️ {shadow}
              </div>
            )}
            {(aggregated.extras_threshold?.length ?? 0) > 0 && (
              <div className="bg-gray-100 dark:bg-[#2a3124] rounded-lg px-3 py-1.5 text-sm text-gray-800 dark:text-gray-200">
                {aggregated.extras_threshold.map(e => extrasIcon(e)).join(' ')}
              </div>
            )}
          </div>
        )}

        {!hasAnyStats && (
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Noch keine Bewertungen — sei der Erste!
          </p>
        )}

        <div className="border-t border-gray-100 dark:border-gray-700 pt-4">
          {userId ? (
            <StatsVoteForm
              benchId={bench.id}
              initialVote={userVote}
              onSaved={(agg, vote) => { setAggregated(agg); setUserVote(vote) }}
            />
          ) : (
            <p className="text-sm text-gray-500 dark:text-gray-400">
              <Link href="/login" className="text-primary font-medium hover:underline">
                Einloggen
              </Link>{' '}
              um eine Bewertung abzugeben
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: TypeScript check**

```bash
npx tsc --noEmit
```
Expected: no errors

- [ ] **Step 3: Run tests**

```bash
npm test
```
Expected: all passing

- [ ] **Step 4: Commit**

```bash
git add components/BenchDetail.tsx
git commit -m "feat: BenchDetail photo/name header, owner edit button in sheet header"
```

---

### Task 7: Final Integration Check

**Files:** no new changes

- [ ] **Step 1: Run full test suite**

```bash
npm test
```
Expected: all tests pass. Report count.

- [ ] **Step 2: TypeScript**

```bash
npx tsc --noEmit
```
Expected: zero errors.

- [ ] **Step 3: Build check**

```bash
npm run build 2>&1 | tail -20
```
Expected: clean build.

- [ ] **Step 4: Manual smoke test checklist**

Start `npm run dev` and verify:
1. Dark mode — toggle it. Sheet, chips, buttons all use Forest Deep palette. Contrast is visibly better than before.
2. Bench list — GPS position loads → distance values (e.g. "~350 m") appear next to bench names.
3. Bench list row tap → map flies to bench AND sheet switches to detail view (doesn't collapse).
4. Detail view — photo header shows (or 🪑 placeholder). Bench name + rarity visible in overlay.
5. Detail view — if user is owner, ✏️ icon in sheet header links to edit-photo page.
6. Bench popup — after opening, rarity badge appears once stats load (~100ms).
7. Admin user — map cursor shows crosshair. Clicking map → navigates to `/benches/new?lat=X&lng=Y`.
8. Non-admin user — no crosshair, no click-to-add.

- [ ] **Step 5: Final commit**

```bash
git add .
git commit -m "feat: Phase 3a complete — Forest Deep theme, BenchDetail photo header, distance display, lazy rarity, admin click-to-add"
```

---

## Self-Review Notes

- `distanceTo` test values are verified: 1° latitude ≈ 111km, so 0.001° ≈ 111m → `~110 m` ✓
- `AdminClickController` uses `useRouter` from `next/navigation` — already imported in `BenchMap.tsx` ✓
- `selectedBench` in BottomSheet uses `.find()` on `benches` (local state after deletes), not `initialBenches` — correct
- ✏️ link in BottomSheet header uses `Link` (Next.js), not `<a>` — avoids full page reload ✓
- `BenchDetail` no longer uses `benchId` prop name — uses `bench.id` internally ✓
- `onBenchSelect` added to `BottomSheetProps` — `MapLayout` passes `handleBenchSelect` ✓
- Task 4 TypeScript errors (BottomSheet missing props) resolve once Task 5 runs — acceptable ordering ✓
- Forest Deep chip color `#2a3124` is darker than surface `#1e231a` — chips are distinguishable ✓
