# Phase 3a — BenchDetail, QoL & Theme

## Überblick

Lesbarkeits- und UX-Verbesserungen: neues Dark-Mode-Theme, BenchDetail mit Foto und Bankname, Listentap öffnet direkt Detail, Distanzanzeige, Lazy Rarity im Popup, Click-to-Add für Admins.

---

## 1. Dark Mode Theme — Forest Deep

### Ziel
Die aktuellen Dark-Mode-Farben haben zu wenig Kontrast zwischen Background (`#1a1c17`) und Chip-Backgrounds (ebenfalls `#1a1c17`). Forest Deep hebt Surfaces und Chips vom Background ab.

### Neue Farbwerte

| Token | Alt | Neu |
|-------|-----|-----|
| Background | `#1a1c17` | `#141810` |
| Surface (Sheet, Cards) | `#252720` | `#1e231a` |
| Chip-Background | `#1a1c17` | `#2a3124` |
| Border | `#3a3c32` | `#2a2f24` |
| Secondary Text | `#a0a09a` | `#c8c8c0` |
| Dark Primary (Buttons, Links) | `#6aab4a` | `#5e9e3e` |
| Hover Surface | `#1e2019` | `#1a1f14` |
| Active Surface | `#1a1c17` | `#161a10` |

### Betroffene Dateien
- `app/globals.css` — CSS-Variablen im `.dark {}` Block
- Alle Komponenten mit hardkodierten `dark:bg-[#hex]`, `dark:text-[#hex]`, `dark:border-[#hex]` Werten:
  - `components/BottomSheet.tsx`
  - `components/BenchDetail.tsx`
  - `components/StatsVoteForm.tsx`
  - `components/MapHeader.tsx`
  - `components/BenchMap.tsx`
  - `app/(app)/profil/page.tsx`
  - `app/(app)/benches/new/page.tsx`
  - `app/(app)/benches/[id]/edit-photo/page.tsx`
  - `app/(app)/admin/AdminUsers.tsx`, `AdminBenches.tsx`
  - `app/(app)/login/page.tsx`, `app/(app)/signup/page.tsx`

Light Mode bleibt unverändert.

---

## 2. BenchDetail mit Foto und Bankname

### Props-Änderung
`BenchDetail` bekommt `bench: Bench` als zusätzliches Prop (statt nur `benchId`). `BottomSheet` hat das Objekt bereits und übergibt es direkt.

```typescript
interface BenchDetailProps {
  bench: Bench          // neu
  userId: string | null
}
```

`benchId` wird aus `bench.id` abgeleitet.

### Layout (Option A — full-width)

```
┌─────────────────────────────────┐
│  ← Alle Bänke              ✏️  │  ← ✏️ nur wenn userId === bench.created_by
│─────────────────────────────────│
│                                 │
│   [Foto full-width, 110px]      │  ← bench.photo_url, object-cover
│   oder 🪑 auf #2d3a1e           │  ← Placeholder wenn kein Foto
│                                 │
│  Bankname                [RARE] │  ← Name-Overlay unten links, RarityBadge rechts
└─────────────────────────────────┘
  3 Bewertungen
  [Stats Chips]
  [Vote Form]
```

- Foto: `<img>` mit `object-cover`, Höhe 110px, border-radius 0
- Placeholder: `div` mit `background: #2d3a1e`, zentriertes 🪑 Emoji (32px)
- Name-Overlay: `position: absolute` über dem Foto, `bottom: 8px left: 14px`, weiß mit text-shadow
- RarityBadge: im Overlay oben rechts (wenn `aggregated?.rarity_median != null`)
- ✏️ Button: in der BottomSheet-Header-Leiste (bereits vorhanden als `selectedBenchId`-Header), `Link` zu `/benches/{bench.id}/edit-photo`, nur sichtbar wenn `userId === bench.created_by`

### BottomSheet-Anpassung
`BottomSheet` übergibt `bench` statt nur `benchId` an `BenchDetail`:
```tsx
<BenchDetail bench={selectedBench} userId={userId} />
```
`selectedBench` = `benches.find(b => b.id === selectedBenchId)`.

---

## 3. Listentap: Fly + Detail öffnen

### Aktuelles Verhalten
Row-Tap → `onFlyToBench(bench)` → Sheet kollabiert.

### Neues Verhalten
Row-Tap → `onFlyToBench(bench)` + `onBenchSelect(bench.id)` → Sheet bleibt offen, wechselt in Detailmodus (der `useEffect` auf `selectedBenchId` in BottomSheet expandiert automatisch und zeigt Detail).

