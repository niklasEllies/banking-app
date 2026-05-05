<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Project: Plätzchen (formerly BenchMarks)

**Current state: Phase 8 Landing Page complete (v0.8.0).** Next: Phase 7+ remaining items (SpotMap-Refactor, PWA, Vector Icons, Block-Mechanik), Phase 8.1 (SEO/OG-Tags + Sitemap), oder Phase 9 (Notifications, Email-Alerts, Public Profile, Friend-Activity-Feed, Web Push).

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
- Use `SPOT_TYPES` / `SPOT_TYPE_MAP` from `lib/spot-types.ts` for any UI showing spot types — never hardcode emojis or labels
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
- Post-auth redirects (login/signup/logout) point to `/map`, not `/` (since `/` is now the marketing page)
- Ask for options + recommendation before implementing non-trivial features
- Commit after every completed feature slice
