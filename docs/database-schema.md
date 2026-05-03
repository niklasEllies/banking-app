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
| `name` | `text` | Nullable |
| `created_at` | `timestamptz` | Auto: `now()` |

> Phase 2 ergänzt: `rarity_votes`, `view_rating`, `comfort_rating`, `condition`, `shadow`, `extras`, `photo_url`

## RLS-Policies

| Tabelle | Operation | Bedingung |
|---|---|---|
| `benches` | SELECT | Alle (auch anonym) |
| `benches` | INSERT | `auth.uid() IS NOT NULL` |
| `benches` | DELETE | `auth.uid() = created_by` ODER Admin |
| `profiles` | SELECT | Alle |
| `profiles` | INSERT/UPDATE | `id = auth.uid()` ODER Admin |
