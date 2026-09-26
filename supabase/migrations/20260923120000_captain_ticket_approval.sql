-- Captain approval/forwarding: a captain can elevate any ticket's priority
-- and the system records which captain did it and when. Replaces the old
-- behavior of auto-setting priority just because the ticket's author was a
-- captain.

ALTER TABLE public.tickets
  ADD COLUMN IF NOT EXISTS approved_by_captain_id uuid REFERENCES public.students(id),
  ADD COLUMN IF NOT EXISTS approved_by_captain_name text,
  ADD COLUMN IF NOT EXISTS approved_at timestamptz;

CREATE INDEX IF NOT EXISTS tickets_approved_by_captain_idx
  ON public.tickets (approved_by_captain_id);