# Architektur

## Überblick

Plätzchen ist eine Next.js 16 App Router Anwendung mit Supabase als Backend. Community-App zum Sammeln und Bewerten von netten Pause-Spots beim Wandern (Bänke, Aussichtspunkte, Schutzhütten, Rastplätze, Liegewiesen, Wasserstellen).

## Tech Stack

| Technologie | Version | Zweck |
|---|---|---|
| Next.js | 16.2.4 | Framework (App Router) |
| React | 19.2.4 | UI |
| TypeScript | 5.x | Typsicherheit |
| Tailwind CSS | v4 | Styling (CSS-first, `@theme inline` für Custom-Colors) |
| Supabase | @supabase/ssr 0.10.x | Auth + Datenbank + Storage |
| react-leaflet | 5.x | Karte |
| react-leaflet-cluster | 4.x | Marker-Clustering |
| exifr | 7.1.x (mini bundle) | Client-side EXIF-GPS-Auslese (Phase 9.3) |
| @tabler/icons-react | 3.x | Icon-Set (UI + Drop-Pin-Marker-Paths) |
| motion | 12.x | Landing-Page-Animationen (mit `useReducedMotion`) |
| @vercel/speed-insights | 1.x | RUM (LCP/INP/CLS, Phase 8.6.1) |
| Vitest | 4.x | Unit-Tests (`environment: 'node'`, kein jsdom — pure-logic-only) |

## Rendering-Strategie

- **Server Components** laden Daten serverseitig via Supabase SSR
- **Client Components** (`'use client'`) nur wo nötig: Karte, Formulare, BottomSheet, EmojiPicker, SpotDetail, StatsVoteForm, SpotDescriptionFeed
- **Server Actions** (`'use server'`) für alle Mutationen: Auth, createSpot, deleteSpot, upsertStats, uploadSpotPhoto, list/upsert/deleteDescription

## Routen-Übersicht

| Route | Component | Auth | Zweck |
|---|---|---|---|
| `/` | `app/(marketing)/page.tsx` | anon | Landing-Page mit Living Numbers + Hero-Map (Phase 8) |
| `/map` | `app/(app)/map/page.tsx` | anon-readable, authed-write | Hauptkarte mit BottomSheet + FAB |
| `/timeline` | `app/(app)/timeline/page.tsx` | anon-readable | Time-Scrubber + Histogramm (Phase 9) |
| `/spots/from-photo` | `app/(app)/spots/from-photo/page.tsx` | authed | Foto-First-Add-Flow (Phase 9.3, primärer Add-Pfad) |
| `/spots/new` | `app/(app)/spots/new/page.tsx` | authed | Legacy Quick-Add (via "Ohne Foto"-Link erreichbar) |
| `/spots/[id]/edit` | `app/(app)/spots/[id]/edit/page.tsx` | authed (owner) | Edit Name/Type/Visibility |
| `/spots/[id]/edit-photo` | `app/(app)/spots/[id]/edit-photo/page.tsx` | authed (owner) | Foto nachträglich hochladen |
| `/profil` | `app/(app)/profil/page.tsx` | authed | Marker-Emoji, Theme, Friends-Link, Logout |
| `/friends` | `app/(app)/friends/page.tsx` | authed | 3-Tab Friend-Management (Phase 6) |
| `/changelog` | `app/(app)/changelog/page.tsx` | authed | User-facing release notes |
| `/admin` | `app/(app)/admin/page.tsx` | admin | Stats, User-Management, Spot-Liste |
| `/admin/users/[id]` | `app/(app)/admin/users/[id]/page.tsx` | admin | User-Detail |
| `/admin/moderation` | `app/(app)/admin/moderation/page.tsx` | admin | Tipps-Moderation |
| `/login` + `/signup` | `app/(auth)/...` | anon | Auth-Pages |

## Datenfluss `/map`

