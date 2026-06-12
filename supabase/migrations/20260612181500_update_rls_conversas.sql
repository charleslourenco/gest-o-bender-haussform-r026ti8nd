-- Make sure authenticated users can access the tables needed for the Conversas view
DROP POLICY IF EXISTS "authenticated_select_leads" ON public.leads;
CREATE POLICY "authenticated_select_leads" ON public.leads
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "authenticated_update_leads" ON public.leads;
CREATE POLICY "authenticated_update_leads" ON public.leads
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "authenticated_select_whatsapp_sessions" ON public.whatsapp_sessions;
CREATE POLICY "authenticated_select_whatsapp_sessions" ON public.whatsapp_sessions
  FOR SELECT TO authenticated USING (true);

DO $$
BEGIN
    DROP POLICY IF EXISTS "authenticated_select_whatsapp_messages" ON public.whatsapp_messages;
    CREATE POLICY "authenticated_select_whatsapp_messages" ON public.whatsapp_messages
      FOR SELECT TO authenticated USING (true);
EXCEPTION
    WHEN undefined_table THEN
        NULL;
END $$;
