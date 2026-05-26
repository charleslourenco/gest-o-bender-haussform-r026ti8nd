DO $DO$
BEGIN
  INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types) 
  VALUES (
    'orcamentos-uploads', 
    'orcamentos-uploads', 
    true, 
    5242880, 
    ARRAY['application/pdf', 'image/jpeg', 'image/png', 'text/csv', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'application/vnd.ms-excel']
  )
  ON CONFLICT (id) DO NOTHING;
END $DO$;

DROP POLICY IF EXISTS "Public Access on orcamentos-uploads" ON storage.objects;
CREATE POLICY "Public Access on orcamentos-uploads" ON storage.objects 
  FOR SELECT USING (bucket_id = 'orcamentos-uploads');

DROP POLICY IF EXISTS "Auth Insert on orcamentos-uploads" ON storage.objects;
CREATE POLICY "Auth Insert on orcamentos-uploads" ON storage.objects 
  FOR INSERT TO authenticated WITH CHECK (bucket_id = 'orcamentos-uploads');

DROP POLICY IF EXISTS "Auth Update on orcamentos-uploads" ON storage.objects;
CREATE POLICY "Auth Update on orcamentos-uploads" ON storage.objects 
  FOR UPDATE TO authenticated USING (bucket_id = 'orcamentos-uploads');

DROP POLICY IF EXISTS "Auth Delete on orcamentos-uploads" ON storage.objects;
CREATE POLICY "Auth Delete on orcamentos-uploads" ON storage.objects 
  FOR DELETE TO authenticated USING (bucket_id = 'orcamentos-uploads');

ALTER TABLE public.orcamentos ADD COLUMN IF NOT EXISTS arquivo_url text;
ALTER TABLE public.listas_materiais ADD COLUMN IF NOT EXISTS arquivo_url text;
