<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Project: Plätzchen (formerly BenchMarks)

**Current state: Phase 9.1 UI-Konsolidierung Welle A complete (v0.9.1).** `<PageHeader>`, `<Card>`, `<ListRow>` extrahiert in `components/ui/`. 8 Pages refactored auf PageHeader (Profile/Friends/Changelog/Admin/Spots-new/SpotEditForm/EditPhotoForm/AdminModeration). Profile-Menü auf ListRow. AdminUsers/[id] bewusst nicht refactored (komplexere Header-Struktur, opportunistic später). Phase 9 Timeline (v0.9.0) davor — `/timeline` mit Scrubber/Histogramm/Play-Button. Phase 8.6/8.6.1 Performance (ISR-Cache, loading.tsx, next/image, IntersectionObserver-Lazy-Hero, @vercel/speed-insights, Bundle-Analyzer).

**🔥 Aktuell offene Punkte (Single-Source-of-Truth in `docs/agent-handoff.md` — "🔥 Aktuell offen"-Block ganz oben dort):**
- **Welle B** UI-Konsolidierung 2 (Button/TabBar/SearchInput) — sofort verfügbar
- **Phase 10** Social-Polish (Notifications/Email-Alerts/Public-Profile/Friend-Activity/Web-Push/Block) — sofort verfügbar
- **Cookie-Banner** — Spec ready unter `docs/superpowers/specs/2026-05-06-cookie-banner-spec.md`, Trigger = Tracking-Einführung
- **Performance Phase 2** — Trigger = >5.000 Spots
- **Form-Components / Modal / Toast** (Welle C) — bewusst aufgeschoben, zu wenig Wiederholung

Repo working title is still `banking-app` — actual product is **Plätzchen**, a community web app for collecting and rating nice pause-spots while hiking (benches, viewpoints, shelters, picnic areas, meadows, water spots).

Before writing any code, read these files in order:

1. `docs/agent-handoff.md` — architecture decisions, known gotchas, patterns, what's next
2. `docs/feature-status.md` — what is done, what is next
3. `docs/architecture.md` — full tech stack, data flow, file structure, all components
4. `docs/database-schema.md` — tables, RLS policies, storage, migrations

