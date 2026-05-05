# Phase 6 — Privacy & Friends Design Spec

**Date:** 2026-05-05
**Status:** Approved
**Goal:** Add a friendship system + per-spot visibility (public / friends / private), with RLS that enforces visibility cascading to descriptions, votes, and favorites.

## Vision

Plätzchen so far is fully public — every spot you add is visible to anyone. Phase 6 makes the social layer real: you can mark a spot as "Nur Freunde" or "Privat", request friendships by username, and the database enforces who sees what. This unlocks the use case "ich teile diesen Geheimspot nur mit meiner Wandergruppe."

## Architecture / Approach

Two migrations + new server actions + new `/friends` route + visibility picker added to existing forms + cascade-aware RLS.

- Friendship model: **directed** (`requester` + `addressee` + `status`). Pending → accepted on the same row. Two indexes (one per direction) keep lookups O(log n).
- Visibility: **enum** `spot_visibility ('public', 'friends', 'private')` on `spots`. Default `public` for new + bestand.
- RLS uses two helper functions to keep policies readable: `are_friends(a, b)` and `can_see_spot(spot_id)`. Both `STABLE SECURITY DEFINER`.
- UI: dedicated `/friends` page with 3 tabs; small pending-counter badge on the profile link.

No new client-side filter UI in BottomSheet — the SELECT policies on `spots` already filter what the user sees, so the existing tabs (Alle/Eigene/Favoriten) Just Work.

## Schema Changes

### Migration 009 — `friendships` table + helper

```sql
CREATE TABLE public.friendships (
  requester_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  addressee_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status text NOT NULL CHECK (status IN ('pending', 'accepted')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (requester_id, addressee_id),
  CHECK (requester_id <> addressee_id)
);

CREATE INDEX idx_friendships_addressee ON public.friendships(addressee_id, status);
CREATE INDEX idx_friendships_requester ON public.friendships(requester_id, status);

ALTER TABLE public.friendships ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read friendships they're part of"
  ON public.friendships FOR SELECT TO authenticated
  USING (auth.uid() = requester_id OR auth.uid() = addressee_id);

CREATE POLICY "Users can request friendship"
  ON public.friendships FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = requester_id AND status = 'pending');

-- Only addressee can flip pending→accepted
CREATE POLICY "Addressee can accept friendship"
  ON public.friendships FOR UPDATE TO authenticated
  USING (auth.uid() = addressee_id);

-- Both sides can delete (cancel-outgoing, reject-incoming, remove-accepted)
CREATE POLICY "Either side can delete friendship"
  ON public.friendships FOR DELETE TO authenticated
  USING (auth.uid() = requester_id OR auth.uid() = addressee_id);

CREATE TRIGGER set_friendships_updated_at
BEFORE UPDATE ON public.friendships
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Helper: is (a, b) an accepted friendship?
CREATE OR REPLACE FUNCTION public.are_friends(user_a uuid, user_b uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.friendships
    WHERE status = 'accepted'
      AND (
        (requester_id = user_a AND addressee_id = user_b)
        OR (requester_id = user_b AND addressee_id = user_a)
      )
  );
$$;
```

### Migration 010 — `spots.visibility` + RLS cascade

