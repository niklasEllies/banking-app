# Phase 6 — Privacy & Friends Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Friendship system + per-spot visibility (public/friends/private) with RLS cascade.

**Architecture:** Two migrations first; then types/lib; server actions; UI cascade; `/friends` route; profile counter; docs.

**Tech Stack:** Next.js 16.2 + React 19 + TypeScript + Tailwind v4 + Supabase + vitest 4.

**Spec:** `docs/superpowers/specs/2026-05-05-phase6-privacy-friends-design.md`

---

## File Structure Overview

| File | Action |
|---|---|
| `supabase/migrations/009_phase6_friendships.sql` | Create |
| `supabase/migrations/010_phase6_visibility.sql` | Create |
| `lib/spot-visibility.ts` | Create |
| `actions/friends.ts` | Create |
| `__tests__/actions/friends.test.ts` | Create |
| `actions/spots.ts` | Modify (`createSpot`/`updateSpot` accept visibility) |
| `__tests__/actions/spots.test.ts` | Modify (visibility tests) |
| `components/SpotMap.tsx` | Modify (`Spot` interface gains `visibility`) |
| `app/(app)/page.tsx` | Modify (select includes `visibility`) |
| `app/(app)/admin/page.tsx` + `AdminSpots.tsx` | Modify (visibility column) |
| `app/(app)/spots/[id]/edit/page.tsx` | Modify (select includes `visibility`) |
| `components/VisibilityPicker.tsx` | Create |
| `components/AddSpotForm.tsx` | Modify (integrate VisibilityPicker) |
| `components/SpotEditForm.tsx` | Modify (integrate VisibilityPicker, prefill) |
| `components/SpotDetail.tsx` | Modify (visibility badge) |
| `components/FriendsClient.tsx` | Create |
| `app/(app)/friends/page.tsx` | Create |
| `app/(app)/profil/page.tsx` | Modify (Freunde link + pending counter) |
| `AGENTS.md`, `docs/*.md`, `CHANGELOG.md` | Modify (final pass) |

---

## Task 1: Migration 009 — `friendships` Table + `are_friends` Helper

**Files:**
- Create: `supabase/migrations/009_phase6_friendships.sql`

- [ ] **Step 1: Write migration** (full SQL from spec section "Migration 009")

- [ ] **Step 2: Apply via Supabase MCP**

Use `mcp__plugin_supabase_supabase__apply_migration` with name `phase6_friendships`.

- [ ] **Step 3: Verify**

```sql
SELECT polname, polcmd FROM pg_policy WHERE polrelid = 'friendships'::regclass;
SELECT proname FROM pg_proc WHERE proname = 'are_friends';
SELECT public.are_friends(gen_random_uuid(), gen_random_uuid()); -- expect false
```

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/009_phase6_friendships.sql
git commit -m "feat(db): add friendships table + are_friends helper (migration 009)"
```

---

## Task 2: Migration 010 — `visibility` + RLS Cascade

**Files:**
- Create: `supabase/migrations/010_phase6_visibility.sql`

- [ ] **Step 1: Verify existing policy names**

Use `execute_sql`:
```sql
SELECT tablename, polname FROM pg_policies
WHERE tablename IN ('spots', 'spot_descriptions', 'spot_stats_votes', 'favorites')
ORDER BY tablename, polname;
```
Note actual policy names — adjust the migration's DROP POLICY statements to match.

- [ ] **Step 2: Write migration**

Use the SQL from spec section "Migration 010", but with the actual policy names from Step 1 in the DROP statements.

- [ ] **Step 3: Apply via Supabase MCP**

Use `apply_migration` name `phase6_visibility`.

- [ ] **Step 4: Verify**

```sql
SELECT typname FROM pg_type WHERE typname = 'spot_visibility';
SELECT proname FROM pg_proc WHERE proname = 'can_see_spot';
SELECT visibility, COUNT(*) FROM spots GROUP BY visibility;
-- All existing rows should have visibility='public'
```

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/010_phase6_visibility.sql
git commit -m "feat(db): add spot.visibility enum + RLS cascade via can_see_spot (migration 010)"
```

---

## Task 3: `lib/spot-visibility.ts`

