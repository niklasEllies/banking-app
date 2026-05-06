# Cookie Banner — Plätzchen-Hinweis Spec

**Status:** PLANNED · noch nicht zu implementieren
**Trigger zur Umsetzung:** Sobald Plätzchen Analytics, Tracking, Embed-Pixel oder andere nicht-essentielle Cookies/Storage einführt (z.B. Plausible, PostHog, Google Analytics, Hotjar, Sentry-Replay)
**Dependency-free heute:** noch nicht erforderlich (siehe "Aktueller Stand" unten)

## Aktueller Stand (2026-05-06)

Plätzchen verwendet derzeit ausschließlich strikt-notwendige Speichermechanismen:

| Mechanismus | Zweck | Rechtliche Einordnung |
|---|---|---|
| Supabase Auth-Cookies | Login-Session (`sb-*` cookies) | Strictly necessary (TTDSG §25 Abs. 2) — kein Consent nötig |
| `localStorage` `benchmarks-theme` | Hell/Dunkel-Theme-Wahl | User-Preference, strictly necessary für UX |
| `localStorage` `benchmarks_user_emoji` | Marker-Emoji des Users | User-Preference, strictly necessary |
| `localStorage` `benchmarks-gps-banner-dismissed` | GPS-Hinweis verstecken | User-Preference, strictly necessary |
| OSM Tile-Server (extern) | Karten-Tiles | Funktional notwendig — IP-Logging beim Provider, kein Tracking |

**Konsequenz:** Kein Cookie-Banner rechtlich erforderlich. Sobald sich das ändert, greift diese Spec.

## Wann der Banner kommt

- Plausible / PostHog / GA wird eingeführt → **Pflicht**
- Sentry-Replay oder vergleichbares Session-Recording → **Pflicht**
- Marketing-Pixel (Meta, LinkedIn, etc.) → **Pflicht**
- Embed-Karten / -Videos die selbst Cookies setzen → **Pflicht**
- A/B-Testing-Tools mit Persistenz → **Pflicht**

## Markenkern: "Plätzchen" als Wortspiel

**Plätzchen** bedeutet im Deutschen ZWEI Dinge:
- "kleiner Sitzplatz" (unsere Brand)
- "kleiner Keks / Cookie" (Backware)

Der Banner muss dieses Wortspiel zelebrieren — nicht als Marketing-Gag, sondern als ehrliche, charmante Tonalität. Kein generisches "We use cookies", sondern Plätzchen-Sprache durchgehend.

## Texte (Deutsch)

### Hero-Frage (Modal-Headline)

> **Mögt ihr Plätzchen?**

oder ehrlicher:

> **Wir backen frische Plätzchen**

### Body (Erklärung)

> Wir verwenden Plätzchen (Cookies), um die App zu verbessern. Manche brauchen wir, damit du dich einloggen kannst — andere helfen uns zu verstehen, was funktioniert und was nicht. Du entscheidest.

### Buttons (3-Optionen-Pattern, NICHT 2 wie viele Banner)

| Button | Funktion |
|---|---|
| **Alle Plätzchen** (primary) | Akzeptiert essentials + analytics + alles andere |
| **Selber zusammenstellen** | Öffnet Detail-View mit Toggles |
| **Nur die nötigen** | Nur strictly necessary, lehnt analytics ab |

**Wichtig:** "Ablehnen" und "Akzeptieren" müssen visuell gleich prominent sein (TTDSG-Anforderung — kein Dark-Pattern wo Reject schwerer findbar ist).

### Detail-View (nach "Selber zusammenstellen")

Toggles pro Kategorie:

```
🪑 Notwendige Plätzchen                              [immer an]
   Login, Theme, Marker — diese können wir nicht ausschalten

📊 Analyse-Plätzchen                                 [Toggle]
   Wir lernen anonym, welche Funktionen genutzt werden

📷 Eingebettete Inhalte                              [Toggle]
   z.B. YouTube-Videos in Plätzchen-Beschreibungen
```

Plus „Speichern"-Button und „Alles akzeptieren"-Shortcut.

## Visuelle Sprache

- **Forest-Deep Dark Theme** (matcht Landing-Aesthetic)
- **Topo-Pattern** als subtiler Background (wie Landing)
- **🍪 Emoji ist tabu** — wir nutzen 🪑 oder das spätere Custom-Bench-SVG. Plätzchen sind Sitzplätze, nicht Kekse — auch wenn das Wortspiel im Text lebt.
- **Position:** Bottom-Sheet auf Mobile, Bottom-Right-Card auf Desktop (Cookie-Banner-Konvention)
- **Höhe:** Mobile = Bottom-Sheet (keine 100vh-Modal), Desktop = max ~360px hoch
- **Farben:** Background `#1d2218`, Border `#5e9e3e/40`, Primary-CTA in `#5e9e3e`

