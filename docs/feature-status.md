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

## Phase 3b – Nearby Bench Deduplication 🔜

- [ ] Proximity-Check beim Eintragen (Radius ~20m)
- [ ] Soft Prompt: "Meinst du diese Bank?" wenn Duplikat erkannt
- [ ] Kein Hard-Block — User kann trotzdem eintragen

## Phase 4 – Community & Bestätigung 🔜

- [ ] Bestätigungs-Mechanismus (3 Bestätigungen nötig)
- [ ] "Existiert nicht mehr"-Meldung

## Phase 5 – Gamification 🔜

- [ ] Punktesystem (Bank eintragen +10, Foto +5, Bestätigen +2, Erste Bestätigung +3)
- [ ] Badges (Erste Bank, Entdecker, Legendary, etc.)
- [ ] Nutzerprofil mit Punktestand und Badge-Übersicht
