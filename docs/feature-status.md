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

## Phase 5 – Personal Layer 🔜

- [ ] `favorites` Tabelle (user_id, spot_id)
- [ ] BottomSheet View-Modes: Alle / Eigene / Favoriten
- [ ] Favoriten-Stern in SpotDetail
- [ ] Spot bearbeiten (Name, Type)
- [ ] Optional: Search/Filter

## Phase 6 – Privacy & Friends 🔜

- [ ] Friends-System (Request/Accept)
- [ ] Spot-Visibility: `public` / `friends` / `private`
- [ ] RLS-Policies anpassen
- [ ] Privacy-Picker beim Eintragen, Filter im Sheet

## Phase 7 – Polish & Tech-Debt 🔜

- [ ] SpotMap-Refactor (Custom Hooks rauslösen)
- [ ] Deep-Links zu Spots (shareable URLs)
- [ ] PWA installable
- [ ] N+1 in admin/page.tsx
- [ ] Modal-Focus-Trap im BottomSheet
- [ ] Kontrast-Tweaks (Drag-Handle, disabled-States)
- [ ] Service-Role-Key Build-time-Validation
- [ ] Vector-Icons (User designt) — ersetzen die Emoji-Marker
