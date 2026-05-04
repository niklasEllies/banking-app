# Datenbankschema

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

## benches

| Spalte | Typ | Beschreibung |
|---|---|---|
| `id` | `uuid` | PK, `gen_random_uuid()` |
| `created_by` | `uuid` | FK → `profiles.id`, nullable, ON DELETE SET NULL |
| `lat` | `float8` | Breitengrad |
| `lng` | `float8` | Längengrad |
| `name` | `text` | Nullable — Nominatim-Name oder manuell |
| `photo_url` | `text` | Nullable — öffentliche URL aus Storage |
| `created_at` | `timestamptz` | Auto: `now()` |

## bench_stats_votes

Ein Vote pro (bench_id, user_id). Alle Stat-Felder nullable — User kann partial voten.

| Spalte | Typ | Beschreibung |
|---|---|---|
| `id` | `uuid` | PK |
| `bench_id` | `uuid` | FK → `benches.id` ON DELETE CASCADE |
| `user_id` | `uuid` | FK → `profiles.id` ON DELETE CASCADE |
| `comfort` | `smallint` | 1–5, nullable |
| `view_rating` | `smallint` | 1–5, nullable |
| `condition` | `float4` | 0.0–1.0, nullable (FN=0.95, MW=0.70, FT=0.475, WW=0.25, BS=0.075) |
| `shadow` | `text` | `none`/`morning`/`evening`/`allday`, nullable |
| `extras` | `text[]` | `['bin','roof','accessible','table','bicycle']` subset, nullable |
| `rarity` | `smallint` | 1–5, nullable |
| `created_at` | `timestamptz` | Auto: `now()` |

**UNIQUE:** `(bench_id, user_id)` — UPSERT-Pattern für Updates.
**Index:** `bench_stats_votes_bench_id_idx` auf `bench_id` für Aggregations-Performance.

## Aggregations-Funktion

```sql
get_bench_aggregated_stats(p_bench_id uuid)
```

Gibt zurück: `comfort_median`, `view_median`, `condition_median`, `rarity_median` (PERCENTILE_CONT 0.5), `shadow_mode` (MODE()), `extras_threshold` (Items mit ≥50% Votes), `vote_count`.

## Supabase Storage

| Bucket | Öffentlich | Max-Size | MIME-Types |
|--------|-----------|----------|------------|
| `bench-photos` | ✅ | 5MB | image/jpeg, image/png, image/webp |

Pfad-Schema: `{bench_id}/photo` (upsert → überschreibt).

## RLS-Policies

### benches

| Operation | Bedingung |
|---|---|
| SELECT | Alle (auch anonym) |
| INSERT | `auth.uid() IS NOT NULL` |
| UPDATE | `auth.uid() = created_by` |
| DELETE | `auth.uid() = created_by` ODER `is_admin = true` |

### bench_stats_votes

| Operation | Bedingung |
|---|---|
| SELECT | Alle |
| INSERT | `auth.uid() = user_id` |
| UPDATE | `auth.uid() = user_id` |

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
