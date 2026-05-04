# Phase 4 — Plätzchen Rebrand & Spot-Generalisierung Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Generalize the app from "BenchMarks" (just benches) to "Plätzchen" (six spot types for hiking pause-spots), full code rebrand, plus a new community description feed.

**Architecture:** Migrations first (DB rename + new descriptions table), then types/utils, server actions, components in dependency order, routes, UI strings, docs. Hard cutover on routes (`/benches/*` → 404). Storage bucket `bench-photos` keeps internal name. Emojis as map markers (vector icons later by user).

**Tech Stack:** Next.js 16.2 + React 19 + TypeScript + Tailwind v4 + Supabase + Leaflet + vitest 4.

**Spec:** `docs/superpowers/specs/2026-05-04-phase4-plaetzchen-rebrand-design.md`

---

## File Structure Overview

| File | Action |
|---|---|
| `supabase/migrations/006_phase4_rename_to_spots.sql` | Create |
| `supabase/migrations/007_phase4_descriptions.sql` | Create |
| `lib/spot-types.ts` | Create — `SpotType` union, `SPOT_TYPES` const |
| `lib/bench-utils.ts` → `lib/spot-utils.ts` | Move + edit |
| `__tests__/lib/bench-utils.test.ts` → `__tests__/lib/spot-utils.test.ts` | Move + edit |
| `actions/benches.ts` → `actions/spots.ts` | Move + edit |
| `__tests__/actions/benches.test.ts` → `__tests__/actions/spots.test.ts` | Move + edit |
| `actions/admin.ts` | Modify (rename `adminDeleteBench`) |
| `actions/stats.ts` | Modify (RPC name, types) |
| `actions/descriptions.ts` | Create |
| `__tests__/actions/descriptions.test.ts` | Create |
| `components/BenchMap.tsx` → `components/SpotMap.tsx` | Move + edit (per-type emoji markers) |
| `components/BenchMapClient.tsx` → `components/SpotMapClient.tsx` | Move + edit |
| `components/BenchPopup.tsx` → `components/SpotPopup.tsx` | Move + edit (type label) |
| `components/SpotTypePicker.tsx` | Create |
| `components/AddBenchForm.tsx` → `components/AddSpotForm.tsx` | Move + edit (integrate type picker) |
| `components/BenchDetail.tsx` → `components/SpotDetail.tsx` | Move + edit (type badge, feed) |
| `components/SpotDescriptionFeed.tsx` | Create |
| `components/MapLayout.tsx` | Modify (Bench → Spot types) |
| `components/BottomSheet.tsx` | Modify (per-row emoji, strings) |
| `components/MapHeader.tsx` | Modify ("📍 Plätzchen") |
| `app/(app)/page.tsx` | Modify (query `spots`) |
| `app/(app)/admin/page.tsx` | Modify (query `spots`) |
| `app/(app)/admin/AdminBenches.tsx` → `AdminSpots.tsx` | Move + edit |
| `app/(app)/benches/new/page.tsx` → `app/(app)/spots/new/page.tsx` | Move |
| `app/(app)/benches/[id]/edit-photo/page.tsx` → `app/(app)/spots/[id]/edit-photo/page.tsx` | Move |
| `app/(auth)/login/page.tsx` + `signup/page.tsx` | Modify (logo) |
| `app/layout.tsx` | Modify (title, meta) |
| `proxy.ts` | Modify (`/spots` protected) |
| `AGENTS.md`, `docs/*.md` | Modify (docs catch-up at end) |

---

## Task 1: Migration 006 — Rename to Spots

**Files:**
- Create: `supabase/migrations/006_phase4_rename_to_spots.sql`

- [ ] **Step 1: Write the migration file**

```sql
-- Phase 4: Generalize benches → spots with type enum

-- 1. Spot type enum
CREATE TYPE spot_type AS ENUM ('bench', 'viewpoint', 'shelter', 'picnic', 'meadow', 'water');

-- 2. Rename main table; existing FKs/indexes/RLS policies are preserved.
ALTER TABLE benches RENAME TO spots;

-- 3. Add type column with backwards-compatible default
ALTER TABLE spots ADD COLUMN type spot_type NOT NULL DEFAULT 'bench';

-- 4. Rename votes table + FK column
ALTER TABLE bench_stats_votes RENAME TO spot_stats_votes;
ALTER TABLE spot_stats_votes RENAME COLUMN bench_id TO spot_id;

-- 5. Drop the old aggregation function and recreate with renamed args/refs
DROP FUNCTION IF EXISTS get_bench_aggregated_stats(uuid);

CREATE OR REPLACE FUNCTION get_spot_aggregated_stats(p_spot_id uuid)
RETURNS TABLE (
  vote_count bigint,
  comfort_median numeric,
  view_median numeric,
  condition_median numeric,
  rarity_median numeric,
  shadow_mode text,
  extras_threshold text[]
)
LANGUAGE sql STABLE AS $$
  WITH base AS (
    SELECT * FROM spot_stats_votes WHERE spot_id = p_spot_id
  ),
  agg AS (
    SELECT
      COUNT(*) AS vote_count,
      PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY comfort) FILTER (WHERE comfort IS NOT NULL)         AS comfort_median,
      PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY view_rating) FILTER (WHERE view_rating IS NOT NULL) AS view_median,
      PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY condition) FILTER (WHERE condition IS NOT NULL)     AS condition_median,
      PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY rarity) FILTER (WHERE rarity IS NOT NULL)           AS rarity_median,
      MODE() WITHIN GROUP (ORDER BY shadow) FILTER (WHERE shadow IS NOT NULL) AS shadow_mode
    FROM base
  ),
  exploded AS (
    SELECT unnest(extras) AS extra FROM base WHERE extras IS NOT NULL
  ),
  extra_counts AS (
    SELECT extra, COUNT(*) AS c FROM exploded GROUP BY extra
  )
  SELECT
    agg.vote_count,
    agg.comfort_median,
    agg.view_median,
    agg.condition_median,
    agg.rarity_median,
    agg.shadow_mode,
    COALESCE(
      ARRAY(
        SELECT extra FROM extra_counts
        WHERE c >= GREATEST(1, (SELECT COUNT(*) FROM base) / 2)
      ),
      ARRAY[]::text[]
    )
  FROM agg;
$$;
```

NOTE: keep the SQL body of `get_spot_aggregated_stats` matching the existing logic. If the actual current function differs from the snippet above, adjust to mirror it exactly except for the table/column name swap. Read `supabase/migrations/003_phase2_bank_stats.sql` first to copy the current body.

- [ ] **Step 2: Apply via Supabase MCP**

Use `mcp__plugin_supabase_supabase__apply_migration` with name `phase4_rename_to_spots` and the SQL.

- [ ] **Step 3: Verify**

