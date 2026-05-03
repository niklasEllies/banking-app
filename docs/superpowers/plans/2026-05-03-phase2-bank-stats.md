# Phase 2 — Bank Stats Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add community-voted stats (comfort, view, condition, shadow, extras, rarity) and photo uploads to park benches, with the bottom sheet redesigned to show a per-bench detail view.

**Architecture:** `bench_stats_votes` table stores one vote per (user, bench) with all stat fields nullable; aggregation runs via a Postgres function (median/mode/threshold). `MapLayout` gains `selectedBenchId` + `flyTarget` state to coordinate map ↔ sheet navigation. Bottom sheet gains a `detail` view mode rendered by `BenchDetail`. Photos are creator-managed, stored in Supabase Storage bucket `bench-photos`.

**Tech Stack:** Next.js 16.2 App Router, React 19, TypeScript, Tailwind v4, Supabase (Auth + DB + Storage), react-leaflet v5, Vitest.

---

## File Map

| File | Status | Responsibility |
|---|---|---|
| `supabase/migrations/003_phase2_bank_stats.sql` | Create | DB schema: table, RLS, aggregation function, bench UPDATE policy |
| `lib/stats-utils.ts` | Create | Pure helpers: condition/rarity/shadow labels, extras icons |
| `actions/stats.ts` | Create | `getBenchStats`, `upsertStats` server actions |
| `actions/benches.ts` | Modify | Add `uploadBenchPhoto` |
| `components/RarityBadge.tsx` | Create | Common→Legendary badge display |
| `components/BenchPopup.tsx` | Create | Leaflet popup content: photo thumb, name, rarity, Details/Delete buttons |
| `components/BenchDetail.tsx` | Create | Sheet detail view: photo, stats chips, vote form |
| `components/StatsVoteForm.tsx` | Create | All stat input fields + save button |
| `components/BenchMap.tsx` | Modify | Use BenchPopup, add FlyController, new props |
| `components/BenchMapClient.tsx` | Modify | Forward new props |
| `components/MapLayout.tsx` | Modify | `selectedBenchId` + `flyTarget` state |
| `components/BottomSheet.tsx` | Modify | list/detail modes, flyTo on row tap |
| `app/(app)/benches/[id]/edit-photo/page.tsx` | Create | Photo upload for bench owner |
| `app/(app)/page.tsx` | Modify | Include `photo_url` in benches query |
| `app/(app)/benches/new/page.tsx` | Modify | Pass photo option to form |
| `components/AddBenchForm.tsx` | Modify | Optional photo field |
| `proxy.ts` | Modify | Protect `/benches/` sub-routes |
| `__tests__/lib/stats-utils.test.ts` | Create | Unit tests for utility functions |
| `__tests__/actions/stats.test.ts` | Create | Unit tests for server actions |

---

### Task 1: DB Migration + Storage Bucket

**Files:**
- Create: `supabase/migrations/003_phase2_bank_stats.sql`

- [ ] **Step 1: Create migration file**

```sql
-- supabase/migrations/003_phase2_bank_stats.sql

-- Add photo_url to benches
ALTER TABLE public.benches ADD COLUMN IF NOT EXISTS photo_url text;

-- Allow bench owner to update their bench (needed for photo_url)
CREATE POLICY "Users can update own bench"
ON public.benches
FOR UPDATE TO authenticated
USING (auth.uid() = created_by)
WITH CHECK (auth.uid() = created_by);

-- Community stats votes table
CREATE TABLE public.bench_stats_votes (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bench_id    uuid NOT NULL REFERENCES public.benches(id) ON DELETE CASCADE,
  user_id     uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  comfort     smallint CHECK (comfort BETWEEN 1 AND 5),
  view_rating smallint CHECK (view_rating BETWEEN 1 AND 5),
  condition   float4   CHECK (condition BETWEEN 0 AND 1),
  shadow      text     CHECK (shadow IN ('none','morning','evening','allday')),
  extras      text[]   CHECK (extras <@ ARRAY['bin','roof','accessible','table','bicycle']::text[]),
  rarity      smallint CHECK (rarity BETWEEN 1 AND 5),
  created_at  timestamptz DEFAULT now(),
  UNIQUE(bench_id, user_id)
);

CREATE INDEX bench_stats_votes_bench_id_idx ON public.bench_stats_votes(bench_id);

ALTER TABLE public.bench_stats_votes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read stats votes"
  ON public.bench_stats_votes FOR SELECT USING (true);

CREATE POLICY "Users can insert own stats vote"
  ON public.bench_stats_votes FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own stats vote"
  ON public.bench_stats_votes FOR UPDATE TO authenticated
  USING (auth.uid() = user_id);

-- Aggregation function
CREATE OR REPLACE FUNCTION get_bench_aggregated_stats(p_bench_id uuid)
RETURNS TABLE (
  comfort_median   float,
  view_median      float,
  condition_median float,
  rarity_median    float,
  shadow_mode      text,
  extras_threshold text[],
  vote_count       bigint
) LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT
    PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY comfort)     AS comfort_median,
    PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY view_rating) AS view_median,
    PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY condition)   AS condition_median,
    PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY rarity)      AS rarity_median,
    MODE()               WITHIN GROUP (ORDER BY shadow)      AS shadow_mode,
    ARRAY(
      SELECT item FROM unnest(ARRAY['bin','roof','accessible','table','bicycle']::text[]) AS item
      WHERE (
        SELECT COUNT(*) FROM bench_stats_votes v2
        WHERE v2.bench_id = p_bench_id AND item = ANY(v2.extras)
      )::float / NULLIF(
        (SELECT COUNT(*) FROM bench_stats_votes v3 WHERE v3.bench_id = p_bench_id), 0
      ) >= 0.5
    )                                                         AS extras_threshold,
    COUNT(*)                                                  AS vote_count
  FROM bench_stats_votes
  WHERE bench_id = p_bench_id;
$$;
```

- [ ] **Step 2: Run migration in Supabase SQL Editor**

