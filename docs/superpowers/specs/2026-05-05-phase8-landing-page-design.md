# Phase 8 — Landing Page Design Spec

**Status:** Approved 2026-05-05
**Target version:** v0.8.0 (minor — neues user-facing Feature)
**Brainstorm-prep source:** `docs/superpowers/specs/2026-05-05-phase8-landing-page-brainstorm-prep.md`

## Goal

Plätzchen bekommt eine öffentliche Landing-Page auf `/`, die anonymen Besuchern in 5 Sektionen erklärt was die App ist, sie via Live-Karte und Live-Counter sofort als "echt und alive" erlebbar macht, und sie über zwei klare CTAs ("Karte ansehen" primary → `/map`, "Beta beitreten" secondary → `/signup`) ins Produkt führt.

## Brainstorming Outcomes

| # | Frage | Entscheidung |
|---|---|---|
| 1 | Aesthetic Direction | **C — Topo / Outdoor-Apparel** (Höhenlinien-SVG-Background, Mono-Typo für technische Labels, dunkel-grünes Forest-Deep-Setting, Patagonia-/Arc'teryx-Vibe) |
| 2 | Sektionen-Density | **C — Scroller mit kinetischem Storytelling** (5 Sektionen + Scroll-Trigger-Reveals + Parallax-Höhenlinien + Live-Counter-Tick-up) |
| 3 | Hero-Layout | **D — Live-Karte** (Mini-Map rechts mit pulsierenden Spot-Markern, Tagline + CTAs links) |
| 4 | CTA-Hierarchie | **C — "Karte ansehen" primary, "Beta beitreten" secondary** (Low-Pressure-Entry; Karte muss anon-tauglich sein) |
| 5 | URL-Struktur | **B (modifiziert) — `/` = Landing, `/map` = Map** (nicht `/karte`; englische Slug, deutsche UI) |
| 6 | Bleibendes Detail | **C — Living Numbers** (Live-Counter + 3-zeiliger Activity-Ticker mit Supabase real-time) |
| ⊕ | Authed `/`-Besuch | **(i) Auch authed sehen die Landing** — CTA wird zu "Zur Karte" statt "Beta beitreten" |

## Routes & Architecture

### Route-Map nach Phase 8

```
/                  Landing (public, Server Component, neu)
/map               Map (anon-aware, Server Component) — vorher /
/spots/[id]        Spot-Detail (anon-aware, existing)
/spots/[id]/edit   Edit-Form (auth, existing)
/login             Auth, existing
/signup            Auth, existing
/friends           Auth, existing
/admin             Auth, existing
/changelog         Public, existing
```

### File-Migration

```
app/(app)/page.tsx         →  app/(app)/map/page.tsx     (Map zieht um)
app/(marketing)/page.tsx   →  NEU                         (Landing)
app/(marketing)/layout.tsx →  NEU                         (Marketing-Chrome, kein App-Sheet)
```

### `proxy.ts` Changes

- Aktuell: alle Routes ausser explizit-public erfordern Auth → Anon hitting `/` redirected zu `/login`.
- Neu: `/` und `/map` und `/spots/*` sind public. Anon-User darf surfen, RLS via `can_see_spot()` filtert auf `visibility='public'` automatisch.
- `/spots/[id]/edit`, `/friends`, `/admin` bleiben auth-required.

## Page Sections

Reihenfolge in Scroll-Richtung. Topo-Höhenlinien-SVG durchläuft als subtiler Background-Layer alle Sektionen mit leichtem Parallax-Shift bei Scroll.

### 1. Hero

Layout: 2-Spalter Desktop (links: Text + CTAs, rechts: Mini-Karte). Mobile: stacked (Text oben, Karte unten, je full-width).

| Element | Inhalt |
|---|---|
| Meta-Zeile (oben) | `◆ 50.94° N  ◆ BETA · FRÜHJAHR 26` (Geist Mono, uppercase, `#8aa376`) |
| Headline | `PLÄTZ` (Geist Sans 800, uppercase) + `chen` (Fraunces 300 italic, `#5e9e3e`) |
| Subline | "Eine Karte für Orte, die nirgendwo stehen." (Geist Sans 400, 16-18px, `#c8c8c0`) |
| Body | "Bänke, Aussichten, Schutzhütten, Liegewiesen — die Plätze, die Google nicht kennt." (15px) |
| CTA primary | "Karte ansehen" → `/map` (grün `#5e9e3e`, schwarzer Text, uppercase, 700) |
| CTA secondary (anon) | "Beta beitreten" → `/signup` (Ghost-Border) |
| CTA secondary (authed) | _entfällt_ (nur "Zur Karte" → `/map` als single primary) |
| Mini-Karte (rechts) | react-leaflet, 5-7 echte public Spots, alle pulsierend, drag-disabled, kein Zoom-Control. Höhe ≈ 480px. |

### 2. Sechs Typen

Layout: 6×1 (Desktop) / 3×2 (Tablet) / 2×3 (Mobile). Cards mit subtiler grüner Border.

| Element | Inhalt |
|---|---|
| Section-Meta | `◆ 02 · Sechs Typen` (Geist Mono) |
| Heading | "Was zählt als *Plätzchen*?" (Geist Sans 700 uppercase, `chen` Fraunces italic) |
| Pro Card | Emoji (28-32px) + Name (Geist Mono 10px uppercase) + Count (Mono 9px `#5e9e3e`) |
| Datenquelle | `SPOT_TYPES` (existing) + Server-Query `SELECT type, count(*) FROM spots WHERE visibility='public' GROUP BY type` |

### 3. Living Numbers

Layout: 3 Stats nebeneinander (große Zahl, kleines Label) + Activity-Ticker darunter.

| Element | Inhalt |
|---|---|
| Section-Meta | `◆ LIVE · 03 · Aktuell` + grüner Pulse-Indikator |
| Stat 1 (groß, ~84px) | `1.247` Plätzchen entdeckt |
| Stat 2 (mittel, ~56px) | `+37` diese Woche |
| Stat 3 (klein, ~42px) | `186` Beta-Tester |
| Ticker (3-zeilig, rotiert alle 3s) | `→ Neue Bank · vor 4 Min` / `→ Aussichtspunkt bewertet · vor 11 Min` / `→ Schutzhütte mit Foto · vor 23 Min` |
| Datenquelle | Server-fetch initial counts + 3 letzte Events; Client-Subscription via Supabase real-time auf `spots` und `spot_descriptions` INSERT |
| Animationen | Tick-up von 0 auf Zielwert beim ersten In-View (1.2s ease-out, tabular-nums); Pulse 1.6s loop; Ticker CSS-keyframe-rotation |

### 4. Wie's funktioniert

Layout: 3 Steps vertikal (Mobile) oder 3-Spalter (Desktop ≥800px).

| Element | Inhalt |
|---|---|
| Section-Meta | `◆ 04 · So geht's` |
| Heading | "Eintragen, bewerten, *teilen*." (italic Fraunces auf "teilen") |
| Step 01 | "Pin setzen — Ort gefunden? GPS macht den Rest." |
| Step 02 | "Bewerten — Komfort, Aussicht, Schatten zur Tageszeit, Foto dazu." |
| Step 03 | "Teilen — Öffentlich, nur Freunde, oder privat. Du entscheidest." |

### 5. Beta-Hinweis + CTA (kombiniert)

Layout: zentriert, großzügig.

| Element | Inhalt |
|---|---|
| Section-Meta | `◆ 05 · Beta` |
| Headline | "Wir sind im Beta. *Du gestaltest mit.*" |
| Body | "Feedback fließt direkt rein. Was hier wackelt, wird nächste Woche stabiler." |
| CTA primary (anon) | "Beta beitreten" → `/signup` |
| CTA primary (authed) | "Zur Karte" → `/map` |
| Sub-link | "oder erst die Karte ansehen" → `/map` (nur anon, klein, dezent) |

### 6. Footer

Minimal: Copyright + Link zu `/changelog` + Link zu `/admin` (nur authed admins; via `getUser()` server-checked).

## Anon Map (`/map` für Gäste)

`app/(app)/map/page.tsx` rendert für `getUser() === null`:

- Karte zeigt nur `visibility='public'` Spots (RLS-natürlich via `can_see_spot()`)
- AddSpotForm: ausgeblendet
- FavoriteToggle: ausgeblendet
- SpotActionMenu (Edit/Delete): ausgeblendet
- VisibilityPicker auf Spot-Details: nicht editierbar (nur lesbar)
- Banner oben (sticky, dezent): `Du erkundest als Gast — [Beta beitreten] um eigene Plätzchen einzutragen`

`MapLayout` Component bekommt einen `readonly: boolean` Prop, der durch alle Children fließt (BottomSheet, Marker-Popover, etc.).

## Components (neue Files)

```
app/(marketing)/layout.tsx                  Marketing-Chrome, font-loader
app/(marketing)/page.tsx                    Landing Server Component
app/(marketing)/_components/
  HeroSection.tsx                           Server, composes left + right
  HeroMapPreview.tsx                        Client, dynamic(react-leaflet, ssr:false)
  SpotTypesShowcase.tsx                     Server, fetches counts
  LivingNumbers.tsx                         Server, fetches initial counts
  LivingNumbersClient.tsx                   Client, real-time subscription + tick-up
  ActivityTicker.tsx                        Server fetch + Client rotation
  HowItWorks.tsx                            Server (static)
  BetaCtaSection.tsx                        Server (auth-aware CTA)
  TopoBackground.tsx                        Client (parallax-shift on scroll)
  MarketingFooter.tsx                       Server
lib/
  marketing-stats.ts                        Server-side helpers: getSpotCounts(), getRecentActivity()
```

## Modified Components

| File | Change |
|---|---|
| `proxy.ts` | `/`, `/map`, `/spots/*` zu public-list hinzufügen |
| `components/MapLayout.tsx` | `readonly?: boolean` Prop, propagiert |
| `components/AddSpotForm.tsx` | render `null` wenn readonly |
| `components/FavoriteToggle.tsx` | render `null` wenn readonly |
| `components/SpotActionMenu.tsx` | render `null` wenn readonly |
| `components/SpotEditForm.tsx` | unverändert (Route ist auth-required) |
| `components/SpotDescriptionFeed.tsx` | Description-Add-Form rendert nur wenn nicht readonly |

## Tech & Dependencies

| Item | Choice |
|---|---|
| Motion library | `motion` (Nachfolger von framer-motion, React 19 kompatibel) — neue Dep |
| Display Font | **Fraunces** via `next/font/google` (variable serif, opsz 9-144, weights 300/500) — neue Dep |
| Body Font | Geist Sans (existing) |
| Mono Font | Geist Mono (existing) |
| Map Library | react-leaflet (existing), dynamic-imported, ssr:false |
| Real-time | Supabase Realtime Channel auf `spots` und `spot_descriptions` (INSERT events) |

**Bundle-Impact:** ~25 KB für `motion` + ~12 KB für Fraunces variable subset. Acceptable.

## Motion & Animation Plan

| Element | Animation |
|---|---|
| Section-Reveal | fade-up + 12px Y-shift, 0.6s ease-out, `whileInView` mit `viewport={{ once: true, margin: '-50px' }}` |
| Stagger-Children (z.B. 6 Typen) | 80ms delay zwischen Cards |
| Topo-Background | `useScroll` + `useTransform` für `translateY` von 0 → -40px über die ganze Seite (parallax) |
| Hero-Map-Marker | CSS-Keyframe `marker-pulse` 2s ease-out infinite + `marker-bob` 3s, mit staggered `animation-delay` 0/0.4/0.8/1.2/1.6s |
| Living-Number-Tick-Up | `motion.span` mit `animate` von 0 zu Wert, 1.2s ease-out, tabular-nums |
| Activity-Ticker | CSS-Keyframe-rotation, 9s steps(1) infinite (3 Items × 3s) |
| Pulse-Indikator | CSS-Keyframe `pulse` 1.6s ease-in-out infinite |

### Reduced-Motion-Gating

Globaler CSS-Rule:
```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01s !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01s !important;
  }
}
```

Plus motion-Lib respektiert `useReducedMotion()` automatisch — Reveals werden zu instant-fade. Marker-Pulse, Ticker-Rotation, Tick-Up: alle stoppen.

## A11y & Performance

- **LCP-Target ≤ 2.5s:** Hero-Text ist Server-rendered und unblocked. Mini-Karte lädt async (dynamic). LCP ist die Hero-Headline.
- **CLS-Target = 0:** Map-Container hat fixed-aspect-ratio, kein Layout-Shift wenn Tiles laden.
- **Mobile-First:** alle Sektionen auf 360px lesbar (Mockups validiert). Hero collapsed Desktop-2-Spalter zu stacked.
- **Keyboard-Nav:** Skip-Link "Zum Hauptinhalt"; Section-Anchors via `<section id="...">`; CTAs sind native `<Link>` mit sichtbarem Focus-Ring (`outline: 2px solid #5e9e3e; outline-offset: 4px`).
- **Screenreader:** Map-Preview hat `aria-label="Karte mit Beispiel-Plätzchen"` und ist `aria-hidden="false"` aber nicht keyboard-navigable; Spot-Markers haben kein Tab-Index. Screenreader bekommt eine Text-Zusammenfassung "5 Plätzchen sichtbar in der Vorschau".
- **Color-Contrast:** alle Text-Farben getestet — `#c8c8c0` auf `#1d2218` = 8.9:1 (AAA), `#8aa376` auf `#1d2218` = 5.4:1 (AA), `#5e9e3e` auf `#14180f` für Buttons = 6.2:1 (AA).
- **Lighthouse-Target:** Performance ≥90, A11y ≥95, Best Practices ≥95, SEO ≥85 (kein Sitemap/OG yet).

## Authed-User Flow auf `/`

Server Component checkt `getUser()`:
- Wenn null (anon): Hero zeigt 2 CTAs ("Karte ansehen" + "Beta beitreten"); Beta-Section zeigt "Beta beitreten"
- Wenn user: Hero zeigt 1 CTA ("Zur Karte" → `/map`); Beta-Section zeigt "Zur Karte"; subtiler Begrüßungs-Text optional ("Hi, $username")

Existing-Beta-User-Bookmark `/` → sieht jetzt Landing → klickt "Zur Karte" → `/map`. Ein zusätzlicher Klick als Migrations-Reibung. Kein Banner nötig.

## Data Flow

```
Landing (Server Component, /)
  ├─ getUser()                                   → null | user object
  ├─ getSpotCounts()                              → { bench: 347, viewpoint: 189, ... }
  ├─ getHeroSampleSpots(limit=6)                  → public spots, randomized
  ├─ getInitialLivingNumbers()                    → { total, thisWeek, betaUsers }
  └─ getRecentActivity(limit=3)                   → [{type, action, timestamp}, ...]

Client Hydration:
  ├─ HeroMapPreview                                : initialSpots als Prop, react-leaflet rendert
  ├─ LivingNumbersClient                           : initialNumbers als Prop, Supabase channel subscribed
  └─ ActivityTickerClient                          : initialEvents als Prop, CSS rotation
```

## Testing Strategy

| Test-Typ | Coverage |
|---|---|
| Vitest unit | `getSpotCounts`, `getRecentActivity`, `formatTimeAgo` Helper |
| Vitest component | Anon vs authed CTA-Render, Reduced-Motion Detection |
| Playwright e2e | Anon visit `/` → Landing rendert · Click "Karte ansehen" → `/map` rendert read-only · Click "Beta beitreten" → `/signup` · Authed visit `/` → "Zur Karte"-CTA |
| Manual Real-Device | iPhone SE (375px), Pixel 7 (412px), iPad (768px), Desktop (1280px+) |
| Lighthouse | Performance/A11y/Best-Practices/SEO scores im PR-Check |

## Out-of-Scope (Folgen-Phasen)

- **SEO/OG-Tags + Sitemap + robots.txt** → Mini-Phase 8.1 nach Beta-Launch
- **Multi-Language (EN)** → Phase 9+
- **Analytics (Plausible/PostHog)** → wenn Beta größer wird
- **Onboarding-Tour nach Signup** → eigene Phase
- **Custom Topo-Icons statt Emojis** → bleibt Phase 7+ Item ("Vector Icons wenn user designt hat")
- **Photo-Hero (echtes Foto statt SVG-Topo)** → wenn User-Spot-Fotos qualitativ stark genug sind

## Rollout

1. Implementation in Worktree `.worktrees/phase8-landing-page`
2. Vitest + Playwright grün
3. Manual Real-Device-Smoke
4. Merge to master → CHANGELOG-Entry "0.8.0 — Landing Page" → git tag v0.8.0
5. Vercel Deploy (preview-Build vor Production-Promote)
6. Beta-Tester via existing Channel informieren ("Karte ist umgezogen nach `/map`, neue Landing auf `/`")

## Acceptance Criteria

- [ ] Anon visit `/` zeigt Landing mit funktionierender Mini-Karte (5-7 Markern, pulsierend)
- [ ] Anon click "Karte ansehen" → `/map` rendert nur public Spots, keine Add/Edit/Favorite-UI
- [ ] Anon click "Beta beitreten" → `/signup`
- [ ] Authed visit `/` zeigt "Zur Karte"-CTA statt "Beta beitreten"
- [ ] Living Numbers zeigt korrekte initial counts; nach Insert in `spots` Tabelle (z.B. via Supabase Studio) tickt der Counter live nach
- [ ] Activity-Ticker rotiert 3 Items alle 3s
- [ ] Topo-Background hat sichtbaren Parallax-Effekt beim Scrollen
- [ ] `prefers-reduced-motion: reduce` stoppt alle Animationen (Marker-Pulse, Tick-Up, Ticker-Rotation, Reveals)
- [ ] Lighthouse Mobile: Performance ≥90, A11y ≥95
- [ ] Real-Device-Test: alle Sektionen lesbar auf 360-412px
- [ ] CHANGELOG.md hat Entry "0.8.0 — Landing Page" mit deutsch-User-Sprache
- [ ] git tag `v0.8.0` annotated, gepusht
