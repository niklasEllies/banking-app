# Phase 7 — Polish & Tech-Debt Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Beta-readiness pass — env warning, contrast nudges, kill an N+1, focus-trap via inert, 4th BottomSheet tab "Freunde", deep-links via `/?spot=<id>` with share button.

**Architecture:** Six independent items, no new migrations. Implementation order optimizes for small-first. Each its own commit.

**Tech Stack:** Next.js 16.2, React 19, TypeScript, Tailwind v4, Supabase, vitest 4.

**Spec:** `docs/superpowers/specs/2026-05-05-phase7-polish-design.md`

---

## File Structure Overview

| File | Action |
|---|---|
| `lib/supabase/admin.ts` | Modify (warn) |
| `components/BottomSheet.tsx` | Modify (drag-handle contrast, dialog semantics, 4-tab, share-button slot) |
| Various component files | Modify (`disabled:opacity-50` → `60`) |
| `app/(app)/admin/page.tsx` | Modify (n+1 → Map) |
| `components/MapLayout.tsx` | Modify (friendIds, initialSpotId, inert wrapper, query-param cleanup) |
| `app/(app)/page.tsx` | Modify (searchParams, friendIds fetch, initialSpotId prop) |
| `components/SpotShareButton.tsx` | Create |
| `AGENTS.md`, `docs/*.md`, `CHANGELOG.md` | Modify |

---

## Task 1: Service-Role-Key Warning

**Files:**
- Modify: `lib/supabase/admin.ts`

- [ ] **Step 1: Add warn at module top**

At the top of `lib/supabase/admin.ts`, before any other code:

```ts
if (process.env.NODE_ENV === 'production' && !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.warn(
    '[plaetzchen] SUPABASE_SERVICE_ROLE_KEY is not set — admin user emails will be missing.',
  )
}
```

- [ ] **Step 2: Build + tests**

```bash
npm run build && npm test
```
113 still pass.

- [ ] **Step 3: Commit**

```bash
git add lib/supabase/admin.ts
git commit -m "feat: warn when SUPABASE_SERVICE_ROLE_KEY missing in production"
```

---

## Task 2: Contrast Tweaks

**Files (multiple, all single-line changes):**

- [ ] **Step 1: Drag-handle in BottomSheet**

In `components/BottomSheet.tsx`, find:
```tsx
<div className="absolute left-1/2 -translate-x-1/2 top-3 w-10 h-1 bg-gray-300 dark:bg-gray-600 rounded-full" />
```
Change to:
```tsx
<div className="absolute left-1/2 -translate-x-1/2 top-3 w-10 h-1 bg-gray-400 dark:bg-gray-500 rounded-full" />
```

- [ ] **Step 2: Disabled opacity 50 → 60 (search & replace)**

Run from worktree root:
```bash
rg "disabled:opacity-50" -l --type ts --type tsx
```

For each file in the result, replace `disabled:opacity-50` with `disabled:opacity-60`. Expected files (verify by running rg):
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

(Use Edit tool with `replace_all: true` per file, or a single search-and-replace pass.)

- [ ] **Step 3: Build + tests**

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "a11y: nudge contrast on drag-handle + disabled buttons"
```

---

## Task 3: N+1 in admin/page.tsx

**Files:**
- Modify: `app/(app)/admin/page.tsx`

- [ ] **Step 1: Replace filter with Map**

Find the `users` mapping:
```ts
const users: AdminUser[] = (profiles ?? []).map((p) => ({
  ...p,
  email: emailMap[p.id] ?? null,
  spot_count: (spots ?? []).filter((s) => s.created_by === p.id).length,
}))
```

Insert a `spotCountByUser` build above, and use it:
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

- [ ] **Step 2: Build + tests**

- [ ] **Step 3: Commit**

```bash
git add "app/(app)/admin/page.tsx"
git commit -m "perf: build spot-count map once instead of N× filter in admin page"
```

---

## Task 4: Focus-Trap via `inert`

**Files:**
- Modify: `components/MapLayout.tsx`
- Modify: `components/BottomSheet.tsx` (dialog semantics)

- [ ] **Step 1: Wrap SpotMapClient with conditionally-inert div**

In `MapLayout.tsx`, locate the `<SpotMapClient ... />` JSX. Wrap with a div:

```tsx
<div className="contents" {...(sheetExpanded ? { inert: true } : {})}>
  <SpotMapClient ... />
