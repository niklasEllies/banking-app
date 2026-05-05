# Phase 7 — Polish & Tech-Debt Design Spec

**Date:** 2026-05-05
**Status:** Approved
**Goal:** Beta-readiness pass — deep-link spots, friend-filter tab, focus-trap, contrast nudges, env validation, kill an N+1 query.

## Vision

Phase 7 doesn't add big features. It tightens what's there: shareable links so beta testers can send each other spots, a fourth tab to round out the personal-layer story (Phase 6's friends becomes truly first-class in the list), accessibility and contrast fixes that came up in Phase 3b's review but were deferred, and a tech-debt sweep.

Out of scope (deferred to a later phase): SpotMap-Refactor, PWA install, Vector Icons, Block-Mechanik. Each is big enough to warrant its own pass.

## Architecture / Approach

Six independent items, no shared dependencies between most of them. Implementation order optimizes for learning fast (smallest first):

1. Service-Role-Key warning (smallest, ~10 LOC)
2. Contrast tweaks (CSS class changes)
3. N+1 in admin page (server query refactor)
4. `inert` attribute focus-trap on background
5. Friend-Spot-Filter — 4th tab in BottomSheet
6. Deep-Links via `/?spot=<id>` query param

Each is its own commit. No need for migrations.

## 1. Service-Role-Key Build-time Warning

### Why

`SUPABASE_SERVICE_ROLE_KEY` is needed for `auth.admin.listUsers()` in the admin page. Currently a runtime check (`if (process.env.SUPABASE_SERVICE_ROLE_KEY)`) silently degrades — admin users see "—" in the email column without knowing why.

### Approach

Add a `console.warn` at module-load time in `lib/supabase/admin.ts` if the env var is unset AND `process.env.NODE_ENV === 'production'`. No throw, no break — just a visible warning in production logs.

```ts
if (process.env.NODE_ENV === 'production' && !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.warn('[plaetzchen] SUPABASE_SERVICE_ROLE_KEY is not set — admin user emails will be missing.')
}
```

Place at top of `lib/supabase/admin.ts` outside any function so it runs at module init.

### Out of scope
- Strict throw / deploy-failure
- Validation of other env vars (NEXT_PUBLIC_SUPABASE_URL etc.) — those are checked already by Supabase clients.

## 2. Contrast Tweaks

### Drag-Handle

Currently: `bg-gray-300 dark:bg-gray-600` in `BottomSheet.tsx`.
New: `bg-gray-400 dark:bg-gray-500`.

Rationale: small UI element on light/dark surface; current 300/600 is below WCAG AA UI-component contrast ratio of 3:1 against typical surface colors.

### Disabled buttons

Currently: `disabled:opacity-50` is sprinkled across multiple components.
New: `disabled:opacity-60`.

Files affected (from grepping `disabled:opacity-50`):
- `components/StatsVoteForm.tsx`
- `components/AddSpotForm.tsx`
- `components/SpotEditForm.tsx`
- `components/FavoriteToggle.tsx`
- `components/SpotDescriptionFeed.tsx`
- `components/FriendsClient.tsx`
- `app/(auth)/login/page.tsx`
- `app/(auth)/signup/page.tsx`
- `app/(app)/spots/[id]/edit-photo/page.tsx`
- `app/(app)/admin/AdminUsers.tsx`
- `app/(app)/admin/AdminSpots.tsx`

Approach: search-and-replace, single commit.

### Out of scope
- Restructuring colors/contrast at the theme level
- Keyboard focus indicators (those are fine in Phase 3b)

## 3. N+1 in admin/page.tsx

### Current

```ts
const users: AdminUser[] = (profiles ?? []).map((p) => ({
  ...p,
  email: emailMap[p.id] ?? null,
  spot_count: (spots ?? []).filter((s) => s.created_by === p.id).length,
}))
```

For each profile, scans the entire spots array. O(P × S) — quadratic.

### New

Add a parallel SQL aggregation:
```ts
const { data: countRows } = await supabase
  .from('spots')
  .select('created_by')
  // We don't actually need an aggregation function — let the client-side reduce
  // it once. The point is to fetch only created_by, not full spot rows, and
  // build a Map once instead of filtering N times.
```

Wait — we already have the spots fetched (for the AdminSpots component). Don't double-fetch. Instead, build the count map once:

```ts
const spotCountByUser = new Map<string, number>()
for (const s of spots) {
  if (s.created_by) {
    spotCountByUser.set(s.created_by, (spotCountByUser.get(s.created_by) ?? 0) + 1)
  }
}

const users: AdminUser[] = (profiles ?? []).map((p) => ({
  ...p,
  email: emailMap[p.id] ?? null,
  spot_count: spotCountByUser.get(p.id) ?? 0,
}))
```

O(P + S) instead of O(P × S). Same data, no new query.

### Out of scope
- Pagination of admin list (different problem)
- Caching across requests

## 4. Focus-Trap on Background via `inert`

### Why

When the BottomSheet is expanded, keyboard users can Tab past the sheet onto the FAB and map controls behind it. Per WCAG 2.1.2 (No Keyboard Trap inverse) modal-like dialogs should contain focus.

### Approach

Use HTML5 `inert` attribute. Modern browser support is universal (Safari 15.5+, Firefox 112+, Chrome 102+). When the sheet is expanded, mark the map container as `inert` — its descendants are removed from the focus order and pointer events.

### Implementation

In `app/(app)/page.tsx` or `MapLayout.tsx`, the SpotMapClient is the "background". Pass an `inert` boolean:

Option 1 — at MapLayout level:

```tsx
// MapLayout.tsx
<div {...(sheetExpanded && selectedSpotId ? { inert: '' } : {})}>
  <SpotMapClient ... />
</div>
```

But TS may complain — `inert` on JSX needs `inert={true}` (boolean attribute).

Cleaner: wrap SpotMapClient in a div with conditional `inert`. Sheet expanded ALONE isn't enough — the user opens the sheet to interact with it. Only when sheet is in detail-mode (`selectedSpotId !== null`) do we want focus-containment, OR even when the sheet is just expanded — both feel correct, since list-mode is interactive too.

**Decision:** apply `inert` whenever `sheetExpanded === true`. That's when the sheet is interactive content covering map.

Add `role="dialog"` and `aria-modal="true"` on the BottomSheet's expanded panel for SR semantics.

### Out of scope
- Custom focus-trap implementation (cycling Tab/Shift+Tab on first/last)
- Restoring focus to the FAB on close (browser does well enough by default)

## 5. Friend-Spot-Filter — 4th BottomSheet Tab

### Why

Phase 6 added friends but you still see a friend's `public` spots mixed with everyone else's. A "Freunde"-tab makes the friends layer feel concrete: "what have my friends been up to?"

### Definition

"Freunde" tab shows spots where `created_by` is in your accepted-friends list. RLS already governs visibility — this filter is purely client-side narrowing.

### Implementation

#### Server fetch

In `app/(app)/page.tsx`, fetch friend IDs alongside favorites:

```ts
import { listFriends } from '@/actions/friends'

if (user) {
  const [profileResult, favIds, friends] = await Promise.all([
    supabase.from('profiles')...,
    listFriendSpotIds(),
    listFriends(),
  ])
  friendIds = friends.map(f => f.id)
}
```

Pass `initialFriendIds={friendIds}` to MapLayout.

#### MapLayout

Mirror the favoriteIds Set pattern: hold `friendIds: Set<string>` as state. No mutations needed (friends rarely change during a session — refresh on `/friends` mutations propagates via revalidatePath('/')).

#### BottomSheet

Extend `ViewMode = 'all' | 'mine' | 'friends' | 'favorites'`. Tab order: Alle / Eigene / Freunde / Favoriten.

Filter logic:
```ts
const filtered = spots.filter((s) => {
  if (viewMode === 'all') return true
  if (viewMode === 'mine') return s.created_by === userId
  if (viewMode === 'friends') return s.created_by !== null && friendIds.has(s.created_by)
  return favoriteIds.has(s.id)  // 'favorites'
})
```

Tab labels: 4 tabs → 360px / 4 = 90px each. Still readable. If text gets cramped, consider abbreviating "Favoriten" → "❤️" (icon-only) — but try labels first.

Empty states per tab:
- `viewMode === 'friends'` (logged-in, no friends OR no friend-spots in view): "Keine Plätzchen von Freunden in der Nähe — füge Freunde im [Profil-Tab] hinzu."
- Anonymous on `friends`: same login-CTA pattern as `mine` and `favorites`.

#### localStorage persistence

`plaetzchen-view-mode` already supports the new value `'friends'`. No migration needed — values that don't match the new union just fall back to default 'all'.

### Out of scope
- Friend-only spot creation toggle in AddSpotForm (different feature — Phase 8?)
- "Find spots near my friends" (location-based; later)

## 6. Deep-Links via `/?spot=<id>` Query Param

### Why

Beta testers want to text each other spots: "schau mal hier" + URL.

### URL Format

`https://plaetzchen.com/?spot=abc123-uuid`

When the home page loads with this query param:
1. Server loads spot data normally (RLS filters as usual — if invisible, the spot just won't be in the list)
2. `MapLayout` receives `initialSpotId` prop
3. On mount: if `initialSpotId` is in the visible spots list, set `selectedSpotId` to it AND `flyTarget` to its coords
4. If not in list (private/friends-only and you're not allowed): no harm, no foul — you see the empty map

When the user closes the sheet: clear the query param via `router.replace('/', { scroll: false })`. (Don't push — clutters history.)

### UI: Share Button

Add a small "Teilen"-action in the SpotActionMenu (which today has Foto-bearbeiten / Spot-bearbeiten). For owners only.

Actually: sharing should be available to ANYONE who can see the spot, not just the owner. Better placement:

**Decision:** Add a `📤 Teilen`-button to the sheet header alongside the Heart and ✏️-Menu — visible to anyone (logged-in or not). When clicked: copy `https://${origin}/?spot=${spot.id}` to clipboard via `navigator.clipboard.writeText`, show a toast "Link kopiert".

Layout in sheet header: `[📤] [❤️] [✏️] [✕]` (only ❤️/✏️ are conditional).

### Implementation

#### `app/(app)/page.tsx`

```ts
export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ spot?: string }>
}) {
  const { spot: initialSpotId } = await searchParams
  // ... existing code
  return (
    // ...
    <MapLayout
      // ...existing props...
      initialSpotId={initialSpotId ?? null}
    />
  )
}
```

#### `MapLayout.tsx`

```ts
const [selectedSpotId, setSelectedSpotId] = useState<string | null>(initialSpotId ?? null)
const router = useRouter()

useEffect(() => {
  if (initialSpotId && !flyTarget) {
    const spot = spots.find(s => s.id === initialSpotId)
    if (spot) setFlyTarget({ lat: spot.lat, lng: spot.lng })
  }
}, [initialSpotId, flyTarget, spots])

const handleSpotDeselect = useCallback(() => {
  setSelectedSpotId(null)
  // Clear deep-link query param
  if (typeof window !== 'undefined' && window.location.search.includes('spot=')) {
    router.replace('/', { scroll: false })
  }
}, [router])
```

#### Share Button: New Component

`components/SpotShareButton.tsx`:

```tsx
'use client'

import { useState } from 'react'

export default function SpotShareButton({ spotId }: { spotId: string }) {
  const [copied, setCopied] = useState(false)

  const handleShare = async () => {
    const url = `${window.location.origin}/?spot=${spotId}`
    try {
      // Modern Web Share API on mobile
      if (typeof navigator.share === 'function') {
        await navigator.share({ url, title: 'Schau dir dieses Plätzchen an' })
        return
      }
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // user cancelled or denied
    }
  }

  return (
    <button
      type="button"
      onClick={handleShare}
      aria-label="Teilen"
      className="min-w-11 min-h-11 flex items-center justify-center text-lg leading-none text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 relative"
    >
      📤
      {copied && (
        <span className="absolute -top-8 right-0 bg-gray-900 text-white text-xs px-2 py-1 rounded whitespace-nowrap">
          Link kopiert
        </span>
      )}
    </button>
  )
}
```

Integrate into BottomSheet sheet-header before the Heart toggle:
```tsx
{selectedSpot && <SpotShareButton spotId={selectedSpot.id} />}
{userId && selectedSpot && <FavoriteToggle ... />}
```

### Edge cases
- Anonymous user opens link: works (RLS allows public spots). Sheet opens, no Heart button.
- Spot is private/friends-only and user isn't allowed: server doesn't return it → MapLayout doesn't find it in `spots` → flyTarget not set, sheet stays closed. URL is benign.
- Spot doesn't exist (deleted/typo): same — silently no-op.
- Mobile native share: Web Share API on iOS/Android opens system share sheet. Desktop falls back to clipboard.

### Out of scope
- Open Graph meta tags for nice link preview cards (Phase 8 / SEO)
- Short URLs (no link-shortener integration)
- "Recently shared with me" inbox

## Files Touched

### New
- `components/SpotShareButton.tsx`

### Modified
- `lib/supabase/admin.ts` (warning)
- `components/BottomSheet.tsx` (drag-handle contrast + 4-tab + share button + inert/dialog semantics)
- All disabled-button consumers (opacity 50→60, listed above)
- `app/(app)/admin/page.tsx` (n+1 fix)
- `app/(app)/page.tsx` (searchParams, friendIds, initialSpotId)
- `components/MapLayout.tsx` (friendIds prop, initialSpotId, query-param cleanup, inert wrapper)
- `AGENTS.md`, `docs/*.md`, `CHANGELOG.md`

## Out of Scope (deferred)

| Item | Phase |
|---|---|
| SpotMap-Refactor (custom hooks) | 7.5 / 8 |
| PWA installable | dedicated mini-phase |
| Vector Icons | when designs ready |
| Block-Mechanik on friendships | 8 |
| Open Graph for shared links | 8 (with SEO pass) |

## Testing

- **Unit (vitest):** existing 113 stay green. No new tests strictly required (UI-mostly), but consider:
  - Filter logic for `viewMode === 'friends'` could get a small unit if extracted.
- **Manual:**
  1. Service-role-key: comment out env in `.env`, restart, observe warn in Vercel/dev console
  2. Drag-handle: visible against both light + dark backgrounds
  3. Disabled buttons: just-noticeably more visible
  4. N+1: open `/admin`, verify counts still correct, verify React Profiler shows lower work
  5. Inert: open sheet, Tab cycles only inside sheet, not onto FAB
  6. Friend-spot-filter: as User A, become friends with B, ensure B's spots appear in Friends tab; remove friendship, they disappear
  7. Deep-link: navigate to `/?spot=<existing-id>` → map flies, sheet opens. Close sheet → URL becomes `/`.
  8. Deep-link mobile: tap Share → native share sheet (iOS/Android). Desktop → "Link kopiert" toast.

## Implementation Strategy

Order: 1 → 2 → 3 → 4 → 5 → 6, smallest first. Each its own commit. Estimated 8-10 commits including docs.