Run via MCP:
```sql
SELECT COUNT(*) AS spot_count FROM spots;
SELECT COUNT(*) AS vote_count FROM spot_stats_votes;
SELECT typname FROM pg_type WHERE typname = 'spot_type';
SELECT proname FROM pg_proc WHERE proname = 'get_spot_aggregated_stats';
SELECT type, COUNT(*) FROM spots GROUP BY type;
```
Expected: spot_count matches the bench count from before; vote_count unchanged; spot_type enum exists; function exists; all rows have `type='bench'`.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/006_phase4_rename_to_spots.sql
git commit -m "feat(db): rename benches→spots, add spot_type enum (migration 006)"
```

---

## Task 2: Migration 007 — `spot_descriptions` Table

**Files:**
- Create: `supabase/migrations/007_phase4_descriptions.sql`

- [ ] **Step 1: Write migration**

```sql
-- Phase 4: Community descriptions feed for spots

CREATE TABLE spot_descriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  spot_id uuid NOT NULL REFERENCES spots(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  text text NOT NULL CHECK (char_length(text) > 0 AND char_length(text) <= 280),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (spot_id, user_id)
);

CREATE INDEX idx_spot_descriptions_spot_id ON spot_descriptions(spot_id, created_at DESC);

ALTER TABLE spot_descriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read descriptions" ON spot_descriptions
  FOR SELECT USING (true);

CREATE POLICY "Authenticated users can insert own description" ON spot_descriptions
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own description" ON spot_descriptions
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own description" ON spot_descriptions
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- updated_at trigger
CREATE OR REPLACE FUNCTION set_updated_at() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

CREATE TRIGGER set_spot_descriptions_updated_at
BEFORE UPDATE ON spot_descriptions
FOR EACH ROW EXECUTE FUNCTION set_updated_at();
```

- [ ] **Step 2: Apply via Supabase MCP**

Use `mcp__plugin_supabase_supabase__apply_migration` with name `phase4_descriptions`.

- [ ] **Step 3: Verify**

```sql
SELECT polname, polcmd FROM pg_policy WHERE polrelid = 'spot_descriptions'::regclass;
SELECT indexname FROM pg_indexes WHERE tablename = 'spot_descriptions';
SELECT tgname FROM pg_trigger WHERE tgrelid = 'spot_descriptions'::regclass;
```
Expected: 4 RLS policies (r/a/w/d), index, trigger.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/007_phase4_descriptions.sql
git commit -m "feat(db): add spot_descriptions table with RLS + UNIQUE(spot,user) (migration 007)"
```

---

## Task 3: `lib/spot-types.ts` + Rename `bench-utils.ts` → `spot-utils.ts`

**Files:**
- Create: `lib/spot-types.ts`
- Move + edit: `lib/bench-utils.ts` → `lib/spot-utils.ts`
- Move + edit: `__tests__/lib/bench-utils.test.ts` → `__tests__/lib/spot-utils.test.ts`

- [ ] **Step 1: Create `lib/spot-types.ts`**

```ts
export type SpotType = 'bench' | 'viewpoint' | 'shelter' | 'picnic' | 'meadow' | 'water'

export interface SpotTypeMeta {
  key: SpotType
  emoji: string
  label: string  // singular German label
}

export const SPOT_TYPES: readonly SpotTypeMeta[] = [
  { key: 'bench',     emoji: '🪑',  label: 'Bank' },
  { key: 'viewpoint', emoji: '🏔️', label: 'Aussichtspunkt' },
  { key: 'shelter',   emoji: '⛺',  label: 'Schutzhütte' },
  { key: 'picnic',    emoji: '🧺',  label: 'Rastplatz' },
  { key: 'meadow',    emoji: '🌿',  label: 'Liegewiese' },
  { key: 'water',     emoji: '💧',  label: 'Wasserstelle' },
] as const

export const SPOT_TYPE_MAP: Record<SpotType, SpotTypeMeta> = Object.fromEntries(
  SPOT_TYPES.map((t) => [t.key, t])
) as Record<SpotType, SpotTypeMeta>
```

- [ ] **Step 2: Move bench-utils → spot-utils**

```bash
git mv lib/bench-utils.ts lib/spot-utils.ts
```

- [ ] **Step 3: Edit `lib/spot-utils.ts`**

Replace contents with:

