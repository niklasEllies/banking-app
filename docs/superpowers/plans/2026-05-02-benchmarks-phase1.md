# BenchMarks Phase 1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Grundgerüst von BenchMarks – Supabase Auth, interaktive Leaflet-Karte, Bänke eintragen und anzeigen.

**Architecture:** Server Components laden Bankdaten serverseitig via Supabase SSR und übergeben sie als Props an eine Client Component (`BenchMap`). Auth via Supabase Auth + Server Actions. Route-Schutz via `proxy.ts` (Next.js 16 — nicht `middleware.ts`).

**Tech Stack:** Next.js 16.2 (App Router), React 19, TypeScript, Tailwind v4, Supabase (`@supabase/ssr`), react-leaflet, Vitest

---

## Dateistruktur

### Neue Dateien

| Datei | Verantwortlichkeit |
|---|---|
| `lib/supabase/server.ts` | Supabase-Client für Server Components/Actions |
| `lib/supabase/client.ts` | Supabase-Client für Client Components |
| `actions/auth.ts` | Server Actions: signUp, login, logout |
| `actions/benches.ts` | Server Action: createBench |
| `proxy.ts` | Route-Schutz (Next.js 16 Middleware-Äquivalent) |
| `components/BenchMap.tsx` | Leaflet-Karte (Client Component, dynamic import) |
| `components/BottomSheet.tsx` | Swipe-to-dismiss Bottom Sheet |
| `components/MapHeader.tsx` | Floating Header mit Auth-State |
| `components/AddBenchForm.tsx` | Formular für neue Bank (Client Component) |
| `app/(auth)/login/page.tsx` | Login-Seite |
| `app/(auth)/signup/page.tsx` | Registrierungs-Seite |
| `app/(app)/page.tsx` | Hauptseite (Server Component) |
| `app/(app)/benches/new/page.tsx` | Bank-eintragen-Seite |
| `__tests__/actions/auth.test.ts` | Tests für Auth Server Actions |
| `__tests__/actions/benches.test.ts` | Tests für Bench Server Action |
| `vitest.config.ts` | Test-Konfiguration |
| `docs/architecture.md` | Architekturübersicht |
| `docs/database-schema.md` | Datenbankschema |
| `docs/feature-status.md` | Feature-Status je Phase |

### Geänderte Dateien

| Datei | Änderung |
|---|---|
| `package.json` | Neue Dependencies + test-Script |
| `app/layout.tsx` | Metadata: "BenchMarks" |
| `app/page.tsx` | Wird gelöscht (ersetzt durch `(app)/page.tsx`) |

---

## Task 1: Dependencies installieren

**Files:**
- Modify: `package.json`
- Create: `public/leaflet/` (Marker-Icons)

- [ ] **Step 1: React-leaflet und Vitest installieren**

```bash
npm install react-leaflet leaflet
npm install -D @types/leaflet vitest @vitejs/plugin-react
```

- [ ] **Step 2: test-Script zu package.json hinzufügen**

In `package.json`, `scripts`-Block ergänzen:

```json
"test": "vitest"
```

Resultat:
```json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "eslint",
    "test": "vitest"
  }
}
```

- [ ] **Step 3: Leaflet-Icons ins public-Verzeichnis kopieren**

Leaflet sucht seine Marker-Icons über einen Pfad, der mit Webpack/Next.js nicht funktioniert. Wir legen sie manuell unter `public/leaflet/` ab und referenzieren sie explizit.

```powershell
New-Item -ItemType Directory -Force public/leaflet
Copy-Item node_modules/leaflet/dist/images/marker-icon.png public/leaflet/
Copy-Item node_modules/leaflet/dist/images/marker-icon-2x.png public/leaflet/
Copy-Item node_modules/leaflet/dist/images/marker-shadow.png public/leaflet/
```

- [ ] **Step 4: Commit**

```bash
git add package.json package-lock.json public/leaflet/
git commit -m "chore: add react-leaflet, vitest, and leaflet marker icons"
```

---

## Task 2: Environment Variables einrichten

**Files:**
- Create: `.env.local`

> `.env.local` ist in `.gitignore` — wird nie committet. Das ist korrekt so.

