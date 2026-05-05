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
| Vitest | 4.x | Unit-Tests (jsdom für Browser-Code) |

## Rendering-Strategie

- **Server Components** laden Daten serverseitig via Supabase SSR
- **Client Components** (`'use client'`) nur wo nötig: Karte, Formulare, BottomSheet, EmojiPicker, SpotDetail, StatsVoteForm, SpotDescriptionFeed
- **Server Actions** (`'use server'`) für alle Mutationen: Auth, createSpot, deleteSpot, upsertStats, uploadSpotPhoto, list/upsert/deleteDescription

## Datenfluss Hauptseite

```
app/(app)/page.tsx (Server Component)
  ├── Supabase: spots (incl. type) + getUser() + is_admin (parallel/sequentiell)
  ├── MapHeader (Server Component) ← "📍 Plätzchen"
  └── MapLayout (Client Component) ← koordiniert State zwischen Map und Sheet
      ├── selectedSpotId, flyTarget, userPosition, gpsState, isAdmin (State)
      ├── GPS-Banner (denied/unavailable + dismissible)
      ├── SpotMapClient → SpotMap (dynamic ssr:false)
      │   ├── LocationController (2-Phase GPS, ruft onPositionUpdate + onGpsStateChange)
      │   ├── FlyController (flyTo bei Listentap)
      │   ├── CenterController (📍 Button, disabled wenn !available)
      │   ├── AdminClickController (Map-Click → /spots/new, nur isAdmin)
      │   ├── MarkerClusterGroup mit per-Type-Emoji-DivIcons (cached) + SpotPopup
      │   └── User-Position-Marker (Emoji aus localStorage)
      └── BottomSheet (Client Component)
          ├── Liste: Spots mit Type-Emoji + Distanz + Tap → fly + detail
          └── Detail: SpotDetail (Foto-Header, Type-Badge, Stats, VoteForm, DescriptionFeed)
```

## Route-Schutz

`proxy.ts` (Next.js 16 Middleware — **nicht** `middleware.ts`) schützt alle `/spots/*`-Routen.
Nutzt `getUser()` (JWT-Validierung), nicht `getSession()` (nur Cookie-Lesen).

## GPS-Strategie (Two-Phase)

1. **localStorage-Cache**: Karte startet sofort an letzter Position. Marker greyscale bis Phase 1 fertig.
2. **Phase 1** — `getCurrentPosition({ enableHighAccuracy: false })`: Netzwerk < 1s, ~100-300m.
3. **Phase 2** — `watchPosition({ enableHighAccuracy: true })`: GPS ~10m, fliegt sanft per `map.flyTo`. Stoppt bei `accuracy < 80m`.
4. **onPositionUpdate**: SpotMap meldet Position an MapLayout → BottomSheet zeigt Distanz.
5. **onGpsStateChange**: SpotMap meldet `'available' | 'denied' | 'unavailable'` an MapLayout — steuert Banner + Sheet-Hint + Center-FAB-Disable.

## Spot-Types

`lib/spot-types.ts` ist Source-of-Truth. 6 Typen mit Emoji + DE-Label. UI-Code zieht aus `SPOT_TYPE_MAP[spot.type]` — keine Hardcodes.

| Type | Emoji | Label |
|---|---|---|
| bench | 🪑 | Bank |
| viewpoint | 🏔️ | Aussichtspunkt |
| shelter | ⛺ | Schutzhütte |
| picnic | 🧺 | Rastplatz |
| meadow | 🌿 | Liegewiese |
| water | 💧 | Wasserstelle |

Map-Marker via `getSpotIcon(type): L.DivIcon` (cached per Type) in `components/SpotMap.tsx`.

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

## Dateistruktur