**Files:**
- Create: `lib/spot-visibility.ts`

- [ ] **Step 1: Implement**

```ts
export type SpotVisibility = 'public' | 'friends' | 'private'

export interface SpotVisibilityMeta {
  key: SpotVisibility
  emoji: string
  label: string
}

export const SPOT_VISIBILITIES: readonly SpotVisibilityMeta[] = [
  { key: 'public',  emoji: '🌍', label: 'Öffentlich' },
  { key: 'friends', emoji: '👥', label: 'Nur Freunde' },
  { key: 'private', emoji: '🔒', label: 'Privat' },
] as const

export const SPOT_VISIBILITY_MAP: Record<SpotVisibility, SpotVisibilityMeta> =
  Object.fromEntries(SPOT_VISIBILITIES.map((v) => [v.key, v])) as Record<SpotVisibility, SpotVisibilityMeta>
```

- [ ] **Step 2: Build**

```bash
npm run build
```

- [ ] **Step 3: Commit**

```bash
git add lib/spot-visibility.ts
git commit -m "feat: add SpotVisibility constants + types"
```

---

## Task 4: `actions/friends.ts` (TDD, subagent-eligible)

**Files:**
- Create: `actions/friends.ts`
- Create: `__tests__/actions/friends.test.ts`

- [ ] **Step 1: Write failing tests** (mirror pattern of `descriptions.test.ts` / `favorites.test.ts`)

Required cases (≥10):

For each function: rejection if unauthenticated.

`searchUserByUsername`:
1. Returns null when no match.
2. Returns the user (id + username) on exact match.
3. Refuses to return self even if username matches.

`sendFriendRequest`:
4. Refuses self-request (`addresseeId === auth.uid()`) → `{ error: 'Du kannst dir nicht selbst eine Anfrage senden' }`.
5. Inserts row with `status='pending', requester_id=auth.uid()`.
6. (Optional) handles UNIQUE conflict gracefully — return error message.

`acceptFriendRequest`:
7. Updates the matching pending row to `status='accepted'`.

`removeFriend` / `cancelFriendRequest` / `declineFriendRequest`:
8. Issue DELETE with the right WHERE clauses.

`listFriends` / `listIncomingRequests` / `listOutgoingRequests`:
9. Each returns `[]` when unauthenticated.
10. Each runs the right filter against friendships joined with profiles.

`countIncomingRequests`:
11. Returns 0 when unauthenticated; otherwise the count.

Use the same `vi.mock` pattern as `__tests__/actions/favorites.test.ts`.

- [ ] **Step 2: Run failing**

```bash
npm test -- friends
```
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `actions/friends.ts`**