Copy and execute `supabase/migrations/003_phase2_bank_stats.sql` in your Supabase project's SQL Editor.

- [ ] **Step 3: Create Storage bucket**

In Supabase Dashboard → Storage → New Bucket:
- Name: `bench-photos`
- Public bucket: ✅ (checked)
- File size limit: 5242880 (5MB)
- Allowed MIME types: `image/jpeg,image/png,image/webp`

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/003_phase2_bank_stats.sql
git commit -m "feat: add bench_stats_votes migration and aggregation function"
```

---

### Task 2: Utility Functions

**Files:**
- Create: `lib/stats-utils.ts`
- Create: `__tests__/lib/stats-utils.test.ts`

- [ ] **Step 1: Write failing tests**

```typescript
// __tests__/lib/stats-utils.test.ts
import { describe, it, expect } from 'vitest'
import {
  conditionLabel,
  rarityLabel,
  shadowLabel,
  extrasIcon,
  floatToConditionPreset,
} from '@/lib/stats-utils'

describe('conditionLabel', () => {
  it('returns FN for 0.9+', () => {
    expect(conditionLabel(0.95)).toEqual({ short: 'FN', full: 'Factory New', color: '#4ade80' })
  })
  it('returns MW for 0.7–0.9', () => {
    expect(conditionLabel(0.75)).toEqual({ short: 'MW', full: 'Minimal Wear', color: '#86efac' })
  })
  it('returns FT for 0.4–0.7', () => {
    expect(conditionLabel(0.5)).toEqual({ short: 'FT', full: 'Field-Tested', color: '#fde047' })
  })
  it('returns WW for 0.15–0.4', () => {
    expect(conditionLabel(0.25)).toEqual({ short: 'WW', full: 'Well-Worn', color: '#fb923c' })
  })
  it('returns BS for <0.15', () => {
    expect(conditionLabel(0.05)).toEqual({ short: 'BS', full: 'Battle-Scarred', color: '#f87171' })
  })
  it('returns null for null input', () => {
    expect(conditionLabel(null)).toBeNull()
  })
})

describe('rarityLabel', () => {
  it('maps 1 to Common', () => expect(rarityLabel(1)).toEqual({ label: 'Common', color: '#9ca3af' }))
  it('maps 3 to Rare', () => expect(rarityLabel(3)).toEqual({ label: 'Rare', color: '#60a5fa' }))
  it('maps 5 to Legendary', () => expect(rarityLabel(5)).toEqual({ label: 'Legendary', color: '#f59e0b' }))
  it('returns null for null', () => expect(rarityLabel(null)).toBeNull())
})

describe('shadowLabel', () => {
  it('maps none to Kein Schatten', () => expect(shadowLabel('none')).toBe('Kein Schatten'))
  it('maps morning to Morgens', () => expect(shadowLabel('morning')).toBe('Morgens'))
  it('maps evening to Abends', () => expect(shadowLabel('evening')).toBe('Abends'))
  it('maps allday to Ganztags', () => expect(shadowLabel('allday')).toBe('Ganztags'))
  it('returns null for null', () => expect(shadowLabel(null)).toBeNull())
})

describe('extrasIcon', () => {
  it('returns icon for bin', () => expect(extrasIcon('bin')).toBe('🗑'))
  it('returns icon for roof', () => expect(extrasIcon('roof')).toBe('☂'))
  it('returns icon for accessible', () => expect(extrasIcon('accessible')).toBe('♿'))
  it('returns icon for table', () => expect(extrasIcon('table')).toBe('🍽'))
  it('returns icon for bicycle', () => expect(extrasIcon('bicycle')).toBe('🚲'))
})

