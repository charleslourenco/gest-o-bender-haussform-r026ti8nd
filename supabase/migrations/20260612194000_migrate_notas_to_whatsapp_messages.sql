-- Create the whatsapp_messages table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.whatsapp_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lead_id UUID REFERENCES public.leads(id) ON DELETE CASCADE,
    phone TEXT NOT NULL,
    sender_type TEXT NOT NULL,
    sender_name TEXT,
    content TEXT NOT NULL,
    external_id TEXT UNIQUE,
    direction TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Ensure RLS is enabled
ALTER TABLE public.whatsapp_messages ENABLE ROW LEVEL SECURITY;

-- Idempotent RLS Policies
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

-- Migrate old notes to the messages table
DO $$
BEGIN
    INSERT INTO public.whatsapp_messages (lead_id, phone, sender_type, sender_name, content, direction)
    SELECT 
        id AS lead_id,
        telefone AS phone,
        'system' AS sender_type,
        'Sistema (Histórico Migrado)' AS sender_name,
        notas AS content,
        'inbound' AS direction
    FROM public.leads l
    WHERE l.notas IS NOT NULL AND trim(l.notas) != ''
      AND NOT EXISTS (
          SELECT 1 FROM public.whatsapp_messages wm 
          WHERE wm.lead_id = l.id AND wm.sender_name = 'Sistema (Histórico Migrado)'
      );
END $$;
