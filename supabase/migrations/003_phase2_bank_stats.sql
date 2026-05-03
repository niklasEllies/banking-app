-- Add photo_url to benches
ALTER TABLE public.benches ADD COLUMN IF NOT EXISTS photo_url text;

-- Allow bench owner to update their bench (needed for photo_url)
CREATE POLICY "Users can update own bench"
ON public.benches
FOR UPDATE TO authenticated
USING (auth.uid() = created_by)
WITH CHECK (auth.uid() = created_by);

-- Community stats votes table
CREATE TABLE public.bench_stats_votes (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bench_id    uuid NOT NULL REFERENCES public.benches(id) ON DELETE CASCADE,
  user_id     uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  comfort     smallint CHECK (comfort BETWEEN 1 AND 5),
  view_rating smallint CHECK (view_rating BETWEEN 1 AND 5),
  condition   float4   CHECK (condition BETWEEN 0 AND 1),
  shadow      text     CHECK (shadow IN ('none','morning','evening','allday')),
  extras      text[]   CHECK (extras <@ ARRAY['bin','roof','accessible','table','bicycle']::text[]),
  rarity      smallint CHECK (rarity BETWEEN 1 AND 5),
  created_at  timestamptz DEFAULT now(),
  UNIQUE(bench_id, user_id)
);

CREATE INDEX bench_stats_votes_bench_id_idx ON public.bench_stats_votes(bench_id);

ALTER TABLE public.bench_stats_votes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read stats votes"
  ON public.bench_stats_votes FOR SELECT USING (true);

CREATE POLICY "Users can insert own stats vote"
  ON public.bench_stats_votes FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own stats vote"
  ON public.bench_stats_votes FOR UPDATE TO authenticated
  USING (auth.uid() = user_id);

-- Aggregation function
CREATE OR REPLACE FUNCTION get_bench_aggregated_stats(p_bench_id uuid)
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
        SELECT COUNT(*) FROM bench_stats_votes v2
        WHERE v2.bench_id = p_bench_id AND item = ANY(v2.extras)
      )::float / NULLIF(
        (SELECT COUNT(*) FROM bench_stats_votes v3 WHERE v3.bench_id = p_bench_id), 0
      ) >= 0.5
    )                                                         AS extras_threshold,
    COUNT(*)                                                  AS vote_count
  FROM bench_stats_votes
  WHERE bench_id = p_bench_id;
$$;