describe('floatToConditionPreset', () => {
  it('returns FN midpoint for FN selection', () => {
    expect(floatToConditionPreset('FN')).toBe(0.95)
  })
  it('returns BS midpoint for BS selection', () => {
    expect(floatToConditionPreset('BS')).toBe(0.075)
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npm test -- stats-utils
```
Expected: FAIL with "Cannot find module '@/lib/stats-utils'"

- [ ] **Step 3: Implement**

```typescript
// lib/stats-utils.ts

export type ConditionLabel = { short: string; full: string; color: string }
export type RarityLabel = { label: string; color: string }

export type ConditionPreset = 'FN' | 'MW' | 'FT' | 'WW' | 'BS'

export const CONDITION_PRESETS: Record<ConditionPreset, { full: string; float: number; color: string }> = {
  FN: { full: 'Factory New',   float: 0.95,  color: '#4ade80' },
  MW: { full: 'Minimal Wear',  float: 0.70,  color: '#86efac' },
  FT: { full: 'Field-Tested',  float: 0.475, color: '#fde047' },
  WW: { full: 'Well-Worn',     float: 0.25,  color: '#fb923c' },
  BS: { full: 'Battle-Scarred',float: 0.075, color: '#f87171' },
}

export function conditionLabel(value: number | null): ConditionLabel | null {
  if (value === null || value === undefined) return null
  if (value >= 0.9)  return { short: 'FN', full: 'Factory New',    color: '#4ade80' }
  if (value >= 0.7)  return { short: 'MW', full: 'Minimal Wear',   color: '#86efac' }
  if (value >= 0.4)  return { short: 'FT', full: 'Field-Tested',   color: '#fde047' }
  if (value >= 0.15) return { short: 'WW', full: 'Well-Worn',      color: '#fb923c' }
  return               { short: 'BS', full: 'Battle-Scarred', color: '#f87171' }
}

const RARITY_MAP: Record<number, RarityLabel> = {
  1: { label: 'Common',    color: '#9ca3af' },
  2: { label: 'Uncommon',  color: '#4ade80' },
  3: { label: 'Rare',      color: '#60a5fa' },
  4: { label: 'Epic',      color: '#c084fc' },
  5: { label: 'Legendary', color: '#f59e0b' },
}

export function rarityLabel(value: number | null): RarityLabel | null {
  if (value === null || value === undefined) return null
  return RARITY_MAP[Math.round(value)] ?? null
}

const SHADOW_MAP: Record<string, string> = {
  none:    'Kein Schatten',
  morning: 'Morgens',
  evening: 'Abends',
  allday:  'Ganztags',
}

export function shadowLabel(value: string | null): string | null {
  if (!value) return null
  return SHADOW_MAP[value] ?? null
}

const EXTRAS_ICONS: Record<string, string> = {
  bin:        '🗑',
  roof:       '☂',
  accessible: '♿',
  table:      '🍽',
  bicycle:    '🚲',
}

export function extrasIcon(key: string): string {
  return EXTRAS_ICONS[key] ?? '?'
}

export function floatToConditionPreset(preset: ConditionPreset): number {
  return CONDITION_PRESETS[preset].float
}

export function conditionToPreset(value: number | null): ConditionPreset | null {
  if (value === null || value === undefined) return null
  if (value >= 0.9)  return 'FN'
  if (value >= 0.7)  return 'MW'
  if (value >= 0.4)  return 'FT'
  if (value >= 0.15) return 'WW'
  return 'BS'
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npm test -- stats-utils
```
Expected: PASS (all 15 tests)

- [ ] **Step 5: Commit**

```bash
git add lib/stats-utils.ts __tests__/lib/stats-utils.test.ts
git commit -m "feat: add stats utility functions with tests"
```

---

### Task 3: Server Actions for Stats

**Files:**
- Create: `actions/stats.ts`
- Create: `__tests__/actions/stats.test.ts`

- [ ] **Step 1: Write failing tests**

```typescript
// __tests__/actions/stats.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { upsertStats } from '@/actions/stats'
import * as supabaseServer from '@/lib/supabase/server'

vi.mock('@/lib/supabase/server')
vi.mock('next/headers', () => ({
  cookies: vi.fn(() => ({ getAll: () => [], set: vi.fn() })),
}))

const mockUpsert = vi.fn()
const mockSelect = vi.fn()
const mockEq = vi.fn()
const mockSingle = vi.fn()

const mockSupabase = {
  auth: { getUser: vi.fn() },
  from: vi.fn((table: string) => {
    if (table === 'bench_stats_votes') {
      return {
        upsert: mockUpsert,
        select: () => ({ eq: mockEq }),
      }
    }
    return {}
  }),
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(supabaseServer.createClient).mockResolvedValue(mockSupabase as any)
})

describe('upsertStats', () => {
  it('gibt Fehler zurück wenn nicht eingeloggt', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: null } })
    const result = await upsertStats('bench-1', { comfort: 4 })
    expect(result).toEqual({ error: 'Nicht eingeloggt' })
  })

  it('ruft upsert mit korrekten Daten auf', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: { id: 'user-1' } } })
    mockUpsert.mockResolvedValue({ error: null })

    const result = await upsertStats('bench-1', { comfort: 4, rarity: 3 })
    expect(result).toEqual({})
    expect(mockUpsert).toHaveBeenCalledWith(
      { bench_id: 'bench-1', user_id: 'user-1', comfort: 4, rarity: 3 },
      { onConflict: 'bench_id,user_id' }
    )
  })

  it('gibt DB-Fehler zurück', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: { id: 'user-1' } } })
    mockUpsert.mockResolvedValue({ error: { message: 'DB error' } })

    const result = await upsertStats('bench-1', { comfort: 4 })
    expect(result).toEqual({ error: 'DB error' })
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npm test -- stats.test
```
Expected: FAIL with "Cannot find module '@/actions/stats'"

- [ ] **Step 3: Implement**

```typescript
// actions/stats.ts
'use server'

import { createClient } from '@/lib/supabase/server'

export interface UserVote {
  comfort?: number | null
  view_rating?: number | null
  condition?: number | null
  shadow?: string | null
  extras?: string[]
  rarity?: number | null
}

export interface AggregatedStats {
  comfort_median: number | null
  view_median: number | null
  condition_median: number | null
  rarity_median: number | null
  shadow_mode: string | null
  extras_threshold: string[]
  vote_count: number
}

export async function getBenchStats(benchId: string): Promise<{
  aggregated: AggregatedStats | null
  userVote: UserVote | null
}> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const [{ data: aggData }, { data: voteData }] = await Promise.all([
    supabase.rpc('get_bench_aggregated_stats', { p_bench_id: benchId }),
    user
      ? supabase
          .from('bench_stats_votes')
          .select('comfort, view_rating, condition, shadow, extras, rarity')
          .eq('bench_id', benchId)
          .eq('user_id', user.id)
          .maybeSingle()
      : Promise.resolve({ data: null }),
  ])

  const agg = (aggData as AggregatedStats[] | null)?.[0] ?? null

  return {
    aggregated: agg,
    userVote: voteData as UserVote | null,
  }
}