```ts
import { SPOT_TYPE_MAP, type SpotType } from '@/lib/spot-types'

export function spotDisplayName(name: string | null, createdAt: string, type: SpotType = 'bench'): string {
  if (name) return name
  const d = new Date(createdAt)
  const typeLabel = SPOT_TYPE_MAP[type].label
  return `${typeLabel} vom ${d.toLocaleDateString('de-DE', { day: 'numeric', month: 'long' })}`
}

export function distanceTo(
  from: { lat: number; lng: number },
  to: { lat: number; lng: number }
): string {
  const R = 6371000
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

- [ ] **Step 4: Move + edit test file**

```bash
git mv __tests__/lib/bench-utils.test.ts __tests__/lib/spot-utils.test.ts
```

In the moved test:
- Update import: `from '@/lib/bench-utils'` → `from '@/lib/spot-utils'`
- Rename describe blocks: `benchDisplayName` → `spotDisplayName`
- For tests that previously asserted `Bank vom <date>`, the default type is still `bench` → output remains `Bank vom <date>`. Add one new test:
  ```ts
  it('uses the type label when provided (e.g. viewpoint)', () => {
    expect(spotDisplayName(null, '2025-06-15T00:00:00Z', 'viewpoint')).toBe('Aussichtspunkt vom 15. Juni')
  })
  ```

- [ ] **Step 5: Run tests**

```bash
npm test -- spot-utils
```
Expected: all tests pass (existing + new one).

- [ ] **Step 6: Commit**

```bash
git add lib/spot-types.ts lib/spot-utils.ts __tests__/lib/spot-utils.test.ts
git rm lib/bench-utils.ts 2>/dev/null  # already moved by git mv
git commit -m "refactor: introduce SpotType + rename bench-utils → spot-utils"
```

---

## Task 4: Server Action — `actions/benches.ts` → `actions/spots.ts`

**Files:**
- Move + edit: `actions/benches.ts` → `actions/spots.ts`
- Move + edit: `__tests__/actions/benches.test.ts` → `__tests__/actions/spots.test.ts`

- [ ] **Step 1: Move actions file**

```bash
git mv actions/benches.ts actions/spots.ts
```

- [ ] **Step 2: Edit `actions/spots.ts`**

Apply these transformations:
- All `from('benches')` → `from('spots')`
- `bench-photos` storage bucket name **stays** (`bench-photos/${spotId}/photo`)
- Function renames: `createBench` → `createSpot`, `deleteBench` → `deleteSpot`, `uploadBenchPhoto` → `uploadSpotPhoto`
- Variable renames inside: `bench` → `spot`, `benchId` → `spotId`
- `createSpot`: accept new `type` field from formData, default `'bench'` if missing. Validate it's one of `SPOT_TYPES`.
- Insert with `{ lat, lng, name, type, created_by: user.id }`
- Redirect path: `/spots/${spot.id}/edit-photo` (changed from `/benches/...`)
- Add import: `import type { SpotType } from '@/lib/spot-types'`
- Add validation:
  ```ts
  const VALID_TYPES: SpotType[] = ['bench','viewpoint','shelter','picnic','meadow','water']
  const typeRaw = (formData.get('type') as string | null) ?? 'bench'
  if (!VALID_TYPES.includes(typeRaw as SpotType)) {
    return { error: 'Ungültiger Spot-Typ' }
  }
  const type = typeRaw as SpotType
  ```

- [ ] **Step 3: Move + edit test file**

```bash
git mv __tests__/actions/benches.test.ts __tests__/actions/spots.test.ts
```

- Imports update: `from '@/actions/benches'` → `from '@/actions/spots'`
- Function-name references: `createBench` → `createSpot`, etc.
- Mock `from('benches')` → `from('spots')`
- Test data: where formData was constructed without `type`, that's still fine (default 'bench' applied). Add one test for explicit `type` field:
  ```ts
  it('createSpot accepts a non-default type', async () => {
    // construct formData with type: 'viewpoint'
    // verify insert is called with type: 'viewpoint'
  })
  ```
- Storage bucket assertions stay `bench-photos`.

- [ ] **Step 4: Run tests**

```bash
npm test -- spots
```
Expected: all pass.

- [ ] **Step 5: Run full suite**

```bash
npm test
```
NOTE: this WILL temporarily break because nothing else has been renamed yet (components still import from `@/actions/benches` and `@/lib/bench-utils`). That's expected for now — the next tasks fix them. As long as `spots.test.ts` and `spot-utils.test.ts` are green, proceed.

Actually, to keep the build green throughout, **defer the actual file delete + import-cascade until Task 5**. Use `git mv` to stage the rename, but the next task will fix all import sites before committing.

→ Better approach: skip Step 5 here, **do not commit yet**. Let Task 5 update all import sites in `app/(app)/page.tsx`, `components/MapLayout.tsx`, `BottomSheet.tsx`, etc. to point at `@/actions/spots` and `@/lib/spot-utils`. Then run the suite and commit the whole rename together.

→ For tracking, mark this task's commit step as "deferred — Task 5 batches commits".

---

## Task 5: Update All Imports + Server Actions Cascade

**Files (all using `Bench` / `bench-*` imports):**
- `actions/admin.ts` (rename `adminDeleteBench` → `adminDeleteSpot`)
- `actions/stats.ts` (RPC name + types)
- `actions/descriptions.ts` (NEW — see Task 6)
- `app/(app)/page.tsx`
- `app/(app)/admin/page.tsx`
- `app/(app)/admin/AdminBenches.tsx` (will be moved in Task 14)
- `components/BenchMap.tsx` (will be moved in Task 7)
- `components/BenchMapClient.tsx`
- `components/BenchPopup.tsx`
- `components/BenchDetail.tsx`
- `components/AddBenchForm.tsx`
- `components/MapLayout.tsx`
- `components/BottomSheet.tsx`

This is a wide rename. To keep the build green at every step, do this in two phases:

### Phase A: cross-cutting type+util updates that don't change file names yet

- [ ] **Step 1: Update all `import type { Bench } from '@/components/BenchMap'`**

Find every consumer. Currently still `BenchMap.tsx` (since rename hasn't happened). For now keep importing from `BenchMap.tsx` (will rename later). But change the type itself in BenchMap.tsx to add `type`:

In `components/BenchMap.tsx`, find the `Bench` interface:
```ts
export interface Bench {
  id: string
  lat: number
  lng: number
  name: string | null
  created_by: string
  created_at: string
  photo_url: string | null
}
```
Update to:
```ts
import type { SpotType } from '@/lib/spot-types'

export interface Bench {
  id: string
  type: SpotType
  lat: number
  lng: number
  name: string | null
  created_by: string
  created_at: string
  photo_url: string | null
}
```

(`Bench` is still the export name temporarily — Task 7 renames it to `Spot`.)

- [ ] **Step 2: Update `app/(app)/page.tsx`**

```ts
// Change query
supabase.from('benches').select('id, lat, lng, name, created_by, created_at, photo_url')
  → supabase.from('spots').select('id, type, lat, lng, name, created_by, created_at, photo_url')
```

- [ ] **Step 3: Update `app/(app)/admin/page.tsx` + `AdminBenches.tsx`**

- Change `supabase.from('benches')` → `supabase.from('spots')` in both files
- Update result types: `AdminBench` interface gets a `type: SpotType` field
- Adjust query: `'id, name, created_at, created_by, profiles(username)'` → `'id, name, type, created_at, created_by, profiles(username)'`

- [ ] **Step 4: Update `actions/admin.ts`**

```ts
// Rename
export async function adminDeleteBench(id: string)
  → export async function adminDeleteSpot(id: string)

// Change query inside
supabase.from('benches').delete().eq('id', id)
  → supabase.from('spots').delete().eq('id', id)

// revalidatePath('/admin') stays; revalidatePath('/') stays
```

Update the import in `app/(app)/admin/AdminBenches.tsx`:
```ts
import { adminDeleteBench } from '@/actions/admin'  // → adminDeleteSpot
```

- [ ] **Step 5: Update `actions/stats.ts`**

- Rename: `getBenchStats` → `getSpotStats`, `upsertStats` keeps name (already type-agnostic) but its first arg renames `benchId` → `spotId`.
- Inside `getSpotStats`: change RPC call:
  ```ts
  supabase.rpc('get_bench_aggregated_stats', { p_bench_id: benchId })
    → supabase.rpc('get_spot_aggregated_stats', { p_spot_id: spotId })
  ```
- Inside `upsertStats`: change query:
  ```ts
  .from('bench_stats_votes').upsert({ bench_id: benchId, ... }, { onConflict: 'bench_id,user_id' })
    → .from('spot_stats_votes').upsert({ spot_id: spotId, ... }, { onConflict: 'spot_id,user_id' })
  ```
- Same in the user-vote SELECT query.
- Update test file `__tests__/actions/stats.test.ts`: function name `getBenchStats` → `getSpotStats`, mocked `from('bench_stats_votes')` → `from('spot_stats_votes')`, RPC name in mocks → `get_spot_aggregated_stats`, arg name → `p_spot_id`. Test column names in mock data (`bench_id` in vote results) → `spot_id`.

- [ ] **Step 6: Update `actions/spots.ts` import paths in consumers**

Search for any remaining `from '@/actions/benches'` and replace with `from '@/actions/spots'`. Function names: `createBench` → `createSpot`, `deleteBench` → `deleteSpot`, `uploadBenchPhoto` → `uploadSpotPhoto`.

Files affected (currently still using `BenchMap.tsx`-style names):
- `components/AddBenchForm.tsx` — `createBench` import
- `components/BenchPopup.tsx` — `deleteBench` import
- `components/BottomSheet.tsx` — `deleteBench` import
- `components/BenchDetail.tsx` — none direct
- `app/(app)/benches/[id]/edit-photo/page.tsx` — `uploadBenchPhoto` import

- [ ] **Step 7: Update `lib/bench-utils.ts` import paths**

Search for `from '@/lib/bench-utils'` and replace with `from '@/lib/spot-utils'`. Function names: `benchDisplayName` → `spotDisplayName`. Pass `bench.type` (or `spot.type` later) as third arg where the call doesn't already.

Files affected:
- `components/BottomSheet.tsx`
- `components/BenchDetail.tsx`
- `components/BenchPopup.tsx`

In each callsite, change `benchDisplayName(bench.name, bench.created_at)` to `spotDisplayName(bench.name, bench.created_at, bench.type)`. (`bench` variable still exists at this stage — renamed to `spot` in Task 7+.)

- [ ] **Step 8: Run tests + build**

```bash
npm test
npm run build
```
Expected: all tests pass (54 — the new test added in Task 3), build clean.

- [ ] **Step 9: Commit**

```bash
git add .
git commit -m "refactor: cascade Bench→Spot type+action+util renames in consumers

