# Phase 2 — Bank Stats Design

## Überblick

Community-driven Statistiken für Parkbänke. Jeder eingeloggte User kann Stats für jede Bank abgeben. Aggregation via Median/Mode/Threshold. Foto wird vom Creator verwaltet.

---

## Stats-Übersicht

| Stat | Typ | Aggregation |
|---|---|---|
| Komfort | 1–5 Sterne | Median |
| Aussicht | 1–5 Sterne | Median |
| Zustand | Float 0.0–1.0 (5 Stufen) | Median |
| Rarität | 1–5 (Common→Legendary) | Median |
| Schatten | `none`/`morning`/`evening`/`allday` | Mode (häufigster Wert) |
| Extras | `text[]` (bin/roof/accessible/table/bicycle) | Item anzeigen wenn ≥50% der Votes |
| Foto | URL | Creator-only (kein Voting) |

> **Notiz:** Shadow-Mode und Extras-Threshold können bei Bedarf auf creator-set vereinfacht werden. Die Tabellenstruktur unterstützt beides ohne Schema-Änderung.

---

## Datenmodell

### `benches` (Änderung)
```sql
ALTER TABLE public.benches ADD COLUMN photo_url text;
```

### `bench_stats_votes` (neu)
```sql
CREATE TABLE public.bench_stats_votes (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bench_id    uuid NOT NULL REFERENCES public.benches(id) ON DELETE CASCADE,
  user_id     uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  comfort     smallint CHECK (comfort BETWEEN 1 AND 5),
  view_rating smallint CHECK (view_rating BETWEEN 1 AND 5),
  condition   float4   CHECK (condition BETWEEN 0 AND 1),
  shadow      text     CHECK (shadow IN ('none','morning','evening','allday')),
  extras      text[]   CHECK (extras <@ ARRAY['bin','roof','accessible','table','bicycle']),
  rarity      smallint CHECK (rarity BETWEEN 1 AND 5),
  created_at  timestamptz DEFAULT now(),
  UNIQUE(bench_id, user_id)
);

CREATE INDEX bench_stats_votes_bench_id_idx ON public.bench_stats_votes(bench_id);
```

### RLS
```sql
ALTER TABLE public.bench_stats_votes ENABLE ROW LEVEL SECURITY;

-- Anyone can read aggregated stats (via bench detail)
CREATE POLICY "Anyone can read stats votes"
  ON public.bench_stats_votes FOR SELECT USING (true);

-- Authenticated users can insert/update their own vote
CREATE POLICY "Users can upsert own stats vote"
  ON public.bench_stats_votes FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own stats vote"
  ON public.bench_stats_votes FOR UPDATE TO authenticated
  USING (auth.uid() = user_id);
```

### Aggregations-Funktion
```sql
CREATE OR REPLACE FUNCTION get_bench_aggregated_stats(p_bench_id uuid)
RETURNS TABLE (
  comfort_median    float,
  view_median       float,
  condition_median  float,
  rarity_median     float,
  shadow_mode       text,
  extras_threshold  text[],
  vote_count        bigint
) LANGUAGE sql STABLE AS $$
  SELECT
    PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY comfort)     AS comfort_median,
    PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY view_rating) AS view_median,
    PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY condition)   AS condition_median,
    PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY rarity)      AS rarity_median,
    MODE()               WITHIN GROUP (ORDER BY shadow)      AS shadow_mode,
    ARRAY(
      SELECT item FROM unnest(ARRAY['bin','roof','accessible','table','bicycle']) AS item
      WHERE (
        SELECT COUNT(*) FROM bench_stats_votes v2
        WHERE v2.bench_id = p_bench_id AND item = ANY(v2.extras)
      )::float / NULLIF(
        (SELECT COUNT(*) FROM bench_stats_votes v3 WHERE v3.bench_id = p_bench_id), 0
      ) >= 0.5
    )                                                          AS extras_threshold,
    COUNT(*)                                                   AS vote_count
  FROM bench_stats_votes
  WHERE bench_id = p_bench_id;
$$;
```

> **Performance:** Mit Index auf `bench_id` ist die Aggregation über hunderte Votes in Mikrosekunden. Kein Caching nötig für den absehbaren Scale. Bei Bedarf später als Materialized View oder Trigger-cached Column addierbar.

---

## Navigation & Flows

### Marker → Detail
```
Marker tippen
  → Leaflet Popup (BenchPopup.tsx)
      [Foto-Thumbnail oder 🪑 Placeholder]
      [Bench Name]  [Rarity Badge]
      [Details →]   [🗑 Löschen] (owner only)
  → "Details →" tippen
      → Bottom Sheet wechselt in Detailansicht (BenchDetail.tsx)
```