</div>
```

NOTE: `inert` requires React 19+ (which we have). It's a boolean attribute. If TypeScript complains, cast: `{...(sheetExpanded ? { inert: true as unknown as boolean } : {})}`. React 19 should accept it natively though.

Actually, using a plain `<div>` with `className="contents"` + spread props is clean. The `contents` class makes the wrapper invisible in the layout. Inert works on any element.

- [ ] **Step 2: Add dialog semantics to BottomSheet**

In `BottomSheet.tsx`, on the outer expanded panel `<div>` (the one with `absolute bottom-0 left-0 right-0 z-1000 bg-white...`), add:

```tsx
<div
  role="dialog"
  aria-modal="true"
  aria-label={selectedSpotId ? 'Plätzchen-Details' : 'Plätzchen-Liste'}
  className="absolute bottom-0 ..."
  ...
>
```

- [ ] **Step 3: Build + manual sanity (note for QA)**

```bash
npm run build && npm test
```

- [ ] **Step 4: Commit**

```bash
git add components/MapLayout.tsx components/BottomSheet.tsx
git commit -m "a11y: inert on map background while BottomSheet expanded; sheet gets role=dialog"
```

---

## Task 5: Friend-Spot-Filter — 4th BottomSheet Tab

**Files:**
- Modify: `app/(app)/page.tsx` (fetch friend IDs)
- Modify: `components/MapLayout.tsx` (friendIds prop, plumb to BottomSheet)
- Modify: `components/BottomSheet.tsx` (4th tab + filter logic)

- [ ] **Step 1: Fetch friend IDs server-side**

In `app/(app)/page.tsx`, add to the existing parallel-fetch:

```ts
import { listFriends } from '@/actions/friends'

let friendIds: string[] = []
if (user) {
  const [profileResult, favIds, friends] = await Promise.all([
    supabase.from('profiles').select('is_admin').eq('id', user.id).maybeSingle(),
    listFavoriteSpotIds(),
    listFriends(),
  ])
  isAdmin = profileResult.data?.is_admin ?? false
  favoriteIds = favIds
  friendIds = friends.map(f => f.id)
}
```

Pass to MapLayout: `initialFriendIds={friendIds}`.

- [ ] **Step 2: MapLayout — friendIds Set**

Add prop + state mirroring favoriteIds pattern:

```ts
interface MapLayoutProps {
  // ...existing...
  initialFriendIds?: string[]
}

// In component:
const [friendIds] = useState<Set<string>>(() => new Set(initialFriendIds ?? []))
```

No setter needed — friend changes happen via /friends mutations which `revalidatePath('/')` and re-render the page.

Pass to BottomSheet: `friendIds={friendIds}`.

- [ ] **Step 3: BottomSheet — extend ViewMode + filter**

```ts
type ViewMode = 'all' | 'mine' | 'friends' | 'favorites'

interface BottomSheetProps {
  // ...existing...
  friendIds?: Set<string>
}

// Default in destructure:
friendIds = new Set<string>(),
```

Update tab rendering — change array of tabs:
```tsx
{(['all', 'mine', 'friends', 'favorites'] as const).map((m) => (
  <button ...>
    {m === 'all' ? 'Alle' : m === 'mine' ? 'Eigene' : m === 'friends' ? 'Freunde' : 'Favoriten'}
  </button>
))}
```

Update filter logic:
```ts
const filtered = spots.filter((s) => {
  if (viewMode === 'all') return true
  if (viewMode === 'mine') return s.created_by === userId
  if (viewMode === 'friends') return s.created_by !== null && friendIds.has(s.created_by)
  return favoriteIds.has(s.id)  // 'favorites'
})
```

Update login-CTA condition:
```tsx
{(viewMode === 'mine' || viewMode === 'friends' || viewMode === 'favorites') && !userId ? (
  <LoginCta />
) : ...}
```

CTA copy switch:
```tsx
const ctaText = viewMode === 'mine'
  ? 'deine eigenen Plätzchen'
  : viewMode === 'friends'
  ? 'Plätzchen von Freunden'
  : 'deine Favoriten'