- benches → spots table queries everywhere
- bench_stats_votes → spot_stats_votes
- get_bench_aggregated_stats → get_spot_aggregated_stats
- adminDeleteBench → adminDeleteSpot
- getBenchStats → getSpotStats
- benchDisplayName → spotDisplayName (now type-aware)
- Bench interface gains \`type: SpotType\` field"
```

---

## Task 6: New `actions/descriptions.ts` Server Action

**Files:**
- Create: `actions/descriptions.ts`
- Create: `__tests__/actions/descriptions.test.ts`

- [ ] **Step 1: Write failing test (TDD)**

```ts
// __tests__/actions/descriptions.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { listDescriptions, upsertDescription, deleteDescription } from '@/actions/descriptions'

vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))

const mockClient = {
  auth: { getUser: vi.fn() },
  from: vi.fn(),
}

vi.mock('@/lib/supabase/server', () => ({
  createClient: () => mockClient,
}))

beforeEach(() => {
  vi.clearAllMocks()
  mockClient.auth.getUser.mockResolvedValue({ data: { user: { id: 'user-1' } } })
})

describe('listDescriptions', () => {
  it('returns empty array when no descriptions', async () => {
    mockClient.from.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue({ data: [], error: null }),
        }),
      }),
    })
    const result = await listDescriptions('spot-1')
    expect(result).toEqual([])
  })

  it('joins username from profiles', async () => {
    mockClient.from.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue({
            data: [
              { id: 'd1', user_id: 'u1', text: 'hi', created_at: 'x', updated_at: 'x', profiles: { username: 'niklas' } },
            ],
            error: null,
          }),
        }),
      }),
    })
    const result = await listDescriptions('spot-1')
    expect(result[0].username).toBe('niklas')
  })
})

describe('upsertDescription', () => {
  it('rejects empty text', async () => {
    const result = await upsertDescription('spot-1', '   ')
    expect(result.error).toBeTruthy()
  })

  it('rejects text > 280 chars', async () => {
    const result = await upsertDescription('spot-1', 'a'.repeat(281))
    expect(result.error).toBeTruthy()
  })

  it('rejects unauthenticated', async () => {
    mockClient.auth.getUser.mockResolvedValue({ data: { user: null } })
    const result = await upsertDescription('spot-1', 'valid text')
    expect(result.error).toBe('Nicht eingeloggt')
  })
})

describe('deleteDescription', () => {
  it('rejects unauthenticated', async () => {
    mockClient.auth.getUser.mockResolvedValue({ data: { user: null } })
    const result = await deleteDescription('spot-1')
    expect(result.error).toBe('Nicht eingeloggt')
  })
})
```

- [ ] **Step 2: Run failing test**

```bash
npm test -- descriptions
```
Expected: FAIL — module doesn't exist.

- [ ] **Step 3: Implement `actions/descriptions.ts`**

```ts
'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

export interface Description {
  id: string
  user_id: string
  username: string | null
  text: string
  created_at: string
  updated_at: string
}

export async function listDescriptions(spotId: string): Promise<Description[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('spot_descriptions')
    .select('id, user_id, text, created_at, updated_at, profiles(username)')
    .eq('spot_id', spotId)
    .order('created_at', { ascending: false })

  if (error || !data) return []

  return data.map((row: { id: string; user_id: string; text: string; created_at: string; updated_at: string; profiles: { username: string | null } | null }) => ({
    id: row.id,
    user_id: row.user_id,
    username: row.profiles?.username ?? null,
    text: row.text,
    created_at: row.created_at,
    updated_at: row.updated_at,
  }))
}

export async function upsertDescription(
  spotId: string,
  text: string,
): Promise<{ error?: string }> {
  const trimmed = text.trim()
  if (trimmed.length === 0) return { error: 'Tipp darf nicht leer sein' }
  if (trimmed.length > 280) return { error: 'Tipp ist zu lang (max 280 Zeichen)' }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Nicht eingeloggt' }

  const { error } = await supabase
    .from('spot_descriptions')
    .upsert(
      { spot_id: spotId, user_id: user.id, text: trimmed },
      { onConflict: 'spot_id,user_id' },
    )

  if (error) return { error: error.message }

  revalidatePath('/')
  return {}
}

export async function deleteDescription(spotId: string): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Nicht eingeloggt' }

  const { error } = await supabase
    .from('spot_descriptions')
    .delete()
    .eq('spot_id', spotId)
    .eq('user_id', user.id)

  if (error) return { error: error.message }

  revalidatePath('/')
  return {}
}
```

- [ ] **Step 4: Run tests**

```bash
npm test -- descriptions
```
Expected: all pass.

- [ ] **Step 5: Commit**

```bash
git add actions/descriptions.ts __tests__/actions/descriptions.test.ts
git commit -m "feat: spot descriptions server actions (list/upsert/delete) + tests"
```

---

## Task 7: Component Renames — `BenchMap` → `SpotMap`

**Files:**
- Move: `components/BenchMap.tsx` → `components/SpotMap.tsx`
- Move: `components/BenchMapClient.tsx` → `components/SpotMapClient.tsx`
- Move: `components/BenchPopup.tsx` → `components/SpotPopup.tsx`

- [ ] **Step 1: Git mv all three**

```bash
git mv components/BenchMap.tsx components/SpotMap.tsx
git mv components/BenchMapClient.tsx components/SpotMapClient.tsx
git mv components/BenchPopup.tsx components/SpotPopup.tsx
```

