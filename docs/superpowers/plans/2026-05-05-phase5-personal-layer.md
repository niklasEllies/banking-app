# Phase 5 — Personal Layer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Favorites + view-mode tabs (Alle/Eigene/Favoriten) + spot edit + distance-based default sorting + action menu in sheet header.

**Architecture:** Migration first; favorites infra (table → actions → server fetch propagation); UI additions (action menu, heart toggle, edit form, view tabs); docs.

**Tech Stack:** Next.js 16.2 + React 19 + TypeScript + Tailwind v4 + Supabase + Leaflet + vitest 4.

**Spec:** `docs/superpowers/specs/2026-05-05-phase5-personal-layer-design.md`

---

## File Structure Overview

| File | Action |
|---|---|
| `supabase/migrations/008_phase5_favorites.sql` | Create |
| `lib/spot-utils.ts` | Modify (add `distMeters`) |
| `__tests__/lib/spot-utils.test.ts` | Modify (test distMeters) |
| `actions/favorites.ts` | Create |
| `__tests__/actions/favorites.test.ts` | Create |
| `actions/spots.ts` | Modify (add `updateSpot`) |
| `__tests__/actions/spots.test.ts` | Modify (test updateSpot) |
| `app/(app)/page.tsx` | Modify (fetch favorite IDs) |
| `components/MapLayout.tsx` | Modify (favoriteIds state, plumbing) |
| `components/SpotActionMenu.tsx` | Create |
| `components/SpotDetail.tsx` | Modify (heart toggle + ActionMenu) |
| `components/SpotEditForm.tsx` | Create |
| `app/(app)/spots/[id]/edit/page.tsx` | Create |
| `components/BottomSheet.tsx` | Modify (tabs, sort, view-mode persistence, login-CTAs) |
| `AGENTS.md`, `docs/*.md` | Modify (final pass) |

---

## Task 1: Migration 008 — `favorites` Table

**Files:**
- Create: `supabase/migrations/008_phase5_favorites.sql`

- [ ] **Step 1: Write migration**

```sql
CREATE TABLE public.favorites (
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  spot_id uuid NOT NULL REFERENCES public.spots(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, spot_id)
);

CREATE INDEX idx_favorites_user_id ON public.favorites(user_id, created_at DESC);

ALTER TABLE public.favorites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own favorites"
  ON public.favorites FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own favorite"
  ON public.favorites FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own favorite"
  ON public.favorites FOR DELETE TO authenticated
  USING (auth.uid() = user_id);
```

- [ ] **Step 2: Apply via Supabase MCP**

Use `mcp__plugin_supabase_supabase__apply_migration` with name `phase5_favorites`.

- [ ] **Step 3: Verify**

Use `execute_sql`:
```sql
SELECT polname, polcmd FROM pg_policy WHERE polrelid = 'favorites'::regclass ORDER BY polname;
SELECT indexname FROM pg_indexes WHERE tablename = 'favorites';
```
Expected: 3 policies (r/a/d), index exists.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/008_phase5_favorites.sql
git commit -m "feat(db): add favorites table with private RLS (migration 008)"
```

---

## Task 2: `distMeters` helper in `lib/spot-utils.ts`

**Files:**
- Modify: `lib/spot-utils.ts`
- Modify: `__tests__/lib/spot-utils.test.ts`

- [ ] **Step 1: Write the failing test**

Append to `__tests__/lib/spot-utils.test.ts`:

```ts
import { distMeters } from '@/lib/spot-utils'