Key rules derived from these docs:
- Middleware is `proxy.ts` (not `middleware.ts`) — Next.js 16 breaking change
- Protected routes: `/spots/*` (changed in Phase 4 from `/benches/*` — old paths removed)
- Always use `supabase.auth.getUser()`, never `getSession()` in server context
- Env var is `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (not `ANON_KEY`)
- Dark mode: always add `dark:` variants with explicit hex values — CSS vars don't work with `@theme inline`
- Dark mode palette: bg `#141810`, surface `#1e231a`, chips `#2a3124`, border `#2a2f24`, primary `#5e9e3e`
- `params` is `Promise<{id: string}>` in Next.js 16 pages — use `React.use(params)` in Client Components
- Use `SPOT_TYPES` / `SPOT_TYPE_MAP` from `lib/spot-types.ts` for any UI showing spot types — never hardcode emojis or labels. Each entry has `key`, `emoji` (stopgap, used on map markers), `label`, `Icon` (Tabler component — used in landing showcase, type-picker, future markers).
- Empty-States nutzen `components/EmptyState.tsx` mit Tabler-Icon, Title, Body und optionaler Action. `compact` prop für In-List-Use.
- Pages mit Back-Link nutzen `components/ui/PageHeader.tsx` (`title` + optional `subtitle` + `backHref` + `backLabel`). Nicht selbst back-link + h1 + p schreiben.
- Listen-/Menü-Items nutzen `components/ui/ListRow.tsx` (Icon + label + optional rightSlot, polymorphic href oder onClick, tone='neutral'|'danger'). Default-rightSlot ist Chevron — pass `rightSlot={null}` zum Suppress, `rightSlot={<Badge/>}` zum Override.
- Cards (weißer Hintergrund + rounded-xl) nutzen `components/ui/Card.tsx`. Existierende Cards sind opportunistically zu migrieren — kein Big-Bang-Refactor.
- Admin-Queries gehen über `lib/admin-data.ts` (`requireAdmin`, `getAllSpots`, `getAllUsers`, `getAdminStats`, `getAllDescriptions`, `getUserDetail`). Spot-Queries MÜSSEN den admin-client (`createAdminClient`) nehmen — user-bound client respektiert RLS und filtert daher private/friends-only Spots heraus. Bei fehlendem `SUPABASE_SERVICE_ROLE_KEY` graceful Fallback + sichtbare Warnung.
- UI-Emojis sind out — alle in 8.3-8.5 durch `@tabler/icons-react` ersetzt. Map-Marker seit 8.3.1 sind Drop-Pin-SVGs via `lib/spot-marker-svg.ts` (Tabler-Icon-Paths hardcoded — beim Tabler-Update gegenchecken). `SPOT_VISIBILITIES` hat seit 8.5 ebenfalls `Icon`-Field (IconWorld/IconUsers/IconLock). Ausnahmen die Emoji bleiben: EmojiPicker (literal user-marker selection), StarPicker ⭐ (opacity-fill UX-Pattern), GPS-Banner ⚠️ (semantic), `SPOT_TYPES.emoji` und `SPOT_VISIBILITIES.emoji` Felder (Daten-Stopgap, nicht UI-Render — bleiben für Fallbacks).
- SEO/OG via `lib/site.ts` (SITE_URL, SITE_NAME, SITE_DESCRIPTION). `app/sitemap.ts` und `app/robots.ts` sind dynamic (Next.js 16 App-Router conventions). `app/(marketing)/opengraph-image.tsx` rendert dynamic 1200×630 OG image via `next/og`'s `ImageResponse`. Setze `NEXT_PUBLIC_SITE_URL` in Vercel für canonical URLs (sonst fallback auf `NEXT_PUBLIC_VERCEL_URL` → localhost).
- Use `SPOT_VISIBILITIES` / `SPOT_VISIBILITY_MAP` from `lib/spot-visibility.ts` for any UI showing visibility levels (public/friends/private)
- Spots have a `visibility` field — RLS enforces who sees what via `can_see_spot()` helper. Cascades automatically to descriptions, votes, favorites.
- Friendships are directed: `actions/friends.ts` exposes the lifecycle. `are_friends(a, b)` is the SQL helper used in RLS.
- Storage bucket name `bench-photos` is intentionally kept (internal name from pre-rebrand era). Public read happens via direct CDN URL — there is intentionally NO `SELECT` policy on `storage.objects` for this bucket (Phase 7.5 security)
- All `SECURITY DEFINER` Postgres functions have `SET search_path = public, pg_catalog` (Phase 7.5)
- `next.config.ts` ships X-Frame-Options/X-Content-Type-Options/Referrer-Policy/Permissions-Policy headers (Phase 7.5)
- `/` is the public Landing Page (Server Component, in `app/(marketing)/`); the map lives at `/map` (in `app/(app)/map/`)
- The map is anon-aware: anonymous users see only `visibility='public'` Spots, and Add/Edit/Favorite/Description-Add UI is hidden via existing `isAuthenticated` propagation. A guest-banner invites them to join Beta.
- All scroll-trigger animations honor `prefers-reduced-motion: reduce` (global override in `globals.css` + `useReducedMotion()` from `motion/react` in motion-driven components)
- Server Actions that mutate spots/favorites/etc. now `revalidatePath('/map')` in addition to `revalidatePath('/')` so both Landing (Living Numbers) and Map (markers) invalidate
- Marketing-stats sind cached (`unstable_cache` mit `revalidate: 60`, tag `marketing-stats`) — Spot-Mutationen MÜSSEN `updateTag('marketing-stats')` aufrufen damit Landing-Page Counts/Hero-Spots aktuell sind. Nutze `createAnonReadClient()` aus `lib/supabase/anon-read.ts` für Cookie-freie Reads in cached scopes (cookies() throws inside unstable_cache).
- Spot-Fotos sollten `next/image` nutzen mit `fill` + responsive `sizes`. `images.remotePatterns` in `next.config.ts` whitelistet `*.supabase.co/storage/v1/object/public/**`.
- Timeline-Daten gehen über `lib/timeline-data.ts` (server-only, importiert `next/headers` indirekt). Client-Components dürfen NUR `lib/timeline-types.ts` importieren (pure types + `applyTabFilter`). Bucketing-Logik in `components/timeline/useTimelineBucketing.ts` (adaptiv, isomorph). `getPublicTimelineSpots` ist via `unstable_cache` gewrappt mit Tag `marketing-stats` — bestehende `updateTag`-Calls in actions/spots.ts invalidieren auch das.
- Post-auth redirects (login/signup/logout) point to `/map`, not `/` (since `/` is now the marketing page)
- User-Preferences (`profiles.marker_emoji`, `profiles.theme_preference`) sind die Single-Source-of-Truth — `localStorage` ist nur Fast-Path für FOUC-Prevention. EmojiPicker und ThemeToggle nutzen `actions/profile.ts` zum Sync.
- Theme hat 3 States: `light` | `dark` | `system` (Default = `system` folgt `prefers-color-scheme`). Inline-Script in `app/layout.tsx` löst System-Mode synchron auf, vermeidet FOUC.
- Ask for options + recommendation before implementing non-trivial features
- Commit after every completed feature slice
- **CHANGELOG ist user-facing** (`/changelog`-Modal in der App). Vor jedem Commit raus: Admin-only Changes, Dev-Tooling (Bundle-Analyzer, npm-scripts), reine Internal-Refactors (Component-Namen, File-Moves, Schema-Migrations-Internals), Tests, Performance-Work die der User nicht merkt. Faustregel: wenn ein normaler User keine Verhaltens-/Sichtbarkeits-Änderung erlebt → kein CHANGELOG-Bullet. Tech-Details gehören in `feature-status.md` / `agent-handoff.md` / Commit-Message.