```
app/(app)/map/page.tsx (Server Component)
  ├── Supabase: spots (incl. type+visibility) + getUser() + is_admin + favoriteIds (parallel)
  ├── MapHeader (Server Component) ← Logo + ThemeToggle + Profil-Link + Timeline-Link
  └── MapLayout (Client Component) ← koordiniert State zwischen Map und Sheet
      ├── selectedSpotId, flyTarget, userPosition, gpsState, isAdmin, favoriteIds (State)
      ├── GPS-Banner (denied/unavailable + dismissible)
      ├── SpotMapClient → SpotMap (dynamic ssr:false)
      │   ├── LocationController (2-Phase GPS via ref-Pattern, ruft onPositionFound/onLiveUpdate)
      │   ├── FlyController (flyTo bei Listentap)
      │   ├── CenterController (📍 Button, disabled wenn !available, resettet followBroken)
      │   ├── FollowController (Phase 9.3 — flyTo bei live-update wenn enabled, pan-to-break)
      │   ├── AdminClickController (Map-Click → /spots/new, nur isAdmin)
      │   ├── MarkerClusterGroup mit Drop-Pin-SVG-DivIcons (cached) + SpotPopup
      │   └── User-Position-Marker (Emoji aus profiles.marker_emoji oder localStorage-Fallback)
      └── BottomSheet (Client Component)
          ├── 4-Tab TabBar: Alle / Eigene / Freunde / Favoriten
          ├── Liste: Spots mit Type-Icon + Distanz + Tap → fly + detail
          └── Detail: SpotDetail (Foto-Header next/image, Type-Badge, Stats, VoteForm, DescriptionFeed, ShareButton)
```

## Route-Schutz

`proxy.ts` (Next.js 16 Middleware — **nicht** `middleware.ts`) schützt alle `/spots/*`-Routen (außer der `/spots/from-photo` Auth-Guard im Page-Component selbst). `/map` und `/timeline` sind anon-readable.
Nutzt `getUser()` (JWT-Validierung), nicht `getSession()` (nur Cookie-Lesen).

## GPS-Strategie

### Default (non-tracking) — Two-Phase Initial Fix
1. **localStorage-Cache**: Karte startet sofort an letzter Position. Marker greyscale bis Phase 1 fertig.
2. **Phase 1** — `getCurrentPosition({ enableHighAccuracy: false })`: Netzwerk < 1s, ~100-300m.
3. **Phase 2** — `watchPosition({ enableHighAccuracy: true })`: GPS ~10m, fliegt sanft per `map.flyTo`. Stoppt nach erstem `accuracy < 80m` Fix via `clearWatch`.
4. **onPositionFound**: SpotMap meldet Position an MapLayout → BottomSheet zeigt Distanz.
5. **onGpsStateChange**: SpotMap meldet `'available' | 'denied' | 'unavailable'` an MapLayout — steuert Banner + Sheet-Hint + Center-FAB-Disable.

### Live-Tracking (Phase 9.3, opt-in pro Session)
Toggle-Button neben Center-FAB aktiviert permanent-running watchPosition + auto-follow.

- `liveTracking` state lives in SpotMap (kein localStorage — verhindert versehentliches Akku-Drain across Sessions).
- LocationController liest `liveTracking` + `onLiveUpdate` aus `useRef`s — Effect dep-array enthält sie NICHT. Toggle wechselt erfolgt seamless ohne watchPosition-Teardown.
- Initial-Fix-Path (`accuracy < 80m`): wie vorher, aber bei aktivem Tracking wird NICHT `clearWatch` aufgerufen.
- Live-Update-Path (`liveTracking && lockedFirstFix && accuracy < 200m`): ruft `onLiveUpdate` → SpotMap updated `userPosition`. KEIN `localStorage`-Write (würde Main-Thread blocken).
- `FollowController` macht `map.flyTo(pos, currentZoom, { duration: 0.5 })` wenn `enabled && !followBroken`. `useMapEvents({ dragstart, zoomstart })` setzt `followBroken=true` bei User-Pan oder Mobile-Pinch-Zoom.
- Re-engage: Toggle erneut tappen (resettet `followBroken=false`) ODER Center-FAB klicken.

## Foto-First-Flow (Phase 9.3)

