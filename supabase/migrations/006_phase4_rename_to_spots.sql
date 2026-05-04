-- Phase 4: Generalize benches → spots with type enum

-- 1. Spot type enum (6 hiking pause-spot categories)
CREATE TYPE spot_type AS ENUM ('bench', 'viewpoint', 'shelter', 'picnic', 'meadow', 'water');

-- 2. Rename main table; existing FKs/indexes/RLS policies are preserved.
ALTER TABLE public.benches RENAME TO spots;

-- 3. Add type column with backwards-compatible default ('bench' for existing rows).
ALTER TABLE public.spots ADD COLUMN type spot_type NOT NULL DEFAULT 'bench';

-- 4. Rename votes table + FK column.
ALTER TABLE public.bench_stats_votes RENAME TO spot_stats_votes;
ALTER TABLE public.spot_stats_votes RENAME COLUMN bench_id TO spot_id;

-- Rename matching index for consistency.
ALTER INDEX IF EXISTS bench_stats_votes_bench_id_idx RENAME TO spot_stats_votes_spot_id_idx;

-- 5. Drop old aggregation function and recreate with renamed args/refs.
DROP FUNCTION IF EXISTS public.get_bench_aggregated_stats(uuid);

CREATE OR REPLACE FUNCTION public.get_spot_aggregated_stats(p_spot_id uuid)
RETURNS TABLE (
  comfort_median   float,
  view_median      float,
  condition_median float,
  rarity_median    float,
  shadow_mode      text,
  extras_threshold text[],
  vote_count       bigint
) LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT
    PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY comfort)     AS comfort_median,
    PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY view_rating) AS view_median,
    PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY condition)   AS condition_median,
    PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY rarity)      AS rarity_median,
    MODE()               WITHIN GROUP (ORDER BY shadow)      AS shadow_mode,
    ARRAY(
      SELECT item FROM unnest(ARRAY['bin','roof','accessible','table','bicycle']::text[]) AS item
      WHERE (
        SELECT COUNT(*) FROM spot_stats_votes v2
        WHERE v2.spot_id = p_spot_id AND item = ANY(v2.extras)
      )::float / NULLIF(
        (SELECT COUNT(*) FROM spot_stats_votes v3 WHERE v3.spot_id = p_spot_id), 0
      ) >= 0.5
    )                                                         AS extras_threshold,
    COUNT(*)                                                  AS vote_count
  FROM spot_stats_votes
  WHERE spot_id = p_spot_id;
$$;
