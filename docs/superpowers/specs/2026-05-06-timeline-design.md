# Timeline Feature — Design Spec

**Status:** Approved 2026-05-06
**Target version:** v0.9.0 (minor — first feature release in the 0.9 line)
**Brainstorm session:** 1189-1778098663

## Goal

Plätzchen bekommt eine `/timeline`-Route, die die Karte als temporale Visualisierung zeigt: ein Time-Scrubber mit Aktivitäts-Histogramm und Play-Button am unteren Bildschirmrand steuert, welche Spots aktuell sichtbar sind. Bei Bewegung des Scrubbers erscheinen/verschwinden Pins basierend auf ihrem `created_at`. Drei Tabs (Alle/Eigene/Freunde) filtern den Datensatz.

## Brainstorming Outcomes

| # | Frage | Entscheidung |
|---|---|---|
| 1 | Konzept | **Map-View mit Time-Scrubber unten** (nicht Liste) |
| 2 | Scrubber-Stil | **Histogramm + subtiler Play-Button** (Variante C aus q2) |
| 3 | Tabs | **Alle / Eigene / Freunde** (gleiche Filter-Semantik wie BottomSheet auf /map) |
| 4 | Pin-Verhalten | **Kumulativ** — alle Spots mit `created_at ≤ scrubberTime` sichtbar |
| 5 | Granularität | **Adaptiv** — Tag wenn Range <90 Tage, sonst Woche, sonst Monat |
| 6 | Pop-in-Animation | **Nur bei Play** — manuelles Scrubben ist instant |
| 7 | Pin-Klick | **Deaktiviert** — pure Visualisierung, kein Popup |
| 8 | Route | **`/timeline`** (englischer Slug, deutsche UI = "Verlauf") |
| 9 | Nav-Eintrag | **MapHeader** oben, neben Profil/Login, mit `IconHistory` |
| 10 | Performance | **Client-side Filter + unstable_cache + URL-Hash-State** — keine Server-Aggregation, keine Materialized Views |

## Routes & Architecture

### New Route

```
/timeline   Server Component, anon-aware (RLS via can_see_spot)
```

### File Structure

```
app/(app)/timeline/
  page.tsx                 Server: fetches spots, renders client shell
  TimelineClient.tsx       Client: scrubber + map + state management

components/timeline/
  TimelineMap.tsx          Client: leaflet wrapper that filters pins by scrubber-now
  TimelineScrubber.tsx     Client: histogram + slider + play button
  TimelineHistogram.tsx    Pure component: SVG bars
  useTimelineBucketing.ts  Hook: adaptive day/week/month bucketing

lib/
  timeline-data.ts         Server: getTimelineSpots() + cache
```

### Existing files modified

| File | Change |
|---|---|
| `components/MapHeader.tsx` | Add `IconHistory` link to `/timeline` (between logo and ThemeToggle) |
| `proxy.ts` | `/timeline` is anon-readable, no protection — RLS handles access |

## Page Layout (full viewport, like /map)

```
┌────────────────────────────────────────────────────┐
│  [📍 Plätzchen logo]  [🕐 Verlauf]  [☀️] [Profil] │  ← MapHeader (existing + new link)
├────────────────────────────────────────────────────┤
│                                                    │
│              MAP (full-bleed, leaflet)             │
│                                                    │
│         🟢   🟢          🟢                        │  ← visible pins (created ≤ now)
│              🫥   🟢                               │  ← future pins ghosted (15% opacity)
│                                                    │
│                                                    │
├────────────────────────────────────────────────────┤
│  [TabBar:  Alle | Eigene | Freunde]                │  ← floating, top of scrubber
│                                                    │
│  28. April 2026                       5 Plätzchen  │  ← current scrub date + count
│  ┌─┬─┬─┬─┬─┬─┬─┬─┬─┬─┬─┬─┬─┬─┐                    │
│  │ │█│ │█│█│█│ │█│█│ │ │ │ │ │  ◀ histogram        │
│  └─┴─┴─┴─┴─┴─┴─┴─┴─┴─┴─┴─┴─┴─┘                    │
│  vor 14 Wo                       diese Woche       │  ← axis labels
│  ┌──┐  ●─────────────────                          │  ← play btn + slider
│  │▶│                                                │
│  └──┘                                               │
└────────────────────────────────────────────────────┘
```

**Mobile:** identical, scrubber sticks to bottom-safe-area.

## Scrubber UX Detail

### Bottom panel (`<aside aria-label="Zeit-Steuerung">`)

- **Position:** sticky bottom, full-width, ~140px height (mobile) / ~120px (desktop)
- **Background:** `rgba(20,24,15,.92)` with `backdrop-blur-md`, top-border `rgba(94,158,62,.2)`
- **Padding:** 12px 14px

### Layout (top-to-bottom)

