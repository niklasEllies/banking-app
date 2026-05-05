# Phase 5 — Personal Layer Design Spec

**Date:** 2026-05-05
**Status:** Approved
**Goal:** Make the app feel personal — favorites, view-mode filtering (Alle / Eigene / Favoriten), spot editing, and distance-based sorting.

## Vision

After Phase 4 the app handles spot variety; Phase 5 makes it _yours_. You can mark spots you love, browse just yours, edit a wrong type, and the list always opens with "what's nearest" — the wander-use-case wants what's actually walkable.

## Architecture / Approach

Three coordinated additions, executed in dependency order:

1. **Favorites infrastructure** — new `favorites` table (user-private), three server actions, fetch favorite spot-ids server-side and pass down to UI.
2. **View-mode tabs in BottomSheet** — three-tab switcher (Alle / Eigene / Favoriten) with localStorage persistence and login-CTAs for anonymous users.
3. **Action menu + Spot Edit** — dropdown menu in sheet header (`✏️` becomes the owner action menu), new `/spots/[id]/edit` route for name+type editing.

Sorting changes globally: when GPS is `'available'` the list sorts by distance ASC; otherwise by `created_at` DESC. Applies inside every view-mode tab.

Search/filter explicitly deferred to a later phase (current Spot count is small; YAGNI).

## Schema Changes

### Migration 008 — `favorites` table

```sql
CREATE TABLE public.favorites (
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  spot_id uuid NOT NULL REFERENCES public.spots(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, spot_id)
);

CREATE INDEX idx_favorites_user_id ON public.favorites(user_id, created_at DESC);

ALTER TABLE public.favorites ENABLE ROW LEVEL SECURITY;

-- Favorites are private to the user (foundation for future friend-visibility)
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

**Privacy note:** kept private — Phase 6 (Friends) can later relax SELECT to `auth.uid() = user_id OR EXISTS friendship`.

## Server Actions

### New: `actions/favorites.ts`

```ts
listFavoriteSpotIds(): Promise<string[]>      // returns spot_ids favorited by auth.uid()
addFavorite(spotId): Promise<{ error?: string }>
removeFavorite(spotId): Promise<{ error?: string }>
```

All require auth. `add` is UPSERT-safe (idempotent — second add doesn't error). All call `revalidatePath('/')`.

### Extension: `actions/spots.ts`

Add new function:
```ts
updateSpot(spotId: string, fields: { name: string | null; type: SpotType }): Promise<{ error?: string }>
```

Verifies ownership (`auth.uid() === created_by`), validates `type` against `VALID_TYPES`, runs UPDATE, revalidates `/`.

## BottomSheet — Tabs & Sorting

### Tab UI (only in list mode, not detail mode)

Three tabs at the top of the content area, below the existing drag-handle/header row:

```
┌─────────────────────────────────────┐
│ ▬ (drag handle)                     │
│ {N} Plätzchen          ✏️  ✕        │ ← header row (existing)
├─────────────────────────────────────┤
│  Alle  │ Eigene │ Favoriten         │ ← NEW tab row
├─────────────────────────────────────┤
│ 🪑 Bank am Teich         ~120 m  🗑 │ ← list (filtered + sorted)
│ 🏔️ Aussichtspunkt …      0.4 km     │
│ ...                                 │
└─────────────────────────────────────┘
```

Tab styling: active tab has `text-primary border-b-2 border-primary`, inactive `text-gray-500 border-b-2 border-transparent`. Equal width via `flex-1`.

### Filter logic per tab

- **Alle:** all spots (current behaviour)
- **Eigene:** `spots.filter(s => s.created_by === userId)`. Anonymous user clicking it shows a login-CTA placeholder instead of a list.
- **Favoriten:** `spots.filter(s => favoriteIds.has(s.id))`. Anonymous → login-CTA. Logged-in but empty favorites → "Noch keine Favoriten — markiere einen Spot mit ❤️ um ihn zu speichern."

### Sorting (applies inside each tab)

```ts
const sorted = userPosition && gpsState === 'available'
  ? [...filtered].sort((a, b) => distMeters(userPosition, a) - distMeters(userPosition, b))
  : [...filtered].sort((a, b) => b.created_at.localeCompare(a.created_at))
```

A small helper `distMeters(from, to): number` (raw Haversine, no formatting) is added to `lib/spot-utils.ts` alongside the existing `distanceTo` formatter.

### View-mode persistence

`localStorage` key: `plaetzchen-view-mode` with values `'all' | 'mine' | 'favorites'`. Read on mount (after hydration to avoid SSR mismatch). Default: `'all'`.

### Login-CTAs (Eigene / Favoriten when anonymous)

```tsx
<div className="py-12 px-6 text-center">
  <p className="text-base text-gray-700 dark:text-gray-300 mb-2">Logge dich ein, um deine eigenen Plätzchen zu sehen.</p>
  <Link href="/login" className="text-primary font-medium hover:underline">Login</Link>