`/spots/from-photo` ist seit Phase 9.3 der Default-Add-Pfad (FAB navigiert dorthin). `/spots/new` mit Lat/Lng-Query-Params bleibt erreichbar als "Ohne Foto eintragen"-Link.

```
PhotoFirstForm (Client Component, single page)
  1. Photo-Picker (Drop-Zone-Style, gefolgt von "Ohne Foto"-Link zu /spots/new)
  2. handlePhotoPick(file):
     a. readExifGps(file) ← MUSS vor URL.createObjectURL und resizeImage laufen (canvas-resize strippt EXIF)
     b. EXIF-Hit  → setLat/Lng aus EXIF, grüner Banner
        EXIF-Miss → navigator.geolocation.getCurrentPosition (one-shot Fallback), gelber Banner
        Beide-fehlen → manueller Map-Tap, gelber Banner mit "tippe auf die Karte"
     c. setPhoto + setPreview (Race-Guard via pickGenRef-Counter — stale resolutions werden discarded)
  3. PinPickerMapClient (dynamic ssr:false) zeigt tappable/draggable Pin (reuse buildPinSvg(type), eigener ICON_CACHE)
  4. SpotTypePicker + VisibilityPicker + Name-Input erscheinen progressive disclosure
  5. handleSubmit:
     a. try { resizeImage(photo) → FormData → createSpot(undefined, fd) → router.push('/map') }
     b. catch (err) { setError(err.message) }
  cleanup: useEffect → URL.revokeObjectURL(preview) on unmount
```

`lib/exif-utils.ts` (pure-logic, 7 Unit-Tests in `__tests__/lib/exif-utils.test.ts`):
- `readExifGps(file): Promise<{lat,lng}|null>` graceful-fallback bei non-image, fehlendem EXIF, 0/0 zeroed coords, Parser-Throws.
- Importiert `exifr` über deep-path `exifr/dist/mini.esm.mjs` (~10kb gzipped GPS-only). HEIC nicht supported — app accept ist `image/jpeg,image/png,image/webp`.

## Spot-Types

`lib/spot-types.ts` ist Source-of-Truth. 6 Typen mit Tabler-Icon + DE-Label. UI-Code zieht aus `SPOT_TYPE_MAP[spot.type]` — keine Hardcodes.

| Type | Tabler-Icon | Label | Emoji (Daten-Stopgap) |
|---|---|---|---|
| bench | `IconArmchair` | Bank | 🪑 |
| viewpoint | `IconMountain` | Aussichtspunkt | 🏔️ |
| shelter | `IconTent` | Schutzhütte | ⛺ |
| picnic | `IconBasket` | Rastplatz | 🧺 |
| meadow | `IconPlant2` | Liegewiese | 🌿 |
| water | `IconDroplet` | Wasserstelle | 💧 |

`SpotTypeMeta` hat: `key`, `emoji` (Daten-Stopgap für Fallbacks), `label`, `Icon` (Tabler-Component für UI-Render).

Map-Marker seit Phase 8.4: Drop-Pin-SVGs via `lib/spot-marker-svg.ts buildPinSvg(type)` — Tabler-Icon-Paths sind hardcoded im SVG-String (bei Tabler-Library-Update gegenchecken). `ICON_CACHE: Map<SpotType, L.DivIcon>` in `SpotMap.tsx` und (separat) in `PinPickerMap.tsx`. Cluster nutzen `buildClusterSvg(count)`.

## Stats-Aggregation

Community-Votes in `spot_stats_votes` (ein Row pro User/Spot). Aggregation per Postgres-Funktion `get_spot_aggregated_stats`:
- Komfort/Aussicht/Zustand/Rarität: `PERCENTILE_CONT(0.5)` (Median)
- Schatten: `MODE()` (häufigster Wert)
- Extras: Items die ≥50% der Votes haben

Stats sind alle optional und universal (nicht type-spezifisch). Type-aware Visibility ist Phase 7+.

## Spot-Stats State-Flow

```
StatsVoteForm → upsertStats (Server Action)
             → getSpotStats (Server Action)
             → onSaved(aggregated, vote) Callback
             → SpotDetail State Update
```

