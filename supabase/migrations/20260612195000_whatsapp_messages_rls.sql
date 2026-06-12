-- Enable RLS and create policies for whatsapp_messages
ALTER TABLE public.whatsapp_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "authenticated_select_whatsapp_messages" ON public.whatsapp_messages;
CREATE POLICY "authenticated_select_whatsapp_messages" ON public.whatsapp_messages
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "authenticated_insert_whatsapp_messages" ON public.whatsapp_messages;
CREATE POLICY "authenticated_insert_whatsapp_messages" ON public.whatsapp_messages
  FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "authenticated_update_whatsapp_messages" ON public.whatsapp_messages;
CREATE POLICY "authenticated_update_whatsapp_messages" ON public.whatsapp_messages
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "authenticated_delete_whatsapp_messages" ON public.whatsapp_messages;
CREATE POLICY "authenticated_delete_whatsapp_messages" ON public.whatsapp_messages
  FOR DELETE TO authenticated USING (true);
