DO $$
BEGIN
  INSERT INTO storage.buckets (id, name, public)
  VALUES ('ativos_dobrador', 'ativos_dobrador', true)
  ON CONFLICT (id) DO UPDATE SET public = true;
END $$;

DELETE FROM storage.objects WHERE bucket_id = 'ativos_dobrador';

DROP POLICY IF EXISTS "Public Access ativos_dobrador" ON storage.objects;
CREATE POLICY "Public Access ativos_dobrador" ON storage.objects
  FOR SELECT USING (bucket_id = 'ativos_dobrador');

DROP POLICY IF EXISTS "Auth Insert ativos_dobrador" ON storage.objects;
CREATE POLICY "Auth Insert ativos_dobrador" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (bucket_id = 'ativos_dobrador');

DROP POLICY IF EXISTS "Auth Update ativos_dobrador" ON storage.objects;
CREATE POLICY "Auth Update ativos_dobrador" ON storage.objects
  FOR UPDATE TO authenticated USING (bucket_id = 'ativos_dobrador');

DROP POLICY IF EXISTS "Auth Delete ativos_dobrador" ON storage.objects;
CREATE POLICY "Auth Delete ativos_dobrador" ON storage.objects
  FOR DELETE TO authenticated USING (bucket_id = 'ativos_dobrador');