- [ ] **Step 1: Supabase-Projekt anlegen und konfigurieren (falls noch nicht geschehen)**

  1. Öffne [supabase.com](https://supabase.com) → New Project
  2. Warte bis das Projekt bereit ist
  3. Notiere: **Project URL** und **Anon Key** (Settings → API → Project API keys)
  4. **Email-Bestätigung deaktivieren** (sonst funktioniert der Sign-up im Entwicklungsbetrieb nicht):
     Settings → Authentication → Email → "Confirm email" deaktivieren

- [ ] **Step 2: `.env.local` anlegen**

```bash
# .env.local
NEXT_PUBLIC_SUPABASE_URL=https://DEINE_PROJECT_ID.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=dein_anon_key_hier
```

---

## Task 3: Supabase Datenbankschema anlegen

Die SQL-Befehle werden im Supabase Dashboard unter **SQL Editor → New query** ausgeführt.

- [ ] **Step 1: profiles-Tabelle + RLS anlegen**

```sql
create table public.profiles (
  id         uuid references auth.users on delete cascade primary key,
  username   text unique not null,
  created_at timestamptz default now() not null
);

alter table public.profiles enable row level security;

create policy "profiles sind öffentlich lesbar"
  on public.profiles for select
  using (true);

create policy "nutzer kann nur eigenes profil schreiben"
  on public.profiles for insert
  with check (id = auth.uid());

create policy "nutzer kann nur eigenes profil updaten"
  on public.profiles for update
  using (id = auth.uid());
```

- [ ] **Step 2: Trigger anlegen**

Beim Registrieren wird automatisch eine `profiles`-Zeile angelegt. Der Username kommt aus `user_metadata`, die wir beim `signUp`-Aufruf übergeben.

`security definer` bedeutet: der Trigger läuft mit den Rechten seines Erstellers (Superuser), damit er trotz RLS in `profiles` schreiben darf.

```sql
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  insert into public.profiles (id, username)
  values (
    new.id,
    new.raw_user_meta_data->>'username'
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
```

- [ ] **Step 3: benches-Tabelle + RLS anlegen**

```sql
create table public.benches (
  id         uuid primary key default gen_random_uuid(),
  created_by uuid references public.profiles(id) on delete set null,
  lat        float8 not null,
  lng        float8 not null,
  name       text,
  created_at timestamptz default now() not null
);

alter table public.benches enable row level security;

create policy "bänke sind öffentlich lesbar"
  on public.benches for select
  using (true);

create policy "eingeloggte nutzer können bänke eintragen"
  on public.benches for insert
  with check (auth.uid() is not null);
```

- [ ] **Step 4: Überprüfen**

Im Supabase Dashboard unter **Table Editor** prüfen: `profiles` und `benches` sind sichtbar. Unter **Authentication → Triggers** sollte `on_auth_user_created` erscheinen.

---

## Task 4: Supabase Clients

**Files:**
- Create: `lib/supabase/server.ts`
- Create: `lib/supabase/client.ts`

- [ ] **Step 1: Server Client anlegen**

Der Server-Client liest und setzt Cookies über Next.js' `cookies()` API — so bleibt die Supabase-Session serverseitig verfügbar.

`lib/supabase/server.ts`:
```ts
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function createClient() {
  const cookieStore = await cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // In Server Components können keine Cookies gesetzt werden —
            // das ist OK, die Session wird dort nur gelesen
          }
        },
      },
    }
  )
}
```

- [ ] **Step 2: Browser Client anlegen**

`lib/supabase/client.ts`:
```ts
import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add lib/supabase/server.ts lib/supabase/client.ts
git commit -m "feat: add supabase server and browser clients"
```

---

## Task 5: Vitest konfigurieren

**Files:**
- Create: `vitest.config.ts`

- [ ] **Step 1: vitest.config.ts anlegen**

```ts
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'node',
    globals: true,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    },
  },
})
```

- [ ] **Step 2: Commit**

```bash
git add vitest.config.ts
git commit -m "chore: add vitest configuration"
```

---

## Task 6: Auth Server Actions (TDD)

**Files:**
- Create: `__tests__/actions/auth.test.ts`
- Create: `actions/auth.ts`

- [ ] **Step 1: Test-Datei anlegen**

`__tests__/actions/auth.test.ts`:
```ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { signUp, login, logout } from '@/actions/auth'
import * as supabaseServer from '@/lib/supabase/server'

vi.mock('@/lib/supabase/server')
vi.mock('next/navigation', () => ({
  redirect: vi.fn((url: string) => {
    throw { digest: 'NEXT_REDIRECT', url }
  }),
}))
vi.mock('next/headers', () => ({
  cookies: vi.fn(() => ({
    getAll: () => [],
    set: vi.fn(),
  })),
}))

const mockSupabase = {
  auth: {
    signUp: vi.fn(),
    signInWithPassword: vi.fn(),
    signOut: vi.fn(),
  },
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(supabaseServer.createClient).mockResolvedValue(mockSupabase as any)
})

describe('signUp', () => {
  it('gibt Fehler zurück wenn Email fehlt', async () => {
    const fd = new FormData()
    fd.set('password', 'pass123')
    fd.set('username', 'user')

    const result = await signUp(undefined, fd)
    expect(result).toEqual({ error: 'Email, Passwort und Username sind erforderlich' })
  })

  it('ruft supabase.auth.signUp mit korrekten Parametern auf', async () => {
    mockSupabase.auth.signUp.mockResolvedValue({ error: null })
    const fd = new FormData()
    fd.set('email', 'test@example.com')
    fd.set('password', 'pass123')
    fd.set('username', 'testuser')

    await expect(signUp(undefined, fd)).rejects.toMatchObject({ digest: 'NEXT_REDIRECT' })
    expect(mockSupabase.auth.signUp).toHaveBeenCalledWith({
      email: 'test@example.com',
      password: 'pass123',
      options: { data: { username: 'testuser' } },
    })
  })

  it('gibt Supabase-Fehler zurück', async () => {
    mockSupabase.auth.signUp.mockResolvedValue({ error: { message: 'Email already registered' } })
    const fd = new FormData()
    fd.set('email', 'test@example.com')
    fd.set('password', 'pass123')
    fd.set('username', 'testuser')

    const result = await signUp(undefined, fd)
    expect(result).toEqual({ error: 'Email already registered' })
  })
})

describe('login', () => {
  it('gibt Fehler zurück wenn Email fehlt', async () => {
    const fd = new FormData()
    fd.set('password', 'pass123')

    const result = await login(undefined, fd)
    expect(result).toEqual({ error: 'Email und Passwort sind erforderlich' })
  })

  it('ruft signInWithPassword auf und redirectet', async () => {
    mockSupabase.auth.signInWithPassword.mockResolvedValue({ error: null })
    const fd = new FormData()
    fd.set('email', 'test@example.com')
    fd.set('password', 'pass123')

    await expect(login(undefined, fd)).rejects.toMatchObject({ digest: 'NEXT_REDIRECT' })
    expect(mockSupabase.auth.signInWithPassword).toHaveBeenCalledWith({
      email: 'test@example.com',
      password: 'pass123',
    })
  })
})

describe('logout', () => {
  it('ruft signOut auf und redirectet zu /', async () => {
    mockSupabase.auth.signOut.mockResolvedValue({ error: null })

    await expect(logout()).rejects.toMatchObject({ digest: 'NEXT_REDIRECT', url: '/' })
    expect(mockSupabase.auth.signOut).toHaveBeenCalled()
  })
})
```

- [ ] **Step 2: Tests laufen lassen — müssen fehlschlagen**

```bash
npm test
```

Erwartet: FAIL mit `Cannot find module '@/actions/auth'`

- [ ] **Step 3: Auth Server Actions implementieren**

`actions/auth.ts`:
```ts
'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

type FormState = { error: string } | undefined

export async function signUp(state: FormState, formData: FormData): Promise<FormState> {
  const email = formData.get('email') as string
  const password = formData.get('password') as string
  const username = formData.get('username') as string

  if (!email || !password || !username) {
    return { error: 'Email, Passwort und Username sind erforderlich' }
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { username } },
  })

  if (error) return { error: error.message }

  redirect('/')
}

export async function login(state: FormState, formData: FormData): Promise<FormState> {
  const email = formData.get('email') as string
  const password = formData.get('password') as string

  if (!email || !password) {
    return { error: 'Email und Passwort sind erforderlich' }
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.signInWithPassword({ email, password })

  if (error) return { error: error.message }

  redirect('/')
}

export async function logout() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect('/')
}
```

- [ ] **Step 4: Tests laufen lassen — müssen grün sein**

```bash
npm test
```

Erwartet: 7 passing

- [ ] **Step 5: Commit**

```bash
git add actions/auth.ts __tests__/actions/auth.test.ts
git commit -m "feat: add auth server actions with tests"
```

---

## Task 7: proxy.ts (Route-Schutz)

**Files:**
- Create: `proxy.ts`

- [ ] **Step 1: proxy.ts anlegen**

In Next.js 16 heißt die Middleware-Datei `proxy.ts` (nicht `middleware.ts` wie in älteren Versionen). Die Funktion heißt ebenfalls `proxy`.

`proxy.ts`:
```ts
import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'

const protectedRoutes = ['/benches/new']

export default async function proxy(req: NextRequest) {
  const res = NextResponse.next()

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return req.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            req.cookies.set(name, value)
            res.cookies.set(name, value, options)
          })
        },
      },
    }
  )

  const { data: { session } } = await supabase.auth.getSession()

  if (protectedRoutes.includes(req.nextUrl.pathname) && !session) {
    return NextResponse.redirect(new URL('/login', req.url))
  }

  return res
}

export const config = {
  // Läuft auf allen Routen außer statischen Assets und Leaflet-Icons
  matcher: ['/((?!_next/static|_next/image|favicon.ico|leaflet|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
}
```

- [ ] **Step 2: Commit**

```bash
git add proxy.ts
git commit -m "feat: add proxy route protection for /benches/new"
```

---

## Task 8: App Layout aktualisieren

**Files:**
- Modify: `app/layout.tsx`
- Delete: `app/page.tsx`

- [ ] **Step 1: layout.tsx aktualisieren**

Nur Metadata ändern (Titel + Beschreibung). Den Rest unverändert lassen.

`app/layout.tsx`:
```tsx
import type { Metadata } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import './globals.css'

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
})

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
})

export const metadata: Metadata = {
  title: 'BenchMarks',
  description: 'Community-App zum Sammeln und Bewerten von Parkbänken',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="de" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  )
}
```

- [ ] **Step 2: Standard page.tsx entfernen**

Die Hauptseite wird von `app/(app)/page.tsx` übernommen. Beide gleichzeitig zu haben würde einen Routing-Konflikt verursachen.

```bash
git rm app/page.tsx
```

- [ ] **Step 3: Commit**

```bash
git add app/layout.tsx
git commit -m "feat: update app layout metadata and remove default page"
```

---

## Task 9: Login- und Signup-Seiten

**Files:**
- Create: `app/(auth)/login/page.tsx`
- Create: `app/(auth)/signup/page.tsx`

- [ ] **Step 1: Login-Seite anlegen**

`useActionState` ist ein React 19 Hook, der Server Actions mit Formular-State verbindet. Er gibt `[state, action, pending]` zurück — `state` enthält den Rückgabewert der Server Action (z.B. `{ error: '...' }`), `pending` ist `true` während die Action läuft.

`app/(auth)/login/page.tsx`:
```tsx
'use client'

import { useActionState } from 'react'
import Link from 'next/link'
import { login } from '@/actions/auth'

export default function LoginPage() {
  const [state, action, pending] = useActionState(login, undefined)

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-sm">
        <h1 className="text-2xl font-bold text-center mb-8">🪑 BenchMarks</h1>
        <form action={action} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-600"
            />
          </div>
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
              Passwort
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-600"
            />
          </div>
          {state?.error && (
            <p className="text-sm text-red-600">{state.error}</p>
          )}
          <button
            type="submit"
            disabled={pending}
            className="w-full bg-green-700 text-white rounded-lg py-2 text-sm font-medium hover:bg-green-800 disabled:opacity-50"
          >
            {pending ? 'Einloggen...' : 'Einloggen'}
          </button>
        </form>
        <p className="text-center text-sm text-gray-600 mt-4">
          Noch kein Konto?{' '}
          <Link href="/signup" className="text-green-700 font-medium hover:underline">
            Registrieren
          </Link>
        </p>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Signup-Seite anlegen**

`app/(auth)/signup/page.tsx`:
```tsx
'use client'

import { useActionState } from 'react'
import Link from 'next/link'
import { signUp } from '@/actions/auth'

export default function SignupPage() {
  const [state, action, pending] = useActionState(signUp, undefined)

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-sm">
        <h1 className="text-2xl font-bold text-center mb-8">🪑 BenchMarks</h1>
        <form action={action} className="space-y-4">
          <div>
            <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-1">
              Username
            </label>
            <input
              id="username"
              name="username"
              type="text"
              required
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-600"
            />
          </div>
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-600"
            />
          </div>
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
              Passwort
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              minLength={6}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-600"
            />
          </div>
          {state?.error && (
            <p className="text-sm text-red-600">{state.error}</p>
          )}
          <button
            type="submit"
            disabled={pending}
            className="w-full bg-green-700 text-white rounded-lg py-2 text-sm font-medium hover:bg-green-800 disabled:opacity-50"
          >
            {pending ? 'Registrieren...' : 'Konto erstellen'}
          </button>
        </form>
        <p className="text-center text-sm text-gray-600 mt-4">
          Schon ein Konto?{' '}
          <Link href="/login" className="text-green-700 font-medium hover:underline">
            Einloggen
          </Link>
        </p>
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add "app/(auth)/"
git commit -m "feat: add login and signup pages"
```

---

## Task 10: BenchMap Komponente

**Files:**
- Create: `components/BenchMap.tsx`

- [ ] **Step 1: BenchMap anlegen**

Diese Komponente wird von der Hauptseite mit `dynamic(..., { ssr: false })` geladen, weil Leaflet `window` und `document` braucht und nicht serverseitig laufen kann.

`LocationController` und `ClickHandler` sind interne React-Komponenten, die die react-leaflet Hooks `useMap()` und `useMapEvents()` nutzen — diese Hooks funktionieren nur innerhalb eines `<MapContainer>`.

`components/BenchMap.tsx`:
```tsx
'use client'

import { useState, useEffect } from 'react'
import { MapContainer, TileLayer, Marker, Popup, useMap, useMapEvents } from 'react-leaflet'
import { useRouter } from 'next/navigation'
import 'leaflet/dist/leaflet.css'
import L from 'leaflet'

// Leaflet-Icons zeigen mit Webpack/Next.js auf den falschen Pfad.
// Wir verweisen manuell auf die Dateien in public/leaflet/.
delete (L.Icon.Default.prototype as any)._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: '/leaflet/marker-icon-2x.png',
  iconUrl: '/leaflet/marker-icon.png',
  shadowUrl: '/leaflet/marker-shadow.png',
})

