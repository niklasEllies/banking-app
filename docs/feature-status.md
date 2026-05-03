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
