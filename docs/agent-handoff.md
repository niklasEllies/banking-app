# Agent Handoff — Plätzchen

Dieses Dokument ermöglicht einem AI-Agenten, das Projekt ohne Vorwissen fortzuführen.

> **Für Agents:** Lies vor Beginn jeder Arbeit die Dateien in dieser Reihenfolge:
> 1. `docs/agent-handoff.md` (diese Datei)
> 2. `docs/feature-status.md` — was ist erledigt, was kommt als nächstes
> 3. `docs/architecture.md` — Tech Stack, Datenfluss, Dateistruktur
> 4. `docs/database-schema.md` — Tabellen, RLS, Migrationen

## 🔥 Aktuell offen — Stand v0.9.4 (2026-05-13)

Komprimierte Liste aller offenen Punkte. Nach jeder Phase aktualisieren.

### Sofort verfügbar (kein Trigger nötig)

- **Re-Audit auf Live-URL** nach v0.9.4-Deploy — Speed-Insights vergleicht RUM-Daten vorher/nachher. Erwartung: Render-blocking ↓ (Fraunces 4→1), Cache-Lifetimes ↓ (1y Storage-TTL), Image-Delivery ↓ (AVIF + Popup-Thumbs).
- **Phase 10 Social-Polish** — Notifications/Email-Alerts/Public-Profile/Friend-Activity/Web-Push/Block (siehe `feature-status.md`).

### Trigger-gebunden (warten auf Auslöser)

- **Cookie-Banner** — Spec liegt unter `docs/superpowers/specs/2026-05-06-cookie-banner-spec.md`. Auslöser: sobald Plausible/PostHog/Sentry-Replay/o.ä. eingeführt wird (TTDSG/DSGVO-Pflicht). Drei-Button-Pattern, Forest-Deep-Aesthetic, "Plätzchen = Sitzplatz UND Keks" Wortspiel.
- **Performance-Phase 2** — wenn Beta >5.000 Spots erreicht: Server-side bucketing für Timeline-Histogram + bbox-query für /map. Aktuell naiver Client-Filter ausreichend.

### Pro-Plan-gated (akzeptiert, kein Aufwand bis Pro-Upgrade)

- **Leaked Password Protection** — nur im Supabase Pro Plan verfügbar. Bis dahin akzeptiert; Re-check beim Pro-Upgrade.

### Lighthouse-Findings v0.9.3 (Audit 2026-05-13) — adressiert in v0.9.4

| Insight | Savings | Status nach v0.9.4 |
|---|---|---|
| Use efficient cache lifetimes | 293 KiB | ✅ Storage `cacheControl: '31536000'` + `?v=<ts>`-Bust + `images.minimumCacheTTL` |
| Improve image delivery | 221 KiB | ✅ AVIF aktiviert + SpotPopup auf next/image (Thumbs ~10× kleiner) |
| Render-blocking requests | 140 ms | ✅ Fraunces 4→1 Variante |
| LCP request discovery | — | ⚠️ Re-Audit zeigt's — Hero-h1 wartet jetzt auf weniger Fonts |
| Network dependency tree | — | ⚠️ Re-Audit zeigt's |
| Legacy JavaScript | 14 KiB | 🟡 browserslist deklariert, aber Next.js SWC nutzt eigene Defaults |
| Reduce unused JavaScript | 23 KiB | ✅ LazyMotion lazy-loadet ~106 KB parsed |
| Page prevented bfcache | — | ❌ NICHT adressiert — Supabase-Realtime auf Landing bleibt offen (Trigger: spürbar?) |
| Avoid long main-thread tasks | 3 tasks | ❌ NICHT adressiert — Leaflet-Init kostet, akzeptiert |

Bundle-Effekt v0.9.4: Landing client total 476.9 KB → 468.9 KB gzip. Drei Findings unangetastet (bfcache + main-thread tasks + browserslist-vs-SWC) — bei nächstem Audit re-prüfen, ob das in der Praxis spürbar ist.

### Bewusst aufgeschoben (Welle C / Phase 10+)

