# Feature-Status

## Phase 1 – Grundgerüst ✅

- [x] Supabase Auth (Email/Passwort)
- [x] Interaktive Leaflet-Karte
- [x] Two-Phase GPS (Netzwerk < 1s + GPS-Upgrade, silent)
- [x] localStorage Position-Cache (sofortiger Start, greyscale Marker)
- [x] Bänke auf der Karte (Marker + Clustering 🪑×N)
- [x] Bank eintragen via FAB-Button
- [x] Nominatim Auto-Name (Reverse Geocoding, dauerhaft gespeichert)
- [x] Bank löschen (eigene Bänke, im Popup + BottomSheet)
- [x] Route-Schutz für nicht-eingeloggte Nutzer
- [x] Anonyme Nutzer: Karte lesbar, keine Interaktion
- [x] Bottom Sheet (peek/expanded/swipe-to-dismiss, Bank-Liste)
- [x] Profilseite /profil mit Marker-Emoji Auswahl (🧍‍♂️ 🧍‍♀️ 👫 🐕)
- [x] Theme: Park Bench (Olivgrün + Walnussbraun)

## Post-Phase-1 Verbesserungen ✅

- [x] Dark Mode (Toggle im Header, CSS-invert Kacheln, FOUC-Prevention)
- [x] Zentrieren-Button (📍 über FAB, flyTo auf Nutzerstandort)
- [x] Logout auf Profilseite (statt Header)
- [x] Admin-Dashboard /admin (Userliste + Bänke, Admin-Rolle vergeben)
- [x] Admin RLS-Policies (Bench delete, Profile update)

## Phase 2 – Bank-Stats & Fotos ✅

- [x] Community-Voting: Komfort (1–5), Aussicht (1–5), Rarität (1–5), Zustand (FN/MW/FT/WW/BS), Schatten, Extras
- [x] Aggregation via Postgres-Funktion `get_bench_aggregated_stats` (Median, Mode, 50%-Threshold)
- [x] `bench_stats_votes` Tabelle mit UPSERT-Pattern (ein Vote pro User/Bank)
- [x] Foto-Upload (Supabase Storage Bucket `bench-photos`, owner-only)
- [x] Foto beim Bank-Eintragen (optional)
- [x] Nachträgliches Foto-Upload via `/benches/[id]/edit-photo`
- [x] BenchPopup mit Foto-Thumbnail, Rarität-Badge, Details-Button
- [x] Bottom Sheet Detail-Modus (BenchDetail mit Aggregat-Stats + StatsVoteForm)
- [x] RarityBadge Komponente (Common → Legendary, Farbkodiert)
- [x] Storage RLS-Policies für `bench-photos`

## Phase 3a – Detail-QoL & Theme ✅

- [x] Forest Deep Dark Mode (besserer Kontrast: bg `#141810`, surface `#1e231a`, chips `#2a3124`)
- [x] BenchDetail Foto/Name-Header (full-width 110px, Overlay mit Name + Rarität-Badge)
- [x] Listentap öffnet direkt Detail + fliegt zur Bank (Sheet bleibt offen)
- [x] Distanzanzeige in der Bänkeliste (Haversine, nur wenn GPS verfügbar)
- [x] Lazy Rarity im Popup (fetcht beim Öffnen via useEffect)
- [x] Admin Click-to-Add (Crosshair-Cursor, Map-Click → /benches/new)
- [x] ✏️ Foto-Edit-Button im Sheet-Header (nur Owner, Link zu edit-photo)

## Phase 3b – Foundation Fixes ✅

- [x] GPS-Permission-Warnung (Banner + Sheet-Hint + 📍-Button-Disable)
- [x] BottomSheet Scroll-vs-Swipe (Drag-Handle immer, Content nur bei scrollTop=0)
- [x] Foto-Resize on Upload (max 1600px, WebP @0.8 mit JPG-Fallback) — ~30× kleiner
- [x] Backend Safety: DELETE-Policy `bench_stats_votes`, `.maybeSingle()` defensiv, Orphan-Foto-Cleanup
- [x] A11y Minimums: Touch-Targets ≥44×44, StarPicker/EmojiPicker als Radiogroup, Focus-Rings Auth
- [x] Empty State + Onboarding-Hint bei leerer Bench-Liste
- [x] BenchDetail Loading-Skeleton (statt "Lädt…")