`BottomSheet` bekommt `onBenchSelect: (benchId: string) => void` als neues Prop (analog zu `onBenchDeselect`). `MapLayout` übergibt `handleBenchSelect`. Änderung in `BottomSheet.tsx`, Zeile mit `onClick` auf den `<li>`:
```typescript
onClick={() => {
  onFlyToBench(bench)
  onBenchSelect(bench.id)   // neu — kein Collapse mehr
}}
```

---

## 4. Distanzanzeige in der Bänkeliste

### Datenfluss
`BenchMap` kennt die GPS-Position des Users (`userPosition`-State). Diese wird via neuem Callback `onPositionUpdate` an `MapLayout` gemeldet. `MapLayout` hält `userPosition: { lat: number; lng: number } | null` und übergibt es an `BottomSheet`.

```
BenchMap ──onPositionUpdate──▶ MapLayout (userPosition state)
                                    │
                                    ▼
                               BottomSheet (userPosition prop)
```

### Haversine-Funktion
Neue Funktion in `lib/bench-utils.ts`:
```typescript
export function distanceTo(
  from: { lat: number; lng: number },
  to: { lat: number; lng: number }
): string  // z.B. "~150 m" oder "1.2 km"
```

Formel: Haversine. Ausgabe: unter 1km → `~{N} m` (auf 10m gerundet), ab 1km → `{N.N} km`.

### Anzeige
In `BottomSheet` neben dem Bench-Namen (rechts, `text-gray-400`), nur wenn `userPosition != null`.

---

## 5. Lazy Rarity im Popup

### Problem
`BenchPopup` erhält aktuell immer `rarityMedian={null}` (hardcoded in `BenchMap.tsx`).

### Lösung
`BenchPopup` fetcht beim Mount via `useEffect` die aggregierten Stats:

```typescript
const [rarityMedian, setRarityMedian] = useState<number | null>(null)

useEffect(() => {
  getBenchStats(bench.id).then(({ aggregated }) => {
    setRarityMedian(aggregated?.rarity_median ?? null)
  })
}, [bench.id])
```

Der hardcodierte `rarityMedian={null}` in `BenchMap.tsx` entfällt — `BenchPopup` verwaltet den State selbst. Leaflet-Popups mounten beim Öffnen und unmounten beim Schließen → kein Memory-Leak.

`BenchMapProps` ändert sich nicht (kein `rarityMedian` Prop mehr nötig).

---

## 6. Click-to-Add (Admin-only)

### Prop-Kette
```
app/(app)/page.tsx  →  MapLayout  →  BenchMapClient  →  BenchMap
     isAdmin               isAdmin         isAdmin         isAdmin
```

`page.tsx` liest `is_admin` aus dem `profiles`-Query (bereits vorhanden für Admin-Page) und übergibt es an `MapLayout`.

### BenchMap-Verhalten wenn `isAdmin === true`
- `MapContainer` bekommt `style={{ cursor: 'crosshair' }}`
- `useMapEvents` Click-Handler:
  ```typescript
  click(e) {
    if (isAdmin) {
      router.push(`/benches/new?lat=${e.latlng.lat}&lng=${e.latlng.lng}`)
    }
  }
  ```
- Kein extra UI, kein Toggle — der veränderte Cursor signalisiert den Modus.

---

## Neue / geänderte Dateien

| Datei | Änderung |
|-------|----------|
| `app/globals.css` | Forest Deep Farb-Tokens in `.dark {}` |
| `lib/bench-utils.ts` | `distanceTo()` Funktion |
| `components/BenchDetail.tsx` | `bench: Bench` Prop, Foto-Header Layout A, ✏️ für Owner |
| `components/BottomSheet.tsx` | `bench` Objekt an BenchDetail, Row-Tap öffnet Detail, Distanz-Anzeige |
| `components/BenchPopup.tsx` | Lazy Rarity via useEffect |
| `components/BenchMap.tsx` | `isAdmin` Prop, Map-Click Handler, `onPositionUpdate` Callback |
| `components/BenchMapClient.tsx` | `isAdmin` + `onPositionUpdate` forwarden |
| `components/MapLayout.tsx` | `userPosition` State + `isAdmin` Prop |
| `app/(app)/page.tsx` | `is_admin` aus Profile-Query an MapLayout |
| Alle dark-mode Komponenten | Hex-Werte auf Forest Deep updaten |

---

## Nicht in Phase 3a

- Phase 3b: Nearby Bench Deduplication (eigener Spec)
- Mehrere Fotos pro Bank
- Light-Mode Theme-Änderungen
- Distanz als Filter/Sortierung