- **Form-Components** (Input, Label, Error-Message) — noch zu wenig Wiederholung um Abstraktion zu rechtfertigen.
- **Modal/Dialog-Component** — existiert nicht oft genug.
- **Toast/Notification-System** — aktuell nur `window.alert()` und inline error-states.
- **Phase 10 Social-Polish:** Notifications, Email-Alerts, Public Profile-Page, Friend-Activity-Feed, Web-Push, Block-Mechanik bei Friendships.
- **Vector-Icons als Plätzchen-Custom-Set** statt Tabler-Placeholder — sobald jemand designt hat. Implementierung trivial: Tabler-paths in `lib/spot-marker-svg.ts` ersetzen.
- **PWA installable** — Manifest + Service Worker + Offline-Karten-Tile-Cache.
- **SpotMap-Refactor** — der ~350-LOC-Component sollte in custom-Hooks zerlegt werden, ist aber stabil. Niemand nervt sich daran.
- **Konto löschen + DSGVO-Datenexport** — Pflicht-Light, kommt vor offizieller Beta-Erweiterung.

### Bewusste Emoji-Ausnahmen (kein Bug, dokumentiert)

- `EmojiPicker` Marker-Auswahl — User-Daten, kein UI-Element.
- `StarPicker ⭐` — Opacity-Fill-Pattern; Replacement = UX-Risiko.
- `GPS-Banner ⚠️` in MapLayout — semantische Warnung.
- `SPOT_TYPES.emoji` und `SPOT_VISIBILITIES.emoji` Felder — Daten-Stopgap, nicht UI-Render.

### Tag-/Versionierungs-Disziplin

- Jeder Phase-Merge bekommt ein annotated `vX.Y.Z` Tag, das mit dem CHANGELOG-Eintrag übereinstimmt.
- Backfilled tags existieren für v0.2.0 bis v0.9.1.
- CHANGELOG-Einträge sind in deutsch, user-speak, mit Tabler-Icon-Emojis als Bullet-Prefix.

## Was ist Plätzchen?

Eine Community-Web-App zum Sammeln und Bewerten von **netten Pause-Spots beim Wandern**: Bänke, Aussichtspunkte, Schutzhütten, Rastplätze, Liegewiesen, Wasserstellen. Nutzer tragen Spots auf einer Karte ein, bewerten sie (Komfort, Aussicht, Zustand, Rarität, Schatten, Extras — alles optional), laden Fotos hoch und schreiben Community-Tipps (1 Tipp pro User pro Spot, editierbar).

**Arbeitstitel im Repo:** "banking-app" — tatsächlicher Produktname: **Plätzchen** (zuvor "BenchMarks", umbenannt in Phase 4).

## Umgebung

- Windows 11, PowerShell
- Node.js 24 LTS
- Git: branch `master`
- Dev-Server: `npm run dev` → http://localhost:3000
- Tests: `npm test` (Vitest, 149 Tests) — `environment: 'node'`, kein jsdom. Component-DOM-Tests werden bewusst NICHT geschrieben (Welle-A-/B-/9.3-Convention). Pure-Logic-Libs (`lib/*`) MÜSSEN Tests haben (z.B. `lib/exif-utils.ts`).
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

## Aktuelle Datenbankstruktur (Stand: Phase 8.2)

- `profiles`: id, username, is_admin, **marker_emoji** (Phase 8.2), **theme_preference** (Phase 8.2, `'light' | 'dark' | 'system'`)
- `spots`: id, created_by, lat, lng, name, photo_url, **type** (`spot_type` enum), **visibility** (`spot_visibility` enum, Phase 6), created_at
  - `type` enum values: `bench`, `viewpoint`, `shelter`, `picnic`, `meadow`, `water`
  - `visibility` enum values: `public`, `friends`, `private` — default `public`
  - SELECT-Policy gated auf `can_see_spot()` Helper (visibility + Friends-Check)
  - UPDATE-Policy erlaubt Owner Edit von name+type+visibility
- `spot_stats_votes`: id, **spot_id**, user_id, comfort, view_rating, condition, shadow, extras, rarity
  - RLS: SELECT/INSERT cascaded via `can_see_spot()`; UPDATE/DELETE eigene
- `spot_descriptions`: id, spot_id, user_id, text (≤280 chars), created_at, updated_at
  - UNIQUE(spot_id, user_id) — ein Tipp pro User pro Spot
  - RLS: SELECT/INSERT cascaded via `can_see_spot()`; UPDATE/DELETE eigene
  - updated_at trigger via `set_updated_at()`