## Phase 4 – Plätzchen Rebrand & Spot-Generalisierung ✅

App ist von "BenchMarks" (nur Bänke) zu "Plätzchen" (nette Pause-Spots beim Wandern) generalisiert.

- [x] Schema-Migration 006: `benches` → `spots`, `bench_stats_votes` → `spot_stats_votes`, neue `type` Enum-Spalte (default `'bench'` für Bestandsdaten)
- [x] 6 Spot-Types: `bench`, `viewpoint`, `shelter`, `picnic`, `meadow`, `water`
- [x] Migration 007: `spot_descriptions` Tabelle mit RLS, UNIQUE(spot, user), 280-char limit, updated_at trigger
- [x] Postgres-Funktion `get_spot_aggregated_stats` (umbenannt von `get_bench_aggregated_stats`)
- [x] Code-Rebrand: `Bench` → `Spot` Type, alle Components (BenchMap → SpotMap, BenchPopup → SpotPopup, BenchDetail → SpotDetail, AddBenchForm → AddSpotForm)
- [x] Server Actions: `actions/benches.ts` → `actions/spots.ts`, `createSpot` validiert `type`
- [x] Neue Server Action `actions/descriptions.ts` (list/upsert/delete) mit Tests
- [x] Routen-Move: `/benches/*` → `/spots/*` (hard cutover)
- [x] UI-Rebrand: "📍 Plätzchen" überall (MapHeader, Auth-Pages, App-Title), strings durchgängig
- [x] Per-Type Emoji-Marker auf der Karte (cached `L.DivIcon` per Type)
- [x] AddSpotForm mit `SpotTypePicker` (radiogroup, 6 Optionen)
- [x] Neuer `SpotDescriptionFeed` im SpotDetail (Community-Tipps, eigener Tipp prominent + andere darunter)
- [x] Type-Badge im SpotDetail unter Foto-Header
- [x] Admin-Page: `AdminBenches` → `AdminSpots`, zeigt Spot-Type-Emoji, `bench_count` → `spot_count`

**Bewusst rausgehalten:** Vector-Icons (User designt selbst), Description-Upvotes (Phase 5/6), Type-aware Stats-Visibility (Phase 7+).

## Phase 5 – Personal Layer ✅

- [x] Migration 008: `favorites` Tabelle (composite PK user_id+spot_id, private RLS)
- [x] `actions/favorites.ts` (list/add/remove) mit Tests
- [x] BottomSheet View-Mode-Tabs: Alle / Eigene / Favoriten (localStorage-Persistence, Login-CTAs für anonym)
- [x] Distance-basierte Sortierung (sort by distance wenn GPS, sonst by created_at DESC)
- [x] `distMeters` raw Helper für Sort-Logik (refaktoriert distanceTo)
- [x] FavoriteToggle (🤍 ↔ ❤️) im Sheet-Header für eingeloggte User mit optimistic UI
- [x] SpotActionMenu (Dropdown ✏️) für Owner mit "Foto bearbeiten" + "Spot bearbeiten"
- [x] `updateSpot` Server Action (Owner-only, validiert Type)
- [x] `/spots/[id]/edit` Route + SpotEditForm (Name + Type)
- [x] Tab-spezifische Empty States (in der Nähe / eingetragen / Favoriten)

**Bewusst rausgehalten:** Search/Filter (zu früh — Bestand klein), Description-Upvotes (Phase 6+), Position-Edit (lat/lng — UX-Risk), Public/Friend-visible Favoriten (Phase 6 ändert RLS).

## Phase 6 – Privacy & Friends ✅