## Description-Feed (Phase 4)

Community-Tipps unter SpotDetail. Ein Tipp pro (spot, user), 280-char Limit. Eigener Tipp prominent oben (Editor-Modus inline), andere darunter chronologisch.

```
SpotDescriptionFeed (mount)
  → listDescriptions(spotId) (Server Action via useEffect)
  → split: own vs others
  → Editor (logged-in) / Login-CTA (anonym)
  → upsertDescription / deleteDescription
  → re-fetch + setState
```

## Dark Mode — Forest Deep

- Theme: `globals.css` `.dark {}` setzt CSS-Vars, Tailwind-Utilities nutzen explizite Hex-Werte
- Hintergrundfarben im Dark Mode: bg `#141810`, surface `#1e231a`, chips `#2a3124`, border `#2a2f24`
- **ACHTUNG `@theme inline`**: Tailwind backt Werte literal ein. CSS-Var-Overrides in `.dark` wirken NICHT auf Tailwind-Utilities. Immer explizite `dark:bg-[#hex]` nutzen.
- Kacheln: CSS-Filter `invert(100%) hue-rotate(180deg)` auf `.leaflet-tile-pane`
- FOUC-Prevention: Inline-Script in `layout.tsx <head>` — `suppressHydrationWarning` auf `<html>`

## Supabase Storage

Bucket `bench-photos` (interner Name beibehalten): public read, authenticated write (owner-only update/delete via `owner_id`).
Upload-Pfad: `{spot_id}/photo` mit `upsert: true`.
Photo-URL gespeichert in `spots.photo_url` (öffentliche CDN-URL).
Resize on Upload via `lib/image-utils.ts` (max 1600px, WebP @0.8, JPG @0.85 Fallback).

## Admin-Funktionen

- `/admin` Route — nur für `is_admin = true`, sonst redirect `/`
- `lib/supabase/admin.ts`: Service-Role-Client — NUR für `auth.admin.listUsers()`
- `actions/admin.ts`: normaler User-Client mit RLS-Policies (`adminDeleteSpot`)
- Admin Click-to-Add: `isAdmin` prop-Kette → `AdminClickController` in SpotMap → Map-Click → `/spots/new?lat=X&lng=Y`

## Lokale Nutzer-Einstellungen (localStorage)

| Key | Inhalt |
|---|---|
| `benchmarks_last_location` | `[lat, lng]` |
| `benchmarks_user_emoji` | z.B. `"🧍‍♂️"` |
| `benchmarks-theme` | `"dark"` oder nicht gesetzt |
| `benchmarks-gps-banner-dismissed` | `"true"` wenn GPS-Warnung weggeklickt |
| `plaetzchen-view-mode` | `"all" \| "mine" \| "favorites"` (BottomSheet-Tab, Phase 5) |

(Alte Keys behalten ihren `benchmarks_` Prefix für Backward-Compatibility — User mit Bestandsdaten verlieren sonst Einstellungen. Neue Keys ab Phase 5 nutzen `plaetzchen-` Prefix.)

## Wichtige Gotchas

