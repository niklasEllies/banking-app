-- Phase 6: Spot visibility (public / friends / private) + RLS cascade
-- New helper can_see_spot() reused by descriptions, votes, favorites RLS.

CREATE TYPE public.spot_visibility AS ENUM ('public', 'friends', 'private');
ALTER TABLE public.spots ADD COLUMN visibility public.spot_visibility NOT NULL DEFAULT 'public';

-- Helper: can the current auth.uid() see this spot?
CREATE OR REPLACE FUNCTION public.can_see_spot(p_spot_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.spots s
    WHERE s.id = p_spot_id
      AND (
        s.visibility = 'public'
        OR auth.uid() = s.created_by
        OR (s.visibility = 'friends'
            AND auth.uid() IS NOT NULL
            AND public.are_friends(auth.uid(), s.created_by))
      )
  );
$$;

-- spots SELECT — replace public-read with visibility-aware
DROP POLICY "bänke sind öffentlich lesbar" ON public.spots;

CREATE POLICY "Spots visible per visibility level"
  ON public.spots FOR SELECT
  USING (
    visibility = 'public'
    OR auth.uid() = created_by
    OR (visibility = 'friends'
        AND auth.uid() IS NOT NULL
        AND public.are_friends(auth.uid(), created_by))
  );

-- spot_descriptions: SELECT + INSERT cascade through can_see_spot
DROP POLICY "Anyone can read descriptions" ON public.spot_descriptions;
DROP POLICY "Authenticated users can insert own description" ON public.spot_descriptions;

CREATE POLICY "Descriptions visible if spot visible"
  ON public.spot_descriptions FOR SELECT
  USING (public.can_see_spot(spot_id));

CREATE POLICY "Users can describe a visible spot"
  ON public.spot_descriptions FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id AND public.can_see_spot(spot_id));

-- spot_stats_votes: same cascade
DROP POLICY "Anyone can read stats votes" ON public.spot_stats_votes;
DROP POLICY "Users can insert own stats vote" ON public.spot_stats_votes;

CREATE POLICY "Stats votes visible if spot visible"
  ON public.spot_stats_votes FOR SELECT
  USING (public.can_see_spot(spot_id));

CREATE POLICY "Users can vote on visible spots"
  ON public.spot_stats_votes FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id AND public.can_see_spot(spot_id));

-- favorites INSERT: tighten with visibility
DROP POLICY "Users can insert own favorite" ON public.favorites;

CREATE POLICY "Users can favorite a visible spot"
  ON public.favorites FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id AND public.can_see_spot(spot_id));
