# Architektur

## Überblick

BenchMarks ist eine Next.js 16 App Router Anwendung mit Supabase als Backend. Community-App zum Sammeln und Bewerten von Parkbänken.

## Tech Stack

| Technologie | Version | Zweck |
|---|---|---|
| Next.js | 16.2.4 | Framework (App Router) |
| React | 19.2.4 | UI |
| TypeScript | 5.x | Typsicherheit |
| Tailwind CSS | v4 | Styling (CSS-first, `@theme` für Custom-Colors) |
| Supabase | @supabase/ssr 0.10.x | Auth + Datenbank |
| react-leaflet | 5.x | Karte |
| react-leaflet-cluster | 4.x | Marker-Clustering |
| Vitest | 4.x | Unit-Tests |

## Rendering-Strategie

- **Server Components** laden Daten serverseitig via Supabase SSR
- **Client Components** (`'use client'`) nur wo nötig: Karte, Formulare, BottomSheet, EmojiPicker
- **Server Actions** (`'use server'`) für alle Mutationen: Auth, createBench, deleteBench

## Datenfluss Hauptseite

```
app/(app)/page.tsx (Server Component)
  ├── Supabase: benches + getUser() (parallel)
  ├── MapHeader (Server Component)
  ├── BenchMapClient → BenchMap (dynamic ssr:false)
  │   ├── LocationController (2-Phase GPS)
  │   ├── MarkerClusterGroup (react-leaflet-cluster)
  │   └── User-Position-Marker (Emoji aus localStorage)
  └── BottomSheet — Bank-Liste mit Delete
```

## Route-Schutz

`proxy.ts` (Next.js 16 Middleware — **nicht** `middleware.ts`) schützt `/benches/new`.
Nutzt `getUser()` (JWT-Validierung), nicht `getSession()` (nur Cookie-Lesen).

## GPS-Strategie (Two-Phase)

1. **localStorage-Cache**: Karte startet sofort an letzter Position. Marker greyscale bis Phase 1 fertig.
2. **Phase 1** — `getCurrentPosition({ enableHighAccuracy: false })`: Netzwerk < 1s, ~100-300m.
3. **Phase 2** — `watchPosition({ enableHighAccuracy: true })`: GPS ~10m, fliegt sanft per `map.flyTo`. Stoppt bei `accuracy < 80m`.

## Bench-Name Auto-Generierung

Kein Name eingegeben → `createBench` ruft Nominatim Reverse Geocoding auf, speichert dauerhaft in DB.
Priorität: Park > Straße > Viertel > Stadt. Timeout: 5s.

## Lokale Nutzer-Einstellungen (localStorage)

| Key | Inhalt |
|---|---|
| `benchmarks_last_location` | `[lat, lng]` |
| `benchmarks_user_emoji` | z.B. `"🧍‍♂️"` |

Verfügbare Emojis: 🧍‍♂️ 🧍‍♀️ 👫 🐕

## Theme (Park Bench C)

Tailwind v4 `@theme inline` in `globals.css`:
`bg-primary` (#3d6b2c), `hover:bg-primary-dark` (#2d5220), `bg-accent` (#7c3d12), `bg-surface` (#fafaf7)

## Wichtige Gotchas

| | |
|---|---|
| **Middleware** | `proxy.ts` (nicht `middleware.ts`), `export default function proxy(req)` |
| **searchParams** | Async in Next.js 16: `await searchParams` |
| **Leaflet SSR** | Nur Client, via `dynamic(..., { ssr: false })` in BenchMapClient |
| **Supabase Key** | `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (nicht ANON_KEY) |
| **Tailwind v4** | Arbitrary values: `z-[1000]` (mit Klammern) |

## Dateistruktur

```
app/(auth)/login|signup/page.tsx    ← Auth-Seiten
app/(app)/page.tsx                  ← Hauptseite
app/(app)/benches/new/page.tsx      ← Bank eintragen
app/(app)/profil/page.tsx           ← Profil + Emoji
actions/auth.ts                     ← signUp, login, logout
actions/benches.ts                  ← createBench (+Nominatim), deleteBench
components/BenchMap.tsx             ← Leaflet-Karte (Client)
components/BenchMapClient.tsx       ← dynamic-import Wrapper
components/BottomSheet.tsx          ← Swipeable Sheet
components/MapHeader.tsx            ← Header (Server Component)
components/AddBenchForm.tsx         ← Bank-Formular (Client)
components/EmojiPicker.tsx          ← Emoji-Auswahl (Client)
lib/supabase/server.ts + client.ts  ← Supabase Clients
proxy.ts                            ← Route-Schutz
```