## Tech / Implementation

### Storage

`localStorage` mit Key `plaetzchen-consent` (Migration weg vom alten `benchmarks-`-Prefix anstoßen, oder weiterhin akzeptieren falls bereits in Use). Format:

```ts
type ConsentChoice = {
  version: 1
  decidedAt: string  // ISO timestamp
  necessary: true    // immer
  analytics: boolean
  embeds: boolean
}
```

Versionierung: bei Änderung der Kategorien (`version` erhöhen) → Banner erneut zeigen.

### Banner-Visibility-Logic

```ts
function shouldShowBanner(): boolean {
  const stored = localStorage.getItem('plaetzchen-consent')
  if (!stored) return true
  const parsed = JSON.parse(stored) as ConsentChoice
  if (parsed.version < CURRENT_VERSION) return true
  return false
}
```

### Components (geplant)

```
app/_components/
  CookieBanner.tsx           Client Component, mounted in root layout
  CookieBannerDetails.tsx    Sub-Component für Detail-View mit Toggles
lib/
  consent.ts                 helpers: getConsent(), setConsent(), hasConsent('analytics')
```

### Integration mit Analytics-Tools

Analytics-Provider (z.B. Plausible) **NICHT** im root layout laden, sondern erst nach Consent:

```tsx
'use client'
import { useEffect } from 'react'
import { hasConsent } from '@/lib/consent'

export function PlausibleScript() {
  const [allowed, setAllowed] = useState(false)
  useEffect(() => setAllowed(hasConsent('analytics')), [])
  if (!allowed) return null
  return <Script src="..." />
}
```

### Re-Open-Mechanik

Nach erstem Consent muss der User die Wahl jederzeit ändern können:
- Footer-Link "Plätzchen-Einstellungen" → öffnet das Detail-Modal mit aktuellen Werten
- Settings-Page (zukünftig) bekommt einen Eintrag

## A11y

- `role="dialog"` mit `aria-labelledby` auf Headline
- Initial focus auf "Alle Plätzchen"-Button (primary action), aber TTDSG erlaubt das nicht zu prominent
- Detail-View ist `<dialog>` mit echtem Focus-Trap
- Keyboard: Tab durch Buttons, Esc schließt nichts (nur "Speichern" beendet) — sonst gilt Banner als unentschieden und bleibt
- ARIA-live region für "Auswahl gespeichert"-Bestätigung
- `prefers-reduced-motion`: keine Slide-Animation, nur Fade

## Compliance-Anforderungen

- **TTDSG §25 Abs. 1**: Aktive Einwilligung erforderlich vor Cookie-Set
- **Speicherung Beweisbarkeit**: `decidedAt` Zeitstempel + Version reicht für Privacy-Audit
- **Widerruf**: muss jederzeit möglich sein (siehe Re-Open-Mechanik)
- **Drittland-Transfers**: falls US-Tools (Sentry, GA) → expliziter Hinweis im Detail-Text
- **Datenschutzerklärung**: muss vom Banner aus erreichbar sein (`/datenschutz` — eigene Mini-Page nötig)

## Out-of-Scope für diese Spec

- Datenschutzerklärung-Page (`/datenschutz`) — eigene Spec wenn benötigt
- Impressum (`/impressum`) — DE-Pflicht ab gewerblicher Nutzung
- Auftragsverarbeitungsverträge (AVV) mit Supabase, OSM, Vercel etc. — operativ, nicht UI

## Acceptance Criteria

- [ ] Banner erscheint beim ersten Besuch ohne `plaetzchen-consent` localStorage
- [ ] Drei Buttons sichtbar gleich prominent (kein Dark Pattern)
- [ ] "Selber zusammenstellen" öffnet Detail-Toggle-View
- [ ] Auswahl wird in localStorage versioniert gespeichert
- [ ] Analytics-Tool lädt nur wenn `hasConsent('analytics') === true`
- [ ] Footer-Link "Plätzchen-Einstellungen" öffnet Banner erneut
- [ ] Wortspiel "Plätzchen = Sitzplatz UND Keks" durchgehend erkennbar
- [ ] Forest-Deep + Topo-Aesthetic konsistent zur Landing
- [ ] Funktioniert auf Mobile (Bottom-Sheet) und Desktop (Bottom-Right-Card)
- [ ] `prefers-reduced-motion` honored
- [ ] AAA-Kontrast für alle Texte
- [ ] Datenschutzerklärung verlinkt (auch wenn die selbst noch in einer anderen Spec lebt)