- `favorites`: user_id, spot_id, created_at
  - PRIMARY KEY (user_id, spot_id) — composite, ein Favorit pro Pair
  - **PRIVATE** RLS: SELECT/DELETE eigene; INSERT cascaded via `can_see_spot()`
- `friendships` (Phase 6): requester_id, addressee_id, status, created_at, updated_at
  - PRIMARY KEY (requester_id, addressee_id), CHECK requester ≠ addressee
  - status: `'pending'` | `'accepted'`
  - RLS: SELECT eigene Pair-Rows, INSERT als requester, UPDATE als addressee (accept), DELETE beide Seiten
- Storage Bucket `bench-photos`: public read, owner write/delete (interner Name beibehalten)
- **Phase 7.5 Hardening:** alle `SECURITY DEFINER` Funktionen haben `SET search_path = public, pg_catalog`. KEIN `SELECT`-Policy auf `storage.objects` für `bench-photos` (public-read passiert via direct-CDN-URL, kein listing).

Aggregation via `get_spot_aggregated_stats(p_spot_id uuid)` Postgres-Funktion (`SECURITY DEFINER` — bypassed RLS, uuid-opak).

**Helpers:**
- `are_friends(user_a, user_b) → boolean` — accepted-friendship check (für RLS)
- `can_see_spot(p_spot_id) → boolean` — visibility-aware spot-access check (von descriptions/votes/favorites RLS aufgerufen)

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

**Regel:** Niemals Emojis oder Labels hardcoden — immer `SPOT_TYPE_MAP[spot.type].Icon` (Tabler-Component) oder `.label`. `.emoji` ist Daten-Stopgap, nicht UI-Render (Ausnahme: Fallback-Zwecke).

Map-Marker (seit Phase 8.4): Drop-Pin-SVG via `lib/spot-marker-svg.ts buildPinSvg(type)` — Tabler-Icon-Paths hardcoded. `ICON_CACHE` in `SpotMap.tsx` und `PinPickerMap.tsx` cached `L.DivIcon` per Type. Bei Tabler-Library-Update: SVG-Paths gegenchecken.

## Changelog (post-Phase-5 Mini-Feature)

User-facing changelog page at `/changelog`. Source-of-truth: `CHANGELOG.md` in repo root with semver headings.

**Files:** `lib/changelog.ts` (pure parser + compareVersions, safe in client components), `lib/changelog-server.ts` (`'server-only'`, fs read), `components/ChangelogModal.tsx` (auto-popup on update, localStorage `plaetzchen-last-seen-version`).

**Adding entries:** edit `CHANGELOG.md`, add new entry at the top with bumped version. Format:
```
## 0.6.0 — Title
*Date string*

- bullet
- bullet
```

After deploy, returning users see a one-time modal with the new bullets. First-time visitors don't see the modal (would feel like an upgrade nag they didn't earn).

**Important:** Don't import from `lib/changelog-server.ts` in any Client Component. Use `lib/changelog.ts` for shared types + pure functions; the server file uses `node:fs` and is `'server-only'` enforced.

## Phase 9.4 Patterns — Performance Pass 1.5 (v0.9.4, 2026-05-13)

### LazyMotion + `m`-shortcut auf der Landing-Page
- `app/(marketing)/_components/LandingMotionProvider.tsx` (Client Component) wrapt mit `<LazyMotion features={domAnimation} strict>` — wird im Server-Component `marketing/layout.tsx` gemountet.
- `strict` Mode ERZWINGT `m.X` statt `motion.X`. Wenn jemand auf der Landing eine neue motion-Komponente baut: NUR `m.div`, `m.span` etc. importieren. `motion.X` wirft zur Laufzeit (build fängt es nicht ab).
- Hooks (`useScroll`, `useTransform`, `useInView`, `useReducedMotion`) brauchen LazyMotion-Context NICHT — bleiben unverändert importiert.
- Bundle-Effekt: render/components/motion (~106 KB parsed) lazy-loaded statt eager. −8 KB gzip Landing-Page-Total.

