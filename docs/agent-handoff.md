# Agent Handoff — BenchMarks

Dieses Dokument ermöglicht einem AI-Agenten, das Projekt ohne Vorwissen fortzuführen.

> **Für Agents:** Lies vor Beginn jeder Arbeit die Dateien in dieser Reihenfolge:
> 1. `docs/agent-handoff.md` (diese Datei)
> 2. `docs/feature-status.md` — was ist erledigt, was kommt als nächstes
> 3. `docs/architecture.md` — Tech Stack, Datenfluss, Dateistruktur
> 4. `docs/database-schema.md` — Tabellen, RLS, Migrationen

## Was ist BenchMarks?

Eine Community-Web-App zum Sammeln und Bewerten von Parkbänken. Nutzer tragen Bänke auf einer Karte ein, bewerten sie (Komfort, Aussicht, Zustand, Rarität, Schatten, Extras) und laden Fotos hoch.

**Arbeitstitel im Repo:** "banking-app" — tatsächlicher Name: **BenchMarks**.

## Umgebung

- Windows 11, PowerShell
- Node.js 24 LTS
- Git: branch `master`
- Dev-Server: `npm run dev` → http://localhost:3000
- Tests: `npm test` (Vitest, 49 Tests)
- Build: `npm run build`

## Supabase Setup

Connection-Daten liegen in `.env` (gitignored):
```
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=...   ← nicht ANON_KEY!
SUPABASE_SERVICE_ROLE_KEY=...              ← nur server-seitig, für auth.admin.listUsers()
```

Supabase MCP ist konfiguriert (`.mcp.json` — gitignored, project_ref: `meecidtxzchqenqxwxja`).
Alle Migrationen in `supabase/migrations/` wurden in Supabase ausgeführt.

## Architektur-Entscheidungen

| Entscheidung | Grund |
|---|---|
| `proxy.ts` statt `middleware.ts` | Next.js 16 breaking change |
| `getUser()` statt `getSession()` | Sicherheit: getSession validiert JWT nicht |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Supabase hat Key-Namen umbenannt |
| `ssr: false` in `BenchMapClient.tsx` | Leaflet braucht `window` |
| `dynamic` muss in Client Component sein | Next.js 16: `ssr: false` nicht in Server Components erlaubt |
| `params: Promise<{id}>` in Pages | Next.js 16: params ist async — `use(params)` in Client Components |
| `@theme inline` + explizite dark: Hex | Tailwind v4: CSS-Var-Overrides in `.dark` funktionieren nicht für Utilities |

## Dark Mode (Forest Deep)

Forest Deep Farbpalette (Dark Mode):
- Background: `#141810`
- Surface (Sheets, Cards): `#1e231a`
- Chip-Backgrounds: `#2a3124`
- Border: `#2a2f24`
- Primary: `#5e9e3e`

**Neue UI-Elemente immer mit `dark:` Varianten versehen. Explizite Hex-Werte, keine CSS-Vars.**

## Aktuelle Datenbankstruktur (Stand: Phase 3a)

- `profiles`: id, username, is_admin
- `benches`: id, created_by, lat, lng, name, photo_url, created_at
- `bench_stats_votes`: id, bench_id, user_id, comfort, view_rating, condition, shadow, extras, rarity
- Storage Bucket `bench-photos`: public read, owner write

Aggregation via `get_bench_aggregated_stats(p_bench_id uuid)` Postgres-Funktion.

## Bekannte Muster im Code

### Server Action aufrufen
```ts
import { createBench } from '@/actions/benches'
const [state, action, pending] = useActionState(createBench, undefined)
```

### Supabase in Server Component
```ts
import { createClient } from '@/lib/supabase/server'
const supabase = await createClient()
const { data: { user } } = await supabase.auth.getUser()
```

### Stats lesen / schreiben
```ts
import { getBenchStats, upsertStats } from '@/actions/stats'
const { aggregated, userVote } = await getBenchStats(benchId)
await upsertStats(benchId, { comfort: 4, rarity: 3 })
```

### Neue Seite anlegen
- Unter `app/(app)/` für eingeloggte Nutzer
- Unter `app/(auth)/` für Auth-Seiten
- `proxy.ts` updaten falls Route unter `/benches/*` liegt (bereits pauschal geschützt)

### Neue Komponente mit Dark Mode
```tsx
<div className="bg-white dark:bg-[#1e231a] border border-gray-200 dark:border-[#2a2f24]">
  <span className="text-xs text-gray-500 dark:text-gray-400">...</span>
  <div className="bg-gray-100 dark:bg-[#2a3124] rounded-lg px-3 py-1.5">chip</div>
</div>
```

## Was als nächstes kommt

**Phase 3b — Nearby Bench Deduplication:**
- Beim Eintragen einer neuen Bank: Server Action prüft ob innerhalb von ~20m bereits eine Bank existiert
- Soft Prompt: "~15m entfernt liegt bereits eine Bank — meinst du diese?"
- Kein Hard-Block — User kann trotzdem eintragen
- Spec: `docs/superpowers/specs/2026-05-03-phase3a-detail-qol-design.md` (Abschnitt "Nicht in Phase 3a")

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