```ts
'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

export interface FriendUser {
  id: string
  username: string | null
}

export interface FriendRequest extends FriendUser {
  created_at: string
}

export async function searchUserByUsername(query: string): Promise<FriendUser | null> {
  const trimmed = query.trim()
  if (trimmed.length < 1) return null

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data } = await supabase
    .from('profiles')
    .select('id, username')
    .eq('username', trimmed)
    .maybeSingle()

  if (!data) return null
  if (data.id === user.id) return null  // hide self
  return { id: data.id, username: data.username }
}

export async function sendFriendRequest(addresseeId: string): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Nicht eingeloggt' }
  if (addresseeId === user.id) return { error: 'Du kannst dir nicht selbst eine Anfrage senden' }

  const { error } = await supabase
    .from('friendships')
    .insert({ requester_id: user.id, addressee_id: addresseeId, status: 'pending' })

  if (error) {
    // 23505 = unique_violation — already a row in this direction
    if (error.code === '23505') return { error: 'Anfrage existiert bereits' }
    return { error: error.message }
  }

  revalidatePath('/friends')
  revalidatePath('/profil')
  revalidatePath('/')
  return {}
}

export async function acceptFriendRequest(requesterId: string): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Nicht eingeloggt' }

  const { error } = await supabase
    .from('friendships')
    .update({ status: 'accepted' })
    .eq('requester_id', requesterId)
    .eq('addressee_id', user.id)
    .eq('status', 'pending')

  if (error) return { error: error.message }
  revalidatePath('/friends')
  revalidatePath('/profil')
  revalidatePath('/')
  return {}
}

export async function declineFriendRequest(requesterId: string): Promise<{ error?: string }> {
  return deleteFriendshipRow({ requesterId, addresseeId: 'self' })
}

export async function cancelFriendRequest(addresseeId: string): Promise<{ error?: string }> {
  return deleteFriendshipRow({ requesterId: 'self', addresseeId })
}

export async function removeFriend(otherUserId: string): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Nicht eingeloggt' }

  // Delete whichever direction exists
  const { error } = await supabase
    .from('friendships')
    .delete()
    .or(
      `and(requester_id.eq.${user.id},addressee_id.eq.${otherUserId}),and(requester_id.eq.${otherUserId},addressee_id.eq.${user.id})`,
    )

  if (error) return { error: error.message }
  revalidatePath('/friends')
  revalidatePath('/profil')
  revalidatePath('/')
  return {}
}

async function deleteFriendshipRow(
  { requesterId, addresseeId }: { requesterId: string; addresseeId: string },
): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Nicht eingeloggt' }

  const req = requesterId === 'self' ? user.id : requesterId
  const adr = addresseeId === 'self' ? user.id : addresseeId

  const { error } = await supabase
    .from('friendships')
    .delete()
    .eq('requester_id', req)
    .eq('addressee_id', adr)

  if (error) return { error: error.message }
  revalidatePath('/friends')
  revalidatePath('/profil')
  return {}
}

export async function listFriends(): Promise<FriendUser[]> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const { data } = await supabase
    .from('friendships')
    .select('requester_id, addressee_id, requester:profiles!friendships_requester_id_fkey(id, username), addressee:profiles!friendships_addressee_id_fkey(id, username)')
    .eq('status', 'accepted')

  if (!data) return []

  return data.map((row) => {
    // The "other" user is whichever side isn't me
    const isRequester = row.requester_id === user.id
    const other = isRequester ? row.addressee : row.requester
    return Array.isArray(other) ? { id: other[0].id, username: other[0].username } : { id: other.id, username: other.username }
  })
}

export async function listIncomingRequests(): Promise<FriendRequest[]> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const { data } = await supabase
    .from('friendships')
    .select('requester_id, created_at, profiles!friendships_requester_id_fkey(id, username)')
    .eq('addressee_id', user.id)
    .eq('status', 'pending')
    .order('created_at', { ascending: false })

  if (!data) return []
  return data.map((row) => {
    const p = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles
    return { id: row.requester_id, username: p?.username ?? null, created_at: row.created_at }
  })
}

export async function listOutgoingRequests(): Promise<FriendRequest[]> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const { data } = await supabase
    .from('friendships')
    .select('addressee_id, created_at, profiles!friendships_addressee_id_fkey(id, username)')
    .eq('requester_id', user.id)
    .eq('status', 'pending')
    .order('created_at', { ascending: false })

  if (!data) return []
  return data.map((row) => {
    const p = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles
    return { id: row.addressee_id, username: p?.username ?? null, created_at: row.created_at }
  })
}

export async function countIncomingRequests(): Promise<number> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return 0

  const { count } = await supabase
    .from('friendships')
    .select('*', { count: 'exact', head: true })
    .eq('addressee_id', user.id)
    .eq('status', 'pending')

  return count ?? 0
}
```

NOTE: the foreign-key alias names (`friendships_requester_id_fkey`, `friendships_addressee_id_fkey`) depend on Supabase's auto-generated FK constraint names. Verify with:

```sql
SELECT conname FROM pg_constraint WHERE conrelid = 'friendships'::regclass AND contype = 'f';
```

Adjust the `select(...)` join syntax to use the actual constraint names if they differ.

- [ ] **Step 4: Run tests**

```bash
npm test
```
Expected: all green, 87 + at least 11 new = 98+.

- [ ] **Step 5: Commit**

```bash
git add actions/friends.ts __tests__/actions/friends.test.ts
git commit -m "feat: friendships server actions (search/request/accept/decline/cancel/remove/list) + tests"
```

---

## Task 5: Extend `createSpot` + `updateSpot` with `visibility`

**Files:**
- Modify: `actions/spots.ts`
- Modify: `__tests__/actions/spots.test.ts`