describe('distMeters', () => {
  it('returns 0 for identical coords', () => {
    expect(distMeters({ lat: 52.520, lng: 13.405 }, { lat: 52.520, lng: 13.405 })).toBe(0)
  })

  it('returns ~111 m for 0.001° latitude difference', () => {
    const m = distMeters({ lat: 52.520, lng: 13.405 }, { lat: 52.521, lng: 13.405 })
    expect(m).toBeGreaterThan(105)
    expect(m).toBeLessThan(115)
  })

  it('returns symmetric distance', () => {
    const a = { lat: 52.5, lng: 13.4 }
    const b = { lat: 52.6, lng: 13.5 }
    expect(distMeters(a, b)).toBeCloseTo(distMeters(b, a), 1)
  })
})
```

- [ ] **Step 2: Run failing test**

```bash
npm test -- spot-utils
```
Expected: FAIL — `distMeters` undefined.

- [ ] **Step 3: Implement**

Add to `lib/spot-utils.ts` (above or below `distanceTo`):

```ts
export function distMeters(
  from: { lat: number; lng: number },
  to: { lat: number; lng: number },
): number {
  const R = 6371000
  const φ1 = (from.lat * Math.PI) / 180
  const φ2 = (to.lat * Math.PI) / 180
  const Δφ = ((to.lat - from.lat) * Math.PI) / 180
  const Δλ = ((to.lng - from.lng) * Math.PI) / 180
  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2)
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}
```

(Optional refactor: have `distanceTo` call `distMeters` internally to remove duplication. Up to you — minor.)

- [ ] **Step 4: Run tests**

```bash
npm test -- spot-utils
```
Expected: 10/10 passing (7 prior + 3 new).

- [ ] **Step 5: Commit**

```bash
git add lib/spot-utils.ts __tests__/lib/spot-utils.test.ts
git commit -m "feat: add distMeters raw distance helper for sort logic"
```

---

## Task 3: `actions/favorites.ts` (TDD)

**Files:**
- Create: `actions/favorites.ts`
- Create: `__tests__/actions/favorites.test.ts`

- [ ] **Step 1: Write the failing tests**

Pattern follows `__tests__/actions/descriptions.test.ts` and `__tests__/actions/spots.test.ts`. Required cases:

1. `listFavoriteSpotIds` returns `[]` when user is not authenticated.
2. `listFavoriteSpotIds` returns the array of `spot_id`s for the authenticated user.
3. `addFavorite` rejects unauthenticated → `{ error: 'Nicht eingeloggt' }`.
4. `addFavorite` performs upsert (idempotent — second call doesn't error).
5. `removeFavorite` rejects unauthenticated → `{ error: 'Nicht eingeloggt' }`.
6. `removeFavorite` deletes by `(user_id = auth.uid(), spot_id = arg)`.

Use the same `vi.mock` pattern (`'next/cache'`, `'@/lib/supabase/server'`) as `descriptions.test.ts`.

- [ ] **Step 2: Run failing tests**

```bash
npm test -- favorites
```
Expected: FAIL — module doesn't exist.

- [ ] **Step 3: Implement `actions/favorites.ts`**

```ts
'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

export async function listFavoriteSpotIds(): Promise<string[]> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const { data, error } = await supabase
    .from('favorites')
    .select('spot_id')
    .eq('user_id', user.id)

  if (error || !data) return []
  return data.map((r: { spot_id: string }) => r.spot_id)
}

export async function addFavorite(spotId: string): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Nicht eingeloggt' }

  const { error } = await supabase
    .from('favorites')
    .upsert({ user_id: user.id, spot_id: spotId }, { onConflict: 'user_id,spot_id' })

  if (error) return { error: error.message }
  revalidatePath('/')
  return {}
}

