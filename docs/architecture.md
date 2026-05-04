# Architektur

## Überblick

BenchMarks ist eine Next.js 16 App Router Anwendung mit Supabase als Backend. Community-App zum Sammeln und Bewerten von Parkbänken.

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
| Vitest | 4.x | Unit-Tests |

## Rendering-Strategie

- **Server Components** laden Daten serverseitig via Supabase SSR
- **Client Components** (`'use client'`) nur wo nötig: Karte, Formulare, BottomSheet, EmojiPicker, BenchDetail, StatsVoteForm
- **Server Actions** (`'use server'`) für alle Mutationen: Auth, createBench, deleteBench, upsertStats, uploadBenchPhoto

## Datenfluss Hauptseite

```
app/(app)/page.tsx (Server Component)
  ├── Supabase: benches + getUser() + is_admin (parallel/sequentiell)
  ├── MapHeader (Server Component)
  └── MapLayout (Client Component) ← koordiniert State zwischen Map und Sheet
      ├── selectedBenchId, flyTarget, userPosition, isAdmin (State)
      ├── BenchMapClient → BenchMap (dynamic ssr:false)
      │   ├── LocationController (2-Phase GPS, ruft onPositionUpdate)
      │   ├── FlyController (flyTo bei Listentap)
      │   ├── CenterController (📍 Button)
      │   ├── AdminClickController (Map-Click → /benches/new, nur isAdmin)
      │   ├── MarkerClusterGroup mit BenchPopup (lazy rarity fetch on open)
      │   └── User-Position-Marker (Emoji aus localStorage)
      └── BottomSheet (Client Component)
          ├── Liste: Benches mit Distanz + Tap → fly + detail
          └── Detail: BenchDetail (Foto-Header, Stats, StatsVoteForm)
```

## Route-Schutz

`proxy.ts` (Next.js 16 Middleware — **nicht** `middleware.ts`) schützt alle `/benches/*`-Routen.
Nutzt `getUser()` (JWT-Validierung), nicht `getSession()` (nur Cookie-Lesen).

## GPS-Strategie (Two-Phase)

1. **localStorage-Cache**: Karte startet sofort an letzter Position. Marker greyscale bis Phase 1 fertig.
2. **Phase 1** — `getCurrentPosition({ enableHighAccuracy: false })`: Netzwerk < 1s, ~100-300m.
3. **Phase 2** — `watchPosition({ enableHighAccuracy: true })`: GPS ~10m, fliegt sanft per `map.flyTo`. Stoppt bei `accuracy < 80m`.
4. **onPositionUpdate**: BenchMap meldet aktuelle Position an MapLayout → BottomSheet zeigt Distanz.

## Stats-Aggregation

Community-Votes in `bench_stats_votes` (ein Row pro User/Bank). Aggregation per Postgres-Funktion `get_bench_aggregated_stats`:
- Komfort/Aussicht/Zustand/Rarität: `PERCENTILE_CONT(0.5)` (Median)
- Schatten: `MODE()` (häufigster Wert)
- Extras: Items die ≥50% der Votes haben

## Bench-Stats State-Flow

```
StatsVoteForm → upsertStats (Server Action)
             → getBenchStats (Server Action)
             → onSaved(aggregated, vote) Callback
             → BenchDetail State Update
```

## Dark Mode — Forest Deep

- Theme: `globals.css` `.dark {}` setzt CSS-Vars, Tailwind-Utilities nutzen explizite Hex-Werte
- Hintergrundfarben im Dark Mode: bg `#141810`, surface `#1e231a`, chips `#2a3124`, border `#2a2f24`
- **ACHTUNG `@theme inline`**: Tailwind backt Werte literal ein. CSS-Var-Overrides in `.dark` wirken NICHT auf Tailwind-Utilities. Immer explizite `dark:bg-[#hex]` nutzen.
- Kacheln: CSS-Filter `invert(100%) hue-rotate(180deg)` auf `.leaflet-tile-pane`
- FOUC-Prevention: Inline-Script in `layout.tsx <head>` — `suppressHydrationWarning` auf `<html>`

## Supabase Storage