### next/image für Spot-Photos im Popup
- `SpotPopup` nutzt `<Image width={320} height={160} sizes="200px">` mit Style-Override für 100% × 80px Display.
- Vercel Image Optimizer (mit AVIF-First seit v0.9.4) liefert ~5-15 KB Thumb statt ~100-200 KB Original.
- WICHTIG: SpotPopup hat `style={}` everywhere (kein Tailwind) weil Leaflet-Popup eigenen CSS-Context hat. Der Style-Override für next/image folgt diesem Pattern.

### Photo-Cache + Cache-Bust
- `actions/spots.ts uploadSpotPhoto`: `cacheControl: '31536000'` auf Storage-Upload + `?v=<Date.now()>`-Suffix an public-URL.
- `next.config.ts images.minimumCacheTTL: 31536000` — Vercel Image-Optimizer cached transformierten Output (AVIF/WebP) 1 Jahr.
- **Pattern für künftige Storage-Uploads:** lange TTL ist nur safe wenn URL sich bei Inhaltsänderung ändert. Stable-Path + Query-Bust ist der Plätzchen-Standard.
- Bestehende DB-Rows ohne `?v=` refreshen sich natürlich auf next-edit, kein Backfill nötig.

### `outputFileTracingRoot` + Worktree-Setup
- In Worktree-Setups (multiple lockfiles) explicitly `outputFileTracingRoot: import.meta.dirname` setzen.
- Verhindert Multi-Lockfile-Warning UND falsches Tracing in Parent-Repo.

### Font-Slim
- Nicht für jede UI-Variante alle weights+styles laden. Audit `next/font/google`-Inits regelmäßig auf "was wird WIRKLICH genutzt".
- Fraunces 4→1 = 60 KB woff2-savings. Faustregel: pro Font ein Variant default, weitere nur on-demand.

### OG-Image: Glyphen außerhalb default-subset vermeiden
- next/og's default-font-subset enthält nicht alle Unicode-Blocks (z.B. U+25C6 ◆). Build-Warning "Failed to load dynamic font for X" → Glyph durch CSS-Geometrie (rotated div, etc.) oder ASCII-Fallback ersetzen, ODER Custom-Font mit gewünschter Glyph-Coverage explizit fetchen und an `ImageResponse({ fonts: [...] })` übergeben.

## Phase 9.3 Patterns — GPS-UX (v0.9.3, 2026-05-13)

### Live-Tracking via ref-Pattern
- State `liveTracking` in `SpotMap.tsx` (opt-in pro Session, kein localStorage). Toggle-Button neben Center-FAB.
- WICHTIG: `LocationController` liest `liveTracking` und `onLiveUpdate` aus `useRef`s (gesynct via separate useEffects), NICHT direkt aus Props. Sonst würde Toggle-Wechsel den watchPosition tearen + neu installieren (UX-Flash "Standort wird ermittelt…").
- Accuracy-Filter: `<80m` für initial-lock, `<200m` für live-updates (toleranter für mobile Bewegung). Updates >200m ignoriert.
- `localStorage` wird nur beim initial-lock geschrieben, NICHT in live-update path (sync I/O blockt Main-Thread).
- Auto-Follow: `FollowController` macht `map.flyTo(pos, currentZoom, {duration: 0.5})` wenn `enabled && !followBroken`. Pan-to-break über `useMapEvents({ dragstart, zoomstart })` — `zoomstart` für mobile pinch-zoom; `flyTo` mit fixiertem `zoom` triggert kein zoomstart selbst.
- Re-engage: Toggle erneut tappen ODER Center-FAB klicken → `setFollowBroken(false)`.

### Foto-First-Flow `/spots/from-photo`
- Default-Pfad ab Map-FAB-Klick (statt `/spots/new?lat=&lng=`). Legacy `/spots/new` bleibt erreichbar via "Ohne Foto eintragen"-Link auf der neuen Page.
- `PhotoFirstForm.tsx` ist single Client-Component mit progressive disclosure (Photo-Picker → nach Auswahl: Map + Details inline).
- **EXIF-Reihenfolge ist kritisch:** `readExifGps(file)` MUSS vor `URL.createObjectURL` und vor `resizeImage(file)` aufgerufen werden. Canvas-Resize strippt EXIF.
- Fallback-Kette: EXIF → current-GPS (one-shot) → DE-Default. User sieht jeweils Banner (grün/gelb).
- Race-Guard: `pickGenRef` (useRef-Counter) verhindert dass stale EXIF-Read eines früheren File-Picks State eines späteren Picks überschreibt.
- Blob-URL-Cleanup: `useEffect(() => () => revokeObjectURL(preview), [preview])`. Sonst leakt der letzte Preview beim Wegnavigieren.
- `try/catch` um `createSpot` — Netzwerk-Errors landen in `setError` statt silently die `startTransition` zu killen.