- [ ] **Step 1: Update `actions/spots.ts`**

Add at top:
```ts
import type { SpotVisibility } from '@/lib/spot-visibility'

const VALID_VISIBILITIES: SpotVisibility[] = ['public', 'friends', 'private']
```

In `createSpot`, after type validation:

```ts
const visibilityRaw = (formData.get('visibility') as string | null) ?? 'public'
if (!VALID_VISIBILITIES.includes(visibilityRaw as SpotVisibility)) {
  return { error: 'Ungültige Sichtbarkeit' }
}
const visibility = visibilityRaw as SpotVisibility
```

Insert payload includes `visibility`:
```ts
.insert({ lat, lng, name, type, visibility, created_by: user.id })
```

In `updateSpot`, change signature:
```ts
fields: { name: string | null; type: SpotType; visibility: SpotVisibility }
```

Validate:
```ts
if (!VALID_VISIBILITIES.includes(fields.visibility)) {
  return { error: 'Ungültige Sichtbarkeit' }
}
```

Update payload: `{ name: cleanedName, type: fields.type, visibility: fields.visibility }`

- [ ] **Step 2: Add test cases**

In `__tests__/actions/spots.test.ts`:

For `createSpot`:
- "akzeptiert visibility=friends und gibt sie an insert weiter"
- "rejects ungültige visibility-string"
- "default visibility ist public wenn nicht angegeben"

For `updateSpot`:
- "rejects ungültige visibility"
- "updated visibility wenn Owner"

Pattern: same as existing `type`-tests but for visibility.

- [ ] **Step 3: Run tests**

```bash
npm test
```
Expected: green.

- [ ] **Step 4: Commit**

```bash
git add actions/spots.ts __tests__/actions/spots.test.ts
git commit -m "feat: createSpot/updateSpot accept visibility (public/friends/private) + tests"
```

---

## Task 6: Cascade Spot Type + Queries

**Files:**
- Modify: `components/SpotMap.tsx` (add `visibility` to `Spot` interface)
- Modify: `app/(app)/page.tsx` (select adds `visibility`)
- Modify: `app/(app)/admin/page.tsx` + `AdminSpots.tsx` (select includes `visibility`, optionally show)
- Modify: `app/(app)/spots/[id]/edit/page.tsx` (select includes `visibility`, pass to form)

- [ ] **Step 1: `Spot` interface gains `visibility`**

In `components/SpotMap.tsx`:
```ts
import type { SpotVisibility } from '@/lib/spot-visibility'

export interface Spot {
  id: string
  type: SpotType
  visibility: SpotVisibility   // NEW
  lat: number
  lng: number
  name: string | null
  created_by: string
  created_at: string
  photo_url: string | null
}
```

- [ ] **Step 2: Update queries**

`app/(app)/page.tsx`:
```ts
supabase.from('spots').select('id, type, visibility, lat, lng, name, created_by, created_at, photo_url')
```

`app/(app)/admin/page.tsx`:
```ts
supabase.from('spots').select('id, name, type, visibility, created_at, created_by, profiles(username)')
```

`AdminSpots.tsx`: add `visibility: SpotVisibility` to `AdminSpot` interface (import the type).

`app/(app)/spots/[id]/edit/page.tsx`:
```ts
.select('id, name, type, visibility, created_by')
```

Pass to `<SpotEditForm spot={spot} />` — the form will use it (Task 9).

- [ ] **Step 3: Build + tests**

```bash
npm run build
npm test
```
Both green.

- [ ] **Step 4: Commit**

```bash
git add components/SpotMap.tsx "app/(app)/page.tsx" "app/(app)/admin/" "app/(app)/spots/[id]/edit/page.tsx"
git commit -m "refactor: Spot interface gains visibility, queries select it"
```

---

## Task 7: `VisibilityPicker` Component

**Files:**
- Create: `components/VisibilityPicker.tsx`

- [ ] **Step 1: Implement** (mirror of `SpotTypePicker`)