| | |
|---|---|
| **Middleware** | `proxy.ts` (nicht `middleware.ts`), `export default function proxy(req)` |
| **Geschützte Routen** | `protectedRoutes = ['/spots']` mit `startsWith` — deckt alle Sub-Routen ab |
| **searchParams** | Async in Next.js 16: `await searchParams` |
| **Leaflet SSR** | Nur Client, via `dynamic(..., { ssr: false })` in SpotMapClient |
| **Supabase Key** | `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (nicht ANON_KEY) |
| **Tailwind v4** | Arbitrary values: `z-[1000]` (mit Klammern) |
| **SpotPopup Hooks** | Hat `'use client'` — Leaflet Popup mountet/unmountet bei Open/Close |
| **params async** | Next.js 16: `params: Promise<{id: string}>` — `use(params)` in Client Components |
| **Storage Bucket** | `bench-photos` (interner Name beibehalten trotz Rebrand) |

## UI-Components-Library (`components/ui/`)

Konsolidierte wiederverwendbare Components — seit Welle A (v0.9.1) und Welle B (v0.9.2). **Bei neuen Pages/Forms IMMER zuerst hier nachsehen statt inline-Tailwind zu schreiben.**

| Component | Phase | API | Verwendung |
|---|---|---|---|
| `<PageHeader>` | 9.1 | `title subtitle? backHref backLabel` | Alle Pages mit Back-Link |
| `<Card>` | 9.1 | `padding? className?` | Card-Wrapper (graduelle Migration) |
| `<ListRow>` | 9.1 | `Icon? label rightSlot? tone? href\|onClick` | Menü-/Listen-Items, polymorphic Link/Button |
| `<Button>` | 9.2 | `variant size? fullWidth? loading? Icon?` | 4 Variants (primary/ghost/outline/danger) × 2 Sizes (sm/md) |
| `<TabBar>` | 9.2 | `<T> tabs active onChange ariaLabel` | Generic underline-Style, ARIA roving-tabindex |
| `<SearchInput>` | 9.2 | `value onChange onClear? placeholder` | IconSearch links, optional Clear-X rechts |

Bewusst NICHT abstrahiert (zu wenig Repetition oder zu spezialisiert): Form-Components (Input/Textarea/Select), Modal/Dialog, Toast. Diese kommen als "Welle C" wenn Bedarf da ist.

## Performance-Architektur

### ISR-Cache (Phase 8.6)
- Marketing-Stats (Landing-Page-Counts, Hero-Spots) sind via `unstable_cache(fn, key, { revalidate: 60, tags: ['marketing-stats'] })` gecached.
- Timeline-Daten (`getPublicTimelineSpots`) nutzen denselben Tag.
- Spot-Mutationen (`createSpot`, `deleteSpot`, `updateSpot`) rufen `updateTag('marketing-stats')` aus `'next/cache'` (Next.js 16 — `revalidateTag` ist deprecated).
- Cookie-freier Read-Client für cached scopes: `createAnonReadClient()` aus `lib/supabase/anon-read.ts` (cookies() throws inside unstable_cache).

### Loading-States (Phase 8.6)
`app/(app)/map/loading.tsx`, `app/(app)/admin/loading.tsx` rendern Skeleton-Komponenten während Server-Renders.

### Lazy-Mount HeroMapPreview (Phase 8.6.1)
IntersectionObserver in `app/(marketing)/page.tsx` lädt das ~148kb Leaflet-Bundle erst wenn Hero-Map nahe Viewport ist.

### Speed-Insights (Phase 8.6.1)
`@vercel/speed-insights` in `app/layout.tsx` für Core-Web-Vitals-RUM.

## Timeline (Phase 9)

Route `/timeline` zeigt Karte + Time-Scrubber + adaptives Histogramm + Play-Button.

```
lib/timeline-data.ts (server-only, importiert supabase server-client)
  ↓ exportiert
lib/timeline-types.ts (client-safe, pure types + applyTabFilter)
  ↓ used by
components/timeline/TimelineMap.tsx + TimelineScrubber.tsx + TimelineHistogram.tsx
  ↓ adaptive bucketing
