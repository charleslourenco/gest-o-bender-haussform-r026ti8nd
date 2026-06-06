DO $$
BEGIN
  INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
  VALUES (
    'bender_templates', 
    'bender_templates', 
    true, 
    5242880, 
    '{text/html,text/plain,text/markdown,application/pdf,image/png,image/jpeg}'
  )
  ON CONFLICT (id) DO UPDATE SET public = true;
END $$;

DROP POLICY IF EXISTS "bender_templates_public_select" ON storage.objects;
CREATE POLICY "bender_templates_public_select" ON storage.objects 
  FOR SELECT USING (bucket_id = 'bender_templates');

DROP POLICY IF EXISTS "bender_templates_auth_insert" ON storage.objects;
CREATE POLICY "bender_templates_auth_insert" ON storage.objects 
  FOR INSERT TO authenticated WITH CHECK (bucket_id = 'bender_templates');

DROP POLICY IF EXISTS "bender_templates_auth_update" ON storage.objects;
CREATE POLICY "bender_templates_auth_update" ON storage.objects 
  FOR UPDATE TO authenticated USING (bucket_id = 'bender_templates');

DROP POLICY IF EXISTS "bender_templates_auth_delete" ON storage.objects;
CREATE POLICY "bender_templates_auth_delete" ON storage.objects 
  FOR DELETE TO authenticated USING (bucket_id = 'bender_templates');
