
-- Add academic identity to existing student accounts.
-- Preserve all existing student records and course arrays.

ALTER TABLE public.students
  ADD COLUMN IF NOT EXISTS academic_batch text,
  ADD COLUMN IF NOT EXISTS academic_group text;

-- Only allow the two supported batches.
ALTER TABLE public.students
  ADD CONSTRAINT students_academic_batch_check
  CHECK (
    academic_batch IS NULL
    OR academic_batch IN ('hsc_27', 'hsc_28')
  );

-- Only allow the three supported academic groups.
ALTER TABLE public.students
  ADD CONSTRAINT students_academic_group_check
  CHECK (
    academic_group IS NULL
    OR academic_group IN (
      'science',
      'business_studies',
      'humanities'
    )
  );

-- Improve batch/group-based lookups.
CREATE INDEX IF NOT EXISTS students_academic_identity_idx
  ON public.students (academic_batch, academic_group);

COMMENT ON COLUMN public.students.academic_batch IS
  'Student academic batch: hsc_27 or hsc_28.';

COMMENT ON COLUMN public.students.academic_group IS
  'Student academic group: science, business_studies, or humanities.';
