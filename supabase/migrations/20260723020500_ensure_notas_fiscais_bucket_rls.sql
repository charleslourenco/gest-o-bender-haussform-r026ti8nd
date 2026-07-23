-- Double-check RLS policies for the notas-fiscais storage bucket.
-- Ensures authenticated users can SELECT (generate signed URLs), INSERT,
-- UPDATE and DELETE files in the private notas-fiscais bucket.
-- Idempotent: drops any existing policy variants before recreating a clean set.

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'notas-fiscais',
  'notas-fiscais',
  false,
  26214400,
  ARRAY['application/pdf', 'image/jpeg', 'image/png', 'image/jpg']
)
ON CONFLICT (id) DO UPDATE
SET public = false,
    file_size_limit = 26214400,
    allowed_mime_types = ARRAY['application/pdf', 'image/jpeg', 'image/png', 'image/jpg'];

-- Remove any previously created policy variants to avoid duplicates/conflicts
DROP POLICY IF EXISTS "notas_fiscais_select_authenticated" ON storage.objects;
DROP POLICY IF EXISTS "notas_fiscais_insert_authenticated" ON storage.objects;
DROP POLICY IF EXISTS "notas_fiscais_update_authenticated" ON storage.objects;
DROP POLICY IF EXISTS "notas_fiscais_delete_authenticated" ON storage.objects;
DROP POLICY IF EXISTS "notas_fiscais_auth_select" ON storage.objects;
DROP POLICY IF EXISTS "notas_fiscais_auth_insert" ON storage.objects;
DROP POLICY IF EXISTS "notas_fiscais_auth_update" ON storage.objects;
DROP POLICY IF EXISTS "notas_fiscais_auth_delete" ON storage.objects;

-- Recreate a single, consistent set of policies for authenticated users
CREATE POLICY "notas_fiscais_select_authenticated" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'notas-fiscais');

CREATE POLICY "notas_fiscais_insert_authenticated" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'notas-fiscais');

CREATE POLICY "notas_fiscais_update_authenticated" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'notas-fiscais')
  WITH CHECK (bucket_id = 'notas-fiscais');

CREATE POLICY "notas_fiscais_delete_authenticated" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'notas-fiscais');
