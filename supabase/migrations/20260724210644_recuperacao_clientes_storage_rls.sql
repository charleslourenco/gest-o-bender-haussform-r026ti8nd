-- Allow authenticated users to delete objects in bender_clientes bucket
-- (needed to remove old files after copying them during client recovery)
DROP POLICY IF EXISTS "bender_clientes_auth_delete" ON storage.objects;
CREATE POLICY "bender_clientes_auth_delete" ON storage.objects
  FOR DELETE TO authenticated USING (bucket_id = 'bender_clientes');

-- Ensure bender_clientes bucket exists
INSERT INTO storage.buckets (id, name, public)
VALUES ('bender_clientes', 'bender_clientes', true)
ON CONFLICT (id) DO NOTHING;

-- Ensure timeline_eventos insert is allowed for authenticated users (idempotent)
DROP POLICY IF EXISTS "timeline_eventos_insert_auth" ON public.timeline_eventos;
CREATE POLICY "timeline_eventos_insert_auth" ON public.timeline_eventos
  FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "timeline_eventos_select_auth" ON public.timeline_eventos;
CREATE POLICY "timeline_eventos_select_auth" ON public.timeline_eventos
  FOR SELECT TO authenticated USING (true);

-- Ensure documentos_cliente insert is allowed for authenticated users (idempotent)
DROP POLICY IF EXISTS "documentos_cliente_insert_auth" ON public.documentos_cliente;
CREATE POLICY "documentos_cliente_insert_auth" ON public.documentos_cliente
  FOR INSERT TO authenticated WITH CHECK (true);
