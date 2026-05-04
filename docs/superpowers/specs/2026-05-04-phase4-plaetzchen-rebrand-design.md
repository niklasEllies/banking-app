# Phase 4 — Plätzchen Rebrand & Spot-Generalisierung Design Spec

**Date:** 2026-05-04
**Status:** Approved
**Goal:** Generalize the app from "BenchMarks" (just benches) to "Plätzchen" (nice pause-spots while hiking) with 6 spot types, full code rebrand, schema rename, and a new community description feed.

## Vision

Plätzchen is for slow walkers who collect moments outdoors — a bench at sunset, a quiet picnic spot, a stream to dip your feet. The app's anchor remains "place to pause" — not tourist attractions, not commercial venues. Six curated types cover the hiking-pause use case without diluting identity.

## Architecture / Approach

This phase has three coordinated layers, executed in dependency order:

1. **Schema layer** — Atomic table renames + new columns/tables via SQL migrations. Bestandsdaten get `type='bench'` automatically.
2. **Code layer** — Full rename of TypeScript types (Bench → Spot), components, server actions, routes, and utilities. Hard cutover: no legacy aliases.
3. **UI layer** — Rebrand strings ("BenchMarks" → "Plätzchen"), per-type emojis on map and in forms, new description feed in spot detail.

Storage bucket `bench-photos` keeps its internal name (Supabase doesn't support bucket rename without data migration; the name is internal-only).

Routes are hard-cut (`/benches/*` → 404; new code uses `/spots/*`). Beta phase, no bookmarks to preserve.

## Spot Types

Six types, emoji-coded for map markers and type picker:

| Type key | Emoji | German label | Use |
|---|---|---|---|
| `bench` | 🪑 | Bank | Sitting spot, the original anchor |
| `viewpoint` | 🏔️ | Aussichtspunkt | Vista, panoramic view |
| `shelter` | ⛺ | Schutzhütte | Rain-protected hut, lean-to |
| `picnic` | 🧺 | Rastplatz | Picnic table, organized rest area |
| `meadow` | 🌿 | Liegewiese | Lay-down spot, sunny lawn |
| `water` | 💧 | Wasserstelle | Stream, fountain, swimming hole |

Stats remain the same six fields (comfort, view_rating, condition, rarity, shadow, extras). All optional. Type-aware visibility deferred (Phase 7+).

## Schema Changes

### Migration 006: rename `benches` → `spots`, add `type` column

```sql
-- Rename main table (preserves all FKs, indexes, RLS policies, storage refs)
ALTER TABLE benches RENAME TO spots;

-- Add type enum
CREATE TYPE spot_type AS ENUM ('bench', 'viewpoint', 'shelter', 'picnic', 'meadow', 'water');
ALTER TABLE spots ADD COLUMN type spot_type NOT NULL DEFAULT 'bench';

-- Rename votes table + FK column
ALTER TABLE bench_stats_votes RENAME TO spot_stats_votes;
ALTER TABLE spot_stats_votes RENAME COLUMN bench_id TO spot_id;

-- Drop old aggregation function and recreate with new arg name
DROP FUNCTION IF EXISTS get_bench_aggregated_stats(uuid);
CREATE FUNCTION get_spot_aggregated_stats(p_spot_id uuid)
RETURNS TABLE (...) -- same body, just s/bench_id/spot_id/g

-- RLS policy names will keep referring to bench_stats_votes by table-id;
-- policy names themselves get a non-functional rename for clarity.
```

### Migration 007: `spot_descriptions` table

```sql
CREATE TABLE spot_descriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  spot_id uuid NOT NULL REFERENCES spots(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  text text NOT NULL CHECK (char_length(text) <= 280),
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

-- Trigger to update updated_at on UPDATE
CREATE OR REPLACE FUNCTION set_updated_at() RETURNS trigger AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_spot_descriptions_updated_at
BEFORE UPDATE ON spot_descriptions
FOR EACH ROW EXECUTE FUNCTION set_updated_at();
```

## Code Rename Map

### Types
- `Bench` interface → `Spot` interface (+ `type: SpotType` field)
- New `SpotType` union: `'bench' | 'viewpoint' | 'shelter' | 'picnic' | 'meadow' | 'water'`

### Components (rename file + symbol)
- `BenchMap.tsx` → `SpotMap.tsx` (+ `Bench` type imports → `Spot`)
- `BenchMapClient.tsx` → `SpotMapClient.tsx`
- `BenchPopup.tsx` → `SpotPopup.tsx`
- `BenchDetail.tsx` → `SpotDetail.tsx` (+ embed `SpotDescriptionFeed`)
- `AddBenchForm.tsx` → `AddSpotForm.tsx` (+ type picker)

### NEW Components
- `SpotDescriptionFeed.tsx` — community description feed in SpotDetail
- `SpotTypePicker.tsx` — extracted type-picker for AddSpotForm (radiogroup of 6 emoji buttons)

### Server Actions
- `actions/benches.ts` → `actions/spots.ts`
  - `createBench` → `createSpot` (accepts `type` field)
  - `deleteBench` → `deleteSpot`
  - `uploadBenchPhoto` → `uploadSpotPhoto`
- `actions/admin.ts` — `adminDeleteBench` → `adminDeleteSpot`
- `actions/stats.ts` — `getBenchStats` → `getSpotStats` (uses new RPC name)
- `actions/descriptions.ts` — **NEW**: `listDescriptions(spotId)`, `upsertDescription(spotId, text)`, `deleteDescription(spotId)`

### Utilities
- `lib/bench-utils.ts` → `lib/spot-utils.ts`
  - `benchDisplayName` → `spotDisplayName`
  - (`distanceTo` keeps its name — already generic)
- `lib/stats-utils.ts` — unchanged (file name + functions stay; content already type-agnostic)
- New: `lib/spot-types.ts` — `SPOT_TYPES` array of `{ key: SpotType, emoji, label }` constants

### Routes
- `app/(app)/benches/new/page.tsx` → `app/(app)/spots/new/page.tsx`
- `app/(app)/benches/[id]/edit-photo/page.tsx` → `app/(app)/spots/[id]/edit-photo/page.tsx`
- `proxy.ts` — `protectedRoutes = ['/spots']` (was `['/benches']`)

### Tests
- `__tests__/actions/benches.test.ts` → `__tests__/actions/spots.test.ts`
- `__tests__/lib/bench-utils.test.ts` → `__tests__/lib/spot-utils.test.ts`
- All test code adjusted to new symbols

### Storage paths (keep bucket name, paths use spotId variable name)
- `bench-photos/{spotId}/photo` — same Supabase bucket, internal naming aligned

## UI Rebrand

### App Header (`MapHeader.tsx`)
- Was: `🪑 BenchMarks`
- Becomes: `📍 Plätzchen`

### App Title (`app/layout.tsx` / `<title>`)
- "BenchMarks" → "Plätzchen"
- Meta description updated.

### Auth Pages
- Login/Signup logos: `🪑 BenchMarks` → `📍 Plätzchen`

### Empty State (`BottomSheet.tsx`)
- Was: "Noch keine Bänke in der Nähe."
- Becomes: "Noch keine Plätzchen in der Nähe."
- Emoji in empty state: stays `🪑` (since users add benches by default; arguably could become `📍` for type-neutrality — pick `📍` for consistency).

### List Row (`BottomSheet.tsx`)
- Was: `<span>🪑</span> {benchDisplayName(bench.name, bench.created_at)}`
- Becomes: `<span>{SPOT_TYPES[spot.type].emoji}</span> {spotDisplayName(spot.name, spot.created_at)}`

### Map Markers (`SpotMap.tsx`)
- Currently: marker uses leaflet default OR custom DivIcon with 🪑.
- New: per-type DivIcon emoji from `SPOT_TYPES[spot.type].emoji`.

### Spot Popup (`SpotPopup.tsx`)
- Show type label below name: `{SPOT_TYPES[spot.type].label}`

### Spot Detail Header
- Photo header same layout. Below header (or next to name overlay), show small type badge: `🌿 Liegewiese`.

## AddSpotForm

New component layout:

```
┌─────────────────────────────────────┐
│ Position: 50.123, 8.456              │
│ [📍 Meinen Standort verwenden]       │
├─────────────────────────────────────┤
│ Was ist hier?                       │
│  🪑   🏔️   ⛺   🧺   🌿   💧         │
│ Bank Aussicht Hütte Rast Wiese Wasser│
├─────────────────────────────────────┤
│ Name (optional): [_________]        │
│ Foto (optional): [Datei]            │
│                                     │
│  [Abbrechen]  [Plätzchen eintragen] │
└─────────────────────────────────────┘
```

Type picker is a `<div role="radiogroup">` of 6 buttons. Default selection: `bench` (matches current implicit behavior). Required (always one selected). Submit button copy: "Plätzchen eintragen".

## SpotDescriptionFeed

New component, rendered at the bottom of `SpotDetail`.

### Layout

```
┌─ Tipps von der Community ─────────────┐
│                                       │
│ 💬 Dein Tipp                          │
│ ┌─ [textarea, max 280] ─────────────┐ │
│ │ Sonnenuntergang ab 20:30 super…   │ │
│ └───────────────────────────────────┘ │
│  142 Zeichen verbleibend              │
│  [Speichern]  [Löschen]               │
│                                       │
│ ─────────────────────────────────────  │
│                                       │
│ niklas — vor 2 Tagen                  │
│ "Bank versteckt hinter Eiche"         │
│                                       │
│ anna — vor 1 Woche                    │
│ "Kommt nach langem Aufstieg ideal."   │
│                                       │
└───────────────────────────────────────┘
```

### Rules

- Anonymous users: see tips, can't post (call-to-action: "Login um einen Tipp zu schreiben").
- Logged-in users without own tip yet: see "+ Tipp hinzufügen" button → expands to inline editor.
- Logged-in users with own tip: editor pre-filled at top with Save/Delete.
- Other users' tips listed below, sorted by `created_at DESC`.
- Username from `profiles.username`. Fallback to email if username null.
- Time ago: "vor 2 Stunden", "vor 3 Tagen". Simple German formatter, no library.
- Empty state (no tips at all): "Noch keine Tipps. Sei der Erste!" — only shown to logged-in users.

### Data

- `listDescriptions(spotId)` server action returns `{ id, user_id, username, text, created_at, updated_at }[]`.
- `upsertDescription(spotId, text)` — INSERT or UPDATE on (spot_id, user_id) UNIQUE.
- `deleteDescription(spotId)` — DELETE WHERE spot_id AND user_id=auth.uid().

## Files Touched (preview)

### New
- `supabase/migrations/006_phase4_rename_to_spots.sql`
- `supabase/migrations/007_phase4_descriptions.sql`
- `lib/spot-types.ts`
- `actions/descriptions.ts`
- `components/SpotTypePicker.tsx`
- `components/SpotDescriptionFeed.tsx`

### Renamed (file move + content edit)
- `actions/benches.ts` → `actions/spots.ts`
- `lib/bench-utils.ts` → `lib/spot-utils.ts`
- `components/BenchMap.tsx` → `components/SpotMap.tsx`
- `components/BenchMapClient.tsx` → `components/SpotMapClient.tsx`
- `components/BenchPopup.tsx` → `components/SpotPopup.tsx`
- `components/BenchDetail.tsx` → `components/SpotDetail.tsx`
- `components/AddBenchForm.tsx` → `components/AddSpotForm.tsx`
- `app/(app)/benches/new/page.tsx` → `app/(app)/spots/new/page.tsx`
- `app/(app)/benches/[id]/edit-photo/page.tsx` → `app/(app)/spots/[id]/edit-photo/page.tsx`
- `__tests__/actions/benches.test.ts` → `__tests__/actions/spots.test.ts`
- `__tests__/lib/bench-utils.test.ts` → `__tests__/lib/spot-utils.test.ts`

### Modified
- `actions/admin.ts` (adminDeleteBench → adminDeleteSpot)
- `actions/stats.ts` (RPC name + types)
- `app/(app)/page.tsx` (Bench → Spot, query benches→spots)
- `app/(app)/admin/page.tsx`
- `app/(app)/profil/page.tsx` (only if it references benches)
- `app/(app)/admin/AdminBenches.tsx` → likely rename to `AdminSpots.tsx`
- `app/layout.tsx` (title/meta)
- `app/(auth)/login/page.tsx`, `app/(auth)/signup/page.tsx` (logo strings)
- `components/MapHeader.tsx` (📍 Plätzchen)
- `components/MapLayout.tsx` (Bench imports → Spot)
- `components/BottomSheet.tsx` (uses Spot type, type-emoji per row, new strings)
- `proxy.ts` (`/spots` protection)
- `AGENTS.md`, `docs/agent-handoff.md`, `docs/architecture.md`, `docs/database-schema.md`, `docs/feature-status.md`

## Out of Scope (deferred)

| Item | Phase |
|---|---|
| Vector icons (replacing emojis) | Future (user designs) |
| Description upvote system | 5 or 6 |
| Type-aware stats visibility | 7+ |
| Spot edit (name, type) | 5 |
| Search / filter by type | 5 |
| Friends / privacy filters | 6 |

## Testing

- **Unit:** existing 53 tests must stay green throughout. Renamed test files keep coverage. New `__tests__/actions/descriptions.test.ts` for the new server action (basic happy path).
- **Manual:** end-to-end smoke test after merge — create one of each spot type, add description, verify map markers show right emojis, verify type label in popup/detail.
- **Migration safety:** before applying 006, take Supabase backup (or rely on Supabase point-in-time recovery on Pro tier). Verify count: `SELECT COUNT(*) FROM benches;` before, `SELECT COUNT(*) FROM spots;` after. Verify all rows got `type='bench'`.

## Implementation Strategy

This is a wide rebrand. Order of execution matters:

1. **DB migrations first** (006 + 007) — ground truth.
2. **Types + utility files** — `lib/spot-types.ts`, `Spot` interface.
3. **Server actions** — rename + update queries.
4. **Tests for server actions** — keep coverage during rename.
5. **Components** (in dependency order: SpotMap → SpotPopup → AddSpotForm → SpotDetail with feed → BottomSheet/MapLayout updates).
6. **Routes** (file moves) + proxy.ts update.
7. **UI strings rebrand** (final pass: Plätzchen branding everywhere).
8. **Map markers per type** (uses SpotMap + spot-types.ts already in place).
9. **SpotDescriptionFeed** — new component plus integration.
10. **Docs update** — AGENTS.md, architecture, database-schema, feature-status, handoff.

Each step keeps tests green. Estimated 18-22 commits total.
