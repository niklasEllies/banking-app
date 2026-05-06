# Changelog

## 0.8.1 — Persistierung & System-Theme
*6. Mai 2026*

- 🌗 Neue Theme-Option "System" — folgt deiner OS-Einstellung automatisch
- 💾 Marker-Emoji und Theme werden jetzt im Profil gespeichert (statt nur lokal pro Gerät)
- 🔄 Anmeldung auf neuem Gerät übernimmt deine Einstellungen direkt
- 🔁 OS-Theme-Wechsel im "System"-Modus wird live übernommen

## 0.8.0 — Landing Page
*5. Mai 2026*

- 🌿 Neue Startseite auf `/` — erklärt was Plätzchen ist, mit Live-Karte und Live-Zähler
- 🗺️ Die Karte ist jetzt unter `/map` (Bestandsuser-Bookmarks zeigen jetzt die Landing — ein Klick weiter zur Karte)
- 👀 Die Karte funktioniert auch ohne Login (nur öffentliche Plätzchen, kein Eintragen/Bewerten)
- ⚡ Live-Zähler: neue Plätzchen erscheinen ohne Refresh
- ♿ Animationen respektieren "Reduzierte Bewegung" in den Systemeinstellungen

## 0.7.1 — Sicherheits-Patch
*5. Mai 2026*

- 🛡️ Datenbank-Funktionen gegen Schema-Injection abgesichert (search_path)
- 🔒 Interne Trigger-Funktion ist nicht mehr direkt von außen aufrufbar
- 🌐 Sicherheits-Header für die App: kein Iframing, kein MIME-Sniffing, gezielte Permissions
- 📦 Foto-Bucket: keine Listing-Möglichkeit mehr (Foto-URLs funktionieren weiter wie gewohnt)

## 0.7.0 — Beta-Polish
*5. Mai 2026*

- 🔗 Teile einen Spot per Link: Tippe auf 📤 in der Detail-Ansicht
- 👥 Neuer Tab "Freunde" in der Spot-Liste — sieh, was deine Freunde eingetragen haben
- ♿ Bessere Tastatur-Navigation: Tab bleibt im Sheet, wenn es offen ist
- 🌓 Etwas mehr Kontrast bei Drag-Handle und deaktivierten Buttons
- ⚡ Schnellere Admin-Übersicht (kein N+1 mehr)

## 0.6.0 — Privacy & Friends
*5. Mai 2026*

- 👥 Freundschaften: such jemanden per Username, sende und empfange Anfragen
- 🔒 Drei Sichtbarkeits-Stufen pro Spot: Öffentlich, Nur Freunde, Privat
- 🌍 Bestehende Spots bleiben öffentlich — du kannst sie jederzeit umstellen
- 📬 Counter im Profil zeigt offene Freundschaftsanfragen
- 🛡️ Datenbank-seitige Privatsphäre: Privat-Spots sind für andere nicht sichtbar (auch Stats und Tipps)

## 0.5.0 — Personal Layer
*5. Mai 2026*

- ❤️ Markiere Lieblings-Plätzchen mit einem Herz
- 📑 Drei Tabs in der Liste: Alle / Eigene / Favoriten
- ✏️ Bearbeite Name und Typ deiner Plätzchen
- 📍 Die Liste sortiert sich automatisch nach Distanz, wenn dein Standort bekannt ist
- 🔄 Foto und Spot bearbeiten jetzt im neuen Aktions-Menü

## 0.4.0 — Plätzchen
*4. Mai 2026*

- 🌿 Aus "BenchMarks" wird **Plätzchen** — sammle nicht nur Bänke, sondern alle netten Pause-Spots
- 🪑 🏔️ ⛺ 🧺 🌿 💧 Sechs Spot-Typen: Bank, Aussichtspunkt, Schutzhütte, Rastplatz, Liegewiese, Wasserstelle
- 💬 Schreibe Community-Tipps zu jedem Spot (max 280 Zeichen)
- 📍 Eigener App-Look mit Plätzchen-Branding

## 0.3.1 — Stabilität
*4. Mai 2026*

- 📍 Klare Warnung wenn der Standort nicht freigegeben ist
- 🤳 Sanfteres Scrollen im Bottom-Sheet auf dem Handy
- 🖼️ Foto-Uploads werden vor dem Senden verkleinert (~30× kleiner, schneller auf mobilen Daten)
- ♿ Größere Tap-Bereiche und bessere Screenreader-Beschriftungen
- 💀 Lade-Skeleton statt "Lädt…"-Text in der Detailansicht

## 0.3.0 — Detail-Updates
*4. Mai 2026*

- 🌲 Neuer Forest-Deep Dark Mode mit besserem Kontrast
- 📷 Foto-Header oben in der Detailansicht
- 📏 Distanz-Anzeige in der Liste (wenn GPS verfügbar)
- 🏆 Rarität-Badge für einzigartige Spots
- 👆 In der Liste tippen öffnet direkt das Detail und fliegt zum Spot

## 0.2.0 — Bewertungen & Fotos
*Mai 2026*

- ⭐ Bewerte Plätzchen nach Komfort, Aussicht und Rarität
- 🏚️ Zustand mit Skala FN / MW / FT / WW / BS (von "wie neu" bis "bedürftig")
- ☀️ Markiere Schatten zu verschiedenen Tageszeiten
- 🍽️ Extras wie Mülleimer, Dach, Tisch, Fahrradständer
- 📸 Foto-Upload pro Plätzchen

## 0.1.0 — Initial Release
*April 2026*

- 🗺️ Interaktive Karte mit Marker-Clustering
- 🪑 Trag deine ersten Plätzchen ein
- 📍 Schnelles GPS mit präzisem Hintergrund-Upgrade
- 🌙 Dark Mode
- 👤 Account-System mit Email/Passwort
- 🧍‍♂️ Wähle deinen Marker-Emoji
- 🛠️ Admin-Dashboard