```sql
CREATE TYPE public.spot_visibility AS ENUM ('public', 'friends', 'private');
ALTER TABLE public.spots ADD COLUMN visibility public.spot_visibility NOT NULL DEFAULT 'public';

-- Helper: can the current auth.uid() see this spot?
CREATE OR REPLACE FUNCTION public.can_see_spot(p_spot_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.spots s
    WHERE s.id = p_spot_id
      AND (
        s.visibility = 'public'
        OR auth.uid() = s.created_by
        OR (s.visibility = 'friends'
            AND auth.uid() IS NOT NULL
            AND public.are_friends(auth.uid(), s.created_by))
      )
  );
$$;

-- Replace the existing public-read policy on spots
-- (current policy name TBD when implementing; verify via pg_policy first)
DROP POLICY IF EXISTS "Anyone can read spots" ON public.spots;
DROP POLICY IF EXISTS "Spots are publicly readable" ON public.spots;

CREATE POLICY "Spots visible per visibility level"
  ON public.spots FOR SELECT
  USING (
    visibility = 'public'
    OR auth.uid() = created_by
    OR (visibility = 'friends'
        AND auth.uid() IS NOT NULL
        AND public.are_friends(auth.uid(), created_by))
  );

-- spot_descriptions: gate on can_see_spot for SELECT + INSERT
DROP POLICY IF EXISTS "Anyone can read descriptions" ON public.spot_descriptions;

CREATE POLICY "Descriptions visible if spot visible"
  ON public.spot_descriptions FOR SELECT
  USING (public.can_see_spot(spot_id));

-- INSERT was already auth.uid() = user_id. Tighten to require visibility:
DROP POLICY IF EXISTS "Authenticated users can insert own description" ON public.spot_descriptions;

CREATE POLICY "Users can describe a visible spot"
  ON public.spot_descriptions FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id AND public.can_see_spot(spot_id));

-- spot_stats_votes: same cascade
DROP POLICY IF EXISTS "Anyone can read stats votes" ON public.spot_stats_votes;

CREATE POLICY "Stats votes visible if spot visible"
  ON public.spot_stats_votes FOR SELECT
  USING (public.can_see_spot(spot_id));

DROP POLICY IF EXISTS "Users can insert own stats vote" ON public.spot_stats_votes;

CREATE POLICY "Users can vote on visible spots"
  ON public.spot_stats_votes FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id AND public.can_see_spot(spot_id));

-- favorites: SELECT was already user_id-gated (private). Tighten INSERT.
DROP POLICY IF EXISTS "Users can insert own favorite" ON public.favorites;

CREATE POLICY "Users can favorite a visible spot"
  ON public.favorites FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id AND public.can_see_spot(spot_id));
```

NOTE on policy names: when implementing, query `SELECT polname FROM pg_policy` first to drop the actual existing names. The names above are educated guesses based on what was created in migrations 003/004/007/008.

### What this means for the existing aggregation function

`get_spot_aggregated_stats(p_spot_id)` is `SECURITY DEFINER` and reads `spot_stats_votes` directly. It currently bypasses RLS. With Phase 6 visibility, an unauthenticated/non-friend user could theoretically still call the RPC and get aggregated stats for a private spot. However:

- The user would need to know the `spot_id` (uuid, unguessable).
- Aggregated medians don't leak per-user data.

For now: **leave the function as `SECURITY DEFINER`** — pragmatically safe given uuid opacity. If the threat model tightens (Phase 7+), wrap with a `can_see_spot` guard at function start.

## Server Actions

### New: `actions/friends.ts`

```ts
interface FriendUser {
  id: string
  username: string | null
}

interface FriendRequest extends FriendUser {
  created_at: string
}

// Discovery
searchUserByUsername(query: string): Promise<FriendUser | null>

// Lifecycle
sendFriendRequest(addresseeId: string): Promise<{ error?: string }>
acceptFriendRequest(requesterId: string): Promise<{ error?: string }>
declineFriendRequest(requesterId: string): Promise<{ error?: string }>      // delete pending incoming
cancelFriendRequest(addresseeId: string): Promise<{ error?: string }>       // delete pending outgoing
removeFriend(otherUserId: string): Promise<{ error?: string }>              // delete accepted

// Reads
listFriends(): Promise<FriendUser[]>
listIncomingRequests(): Promise<FriendRequest[]>
listOutgoingRequests(): Promise<FriendRequest[]>
countIncomingRequests(): Promise<number>
```

All require auth. All call `revalidatePath('/friends')` on writes; `revalidatePath('/profil')` for counter freshness; `revalidatePath('/')` because friend-changes affect spot visibility on the map.

Validation:
- `sendFriendRequest`: refuse self-request, refuse duplicate (handle UNIQUE conflict), refuse if reverse already exists (B already requested A).
- `acceptFriendRequest`: refuses if no pending row from `requesterId` to `auth.uid()`.

### Extension: `actions/spots.ts`

