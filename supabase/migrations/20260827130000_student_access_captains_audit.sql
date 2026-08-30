-- Student login, captain role, ticket priority, and audit log support.
-- This migration is non-destructive: it keeps existing contact_number data.

-- 1. Student account and TMS fields

ALTER TABLE public.students
  ADD COLUMN IF NOT EXISTS login_number text,
  ADD COLUMN IF NOT EXISTS tms_transaction_id text,
  ADD COLUMN IF NOT EXISTS course_name text,
  ADD COLUMN IF NOT EXISTS account_role text NOT NULL DEFAULT 'student',
  ADD COLUMN IF NOT EXISTS deactivated_at timestamptz,
  ADD COLUMN IF NOT EXISTS deactivation_reason text,
  ADD COLUMN IF NOT EXISTS last_login_at timestamptz;

-- Existing contact numbers become the initial login numbers.
-- TMS transaction IDs must be added later through the staff CSV import.
UPDATE public.students
SET login_number = contact_number
WHERE login_number IS NULL OR btrim(login_number) = '';

ALTER TABLE public.students
  ALTER COLUMN login_number SET NOT NULL;

ALTER TABLE public.students
  DROP CONSTRAINT IF EXISTS students_account_role_check;

ALTER TABLE public.students
  ADD CONSTRAINT students_account_role_check
  CHECK (account_role IN ('student', 'captain'));

ALTER TABLE public.students
  DROP CONSTRAINT IF EXISTS students_status_check;

ALTER TABLE public.students
  ADD CONSTRAINT students_status_check
  CHECK (status IN ('active', 'inactive'));

-- A student may only use one login number.
CREATE UNIQUE INDEX IF NOT EXISTS students_login_number_unique_idx
  ON public.students (login_number);

-- TMS ID is temporarily nullable, so existing students are not broken.
-- The login code in the next step will deny login if it is missing.
-- Once every real student has a TMS ID, make this column NOT NULL.
CREATE UNIQUE INDEX IF NOT EXISTS students_login_tms_unique_idx
  ON public.students (login_number, tms_transaction_id)
  WHERE tms_transaction_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS students_tms_transaction_id_idx
  ON public.students (tms_transaction_id)
  WHERE tms_transaction_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS students_account_role_status_idx
  ON public.students (account_role, status);

-- 2. Ticket priority and captain source

ALTER TABLE public.tickets
  ADD COLUMN IF NOT EXISTS priority text NOT NULL DEFAULT 'normal',
  ADD COLUMN IF NOT EXISTS source_role text NOT NULL DEFAULT 'student',
  ADD COLUMN IF NOT EXISTS resolved_email_sent_at timestamptz;

ALTER TABLE public.tickets
  DROP CONSTRAINT IF EXISTS tickets_priority_check;

ALTER TABLE public.tickets
  ADD CONSTRAINT tickets_priority_check
  CHECK (priority IN ('normal', 'high', 'urgent'));

ALTER TABLE public.tickets
  DROP CONSTRAINT IF EXISTS tickets_source_role_check;

ALTER TABLE public.tickets
  ADD CONSTRAINT tickets_source_role_check
  CHECK (source_role IN ('student', 'captain'));

-- Helps staff load urgent/high tickets first.
CREATE INDEX IF NOT EXISTS tickets_priority_status_created_idx
  ON public.tickets (priority, status, created_at DESC);

CREATE INDEX IF NOT EXISTS tickets_source_role_created_idx
  ON public.tickets (source_role, created_at DESC);

-- 3. Staff-visible audit log

CREATE TABLE IF NOT EXISTS public.audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_type text NOT NULL,
  actor_id uuid,
  actor_name text,
  event_type text NOT NULL,
  target_type text,
  target_id uuid,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT audit_logs_actor_type_check
    CHECK (actor_type IN ('student', 'staff', 'system'))
);

GRANT ALL ON public.audit_logs TO service_role;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS audit_logs_created_at_idx
  ON public.audit_logs (created_at DESC);

CREATE INDEX IF NOT EXISTS audit_logs_actor_idx
  ON public.audit_logs (actor_type, actor_id, created_at DESC);

CREATE INDEX IF NOT EXISTS audit_logs_target_idx
  ON public.audit_logs (target_type, target_id, created_at DESC);

COMMENT ON COLUMN public.students.tms_transaction_id IS
  'Required for future student login. Never include this value in audit log metadata.';

COMMENT ON COLUMN public.students.account_role IS
  'student or captain. Captains remain students and cannot access staff data.';

COMMENT ON COLUMN public.tickets.priority IS
  'normal, high, or urgent. Captain-created tickets will be high.';

COMMENT ON TABLE public.audit_logs IS
  'Server-created activity log. Do not store passwords, TMS IDs, emails, or ticket message content in metadata.';