- [ ] **Step 2: Edit `components/SpotMap.tsx`**

Inside the file:
- Rename interface: `Bench` → `Spot`
- Rename props interface: `BenchMapProps` → `SpotMapProps`
- Rename component: `BenchMap` → `SpotMap`
- Update parameter `benches: Bench[]` → `spots: Spot[]`
- Inside the component: `benches.map` → `spots.map`, variable `bench` → `spot`
- Import: `import type { SpotType } from '@/lib/spot-types'` (already added in Task 5 Step 1)
- Import: `import { SPOT_TYPE_MAP } from '@/lib/spot-types'`
- Marker DivIcon: change emoji from hardcoded `🪑` to `SPOT_TYPE_MAP[spot.type].emoji`
- Update import in `SpotPopup` reference: `BenchPopup` → `SpotPopup`

Find the marker render code (likely around `<MarkerClusterGroup>` block). Where the marker uses something like:
```tsx
<Marker position={[bench.lat, bench.lng]} icon={createBenchIcon()}>
  <BenchPopup ... />
</Marker>
```

Replace with per-type icon:
```tsx
<Marker position={[spot.lat, spot.lng]} icon={createSpotIcon(spot.type)}>
  <SpotPopup ... spot={spot} />
</Marker>
```

And change icon factory from `createBenchIcon` to:

```ts
const ICON_CACHE = new Map<SpotType, L.DivIcon>()

function createSpotIcon(type: SpotType): L.DivIcon {
  if (typeof L === 'undefined') return null as never  // SSR guard
  const cached = ICON_CACHE.get(type)
  if (cached) return cached
  const icon = L.divIcon({
    html: `<span style="font-size:24px;line-height:1">${SPOT_TYPE_MAP[type].emoji}</span>`,
    className: '',
    iconSize: [28, 28],
    iconAnchor: [14, 28],
    popupAnchor: [0, -28],
  })
  ICON_CACHE.set(type, icon)
  return icon
}
```

(NOTE: pull the actual current icon factory from the existing file and adjust accordingly. The above is a rough template.)

- [ ] **Step 3: Edit `components/SpotMapClient.tsx`**

- Rename component: `BenchMapClient` → `SpotMapClient`
- Update dynamic import: `import('./BenchMap')` → `import('./SpotMap')`
- Rename prop interface: `BenchMapClientProps` → `SpotMapClientProps`
- Update prop name: `benches: Bench[]` → `spots: Spot[]` (and pass-through)
- Re-export type: `export type { Spot } from './SpotMap'` (replaces `Bench`)

- [ ] **Step 4: Edit `components/SpotPopup.tsx`**

- Rename component: `BenchPopup` → `SpotPopup`
- Update prop interface: `bench: Bench` → `spot: Spot`
- Inside component: `bench.id` → `spot.id`, etc.
- Add type label rendering below the spot name. Layout suggestion:
  ```tsx
  <strong>{spotDisplayName(spot.name, spot.created_at, spot.type)}</strong>
  <small style={{display:'block', marginTop:'2px', color:'#888'}}>
    {SPOT_TYPE_MAP[spot.type].emoji} {SPOT_TYPE_MAP[spot.type].label}
  </small>
  ```
- Update `deleteBench` callsite if any → `deleteSpot`
- Update `getBenchStats` callsite (lazy rarity) → `getSpotStats`

- [ ] **Step 5: Update all consumers**

Find every file importing from these:
- `import ... from '@/components/BenchMap'` → `'@/components/SpotMap'`
- `import ... from '@/components/BenchMapClient'` → `'@/components/SpotMapClient'`
- `import ... from '@/components/BenchPopup'` → `'@/components/SpotPopup'`
- `import type { Bench }` → `import type { Spot }`

Files: `app/(app)/page.tsx`, `components/MapLayout.tsx`, `components/BottomSheet.tsx`, `components/BenchDetail.tsx`.

Inside each, also rename usages: `Bench` type → `Spot`, `bench` variable → `spot`, `benches` array → `spots`.

- [ ] **Step 6: Build + tests**

```bash
npm run build
npm test
```
Expected: clean build, 55+ tests passing.

- [ ] **Step 7: Commit**

```bash
git add .
git commit -m "refactor: rename BenchMap/Client/Popup → SpotMap/Client/Popup, per-type emoji markers"
```

---

## Task 8: New `SpotTypePicker` Component

**Files:**
- Create: `components/SpotTypePicker.tsx`

- [ ] **Step 1: Implement**

```tsx
'use client'

import { SPOT_TYPES, type SpotType } from '@/lib/spot-types'

interface SpotTypePickerProps {
  value: SpotType
  onChange: (type: SpotType) => void
}

export default function SpotTypePicker({ value, onChange }: SpotTypePickerProps) {
  return (
    <div role="radiogroup" aria-label="Was ist hier?" className="grid grid-cols-3 gap-2">
      {SPOT_TYPES.map((t) => {
        const selected = value === t.key
        return (
          <button
            key={t.key}
            type="button"
            role="radio"
            aria-checked={selected}
            aria-label={t.label}
            onClick={() => onChange(t.key)}
            className={`min-h-16 rounded-lg border-2 transition-all flex flex-col items-center justify-center gap-1 ${
              selected
                ? 'border-primary bg-primary-light dark:bg-[#2a3f1e]'
                : 'border-gray-200 dark:border-[#2a2f24] bg-white dark:bg-[#1e231a] hover:border-gray-300 dark:hover:border-gray-600'
            }`}
          >
            <span className="text-2xl">{t.emoji}</span>
            <span className="text-xs text-gray-700 dark:text-gray-300">{t.label}</span>
          </button>
        )
      })}
    </div>
  )
}
```

- [ ] **Step 2: Build**

```bash
npm run build
```
Expected: clean.

- [ ] **Step 3: Commit**

```bash
git add components/SpotTypePicker.tsx
git commit -m "feat: SpotTypePicker — radiogroup of 6 spot types"
```

---

## Task 9: Rename `AddBenchForm` → `AddSpotForm` + Integrate Type Picker

**Files:**
- Move: `components/AddBenchForm.tsx` → `components/AddSpotForm.tsx`

- [ ] **Step 1: Git mv**

```bash
git mv components/AddBenchForm.tsx components/AddSpotForm.tsx
```

- [ ] **Step 2: Edit `components/AddSpotForm.tsx`**

Apply changes:
- Rename function: `AddBenchForm` → `AddSpotForm`
- Rename props interface: `AddBenchFormProps` → `AddSpotFormProps`
- Add state: `const [type, setType] = useState<SpotType>('bench')`
- Add hidden input: `<input type="hidden" name="type" value={type} />`
- Insert `<SpotTypePicker value={type} onChange={setType} />` between Position section and Name section. Wrap with a label "Was ist hier?".
- Update import: `createBench` → `createSpot`
- Update import: add `SpotTypePicker`, `SpotType`
- Submit button copy: "Bank eintragen" → "Plätzchen eintragen"