### `<PinPickerMap>` (in `PinPickerMapClient.tsx` dynamic-ssr-false)
- Single tappable + draggable Pin, reuse `buildPinSvg(type)` + `ICON_CACHE`-Pattern wie SpotMap.
- `useMapEvents({ click(e) { onPinChange(e.latlng.lat, e.latlng.lng) } })` für tap-anywhere.
- Marker `draggable + eventHandlers.dragend` für drag-update.
- Wrapper-Div hat `role="application"` + `aria-label` für AT.

### `lib/exif-utils.ts` — pure-logic mit Unit-Tests
- `readExifGps(file): Promise<{lat,lng}|null>` graceful-fallback bei: non-image MIME, fehlendem EXIF, 0/0 zeroed coords, Parser-Throw.
- Importiert `exifr` über deep-path `exifr/dist/mini.esm.mjs` (~10kb gzipped GPS-only) statt full bundle (~30kb). HEIC nicht unterstützt — aber app accept-Filter ist `image/jpeg,image/png,image/webp`, also kein Problem.
- 7 Unit-Tests in `__tests__/lib/exif-utils.test.ts` mocken die exifr-mini path via `vi.mock('exifr/dist/mini.esm.mjs', ...)`.

## Phase 9.1 / 9.2 Patterns — UI-Konsolidierung (Welle A + B, v0.9.1 + v0.9.2)

### `components/ui/`-Components (verpflichtend nutzen)
- `<PageHeader title subtitle? backHref backLabel />` für ALLE neuen Pages mit Back-Link.
- `<Card padding? className?>` für Cards (graduelle Adoption, kein Big-Bang-Refactor).
- `<ListRow href|onClick Icon? label rightSlot? tone='neutral'|'danger'>` polymorphic Link/Button für Menü-/Listen-Items. Default-rightSlot = Chevron. `rightSlot={null}` zum Suppress.
- `<Button variant size? fullWidth? loading? Icon?>` — 4 variants × 2 sizes. Stateful Icon-Buttons (FavoriteToggle/ThemeToggle/SpotShareButton) bleiben custom.
- `<TabBar tabs active onChange ariaLabel>` — generisch `<T extends string>`, underline-Style, ARIA roving-tabindex.
- `<SearchInput value onChange onClear? placeholder>` — IconSearch links + optional Clear-X rechts. Debounce ist Caller-Sache.

### TimelineScrubber-Tabs bewusst NICHT migriert
Dark-on-map-spezifisch (`bg-[#14180f]/80` über Karte, `bg-primary text-[#14180f]` invertiert), kein generischer light/dark-Pattern. Analog zu Phase-9.1's bewusster Auslassung von AdminUsers/[id].

## Phase 9 Patterns — Timeline (v0.9.0)

### Server/Client Split via separate Type-File
- `lib/timeline-data.ts` ist server-only (importiert `next/headers` indirekt via supabase server-client). Client-Components dürfen das NICHT importieren.
- `lib/timeline-types.ts` exportiert pure Types + `applyTabFilter` (`'all'|'mine'|'friends'`) — client-safe.
- Beim Hinzufügen neuer server-only Libs: shared Types in separates `*-types.ts` extrahieren.

### `getPublicTimelineSpots` ist gecached
- `unstable_cache` mit Tag `marketing-stats` (gleicher Tag wie Landing-Page-Stats — Spot-Mutations rufen `updateTag('marketing-stats')` und invalidieren beides).
- `createAnonReadClient()` aus `lib/supabase/anon-read.ts` für cookie-freie Reads (cookies() throws inside unstable_cache).

### Adaptive Bucketing
`components/timeline/useTimelineBucketing.ts` ist isomorph (kein Server-State). Buckets `day|week|month` je nach Range.

## Phase 8.x Patterns — Performance + Persistierung + Polish

