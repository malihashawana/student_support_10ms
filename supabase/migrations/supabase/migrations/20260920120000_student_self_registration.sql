-- Self-service student registration: adds a password column so a student
-- can register once (login number + TMS transaction id + name, unverified)
-- and log in afterwards with just login number + password.

ALTER TABLE public.students
  ADD COLUMN IF NOT EXISTS password_hash text;

-- Enforces one account per login number. If this statement fails with a
-- duplicate-key error, two existing rows already share the same
-- login_number -- find them first with:
--   SELECT login_number, count(*) FROM public.students
--   GROUP BY login_number HAVING count(*) > 1;
-- and fix/merge those rows, then re-run this migration.
CREATE UNIQUE INDEX IF NOT EXISTS students_login_number_unique_idx
  ON public.students (login_number);