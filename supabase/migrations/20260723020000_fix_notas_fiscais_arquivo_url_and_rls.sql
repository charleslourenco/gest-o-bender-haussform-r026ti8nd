-- Ensure the notas-fiscais storage bucket exists (private)
INSERT INTO storage.buckets (id, name, public)
VALUES ('notas-fiscais', 'notas-fiscais', false)
ON CONFLICT (id) DO NOTHING;

-- Correct any arquivo_url values that store full URLs, keeping only the
-- path relative to the bucket root (e.g. invoices/file.pdf).
-- Handles both public and signed URLs, strips query strings and leading slashes.
UPDATE public.notas_fiscais
SET arquivo_url = ltrim(
  split_part(
    regexp_replace(
      arquivo_url,
      '^https?://[^/]+/storage/v1/object/(public|sign)/notas-fiscais/',
      ''
    ),
    '?',
    1
  ),
  '/'
)
WHERE arquivo_url IS NOT NULL
  AND arquivo_url LIKE 'http%';

-- Also strip a possible leading bucket-name prefix for non-URL values
UPDATE public.notas_fiscais
SET arquivo_url = regexp_replace(arquivo_url, '^notas-fiscais/', '')
WHERE arquivo_url IS NOT NULL
  AND arquivo_url NOT LIKE 'http%'
  AND arquivo_url LIKE 'notas-fiscais/%';

-- Strip leading slashes for non-URL values
UPDATE public.notas_fiscais
SET arquivo_url = ltrim(arquivo_url, '/')
WHERE arquivo_url IS NOT NULL
  AND arquivo_url NOT LIKE 'http%'
  AND arquivo_url LIKE '/%';

-- RLS policies for the notas-fiscais storage bucket (storage.objects)
DROP POLICY IF EXISTS "notas_fiscais_select_authenticated" ON storage.objects;
CREATE POLICY "notas_fiscais_select_authenticated" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'notas-fiscais');

DROP POLICY IF EXISTS "notas_fiscais_insert_authenticated" ON storage.objects;
CREATE POLICY "notas_fiscais_insert_authenticated" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'notas-fiscais');

DROP POLICY IF EXISTS "notas_fiscais_update_authenticated" ON storage.objects;
CREATE POLICY "notas_fiscais_update_authenticated" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'notas-fiscais')
  WITH CHECK (bucket_id = 'notas-fiscais');

DROP POLICY IF EXISTS "notas_fiscais_delete_authenticated" ON storage.objects;
CREATE POLICY "notas_fiscais_delete_authenticated" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'notas-fiscais');