### ISR-Cache + Tag-Invalidation
- Marketing-Stats: `unstable_cache(fn, key, { revalidate: 60, tags: ['marketing-stats'] })`.
- Spot-Mutations MÜSSEN `updateTag('marketing-stats')` aufrufen (aus `'next/cache'` — `revalidateTag` ist deprecated in Next.js 16).
- Cookie-freier Read-Client für cached scopes: `createAnonReadClient()` aus `lib/supabase/anon-read.ts`.

### User-Preferences ServerSide-First (Phase 8.2)
- `profiles.marker_emoji` + `profiles.theme_preference` sind die Source of Truth.
- `localStorage` ist NUR FOUC-Fast-Path (Inline-Script in `app/layout.tsx` löst System-Mode synchron auf).
- `EmojiPicker` und `ThemeToggle` rufen `actions/profile.ts` für Sync.

### 3-State Theme (Phase 8.2)
`light | dark | system`. Default = `system` folgt `prefers-color-scheme`. Inline-Script in `<head>` von `app/layout.tsx` vermeidet FOUC.

### Empty-States + Tabler-Icons (Phase 8.3)
- `<EmptyState Icon title body? action? compact?>` für alle leeren Listen.
- UI-Emojis raus — nutze `@tabler/icons-react`. Ausnahmen: EmojiPicker (User-Marker-Auswahl), StarPicker ⭐, GPS-Banner ⚠️.

### Drop-Pin Marker (Phase 8.4)
- `lib/spot-marker-svg.ts buildPinSvg(type)` rendert Drop-Pin in Plätzchen-Grün mit Tabler-Icon im Kreis.
- Tabler-Icon-Paths sind hardcoded — bei Tabler-Update gegenchecken.
- `buildClusterSvg(count)` ersetzt Stuhl-Emoji-Cluster.

### SEO/OG (Phase 8.4)
- `lib/site.ts` (SITE_URL, SITE_NAME, SITE_DESCRIPTION).
- `app/sitemap.ts` + `app/robots.ts` dynamic (Next.js 16 App-Router convention).
- `app/(marketing)/opengraph-image.tsx` rendert dynamic 1200×630 OG via `next/og`'s `ImageResponse`.
- `NEXT_PUBLIC_SITE_URL` in Vercel für canonical URLs setzen.

### Landing/Map Split (Phase 8)
- `/` ist die Marketing-Landing-Page (Server Component, in `app/(marketing)/`).
- `/map` ist die Karte (in `app/(app)/map/`).
- Map ist anon-aware: anon User sehen nur `visibility='public'` Spots, Add/Edit/Favorite/Description UI ist hidden via `isAuthenticated` prop-chain.
- Post-auth redirects (login/signup/logout) zeigen auf `/map`, NICHT auf `/`.

## Phase 7.5 Patterns — Security Hardening

- Alle `SECURITY DEFINER` Postgres-Funktionen haben `SET search_path = public, pg_catalog` (verhindert search_path injection).
- `next.config.ts` shipt X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy headers.
- Foto-Bucket `bench-photos`: kein `SELECT`-Policy auf `storage.objects` — public read passiert via direct-CDN-URL.

## Phase 6 Patterns (zusätzlich zu Phase 5)

### Visibility Enum + Helper-Cascade
`spots.visibility` ist Source of Truth pro Spot. RLS auf `spots`, `spot_descriptions`, `spot_stats_votes`, `favorites` nutzen dieselbe Logik via `can_see_spot()` Helper. Wenn ein User den Spot nicht sehen darf, sieht er auch nicht: Beschreibungen, Votes, kann nicht voten/favorisieren/beschreiben.

`SPOT_VISIBILITIES` / `SPOT_VISIBILITY_MAP` aus `lib/spot-visibility.ts` für UI. Nie Visibility-Labels hardcoden.

### Directed Friendships
`friendships` ist directed (requester → addressee). Acceptance flippt den Status auf derselben Row. Cancel/Decline/Remove sind alle DELETEs.

`actions/friends.ts` ist die einzige public API. Jede Mutation revalidiert `/friends`, `/profil` und `/`.

`are_friends(a, b)` ist symmetrisch — egal ob a oder b die Anfrage gestellt hat.

### Pending-Counter im Profil
`countIncomingRequests()` läuft parallel zur profile-Query in `/profil`. Counter-Badge erscheint nur wenn `> 0`.

