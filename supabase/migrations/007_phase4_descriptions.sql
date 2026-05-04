-- Phase 4: Community descriptions feed for spots
-- One description per (spot, user); editable, deletable, public-readable.

CREATE TABLE public.spot_descriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  spot_id uuid NOT NULL REFERENCES public.spots(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  text text NOT NULL CHECK (char_length(text) > 0 AND char_length(text) <= 280),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (spot_id, user_id)
);

CREATE INDEX idx_spot_descriptions_spot_id ON public.spot_descriptions(spot_id, created_at DESC);

ALTER TABLE public.spot_descriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read descriptions"
  ON public.spot_descriptions FOR SELECT USING (true);

CREATE POLICY "Authenticated users can insert own description"
  ON public.spot_descriptions FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own description"
  ON public.spot_descriptions FOR UPDATE TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own description"
  ON public.spot_descriptions FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- updated_at trigger
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER set_spot_descriptions_updated_at
BEFORE UPDATE ON public.spot_descriptions
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
