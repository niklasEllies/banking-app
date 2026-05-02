# BenchMarks – Phase 1 Design

**Datum:** 2026-05-02  
**Status:** Approved  
**Scope:** Phase 1 – Grundgerüst (Auth + Karte + Bank eintragen + Bänke anzeigen)

---

## Übersicht

BenchMarks ist eine Community-App zum Sammeln und Bewerten von Parkbänken. Nutzer können Bänke auf einer interaktiven Karte eintragen und bestätigen.

Phase 1 liefert das funktionsfähige Grundgerüst: Registrierung/Login, eine interaktive Leaflet-Karte mit Bänken, und das Eintragen neuer Bänke per Kartenklick.

**Tech Stack:** Next.js 16.2 (App Router), React 19, TypeScript, Tailwind v4, Supabase (Auth + DB), Leaflet

---

## Architektur

**Ansatz: Server-first mit Client-Insel**

Server Components laden die Bankdaten via Supabase SSR und übergeben sie als Props an eine reine Client Component (`BenchMap`). Auth läuft über Supabase Auth mit Server Actions. Route-Schutz via `proxy.ts` (Next.js 16 — nicht `middleware.ts`).

```
Browser
  └── Server Component: app/(app)/page.tsx
        ├── lädt Bänke serverseitig (Supabase SSR)
        └── <BenchMap benches={...} /> — dynamic import, ssr: false
              ├── Leaflet-Karte (Client only)
              ├── Marker pro Bank
              ├── Geolocation → Karte zentrieren
              └── Bottom Sheet (swipeable)
```

---

## Datenbankschema

### `profiles`
| Spalte | Typ | Beschreibung |
|---|---|---|
| `id` | `uuid` | FK → `auth.users.id`, Primary Key |
| `username` | `text` | Unique, frei wählbar |
| `created_at` | `timestamptz` | Default: `now()` |

Wird via Datenbank-Trigger bei Registrierung angelegt. Der Username wird beim signUp in `user_metadata` übergeben (`options.data.username`), der Trigger liest ihn via `NEW.raw_user_meta_data->>'username'`.

### `benches`
| Spalte | Typ | Beschreibung |
|---|---|---|
| `id` | `uuid` | Primary Key, `gen_random_uuid()` |
| `created_by` | `uuid` | FK → `profiles.id`, nullable, ON DELETE SET NULL |
| `lat` | `float8` | Breitengrad |
| `lng` | `float8` | Längengrad |
| `name` | `text` | Nullable – optionale Bezeichnung |
| `created_at` | `timestamptz` | Default: `now()` |

> Phase 2 ergänzt: `rarity_votes`, `view_rating`, `comfort_rating`, `condition`, `shadow`, `extras`, `photo_url`

### Row Level Security (RLS)
- `benches` SELECT: alle (auch anonym)
- `benches` INSERT: nur authentifizierte Nutzer (`auth.uid() IS NOT NULL`)
- `profiles` SELECT: alle
- `profiles` INSERT/UPDATE: nur eigene Zeile (`id = auth.uid()`)

---

## Routing & Seitenstruktur

```
app/
├── (auth)/
│   ├── login/
│   │   └── page.tsx          ← Email/Passwort Login-Formular
│   └── signup/
│       └── page.tsx          ← Registrierung (Email, Passwort, Username)
├── (app)/
│   ├── page.tsx              ← Hauptseite: Karte + Bottom Sheet
│   └── benches/
│       └── new/
│           └── page.tsx      ← Bank eintragen, empfängt ?lat=&lng=
├── actions/
│   ├── auth.ts               ← signUp, login, logout (Server Actions)
│   └── benches.ts            ← createBench (Server Action)
└── lib/
    └── supabase/
        ├── server.ts         ← createServerClient (@supabase/ssr)
        └── client.ts         ← createBrowserClient (@supabase/ssr)
proxy.ts                      ← Schützt /benches/new
```

**Route Groups** (`(auth)`, `(app)`) erscheinen nicht in der URL — `/login` bleibt `/login`.

---

## Seitendesign

### Hauptseite `/`
- **Layout:** Vollbild-Karte mit schwebendem Header (Logo + Login/Logout-Button)
- **Bottom Sheet:** Zeigt Anzahl sichtbarer Bänke, swipe-to-dismiss
- **Anonym:** Karte + Marker sichtbar, keine Interaktion möglich
- **Eingeloggt:** Klick auf Karte → Koordinaten markieren + "Hier eintragen"-Button erscheint
- **Kartenstart:** Geolocation API, Fallback: Deutschland (lat: 51.1, lng: 10.4, zoom: 6)

### Login `/login` & Signup `/signup`
- Eigene Seiten (kein Modal)
- Login: Email + Passwort, Link zu Signup
- Signup: Email + Passwort + Username, Link zu Login
- Fehler werden inline angezeigt (`useActionState`)
- Nach Erfolg: Weiterleitung zu `/`

### Bank eintragen `/benches/new?lat=...&lng=...`
- **Nur für eingeloggte Nutzer** (proxy.ts leitet sonst zu `/login` weiter)
- Zeigt Koordinaten (read-only) + optionales Namensfeld
- Submit → Server Action `createBench` → Supabase INSERT → `redirect('/')`

---

## Technische Details

### Leaflet SSR-Problem & Lösung
Leaflet benötigt `window`/`document` — läuft nicht auf dem Server. Lösung:

```ts
// app/(app)/page.tsx
import dynamic from 'next/dynamic'
const BenchMap = dynamic(() => import('@/components/BenchMap'), { ssr: false })
```

Die Bankdaten werden server-seitig geladen und als Props übergeben. Der Server rendert alles außer der Karte, Leaflet startet erst im Browser.

### `proxy.ts` (Next.js 16)
In Next.js 16 heißt die Middleware-Datei `proxy.ts` (nicht `middleware.ts`). Sie liest die Supabase-Session aus dem Cookie und leitet nicht-eingeloggte Nutzer von geschützten Routen weg.

### Supabase-Clients
- **Server:** `createServerClient` aus `@supabase/ssr` — liest/schreibt Cookies über `next/headers`
- **Client:** `createBrowserClient` aus `@supabase/ssr` — für Client Components (z.B. Auth-State im Header)

### Auth-Flow
1. Nutzer öffnet `/signup` → füllt Formular aus
2. Server Action `signUp` → `supabase.auth.signUp({ email, password, options: { data: { username } } })` → Datenbank-Trigger legt `profiles`-Zeile mit Username aus `user_metadata` an
3. Weiterleitung zu `/` — Supabase setzt Session-Cookie automatisch
4. `proxy.ts` liest Cookie bei jedem Request zu `/benches/new`

---

## Was Phase 1 nicht enthält
- Bank-Attribute (Rarity, Komfort, Zustand, etc.) → Phase 2
- Foto-Upload → Phase 2
- Community-Bestätigung → Phase 3
- Gamification/Punkte → Phase 4