```tsx
'use client'

import { SPOT_VISIBILITIES, type SpotVisibility } from '@/lib/spot-visibility'

interface VisibilityPickerProps {
  value: SpotVisibility
  onChange: (v: SpotVisibility) => void
}

export default function VisibilityPicker({ value, onChange }: VisibilityPickerProps) {
  return (
    <div role="radiogroup" aria-label="Sichtbarkeit" className="grid grid-cols-3 gap-2">
      {SPOT_VISIBILITIES.map((v) => {
        const selected = value === v.key
        return (
          <button
            key={v.key}
            type="button"
            role="radio"
            aria-checked={selected}
            aria-label={v.label}
            onClick={() => onChange(v.key)}
            className={`min-h-16 rounded-lg border-2 transition-all flex flex-col items-center justify-center gap-1 px-2 py-2 ${
              selected
                ? 'border-primary bg-primary-light dark:bg-[#2a3f1e]'
                : 'border-gray-200 dark:border-[#2a2f24] bg-white dark:bg-[#1e231a] hover:border-gray-300 dark:hover:border-gray-600'
            }`}
          >
            <span className="text-2xl leading-none">{v.emoji}</span>
            <span className="text-xs text-gray-700 dark:text-gray-300">{v.label}</span>
          </button>
        )
      })}
    </div>
  )
}
```

- [ ] **Step 2: Build**

- [ ] **Step 3: Commit**

```bash
git add components/VisibilityPicker.tsx
git commit -m "feat: VisibilityPicker — radiogroup of 3 spot-visibility levels"
```

---

## Task 8: Integrate VisibilityPicker into AddSpotForm + SpotEditForm

**Files:**
- Modify: `components/AddSpotForm.tsx`
- Modify: `components/SpotEditForm.tsx`

- [ ] **Step 1: AddSpotForm**

Add state: `const [visibility, setVisibility] = useState<SpotVisibility>('public')`

Add hidden input near the existing `type` hidden input:
```tsx
<input type="hidden" name="visibility" value={visibility} />
```

Add the picker block between the type picker and the name input:
```tsx
<div>
  <p className="block text-sm text-gray-800 dark:text-gray-200 font-medium mb-2">Wer kann den Spot sehen?</p>
  <VisibilityPicker value={visibility} onChange={setVisibility} />
</div>
```

Imports: `import VisibilityPicker from '@/components/VisibilityPicker'`, `import type { SpotVisibility } from '@/lib/spot-visibility'`.

- [ ] **Step 2: SpotEditForm**

Update prop interface:
```ts
spot: { id: string; name: string | null; type: SpotType; visibility: SpotVisibility; created_by: string }
```

Add state: `const [visibility, setVisibility] = useState<SpotVisibility>(spot.visibility)`

Render the picker (same JSX block as AddSpotForm).

Pass to `updateSpot`:
```ts
const result = await updateSpot(spot.id, { name: name || null, type, visibility })
```

- [ ] **Step 3: Build + tests**

- [ ] **Step 4: Commit**

```bash
git add components/AddSpotForm.tsx components/SpotEditForm.tsx
git commit -m "feat: VisibilityPicker integrated in AddSpotForm + SpotEditForm"
```

---

## Task 9: SpotDetail Visibility Badge

**Files:**
- Modify: `components/SpotDetail.tsx`

- [ ] **Step 1: Add badge below type-badge**

Find the type-badge block:
```tsx
<div className="px-5 pt-3 -mb-1">
  <span className="text-xs text-gray-500 dark:text-gray-400">
    {SPOT_TYPE_MAP[spot.type].emoji} {SPOT_TYPE_MAP[spot.type].label}
  </span>
</div>
```

Append visibility (only if not public):
```tsx
<div className="px-5 pt-3 -mb-1">
  <span className="text-xs text-gray-500 dark:text-gray-400">
    {SPOT_TYPE_MAP[spot.type].emoji} {SPOT_TYPE_MAP[spot.type].label}
  </span>
  {spot.visibility !== 'public' && (
    <span className="text-xs text-gray-500 dark:text-gray-400 ml-2">
      {SPOT_VISIBILITY_MAP[spot.visibility].emoji} {SPOT_VISIBILITY_MAP[spot.visibility].label}
    </span>
  )}
</div>
```

Imports: `import { SPOT_VISIBILITY_MAP } from '@/lib/spot-visibility'`.

- [ ] **Step 2: Build**

- [ ] **Step 3: Commit**