- [ ] **Step 3: Update consumer**

`app/(app)/spots/new/page.tsx` (currently still under `/benches/new`, will move in Task 13):
- Import: `AddBenchForm` → `AddSpotForm`
- JSX: `<AddBenchForm ... />` → `<AddSpotForm ... />`
- Title strings: "Bank eintragen" → "Plätzchen eintragen"

- [ ] **Step 4: Build**

```bash
npm run build
```

- [ ] **Step 5: Commit**

```bash
git add components/AddSpotForm.tsx app/\(app\)/benches/new/page.tsx
git commit -m "feat: AddSpotForm with type picker (bench/viewpoint/shelter/picnic/meadow/water)"
```

---

## Task 10: New `SpotDescriptionFeed` Component

**Files:**
- Create: `components/SpotDescriptionFeed.tsx`

- [ ] **Step 1: Implement**

```tsx
'use client'

import { useEffect, useState, useTransition } from 'react'
import Link from 'next/link'
import { listDescriptions, upsertDescription, deleteDescription, type Description } from '@/actions/descriptions'

interface SpotDescriptionFeedProps {
  spotId: string
  userId: string | null
}

const MAX_LEN = 280

export default function SpotDescriptionFeed({ spotId, userId }: SpotDescriptionFeedProps) {
  const [descriptions, setDescriptions] = useState<Description[] | null>(null)
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  useEffect(() => {
    listDescriptions(spotId).then(setDescriptions)
  }, [spotId])

  const ownDescription = descriptions?.find((d) => d.user_id === userId) ?? null
  const others = descriptions?.filter((d) => d.user_id !== userId) ?? []

  const startEdit = () => {
    setDraft(ownDescription?.text ?? '')
    setEditing(true)
    setError(null)
  }

  const save = () => {
    setError(null)
    startTransition(async () => {
      const result = await upsertDescription(spotId, draft)
      if (result.error) {
        setError(result.error)
        return
      }
      const fresh = await listDescriptions(spotId)
      setDescriptions(fresh)
      setEditing(false)
      setDraft('')
    })
  }

  const remove = () => {
    if (!confirm('Tipp wirklich löschen?')) return
    startTransition(async () => {
      const result = await deleteDescription(spotId)
      if (result.error) {
        setError(result.error)
        return
      }
      const fresh = await listDescriptions(spotId)
      setDescriptions(fresh)
    })
  }

  if (descriptions === null) {
    return (
      <div className="border-t border-gray-100 dark:border-[#2a2f24] pt-4 animate-pulse">
        <div className="h-4 w-32 bg-gray-200 dark:bg-[#2a3124] rounded mb-3" />
        <div className="h-12 bg-gray-200 dark:bg-[#2a3124] rounded" />
      </div>
    )
  }

  return (
    <div className="border-t border-gray-100 dark:border-[#2a2f24] pt-4 space-y-4">
      <p className="text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide">
        Tipps von der Community
      </p>

      {/* Own slot (or login CTA if anonymous) */}
      {!userId ? (
        <p className="text-sm text-gray-500 dark:text-gray-400">
          <Link href="/login" className="text-primary font-medium hover:underline">Einloggen</Link>
          {' '}um einen Tipp zu schreiben
        </p>
      ) : editing ? (
        <div className="bg-gray-50 dark:bg-[#1a1f14] rounded-lg p-3 space-y-2">
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            maxLength={MAX_LEN}
            placeholder="Was macht diesen Spot besonders?"
            className="w-full text-sm bg-white dark:bg-[#141810] border border-gray-300 dark:border-[#2a2f24] rounded px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-primary"
            rows={3}
          />
          <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
            <span>{MAX_LEN - draft.length} Zeichen verbleibend</span>
            <div className="flex gap-2">
              <button onClick={() => setEditing(false)} className="px-3 py-1.5 text-gray-600 dark:text-gray-300">Abbrechen</button>
              <button onClick={save} disabled={isPending || draft.trim().length === 0} className="px-3 py-1.5 bg-primary text-white rounded disabled:opacity-50">
                {isPending ? 'Speichern…' : 'Speichern'}
              </button>
            </div>
          </div>
          {error && <p className="text-xs text-red-500">{error}</p>}
        </div>
      ) : ownDescription ? (
        <div className="bg-gray-50 dark:bg-[#1a1f14] rounded-lg p-3 space-y-2">
          <p className="text-xs font-semibold text-primary">💬 Dein Tipp</p>
          <p className="text-sm text-gray-800 dark:text-gray-200">{ownDescription.text}</p>
          <div className="flex gap-3 text-xs">
            <button onClick={startEdit} className="text-gray-600 dark:text-gray-300 hover:text-primary">Bearbeiten</button>
            <button onClick={remove} disabled={isPending} className="text-red-500 hover:text-red-700 disabled:opacity-50">Löschen</button>
          </div>
        </div>
      ) : (
        <button
          onClick={startEdit}
          className="w-full text-sm text-primary border border-dashed border-primary/40 rounded-lg py-3 hover:bg-primary/5 transition-colors"
        >
          + Tipp hinzufügen
        </button>
      )}

      {/* Others */}
      {others.length > 0 && (
        <ul className="space-y-3">
          {others.map((d) => (
            <li key={d.id} className="text-sm">
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">
                <strong className="text-gray-700 dark:text-gray-300">{d.username ?? 'anonym'}</strong> — {timeAgo(d.created_at)}
              </p>
              <p className="text-gray-800 dark:text-gray-200">{d.text}</p>
            </li>
          ))}
        </ul>
      )}

      {others.length === 0 && !ownDescription && userId && (
        <p className="text-sm text-gray-500 dark:text-gray-400 italic">Noch keine Tipps. Sei der Erste!</p>
      )}
    </div>
  )
}

function timeAgo(iso: string): string {
  const seconds = Math.floor((Date.now() - new Date(iso).getTime()) / 1000)
  if (seconds < 60) return 'gerade eben'
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `vor ${minutes} ${minutes === 1 ? 'Minute' : 'Minuten'}`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `vor ${hours} ${hours === 1 ? 'Stunde' : 'Stunden'}`
  const days = Math.floor(hours / 24)
  if (days < 7) return `vor ${days} ${days === 1 ? 'Tag' : 'Tagen'}`
  const weeks = Math.floor(days / 7)
  if (weeks < 5) return `vor ${weeks} ${weeks === 1 ? 'Woche' : 'Wochen'}`
  const months = Math.floor(days / 30)
  if (months < 12) return `vor ${months} ${months === 1 ? 'Monat' : 'Monaten'}`
  return `vor ${Math.floor(days / 365)} Jahren`
}
```

- [ ] **Step 2: Build**

```bash
npm run build
```