```

Empty-state per tab (logged-in, sorted is empty):
- `'friends'`: 👥 emoji + "Keine Plätzchen von Freunden in der Nähe — füge Freunde im [Profil-Tab] hinzu."

Match existing empty-state styling (centered, py-12).

- [ ] **Step 4: Build + tests**

```bash
npm run build && npm test
```
Expected: clean. 4 tabs visible in the sheet on dev.

- [ ] **Step 5: Commit**

```bash
git add "app/(app)/page.tsx" components/MapLayout.tsx components/BottomSheet.tsx
git commit -m "feat: 4th BottomSheet tab 'Freunde' filters spots by accepted-friend creators"
```

---

## Task 6: Deep-Links + SpotShareButton

**Files:**
- Create: `components/SpotShareButton.tsx`
- Modify: `app/(app)/page.tsx` (read searchParams, pass initialSpotId)
- Modify: `components/MapLayout.tsx` (initialSpotId prop, query-param cleanup)
- Modify: `components/BottomSheet.tsx` (integrate SpotShareButton in header)

- [ ] **Step 1: Create `components/SpotShareButton.tsx`** (full code in spec section 6)

```tsx
'use client'

import { useState } from 'react'

export default function SpotShareButton({ spotId }: { spotId: string }) {
  const [copied, setCopied] = useState(false)

  const handleShare = async () => {
    const url = `${window.location.origin}/?spot=${spotId}`
    try {
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

- [ ] **Step 2: Integrate in BottomSheet header**

In the sheet header action area, before the FavoriteToggle:

```tsx
{selectedSpot && <SpotShareButton spotId={selectedSpot.id} />}
{userId && selectedSpot && (
  <FavoriteToggle ... />
)}
```

Import: `import SpotShareButton from '@/components/SpotShareButton'`.

- [ ] **Step 3: `app/(app)/page.tsx` — read searchParams**

```ts
export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ spot?: string }>
}) {
  const { spot: initialSpotId } = await searchParams
  // ... existing fetch code ...
  return (
    <div className="relative w-full h-screen overflow-hidden">
      <MapHeader />
      <MapLayout
        // ...existing props...
        initialSpotId={initialSpotId ?? null}
      />
      {latestEntry && <ChangelogModal latest={latestEntry} />}
    </div>
  )
}
```

- [ ] **Step 4: `MapLayout.tsx` — initial selection + query-param cleanup**

Add prop:
```ts
interface MapLayoutProps {
  // ...
  initialSpotId?: string | null
}
```

Init state with initialSpotId:
```ts
const [selectedSpotId, setSelectedSpotId] = useState<string | null>(initialSpotId ?? null)
```

Set initial fly-target on mount (in a useEffect):
```ts
useEffect(() => {
  if (!initialSpotId) return
  const spot = spots.find(s => s.id === initialSpotId)
  if (spot) setFlyTarget({ lat: spot.lat, lng: spot.lng })
  // Empty deps — only runs on mount
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [])
```

(Suppression OK because initialSpotId is server-injected once — not reactive.)

Update `handleSpotDeselect` to clear the URL param:
```ts
import { useRouter } from 'next/navigation'

const router = useRouter()

const handleSpotDeselect = useCallback(() => {
  setSelectedSpotId(null)
  if (typeof window !== 'undefined' && window.location.search.includes('spot=')) {
    router.replace('/', { scroll: false })
  }
}, [router])
```

- [ ] **Step 5: Build + tests**

```bash
npm run build && npm test
```

- [ ] **Step 6: Commit**

```bash
git add components/SpotShareButton.tsx components/BottomSheet.tsx components/MapLayout.tsx "app/(app)/page.tsx"
git commit -m "feat: deep-link spots via /?spot=<id> + Web-Share-API share button in detail header"
```

---

## Task 7: Docs + CHANGELOG

**Files:**
- Modify: `CHANGELOG.md` (NEW 0.7.0 entry at top)
- Modify: `AGENTS.md` (state pointer)
- Modify: `docs/feature-status.md` (Phase 7 ✅, mark deferred items still open)
- Modify: `docs/agent-handoff.md` (Phase 7 patterns, next-up updated)
- Modify: `docs/architecture.md` (file structure: SpotShareButton, friendIds plumbing)
- Modify: `docs/database-schema.md` (no schema changes — but verify no stale refs)

- [ ] **Step 1: `CHANGELOG.md` 0.7.0**

```md
## 0.7.0 — Beta-Polish
*5. Mai 2026*

- 🔗 Teile einen Spot per Link: Tippe auf 📤 in der Detail-Ansicht
- 👥 Neuer Tab "Freunde" in der Spot-Liste — sieh, was deine Freunde eingetragen haben
- ♿ Bessere Tastatur-Navigation: Tab bleibt im Sheet, wenn es offen ist
- 🌓 Etwas mehr Kontrast bei Drag-Handle und deaktivierten Buttons
- ⚡ Schnellere Admin-Übersicht (kein N+1 mehr)
```

- [ ] **Step 2: `AGENTS.md`** — update state to "Phase 7 complete", add deep-link rule

- [ ] **Step 3: `docs/feature-status.md`** — convert relevant Phase 7 bullets to ✅, mark SpotMap-Refactor / PWA / Vector Icons / Block as still 🔜 in Phase 7 (or move to a new "Phase 7+" / Phase 8 section depending on what's clean).

- [ ] **Step 4: `docs/agent-handoff.md`** — add a Phase 7 patterns block:
  - friendIds Set propagation (mirrors favoriteIds)
  - inert on background pattern
  - deep-link query-param convention `/?spot=<id>`
  - Update "Was als nächstes" to point at Phase 8 (Social Polish) and the still-open Phase-7 items (SpotMap-Refactor, PWA, Vector, Block)

- [ ] **Step 5: `docs/architecture.md`** — add `SpotShareButton` to the file-structure block, mention friendIds in the data flow.

- [ ] **Step 6: Commit**

```bash
git add AGENTS.md docs/ CHANGELOG.md
git commit -m "docs: catch up Phase 7 polish + 0.7.0 changelog entry"
```

---

## Final Steps

- [ ] **Run full test suite**

```bash
npm test
```
113 still pass.

- [ ] **Run full build**

```bash
npm run build
```
Clean. Routes still as before.

- [ ] **Manual QA list (handed to user)**

1. With `SUPABASE_SERVICE_ROLE_KEY` missing → console.warn visible in production logs only
2. Drag-handle visibly higher contrast on light + dark backgrounds
3. Disabled buttons just-noticeably less faded
4. `/admin` shows correct spot counts; same data, faster build
5. Open Sheet, press Tab repeatedly: focus stays inside sheet (doesn't reach FAB)
6. Friend-tab: become friends with B, B's spots appear in Friends tab; remove friendship → disappear
7. Open `/?spot=<existing-id>` — map flies, sheet opens. Close sheet → URL clears.
8. Mobile: tap share → native share sheet. Desktop → "Link kopiert" toast.
9. Anonymous user opens deep-link to public spot — works. Friends/private → silently no-op.
10. Open Sheet on iPhone, swipe down to scroll inner detail content — Sheet doesn't accidentally close (Phase 3b behavior preserved by inert)

- [ ] **Branch finishing** (use superpowers:finishing-a-development-branch skill)

Present 4 options to user.

---

## Anti-Patterns to Avoid

- **Don't** open the share sheet automatically when navigating to `/?spot=<id>` — only fly + open detail.
- **Don't** put the share button on every list row — only in the detail header.
- **Don't** push browser history when clearing the deep-link param — `router.replace`, not `push`.
- **Don't** server-redirect when a deep-linked spot is invisible to the user — silently no-op (privacy: don't leak that the spot exists).
- **Don't** forget `inert` is React-19-native — older React types may complain; cast if needed but don't add a polyfill.
- **Don't** widen contrast tweaks to a full theme overhaul — this is a small nudge, not a redesign.
