# Architektur

## Überblick

BenchMarks ist eine Next.js 16 App Router Anwendung mit Supabase als Backend.

## Rendering-Strategie

- **Server Components** laden Daten serverseitig via Supabase SSR — schnelle initiale Ladezeit, keine Waterfall-Requests
- **Client Components** (`'use client'`) nur wo nötig: Leaflet-Karte, Formulare mit State, BottomSheet
- **Server Actions** (`'use server'`) für alle Mutationen: Auth (signUp, login, logout), createBench

## Datenfluss Hauptseite

```
Request → app/(app)/page.tsx (Server Component)
           ├── Supabase SSR: benches laden (parallel)
           ├── Supabase SSR: Session prüfen (parallel)
           └── BenchMapClient → BenchMap (dynamic, ssr: false)
                 ├── Leaflet-Karte + Marker
                 ├── LocationController (Geolocation)
                 └── ClickHandler → /benches/new
```

## Route-Schutz

`proxy.ts` (Next.js 16 Middleware) schützt `/benches/new`.
⚠️ In Next.js 16 heißt diese Datei `proxy.ts` — nicht `middleware.ts`.

Auth-Checks verwenden `supabase.auth.getUser()` (JWT-Validierung gegen Supabase-Server), nicht `getSession()` (liest nur aus Cookie).

## Auth

Supabase Auth verwaltet Email/Passwort, Tokens und Sessions komplett.

- **Registrierung:** `supabase.auth.signUp()` mit `options.data.username` → Trigger legt `profiles`-Zeile an
- **Login:** `supabase.auth.signInWithPassword()`
- **Session:** Cookie-basiert, automatisch synchronisiert via `@supabase/ssr`

## Key Libraries

| Library | Zweck |
|---|---|
| `@supabase/ssr` | Supabase-Clients für Next.js Server + Browser |
| `react-leaflet` | Leaflet-Karte als React-Komponenten |
| `leaflet` | Basis-Kartenbibliothek |
| Vitest | Unit-Tests für Server Actions |
