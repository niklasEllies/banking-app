# Datenbankschema

> **Phase 4 Stand:** `benches` → `spots`, `bench_stats_votes` → `spot_stats_votes`, neuer `spot_type` Enum + neue `spot_descriptions` Tabelle.

## profiles

Nutzerprofil, verknüpft mit Supabase Auth.

| Spalte | Typ | Beschreibung |
|---|---|---|
| `id` | `uuid` | PK, FK → `auth.users.id` |
| `username` | `text` | Unique |
| `is_admin` | `boolean` | Default: `false` |
| `created_at` | `timestamptz` | Auto: `now()` |

**Trigger:** `on_auth_user_created` — legt Zeile automatisch bei Registrierung an.
Username kommt aus `user_metadata` (`options.data.username` beim `signUp`-Aufruf).

## spots

Hauptobjekt seit Phase 4. Vorher `benches`. Bestandsdaten haben `type='bench'`.

| Spalte | Typ | Beschreibung |
|---|---|---|
| `id` | `uuid` | PK, `gen_random_uuid()` |
| `created_by` | `uuid` | FK → `profiles.id`, nullable, ON DELETE SET NULL |
| `lat` | `float8` | Breitengrad |
| `lng` | `float8` | Längengrad |
| `name` | `text` | Nullable — Nominatim-Name oder manuell |
| `photo_url` | `text` | Nullable — öffentliche URL aus Storage |
| `type` | `spot_type` | NOT NULL, Default `'bench'` |
| `created_at` | `timestamptz` | Auto: `now()` |

### Enum `spot_type`

```sql
CREATE TYPE spot_type AS ENUM ('bench', 'viewpoint', 'shelter', 'picnic', 'meadow', 'water');
```

| Key | Emoji | Label (DE) |
|---|---|---|
| bench | 🪑 | Bank |
| viewpoint | 🏔️ | Aussichtspunkt |
| shelter | ⛺ | Schutzhütte |
| picnic | 🧺 | Rastplatz |
| meadow | 🌿 | Liegewiese |
| water | 💧 | Wasserstelle |

UI-Mapping in `lib/spot-types.ts` (`SPOT_TYPE_MAP`).

## spot_stats_votes

Ein Vote pro (spot_id, user_id). Alle Stat-Felder nullable — User kann partial voten. Type-aware Visibility ist NICHT implementiert: jede Spot-Form zeigt alle 6 Stats; User füllen halt was passt.

| Spalte | Typ | Beschreibung |
|---|---|---|
| `id` | `uuid` | PK |
| `spot_id` | `uuid` | FK → `spots.id` ON DELETE CASCADE |
| `user_id` | `uuid` | FK → `profiles.id` ON DELETE CASCADE |
| `comfort` | `smallint` | 1–5, nullable |
| `view_rating` | `smallint` | 1–5, nullable |
| `condition` | `float4` | 0.0–1.0, nullable (FN=0.95, MW=0.70, FT=0.475, WW=0.25, BS=0.075) |
| `shadow` | `text` | `none`/`morning`/`evening`/`allday`, nullable |
| `extras` | `text[]` | `['bin','roof','accessible','table','bicycle']` subset, nullable |
| `rarity` | `smallint` | 1–5, nullable |
| `created_at` | `timestamptz` | Auto: `now()` |

**UNIQUE:** `(spot_id, user_id)` — UPSERT-Pattern für Updates.
**Index:** `spot_stats_votes_spot_id_idx` auf `spot_id` für Aggregations-Performance.

## spot_descriptions (Phase 4)

Community-Tipps. Ein Tipp pro (spot_id, user_id), editierbar.

| Spalte | Typ | Beschreibung |
|---|---|---|
| `id` | `uuid` | PK |
| `spot_id` | `uuid` | FK → `spots.id` ON DELETE CASCADE |
| `user_id` | `uuid` | FK → `profiles.id` ON DELETE CASCADE |
| `text` | `text` | NOT NULL, CHECK `length BETWEEN 1 AND 280` |
| `created_at` | `timestamptz` | Auto: `now()` |
| `updated_at` | `timestamptz` | Auto-aktualisiert via Trigger `set_spot_descriptions_updated_at` |

**UNIQUE:** `(spot_id, user_id)`.
**Index:** `idx_spot_descriptions_spot_id` auf `(spot_id, created_at DESC)` für Feed-Performance.
**Trigger:** `set_updated_at()` setzt `updated_at = now()` bei UPDATE.

## favorites (Phase 5)

