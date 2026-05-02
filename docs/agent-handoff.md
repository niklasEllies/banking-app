# Agent Handoff — BenchMarks

Dieses Dokument ermöglicht einem AI-Agenten, das Projekt ohne Vorwissen fortzuführen.

## Was ist BenchMarks?

Eine Community-Web-App zum Sammeln und Bewerten von Parkbänken. Nutzer tragen Bänke auf einer Karte ein, können sie bewerten und bestätigen. Gamification geplant (Punkte, Badges).

**Arbeitstitel** "banking-app" (Verzeichnisname) — tatsächlicher Name: **BenchMarks**.

## Umgebung

- Windows 11, PowerShell
- Node.js 24 LTS
- Git: branch `master`
- Dev-Server: `npm run dev` → http://localhost:3000
- Tests: `npm test`
- Build: `npm run build`

## Supabase Setup (manuell nötig)

Der Nutzer hat ein Supabase-Projekt. Connection-Daten liegen in `.env` (gitignored):
```
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=...   ← nicht ANON_KEY!
```

**Achtung:** Neuer Supabase Key-Name. Code nutzt `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`.

## Ausstehende manuelle Schritte (Supabase SQL)

Folgender SQL muss im Supabase Dashboard (SQL Editor) ausgeführt werden, falls noch nicht geschehen:

```sql
-- DELETE Policy für eigene Bänke
create policy "nutzer kann eigene bänke löschen"
  on public.benches for delete
  using (auth.uid() = created_by);
```

## Architektur-Entscheidungen (Begründungen)

| Entscheidung | Grund |
|---|---|
| `proxy.ts` statt `middleware.ts` | Next.js 16 breaking change |
| `getUser()` statt `getSession()` | Sicherheit: getSession validiert JWT nicht |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Supabase hat Key-Namen umbenannt |
| `ssr: false` in `BenchMapClient.tsx` | Leaflet braucht `window`, darf nicht server-seitig importiert werden |
| `dynamic` muss in Client Component sein | Next.js 16: `ssr: false` nicht in Server Components erlaubt |
| Two-Phase GPS | Schnelles UX (Netzwerk < 1s) + Genauigkeit (GPS später) |
| Nominatim statt Google Maps | Kostenlos, kein API-Key, für Bench-Suche ausreichend |

## Bekannte Muster im Code

### Server Action aufrufen
```ts
// Server Action in Client Component:
import { createBench } from '@/actions/benches'
const [state, action, pending] = useActionState(createBench, undefined)
```

### Supabase in Server Component
```ts
import { createClient } from '@/lib/supabase/server'
const supabase = await createClient()
const { data: { user } } = await supabase.auth.getUser()
```

### Route schützen (Server Component)
```ts
if (!user) redirect('/login')
```

### Neue Seite anlegen
- Unter `app/(app)/` für eingeloggte Nutzer (kein Layout-Unterschied, aber logische Gruppierung)
- Unter `app/(auth)/` für Auth-Seiten
- `proxy.ts` updaten falls Route geschützt werden soll

## Phase 2 — nächste Schritte

Beim Start von Phase 2 braucht es:

1. **DB-Migration** (Supabase SQL Editor):
```sql
alter table public.benches add column photo_url text;
alter table public.benches add column view_rating float;
alter table public.benches add column comfort_rating float;
alter table public.benches add column condition float; -- 0.0–1.0
alter table public.benches add column shadow text check (shadow in ('none','yes','timedependent'));
alter table public.benches add column has_bin boolean default false;

create table public.rarity_votes (
  id uuid primary key default gen_random_uuid(),
  bench_id uuid references public.benches(id) on delete cascade,
  user_id uuid references public.profiles(id) on delete cascade,
  value int check (value between 1 and 5), -- 1=Common, 5=Legendary
  created_at timestamptz default now(),
  unique(bench_id, user_id)
);
```

2. **Supabase Storage Bucket** `bench-photos` anlegen (public)

3. **Foto-Upload** in `AddBenchForm` + `actions/benches.ts`

4. **Rarity-Voting** — Median-Berechnung, Stufen: 1=Common, 2=Uncommon, 3=Rare, 4=Epic, 5=Legendary

## Stil-Guide

- **Tailwind v4**: Custom-Colors via `bg-primary`, `text-accent` etc. (definiert in `globals.css`)
- Keine Dark Mode Unterstützung in Phase 1
- Mobile-first: alle UI-Elemente auf 360px-Breite testen
- Commits nach jedem Feature-Slice mit sinnvoller Message
- Frag vor Umsetzung nach Optionen + Empfehlung (Nutzerwunsch)

## Dokumentation pflegen

Nach jeder Phase:
- `docs/feature-status.md` updaten (erledigte Checkboxen)
- `docs/architecture.md` bei strukturellen Änderungen updaten
- `docs/database-schema.md` bei DB-Änderungen updaten
- Diese Datei (`docs/agent-handoff.md`) bei wichtigen Entscheidungen updaten