### Sheet Liste → Fly To
```
Sheet expandiert (Liste)
  → Zeile tippen
      → map.flyTo(bench.lat, bench.lng, zoom 16)
      → Sheet kollabiert
      → User sieht Marker auf Karte
      → Marker tippen → Popup (normaler Flow)
```

### Stats eingeben
```
Detail-Ansicht im Sheet
  → User sieht Community-Aggregat (oder "—" wenn noch keine Votes)
  → Darunter: eigener Vote-Bereich (vorausgefüllt wenn bereits gevoted)
  → Ein "Bewertung speichern" Button für alle Felder
  → UPSERT via Server Action → Sheet aktualisiert sich mit neuen Aggregaten
```

### Foto hinzufügen/ändern
```
Detail-Ansicht → ✏️ Icon (nur Owner)
  → /benches/[id]/edit-photo
      → Upload-Formular (max 5MB, jpg/png/webp)
      → Upload zu Supabase Storage bucket "bench-photos"
      → UPDATE benches SET photo_url = ... 
      → redirect zurück zur Karte
```

### Bank eintragen (Erweiterung)
```
/benches/new (bestehend)
  + optionales Foto-Feld (file input, gleicher Upload-Flow)
  → bei Foto: erst zu Storage, dann bench.photo_url setzen
```

---

## Condition-Werte

| Label | Abkürzung | Float-Midpoint |
|---|---|---|
| Factory New | FN | 0.95 |
| Minimal Wear | MW | 0.70 |
| Field-Tested | FT | 0.475 |
| Well-Worn | WW | 0.25 |
| Battle-Scarred | BS | 0.075 |

Eingabe: 5 Buttons (FN/MW/FT/WW/BS). Anzeige im Sheet: Kürzel + Farb-Badge.

## Rarity-Labels

| Stars | Label | Farbe |
|---|---|---|
| 1 | Common | Grau |
| 2 | Uncommon | Grün |
| 3 | Rare | Blau |
| 4 | Epic | Lila |
| 5 | Legendary | Gold/Orange |

---

## Bottom Sheet — State-Erweiterung

`BottomSheet.tsx` bekommt einen dritten State: `view: 'list' | 'detail'` und `selectedBenchId: string | null`.

```
isExpanded=false            → Pill (N Bänke ↑)
isExpanded=true, view=list  → Bänke-Liste (bestehend)
isExpanded=true, view=detail → BenchDetail für selectedBenchId
```

`MapLayout.tsx` hält `selectedBenchId` als State und übergibt es an beide BenchMap (für Popup-Trigger) und BottomSheet.

---

## Neue Dateien

| Datei | Typ | Zweck |
|---|---|---|
| `actions/stats.ts` | Server Action | `upsertStats(benchId, fields)` — UPSERT in bench_stats_votes |
| `actions/benches.ts` | Erweiterung | `uploadBenchPhoto(file)`, `updateBenchPhoto(benchId, url)` |
| `components/BenchPopup.tsx` | Client | Leaflet Popup mit Foto, Name, Rarity Badge, Buttons |
| `components/BenchDetail.tsx` | Client | Detail-Ansicht im Sheet (Stats + Vote-Form) |
| `components/StatsVoteForm.tsx` | Client | Inline-Vote-Inputs, UPSERT per Feld |
| `components/RarityBadge.tsx` | Server/Client | Badge-Anzeige (Common → Legendary) |
| `app/(app)/benches/[id]/edit-photo/page.tsx` | Server | Foto-Upload-Seite für Owner |
| `lib/stats-utils.ts` | Utility | Condition float→label, Rarity int→label, Extras-Icons |

### Geänderte Dateien

| Datei | Änderung |
|---|---|
| `components/BenchMap.tsx` | Popup durch BenchPopup ersetzen, `onBenchSelect` Callback |
| `components/BottomSheet.tsx` | view/selectedBenchId State, FlyTo bei Listentap |
| `components/MapLayout.tsx` | `selectedBenchId` State coordinating Map ↔ Sheet |
| `app/(app)/page.tsx` | Benches-Query um `photo_url` erweitern |
| `app/(app)/benches/new/page.tsx` | Optionales Foto-Feld |
| `actions/benches.ts` | Photo-Upload Logik |

---

## Foto-Upload

- Supabase Storage Bucket `bench-photos` (public, kein Auth für Lesezugriff)
- Dateiname: `{bench_id}/{timestamp}.{ext}`
- Max 5MB, akzeptierte Typen: `image/jpeg`, `image/png`, `image/webp`
- Altes Foto wird beim Ersetzen aus Storage gelöscht
- Placeholder wenn `photo_url = null`: großes 🪑 Emoji zentriert auf grünem Hintergrund

---

## Nicht in Phase 2

- Mehrere Fotos pro Bank
- Foto-Voting / Community-Fotos
- Stats-Verlauf / Zeitreihen
- Filterung der Karte nach Stats
- Notifikationen bei neuen Votes auf eigene Bänke