- [x] Migration 009: `friendships` Tabelle (directed model, composite PK requester+addressee, status pending/accepted)
- [x] `are_friends(a, b)` Postgres-Helper für RLS
- [x] Migration 010: `spots.visibility` Enum (`public` / `friends` / `private`) + `can_see_spot()` Helper + RLS-Cascade auf spots, descriptions, votes, favorites
- [x] `actions/friends.ts` mit 10 Funktionen (search, request/accept/decline/cancel/remove, listFriends, listIncoming/Outgoing, countIncoming) + 23 Tests
- [x] `createSpot`/`updateSpot` erweitert um `visibility` mit Validierung
- [x] `lib/spot-visibility.ts` (SpotVisibility, SPOT_VISIBILITIES, SPOT_VISIBILITY_MAP)
- [x] `VisibilityPicker` Component (Mirror von SpotTypePicker)
- [x] `VisibilityPicker` Integration in AddSpotForm + SpotEditForm
- [x] SpotDetail zeigt Visibility-Badge wenn nicht public
- [x] `/friends` Route mit 3 Tabs (Freunde / Anfragen / Suchen) — Username-exact-match Search
- [x] Profil-Page: 👥 Freunde Link mit Pending-Counter

**Bewusst rausgehalten:** Block-Mechanik (Phase 7), Friend-Spot-Filter im BottomSheet (Phase 7), Notifications/Activity-Feed (Phase 8), Public Profile Page (Phase 8).

## Phase 7 – Polish & Tech-Debt (Subset "Beta-Polish") ✅

Erstes Drittel der ursprünglich geplanten Phase-7-Liste umgesetzt:

- [x] Deep-Links zu Spots (`/?spot=<id>` query-param + Web-Share-API + Clipboard-Fallback)
- [x] N+1 in admin/page.tsx (`Map<userId, count>` einmal aus existing spots)
- [x] Modal-Focus-Trap im BottomSheet (HTML5 `inert` Attribut auf Map-Background, `role="dialog"` auf Sheet)
- [x] Kontrast-Tweaks (Drag-Handle gray-300/600 → 400/500; disabled-Buttons opacity-50 → 60)
- [x] Service-Role-Key Build-time-Warning (`console.warn` bei Production wenn fehlt)
- [x] Friend-Spot-Filter im BottomSheet (4. Tab "Freunde", filtert nach `created_by ∈ friendIds`)

## Phase 7.5 – Security-Patch ✅

Auf Basis Supabase-Advisor + npm audit + Manual-Review:

- [x] Migration 011: `SET search_path = public, pg_catalog` auf allen 5 SECURITY-DEFINER-Funktionen (verhindert Schema-Injection)
- [x] `handle_new_user()` REVOKE EXECUTE FROM anon, authenticated, public (war direkt per RPC aufrufbar — sollte nur als Auth-Trigger laufen)
- [x] `get_spot_aggregated_stats` zu SECURITY INVOKER (nutzt jetzt RLS-Cascade aus Phase 6 — keine direct-RPC-Leak-Möglichkeit mehr)
- [x] `bench-photos: public read` Policy entfernt (Listing-Block — direkte URL-Access funktioniert weiter via CDN)
- [x] Security-Headers in `next.config.ts`: X-Frame-Options DENY, X-Content-Type-Options nosniff, Referrer-Policy, Permissions-Policy (geolocation=self, kamera/mic=off)

**Verbleibende Advisor-Findings (akzeptiert):**
- `are_friends`/`can_see_spot` direct-RPC: bool-only mit opaken UUIDs, low risk (REVOKE würde RLS-Eval brechen)
- Leaked-Password-Protection: Supabase Dashboard-Toggle, kein MCP-Setting
- postcss < 8.5.10: transitive vuln über Next.js, nur build-time, akzeptabel

## Phase 7+ – Verbleibende Tech-Debt 🔜

- [ ] SpotMap-Refactor (Custom Hooks rauslösen — z.B. useGpsState, useFlyController)
- [ ] PWA installable (Manifest + Service Worker + Offline-Strategie)
- [ ] Vector-Icons (User designt selbst) — ersetzen die Emoji-Marker
- [ ] Block-Mechanik (`status='blocked'` Extension auf friendships, Button im FriendsClient)

## Phase 8 — Landing Page ✅

Abgeschlossen: 2026-05-05 · v0.8.0

