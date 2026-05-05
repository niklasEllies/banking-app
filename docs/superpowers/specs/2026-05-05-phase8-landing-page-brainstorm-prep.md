# Landing Page — Brainstorming-Vorbereitung

**Status:** PRE-BRAINSTORM (vor Spec, vor Plan). Diese Datei ist Kontext-Vorlage für die nächste Session.

> **Für den nächsten Agenten:** Plätzchen-User landen aktuell direkt auf `/` = der Karte. Anonyme User sehen die App ohne Erklärung was sie ist. Vor dem Beta-Rollout brauchen wir eine Landing-Page. Lade die Skill `frontend-design` und gehe diese Brainstorming-Punkte mit dem User durch.

## Use-Case

- **Problem:** Anon User landet auf `/` (Karte) ohne zu wissen was Plätzchen ist. Kein Hook, kein "Was kann ich hier?", direkt ins Leere.
- **Wer:** Beta-Tester, später Mund-zu-Mund-Empfehlungen, evtl. organischer Suchtraffic.
- **Was soll passieren:** Anon User → "OK das verstehe ich, ich will mitmachen" → Signup oder "ohne Login angucken" → Karte.

## Marken-Kern (aus Brainstorming-History destilliert)

- **Name:** Plätzchen (Wortspiel: "kleines Plätzchen" zum Sitzen + Diminutiv von "Platz")
- **Anchor:** "Orte, an denen die Welt kurz schön ist" (aus dem Vision-Brainstorming)
- **Vibe:** Slow-Travel, Spazieren, Wandern, "ohne Ziel unterwegs sein"
- **Zielgruppe:** Spaziergänger, Renter, Hundebesitzer, Eltern mit Kinderwagen, Geocacher-Typen, Photographen, Slow-Travel-Wanderer, Neuzugezogene
- **Spot-Typen:** 🪑 Bank, 🏔️ Aussichtspunkt, ⛺ Schutzhütte, 🧺 Rastplatz, 🌿 Liegewiese, 💧 Wasserstelle
- **Was Plätzchen NICHT ist:** Google Maps für Restaurants, Tourist-Spots, Sehenswürdigkeiten, Cafés. Keine kommerziellen POIs.
- **USP:** Orte die Google nicht kennt — die Bank am Flussufer, der versteckte Picknickplatz, die Mole bei Sonnenuntergang.
- **Aktueller Tech-Stack im UI:** Forest-Deep Dark Mode (`#141810` bg, `#5e9e3e` primary), Emojis als Markers, mobil-first.

## Brainstorming-Fragen für die nächste Session

### Frage 1: Aesthetic Direction

`frontend-design` Skill verlangt eine bold, klare ästhetische Verpflichtung. Optionen die zur Plätzchen-Identität passen:

- **A) Editorial / Magazin** — wie ein Slow-Travel-Reise-Magazin. Große Fotos (Bänke, Ausblicke), serifene Display-Font, viel Weißraum, asymmetrische Layouts. Beispiel-Vibe: *Kinfolk*, *Cereal Magazine*.
- **B) Hand-drawn / Sketchbook** — illustrationen statt Fotos, handgezeichnete Karten, Notizbuch-Optik. Zeigt "klein, persönlich, nicht-tech".
- **C) Topo / Outdoor-Apparel** — wie Patagonia/Arc'teryx-Websites. Kontur-Linien als Background, technisch-präzise Typo, Outdoor-Foto-Hero.
- **D) Soft / Botanical** — pastellige Naturfarben, botanische Illustrationen, sanftere Forest-Deep-Variante. Friendly, einladend.

**Meine Empfehlung:** Wahrscheinlich A oder C — beide haben "echte Outdoor-Substanz", nicht generischer Design-System-Slop. A ist Magazine-Editorial, C ist Outdoor-Apparel. Hängt davon ab ob der User eher "ruhig-romantisch" (A) oder "praktisch-konkret" (C) als Identität will.

### Frage 2: Sektionen-Anzahl & Density

Mobile-first heißt: jede Sektion muss auf 360px funktionieren. Trade-off:

- **A) Minimal 3 Sektionen** — Hero, "Was ist Plätzchen", CTA. Schnell scrollable, geringer Bauch-Aufwand.
- **B) Reichhaltig 5-7 Sektionen** — Hero, Sechs-Typen-Showcase, Wie-es-funktioniert (3 Steps), Beta-Hinweis, Featured-Spots, FAQ, CTA.
- **C) Singlepage-Scroller mit kinetischem Storytelling** — Hero scrollt zu Spot-Type-Karussell scrollt zu Wie's-funktioniert. Jede Sektion mit Scroll-Trigger-Anim.

**Meine Empfehlung:** B — 5-7 Sektionen aber tight. Hero + Spot-Types + How-it-works + Beta-Note + CTA. Keine FAQ vor erstem Push.

### Frage 3: Hero — was steht drüber?

Der Hero ist die einzige Chance auf "warum lohnt sich das hier zu lesen". Optionen:

