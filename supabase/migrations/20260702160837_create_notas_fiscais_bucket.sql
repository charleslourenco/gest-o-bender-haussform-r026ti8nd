-- Create private storage bucket for invoice documents (notas fiscais)
DO $$
BEGIN
  INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
  VALUES (
    'notas-fiscais',
    'notas-fiscais',
    false,
    26214400, -- 25MB limit
    ARRAY['application/pdf', 'image/jpeg', 'image/png', 'image/jpg']
  )
  ON CONFLICT (id) DO UPDATE
  SET public = false,
      file_size_limit = 26214400,
      allowed_mime_types = ARRAY['application/pdf', 'image/jpeg', 'image/png', 'image/jpg'];
END $$;

-- RLS policies for storage.objects on notas-fiscais bucket
DROP POLICY IF EXISTS "notas_fiscais_auth_select" ON storage.objects;
CREATE POLICY "notas_fiscais_auth_select" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'notas-fiscais');

DROP POLICY IF EXISTS "notas_fiscais_auth_insert" ON storage.objects;
CREATE POLICY "notas_fiscais_auth_insert" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'notas-fiscais');

DROP POLICY IF EXISTS "notas_fiscais_auth_update" ON storage.objects;
CREATE POLICY "notas_fiscais_auth_update" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'notas-fiscais')
  WITH CHECK (bucket_id = 'notas-fiscais');

DROP POLICY IF EXISTS "notas_fiscais_auth_delete" ON storage.objects;
CREATE POLICY "notas_fiscais_auth_delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'notas-fiscais');
