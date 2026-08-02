ALTER TABLE public.user_preferences
  ADD COLUMN IF NOT EXISTS dark_surface_shift smallint NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS light_surface_shift smallint NOT NULL DEFAULT 0;