- **A) Tagline-First** — z.B. "Eine Karte für Orte, die nirgendwo stehen." + Untertitel + CTA
- **B) Statement-Frage** — z.B. "Wo ist die schönste Bank an deinem Lieblingsweg?"
- **C) Foto-First** — riesiges Foto eines wirklich schönen Plätzchens, Text overlay
- **D) Animated Demo** — Mini-Karte direkt im Hero mit ein paar animierten Spots

**Meine Empfehlung:** A oder B mit kleinem Foto-Hintergrund. D ist nice aber für Phase 8.5+.

### Frage 4: Auth-Pfad

Der CTA-Pfad muss klar sein:

- **A) "Beta beitreten" (Signup-only)** — keine Demo-Möglichkeit anonym
- **B) Doppel-CTA: "Beta beitreten" + "Karte ansehen"** — letzteres geht direkt zu `/` ohne Login
- **C) "Karte ansehen" als primary, "Beta beitreten" als secondary** — Low-Pressure-Entry

**Meine Empfehlung:** B oder C. Plätzchen funktioniert teilweise auch anonym (man sieht öffentliche Spots). Niemand sollte gezwungen sein sich anzumelden um zu verstehen was hier passiert.

### Frage 5: Wo lebt die Landing-Page?

Aktuell ist `/` die Karte (`app/(app)/page.tsx`). Optionen:

- **A) `/welcome` als neue Route** — Karte bleibt `/`, Landing ist optional
- **B) `/` wird die Landing für anon, eingeloggt geht direkt zur Karte** — besser für SEO und für den "ich kenn die App nicht"-Anker. Karte zieht um auf `/karte` oder bleibt `/` mit Auth-Routing.
- **C) Hybrid: anon = Landing, eingeloggt = Karte, beide auf `/`** — Server-Component routet basierend auf `getUser()`

**Meine Empfehlung:** C. Eine URL bleibt einfach (kein Bookmark-Bruch für Bestandsuser), Server-side conditional rendering in `app/(app)/page.tsx`.

### Frage 6: Was ist EIN bleibendes Detail?

`frontend-design` Skill fragt: "Was macht das UNVERGESSLICH?" Ideen:

- **A) Animierte Karte mit echten User-Spots** im Hero, die man scrollend in die Karte einzoomen kann
- **B) Custom Illustrationen** der 6 Spot-Typen (handgezeichnet)
- **C) Living Numbers** — "37 Plätzchen entdeckt diese Woche" mit live-Counter (Supabase real-time)
- **D) Footnote-Style Marginalien** — kleine kursive Texte am Rand wie in einem Wanderführer

**Meine Empfehlung:** Eine davon picken, nicht alle. Persönlicher Favorit: **D — Marginalien**, passt zur "kleines, persönliches, nicht-tech"-DNA und ist günstig zu implementieren.

## Vorgeschlagene Sektions-Struktur

(Annahme: B aus Frage 2 + C aus Frage 5, anpassen wenn User anders entscheidet)

1. **Hero** — Tagline + Sub + Doppel-CTA + atmosphärischer Hintergrund (Foto / Pattern / Subtle Animation)
2. **6-Typen-Showcase** — die 6 Emojis groß, kurzer Text pro Type ("Bank — der Klassiker", "Aussichtspunkt — wo der Blick lohnt")
3. **Wie es funktioniert** — 3-Step-Block (Eintragen → Bewerten → Teilen)
4. **Beta-Hinweis** — "Wir sind im Beta. Du gestaltest mit." (ehrlich, baut Sympathie)
5. **CTA** — Signup-Box / "Karte ansehen" / Footer

## Tech / Implementation Hints

- Server Component für `/` mit `getUser()`-Routing (Pattern wie in `proxy.ts`).
- Reuse vorhandene SPOT_TYPES für die Showcase-Sektion — keine neuen Konstanten.
- Reuse Tailwind-Farb-Variablen (`primary`, dark Forest-Deep palette) für visuelle Konsistenz mit der App.
- Fonts: aktuell nur Geist (Sans + Mono). Eine **distinctive display font** brauchen wir — Vorschlag: `Fraunces` (variable serif, free, Google Fonts), `Recoleta` oder `Apoka` (Magazinen-feeling). Body bleibt Geist Sans.
- Wenn Landing-Page komplex: eigene Route `(landing)` als Group, separates `layout.tsx` ohne `(app)`-Chrome.
- Charts/Karten im Hero: react-leaflet ist bereits da, aber dynamic import (ssr:false) — beachten.

## Out-of-Scope Hinweise

- **SEO/OG-Tags** — eigene Mini-Phase nach Landing (open graph, sitemap, robots.txt)
- **Multi-Language** — App ist deutschsprachig, Landing auch. EN später.
- **Analytics** — kein Plausible/PostHog jetzt; später
- **Onboarding-Tour nach Signup** — eigenes Phase-8 Item

## Workflow für die nächste Session

1. Lade `frontend-design` Skill explizit
2. Diese Datei kurz dem User zeigen: "hier ist was wir vorbereitet haben, willst du die 6 Fragen durchgehen oder anders einsteigen?"
3. Brainstorming → Spec → Plan → Implementation (gleicher Workflow wie Phase 4-7)
4. Versionierung: Landing-Page = `v0.8.0` (Minor — neues User-Facing-Feature)
5. CHANGELOG-Entry + Docs + Tag wie immer