export async function removeFavorite(spotId: string): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Nicht eingeloggt' }

  const { error } = await supabase
    .from('favorites')
    .delete()
    .eq('user_id', user.id)
    .eq('spot_id', spotId)

  if (error) return { error: error.message }
  revalidatePath('/')
  return {}
}
```

- [ ] **Step 4: Run tests**

```bash
npm test -- favorites
```
Expected: 6/6 passing.

- [ ] **Step 5: Run full suite**

```bash
npm test
```
Expected: 73 passing (64 baseline + 3 distMeters + 6 favorites).

- [ ] **Step 6: Commit**

```bash
git add actions/favorites.ts __tests__/actions/favorites.test.ts
git commit -m "feat: favorites server actions (list/add/remove) + tests"
```

---

## Task 4: `updateSpot` in `actions/spots.ts` (TDD)

**Files:**
- Modify: `actions/spots.ts`
- Modify: `__tests__/actions/spots.test.ts`

- [ ] **Step 1: Write failing test**

Append to `__tests__/actions/spots.test.ts`:

```ts
describe('updateSpot', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('rejects unauthenticated', async () => {
    mockClient.auth.getUser.mockResolvedValue({ data: { user: null } })
    const result = await updateSpot('spot-1', { name: 'New', type: 'bench' })
    expect(result.error).toBe('Nicht eingeloggt')
  })

  it('rejects when not owner', async () => {
    mockClient.auth.getUser.mockResolvedValue({ data: { user: { id: 'user-1' } } })
    // setup: spot.created_by = user-2
    // ... mock chain returns { data: { created_by: 'user-2' }, error: null }
    const result = await updateSpot('spot-1', { name: 'X', type: 'bench' })
    expect(result.error).toBe('Keine Berechtigung')
  })

  it('rejects invalid type', async () => {
    const result = await updateSpot('spot-1', { name: 'X', type: 'invalid-type' as never })
    expect(result.error).toBe('Ungültiger Spot-Typ')
  })

  it('updates name and type when owner', async () => {
    // Authenticated user-1, spot.created_by = user-1, then update succeeds
    // Verify mock .update was called with the right body
  })
})
```

(Add `import { updateSpot } from '@/actions/spots'`. Adapt mock helpers to whatever pattern the existing spots.test.ts uses for the ownership chain.)

- [ ] **Step 2: Run failing test**

```bash
npm test -- spots
```
Expected: FAIL — `updateSpot` undefined.

- [ ] **Step 3: Implement `updateSpot` in `actions/spots.ts`**

Add at the bottom of the file (alongside `createSpot`, `deleteSpot`, `uploadSpotPhoto`):

```ts
const VALID_TYPES_UPDATE: SpotType[] = ['bench', 'viewpoint', 'shelter', 'picnic', 'meadow', 'water']

export async function updateSpot(
  spotId: string,
  fields: { name: string | null; type: SpotType },
): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Nicht eingeloggt' }

  if (!VALID_TYPES_UPDATE.includes(fields.type)) {
    return { error: 'Ungültiger Spot-Typ' }
  }

  const { data: spot, error: spotError } = await supabase
    .from('spots')
    .select('created_by')
    .eq('id', spotId)
    .maybeSingle()

  if (spotError) return { error: 'Spot konnte nicht geprüft werden' }
  if (!spot) return { error: 'Spot nicht gefunden' }
  if (spot.created_by !== user.id) return { error: 'Keine Berechtigung' }

  const cleanedName = fields.name?.trim() || null
  const { error } = await supabase
    .from('spots')
    .update({ name: cleanedName, type: fields.type })
    .eq('id', spotId)

  if (error) return { error: error.message }

  revalidatePath('/')
  return {}
}
```

- [ ] **Step 4: Run tests**

```bash
npm test
```
Expected: full suite green.

- [ ] **Step 5: Commit**

```bash
git add actions/spots.ts __tests__/actions/spots.test.ts
git commit -m "feat: updateSpot server action (owner-only, validates type)"
```

---

## Task 5: Server-Side Favorite IDs Fetch + Plumbing

**Files:**
- Modify: `app/(app)/page.tsx`
- Modify: `components/MapLayout.tsx`
- Modify: `components/BottomSheet.tsx` (just prop addition for now — full tab UI in Task 9)

- [ ] **Step 1: Fetch favorites in `page.tsx`**

```ts
import { listFavoriteSpotIds } from '@/actions/favorites'

// Inside HomePage, after isAdmin check:
let favoriteIds: string[] = []
if (user) {
  favoriteIds = await listFavoriteSpotIds()
}

// Pass to MapLayout:
<MapLayout
  spots={spotList}
  isAuthenticated={!!user}
  userId={user?.id ?? null}
  isAdmin={isAdmin}
  initialFavoriteIds={favoriteIds}
/>
```

- [ ] **Step 2: Add `favoriteIds` state to `MapLayout.tsx`**

```ts
interface MapLayoutProps {
  // ...existing...
  initialFavoriteIds?: string[]
}

const [favoriteIds, setFavoriteIds] = useState<Set<string>>(
  () => new Set(initialFavoriteIds),
)