- [ ] **Step 3: Commit**

```bash
git add components/SpotDescriptionFeed.tsx
git commit -m "feat: SpotDescriptionFeed — community tips with own-slot + others list"
```

---

## Task 11: Rename `BenchDetail` → `SpotDetail` + Integrate Feed + Type Badge

**Files:**
- Move: `components/BenchDetail.tsx` → `components/SpotDetail.tsx`

- [ ] **Step 1: Git mv**

```bash
git mv components/BenchDetail.tsx components/SpotDetail.tsx
```

- [ ] **Step 2: Edit `components/SpotDetail.tsx`**

- Rename function: `BenchDetail` → `SpotDetail`
- Rename props interface: `BenchDetailProps` → `SpotDetailProps`
- Rename prop: `bench: Bench` → `spot: Spot`
- Update internal refs: `bench.id` → `spot.id`, etc.
- Update import: `getBenchStats` → `getSpotStats`
- `spotDisplayName(spot.name, spot.created_at, spot.type)` (third arg)
- Add small type badge under photo header (or near name overlay):
  ```tsx
  <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
    {SPOT_TYPE_MAP[spot.type].emoji} {SPOT_TYPE_MAP[spot.type].label}
  </p>
  ```
  Best placement: below the photo header, above the stats body.
- Add `<SpotDescriptionFeed spotId={spot.id} userId={userId} />` at the bottom (below the stats vote form section).
- Import: `import SpotDescriptionFeed from '@/components/SpotDescriptionFeed'`, `import { SPOT_TYPE_MAP } from '@/lib/spot-types'`

- [ ] **Step 3: Update BottomSheet consumer**

`components/BottomSheet.tsx`: `<BenchDetail bench={...} ...>` → `<SpotDetail spot={...} ...>`. Update import.

- [ ] **Step 4: Build + tests**

```bash
npm run build
npm test
```

- [ ] **Step 5: Commit**

```bash
git add components/SpotDetail.tsx components/BottomSheet.tsx
git commit -m "feat: SpotDetail with type badge + description feed integration"
```

---

## Task 12: BottomSheet, MapLayout, MapHeader Updates

**Files:**
- Modify: `components/BottomSheet.tsx`
- Modify: `components/MapLayout.tsx`
- Modify: `components/MapHeader.tsx`

- [ ] **Step 1: `MapHeader.tsx`**

Change:
```tsx
<span>🪑 BenchMarks</span>
```
To:
```tsx
<span>📍 Plätzchen</span>
```

- [ ] **Step 2: `BottomSheet.tsx`**

Apply:
- All remaining `Bench` type → `Spot`
- `benches` array prop → `spots`
- `selectedBenchId` keeps name OR rename to `selectedSpotId` (recommend rename for consistency).
- Per-row emoji: replace hardcoded `🪑` with `{SPOT_TYPE_MAP[spot.type].emoji}`
- `benchDisplayName` → `spotDisplayName(spot.name, spot.created_at, spot.type)`
- Empty state copy:
  - "Noch keine Bänke in der Nähe." → "Noch keine Plätzchen in der Nähe."
  - "🪑" emoji in empty state → "📍" (type-neutral)
- "Bank löschen" aria-label → "Plätzchen löschen"
- Header count: "{count} Bänke" → "{count} Plätzchen" (and "Bank" singular → "Plätzchen" singular too — same word)
- Sheet GPS hint stays
- Imports: `Spot` type from `@/components/SpotMap`, `SPOT_TYPE_MAP` from `@/lib/spot-types`, `spotDisplayName` from `@/lib/spot-utils`

- [ ] **Step 3: `MapLayout.tsx`**

- All `Bench` → `Spot`
- `benches` prop → `spots`
- `selectedBenchId` → `selectedSpotId`
- Callback names update accordingly: `handleBenchSelect` → `handleSpotSelect`, `handleBenchDeselect` → `handleSpotDeselect`, `handleFlyToBench` → `handleFlyToSpot`
- Pass `spots` and renamed callbacks to children
- The `flyTarget`, `userPosition`, `gpsState`, banner — all stay

- [ ] **Step 4: Build + tests**

```bash
npm run build
npm test
```
Expected: clean.

- [ ] **Step 5: Commit**

```bash
git add components/BottomSheet.tsx components/MapLayout.tsx components/MapHeader.tsx
git commit -m "refactor: BottomSheet/MapLayout/MapHeader rebrand to Plätzchen + per-type row emoji"
```

---

## Task 13: Routes Move — `/benches/*` → `/spots/*`

**Files:**
- Move: `app/(app)/benches/new/page.tsx` → `app/(app)/spots/new/page.tsx`
- Move: `app/(app)/benches/[id]/edit-photo/page.tsx` → `app/(app)/spots/[id]/edit-photo/page.tsx`
- Modify: `proxy.ts`

- [ ] **Step 1: Git mv directories**

```bash
mkdir -p "app/(app)/spots/[id]"
git mv "app/(app)/benches/new" "app/(app)/spots/new"
git mv "app/(app)/benches/[id]/edit-photo" "app/(app)/spots/[id]/edit-photo"
# Remove now-empty old directory
rmdir "app/(app)/benches/[id]" 2>/dev/null
rmdir "app/(app)/benches" 2>/dev/null
```

- [ ] **Step 2: Edit `app/(app)/spots/new/page.tsx`**

- Already uses `AddSpotForm` (Task 9 updated)
- Title: "Bank eintragen" → "Plätzchen eintragen"
- Update any `useSearchParams`/path code that referred to `/benches/...` → `/spots/...`

- [ ] **Step 3: Edit `app/(app)/spots/[id]/edit-photo/page.tsx`**

- `uploadBenchPhoto` → `uploadSpotPhoto`
- `benchId` variable → `spotId`
- Title: "Foto für Bank" → "Foto für Plätzchen" (or just "Foto hinzufügen")
- Redirect after save: `router.push('/')` stays the same

- [ ] **Step 4: Update `proxy.ts`**

```ts
const protectedRoutes = ['/spots']  // was ['/benches']
```

- [ ] **Step 5: Search for any `/benches/` string in code**

```bash
rg "'/benches" --type ts --type tsx
rg '"/benches' --type ts --type tsx
```
Replace each occurrence with `/spots`. Likely callsites:
- AdminClickController in SpotMap (admin-click navigates to `/benches/new` → must be `/spots/new`)
- Any link/redirect in BottomSheet, SpotPopup, profil/admin
- `actions/spots.ts` redirect path (already updated in Task 4)

- [ ] **Step 6: Build + tests**

```bash
npm run build
npm test
```

- [ ] **Step 7: Commit**

```bash
git add app proxy.ts components actions
git commit -m "refactor: move /benches/* routes to /spots/*, update proxy + all links"
```

---

## Task 14: Admin Page Rebrand