```bash
git add components/SpotDetail.tsx
git commit -m "feat: SpotDetail shows visibility badge for friends/private spots"
```

---

## Task 10: `/friends` Route + `FriendsClient` (subagent-eligible)

**Files:**
- Create: `app/(app)/friends/page.tsx`
- Create: `components/FriendsClient.tsx`

- [ ] **Step 1: Server Component**

```tsx
// app/(app)/friends/page.tsx
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import {
  listFriends,
  listIncomingRequests,
  listOutgoingRequests,
} from '@/actions/friends'
import FriendsClient from '@/components/FriendsClient'

export default async function FriendsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [friends, incoming, outgoing] = await Promise.all([
    listFriends(),
    listIncomingRequests(),
    listOutgoingRequests(),
  ])

  return <FriendsClient friends={friends} incoming={incoming} outgoing={outgoing} />
}
```

- [ ] **Step 2: Client Component**

Layout: 3-tab UI (similar styling to BottomSheet view-mode tabs). Default tab = `'requests'` if `incoming.length > 0`, else `'friends'`.

Each tab section:

**Friends tab:**
```tsx
{friends.length === 0 ? (
  <p className="text-sm text-gray-500 dark:text-gray-400 italic py-8 text-center">
    Du hast noch keine Freunde — suche jemanden im Tab &quot;Suchen&quot;.
  </p>
) : (
  <ul className="space-y-2">
    {friends.map((f) => (
      <li key={f.id} className="bg-white dark:bg-[#1e231a] rounded-xl p-3 flex items-center justify-between gap-3">
        <span className="text-sm text-gray-800 dark:text-gray-200">@{f.username ?? '—'}</span>
        <button onClick={() => handleRemove(f.id, f.username)} disabled={pending} className="text-sm text-red-500 hover:text-red-700 disabled:opacity-50">
          Entfernen
        </button>
      </li>
    ))}
  </ul>
)}
```

`handleRemove` calls `confirm(\`Freundschaft mit @${username} wirklich beenden?\`)`, then `removeFriend(id)`.

**Requests tab:** Two sub-sections — Eingehend, Ausgehend.

```tsx
<div className="space-y-6">
  <section>
    <h3 className="text-sm font-medium text-gray-800 dark:text-gray-200 mb-2">Eingehend</h3>
    {incoming.length === 0 ? (
      <p className="text-sm text-gray-500 italic">Keine eingehenden Anfragen.</p>
    ) : (
      <ul className="space-y-2">
        {incoming.map((r) => (
          <li key={r.id} className="bg-white dark:bg-[#1e231a] rounded-xl p-3 flex items-center justify-between gap-3">
            <span className="text-sm text-gray-800 dark:text-gray-200">@{r.username ?? '—'}</span>
            <div className="flex gap-2">
              <button onClick={() => handleAccept(r.id)} disabled={pending} className="text-sm text-primary font-medium hover:underline disabled:opacity-50">Annehmen</button>
              <button onClick={() => handleDecline(r.id)} disabled={pending} className="text-sm text-gray-500 hover:text-gray-700 disabled:opacity-50">Ablehnen</button>
            </div>
          </li>
        ))}
      </ul>
    )}
  </section>

  <section>
    <h3 className="text-sm font-medium text-gray-800 dark:text-gray-200 mb-2">Ausgehend</h3>
    {outgoing.length === 0 ? (
      <p className="text-sm text-gray-500 italic">Keine ausgehenden Anfragen.</p>
    ) : (
      <ul className="space-y-2">
        {outgoing.map((r) => (
          <li key={r.id} className="bg-white dark:bg-[#1e231a] rounded-xl p-3 flex items-center justify-between gap-3">
            <span className="text-sm text-gray-800 dark:text-gray-200">@{r.username ?? '—'}</span>
            <button onClick={() => handleCancel(r.id)} disabled={pending} className="text-sm text-gray-500 hover:text-gray-700 disabled:opacity-50">Anfrage zurückziehen</button>
          </li>
        ))}
      </ul>
    )}
  </section>
</div>
```

**Search tab:**

