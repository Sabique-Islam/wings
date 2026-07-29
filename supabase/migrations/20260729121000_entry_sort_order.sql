-- Manual sidebar ordering.
--
-- NULL means "never dragged", which sorts as 0 so newly created pages keep
-- appearing at the top of their group instead of falling to the bottom.
ALTER TABLE public.entries
  ADD COLUMN IF NOT EXISTS sort_order double precision;
