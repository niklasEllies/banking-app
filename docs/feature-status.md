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

## Phase 9 — Social Polish 🔜

- [ ] In-App Notifications (eingehende Anfragen, Friend-Activity)
- [ ] Email-Alerts bei neuen Anfragen (über Supabase)
- [ ] Public Profile Page (`/u/:username` mit eigener Spot-Liste)
- [ ] Friend-Activity-Feed (was Freunde zuletzt eingetragen/favorisiert haben)
- [ ] Web Push Notifications