components/timeline/useTimelineBucketing.ts (isomorph, day|week|month je nach Range)
```

URL-State (`?at=YYYY-MM-DD&tab=all|mine|friends`) ist shareable. TimelineScrubber-Tabs nutzen pill-Style (dark-on-map) — NICHT migriert auf generic `<TabBar>` (zu spezifisch).

## Foto-First-Flow (Phase 9.3)

Siehe oben "Foto-First-Flow". Dateien:
- `app/(app)/spots/from-photo/page.tsx` — Server-Component Wrapper, Auth-Guard
- `components/PhotoFirstForm.tsx` — Single Client-Component, hält den ganzen Flow-State
- `components/PinPickerMap.tsx` — Leaflet-Wrapper mit tappable/draggable Pin
- `components/PinPickerMapClient.tsx` — dynamic-ssr:false Wrapper
- `lib/exif-utils.ts` — `readExifGps()` (pure logic, 7 unit tests)

## Dateistruktur (Stand v0.9.3)

```
app/(marketing)/page.tsx                  ← Landing (Phase 8, "/")
app/(marketing)/opengraph-image.tsx       ← Dynamic OG (Phase 8.4)
app/(auth)/login|signup/page.tsx          ← Auth-Pages
app/(app)/map/page.tsx                    ← Hauptkarte ("/map")
app/(app)/map/loading.tsx                 ← Loading-Skeleton (Phase 8.6)
app/(app)/timeline/page.tsx               ← Time-Scrubber (Phase 9)
app/(app)/spots/from-photo/page.tsx       ← Foto-First-Add (Phase 9.3, primary)
app/(app)/spots/new/page.tsx              ← Legacy Quick-Add (via "Ohne Foto"-Link)
app/(app)/spots/[id]/edit/page.tsx        ← Spot bearbeiten (Owner)
app/(app)/spots/[id]/edit-photo/page.tsx  ← Foto nachträglich hochladen (Owner)
app/(app)/profil/page.tsx                 ← Profil + Theme + Friends-Link + Logout
app/(app)/friends/page.tsx                ← 3-Tab Friend-Management (Phase 6)
app/(app)/changelog/page.tsx              ← Release Notes (Phase 5)
app/(app)/admin/page.tsx                  ← Admin-Dashboard
app/(app)/admin/users/[id]/page.tsx       ← User-Detail
app/(app)/admin/moderation/page.tsx       ← Tipps-Moderation
app/sitemap.ts + app/robots.ts            ← Dynamic SEO (Phase 8.4)
app/layout.tsx                            ← Root-Layout mit Theme-Inline-Script + SpeedInsights
proxy.ts                                  ← Route-Schutz (/spots/*) — Next.js 16

actions/auth.ts                           ← signUp, login, logout
actions/spots.ts                          ← createSpot, deleteSpot, uploadSpotPhoto, updateSpot
actions/stats.ts                          ← getSpotStats, upsertStats
actions/descriptions.ts                   ← listDescriptions, upsertDescription, deleteDescription
actions/favorites.ts                      ← listFavoriteSpotIds, addFavorite, removeFavorite
actions/friends.ts                        ← search/request/accept/decline/cancel/remove + list*-Funktionen
actions/profile.ts                        ← updateMarkerEmoji, updateThemePreference (Phase 8.2)
actions/admin.ts                          ← setAdminRole, adminDeleteSpot, adminDeleteDescription

components/ui/PageHeader.tsx              ← Page-Header mit Back-Link (Welle A)
components/ui/Card.tsx                    ← Card-Wrapper (Welle A)
components/ui/ListRow.tsx                 ← Listen-Item polymorphic (Welle A)
components/ui/Button.tsx                  ← 4 variants × 2 sizes (Welle B)
components/ui/TabBar.tsx                  ← Generic underline-Style (Welle B)
components/ui/SearchInput.tsx             ← Icon + optional Clear-X (Welle B)
components/EmptyState.tsx                 ← Empty-List-Display (Phase 8.3)

components/SpotMap.tsx                    ← Leaflet-Karte mit Live-Tracking + 4 Controllers (Center/Fly/Follow/Location)
components/SpotMapClient.tsx              ← dynamic-ssr-false Wrapper für SpotMap
components/SpotPopup.tsx                  ← Leaflet Popup (lazy rarity fetch, Type-Label)
components/PinPickerMap.tsx               ← Single tappable/draggable Pin (Phase 9.3)
components/PinPickerMapClient.tsx         ← dynamic-ssr-false Wrapper für PinPickerMap
components/MapLayout.tsx                  ← State-Koordinator (selectedSpot, flyTarget, userPos, gpsState, favoriteIds)
components/MapHeader.tsx                  ← Map-Header (Logo, ThemeToggle, Profil-Link, Timeline-Link)
components/BottomSheet.tsx                ← Sheet mit 4-Tab TabBar (Alle/Eigene/Freunde/Favoriten)
components/SpotDetail.tsx                 ← Detail-Ansicht (next/image Header, Type-Badge, Stats, VoteForm, DescriptionFeed, ShareButton)
components/SpotDescriptionFeed.tsx        ← Community-Tipps (own slot + others)
components/SpotTypePicker.tsx             ← Radiogroup mit Tabler-Icons für 6 Spot-Types
components/VisibilityPicker.tsx           ← Radiogroup für 3 Visibility-Levels (Phase 6)
components/AddSpotForm.tsx                ← Legacy Spot-Formular (für /spots/new)
components/PhotoFirstForm.tsx             ← Foto-First Spot-Formular (Phase 9.3, für /spots/from-photo)
components/SpotEditForm.tsx               ← Edit-Form (Name + Type + Visibility)
components/SpotActionMenu.tsx             ← Owner-Dropdown (Foto/Spot bearbeiten)
components/FavoriteToggle.tsx             ← Heart-Toggle (optimistic)
components/SpotShareButton.tsx            ← Web-Share-API + Clipboard-Fallback (Phase 7)
components/FriendsClient.tsx              ← /friends 3-Tab UI mit TabBar + SearchInput
components/StatsVoteForm.tsx              ← Vote-Formular (Sterne, Condition, etc.)
components/RarityBadge.tsx                ← Common→Legendary Badge
components/ThemeToggle.tsx                ← Light/Dark/System Toggle (Phase 8.2)
components/EmojiPicker.tsx                ← User-Marker-Emoji-Auswahl
components/ChangelogModal.tsx             ← Auto-Popup bei Version-Bump
components/useSheetSwipe.ts               ← Hook: Sheet swipe-vs-scroll split
components/timeline/                      ← TimelineMap, TimelineScrubber, TimelineHistogram, useTimelineBucketing (Phase 9)
components/landing/                       ← LandingHero, LivingNumbers, HeroMapPreview, etc. (Phase 8)

lib/supabase/server.ts + client.ts        ← Supabase Clients
lib/supabase/admin.ts                     ← Service-Role Client (createAdminClient)
lib/supabase/anon-read.ts                 ← Cookie-freier Read-Client (für unstable_cache scopes)
lib/admin-data.ts                         ← requireAdmin + getAllSpots + getAllUsers + getAdminStats
lib/spot-types.ts                         ← SpotType, SPOT_TYPES (mit .Icon), SPOT_TYPE_MAP
lib/spot-visibility.ts                    ← SpotVisibility, SPOT_VISIBILITIES (mit .Icon)
lib/spot-marker-svg.ts                    ← buildPinSvg, buildClusterSvg, PIN_SIZE/ANCHOR (Phase 8.4)
lib/spot-utils.ts                         ← spotDisplayName, distanceTo, distMeters
lib/stats-utils.ts                        ← conditionLabel, rarityLabel, shadowLabel, extrasIcon
lib/image-utils.ts                        ← resizeImage (max 1600px, WebP)
lib/exif-utils.ts                         ← readExifGps (Phase 9.3, pure logic + 7 unit tests)
lib/timeline-data.ts                      ← Server-only: getPublicTimelineSpots, getAuthedTimelineExtras
lib/timeline-types.ts                     ← Client-safe: types + applyTabFilter
lib/marketing-stats.ts                    ← Cached Landing-Page-Stats (Phase 8.6)
lib/site.ts                               ← SITE_URL, SITE_NAME, SITE_DESCRIPTION (Phase 8.4)
lib/changelog.ts + changelog-server.ts    ← Changelog-Parser (split client/server)

supabase/migrations/                      ← SQL Migrations
__tests__/lib/                            ← Unit-Tests (changelog, exif-utils, marketing-stats, spot-utils, stats-utils, timeline-data)
__tests__/actions/                        ← Server-Action-Tests (auth, descriptions, favorites, friends, profile, spots, stats)
__tests__/image-utils.test.ts             ← Image-Resize-Tests
docs/superpowers/specs/                   ← Brainstorm-Spec-Docs pro Phase
docs/superpowers/plans/                   ← Implementation-Plans pro Phase
```