**Files:**
- Move: `app/(app)/admin/AdminBenches.tsx` → `app/(app)/admin/AdminSpots.tsx`

- [ ] **Step 1: Git mv**

```bash
git mv "app/(app)/admin/AdminBenches.tsx" "app/(app)/admin/AdminSpots.tsx"
```

- [ ] **Step 2: Edit `AdminSpots.tsx`**

- Rename component: `AdminBenches` → `AdminSpots`
- Rename type: `AdminBench` → `AdminSpot` (add `type: SpotType`)
- Update strings: "Bank löschen" → "Plätzchen löschen", "Bänke" → "Plätzchen", section heading
- Add type emoji in row: `{SPOT_TYPE_MAP[spot.type].emoji} {spot.name}`
- `adminDeleteBench` → `adminDeleteSpot` (already updated in Task 5)

- [ ] **Step 3: Edit `app/(app)/admin/page.tsx`**

- Import: `AdminBenches` → `AdminSpots`
- Variable: `benches` → `spots`
- JSX: `<AdminBenches ... />` → `<AdminSpots ... />`
- Type field included in select (already in Task 5, verify)

- [ ] **Step 4: Build + tests**

```bash
npm run build
npm test
```

- [ ] **Step 5: Commit**

```bash
git add app/\(app\)/admin
git commit -m "refactor: AdminBenches → AdminSpots, show spot type"
```

---

## Task 15: Top-Level Branding — App Title, Auth Pages

**Files:**
- Modify: `app/layout.tsx`
- Modify: `app/(auth)/login/page.tsx`
- Modify: `app/(auth)/signup/page.tsx`

- [ ] **Step 1: `app/layout.tsx`**

Update metadata:
```ts
export const metadata: Metadata = {
  title: 'Plätzchen',
  description: 'Sammle und teile schöne Pause-Spots beim Wandern',
  // …
}
```

- [ ] **Step 2: `app/(auth)/login/page.tsx`**

Logo: `<h1>🪑 BenchMarks</h1>` → `<h1>📍 Plätzchen</h1>`

- [ ] **Step 3: `app/(auth)/signup/page.tsx`**

Same change.

- [ ] **Step 4: Build**

```bash
npm run build
```

- [ ] **Step 5: Commit**

```bash
git add app/layout.tsx app/\(auth\)
git commit -m "feat: rebrand app title + auth page logos to Plätzchen"
```

---

## Task 16: Final Docs Update

**Files:**
- Modify: `AGENTS.md`
- Modify: `docs/agent-handoff.md`
- Modify: `docs/architecture.md`
- Modify: `docs/database-schema.md`
- Modify: `docs/feature-status.md`

- [ ] **Step 1: `AGENTS.md`**

- Project name reference: "BenchMarks" → "Plätzchen (formerly BenchMarks)"
- "Current state: Phase 3b complete" → "Current state: Phase 4 complete (Plätzchen rebrand done)"
- Next: Phase 5 (Personal Layer / Favorites)
- Dark mode rules unchanged
- New rule: "Use `SPOT_TYPES` from `lib/spot-types.ts` for any UI showing spot types"

- [ ] **Step 2: `docs/feature-status.md`**

Add new "Phase 4 ✅" section above current "Phase 4 — Plätzchen Rebrand 🔜" — convert that section to checked items:
- [x] Schema rename benches → spots
- [x] 6 Spot-Types
- [x] Rebrand to Plätzchen
- [x] AddSpotForm with type picker
- [x] SpotDescriptionFeed
- [x] Per-type emoji map markers

Move next-up notes for Phase 5 (Personal Layer): favorites table, list view modes, spot edit, optional search.

- [ ] **Step 3: `docs/agent-handoff.md`**

- Project intro paragraph: rebrand from BenchMarks to Plätzchen
- Update DB structure section: spots table with type column, spot_stats_votes (renamed FK), spot_descriptions (new)
- Architecture decisions: add `type` enum decision rationale (text enum, not separate tables, kept all stats fields universal)
- Update "What's next" section: Phase 5 (Personal Layer / Favorites) instead of Phase 4

- [ ] **Step 4: `docs/architecture.md`**

- Update file structure tree (component renames, route renames)
- Update data flow section (benches → spots references)
- Add SpotDescriptionFeed component
- Add SPOT_TYPES decision

- [ ] **Step 5: `docs/database-schema.md`**

- Rename benches → spots throughout
- Add `type spot_type` column docs
- Add `spot_descriptions` table section
- Update RPC reference: `get_spot_aggregated_stats(p_spot_id uuid)`
- Note storage bucket name `bench-photos` is intentionally kept (internal name)

- [ ] **Step 6: Commit**

```bash
git add AGENTS.md docs/
git commit -m "docs: update all docs for Phase 4 Plätzchen rebrand"
```

---

## Final Steps

- [ ] **Run full test suite**

```bash
npm test
```
Expected: 56-58 passing (53 baseline + spot-utils new test + descriptions test ≥ 4 cases).

- [ ] **Run full build**

```bash
npm run build
```
Expected: clean, all routes show `/spots/*`.

- [ ] **Manual QA list (handed to user)**

1. **Eintragen pro Type** — alle 6 Typen einmal anlegen, Map zeigt richtigen Emoji-Marker.
2. **Type im Detail** — Spot anwählen, Detail zeigt korrekten Type unter Foto-Header.
3. **Description posten** — Eingeloggt: Tipp schreiben → Liste zeigt eigenen Tipp prominent. Bearbeiten → ändert sich. Löschen → weg.
4. **Description-Limit** — Versuch >280 Zeichen → Fehler.
5. **Anonyme View** — Ausloggen, Spot öffnen → Login-CTA statt Editor sichtbar.
6. **Routen** — Browser-URL `/benches/new` → 404 (oder generic Next-Fehler). `/spots/new` → Form lädt.
7. **Cluster** — Karte mit gemischten Types: Cluster-Marker zeigt Mix.
8. **Old data** — bestehende Bänke aus Phase ≤3b zeigen weiter als Bank (type='bench' default).
9. **Auth-Pages** — Login/Signup zeigen "📍 Plätzchen".
10. **Admin** — Admin-Page zeigt Spot-Typen.

- [ ] **Branch finishing** (use superpowers:finishing-a-development-branch skill)

Present 4 options to user (merge / PR / keep / discard).

---

## Anti-Patterns to Avoid

- **Don't** keep `Bench` type alias for backwards-compat. Hard cutover, full rebrand.
- **Don't** try to add description upvotes — explicitly out of scope.
- **Don't** rename storage bucket — Supabase doesn't support clean bucket-rename, internal name is fine.
- **Don't** ALTER TABLE separately for stats votes; bundle into Migration 006 to keep schema consistent.
- **Don't** add lucide-react / icon library — explicit user decision: emojis until vector icons designed.
- **Don't** introduce new test framework dependencies. jsdom is already there from Phase 3b.