1. **Tabs** (`role="tablist"`)
   - Pill-style segmented control: `Alle`, `Eigene`, `Freunde`
   - Active: bg `#5e9e3e`, text `#14180f`
   - Inactive: text `#8aa376`
   - Same UX-pattern as BottomSheet but bottom-anchored

2. **Now-line**
   - Left: current scrubber date — Geist Sans 13px bold (e.g., "28. April 2026")
   - Right: visible-pins count — Geist Mono 9px (e.g., "5 Plätzchen")

3. **Histogram** (32px tall)
   - Bars colored: `#5e9e3e` (past) | `#fff` with glow (current bucket) | `rgba(94,158,62,.3)` (future)
   - Click on a bar = scrubber jumps there
   - 14 bars max on mobile, ~30 on desktop (CSS `flex` distribution)
   - Tooltip on hover (desktop): "X Plätzchen in der Woche vom DD.MM."

4. **Axis labels**
   - Left: "vor N Wo/Mo" (relative)
   - Right: "diese Woche" / "heute"

5. **Play row**
   - Left: 30px circle play button (`▶` → `⏸` toggle)
   - Right: slider (range input styled like the histogram cursor)
   - Hidden on small screens? No — keep, just shrink to 28px.

### Play behavior

- Click `▶`: animate scrubber from current position to end at speed
- Speed: fixed at 1× (one bucket per 600ms; with 14 weekly buckets, full play takes ~8.4s)
- During play: pins fresh-pop-in via CSS animation `pin-pop` (0.5s ease-out, scale 0→1.15→1)
- Reaches end: stops, scrubber stays at "now"
- Click `⏸` mid-play: pause
- Manual scrub during play: pauses play, takes manual control

### Manual scrub

- Drag slider OR click on histogram bar → scrubber jumps
- No pop-in animation (instant)
- Visible pins update synchronously (`useMemo` filter)

### Bucket adaptive logic (`useTimelineBucketing`)

```ts
function pickBucket(rangeMs: number): 'day' | 'week' | 'month' {
  const days = rangeMs / (1000 * 60 * 60 * 24)
  if (days < 90) return 'day'
  if (days < 730) return 'week'  // up to 2 years
  return 'month'
}
```

Bar count per bucket: clamp to ~14 on mobile, ~28 on desktop. If actual buckets exceed cap, group into wider intervals (e.g., 100 days at "day" granularity → switch to weekly automatically).

## Map Behavior

### Visible pins

```ts
const visibleSpots = useMemo(
  () => spots.filter((s) => s.created_at <= scrubberNow),
  [spots, scrubberNow]
)
```

- Cumulative — show everything created at or before `scrubberNow`
- Filtered by tab: `Alle` = all, `Eigene` = `created_by === userId`, `Freunde` = `friendIds.has(created_by)` (excluding self)

### Future-pins ghosting (optional decoration)

- Spots with `created_at > scrubberNow` rendered with `opacity: 0.15` and slight gray-scale
- Helps user see WHERE future spots will appear → context, not a spoiler
- Toggleable in spec? **Default ON** for "Alle" tab; OFF for "Eigene"/"Freunde" (less noisy when filtering down).

### No interaction

- Markers have `interactive: false` (Leaflet) — no popup on click
- Cursor stays default (no pointer)
- This is the explicit decision from Q4c (Klick deaktiviert)

### Map cluster

- Reuse existing `react-leaflet-cluster` from /map
- Cluster icon: same `buildClusterSvg` from `lib/spot-marker-svg.ts`
- Clusters update with scrubber (only count visible pins)

### Auto-fit-bounds on tab change

- When user switches tab and the new dataset is non-empty: fly map to fit all visible pins
- Avoids "I switched to my own spots and the map shows public spots' area"

## State & URL

### URL params (source of truth)

```
/timeline?at=2026-04-15&tab=mine
```

- `at`: ISO date for scrubber position (default = today)
- `tab`: `all` | `mine` | `friends` (default = `all`)
- Update via `router.replace` on change (no history pollution)
- Bookmarkable, shareable, browser-back works

### Initial state

- `at` → today (max position) so user sees current map; can scrub back
- `tab` → `all` for anonymous users; `all` for authed too (most useful default)

### Reset

- Logo click → `/` (already done)
- "Verlauf" link click while on /timeline → `?at=` removed, jumps to today

## Data Flow

```
Server (page.tsx)
├─ getUser()
├─ getTimelineSpots(userId | null)   ← unstable_cache, tag 'marketing-stats'
│   returns Array<{id, lat, lng, type, created_at, created_by}>
├─ listFavoriteSpotIds(userId)         ← only if authed (already exists)
├─ listFriends(userId)                 ← only if authed
└─ Pass to TimelineClient

Client (TimelineClient.tsx)
├─ Read URL: at, tab
├─ scrubberNow state synced from URL
├─ filteredByTab = applyTabFilter(spots, tab, userId, friendIds)
├─ visibleSpots = filteredByTab.filter(created_at ≤ scrubberNow)
├─ histogram = computeBuckets(filteredByTab, granularity, range)
└─ <TimelineMap spots={visibleSpots} ghostSpots={tab==='all' ? futureSpots : []} />
   <TimelineScrubber histogram={histogram} now={scrubberNow} onScrub={setScrubberNow} />
```