</div>
```

## Favorite Toggle in SpotDetail

### Position

In the sheet header action area: `[❤️] [✏️] [✕]`. The ❤️ button appears for any logged-in user (not just owner). For anonymous users the heart hides entirely.

### Visual

- Not favorited: `🤍` (white heart)
- Favorited: `❤️` (red heart)
- Hover/active feedback identical to other header icons.
- aria-label: dynamic — "Als Favorit markieren" / "Favorit entfernen".

### State flow

`SpotDetail` receives `isFavorite: boolean` prop from `BottomSheet` (which has the full `favoriteIds: Set<string>`). The toggle is optimistic:
1. Local state flips immediately.
2. `addFavorite`/`removeFavorite` runs in `useTransition`.
3. On error: revert local state and show inline error toast.
4. On success: parent gets `onFavoriteChange(spotId, isFav)` callback to update `favoriteIds` Set.

`favoriteIds` lives in `MapLayout` (alongside `userPosition`, `gpsState`). Initial value comes from server-side fetch in `app/(app)/page.tsx`.

## Spot Edit

### Route: `app/(app)/spots/[id]/edit/page.tsx`

Server Component that:
- Verifies user is logged in
- Fetches the spot (`from('spots').select(...).eq('id', id).maybeSingle()`)
- Verifies `spot.created_by === user.id` (else redirect `/`)
- Renders `<SpotEditForm spot={spot} />`

### Component: `components/SpotEditForm.tsx`

Client Component with:
- Hidden `id` field
- Name input (text, optional)
- `SpotTypePicker` (existing component, current value pre-selected)
- Submit button "Änderungen speichern"
- Cancel button → router.back()

Calls `updateSpot(spotId, { name, type })`. On success → `router.push('/')`. On error → inline error.

`spotId` comes from React `use(params)` since this is Next.js 16 async params.

## Action Menu in Sheet Header

### Current state

Sheet header (detail mode) has: `[✏️ Foto] [✕]`. Owner only sees `✏️`.

### Phase 5 evolution

- For all logged-in users: heart `[❤️]` first.
- For owner: `✏️` becomes a dropdown trigger (not a Link). Click opens menu with two options:
  - 📷 Foto bearbeiten → `Link href="/spots/[id]/edit-photo"`
  - 📝 Spot bearbeiten → `Link href="/spots/[id]/edit"`

For non-owners: no `✏️`. Only heart + close.

### New component: `components/SpotActionMenu.tsx`

Dropdown rendered as absolute-positioned panel below the trigger button. Closes on:
- outside click (mousedown listener)
- Escape key
- option click

Tailwind: `absolute right-0 top-full mt-1 bg-white dark:bg-[#1e231a] border border-gray-200 dark:border-[#2a2f24] rounded-lg shadow-lg z-[1100] min-w-44 py-1`.

A11y: `role="menu"`, options `role="menuitem"`. Trigger button has `aria-haspopup="menu"` and `aria-expanded={open}`.

## Files Touched (preview)

### New
- `supabase/migrations/008_phase5_favorites.sql`
- `actions/favorites.ts`
- `__tests__/actions/favorites.test.ts`
- `components/SpotActionMenu.tsx`
- `components/SpotEditForm.tsx`
- `app/(app)/spots/[id]/edit/page.tsx`

### Modified
- `actions/spots.ts` (add `updateSpot`)
- `__tests__/actions/spots.test.ts` (test for `updateSpot`)
- `lib/spot-utils.ts` (add `distMeters` raw distance helper)
- `__tests__/lib/spot-utils.test.ts` (test distMeters)
- `app/(app)/page.tsx` (server-side fetch favorite ids, pass to MapLayout)
- `components/MapLayout.tsx` (`favoriteIds` state + setter, pass to BottomSheet/SpotDetail)
- `components/BottomSheet.tsx` (view tabs, sorting, favorite filter, login-CTAs)
- `components/SpotDetail.tsx` (heart toggle, integrate ActionMenu, replace Link with menu)
- `docs/feature-status.md`, `docs/agent-handoff.md`, `docs/architecture.md`, `docs/database-schema.md`, `AGENTS.md`

## Out of Scope (deferred)

| Item | Phase |
|---|---|
| Search / Type-pill filters | 7 (when bestand grows) |
| Public/friend-visible favorites | 6 |
| Description upvotes | 6+ |
| Spot edit incl. position (lat/lng) | 7+ (UX-tricky) |
| Type-aware stats visibility | 7+ |
| Reordering favorites manually | (probably never) |

## Testing

- **Unit (vitest):**
  - `actions/favorites.ts` — list/add/remove (auth check, idempotency, error path)
  - `actions/spots.ts updateSpot` — ownership validation, type validation
  - `lib/spot-utils.ts distMeters` — raw distance math
- **Existing 64 tests stay green** through every commit.
- **Manual:**
  1. Toggle favorite in detail view → reflects in Favoriten tab
  2. Anonym → Eigene/Favoriten Tab zeigt Login-CTA
  3. GPS verfügbar → Liste sortiert nach Distanz; deaktiviert → nach Datum
  4. Edit-Page als Owner → Speichert, redirect; als Non-Owner → 404/redirect
  5. Action-Menu öffnet/schließt korrekt (outside click, Escape)
  6. View-Mode persistiert über Reload
  7. Migration 008 in Supabase ausgerollt (RLS testen: `auth.uid()` Constraint)

## Implementation Strategy

Order:
1. Migration 008 (DB ground truth)
2. `lib/spot-utils.ts` — add `distMeters` (used by sorting)
3. `actions/favorites.ts` + tests (TDD)
4. `actions/spots.ts updateSpot` + tests
5. Server-side fetch in `app/(app)/page.tsx` + propagate `favoriteIds` through MapLayout
6. `SpotActionMenu` (standalone, used in next step)
7. `SpotDetail` integration: heart toggle + action menu (owner)
8. `SpotEditForm` + edit route
9. `BottomSheet`: tabs, view-mode state, sort, login-CTAs
10. Docs catch-up

Estimated 11-13 commits.