`createSpot` and `updateSpot` accept `visibility: SpotVisibility` field. Default `'public'` if missing. Validate against `VALID_VISIBILITIES`.

### Extension: `actions/descriptions.ts`, `actions/stats.ts`, `actions/favorites.ts`

No code changes — the new RLS policies handle the visibility cascade automatically. Existing INSERT calls now fail with a generic error if the user isn't allowed to see the spot. Server actions return `{ error: <Supabase message> }` like before.

## UI

### New: `components/VisibilityPicker.tsx`

Mirror of `SpotTypePicker`. Pill buttons:
- 🌍 Öffentlich (default)
- 👥 Nur Freunde
- 🔒 Privat

Used in AddSpotForm + SpotEditForm. Emits `SpotVisibility` value.

### New: `lib/spot-visibility.ts`

```ts
export type SpotVisibility = 'public' | 'friends' | 'private'

export const SPOT_VISIBILITIES: readonly { key: SpotVisibility; emoji: string; label: string }[] = [
  { key: 'public',  emoji: '🌍', label: 'Öffentlich' },
  { key: 'friends', emoji: '👥', label: 'Nur Freunde' },
  { key: 'private', emoji: '🔒', label: 'Privat' },
] as const
```

### Modified: `AddSpotForm.tsx`

Add a `<VisibilityPicker>` between the type picker and the name input, with state `[visibility, setVisibility]<SpotVisibility>('public')`. Hidden input `name="visibility"` mirrors the value for the server action.

### Modified: `SpotEditForm.tsx`

Same picker, prefilled from current spot's visibility.

### Modified: `SpotDetail.tsx`

Below the type-badge, show a small visibility badge ONLY when `spot.visibility !== 'public'`:

```tsx
{spot.visibility !== 'public' && (
  <span className="text-xs text-gray-500 dark:text-gray-400 ml-2">
    {SPOT_VISIBILITY_MAP[spot.visibility].emoji} {SPOT_VISIBILITY_MAP[spot.visibility].label}
  </span>
)}
```

Public spots show no badge — most common case, no visual noise.

### New: `/friends` Route + Page

`app/(app)/friends/page.tsx` (Server Component):
- Verifies auth (redirect `/login` if not).
- Parallel fetches: `listFriends()`, `listIncomingRequests()`, `listOutgoingRequests()`.
- Renders `<FriendsClient>` with the three datasets.

`components/FriendsClient.tsx` (Client Component):
- Three tab buttons: "Freunde (N)", "Anfragen (M)", "Suchen". Tab state is local (no localStorage — single-screen feature).
- Default tab: "Anfragen" if any incoming pending; else "Freunde".
- Each tab is a section.

#### Tab 1: Freunde
List of accepted friends. Each row: `@username` + "Entfernen" button (calls `removeFriend`, with `confirm()`).

Empty: "Du hast noch keine Freunde — suche jemanden im Tab 'Suchen'."

#### Tab 2: Anfragen
Two sub-sections:

**Eingehend** (incoming pending):
- Each row: `@username` + "Annehmen" + "Ablehnen" buttons.

**Ausgehend** (outgoing pending):
- Each row: `@username` + "Anfrage zurückziehen" button.

Empty: "Keine offenen Anfragen."

#### Tab 3: Suchen
Input field "Username eingeben…" + "Suchen" button (or live search after 3+ chars with debounce).
- On result: card with `@username` + "Anfrage senden" button.
- Hide self in results.
- Hide if already a friend or pending: show status text instead.
- Not found: "Keinen User mit diesem Namen gefunden."

### Modified: `app/(app)/profil/page.tsx`

Add "👥 Freunde" link with pending-counter:

```tsx
<Link href="/friends" className="...">
  👥 Freunde
  {incomingCount > 0 && (
    <span className="ml-auto bg-primary text-white text-xs px-2 py-0.5 rounded-full">{incomingCount}</span>
  )}
</Link>
```

Server-side: `incomingCount = await countIncomingRequests()`.

### Modified: `MapHeader.tsx` (optional, light touch)

