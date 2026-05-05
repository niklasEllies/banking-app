# Agent Handoff — Plätzchen

Dieses Dokument ermöglicht einem AI-Agenten, das Projekt ohne Vorwissen fortzuführen.

> **Für Agents:** Lies vor Beginn jeder Arbeit die Dateien in dieser Reihenfolge:
> 1. `docs/agent-handoff.md` (diese Datei)
> 2. `docs/feature-status.md` — was ist erledigt, was kommt als nächstes
> 3. `docs/architecture.md` — Tech Stack, Datenfluss, Dateistruktur
> 4. `docs/database-schema.md` — Tabellen, RLS, Migrationen

## Was ist Plätzchen?

Eine Community-Web-App zum Sammeln und Bewerten von **netten Pause-Spots beim Wandern**: Bänke, Aussichtspunkte, Schutzhütten, Rastplätze, Liegewiesen, Wasserstellen. Nutzer tragen Spots auf einer Karte ein, bewerten sie (Komfort, Aussicht, Zustand, Rarität, Schatten, Extras — alles optional), laden Fotos hoch und schreiben Community-Tipps (1 Tipp pro User pro Spot, editierbar).

**Arbeitstitel im Repo:** "banking-app" — tatsächlicher Produktname: **Plätzchen** (zuvor "BenchMarks", umbenannt in Phase 4).

## Umgebung

- Windows 11, PowerShell
- Node.js 24 LTS
- Git: branch `master`
- Dev-Server: `npm run dev` → http://localhost:3000
- Tests: `npm test` (Vitest, 64 Tests)
- Build: `npm run build`

## Supabase Setup

Connection-Daten liegen in `.env` (gitignored):
```
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=...   ← nicht ANON_KEY!
SUPABASE_SERVICE_ROLE_KEY=...              ← nur server-seitig, für auth.admin.listUsers()
```

Supabase MCP ist konfiguriert (`.mcp.json` — gitignored, project_ref: `meecidtxzchqenqxwxja`).
Alle Migrationen in `supabase/migrations/` (001–007) wurden in Supabase ausgeführt.

## Architektur-Entscheidungen