export async function upsertStats(benchId: string, vote: UserVote): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Nicht eingeloggt' }

  const { error } = await supabase
    .from('bench_stats_votes')
    .upsert(
      { bench_id: benchId, user_id: user.id, ...vote },
      { onConflict: 'bench_id,user_id' }
    )

  if (error) return { error: error.message }
  return {}
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npm test -- stats.test
```
Expected: PASS (3 tests)

- [ ] **Step 5: Commit**

```bash
git add actions/stats.ts __tests__/actions/stats.test.ts
git commit -m "feat: add getBenchStats and upsertStats server actions"
```

---

### Task 4: Photo Upload Action + Bench Type Extension

**Files:**
- Modify: `components/BenchMap.tsx` (Bench interface only)
- Modify: `actions/benches.ts`

- [ ] **Step 1: Extend Bench interface in `components/BenchMap.tsx`**

Find the `Bench` interface (currently around line 55) and add `photo_url`:

```typescript
export interface Bench {
  id: string
  lat: number
  lng: number
  name: string | null
  created_by: string | null
  created_at: string
  photo_url: string | null
}
```

- [ ] **Step 2: Add `uploadBenchPhoto` to `actions/benches.ts`**

Append to the existing file (after `deleteBench`):

```typescript
export async function uploadBenchPhoto(
  benchId: string,
  formData: FormData
): Promise<{ url?: string; error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Nicht eingeloggt' }

  // Verify ownership
  const { data: bench } = await supabase
    .from('benches')
    .select('created_by')
    .eq('id', benchId)
    .single()
  if (!bench || bench.created_by !== user.id) return { error: 'Keine Berechtigung' }

  const file = formData.get('photo') as File
  if (!file || file.size === 0) return { error: 'Kein Foto ausgewählt' }
  if (file.size > 5 * 1024 * 1024) return { error: 'Foto zu groß (max 5MB)' }
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
    return { error: 'Ungültiges Format (nur jpg, png, webp)' }
  }

  const { error: uploadError } = await supabase.storage
    .from('bench-photos')
    .upload(`${benchId}/photo`, file, { contentType: file.type, upsert: true })

  if (uploadError) return { error: uploadError.message }

  const { data: { publicUrl } } = supabase.storage
    .from('bench-photos')
    .getPublicUrl(`${benchId}/photo`)

  const { error: updateError } = await supabase
    .from('benches')
    .update({ photo_url: publicUrl })
    .eq('id', benchId)

  if (updateError) return { error: updateError.message }

  revalidatePath('/')
  return { url: publicUrl }
}
```

- [ ] **Step 3: Verify TypeScript**

```bash
npx tsc --noEmit
```
Expected: no errors

- [ ] **Step 4: Commit**

```bash
git add components/BenchMap.tsx actions/benches.ts
git commit -m "feat: extend Bench type with photo_url, add uploadBenchPhoto action"
```

---

### Task 5: RarityBadge Component

**Files:**
- Create: `components/RarityBadge.tsx`

- [ ] **Step 1: Create component**

```typescript
// components/RarityBadge.tsx
import { rarityLabel } from '@/lib/stats-utils'

interface RarityBadgeProps {
  median: number | null
  size?: 'sm' | 'md'
}

export default function RarityBadge({ median, size = 'md' }: RarityBadgeProps) {
  const r = rarityLabel(median)
  if (!r) return null

  const textSize = size === 'sm' ? 'text-[9px] px-1.5 py-0.5' : 'text-[10px] px-2 py-0.5'

  return (
    <span
      className={`inline-block font-bold rounded-full ${textSize}`}
      style={{ background: r.color, color: '#1a1c17' }}
    >
      {r.label.toUpperCase()}
    </span>
  )
}
```

- [ ] **Step 2: Verify TypeScript**

```bash
npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add components/RarityBadge.tsx
git commit -m "feat: add RarityBadge component"
```

---

### Task 6: BenchPopup Component

**Files:**
- Create: `components/BenchPopup.tsx`
- Modify: `components/BenchMap.tsx` (use BenchPopup)

- [ ] **Step 1: Create BenchPopup**

```typescript
// components/BenchPopup.tsx
import type { Bench } from '@/components/BenchMap'
import RarityBadge from '@/components/RarityBadge'
import { benchDisplayName } from '@/lib/bench-utils'

interface BenchPopupProps {
  bench: Bench
  userId: string | null
  rarityMedian: number | null
  onDetails: () => void
  onDelete: () => void
}