Persönliche Favoriten. **Privat** — nur Owner kann eigene Favoriten lesen.

| Spalte | Typ | Beschreibung |
|---|---|---|
| `user_id` | `uuid` | FK → `profiles.id` ON DELETE CASCADE |
| `spot_id` | `uuid` | FK → `spots.id` ON DELETE CASCADE |
| `created_at` | `timestamptz` | Auto: `now()` |

**PRIMARY KEY:** `(user_id, spot_id)` — composite, ein Favorit pro User-Spot-Pair.
**Index:** `idx_favorites_user_id` auf `(user_id, created_at DESC)`.

Phase 6 (Friends) lockert die SELECT-Policy ggf. auf "user OR friend".

## Aggregations-Funktion

```sql
get_spot_aggregated_stats(p_spot_id uuid)
```

Gibt zurück: `comfort_median`, `view_median`, `condition_median`, `rarity_median` (PERCENTILE_CONT 0.5), `shadow_mode` (MODE()), `extras_threshold` (Items mit ≥50% Votes), `vote_count`.

## Supabase Storage

| Bucket | Öffentlich | Max-Size | MIME-Types |
|--------|-----------|----------|------------|
| `bench-photos` | ✅ | 5MB | image/jpeg, image/png, image/webp |

**Bucket-Name beibehalten** trotz Rebrand — Supabase macht Bucket-Rename schmerzhaft (kein atomic move). Der Name ist nur intern; UI/Code-Variablen heißen `spotPhotoUrl` etc.

Pfad-Schema: `{spot_id}/photo` (upsert → überschreibt).

Resize on Upload: `lib/image-utils.ts` skaliert auf max 1600px lange Kante, WebP @0.8 (JPG @0.85 Fallback). Originale werden nie hochgeladen.

## RLS-Policies

### spots

| Operation | Bedingung |
|---|---|
| SELECT | Alle (auch anonym) |
| INSERT | `auth.uid() IS NOT NULL` |
| UPDATE | `auth.uid() = created_by` |
| DELETE | `auth.uid() = created_by` ODER `is_admin = true` |

### spot_stats_votes

| Operation | Bedingung |
|---|---|
| SELECT | Alle |
| INSERT | `auth.uid() = user_id` |
| UPDATE | `auth.uid() = user_id` |
| DELETE | `auth.uid() = user_id` |

### spot_descriptions

| Operation | Bedingung |
|---|---|
| SELECT | Alle |
| INSERT | `auth.uid() = user_id` |
| UPDATE | `auth.uid() = user_id` |
| DELETE | `auth.uid() = user_id` |

### favorites

**Private** — nur eigene Favoriten sichtbar.

| Operation | Bedingung |
|---|---|
| SELECT | `auth.uid() = user_id` (authenticated only) |
| INSERT | `auth.uid() = user_id` |
| DELETE | `auth.uid() = user_id` |

### profiles

| Operation | Bedingung |
|---|---|
| SELECT | Alle |
| INSERT | `id = auth.uid()` |
| UPDATE | `id = auth.uid()` ODER Admin |

### storage.objects (bench-photos)

| Operation | Rolle | Bedingung |
|---|---|---|
| SELECT | public | `bucket_id = 'bench-photos'` |
| INSERT | authenticated | `bucket_id = 'bench-photos'` AND folder exists |
| UPDATE | authenticated | `bucket_id = 'bench-photos'` AND `owner_id = auth.uid()::text` |
| DELETE | authenticated | `bucket_id = 'bench-photos'` AND `owner_id = auth.uid()::text` |

## Migrationen

| Datei | Inhalt |
|---|---|
| `001_add_admin.sql` | `is_admin` in profiles, ersten Admin setzen |
| `002_admin_rls.sql` | Admin-RLS für Profile + Benches |
| `003_phase2_bank_stats.sql` | `photo_url` auf benches, `bench_stats_votes` Tabelle, Aggregations-Funktion |
| `004_bench_photos_storage_policies.sql` | Storage RLS für bench-photos Bucket |
| `005_phase3b_backend_fixes.sql` | DELETE-Policy auf `bench_stats_votes` |
| `006_phase4_rename_to_spots.sql` | `benches` → `spots`, `spot_type` Enum, `bench_stats_votes` → `spot_stats_votes`, RPC umbenannt |
| `007_phase4_descriptions.sql` | `spot_descriptions` Tabelle + RLS + updated_at Trigger |
| `008_phase5_favorites.sql` | `favorites` Tabelle (composite PK, private RLS) |
