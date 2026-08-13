
CREATE TABLE public.students (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  contact_number text NOT NULL UNIQUE,
  student_code text,
  email text,
  status text NOT NULL DEFAULT 'active',
  is_demo boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.students TO service_role;
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;

CREATE SEQUENCE public.ticket_number_seq START 1;

CREATE TABLE public.tickets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_number text NOT NULL UNIQUE DEFAULT ('HSC28-' || lpad(nextval('public.ticket_number_seq')::text, 6, '0')),
  student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  category text NOT NULL,
  title text NOT NULL,
  description text NOT NULL,
  course text,
  class_exam text,
  status text NOT NULL DEFAULT 'Open',
  official_response text,
  handled_by text,
  resolved_at timestamptz,
  is_demo boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.tickets TO service_role;
ALTER TABLE public.tickets ENABLE ROW LEVEL SECURITY;
CREATE INDEX tickets_student_idx ON public.tickets(student_id);
CREATE INDEX tickets_status_idx ON public.tickets(status);

CREATE TABLE public.ticket_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id uuid NOT NULL REFERENCES public.tickets(id) ON DELETE CASCADE,
  sender_type text NOT NULL,
  sender_name text,
  message text NOT NULL,
  internal boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.ticket_messages TO service_role;
ALTER TABLE public.ticket_messages ENABLE ROW LEVEL SECURITY;
CREATE INDEX ticket_messages_ticket_idx ON public.ticket_messages(ticket_id);

CREATE TABLE public.attachments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id uuid NOT NULL REFERENCES public.tickets(id) ON DELETE CASCADE,
  message_id uuid REFERENCES public.ticket_messages(id) ON DELETE SET NULL,
  file_name text NOT NULL,
  file_type text,
  file_size bigint,
  storage_path text,
  external_url text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.attachments TO service_role;
ALTER TABLE public.attachments ENABLE ROW LEVEL SECURITY;
CREATE INDEX attachments_ticket_idx ON public.attachments(ticket_id);

CREATE TABLE public.notices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  content text NOT NULL,
  priority text NOT NULL DEFAULT 'Normal',
  published boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.notices TO service_role;
ALTER TABLE public.notices ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.staff_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  username text NOT NULL UNIQUE,
  password_hash text NOT NULL,
  role text NOT NULL DEFAULT 'admin',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.staff_users TO service_role;
ALTER TABLE public.staff_users ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.app_settings (
  key text PRIMARY KEY,
  value jsonb NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.app_settings TO service_role;
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.set_updated_at() RETURNS trigger AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER students_updated BEFORE UPDATE ON public.students FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER tickets_updated BEFORE UPDATE ON public.tickets FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER notices_updated BEFORE UPDATE ON public.notices FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER staff_updated BEFORE UPDATE ON public.staff_users FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

INSERT INTO public.app_settings (key, value) VALUES
  ('categories', '["Sound","Video","Exam","Recorded Lecture","Live Class","App / Website","Payment / Subscription","Study Material","Account / Login","Other"]'::jsonb),
  ('upload', '{"max_file_mb": 8, "max_files": 5}'::jsonb),
  ('courses', '["Physics 1st Paper","Physics 2nd Paper","Chemistry 1st Paper","Chemistry 2nd Paper","Higher Math 1st Paper","Higher Math 2nd Paper","Biology","ICT","English","Bangla"]'::jsonb);

INSERT INTO public.students (name, contact_number, student_code, email, is_demo) VALUES
  ('Rahim Uddin', '01711000001', '10001', 'rahim@example.com', true),
  ('Karim Hossain', '01711000002', '10002', 'karim@example.com', true),
  ('Nabila Akter', '01711000003', '10003', 'nabila@example.com', true),
  ('Sadia Islam', '01711000004', '10004', 'sadia@example.com', true);

INSERT INTO public.tickets (student_id, category, title, description, course, class_exam, status, official_response, handled_by, resolved_at, is_demo)
SELECT s.id, v.category, v.title, v.description, v.course, v.class_exam, v.status, v.official_response, v.handled_by, v.resolved_at, true
FROM (VALUES
  ('01711000001','Sound','Physics recorded lecture has no audio','The recorded Physics lecture from last Friday plays video but there is no sound at all.','Physics 1st Paper','Lecture 12','Resolved','We have checked the recording and replaced the corrupted audio file. Please refresh the lecture page.','Support Team', now() - interval '1 day'),
  ('01711000002','Video','Live class video keeps buffering','During the Higher Math live class the video freezes every few seconds even on good internet.','Higher Math 1st Paper','Live Class 08','In Review',NULL,'Support Team', NULL),
  ('01711000003','Exam','Exam submitted but marks not showing','I completed the Chemistry weekly exam but my result is still not visible.','Chemistry 1st Paper','Weekly Exam 04','Waiting for Information','Please send a screenshot of your exam submission page.','Support Team', NULL),
  ('01711000004','Recorded Lecture','Recorded lecture missing from my course','Biology lecture 5 is not appearing in the recorded lecture list.','Biology','Lecture 05','Open',NULL,NULL, NULL),
  ('01711000001','Other','Cannot download the study PDF','The PDF download button does nothing when I tap it on mobile.','ICT',NULL,'Closed','The PDF has been re-uploaded and downloads are working now.','Support Team', now() - interval '3 day')
) AS v(contact, category, title, description, course, class_exam, status, official_response, handled_by, resolved_at)
JOIN public.students s ON s.contact_number = v.contact;

INSERT INTO public.ticket_messages (ticket_id, sender_type, sender_name, message, created_at)
SELECT t.id, 'student', 'Student', t.description, t.created_at FROM public.tickets t;

INSERT INTO public.ticket_messages (ticket_id, sender_type, sender_name, message)
SELECT t.id, 'staff', 'Support Team', t.official_response FROM public.tickets t WHERE t.official_response IS NOT NULL;

INSERT INTO public.notices (title, content, priority, published) VALUES
  ('Demo: Scheduled maintenance tonight', 'The platform will be under maintenance from 2:00 AM to 3:00 AM. Live classes are not affected.', 'High', true),
  ('Demo: Recorded lecture audio issue fixed', 'The audio problem in some Physics recorded lectures has been fixed. Please refresh your lecture page.', 'Normal', true),
  ('Demo: HSC 28 weekly exam routine published', 'The new weekly exam routine for HSC 28 is now available in the Study Material section.', 'Normal', true);