```tsx
const [searchInput, setSearchInput] = useState('')
const [searchResult, setSearchResult] = useState<FriendUser | null | 'not-found'>(null)
const [searchPending, startSearchTransition] = useTransition()

const doSearch = () => {
  const q = searchInput.trim()
  if (!q) return
  setSearchResult(null)
  startSearchTransition(async () => {
    const result = await searchUserByUsername(q)
    setSearchResult(result ?? 'not-found')
  })
}

// JSX:
<form onSubmit={(e) => { e.preventDefault(); doSearch() }} className="flex gap-2">
  <input
    value={searchInput}
    onChange={(e) => setSearchInput(e.target.value)}
    placeholder="Username eingeben…"
    className="flex-1 border border-gray-300 dark:border-gray-600 dark:bg-[#1a1f14] dark:text-gray-100 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
  />
  <button type="submit" disabled={searchPending} className="bg-primary text-white rounded-lg px-4 py-2 text-sm font-medium hover:bg-primary-dark disabled:opacity-50">
    Suchen
  </button>
</form>

{searchResult === 'not-found' && (
  <p className="text-sm text-gray-500 dark:text-gray-400 italic mt-4">Keinen User mit diesem Namen gefunden.</p>
)}

{searchResult && searchResult !== 'not-found' && (
  <div className="mt-4 bg-white dark:bg-[#1e231a] rounded-xl p-3 flex items-center justify-between gap-3">
    <span className="text-sm text-gray-800 dark:text-gray-200">@{searchResult.username}</span>
    <button onClick={() => handleSendRequest(searchResult.id)} disabled={pending} className="text-sm text-primary font-medium hover:underline disabled:opacity-50">
      Anfrage senden
    </button>
  </div>
)}
```

After successful actions, refetch the lists by calling the relevant action and updating local state, OR rely on `revalidatePath` from server actions and a `router.refresh()` call.

Recommendation: use `router.refresh()` from `next/navigation` after each mutation — keeps server data fresh, no client-side cache to manage.

Page wrapper: standard Plätzchen page chrome with back link to `/profil` or `/`.

- [ ] **Step 3: Build + tests**

- [ ] **Step 4: Commit**

```bash
git add "app/(app)/friends/" components/FriendsClient.tsx
git commit -m "feat: /friends route with 3 tabs (Freunde / Anfragen / Suchen)"
```

---

## Task 11: Profile Page — Freunde Link + Pending Counter

**Files:**
- Modify: `app/(app)/profil/page.tsx`

- [ ] **Step 1: Fetch counter**

```ts
import { countIncomingRequests } from '@/actions/friends'

// inside the page:
const incomingCount = await countIncomingRequests()
```

- [ ] **Step 2: Add link**

Insert above the "🆕 Was ist neu" link:

```tsx
<Link
  href="/friends"
  className="mt-10 flex items-center justify-between gap-2 w-full text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 py-2 px-4 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-[#1e231a] transition-colors"
>
  <span>👥 Freunde</span>
  {incomingCount > 0 && (
    <span className="bg-primary text-white text-xs px-2 py-0.5 rounded-full">{incomingCount}</span>
  )}
</Link>
```

(Move the existing "Was ist neu" link to `mt-3` so they stack nicely.)

- [ ] **Step 3: Build**

- [ ] **Step 4: Commit**

```bash
git add "app/(app)/profil/page.tsx"
git commit -m "feat: Freunde link with pending-counter badge in profile"
```

---

## Task 12: Final Docs + CHANGELOG

**Files:**
- Modify: `CHANGELOG.md` (NEW 0.6.0 entry at top)
- Modify: `AGENTS.md`
- Modify: `docs/feature-status.md` (Phase 6 ✅, Phase 7 gains deferred bullets, Phase 8 NEW)
- Modify: `docs/agent-handoff.md` (DB structure +friendships, Phase 6 patterns)
- Modify: `docs/architecture.md` (file structure, RLS section)
- Modify: `docs/database-schema.md` (friendships + visibility column + RLS updates)

- [ ] **Step 1: `CHANGELOG.md` — add 0.6.0 entry at top**