const selectedIcon = new L.Icon({
  iconUrl: '/leaflet/marker-icon.png',
  iconRetinaUrl: '/leaflet/marker-icon-2x.png',
  shadowUrl: '/leaflet/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  className: 'hue-rotate-90',
})

export interface Bench {
  id: string
  lat: number
  lng: number
  name: string | null
}

interface BenchMapProps {
  benches: Bench[]
  isAuthenticated: boolean
}

function LocationController() {
  const map = useMap()
  useEffect(() => {
    if (!navigator.geolocation) {
      map.setView([51.1, 10.4], 6)
      return
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => map.setView([pos.coords.latitude, pos.coords.longitude], 14),
      () => map.setView([51.1, 10.4], 6)
    )
  }, [map])
  return null
}

function ClickHandler({
  enabled,
  onMapClick,
}: {
  enabled: boolean
  onMapClick: (lat: number, lng: number) => void
}) {
  useMapEvents({
    click: (e) => {
      if (enabled) onMapClick(e.latlng.lat, e.latlng.lng)
    },
  })
  return null
}

export default function BenchMap({ benches, isAuthenticated }: BenchMapProps) {
  const router = useRouter()
  const [selectedCoords, setSelectedCoords] = useState<{ lat: number; lng: number } | null>(null)

  return (
    <div className="relative w-full h-full">
      <MapContainer
        center={[51.1, 10.4]}
        zoom={6}
        className="w-full h-full"
        zoomControl={false}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <LocationController />
        <ClickHandler
          enabled={isAuthenticated}
          onMapClick={(lat, lng) => setSelectedCoords({ lat, lng })}
        />
        {benches.map((bench) => (
          <Marker key={bench.id} position={[bench.lat, bench.lng]}>
            <Popup>{bench.name || 'Bank'}</Popup>
          </Marker>
        ))}
        {selectedCoords && (
          <Marker
            position={[selectedCoords.lat, selectedCoords.lng]}
            icon={selectedIcon}
          />
        )}
      </MapContainer>

      {selectedCoords && (
        <div className="absolute bottom-24 left-1/2 -translate-x-1/2 z-1000 flex gap-2">
          <button
            onClick={() =>
              router.push(
                `/benches/new?lat=${selectedCoords.lat.toFixed(6)}&lng=${selectedCoords.lng.toFixed(6)}`
              )
            }
            className="bg-green-700 text-white px-5 py-2.5 rounded-full shadow-lg font-medium text-sm whitespace-nowrap"
          >
            Hier eintragen
          </button>
          <button
            onClick={() => setSelectedCoords(null)}
            className="bg-white text-gray-600 px-3 py-2.5 rounded-full shadow-lg text-sm"
          >
            ✕
          </button>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add components/BenchMap.tsx
git commit -m "feat: add BenchMap component with Leaflet, geolocation, and click handler"
```

---

## Task 11: BottomSheet und MapHeader

**Files:**
- Create: `components/BottomSheet.tsx`
- Create: `components/MapHeader.tsx`

- [ ] **Step 1: BottomSheet anlegen**

Das Sheet wird durch Touch-Events nach unten gezogen. Wenn der Zug > 80px, verschwindet es. Ein kleiner Button ersetzt es dann.

`components/BottomSheet.tsx`:
```tsx
'use client'

import { useState, useRef } from 'react'

interface BottomSheetProps {
  benchCount: number
}

export default function BottomSheet({ benchCount }: BottomSheetProps) {
  const [isOpen, setIsOpen] = useState(true)
  const [dragY, setDragY] = useState(0)
  const startYRef = useRef(0)

  const handleTouchStart = (e: React.TouchEvent) => {
    startYRef.current = e.touches[0].clientY
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    const delta = e.touches[0].clientY - startYRef.current
    if (delta > 0) setDragY(delta)
  }

  const handleTouchEnd = () => {
    if (dragY > 80) setIsOpen(false)
    setDragY(0)
  }

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="absolute bottom-6 left-1/2 -translate-x-1/2 z-1000 bg-white rounded-full px-4 py-2 shadow-md text-sm font-medium text-gray-700"
      >
        {benchCount} {benchCount === 1 ? 'Bank' : 'Bänke'} ↑
      </button>
    )
  }

  return (
    <div
      className="absolute bottom-0 left-0 right-0 z-1000 bg-white rounded-t-2xl shadow-[0_-4px_16px_rgba(0,0,0,0.12)]"
      style={{
        transform: `translateY(${dragY}px)`,
        transition: dragY === 0 ? 'transform 0.2s ease' : 'none',
      }}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      <div className="flex justify-center pt-3 pb-1 cursor-grab">
        <div className="w-10 h-1 bg-gray-300 rounded-full" />
      </div>
      <div className="px-5 py-3 pb-8">
        <p className="text-sm text-gray-600">
          <span className="font-semibold text-gray-900">{benchCount}</span>{' '}
          {benchCount === 1 ? 'Bank' : 'Bänke'} eingetragen
        </p>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: MapHeader anlegen**

`MapHeader` ist ein Server Component — es kann direkt Supabase abfragen, ohne Client-State. `logout` ist eine Server Action und kann direkt als `action` eines Formulars verwendet werden.

`components/MapHeader.tsx`:
```tsx
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { logout } from '@/actions/auth'

export default async function MapHeader() {
  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()

  return (
    <div className="absolute top-3 left-3 right-3 z-1000 flex items-center justify-between bg-white/95 backdrop-blur-sm rounded-2xl px-4 py-2.5 shadow-md">
      <span className="font-semibold text-gray-900 text-sm">🪑 BenchMarks</span>
      {session ? (
        <form action={logout}>
          <button type="submit" className="text-sm text-gray-600 hover:text-gray-900">
            Logout
          </button>
        </form>
      ) : (
        <Link href="/login" className="text-sm text-green-700 font-medium hover:underline">
          Login
        </Link>
      )}
    </div>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add components/BottomSheet.tsx components/MapHeader.tsx
git commit -m "feat: add BottomSheet and MapHeader components"
```

---

## Task 12: Hauptseite

**Files:**
- Create: `app/(app)/page.tsx`

- [ ] **Step 1: Hauptseite anlegen**

`app/(app)/page.tsx`:
```tsx
import dynamic from 'next/dynamic'
import { createClient } from '@/lib/supabase/server'
import MapHeader from '@/components/MapHeader'
import BottomSheet from '@/components/BottomSheet'
import type { Bench } from '@/components/BenchMap'

// Leaflet läuft nicht auf dem Server — ssr: false verhindert den serverseitigen Import.
// Die Bankdaten werden vom Server geladen und als Props übergeben.
const BenchMap = dynamic(() => import('@/components/BenchMap'), { ssr: false })

export default async function HomePage() {
  const supabase = await createClient()

  const [{ data: benches }, { data: { session } }] = await Promise.all([
    supabase.from('benches').select('id, lat, lng, name'),
    supabase.auth.getSession(),
  ])

  const benchList: Bench[] = benches ?? []

  return (
    <div className="relative w-full h-screen overflow-hidden">
      <MapHeader />
      <BenchMap benches={benchList} isAuthenticated={!!session} />
      <BottomSheet benchCount={benchList.length} />
    </div>
  )
}
```

- [ ] **Step 2: Dev-Server starten und visuell prüfen**

```bash
npm run dev
```

Öffne http://localhost:3000. Prüfen:
- Karte lädt und zentriert auf Standort (Browser fragt nach Erlaubnis) oder Deutschland
- Header sichtbar mit "Login"-Link
- Bottom Sheet sichtbar, swipe-to-dismiss funktioniert auf Mobile

- [ ] **Step 3: Commit**

```bash
git add "app/(app)/page.tsx"
git commit -m "feat: add main map page with bench markers and bottom sheet"
```

---

## Task 13: createBench Server Action + Add-Bench-Seite (TDD)

**Files:**
- Create: `__tests__/actions/benches.test.ts`
- Create: `actions/benches.ts`
- Create: `components/AddBenchForm.tsx`
- Create: `app/(app)/benches/new/page.tsx`

- [ ] **Step 1: Test-Datei anlegen**

`__tests__/actions/benches.test.ts`:
```ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createBench } from '@/actions/benches'
import * as supabaseServer from '@/lib/supabase/server'

vi.mock('@/lib/supabase/server')
vi.mock('next/navigation', () => ({
  redirect: vi.fn((url: string) => {
    throw { digest: 'NEXT_REDIRECT', url }
  }),
}))
vi.mock('next/headers', () => ({
  cookies: vi.fn(() => ({ getAll: () => [], set: vi.fn() })),
}))

const mockInsert = vi.fn()
const mockSupabase = {
  auth: {
    getUser: vi.fn(),
  },
  from: vi.fn(() => ({ insert: mockInsert })),
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(supabaseServer.createClient).mockResolvedValue(mockSupabase as any)
})

describe('createBench', () => {
  it('gibt Fehler zurück wenn nicht eingeloggt', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: null } })
    const fd = new FormData()
    fd.set('lat', '51.5')
    fd.set('lng', '9.9')

    const result = await createBench(undefined, fd)
    expect(result).toEqual({ error: 'Nicht eingeloggt' })
  })

  it('gibt Fehler zurück wenn Koordinaten fehlen', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: { id: 'user-1' } } })
    const fd = new FormData()

    const result = await createBench(undefined, fd)
    expect(result).toEqual({ error: 'Koordinaten fehlen' })
  })

  it('legt Bank in Supabase an und redirectet zu /', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: { id: 'user-1' } } })
    mockInsert.mockResolvedValue({ error: null })

    const fd = new FormData()
    fd.set('lat', '51.5074')
    fd.set('lng', '9.9')
    fd.set('name', 'Meine Bank')

    await expect(createBench(undefined, fd)).rejects.toMatchObject({ digest: 'NEXT_REDIRECT', url: '/' })
    expect(mockInsert).toHaveBeenCalledWith({
      lat: 51.5074,
      lng: 9.9,
      name: 'Meine Bank',
      created_by: 'user-1',
    })
  })

  it('speichert null wenn Name leer', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: { id: 'user-1' } } })
    mockInsert.mockResolvedValue({ error: null })

    const fd = new FormData()
    fd.set('lat', '51.5074')
    fd.set('lng', '9.9')

    await expect(createBench(undefined, fd)).rejects.toMatchObject({ digest: 'NEXT_REDIRECT' })
    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({ name: null })
    )
  })
})
```

- [ ] **Step 2: Tests laufen lassen — müssen fehlschlagen**

```bash
npm test
```

Erwartet: FAIL mit `Cannot find module '@/actions/benches'`

- [ ] **Step 3: createBench Server Action implementieren**

`actions/benches.ts`:
```ts
'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

type FormState = { error: string } | undefined

export async function createBench(state: FormState, formData: FormData): Promise<FormState> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return { error: 'Nicht eingeloggt' }

  const lat = parseFloat(formData.get('lat') as string)
  const lng = parseFloat(formData.get('lng') as string)

  if (isNaN(lat) || isNaN(lng)) return { error: 'Koordinaten fehlen' }

  const nameRaw = formData.get('name') as string
  const name = nameRaw?.trim() || null

  const { error } = await supabase.from('benches').insert({
    lat,
    lng,
    name,
    created_by: user.id,
  })

  if (error) return { error: error.message }

  redirect('/')
}
```

- [ ] **Step 4: Tests laufen lassen — müssen grün sein**

```bash
npm test
```

Erwartet: alle Tests passing

- [ ] **Step 5: AddBenchForm Client Component anlegen**

`components/AddBenchForm.tsx`:
```tsx
'use client'

import { useActionState, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createBench } from '@/actions/benches'

interface AddBenchFormProps {
  initialLat: number
  initialLng: number
}

export default function AddBenchForm({ initialLat, initialLng }: AddBenchFormProps) {
  const router = useRouter()
  const [state, action, pending] = useActionState(createBench, undefined)
  const [lat, setLat] = useState(initialLat)
  const [lng, setLng] = useState(initialLng)

  const useCurrentLocation = () => {
    if (!navigator.geolocation) return
    navigator.geolocation.getCurrentPosition((pos) => {
      setLat(pos.coords.latitude)
      setLng(pos.coords.longitude)
    })
  }

  return (
    <form action={action} className="space-y-5">
      <div className="bg-gray-50 rounded-xl p-4">
        <p className="text-xs text-gray-500 mb-1">Position</p>
        <p className="text-sm font-mono text-gray-800">
          {lat.toFixed(5)}, {lng.toFixed(5)}
        </p>
        <input type="hidden" name="lat" value={lat} />
        <input type="hidden" name="lng" value={lng} />
        <button
          type="button"
          onClick={useCurrentLocation}
          className="mt-2 text-xs text-green-700 font-medium hover:underline"
        >
          📍 Meinen Standort verwenden
        </button>
      </div>

      <div>
        <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
          Name / Bezeichnung{' '}
          <span className="text-gray-400 font-normal">(optional)</span>
        </label>
        <input
          id="name"
          name="name"
          type="text"
          placeholder="z.B. Bank am Teich"
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-600"
        />
      </div>

      {state?.error && (
        <p className="text-sm text-red-600">{state.error}</p>
      )}

      <div className="flex gap-3">
        <button
          type="button"
          onClick={() => router.back()}
          className="flex-1 border border-gray-300 text-gray-700 rounded-lg py-2.5 text-sm font-medium hover:bg-gray-50"
        >
          Abbrechen
        </button>
        <button
          type="submit"
          disabled={pending}
          className="flex-1 bg-green-700 text-white rounded-lg py-2.5 text-sm font-medium hover:bg-green-800 disabled:opacity-50"
        >
          {pending ? 'Speichern...' : 'Bank eintragen'}
        </button>
      </div>
    </form>
  )
}
```

- [ ] **Step 6: Add-Bench-Seite anlegen**

In Next.js 16 ist `searchParams` asynchron — deshalb `await searchParams`.

`app/(app)/benches/new/page.tsx`:
```tsx
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import AddBenchForm from '@/components/AddBenchForm'

interface PageProps {
  searchParams: Promise<{ lat?: string; lng?: string }>
}

export default async function NewBenchPage({ searchParams }: PageProps) {
  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()

  if (!session) redirect('/login')

  const params = await searchParams
  const lat = parseFloat(params.lat ?? '51.1')
  const lng = parseFloat(params.lng ?? '10.4')

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-sm mx-auto px-4 py-8">
        <Link
          href="/"
          className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1 mb-6"
        >
          ← Zurück zur Karte
        </Link>
        <h1 className="text-xl font-bold text-gray-900 mb-6">Bank eintragen</h1>
        <AddBenchForm initialLat={lat} initialLng={lng} />
      </div>
    </div>
  )
}
```

- [ ] **Step 7: Vollständig manuell testen**

```bash
npm run dev
```

Testen:
1. `/login` → einloggen
2. Karte klicken → grüner Marker + "Hier eintragen"-Button erscheint
3. Button klicken → `/benches/new?lat=...&lng=...` öffnet sich
4. Formular mit Name ausfüllen → absenden → Karte, neuer Marker sichtbar
5. Nochmal öffnen → "Meinen Standort verwenden" klicken → Koordinaten ändern sich
6. Ausloggen → kein Klick-Handler mehr auf Karte
7. `/benches/new` direkt aufrufen (ausgeloggt) → Weiterleitung zu `/login`

- [ ] **Step 8: Commit**

```bash
git add actions/benches.ts "__tests__/actions/benches.test.ts" components/AddBenchForm.tsx "app/(app)/benches/"
git commit -m "feat: add bench creation with server action, form, and page"
```

---

## Task 14: Dokumentation

**Files:**
- Create: `docs/architecture.md`
- Create: `docs/database-schema.md`
- Create: `docs/feature-status.md`

- [ ] **Step 1: Architekturübersicht anlegen**

`docs/architecture.md`:
```markdown
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
           └── BenchMap (dynamic, ssr: false)
                 ├── Leaflet-Karte + Marker
                 ├── LocationController (Geolocation)
                 └── ClickHandler → /benches/new
```

## Route-Schutz

`proxy.ts` (Next.js 16 Middleware) schützt `/benches/new`.
⚠️ In Next.js 16 heißt diese Datei `proxy.ts` — nicht `middleware.ts`.

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
```

- [ ] **Step 2: Datenbankschema dokumentieren**

`docs/database-schema.md`:
```markdown
# Datenbankschema

## profiles

Nutzerprofil, verknüpft mit Supabase Auth.

| Spalte | Typ | Beschreibung |
|---|---|---|
| `id` | `uuid` | PK, FK → `auth.users.id` |
| `username` | `text` | Unique |
| `created_at` | `timestamptz` | Auto: `now()` |

**Trigger:** `on_auth_user_created` — legt Zeile automatisch bei Registrierung an.
Username kommt aus `user_metadata` (`options.data.username` beim `signUp`-Aufruf).

## benches

| Spalte | Typ | Beschreibung |
|---|---|---|
| `id` | `uuid` | PK, `gen_random_uuid()` |
| `created_by` | `uuid` | FK → `profiles.id`, nullable, ON DELETE SET NULL |
| `lat` | `float8` | Breitengrad |
| `lng` | `float8` | Längengrad |
| `name` | `text` | Nullable |
| `created_at` | `timestamptz` | Auto: `now()` |

> Phase 2 ergänzt: `rarity_votes`, `view_rating`, `comfort_rating`, `condition`, `shadow`, `extras`, `photo_url`

## RLS-Policies

| Tabelle | Operation | Bedingung |
|---|---|---|
| `benches` | SELECT | Alle (auch anonym) |
| `benches` | INSERT | `auth.uid() IS NOT NULL` |
| `profiles` | SELECT | Alle |
| `profiles` | INSERT/UPDATE | `id = auth.uid()` |
```

- [ ] **Step 3: Feature-Status anlegen**

`docs/feature-status.md`:
```markdown
# Feature-Status

## Phase 1 – Grundgerüst ✅

- [x] Supabase Auth (Email/Passwort)
- [x] Interaktive Leaflet-Karte
- [x] Karte zentriert auf Nutzerstandort (Fallback: Deutschland)
- [x] Bänke auf der Karte anzeigen (Marker)
- [x] Bank eintragen (Kartenklick oder aktueller Standort)
- [x] Route-Schutz für nicht-eingeloggte Nutzer
- [x] Anonyme Nutzer: Karte sichtbar, keine Interaktion
- [x] Bottom Sheet mit swipe-to-dismiss

## Phase 2 – Bank-Details 🔜

- [ ] Foto-Upload (Supabase Storage)
- [ ] Rarity-Voting (Community-Median: Common → Legendary)
- [ ] View-Bewertung (1–5)
- [ ] Sitzkomfort (1–5)
- [ ] Zustand (Float 0.0–1.0, CS:GO-Stil)
- [ ] Schatten (Kein / Ja / Tageszeitabhängig)
- [ ] Extras (Mülleimer, etc.)

## Phase 3 – Community & Bestätigung 🔜

- [ ] Bestätigungs-Mechanismus (3 Bestätigungen nötig)
- [ ] "Existiert nicht mehr"-Meldung

## Phase 4 – Gamification 🔜

- [ ] Punktesystem (Bank eintragen +10, Foto +5, Bestätigen +2, Erste Bestätigung +3)
- [ ] Badges (Erste Bank, Entdecker, Legendary, etc.)
- [ ] Nutzerprofil mit Punktestand und Badge-Übersicht
```

- [ ] **Step 4: Commit**

```bash
git add docs/architecture.md docs/database-schema.md docs/feature-status.md
git commit -m "docs: add architecture, database schema, and feature status"
```

---

## Abschluss: Smoke-Test

- [ ] `npm test` — alle Tests grün
- [ ] `npm run build` — muss fehlerfrei durchlaufen
- [ ] Manueller Flow als nicht-eingeloggter Nutzer:
  - `/` → Karte + Bottom Sheet sichtbar
  - Auf Karte klicken → keine Reaktion (korrekt)
  - `/benches/new` direkt aufrufen → Weiterleitung zu `/login`
- [ ] Manueller Flow als eingeloggter Nutzer:
  - `/signup` → Konto erstellen → Weiterleitung zu `/`
  - Karte klicken → Marker + "Hier eintragen" erscheint
  - Bank eintragen → Marker auf Karte sichtbar
  - Logout → kein Klick-Handler mehr
