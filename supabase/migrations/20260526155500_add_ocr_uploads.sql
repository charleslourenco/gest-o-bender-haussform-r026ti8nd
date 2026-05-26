ALTER TABLE public.orcamentos ADD COLUMN IF NOT EXISTS arquivo_url TEXT;
ALTER TABLE public.listas_materiais ADD COLUMN IF NOT EXISTS arquivo_url TEXT;

INSERT INTO storage.buckets (id, name, public) VALUES ('orcamentos-uploads', 'orcamentos-uploads', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Authenticated users can upload to orcamentos-uploads" ON storage.objects;
CREATE POLICY "Authenticated users can upload to orcamentos-uploads" ON storage.objects 
FOR INSERT TO authenticated WITH CHECK (bucket_id = 'orcamentos-uploads');

DROP POLICY IF EXISTS "Authenticated users can read from orcamentos-uploads" ON storage.objects;
CREATE POLICY "Authenticated users can read from orcamentos-uploads" ON storage.objects 
FOR SELECT TO authenticated USING (bucket_id = 'orcamentos-uploads');

DROP POLICY IF EXISTS "Authenticated users can update orcamentos-uploads" ON storage.objects;
CREATE POLICY "Authenticated users can update orcamentos-uploads" ON storage.objects 
FOR UPDATE TO authenticated USING (bucket_id = 'orcamentos-uploads');

DROP POLICY IF EXISTS "Authenticated users can delete orcamentos-uploads" ON storage.objects;
CREATE POLICY "Authenticated users can delete orcamentos-uploads" ON storage.objects 
FOR DELETE TO authenticated USING (bucket_id = 'orcamentos-uploads');
