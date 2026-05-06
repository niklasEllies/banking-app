-- Phase 8.2 — User Preferences Persistence
-- Adds marker_emoji and theme_preference to profiles so they sync across devices.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS marker_emoji TEXT
    CHECK (marker_emoji IS NULL OR length(marker_emoji) BETWEEN 1 AND 16),
  ADD COLUMN IF NOT EXISTS theme_preference TEXT
    CHECK (theme_preference IN ('light', 'dark', 'system'))
    DEFAULT 'system';

-- Existing rows get null marker_emoji (means: use default 🧍‍♂️) and 'system' theme
-- (means: follow OS prefers-color-scheme).

COMMENT ON COLUMN public.profiles.marker_emoji IS
  'User-selected emoji for their position marker on the map. NULL means use default.';

COMMENT ON COLUMN public.profiles.theme_preference IS
  'User-selected theme: light | dark | system. System means follow prefers-color-scheme.';