const handleFavoriteChange = useCallback((spotId: string, isFav: boolean) => {
  setFavoriteIds((prev) => {
    const next = new Set(prev)
    if (isFav) next.add(spotId)
    else next.delete(spotId)
    return next
  })
}, [])
```

Pass to BottomSheet:
```tsx
<BottomSheet
  // ...existing props...
  favoriteIds={favoriteIds}
  onFavoriteChange={handleFavoriteChange}
/>
```

- [ ] **Step 3: Add prop to BottomSheet**

`BottomSheetProps`:
```ts
favoriteIds: Set<string>
onFavoriteChange: (spotId: string, isFav: boolean) => void
```

(Don't use them yet — just accept. Tasks 7+9 wire them up.)

- [ ] **Step 4: Build + tests**

```bash
npm run build
npm test
```
Both clean. Tests stay where they were.

- [ ] **Step 5: Commit**

```bash
git add app actions components
git commit -m "feat: fetch and plumb favoriteIds Set from server through MapLayout"
```

---

## Task 6: `SpotActionMenu` Component

**Files:**
- Create: `components/SpotActionMenu.tsx`

- [ ] **Step 1: Implement**

```tsx
'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'

interface MenuItem {
  label: string
  href: string
  emoji: string
}

interface SpotActionMenuProps {
  items: MenuItem[]
}