## Caching

```ts
// lib/timeline-data.ts
export const getTimelineSpots = unstable_cache(
  async () => {
    const supabase = createAnonReadClient()
    const { data } = await supabase
      .from('spots')
      .select('id, lat, lng, type, created_at, created_by, visibility')
      .order('created_at', { ascending: true })
    return data ?? []
  },
  ['timeline-spots'],
  { revalidate: 60, tags: ['marketing-stats'] }
)
```

- Same tag as marketing-stats → existing `updateTag('marketing-stats')` calls in actions/spots.ts already invalidate this
- **For authed users**, the anon client filters to public spots via RLS. Authed user's own private/friends-only spots come from a SECOND, user-bound query — un-cached, but fast (limited rows).

```ts
// In timeline page.tsx server-component:
const [publicSpots, ownAndFriendsSpots] = await Promise.all([
  getTimelineSpots(),                                 // cached
  user ? getOwnAndFriendsSpotsTimeline(user.id) : [], // un-cached, fast
])
const allSpots = mergeUnique([...publicSpots, ...ownAndFriendsSpots])
```

This is the same dual-query pattern as `/map` — public spots cached, private/friends not.

## Performance Considerations

| Scale | Strategy | Status |
|---|---|---|
| 0 – 5,000 spots | Naive: server fetches all visible spots, client filters in-memory | **Implementation target** |
| 5,000 – 50,000 spots | Server-side bucketing for histogram + bbox-query for pins | Future |
| 50,000+ spots | PostGIS index + materialized snapshots | Future |

For beta: ~50 spots → trivial. We have headroom for 100× growth before any optimization is needed.

### Frame budget

- Scrub event triggers `useMemo(visibleSpots)`. For 5,000 spots, filter takes <1ms.
- Leaflet adds/removes markers based on React reconciliation. Memoize marker icons (already cached in `getSpotIcon`).
- Throttle scrubber input to `requestAnimationFrame` — prevents excessive re-renders during fast drags.

### Bundle

- /timeline shares /map's leaflet chunk (already deferred via dynamic import)
- New code: scrubber/histogram (~5KB)
- No new heavy dependencies

## A11y

- `<input type="range">` natively keyboard-accessible (←/→ to scrub, Home/End)
- Tab focus order: skip-link → MapHeader → tabs → play button → slider → histogram bars (clickable)
- `aria-valuemin`, `aria-valuemax`, `aria-valuenow` on slider
- `aria-live="polite"` on the date label so screen readers announce position changes
- `prefers-reduced-motion`: disables pin-pop animation entirely (existing global rule covers it; play still works, pins just appear instantly)
- Histogram bars: `<button>` elements, label "X Plätzchen, Woche vom DD. MM."

## Out-of-Scope (deferred / not in 0.9.0)

- Timeline as social activity feed (votes, friendships) — would be a separate feature
- Date-range picker (start + end) — only single-point scrubber for now
- Sharing a "moment" via URL — already works via URL hash, but no explicit share button
- Spot-grouping by user (color-by-creator) — single primary green for all
- Embed mode (e.g., for blog posts) — future
- Mobile gesture: pinch-to-zoom histogram time scale — future
- Keyboard playback shortcut (space = play/pause) — could add easily; defer until needed

## Acceptance Criteria

- [ ] `/timeline` route exists and renders for anon and authed users
- [ ] MapHeader shows IconHistory link to `/timeline`
- [ ] Scrubber-now defaults to today (max position)
- [ ] Pin filter is cumulative (`created_at ≤ scrubberNow`)
- [ ] Tabs filter dataset: `all` (default), `mine`, `friends`
- [ ] Histogram shows bars with correct counts per bucket; current bucket highlighted
- [ ] Click on histogram bar = scrubber jumps to bar center
- [ ] Drag slider = scrubber moves
- [ ] Play button animates scrubber from current to end at fixed speed; pins pop-in during play
- [ ] Manual scrub during play = pauses play
- [ ] Bucketing adapts: <90d → day, <730d → week, else month
- [ ] URL params `?at=...&tab=...` reflect state and survive reload
- [ ] Bookmark/share preserves position
- [ ] Pin click = no-op (no popup)
- [ ] Future-pins ghosted on `Alle` tab; off on `Eigene`/`Freunde`
- [ ] Auto-fit map bounds when tab changes (if dataset non-empty)
- [ ] `prefers-reduced-motion`: pop-in disabled
- [ ] Empty state when tab has zero spots: "Du hast noch keine Plätzchen eingetragen" + CTA `/spots/new`
- [ ] CHANGELOG entry for 0.9.0 with German user-speak
- [ ] Git tag `v0.9.0` annotated and pushed