```
app/(auth)/login|signup/page.tsx          ← Auth-Seiten
app/(app)/page.tsx                        ← Hauptseite (spots + user + isAdmin fetch)
app/(app)/spots/new/page.tsx              ← Spot eintragen
app/(app)/spots/[id]/edit-photo/          ← Foto nachträglich hochladen (Owner)
app/(app)/spots/[id]/edit/page.tsx        ← Spot bearbeiten: Name + Type + Visibility (Owner)
app/(app)/profil/page.tsx                 ← Profil + Emoji + Freunde-Link + Logout
app/(app)/friends/page.tsx                ← Freunde-Verwaltung (Phase 6, 3 Tabs)
app/(app)/admin/page.tsx                  ← Admin (User + Spot Management)
app/(app)/admin/AdminUsers.tsx            ← User-Liste mit Admin-Toggle
app/(app)/admin/AdminSpots.tsx            ← Spot-Liste mit Type-Emoji
actions/auth.ts                           ← signUp, login, logout
actions/spots.ts                          ← createSpot, deleteSpot, uploadSpotPhoto, updateSpot (akzeptiert visibility)
actions/stats.ts                          ← getSpotStats, upsertStats
actions/descriptions.ts                   ← listDescriptions, upsertDescription, deleteDescription
actions/favorites.ts                      ← listFavoriteSpotIds, addFavorite, removeFavorite
actions/friends.ts                        ← search/request/accept/decline/cancel/remove + listFriends/Incoming/Outgoing/Count (Phase 6)
actions/admin.ts                          ← setAdminRole, adminDeleteSpot
components/SpotMap.tsx                    ← Leaflet-Karte (Client, enthält Controller, per-Type DivIcons)
components/SpotMapClient.tsx              ← dynamic-import Wrapper
components/SpotPopup.tsx                  ← Leaflet Popup (lazy rarity fetch, Type-Label)
components/BottomSheet.tsx                ← Sheet: Tabs (Alle/Eigene/Favoriten), distance-sort, flyTo+detail
components/SpotDetail.tsx                 ← Detail-Ansicht (Foto-Header, Type+Visibility-Badge, Stats, VoteForm, DescriptionFeed)
components/SpotDescriptionFeed.tsx        ← Community-Tipps (own slot + others)
components/SpotTypePicker.tsx             ← Radiogroup für 6 Spot-Types (im AddSpotForm + SpotEditForm)
components/VisibilityPicker.tsx           ← Radiogroup für 3 Visibility-Levels (Phase 6)
components/SpotEditForm.tsx               ← Edit-Form (Name + Type + Visibility)
components/SpotActionMenu.tsx             ← Owner-Dropdown (Foto/Spot bearbeiten)
components/FavoriteToggle.tsx             ← Heart-Toggle 🤍↔❤️ (optimistic)
components/FriendsClient.tsx              ← /friends 3-Tab UI (Phase 6)
components/StatsVoteForm.tsx              ← Vote-Formular (Sterne, Condition, etc.)
components/RarityBadge.tsx                ← Common→Legendary Badge
components/MapLayout.tsx                  ← State-Koordinator (selectedSpot, flyTarget, userPos, gpsState, favoriteIds)
components/MapHeader.tsx                  ← Header ("📍 Plätzchen", ThemeToggle)
components/AddSpotForm.tsx                ← Spot-Formular (Type-Picker, Visibility-Picker, Position, Name, Foto)
components/ThemeToggle.tsx                ← Dark/Light Toggle
components/EmojiPicker.tsx                ← User-Marker-Emoji-Auswahl
components/useSheetSwipe.ts               ← Hook: Sheet swipe-vs-scroll split
lib/supabase/server.ts + client.ts        ← Supabase Clients
lib/supabase/admin.ts                     ← Service-Role Client (nur für auth.admin)
lib/spot-types.ts                         ← SpotType, SPOT_TYPES, SPOT_TYPE_MAP
lib/spot-visibility.ts                    ← SpotVisibility, SPOT_VISIBILITIES, SPOT_VISIBILITY_MAP (Phase 6)
lib/spot-utils.ts                         ← spotDisplayName (type-aware), distanceTo, distMeters
lib/stats-utils.ts                        ← conditionLabel, rarityLabel, shadowLabel, extrasIcon
lib/image-utils.ts                        ← resizeImage (max 1600px, WebP)
proxy.ts                                  ← Route-Schutz (/spots/*)
supabase/migrations/                      ← SQL Migrations (001–010)
```