When the user has pending incoming requests, show a small indicator dot on the "Profil" link. **Defer this nice-to-have** — counter on `/profil` is sufficient.

## RLS Policy Names — Verification Step

Before applying Migration 010, query existing policy names:

```sql
SELECT polname FROM pg_policy WHERE polrelid IN (
  'spots'::regclass,
  'spot_descriptions'::regclass,
  'spot_stats_votes'::regclass,
  'favorites'::regclass
);
```

Use the actual names in `DROP POLICY` statements. The policy names in the migration above are best guesses.

## Files Touched

### New
- `supabase/migrations/009_phase6_friendships.sql`
- `supabase/migrations/010_phase6_visibility.sql`
- `lib/spot-visibility.ts`
- `actions/friends.ts`
- `__tests__/actions/friends.test.ts`
- `components/VisibilityPicker.tsx`
- `components/FriendsClient.tsx`
- `app/(app)/friends/page.tsx`

### Modified
- `actions/spots.ts` (`createSpot` + `updateSpot` accept visibility)
- `__tests__/actions/spots.test.ts` (visibility validation)
- `components/AddSpotForm.tsx` (integrate VisibilityPicker)
- `components/SpotEditForm.tsx` (integrate VisibilityPicker, prefill)
- `components/SpotDetail.tsx` (visibility badge)
- `components/SpotMap.tsx` (Spot interface gains `visibility`)
- `app/(app)/page.tsx` (select includes `visibility`)
- `app/(app)/admin/page.tsx` (select includes `visibility` if shown)
- `app/(app)/profil/page.tsx` (Freunde link + counter)
- `app/(app)/spots/[id]/edit/page.tsx` (select includes `visibility`)
- `AGENTS.md`, `docs/*.md`, `CHANGELOG.md`

## Out of Scope — Captured into Future Phases

Per the user's request: deferred items are written into Phase 7 / new Phase 8 to keep them visible.

**Phase 7 — Polish & Tech-Debt** (existing) gains:
- Friend-Spot-Filter im BottomSheet (z.B. "nur Spots von Freunden anzeigen")
- Block-Mechanik (`status = 'blocked'` extension)

**Phase 8 — Social Polish** (new):
- In-App Notifications (Eingehende Anfragen, Friend-Activity)
- Email-Alerts (Friend-Request-Mail über Supabase)
- Public Profile Page (`/u/:username` mit eigener Spot-Liste)
- Friend-Activity-Feed (was Freunde zuletzt eingetragen/favorisiert haben)
- Push-Notifications (Web Push)

## Testing

- **Unit (vitest):**
  - `actions/friends.ts` — TDD all six lifecycle functions, plus search.
  - `actions/spots.ts updateSpot` + `createSpot` — visibility-validation cases.
  - Manual SQL test of RLS policies after migrations applied (private spot invisible to non-owner, friends spot visible only to friends).
- **Manual (after merge):**
  1. User A creates spot with visibility=friends → User B (not friend) doesn't see it on map/list
  2. A sends request to B → B sees in Anfragen → accepts → B now sees friends-spots from A
  3. B removes friendship → A's friends-spots disappear from B's view
  4. A makes spot private → invisible to everyone except A
  5. Pending counter on profile updates correctly
  6. Search for unknown username → "nicht gefunden"
  7. Try sending self-request → blocked

## Implementation Strategy

1. Migration 009 (friendships table + helper)
2. Migration 010 (visibility column + RLS cascade) — **verify existing policy names first**
3. `lib/spot-visibility.ts`
4. `actions/friends.ts` + tests (TDD)
5. `actions/spots.ts` updateSpot+createSpot extended with visibility + tests
6. Spot interface + queries: add `visibility` field everywhere it matters (page.tsx, admin, edit page)
7. `VisibilityPicker` component
8. AddSpotForm + SpotEditForm integration
9. SpotDetail visibility badge
10. `/friends` route + `FriendsClient` (largest UI piece)
11. Profile page link + pending counter
12. Docs + CHANGELOG + memory updates

Estimated 12-15 commits.