| Entscheidung | Grund |
|---|---|
| `proxy.ts` statt `middleware.ts` | Next.js 16 breaking change |
| Geschützte Routen: `/spots/*` | Phase 4 Rename, hard cutover (alte `/benches/*` 404'en) |
| `getUser()` statt `getSession()` | Sicherheit: getSession validiert JWT nicht |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Supabase hat Key-Namen umbenannt |
| `ssr: false` in `SpotMapClient.tsx` | Leaflet braucht `window` |
| `dynamic` muss in Client Component sein | Next.js 16: `ssr: false` nicht in Server Components erlaubt |
| `params: Promise<{id}>` in Pages | Next.js 16: params ist async — `use(params)` in Client Components |
| `@theme inline` + explizite dark: Hex | Tailwind v4: CSS-Var-Overrides in `.dark` funktionieren nicht für Utilities |
| Storage Bucket `bench-photos` (interner Name) | Wurde in Phase 4 nicht umbenannt — Supabase macht Bucket-Rename schmerzhaft, ist nur intern |
| `spot_type` als Enum, nicht als separate Tabellen | YAGNI: 6 fixe Werte, alle Stats universal, RLS einfach |
| Stats-Felder bleiben universal (alle 6 für jeden Type) | User füllen halt nur was passt; type-aware Hiding ist Phase 7+ |

## Dark Mode (Forest Deep)

Forest Deep Farbpalette (Dark Mode):
- Background: `#141810`
- Surface (Sheets, Cards): `#1e231a`
- Chip-Backgrounds: `#2a3124`
- Border: `#2a2f24`
- Primary: `#5e9e3e`

**Neue UI-Elemente immer mit `dark:` Varianten versehen. Explizite Hex-Werte, keine CSS-Vars.**

## Aktuelle Datenbankstruktur (Stand: Phase 5)

- `profiles`: id, username, is_admin
- `spots`: id, created_by, lat, lng, name, photo_url, **type** (`spot_type` enum), created_at
  - `type` enum values: `bench`, `viewpoint`, `shelter`, `picnic`, `meadow`, `water`
  - Bestandsdaten haben `type='bench'` (Migration 006 default)
  - UPDATE-Policy erlaubt Owner Edit von name+type (Phase 5)
- `spot_stats_votes`: id, **spot_id**, user_id, comfort, view_rating, condition, shadow, extras, rarity
  - RLS: SELECT (any), INSERT/UPDATE/DELETE (own user_id)
- `spot_descriptions` (Phase 4): id, spot_id, user_id, text (≤280 chars), created_at, updated_at
  - UNIQUE(spot_id, user_id) — ein Tipp pro User pro Spot
  - RLS: SELECT (any), INSERT/UPDATE/DELETE (own user_id)
  - updated_at trigger via `set_updated_at()`
- `favorites` (Phase 5): user_id, spot_id, created_at
  - PRIMARY KEY (user_id, spot_id) — composite, ein Favorit pro Pair
  - **PRIVATE** RLS: SELECT/INSERT/DELETE alle gated auf `auth.uid() = user_id` (Phase 6 lockert ggf. SELECT für Friends)
- Storage Bucket `bench-photos`: public read, owner write/delete (interner Name beibehalten)

Aggregation via `get_spot_aggregated_stats(p_spot_id uuid)` Postgres-Funktion.

## Spot-Types

`lib/spot-types.ts` ist die Source of Truth:
```ts
export type SpotType = 'bench' | 'viewpoint' | 'shelter' | 'picnic' | 'meadow' | 'water'
```

`SPOT_TYPES` ist ein readonly Array von `{ key, emoji, label }`. `SPOT_TYPE_MAP` ist der lookup nach Key.

| Type | Emoji | Label |
|---|---|---|
| bench | 🪑 | Bank |
| viewpoint | 🏔️ | Aussichtspunkt |
| shelter | ⛺ | Schutzhütte |
| picnic | 🧺 | Rastplatz |
| meadow | 🌿 | Liegewiese |
| water | 💧 | Wasserstelle |

**Regel:** Niemals Emojis oder Labels hardcoden — immer `SPOT_TYPE_MAP[spot.type].emoji` und `.label`.

Map-Marker: `getSpotIcon(type)` in `components/SpotMap.tsx` cached `L.DivIcon` per Type. Vector-Icons (User designt) ersetzen die Emoji-Marker irgendwann (Phase 7+).

## Phase 5 Patterns (zusätzlich zu Phase 4)

### favoriteIds Set Propagation
Server Component (`app/(app)/page.tsx`) ruft `listFavoriteSpotIds()` parallel zur Profile-Query. Liste wird an `MapLayout` als `initialFavoriteIds` weitergegeben. MapLayout hält ein `Set<string>` als State + `handleFavoriteChange(spotId, isFav)` Callback. Set + Callback wandern an `BottomSheet`, das beim Detail-Modus `<FavoriteToggle>` rendert.

### FavoriteToggle Optimistic UI
- Toggle ruft `onChange` SOFORT (UI flip)
- `addFavorite`/`removeFavorite` läuft in `useTransition`
- Bei Server-Error: revertet via `onChange(spotId, !next)` und färbt rot

### View-Mode Tabs (BottomSheet)
- 3 Tabs: `'all' | 'mine' | 'favorites'`. localStorage Key `plaetzchen-view-mode`.
- Default `'all'`. Hydratet nach mount via `useEffect` (vermeidet SSR mismatch).
- Filter+Sort innerhalb des aktiven Tabs:
  - sort by `distMeters` wenn GPS available, sonst by `created_at` DESC
- Anonym + (mine|favorites) → Login-CTA Block statt Liste

### SpotActionMenu (Owner)
- ✏️-Trigger öffnet Dropdown mit `{label, href, emoji}` Items
- Closes on outside click + Escape
- Im SpotDetail-Header: zwei Items "Foto bearbeiten" / "Spot bearbeiten"

### Spot Edit
- Route: `/spots/[id]/edit` (Server Component validiert Ownership, redirectet bei Fail)
- `SpotEditForm` (Client) bindet `SpotTypePicker` + Name-Input
- `updateSpot(spotId, { name, type })` Server Action

## Phase 4 Patterns (zusätzlich zu Phase 3b)

### Per-Type Marker
```ts
function getSpotIcon(type: SpotType): L.DivIcon {
  // cached per type
  return L.divIcon({ html: `<span>${SPOT_TYPE_MAP[type].emoji}</span>`, ... })
}
```

### SpotDescriptionFeed
- Eigener Tipp prominent oben mit Bearbeiten/Löschen
- Andere Tipps darunter (`created_at DESC`), Username + timeAgo
- Anonym: Login-CTA statt Editor
- 280-char Limit + Counter
- Server Actions: `listDescriptions`, `upsertDescription`, `deleteDescription` aus `actions/descriptions.ts`

### GPS-State im MapLayout (Phase 3b)
```ts
type GpsState = 'unknown' | 'available' | 'denied' | 'unavailable'
```
SpotMap meldet via `onGpsStateChange` an MapLayout. State steuert: Banner-Anzeige, Center-FAB-Disable, Sheet-Hint, Distanz-Anzeige.

### Foto-Resize on Upload (Phase 3b)
`lib/image-utils.ts` → `resizeImage(file: File): Promise<File>` — wird vor jedem Upload aufgerufen (AddSpotForm + edit-photo). Max 1600px lange Kante, WebP @0.8 mit JPEG @0.85 Fallback.

### Defensive Queries (Phase 3b)
`.maybeSingle()` (statt `.single()`) wo Row-Existenz nicht garantiert ist — `?.` chains handhaben null sauber.

### BottomSheet Swipe (Phase 3b)
`useSheetSwipe` Hook splittet Touch-Handler:
- `handleProps` → Drag-Handle: swipe-to-dismiss greift immer
- `contentProps` → Content-Bereich: nur wenn `scrollTop === 0`

## Bekannte Muster im Code

### Server Action aufrufen
```ts
import { createSpot } from '@/actions/spots'
const [state, action, pending] = useActionState(createSpot, undefined)
```

### Supabase in Server Component
```ts
import { createClient } from '@/lib/supabase/server'
const supabase = await createClient()
const { data: { user } } = await supabase.auth.getUser()
```

### Stats lesen / schreiben
```ts
import { getSpotStats, upsertStats } from '@/actions/stats'
const { aggregated, userVote } = await getSpotStats(spotId)
await upsertStats(spotId, { comfort: 4, rarity: 3 })
```

### Description CRUD
```ts
import { listDescriptions, upsertDescription, deleteDescription } from '@/actions/descriptions'
const tips = await listDescriptions(spotId)
await upsertDescription(spotId, 'Schöner Sonnenuntergang ab 20:30')
```

### Neue Seite anlegen
- Unter `app/(app)/` für eingeloggte Nutzer
- Unter `app/(auth)/` für Auth-Seiten
- `proxy.ts` schützt `/spots/*` pauschal

### Neue Komponente mit Dark Mode
```tsx
<div className="bg-white dark:bg-[#1e231a] border border-gray-200 dark:border-[#2a2f24]">
  <span className="text-xs text-gray-500 dark:text-gray-400">...</span>
  <div className="bg-gray-100 dark:bg-[#2a3124] rounded-lg px-3 py-1.5">chip</div>
</div>
```

### Spot-Type-aware UI
```tsx
import { SPOT_TYPE_MAP } from '@/lib/spot-types'
<span>{SPOT_TYPE_MAP[spot.type].emoji} {SPOT_TYPE_MAP[spot.type].label}</span>
```

## Was als nächstes kommt

**Phase 6 — Privacy & Friends:**

- Friends-System (Tabelle `friendships`: requester, addressee, status `pending`/`accepted`)
- Spot-Visibility: `public` / `friends` / `private` (Spalte `visibility` auf `spots`)
- RLS-Policies für `spots` & `favorites` & `spot_descriptions` müssen ggf. friend-aware werden (oder sub-query auf accepted friendships)
- UI: Privacy-Picker beim Eintragen + im SpotEditForm
- Filter/View: optional Friend-Spots im BottomSheet sichtbar machen

Stoff für Brainstorming: Wie viele privacy-Levels? Friend-Request UX (Push-Notif später)? Macht "Friends-Favoriten anschauen"-Feature schon Sinn oder erst Phase 7?

## Stil-Guide

- Mobile-first: alle UI-Elemente auf 360px-Breite testen
- Dark Mode: immer `dark:` Varianten für neue Elemente
- Commits nach jedem Feature-Slice
- Vor nicht-trivialer Implementierung: Optionen + Empfehlung vorstellen

## Dokumentation pflegen

Nach jeder Phase:
- `docs/feature-status.md` updaten
- `docs/architecture.md` bei strukturellen Änderungen
- `docs/database-schema.md` bei DB-Änderungen
- Diese Datei bei wichtigen Entscheidungen / neuen Patterns
