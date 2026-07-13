ALTER TABLE public.entries ADD COLUMN parent_id uuid REFERENCES public.entries(id) ON DELETE CASCADE DEFAULT NULL;
ALTER TABLE public.entries ADD COLUMN title text NOT NULL DEFAULT '';
CREATE INDEX idx_entries_parent_id ON public.entries(parent_id);