export default function BenchPopup({
  bench,
  userId,
  rarityMedian,
  onDetails,
  onDelete,
}: BenchPopupProps) {
  const isOwner = userId && bench.created_by === userId

  return (
    <div style={{ minWidth: '160px', fontFamily: 'system-ui' }}>
      {/* Photo or placeholder */}
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

      {/* Name + rarity */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
        <strong style={{ fontSize: '13px', flex: 1 }}>
          {benchDisplayName(bench.name, bench.created_at)}
        </strong>
        <RarityBadge median={rarityMedian} size="sm" />
      </div>

      {/* Action buttons */}
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

- [ ] **Step 2: Update BenchMap.tsx to use BenchPopup**

Add import at the top:
```typescript
import BenchPopup from '@/components/BenchPopup'
```

Replace the `<MarkerClusterGroup>` block's Marker/Popup JSX:

```typescript
<MarkerClusterGroup chunkedLoading maxClusterRadius={60} iconCreateFunction={createClusterIcon}>
  {localBenches.map((bench) => (
    <Marker key={bench.id} position={[bench.lat, bench.lng]}>
      <Popup>
        <BenchPopup
          bench={bench}
          userId={userId}
          rarityMedian={null}
          onDetails={() => onBenchSelect?.(bench.id)}
          onDelete={() => handleDelete(bench.id)}
        />
      </Popup>
    </Marker>
  ))}
</MarkerClusterGroup>
```

Add `onBenchSelect?: (benchId: string) => void` to `BenchMapProps`:
```typescript
interface BenchMapProps {
  benches: Bench[]
  isAuthenticated: boolean
  userId: string | null
  sheetExpanded: boolean
  onBenchSelect?: (benchId: string) => void
}
```

Update the function signature to destructure `onBenchSelect`:
```typescript
export default function BenchMap({ benches: initialBenches, isAuthenticated, userId, sheetExpanded, onBenchSelect }: BenchMapProps) {
```

- [ ] **Step 3: Verify TypeScript**

```bash
npx tsc --noEmit
```

- [ ] **Step 4: Commit**

```bash
git add components/BenchPopup.tsx components/BenchMap.tsx
git commit -m "feat: add BenchPopup component with photo thumbnail and Details button"
```

---

### Task 7: MapLayout + BenchMap Navigation Wiring

**Files:**
- Modify: `components/MapLayout.tsx`
- Modify: `components/BenchMapClient.tsx`
- Modify: `components/BenchMap.tsx` (FlyController)

- [ ] **Step 1: Add FlyController to BenchMap.tsx**

Add after the existing `CenterController` function:

```typescript
function FlyController({
  target,
  onUsed,
}: {
  target: { lat: number; lng: number } | null
  onUsed: () => void
}) {
  const map = useMap()
  const prev = useRef<typeof target>(null)
  useEffect(() => {
    if (target && target !== prev.current) {
      prev.current = target
      map.flyTo([target.lat, target.lng], 16, { duration: 1 })
      onUsed()
    }
  }, [target, map, onUsed])
  return null
}
```

Add `flyTarget` prop to `BenchMapProps`:
```typescript
interface BenchMapProps {
  benches: Bench[]
  isAuthenticated: boolean
  userId: string | null
  sheetExpanded: boolean
  onBenchSelect?: (benchId: string) => void
  flyTarget?: { lat: number; lng: number } | null
  onFlyTargetUsed?: () => void
}
```

Update the function signature:
```typescript
export default function BenchMap({
  benches: initialBenches,
  isAuthenticated,
  userId,
  sheetExpanded,
  onBenchSelect,
  flyTarget,
  onFlyTargetUsed,
}: BenchMapProps) {
```

Add `FlyController` inside `<MapContainer>`, after `CenterController`:
```typescript
<FlyController target={flyTarget ?? null} onUsed={onFlyTargetUsed ?? (() => {})} />
```

- [ ] **Step 2: Update BenchMapClient.tsx**

```typescript
// components/BenchMapClient.tsx
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
}

export default function BenchMapClient(props: BenchMapClientProps) {
  return <BenchMap {...props} />
}
```

- [ ] **Step 3: Update MapLayout.tsx**

```typescript
// components/MapLayout.tsx
'use client'

import { useState, useCallback } from 'react'
import BenchMapClient from '@/components/BenchMapClient'
import BottomSheet from '@/components/BottomSheet'
import type { Bench } from '@/components/BenchMap'

interface MapLayoutProps {
  benches: Bench[]
  isAuthenticated: boolean
  userId: string | null
}

export default function MapLayout({ benches, isAuthenticated, userId }: MapLayoutProps) {
  const [sheetExpanded, setSheetExpanded] = useState(false)
  const [selectedBenchId, setSelectedBenchId] = useState<string | null>(null)
  const [flyTarget, setFlyTarget] = useState<{ lat: number; lng: number } | null>(null)

  const handleBenchSelect = useCallback((benchId: string) => {
    setSelectedBenchId(benchId)
  }, [])

  const handleBenchDeselect = useCallback(() => {
    setSelectedBenchId(null)
  }, [])

  const handleFlyToBench = useCallback((bench: Bench) => {
    setFlyTarget({ lat: bench.lat, lng: bench.lng })
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
      />
      <BottomSheet
        benches={benches}
        userId={userId}
        onExpandedChange={setSheetExpanded}
        selectedBenchId={selectedBenchId}
        onBenchDeselect={handleBenchDeselect}
        onFlyToBench={handleFlyToBench}
      />
    </>
  )
}
```

- [ ] **Step 4: Verify TypeScript**

```bash
npx tsc --noEmit
```

- [ ] **Step 5: Commit**

```bash
git add components/MapLayout.tsx components/BenchMapClient.tsx components/BenchMap.tsx
git commit -m "feat: wire selectedBenchId and flyTarget through MapLayout"
```

---

### Task 8: BottomSheet List/Detail Modes

**Files:**
- Modify: `components/BottomSheet.tsx`

- [ ] **Step 1: Update BottomSheet with new props and modes**

```typescript
// components/BottomSheet.tsx
'use client'

import { useState, useRef, useTransition, useEffect } from 'react'
import type { Bench } from '@/components/BenchMap'
import { deleteBench } from '@/actions/benches'
import { benchDisplayName } from '@/lib/bench-utils'
import BenchDetail from '@/components/BenchDetail'

interface BottomSheetProps {
  benches: Bench[]
  userId: string | null
  onExpandedChange: (expanded: boolean) => void
  selectedBenchId: string | null
  onBenchDeselect: () => void
  onFlyToBench: (bench: Bench) => void
}

export default function BottomSheet({
  benches: initialBenches,
  userId,
  onExpandedChange,
  selectedBenchId,
  onBenchDeselect,
  onFlyToBench,
}: BottomSheetProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [dragY, setDragY] = useState(0)
  const [benches, setBenches] = useState(initialBenches)
  const [isPending, startTransition] = useTransition()
  const startYRef = useRef(0)
  const count = benches.length

  // Auto-expand and show detail when bench is selected from map
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
        className="absolute bottom-6 left-1/2 -translate-x-1/2 z-1000 bg-white dark:bg-[#252720] rounded-full px-4 py-2 shadow-md text-sm font-medium text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-[#3a3c32]"
      >
        {count} {count === 1 ? 'Bank' : 'Bänke'} ↑
      </button>
    )
  }

  return (
    <div
      className="absolute bottom-0 left-0 right-0 z-1000 bg-white dark:bg-[#252720] rounded-t-2xl shadow-[0_-4px_20px_rgba(0,0,0,0.15)] overflow-hidden"
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
          <button
            onClick={onBenchDeselect}
            className="text-sm text-primary mt-2"
          >
            ← Alle Bänke
          </button>
        ) : (
          <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 mt-2">
            {count} {count === 1 ? 'Bank' : 'Bänke'}
          </p>
        )}
        <button
          onClick={collapse}
          className="mt-2 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 text-lg leading-none"
          aria-label="Schließen"
        >
          ✕
        </button>
      </div>

      {/* Content */}
      <div className="overflow-y-auto pb-8" style={{ height: 'calc(55vh - 56px)' }}>
        {selectedBenchId ? (
          <BenchDetail benchId={selectedBenchId} userId={userId} />
        ) : (
          count === 0 ? (
            <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-6">
              Noch keine Bänke eingetragen
            </p>
          ) : (
            <ul>
              {benches.map((bench) => (
                <li
                  key={bench.id}
                  className="flex items-center gap-3 px-5 py-3 border-t border-gray-100 dark:border-gray-700 cursor-pointer hover:bg-gray-50 dark:hover:bg-[#1e2019] active:bg-gray-100 dark:active:bg-[#1a1c17]"
                  onClick={() => {
                    onFlyToBench(bench)
                    setIsExpanded(false)
                    onExpandedChange(false)
                  }}
                >
                  <span className="text-xl shrink-0">🪑</span>
                  <span className="text-sm text-gray-800 dark:text-gray-200 truncate flex-1">
                    {benchDisplayName(bench.name, bench.created_at)}
                  </span>
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
          )
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Verify TypeScript**

```bash
npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add components/BottomSheet.tsx
git commit -m "feat: bottom sheet list/detail modes with flyTo on row tap"
```

---

### Task 9: BenchDetail Component

**Files:**
- Create: `components/BenchDetail.tsx`

- [ ] **Step 1: Create BenchDetail**

```typescript
// components/BenchDetail.tsx
'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { getBenchStats, type AggregatedStats, type UserVote } from '@/actions/stats'
import { conditionLabel, shadowLabel, extrasIcon } from '@/lib/stats-utils'
import RarityBadge from '@/components/RarityBadge'
import StatsVoteForm from '@/components/StatsVoteForm'

// Import Bench type without circular dependency by re-declaring minimal shape
interface BenchInfo {
  id: string
  name: string | null
  created_at: string
  photo_url: string | null
  created_by: string | null
}

interface BenchDetailProps {
  benchId: string
  userId: string | null
}

export default function BenchDetail({ benchId, userId }: BenchDetailProps) {
  const [aggregated, setAggregated] = useState<AggregatedStats | null>(null)
  const [userVote, setUserVote] = useState<UserVote | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    getBenchStats(benchId).then(({ aggregated: agg, userVote: vote }) => {
      setAggregated(agg)
      setUserVote(vote)
      setLoading(false)
    })
  }, [benchId])

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
    <div className="px-5 py-3 space-y-4">
      {/* Rarity badge row */}
      {aggregated && aggregated.vote_count > 0 && (
        <div className="flex items-center gap-2">
          <RarityBadge median={aggregated.rarity_median} />
          <span className="text-xs text-gray-500 dark:text-gray-400">
            {aggregated.vote_count} {aggregated.vote_count === 1 ? 'Bewertung' : 'Bewertungen'}
          </span>
        </div>
      )}

      {/* Stats chips */}
      {hasAnyStats && (
        <div className="flex flex-wrap gap-2">
          {aggregated.comfort_median !== null && (
            <div className="bg-gray-100 dark:bg-[#1a1c17] rounded-lg px-3 py-1.5 text-sm text-gray-800 dark:text-gray-200">
              ⭐ <strong>{aggregated.comfort_median.toFixed(1)}</strong>/5 Komfort
            </div>
          )}
          {aggregated.view_median !== null && (
            <div className="bg-gray-100 dark:bg-[#1a1c17] rounded-lg px-3 py-1.5 text-sm text-gray-800 dark:text-gray-200">
              🌄 <strong>{aggregated.view_median.toFixed(1)}</strong>/5 Aussicht
            </div>
          )}
          {condition && (
            <div
              className="rounded-lg px-3 py-1.5 text-sm font-semibold"
              style={{ background: condition.color, color: '#1a1c17' }}
            >
              🏚 {condition.short} — {condition.full}
            </div>
          )}
          {shadow && (
            <div className="bg-gray-100 dark:bg-[#1a1c17] rounded-lg px-3 py-1.5 text-sm text-gray-800 dark:text-gray-200">
              ☀️ {shadow}
            </div>
          )}
          {(aggregated.extras_threshold?.length ?? 0) > 0 && (
            <div className="bg-gray-100 dark:bg-[#1a1c17] rounded-lg px-3 py-1.5 text-sm text-gray-800 dark:text-gray-200">
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
            benchId={benchId}
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
  )
}
```

- [ ] **Step 2: Verify TypeScript**

```bash
npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add components/BenchDetail.tsx
git commit -m "feat: add BenchDetail component with aggregated stats display"
```

---

### Task 10: StatsVoteForm Component

**Files:**
- Create: `components/StatsVoteForm.tsx`

- [ ] **Step 1: Create StatsVoteForm**

```typescript
// components/StatsVoteForm.tsx
'use client'

import { useState, useTransition } from 'react'
import { upsertStats, getBenchStats, type UserVote, type AggregatedStats } from '@/actions/stats'
import { CONDITION_PRESETS, type ConditionPreset, conditionToPreset, shadowLabel } from '@/lib/stats-utils'

const SHADOW_OPTIONS = [
  { value: 'none',    label: 'Keinen' },
  { value: 'morning', label: 'Morgens' },
  { value: 'evening', label: 'Abends' },
  { value: 'allday',  label: 'Ganztags' },
]

const EXTRAS_OPTIONS = [
  { value: 'bin',        icon: '🗑',  label: 'Mülleimer' },
  { value: 'roof',       icon: '☂',  label: 'Überdachung' },
  { value: 'accessible', icon: '♿', label: 'Barrierefrei' },
  { value: 'table',      icon: '🍽', label: 'Tisch' },
  { value: 'bicycle',    icon: '🚲', label: 'Fahrradständer' },
]

interface StatsVoteFormProps {
  benchId: string
  initialVote: UserVote | null
  onSaved: (aggregated: AggregatedStats | null, vote: UserVote) => void
}

export default function StatsVoteForm({ benchId, initialVote, onSaved }: StatsVoteFormProps) {
  const [comfort, setComfort] = useState<number | null>(initialVote?.comfort ?? null)
  const [viewRating, setViewRating] = useState<number | null>(initialVote?.view_rating ?? null)
  const [condition, setCondition] = useState<ConditionPreset | null>(
    conditionToPreset(initialVote?.condition ?? null)
  )
  const [shadow, setShadow] = useState<string | null>(initialVote?.shadow ?? null)
  const [extras, setExtras] = useState<string[]>(initialVote?.extras ?? [])
  const [rarity, setRarity] = useState<number | null>(initialVote?.rarity ?? null)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)
  const [isPending, startTransition] = useTransition()

  const toggleExtra = (value: string) => {
    setExtras(prev =>
      prev.includes(value) ? prev.filter(e => e !== value) : [...prev, value]
    )
  }

  const handleSave = () => {
    setError(null)
    setSaved(false)
    startTransition(async () => {
      const vote: UserVote = {
        comfort,
        view_rating: viewRating,
        condition: condition ? CONDITION_PRESETS[condition].float : null,
        shadow,
        extras,
        rarity,
      }
      const result = await upsertStats(benchId, vote)
      if (result.error) {
        setError(result.error)
        return
      }
      const { aggregated } = await getBenchStats(benchId)
      setSaved(true)
      onSaved(aggregated, vote)
    })
  }

  return (
    <div className="space-y-4">
      <p className="text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide">
        Deine Bewertung
      </p>

      {/* Comfort */}
      <div>
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-1.5">⭐ Komfort</p>
        <StarPicker value={comfort} onChange={setComfort} />
      </div>

      {/* View */}
      <div>
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-1.5">🌄 Aussicht</p>
        <StarPicker value={viewRating} onChange={setViewRating} />
      </div>

      {/* Rarity */}
      <div>
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-1.5">🏆 Rarität</p>
        <StarPicker value={rarity} onChange={setRarity} />
      </div>

      {/* Condition */}
      <div>
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-1.5">🏚 Zustand</p>
        <div className="flex gap-2 flex-wrap">
          {(Object.keys(CONDITION_PRESETS) as ConditionPreset[]).map(preset => (
            <button
              key={preset}
              onClick={() => setCondition(condition === preset ? null : preset)}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                condition === preset
                  ? 'text-[#1a1c17]'
                  : 'bg-gray-100 dark:bg-[#1a1c17] text-gray-600 dark:text-gray-400'
              }`}
              style={condition === preset ? { background: CONDITION_PRESETS[preset].color } : {}}
            >
              {preset}
            </button>
          ))}
        </div>
      </div>

      {/* Shadow */}
      <div>
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-1.5">☀️ Schatten</p>
        <div className="flex gap-2 flex-wrap">
          {SHADOW_OPTIONS.map(opt => (
            <button
              key={opt.value}
              onClick={() => setShadow(shadow === opt.value ? null : opt.value)}
              className={`px-3 py-1 rounded-lg text-xs transition-all ${
                shadow === opt.value
                  ? 'bg-primary text-white'
                  : 'bg-gray-100 dark:bg-[#1a1c17] text-gray-600 dark:text-gray-400'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Extras */}
      <div>
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-1.5">✅ Extras</p>
        <div className="flex gap-2 flex-wrap">
          {EXTRAS_OPTIONS.map(opt => (
            <button
              key={opt.value}
              onClick={() => toggleExtra(opt.value)}
              className={`px-3 py-1 rounded-lg text-xs transition-all ${
                extras.includes(opt.value)
                  ? 'bg-primary text-white'
                  : 'bg-gray-100 dark:bg-[#1a1c17] text-gray-600 dark:text-gray-400'
              }`}
            >
              {opt.icon} {opt.label}
            </button>
          ))}
        </div>
      </div>

      {error && <p className="text-xs text-red-500 dark:text-red-400">{error}</p>}
      {saved && <p className="text-xs text-primary">Bewertung gespeichert ✓</p>}

      <button
        onClick={handleSave}
        disabled={isPending}
        className="w-full bg-primary text-white rounded-lg py-2.5 text-sm font-medium hover:bg-primary-dark disabled:opacity-50 transition-colors"
      >
        {isPending ? 'Speichern…' : 'Bewertung speichern'}
      </button>
    </div>
  )
}

function StarPicker({
  value,
  onChange,
}: {
  value: number | null
  onChange: (v: number | null) => void
}) {
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map(n => (
        <button
          key={n}
          onClick={() => onChange(value === n ? null : n)}
          className="text-2xl leading-none transition-opacity"
          style={{ opacity: value !== null && n <= value ? 1 : 0.25 }}
          aria-label={`${n} Stern${n > 1 ? 'e' : ''}`}
        >
          ⭐
        </button>
      ))}
    </div>
  )
}
```

- [ ] **Step 2: Verify TypeScript**

```bash
npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add components/StatsVoteForm.tsx
git commit -m "feat: add StatsVoteForm with all stat fields and save action"
```

---

### Task 11: Photo Upload Page

**Files:**
- Create: `app/(app)/benches/[id]/edit-photo/page.tsx`

- [ ] **Step 1: Create edit-photo page**

```typescript
// app/(app)/benches/[id]/edit-photo/page.tsx
'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { uploadBenchPhoto } from '@/actions/benches'

export default function EditPhotoPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  // We use useEffect to get async params
  const [benchId, setBenchId] = useState<string | null>(null)
  if (!benchId) {
    params.then(p => setBenchId(p.id))
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setPreview(URL.createObjectURL(file))
  }

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!benchId) return
    setError(null)
    const formData = new FormData(e.currentTarget)
    startTransition(async () => {
      const result = await uploadBenchPhoto(benchId, formData)
      if (result.error) {
        setError(result.error)
        return
      }
      router.push('/')
    })
  }

  return (
    <div className="min-h-screen bg-surface dark:bg-[#1a1c17]">
      <div className="max-w-sm mx-auto px-4 py-8">
        <Link
          href="/"
          className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 flex items-center gap-1 mb-6"
        >
          ← Zurück zur Karte
        </Link>
        <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-6">Foto hinzufügen</h1>

        <form onSubmit={handleSubmit} className="space-y-5">
          {preview ? (
            <img
              src={preview}
              alt="Vorschau"
              className="w-full h-48 object-cover rounded-xl"
            />
          ) : (
            <div className="w-full h-48 bg-gray-100 dark:bg-[#252720] rounded-xl flex items-center justify-center text-4xl">
              🪑
            </div>
          )}

          <div>
            <label
              htmlFor="photo"
              className="block text-sm text-gray-800 dark:text-gray-200 font-medium mb-1"
            >
              Foto auswählen
            </label>
            <input
              id="photo"
              name="photo"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              required
              onChange={handleFileChange}
              className="w-full text-sm text-gray-700 dark:text-gray-300 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-primary file:text-white hover:file:bg-primary-dark"
            />
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">max 5MB · jpg, png, webp</p>
          </div>

          {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

          <button
            type="submit"
            disabled={isPending || !benchId}
            className="w-full bg-primary text-white rounded-lg py-2.5 text-sm font-medium hover:bg-primary-dark disabled:opacity-50"
          >
            {isPending ? 'Hochladen…' : 'Foto speichern'}
          </button>
        </form>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Update proxy.ts to protect the route**

In `proxy.ts`, change `protectedRoutes`:
```typescript
const protectedRoutes = ['/benches/new', '/benches']
```

And update the condition:
```typescript
if (protectedRoutes.some(r => req.nextUrl.pathname.startsWith(r)) && !user) {
  return NextResponse.redirect(new URL('/login', req.url))
}
```

- [ ] **Step 3: Verify TypeScript**

```bash
npx tsc --noEmit
```

- [ ] **Step 4: Commit**

```bash
git add app/\(app\)/benches/ proxy.ts
git commit -m "feat: add photo upload page for bench owner"
```

---

### Task 12: AddBenchForm Photo Extension

**Files:**
- Modify: `components/AddBenchForm.tsx`
- Modify: `actions/benches.ts`

- [ ] **Step 1: Extend createBench to handle optional photo**

In `actions/benches.ts`, update `createBench` to upload photo after bench is created:

```typescript
export async function createBench(state: FormState, formData: FormData): Promise<FormState> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return { error: 'Nicht eingeloggt' }

  const lat = parseFloat(formData.get('lat') as string)
  const lng = parseFloat(formData.get('lng') as string)

  if (isNaN(lat) || isNaN(lng)) return { error: 'Koordinaten fehlen' }

  const nameRaw = formData.get('name') as string
  const name = nameRaw?.trim() || await getLocationName(lat, lng)

  const { data: bench, error } = await supabase
    .from('benches')
    .insert({ lat, lng, name, created_by: user.id })
    .select('id')
    .single()

  if (error) return { error: error.message }

  // Optional photo upload
  const photoFile = formData.get('photo') as File
  if (photoFile && photoFile.size > 0) {
    await uploadBenchPhoto(bench.id, formData)
  }

  revalidatePath('/')
  redirect('/')
}
```

- [ ] **Step 2: Add optional photo field to AddBenchForm**

In `components/AddBenchForm.tsx`, add photo state and file input:

```typescript
// Add to imports:
import { useState } from 'react'  // already imported

// Add photo state after existing state:
const [photoPreview, setPhotoPreview] = useState<string | null>(null)

const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
  const file = e.target.files?.[0]
  if (file) setPhotoPreview(URL.createObjectURL(file))
}
```

Add photo input in the form JSX, after the name field and before the error display:

```tsx
{/* Optional photo */}
<div>
  <label htmlFor="photo" className="block text-sm text-gray-800 dark:text-gray-200 font-medium mb-1">
    Foto{' '}
    <span className="text-gray-400 dark:text-gray-500 font-normal">(optional)</span>
  </label>
  {photoPreview && (
    <img src={photoPreview} alt="Vorschau" className="w-full h-32 object-cover rounded-lg mb-2" />
  )}
  <input
    id="photo"
    name="photo"
    type="file"
    accept="image/jpeg,image/png,image/webp"
    onChange={handlePhotoChange}
    className="w-full text-sm text-gray-700 dark:text-gray-300 file:mr-3 file:py-1 file:px-3 file:rounded-lg file:border-0 file:text-sm file:bg-primary file:text-white hover:file:bg-primary-dark"
  />
</div>
```

- [ ] **Step 3: Verify TypeScript**

```bash
npx tsc --noEmit
```

- [ ] **Step 4: Commit**

```bash
git add components/AddBenchForm.tsx actions/benches.ts
git commit -m "feat: add optional photo upload to bench creation form"
```

---

### Task 13: Page Data + Final Integration

**Files:**
- Modify: `app/(app)/page.tsx`

- [ ] **Step 1: Include photo_url in benches query**

In `app/(app)/page.tsx`, update the benches select:

```typescript
supabase.from('benches').select('id, lat, lng, name, created_by, created_at, photo_url'),
```

- [ ] **Step 2: Run full test suite**

```bash
npm test
```
Expected: all tests pass

- [ ] **Step 3: Build check**

```bash
npm run build
```
Expected: no errors

- [ ] **Step 4: Manual smoke test**

1. Open http://localhost:3000 (run `npm run dev` if not running)
2. Tap a bench marker → popup shows 🪑 placeholder + "Details →"
3. Tap "Details →" → sheet shows detail view with "Noch keine Bewertungen"
4. Fill in comfort + rarity stars → tap "Bewertung speichern" → stats appear
5. Close sheet → tap list pill → bench rows → tap a row → map flies to bench, sheet collapses
6. Create new bench with photo → bench appears on map with photo in popup
7. Tap bench popup → photo shows in popup thumbnail

- [ ] **Step 5: Final commit**

```bash
git add app/\(app\)/page.tsx
git commit -m "feat: include photo_url in bench query — Phase 2 bank stats complete"
```

---

## Self-Review Notes

- `getBenchStats` uses `maybeSingle()` (not `single()`) for userVote — won't error when no vote exists
- `uploadBenchPhoto` uses `{benchId}/photo` path with `upsert: true` — overwrites cleanly, no orphaned files
- BottomSheet list row's delete button uses `e.stopPropagation()` to prevent flyTo firing on delete
- `BenchDetail` has no dependency on `Bench` type from BenchMap to avoid circular imports
- `StatsVoteForm`'s `onSaved` callback refreshes both aggregated stats and userVote after UPSERT
- `conditionToPreset` rounds the float to the nearest preset tier for form pre-population
- Phase 3 note: Shadow mode aggregation may need Postgres query optimization at scale; current implementation is correct for expected data volumes
