DO $$
BEGIN
  -- Insert or update the bucket to be private
  INSERT INTO storage.buckets (id, name, public) 
  VALUES ('bender_clientes', 'bender_clientes', false)
  ON CONFLICT (id) DO UPDATE SET public = false;
  
  -- Drop potentially insecure policies on this bucket
  DROP POLICY IF EXISTS "Allow read to authenticated users on bender_clientes" ON storage.objects;
  
  -- Create an explicit policy for authenticated users to read, just in case
  CREATE POLICY "Allow read to authenticated users on bender_clientes" 
  ON storage.objects FOR SELECT 
  TO authenticated 
  USING (bucket_id = 'bender_clientes');
END $$;
