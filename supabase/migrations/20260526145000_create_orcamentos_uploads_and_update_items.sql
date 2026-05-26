DO $$
BEGIN
  INSERT INTO storage.buckets (id, name, public) 
  VALUES ('orcamentos-uploads', 'orcamentos-uploads', false) 
  ON CONFLICT (id) DO NOTHING;
END $$;

DROP POLICY IF EXISTS "orcamentos_uploads_select" ON storage.objects;
CREATE POLICY "orcamentos_uploads_select" ON storage.objects 
  FOR SELECT TO authenticated USING (bucket_id = 'orcamentos-uploads');

DROP POLICY IF EXISTS "orcamentos_uploads_insert" ON storage.objects;
CREATE POLICY "orcamentos_uploads_insert" ON storage.objects 
  FOR INSERT TO authenticated WITH CHECK (bucket_id = 'orcamentos-uploads');

DROP POLICY IF EXISTS "orcamentos_uploads_update" ON storage.objects;
CREATE POLICY "orcamentos_uploads_update" ON storage.objects 
  FOR UPDATE TO authenticated USING (bucket_id = 'orcamentos-uploads');

DROP POLICY IF EXISTS "orcamentos_uploads_delete" ON storage.objects;
CREATE POLICY "orcamentos_uploads_delete" ON storage.objects 
  FOR DELETE TO authenticated USING (bucket_id = 'orcamentos-uploads');

ALTER TABLE public.itens_orcamento ADD COLUMN IF NOT EXISTS nome_item TEXT;
