-- Convert TMS/course fields on students to arrays.
-- Reason: the real enrollment sheet has one row per purchased course,
-- so the same student (same login_number) legitimately repeats, and a
-- single row can list more than one valid TMS transaction ID.
-- Non-destructive: old single-value columns are kept, not dropped.

ALTER TABLE public.students
  ADD COLUMN IF NOT EXISTS tms_transaction_ids text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS course_names text[] NOT NULL DEFAULT '{}';

-- Backfill the new array columns from any existing single-value data.
UPDATE public.students
SET tms_transaction_ids = CASE
      WHEN tms_transaction_id IS NULL OR btrim(tms_transaction_id) = '' THEN '{}'::text[]
      ELSE string_to_array(replace(tms_transaction_id, ' ', ''), ',')
    END
WHERE tms_transaction_ids = '{}';

UPDATE public.students
SET course_names = CASE
      WHEN course_name IS NULL OR btrim(course_name) = '' THEN '{}'::text[]
      ELSE ARRAY[course_name]
    END
WHERE course_names = '{}';

-- The old unique index assumed one TMS id per student; drop it.
-- login_number alone still stays unique (from the previous migration).
DROP INDEX IF EXISTS public.students_login_tms_unique_idx;

-- Fast "does this array contain code X" lookups at login time.
CREATE INDEX IF NOT EXISTS students_tms_transaction_ids_gin_idx
  ON public.students USING GIN (tms_transaction_ids);

COMMENT ON COLUMN public.students.tms_transaction_ids IS
  'All TMS transaction IDs valid for this student login. Any one matches. Never log these values in audit metadata.';
COMMENT ON COLUMN public.students.course_names IS
  'All courses this student is enrolled in (merged from multiple CSV rows). Display-only.';