Bucket `bench-photos`: public read, authenticated write (owner-only update/delete via `owner_id`).
Upload-Pfad: `{bench_id}/photo` mit `upsert: true`.
Photo-URL gespeichert in `benches.photo_url` (öffentliche CDN-URL).

## Admin-Funktionen

- `/admin` Route — nur für `is_admin = true`, sonst redirect `/`
- `lib/supabase/admin.ts`: Service-Role-Client — NUR für `auth.admin.listUsers()`
- `actions/admin.ts`: normaler User-Client mit RLS-Policies
- Admin Click-to-Add: `isAdmin` prop-Kette → `AdminClickController` in BenchMap → Map-Click → `/benches/new?lat=X&lng=Y`

## Lokale Nutzer-Einstellungen (localStorage)

| Key | Inhalt |
|---|---|
| `benchmarks_last_location` | `[lat, lng]` |
| `benchmarks_user_emoji` | z.B. `"🧍‍♂️"` |
| `benchmarks-theme` | `"dark"` oder nicht gesetzt |

## Wichtige Gotchas

| | |
|---|---|
| **Middleware** | `proxy.ts` (nicht `middleware.ts`), `export default function proxy(req)` |
| **Geschützte Routen** | `protectedRoutes = ['/benches']` mit `startsWith` — deckt alle Sub-Routen ab |
| **searchParams** | Async in Next.js 16: `await searchParams` |
| **Leaflet SSR** | Nur Client, via `dynamic(..., { ssr: false })` in BenchMapClient |
| **Supabase Key** | `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (nicht ANON_KEY) |
| **Tailwind v4** | Arbitrary values: `z-[1000]` (mit Klammern) |
| **BenchPopup Hooks** | Hat `'use client'` — Leaflet Popup mountet/unmountet bei Open/Close |
| **params async** | Next.js 16: `params: Promise<{id: string}>` — `use(params)` in Client Components |

## Dateistruktur

```
app/(auth)/login|signup/page.tsx          ← Auth-Seiten
app/(app)/page.tsx                        ← Hauptseite (benches + user + isAdmin fetch)
app/(app)/benches/new/page.tsx            ← Bank eintragen
app/(app)/benches/[id]/edit-photo/        ← Foto nachträglich hochladen (Owner)
app/(app)/profil/page.tsx                 ← Profil + Emoji + Logout
app/(app)/admin/page.tsx                  ← Admin (User + Bench Management)
actions/auth.ts                           ← signUp, login, logout
actions/benches.ts                        ← createBench, deleteBench, uploadBenchPhoto
actions/stats.ts                          ← getBenchStats, upsertStats
actions/admin.ts                          ← setAdminRole, adminDeleteBench
components/BenchMap.tsx                   ← Leaflet-Karte (Client, enthält Controller)
components/BenchMapClient.tsx             ← dynamic-import Wrapper
components/BenchPopup.tsx                 ← Leaflet Popup (lazy rarity fetch)
components/BottomSheet.tsx                ← Sheet: Liste/Detail-Modi, Distanz, flyTo+detail
components/BenchDetail.tsx                ← Detail-Ansicht (Foto-Header, Stats, VoteForm)
components/StatsVoteForm.tsx              ← Vote-Formular (Sterne, Condition, etc.)
components/RarityBadge.tsx                ← Common→Legendary Badge
components/MapLayout.tsx                  ← State-Koordinator (selectedBench, flyTarget, userPos)
components/MapHeader.tsx                  ← Header (Theme-Toggle, ThemeToggle)
components/AddBenchForm.tsx               ← Bank-Formular (inkl. optionales Foto)
components/ThemeToggle.tsx                ← Dark/Light Toggle
components/EmojiPicker.tsx                ← Emoji-Auswahl (Client)
lib/supabase/server.ts + client.ts        ← Supabase Clients
lib/supabase/admin.ts                     ← Service-Role Client (nur für auth.admin)
lib/stats-utils.ts                        ← conditionLabel, rarityLabel, shadowLabel, extrasIcon
lib/bench-utils.ts                        ← benchDisplayName, distanceTo (Haversine)
proxy.ts                                  ← Route-Schutz (/benches/*)
supabase/migrations/                      ← SQL Migrations (001–004)
```