- Öffentliche Landing-Page auf `/` mit 5 Sektionen (Hero, 6-Typen, Living Numbers, Wie's funktioniert, Beta-CTA) im Forest-Deep + Topo-Aesthetic
- Hero mit Live-Karte (5-7 echte public Spots, pulsierende Marker via CSS-Keyframes)
- Living Numbers Section mit Supabase Realtime (`spots`/`profiles` INSERT-Subscriptions) + animiertem Tick-Up + 3-Item Activity-Ticker
- Karte umgezogen: `/` → `/map` (Server-Component, anon-aware via existing `isAuthenticated` Prop)
- Anon-Modus auf `/map`: nur public Spots sichtbar (RLS via `can_see_spot()`), Action-UI ausgeblendet, Guest-Banner top-center
- Scroll-Reveal-Animationen via `motion/react` mit `useReducedMotion()`-Gating; Topo-Background hat Parallax-Shift
- Neue Dependency: `motion` v12, neue Font: Fraunces (italic accents über `--font-display` Tailwind-Theme-Var)
- Deep-Link-Compat: `/?spot=<id>` redirected zu `/map?spot=<id>` (Phase 7 Bookmarks bleiben funktional)

## Phase 8.1 — UI-Polish ✅

Abgeschlossen: 2026-05-05/06 · v0.8.1 - v0.8.5

- v0.8.1: Persistierung & System-Theme (`profiles.marker_emoji`, `profiles.theme_preference`, ThemeToggle 3-state mit prefers-color-scheme)
- v0.8.2: Empty-States + Tabler-Icons (SPOT_TYPES.Icon, EmptyState component, BottomSheet/FriendsClient/SpotDescriptionFeed empty-states)
- v0.8.3: Admin-Polish + Emoji-Cleanup (RLS-fix mit createAdminClient, Stats-Overview-Card, Search/Filter, /admin/users/[id], /admin/moderation; ~50 UI-Emojis durch Tabler-Icons ersetzt)
- v0.8.4: Drop-Pin Map-Marker + SEO (lib/spot-marker-svg.ts mit Tabler-Paths hardcoded, /opengraph-image dynamic, /sitemap.xml, /robots.txt)
- v0.8.5: UI-Konsistenz (ThemeToggle Tabler, VisibilityPicker Tabler, MapHeader Logo→/, EmojiPicker Card-Style, SpotPopup Type-Icon, Cancel-Hover-Fix, BottomSheet-Pill-Layout)

## Phase 8.6 — Performance ✅

Abgeschlossen: 2026-05-06 · v0.8.6 + v0.8.6.1

- ISR-Cache via `unstable_cache` für `lib/marketing-stats.ts` (60s revalidate, tag `marketing-stats`)
- Mutations rufen `updateTag('marketing-stats')` für read-your-own-writes invalidation
- `loading.tsx` Suspense-Skeletons für /(marketing), /(app)/map, /(app)/admin
- SpotDetail-Foto via `next/image` mit responsive `sizes` + `priority`
- `next.config.ts` `images.remotePatterns` für Supabase Storage
- @next/bundle-analyzer + `npm run analyze`-Script
- Lazy-mount HeroMapPreview via IntersectionObserver — Leaflet-Bundle erst beim Scroll geladen
- @vercel/speed-insights integriert für RUM (LCP/INP/CLS)

## Phase 9 — Timeline ✅

Abgeschlossen: 2026-05-06 · v0.9.0

- Neue `/timeline`-Route — temporale Karten-Visualisierung
- Time-Scrubber mit adaptivem Histogramm (day/week/month basierend auf Range)
- Subtle Play-Button für Time-Lapse durch die Geschichte (600ms-Bucket-Steps)
- Tabs Alle / Eigene / Freunde (gleiche Filter-Semantik wie /map BottomSheet)
- Kumulativer Pin-Filter (`created_at <= scrubberNow`)
- Auf "Alle" zukünftige Spots als Ghost-Pins mit 15% Opacity vorgezeichnet
- URL-State `?at=YYYY-MM-DD&tab=...` bookmarkbar, shareable
- Pin-Click deaktiviert (pure Visualisierung)
- Auto-fit-bounds bei Tab-Wechsel
- Neue Files: `lib/timeline-data.ts` (server, mit cached `getPublicTimelineSpots`), `lib/timeline-types.ts` (client-safe), `components/timeline/{TimelineMap, TimelineScrubber, TimelineHistogram, useTimelineBucketing}`
- MapHeader hat IconHistory-Link

### Phase 9.4 — Performance Pass 1.5 (v0.9.4) — DONE 2026-05-13

Auf Basis erstem Lighthouse-Audit auf Live-URL nach v0.9.3.

- Fraunces-Font von 4 Varianten (300/500 × normal/italic) auf 1 (300 italic) reduziert — saved ~3 woff2-Files / ~60 KB. Deckt Lighthouse "Render-blocking requests".
- `images.formats: ['image/avif', 'image/webp']` aktiviert + `minimumCacheTTL: 31536000` für Vercel-Image-Optimizer.
- `outputFileTracingRoot` in `next.config.ts` setzt project-root explizit — silencet Multi-Lockfile-Warning bei worktree-builds.
- `browserslist` (chrome/edge/firefox 110+, safari 16+) deklariert in `package.json` für PostCSS/autoprefixer (Next.js SWC ignoriert das, aber gut deklariert).
- `SpotPopup` Foto-Thumbnail von raw `<img>` auf `next/image` (intrinsic 320×160, sizes="200px"). Browser sah vorher das volle 1600px-Asset für 80px-Slot — jetzt ~5-15 KB statt 100-200 KB pro Popup.
- LazyMotion-Migration auf der Landing-Page: `<LazyMotion features={domAnimation} strict>` Wrapper im marketing layout, alle `motion.X` → `m.X` in RevealSection/TopoBackground/LivingNumbersClient. Bundle-Wirkung: −8 KB gzip Landing-Page-Total, render/components/motion (~106 KB parsed) lazy-loaded statt eager.
- Supabase-Storage-Cache-Headers: `cacheControl: '31536000'` auf Photo-Upload + `?v=<timestamp>`-Cache-Bust an stored `photo_url`. Re-uploads bleiben frisch trotz langer TTL. Deckt Lighthouse "Use efficient cache lifetimes" (293 KiB savings).
- OG-Image: `◆`-Glyph durch rotiertes 14×14-Quadrat ersetzt — silencet Build-Warning "Failed to load dynamic font for ◆" (next/og default-font-subset hat U+25C6 nicht).

**Bonus (orthogonal Bug-Fixes auf master):** Production-Build war seit Phase 8.3 kaputt durch invalides `hasServiceRoleKey`-Re-Export aus `app/(app)/admin/users/[id]/page.tsx` und seit Phase 9.3 durch fehlendes `npm install` (exifr nie extrahiert). Beide gefixt vor Phase 9.4 ([`e49077e`](https://github.com/niklasEllies/banking-app/commit/e49077e)).

### Phase 9.3 — GPS-UX (v0.9.3) — DONE 2026-05-13

- Live-Tracking auf der Karte: opt-in Toggle-Button neben Center-FAB, watchPosition permanent (ref-basiert um teardown-Flash zu vermeiden), auto-follow via flyTo (500ms), pan-to-break via dragstart+zoomstart (catch mobile-pinch), re-engage über Toggle oder Center-FAB. Accuracy-Filter 200m für live updates, 80m für initial-lock.
- Foto-First-Flow `/spots/from-photo`: Foto-Upload → EXIF-GPS-Auto-Fill (oder current-GPS-Fallback oder DE-Default) → tappable/draggable Pin auf kleiner Karte → SpotTypePicker + VisibilityPicker + Name → Submit. Behebt das Lat/Lng-Friemel-Problem.
- `lib/exif-utils.ts` mit 7 Unit-Tests (pure logic, mock exifr).
- `<PinPickerMap>` dynamic-ssr-false-wrapper, reuse `buildPinSvg(type)`.
- FAB auf der Karte navigiert zu `/spots/from-photo` (statt `/spots/new` mit Query-Params).
- `/spots/new` bleibt erreichbar als "Ohne Foto eintragen"-Link in PhotoFirstForm.
- Photo-pick race-guard (generation counter) + blob-URL-cleanup (useEffect) + try/catch um createSpot.
- New dep: `exifr` via mini bundle (`exifr/dist/mini.esm.mjs`, ~10kb gzipped, GPS-only path).

## Phase 9.2 — UI-Konsolidierung Welle B ✅

Abgeschlossen: 2026-05-10 · v0.9.2

- `<Button>` mit 4 Variants (primary/ghost/outline/danger) × 2 Sizes (sm/md), `fullWidth`/`loading`/`Icon` Props
- `<TabBar>` generisch in `<T extends string>`, underline-Style, optionaler `count`-Suffix, ARIA roving-tabindex
- `<SearchInput>` mit IconSearch + optionalem Clear-Button (X), `pr-9` reserved für Clear-Slot (kein Layout-Shift)
- 9 Buttons + 2 TabBars + 4 SearchInputs migriert
- TimelineScrubber-Tabs bewusst nicht migriert (dark-on-map-spezifisch — analog Welle A's AdminUsers/[id])
- `FriendsClient.tabBtnClass` Helper gestrichen
- Bug fixes during welle: outline-Button hover (chips statt surface), Button-cls whitespace, SearchInput dark border (#2a2f24 statt gray-700), TabBar ARIA tabindex

## Phase 9.1 — UI-Konsolidierung Welle A ✅

Abgeschlossen: 2026-05-06 · v0.9.1

- `<PageHeader title subtitle? backHref backLabel />` — extrahiert für 8-9 Seiten (Profile, Friends, Changelog, Admin, Spots-new, SpotEditForm, EditPhotoForm, Admin-Moderation)
- `<Card padding? className?>` — Wrapper für `bg-white dark:bg-[#1e231a] rounded-xl`; existierende Cards nicht refactored (opportunistische Adoption)
- `<ListRow Icon? label rightSlot? tone? href|onClick>` — Profil-Menü (Freunde/Was-ist-neu/Admin/Abmelden); polymorph Link/button; danger-tone für Logout

---

## 🔜 Roadmap — was kommt als nächstes

### Phase 10 — Social-Polish

- [ ] In-App Notifications (eingehende Friend-Anfragen, Friend-Activity)
- [ ] Email-Alerts bei neuen Anfragen (Supabase Auth-Hooks oder eigener Email-Service)
- [ ] Public Profile-Page (`/u/[username]` mit eigener Spot-Liste, öffentlich teilbar)
- [ ] Friend-Activity-Feed (was Freunde zuletzt eingetragen/favorisiert haben)
- [ ] Web Push Notifications (PWA-Voraussetzung)
- [ ] Block-Mechanik in friendships (`status='blocked'` Extension)

### Trigger-gebunden

- [ ] **Cookie-Banner** — wenn Plausible/PostHog/Sentry-Replay/o.ä. eingeführt wird. Spec: `docs/superpowers/specs/2026-05-06-cookie-banner-spec.md`.
- [ ] **Performance Phase 2** — wenn Beta >5.000 Spots erreicht: server-side bucketing, bbox-queries.
- [ ] **OG-Image-Font-Fix** — Geist Mono explizit fetchen (cosmetic build-warning).

### Phase 7+ — Bestehende Tech-Debt

- [ ] SpotMap-Refactor (Custom Hooks: `useGpsState`, `useFlyController`, `useSheetState`)
- [ ] PWA installable (Manifest + Service Worker + Offline-Strategie)
- [ ] Vector-Icons (Custom-Set statt Tabler-Placeholder, sobald designt)

### Compliance

- [ ] Konto-Löschen + DSGVO-Datenexport (Pflicht-Light vor öffentlicher Beta-Erweiterung)
- [ ] Leaked-Password-Protection in Supabase-Dashboard aktivieren (manueller Schritt)
- [ ] Datenschutzerklärung + Impressum (Mini-Phase nach erstem Tracking-Event)

### Bewusst zurückgestellt (Welle C / nicht jetzt)

- Form-Components (Input, Label, Error)
- Modal/Dialog-System
- Toast/Notification-UI

Wiederholung noch zu gering um Abstraktion zu rechtfertigen.