```md
## 0.6.0 — Privacy & Friends
*5. Mai 2026*

- 👥 Freundschaften: such jemanden per Username, sende und empfange Anfragen
- 🔒 Drei Sichtbarkeits-Stufen pro Spot: Öffentlich, Nur Freunde, Privat
- 🌍 Bestehende Spots bleiben öffentlich — du kannst sie jederzeit umstellen
- 📬 Counter im Profil zeigt offene Freundschaftsanfragen
- 🛡️ Datenbank-seitige Privatsphäre: Privat-Spots sind für andere nicht sichtbar (auch Stats und Tipps)
```

- [ ] **Step 2: `AGENTS.md`**

Update state: "Phase 6 complete." Add visibility/friendships rules:
- New rule: "Spots gain a `visibility` field (`public`/`friends`/`private`) — RLS enforces who sees what via `can_see_spot()` helper"
- Mention `actions/friends.ts` and helper functions

- [ ] **Step 3: `docs/feature-status.md`**

Convert Phase 6 section to ✅ with bullets reflecting what was built.

Update Phase 7 to include the deferred items:

```md
## Phase 7 – Polish & Tech-Debt 🔜

(... existing items ...)
- [ ] Friend-Spot-Filter im BottomSheet (z.B. "nur Spots von Freunden")
- [ ] Block-Mechanik (`status='blocked'` extension auf friendships)
```

Add new Phase 8:

```md
## Phase 8 – Social Polish 🔜

- [ ] In-App Notifications (eingehende Anfragen, Friend-Activity)
- [ ] Email-Alerts bei neuen Anfragen
- [ ] Public Profile Page `/u/:username`
- [ ] Friend-Activity-Feed
- [ ] Web Push Notifications
```

- [ ] **Step 4: `docs/agent-handoff.md`**

Add to DB structure section: `friendships` table.
Add Phase 6 patterns block: are_friends helper, can_see_spot helper, RLS cascade design, visibility picker pattern.
Update "Was als nächstes": Phase 7 (Polish) bullet list.

- [ ] **Step 5: `docs/database-schema.md`**

Add `friendships` table section.
Add `spots.visibility` column to spots table doc.
Add `can_see_spot` and `are_friends` helper functions.
Update RLS sections to reflect cascade.
Add migrations 009+010 to migrations table.

- [ ] **Step 6: `docs/architecture.md`**

Update file structure: add `actions/friends.ts`, `lib/spot-visibility.ts`, `components/VisibilityPicker.tsx`, `components/FriendsClient.tsx`, `app/(app)/friends/`. 
Update spots data flow note (visibility field).

- [ ] **Step 7: Commit**

```bash
git add AGENTS.md docs/ CHANGELOG.md
git commit -m "docs: catch up all docs to Phase 6 Privacy & Friends + new 0.6.0 changelog entry"
```

---

## Final Steps

- [ ] **Run full test suite**

```bash
npm test
```
Expected: 87 (baseline) + ≥11 (friends) + visibility tests = 100+.

- [ ] **Run full build**

```bash
npm run build
```
Expected: clean. Routes show `/friends`, `/spots/[id]/edit`, etc.

- [ ] **Manual QA list**

1. User A creates `friends`-spot → User B (no friendship) doesn't see it
2. A sends request to B by username → B sees in /friends → accepts → B now sees A's friends-spots
3. B removes friendship → A's friends-spots disappear from B's map
4. A sets spot to `private` → invisible to everyone but A
5. Pending counter on `/profil` updates after acceptance
6. Search for unknown username → "nicht gefunden"
7. Self-request blocked
8. Edit spot → visibility prefilled from current value
9. Public spot → no badge in detail. Friends/private → badge visible.

- [ ] **Branch finishing** (use superpowers:finishing-a-development-branch skill)

Present 4 options to user.

---

## Anti-Patterns to Avoid

- **Don't** make `friendships` symmetric with two rows — the directed model with OR-query is fine and simpler
- **Don't** weaken RLS for "performance" — the helper functions are plenty fast for current scale
- **Don't** add username fuzzy/LIKE search — explicit out-of-scope (privacy)
- **Don't** auto-accept requests — user must accept
- **Don't** filter spots client-side based on visibility — RLS does it server-side
- **Don't** show visibility badge on public spots — visual noise
- **Don't** forget to `revalidatePath('/')` after friend-state changes — affects what shows on the map