export default function SpotActionMenu({ items }: SpotActionMenuProps) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Aktionen"
        className="min-w-11 min-h-11 flex items-center justify-center text-sm text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300"
      >
        ✏️
      </button>
      {open && (
        <div
          role="menu"
          className="absolute right-0 top-full mt-1 bg-white dark:bg-[#1e231a] border border-gray-200 dark:border-[#2a2f24] rounded-lg shadow-lg z-[1100] min-w-44 py-1"
        >
          {items.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              role="menuitem"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2 px-3 py-2.5 text-sm text-gray-800 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-[#2a3124]"
            >
              <span className="text-base" aria-hidden="true">{item.emoji}</span>
              {item.label}
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Build**

```bash
npm run build
```
Clean.

- [ ] **Step 3: Commit**

```bash
git add components/SpotActionMenu.tsx
git commit -m "feat: SpotActionMenu — dropdown for owner spot actions"
```

---

## Task 7: SpotDetail — Heart Toggle + ActionMenu Integration

**Files:**
- Modify: `components/SpotDetail.tsx`
- Modify: `components/BottomSheet.tsx` (header replacement: heart + menu)

- [ ] **Step 1: Heart toggle logic in `BottomSheet.tsx` (where the header is rendered)**

The heart goes in the sheet header (currently has `[✏️] [✕]`). Pass `isFavorite` derived from `favoriteIds.has(selectedSpot.id)` to a new `<FavoriteToggle>` inline component, OR add inline.

Inline approach in BottomSheet sheet-header:

```tsx
{userId && selectedSpot && (
  <FavoriteToggle
    spotId={selectedSpot.id}
    isFavorite={favoriteIds.has(selectedSpot.id)}
    onChange={onFavoriteChange}
  />
)}
{selectedSpot && userId === selectedSpot.created_by ? (
  <SpotActionMenu
    items={[
      { emoji: '📷', label: 'Foto bearbeiten', href: `/spots/${selectedSpot.id}/edit-photo` },
      { emoji: '📝', label: 'Spot bearbeiten', href: `/spots/${selectedSpot.id}/edit` },
    ]}
  />
) : null}
<button onClick={collapse} aria-label="Schließen" ...>✕</button>
```

Replace the existing `<Link href="/spots/[id]/edit-photo">✏️</Link>` block with the SpotActionMenu (only renders for owner).

- [ ] **Step 2: Implement `FavoriteToggle` inline (or as a small standalone subcomponent)**

Either keep inline at the top of `BottomSheet.tsx` (simpler) or extract to `components/FavoriteToggle.tsx`. I'd extract — easier to reason about and the optimistic-update logic deserves isolation.

Create `components/FavoriteToggle.tsx`:

```tsx
'use client'

import { useState, useTransition } from 'react'
import { addFavorite, removeFavorite } from '@/actions/favorites'

interface FavoriteToggleProps {
  spotId: string
  isFavorite: boolean
  onChange: (spotId: string, isFav: boolean) => void
}

export default function FavoriteToggle({ spotId, isFavorite, onChange }: FavoriteToggleProps) {
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState(false)

  const toggle = () => {
    const next = !isFavorite
    onChange(spotId, next) // optimistic
    setError(false)
    startTransition(async () => {
      const result = next ? await addFavorite(spotId) : await removeFavorite(spotId)
      if (result.error) {
        onChange(spotId, !next) // revert
        setError(true)
      }
    })
  }

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={pending}
      aria-pressed={isFavorite}
      aria-label={isFavorite ? 'Favorit entfernen' : 'Als Favorit markieren'}
      className={`min-w-11 min-h-11 flex items-center justify-center text-lg leading-none ${
        error ? 'text-red-500' : ''
      } disabled:opacity-50`}
    >
      {isFavorite ? '❤️' : '🤍'}
    </button>
  )
}
```

- [ ] **Step 3: Wire `FavoriteToggle` into BottomSheet sheet-header**

Import the component, render it in the header gap. The `userId` guard hides it for anonymous users.

- [ ] **Step 4: Build + tests**

```bash
npm run build
npm test
```
Both clean / 73 passing.

- [ ] **Step 5: Commit**

```bash
git add components/FavoriteToggle.tsx components/BottomSheet.tsx components/SpotDetail.tsx
git commit -m "feat: heart toggle + ActionMenu in sheet header (replaces single edit-photo link)"
```

---

## Task 8: SpotEditForm + `/spots/[id]/edit` Route

**Files:**
- Create: `components/SpotEditForm.tsx`
- Create: `app/(app)/spots/[id]/edit/page.tsx`

- [ ] **Step 1: Create `app/(app)/spots/[id]/edit/page.tsx`**

```tsx
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import SpotEditForm from '@/components/SpotEditForm'

export default async function EditSpotPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: spot } = await supabase
    .from('spots')
    .select('id, name, type, created_by')
    .eq('id', id)
    .maybeSingle()

  if (!spot) redirect('/')
  if (spot.created_by !== user.id) redirect('/')

  return <SpotEditForm spot={spot} />
}
```

- [ ] **Step 2: Create `components/SpotEditForm.tsx`**

```tsx
'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { updateSpot } from '@/actions/spots'
import SpotTypePicker from '@/components/SpotTypePicker'
import type { SpotType } from '@/lib/spot-types'

interface SpotEditFormProps {
  spot: { id: string; name: string | null; type: SpotType; created_by: string }
}

export default function SpotEditForm({ spot }: SpotEditFormProps) {
  const router = useRouter()
  const [name, setName] = useState(spot.name ?? '')
  const [type, setType] = useState<SpotType>(spot.type)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    startTransition(async () => {
      const result = await updateSpot(spot.id, { name: name || null, type })
      if (result.error) {
        setError(result.error)
        return
      }
      router.push('/')
    })
  }

  return (
    <div className="min-h-screen bg-surface dark:bg-[#141810]">
      <div className="max-w-sm mx-auto px-4 py-8">
        <Link
          href="/"
          className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 flex items-center gap-1 mb-6"
        >
          ← Zurück zur Karte
        </Link>
        <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-6">Spot bearbeiten</h1>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <p className="block text-sm text-gray-800 dark:text-gray-200 font-medium mb-2">Was ist hier?</p>
            <SpotTypePicker value={type} onChange={setType} />
          </div>

          <div>
            <label htmlFor="name" className="block text-sm text-gray-800 dark:text-gray-200 font-medium mb-1">
              Name <span className="text-gray-400 dark:text-gray-500 font-normal">(optional)</span>
            </label>
            <input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full border border-gray-400 dark:border-gray-600 dark:bg-[#1a1f14] dark:text-gray-100 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => router.back()}
              className="flex-1 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg py-2.5 text-sm font-medium hover:bg-surface"
            >
              Abbrechen
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="flex-1 bg-primary text-white rounded-lg py-2.5 text-sm font-medium hover:bg-primary-dark disabled:opacity-50"
            >
              {isPending ? 'Speichern…' : 'Änderungen speichern'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Build + tests**

```bash
npm run build
npm test
```
Both clean. Build output should now show `/spots/[id]/edit` route.

- [ ] **Step 4: Commit**

```bash
git add components/SpotEditForm.tsx "app/(app)/spots/[id]/edit/"
git commit -m "feat: spot edit page (name + type) at /spots/[id]/edit"
```

---

## Task 9: BottomSheet — Tabs, Sort, View-Mode Persistence

**Files:**
- Modify: `components/BottomSheet.tsx`
- Modify: `lib/spot-utils.ts` (only if not done — `distMeters` should already be in Task 2)

This task is the biggest single-file change. Best handled by a subagent given the breadth, but it's all one component — straightforward.

- [ ] **Step 1: Add view-mode state**

At the top of the BottomSheet component:

```ts
type ViewMode = 'all' | 'mine' | 'favorites'
const VIEW_MODE_KEY = 'plaetzchen-view-mode'

const [viewMode, setViewMode] = useState<ViewMode>('all')

// Hydrate from localStorage after mount (avoid SSR mismatch)
useEffect(() => {
  if (typeof window === 'undefined') return
  const stored = localStorage.getItem(VIEW_MODE_KEY)
  if (stored === 'mine' || stored === 'favorites' || stored === 'all') {
    setViewMode(stored)
  }
}, [])

const handleViewModeChange = (m: ViewMode) => {
  setViewMode(m)
  if (typeof window !== 'undefined') localStorage.setItem(VIEW_MODE_KEY, m)
}
```

- [ ] **Step 2: Tab UI**

Add a tab bar between the header row and the content scroll area (ONLY when `!selectedSpot` — don't show in detail mode):

```tsx
{!selectedSpotId && (
  <div className="flex border-b border-gray-100 dark:border-[#2a2f24]">
    {(['all', 'mine', 'favorites'] as const).map((m) => (
      <button
        key={m}
        type="button"
        onClick={() => handleViewModeChange(m)}
        role="tab"
        aria-selected={viewMode === m}
        className={`flex-1 py-2 text-sm font-medium border-b-2 transition-colors ${
          viewMode === m
            ? 'text-primary border-primary'
            : 'text-gray-500 dark:text-gray-400 border-transparent hover:text-gray-700 dark:hover:text-gray-200'
        }`}
      >
        {m === 'all' ? 'Alle' : m === 'mine' ? 'Eigene' : 'Favoriten'}
      </button>
    ))}
  </div>
)}
```

The content scroll height calc must subtract the tab row (~36px) when shown. Adjust the existing `style={{ height: 'calc(55vh - 56px)' }}` to `'calc(55vh - 56px - 36px)'` when tabs are visible — or use flex layout if cleaner.

- [ ] **Step 3: Filter + sort the spots list**

```ts
import { distMeters } from '@/lib/spot-utils'

const filtered = spots.filter((s) => {
  if (viewMode === 'all') return true
  if (viewMode === 'mine') return s.created_by === userId
  return favoriteIds.has(s.id)
})

const sorted = userPosition && gpsState === 'available'
  ? [...filtered].sort((a, b) => distMeters(userPosition, { lat: a.lat, lng: a.lng }) - distMeters(userPosition, { lat: b.lat, lng: b.lng }))
  : [...filtered].sort((a, b) => b.created_at.localeCompare(a.created_at))
```

Render `sorted.map(...)` in the list `<ul>`.

- [ ] **Step 4: Login-CTAs for anon users**

Inside the content area, before the list:

```tsx
{(viewMode === 'mine' || viewMode === 'favorites') && !userId && (
  <div className="py-12 px-6 text-center">
    <p className="text-base text-gray-700 dark:text-gray-300 mb-2">
      Logge dich ein, um {viewMode === 'mine' ? 'deine eigenen Plätzchen' : 'deine Favoriten'} zu sehen.
    </p>
    <Link href="/login" className="text-primary font-medium hover:underline">Login</Link>
  </div>
)}
```

(Hide the list and the empty-state heading when this CTA shows.)

- [ ] **Step 5: Empty states per mode (logged-in)**

When `sorted.length === 0` and `userId` exists:

- `viewMode === 'all'`: existing "📍 Noch keine Plätzchen in der Nähe…" CTA
- `viewMode === 'mine'`: "Du hast noch keine Plätzchen eingetragen. Tippe auf + unten rechts."
- `viewMode === 'favorites'`: "Noch keine Favoriten — markiere einen Spot mit ❤️ um ihn zu speichern."

Wrap the existing empty state in a `switch (viewMode)` to render the right copy.

- [ ] **Step 6: Header count reflects current view**

Change `{count} Plätzchen` to use `sorted.length` instead of total `spots.length`. Consider clarifying copy:
- "Alle" → "{N} Plätzchen"
- "Eigene" → "{N} Eigene"
- "Favoriten" → "{N} Favoriten"

(Or keep generic "{N} Plätzchen" — simpler, also fine.)

- [ ] **Step 7: Build + tests**

```bash
npm run build
npm test
```
Both clean / 73 passing.

- [ ] **Step 8: Commit**

```bash
git add components/BottomSheet.tsx
git commit -m "feat: BottomSheet view-mode tabs (Alle/Eigene/Favoriten), distance sort, login-CTAs"
```

---

## Task 10: Final Docs Update

**Files:**
- Modify: `AGENTS.md`
- Modify: `docs/agent-handoff.md`
- Modify: `docs/architecture.md`
- Modify: `docs/database-schema.md`
- Modify: `docs/feature-status.md`

- [ ] **Step 1: `feature-status.md`**

Convert "Phase 5 🔜" section to "Phase 5 ✅" with checked items + brief summary. Add Phase 6 / 7 if not already there.

- [ ] **Step 2: `agent-handoff.md`**

- DB structure: add `favorites` table
- New patterns section for Phase 5 (favorites Set propagation, view-mode tabs, optimistic favorite toggle)
- "What's next" → Phase 6 (Privacy & Friends)

- [ ] **Step 3: `architecture.md`**

- Add `favorites` table to schema description
- Add `SpotActionMenu`, `FavoriteToggle`, `SpotEditForm` to file structure
- Add `/spots/[id]/edit` to routes
- Update data flow diagram with favoriteIds Set propagation

- [ ] **Step 4: `database-schema.md`**

- Add favorites table section
- Add migration 008 to migrations list

- [ ] **Step 5: `AGENTS.md`**

- "Current state: Phase 5 complete" → next Phase 6 (Friends/Privacy)

- [ ] **Step 6: Commit**

```bash
git add AGENTS.md docs/
git commit -m "docs: catch up all docs to Phase 5 Personal Layer"
```

---

## Final Steps

- [ ] **Run full test suite**

```bash
npm test
```
Expected: 73+ passing.

- [ ] **Run full build**

```bash
npm run build
```
Expected: clean. Routes show `/spots/[id]/edit`.

- [ ] **Manual QA list**

1. Eingeloggt, neuer Spot → Heart-Toggle in Detail funktioniert (Optimistic-UI)
2. Favoriten-Tab zeigt nur favorisierte Spots; sortiert by Distanz
3. Eigene-Tab zeigt nur User-erstellte Spots
4. Anonym → Eigene/Favoriten Tab zeigt Login-CTA
5. View-Mode persistiert über Reload
6. ActionMenu öffnet/schließt (outside click + Escape)
7. Owner: Spot bearbeiten → Form lädt mit aktuellen Werten, speichert, zurück zur Karte
8. Non-Owner Edit-URL → redirect zu `/`
9. Distanz-Sortierung greift wenn GPS verfügbar; sonst by Datum
10. Migration 008 ist live

- [ ] **Branch finishing** (use superpowers:finishing-a-development-branch skill)

Present 4 options to user.

---

## Anti-Patterns to Avoid

- **Don't** make favorites public — kept private for now (Phase 6 changes that)
- **Don't** add Search/Filter — explicitly deferred
- **Don't** allow editing position (lat/lng) in this phase — UX risk
- **Don't** add description-upvotes — Phase 6+
- **Don't** forget to update `count` in BottomSheet header to match the FILTERED list
- **Don't** sort the markers on the map — only the list is sorted
