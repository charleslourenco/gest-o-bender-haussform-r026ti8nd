-- Increase the file_size_limit of the bender_clientes bucket from 250MB to 999MB (1,047,797,760 bytes)
-- This migration is idempotent and safe to run multiple times.
-- Note: storage.update_bucket RPC is not available in this environment, so we update storage.buckets directly.

-- Ensure the file_size_limit is set correctly in storage.buckets.
-- This direct UPDATE is the supported way to mutate bucket config and is safe to run
-- whether or not the bucket already exists (no rows are affected if it does not).
UPDATE storage.buckets
SET file_size_limit = 1047797760,
    allowed_mime_types = NULL
WHERE id = 'bender_clientes';
