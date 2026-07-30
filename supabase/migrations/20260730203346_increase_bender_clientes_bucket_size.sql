-- Increase the file_size_limit of the bender_clientes bucket from 250MB to 999MB (1,047,797,760 bytes)
-- This migration is idempotent and safe to run multiple times.

DO $$
BEGIN
  -- Only update if the bucket exists (avoids creating it accidentally)
  IF EXISTS (
    SELECT 1 FROM storage.buckets WHERE id = 'bender_clientes'
  ) THEN
    -- Use the storage.update_bucket RPC function (the correct Supabase storage API)
    -- to update the file_size_limit. The function is defined in the storage schema.
    PERFORM storage.update_bucket(
      'bender_clientes',
      'bender_clientes',
      FALSE,                       -- public flag (private bucket)
      1047797760,                  -- file_size_limit (999 MB)
      NULL                         -- allowed_mime_types (no restriction)
    );
  END IF;
END $$;

-- Fallback: ensure the file_size_limit is set correctly in storage.buckets
-- This direct UPDATE guarantees the value even if update_bucket RPC is unavailable.
UPDATE storage.buckets
SET file_size_limit = 1047797760,
    allowed_mime_types = NULL
WHERE id = 'bender_clientes';