### /friends 3-Tab UI
Server Component fetcht `listFriends`, `listIncomingRequests`, `listOutgoingRequests` parallel; Client Component rendert Tabs. Default-Tab = `'requests'` wenn incoming-pending > 0, sonst `'friends'`.

Search-Tab handhabt alle Beziehungs-Stati (already-friends / outgoing-pending / incoming-pending → "Annehmen"-Button) statt blind "Anfrage senden" zu zeigen.

`router.refresh()` nach jeder Mutation — keine manuelle Cache-Verwaltung.

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

## Phase 7 Patterns (Beta-Polish)

### Deep-Links via Query-Param
`/?spot=<id>` — Server Component liest `searchParams.spot` und reicht als `initialSpotId` an MapLayout. MapLayout setzt damit den initialen `selectedSpotId` (BottomSheet öffnet Detail) und feuert in einem mount-only useEffect ein `setFlyTarget` (Map zoomt). Beim Schließen des Sheets wird der Param via `router.replace('/', { scroll: false })` entfernt — nicht push (kein History-Spam).

Wenn der Spot aufgrund von RLS unsichtbar ist: er taucht nicht in `spots` auf, MapLayout's useEffect findet ihn nicht, kein Fly. Privacy-safe (leakt nicht "spot existiert aber du darfst nicht").

### Web Share API mit Clipboard-Fallback
`SpotShareButton` versucht erst `navigator.share` (mobile native), fällt dann auf `clipboard.writeText` mit "Link kopiert"-Toast (2s). Sichtbar für jeden, der den Spot offen hat (auch anonym).

### inert-Background Focus-Trap
Wenn BottomSheet expanded ist, bekommt der Wrapper-Div um `<SpotMapClient>` das HTML5 `inert={true}`-Attribut. React 19 hat native Support. Map-Buttons (FAB, 📍) sind nicht mehr Tab-erreichbar. Sheet selbst hat `role="dialog"` + `aria-modal="true"` mit dynamischem `aria-label` (Liste vs. Details).

### friendIds Set (parallel zu favoriteIds)
`app/(app)/page.tsx` fetcht `listFriends()` parallel zu favorites/profile. `MapLayout` hält `friendIds: Set<string>` als initial-only State (kein Setter — Friend-Mutationen revalidaten `/`). BottomSheet nutzt es für den 4. View-Mode-Tab "Freunde".

## Was als nächstes kommt

**Phase 7+ — Verbleibende Tech-Debt:**

SpotMap-Refactor (große Datei, ~350 LOC mit Controllern → eigene Hooks), PWA installable (Manifest + SW + Offline), Vector-Icons (User designt selbst), Block-Mechanik auf friendships.

**Phase 8.1 — SEO/OG-Tags + Sitemap:**

OG-Tags für Landing + Spot-Deep-Links, `sitemap.xml` für öffentliche Spots, strukturierte Daten (JSON-LD).

**Phase 9 — Social Polish:**

Notifications, Email-Alerts, Public Profile Page (`/u/:username`), Friend-Activity-Feed, Web Push.

Vorm Start: priorisieren — Phase 7+ Reste, SEO/OG-Tags, oder Social Polish.

## Phase 8 patterns (durable)

- Marketing route group (`app/(marketing)/`) has its own minimal `layout.tsx` (no app chrome) — keep landing pages out of `(app)` so they don't inherit map shell
- `RevealSection` wrapper pattern: client-component motion-wrapper that fades server-rendered children in on scroll, gated by `useReducedMotion()`. Reusable for any future scroll-revealed content.
- Living-stat pattern: server fetches initial count, client subscribes to Supabase Realtime channel with random suffix per mount. Client falls back gracefully if RLS blocks events for anon (data correct on next page load).
- Anon-aware page pattern: existing `isAuthenticated` prop is the gate; new components don't need their own `readonly` prop. Verify via call-site rather than at component boundary.
- Server-action mutations now `revalidatePath('/map')` plus `revalidatePath('/')` — keep both for any new mutation that affects spots, favorites, friendships.
- `lib/activity-utils.ts` is the client-safe helper module; `lib/marketing-stats.ts` re-exports the pure helpers and adds server-only ones. Don't import `marketing-stats` from a Client Component (it pulls `next/headers` transitively).

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
