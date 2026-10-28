-- Run manually in the Supabase SQL editor after reviewing the server's use of
-- the service-role key. Service-role access bypasses row-level security.

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contact_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS deny_anon_users ON public.users;
CREATE POLICY deny_anon_users ON public.users
  FOR ALL TO anon USING (false) WITH CHECK (false);
DROP POLICY IF EXISTS deny_authenticated_users ON public.users;
CREATE POLICY deny_authenticated_users ON public.users
  FOR ALL TO authenticated USING (false) WITH CHECK (false);

DROP POLICY IF EXISTS deny_anon_contact_requests ON public.contact_requests;
CREATE POLICY deny_anon_contact_requests ON public.contact_requests
  FOR ALL TO anon USING (false) WITH CHECK (false);
DROP POLICY IF EXISTS deny_authenticated_contact_requests ON public.contact_requests;
CREATE POLICY deny_authenticated_contact_requests ON public.contact_requests
  FOR ALL TO authenticated USING (false) WITH CHECK (false);

DROP POLICY IF EXISTS deny_anon_messages ON public.messages;
CREATE POLICY deny_anon_messages ON public.messages
  FOR ALL TO anon USING (false) WITH CHECK (false);
DROP POLICY IF EXISTS deny_authenticated_messages ON public.messages;
CREATE POLICY deny_authenticated_messages ON public.messages
  FOR ALL TO authenticated USING (false) WITH CHECK (false);

DROP POLICY IF EXISTS deny_anon_alerts ON public.alerts;
CREATE POLICY deny_anon_alerts ON public.alerts
  FOR ALL TO anon USING (false) WITH CHECK (false);
DROP POLICY IF EXISTS deny_authenticated_alerts ON public.alerts;
CREATE POLICY deny_authenticated_alerts ON public.alerts
  FOR ALL TO authenticated USING (false) WITH CHECK (false);

DROP POLICY IF EXISTS deny_anon_logs ON public.logs;
CREATE POLICY deny_anon_logs ON public.logs
  FOR ALL TO anon USING (false) WITH CHECK (false);
DROP POLICY IF EXISTS deny_authenticated_logs ON public.logs;
CREATE POLICY deny_authenticated_logs ON public.logs
  FOR ALL TO authenticated USING (false) WITH CHECK (false);
