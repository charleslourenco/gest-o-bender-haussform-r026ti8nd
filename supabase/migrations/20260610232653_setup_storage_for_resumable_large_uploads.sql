DO $$
BEGIN
  -- Insert seed user for testing
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'charleslourenco01@icloud.com') THEN
    INSERT INTO auth.users (
      id, instance_id, email, encrypted_password, email_confirmed_at,
      created_at, updated_at, raw_app_meta_data, raw_user_meta_data,
      is_super_admin, role, aud,
      confirmation_token, recovery_token, email_change_token_new,
      email_change, email_change_token_current,
      phone, phone_change, phone_change_token, reauthentication_token
    ) VALUES (
      gen_random_uuid(),
      '00000000-0000-0000-0000-000000000000',
      'charleslourenco01@icloud.com',
      crypt('Skip@Pass123!', gen_salt('bf')),
      NOW(), NOW(), NOW(),
      '{"provider": "email", "providers": ["email"]}',
      '{"nome": "Charles Lourenco"}',
      false, 'authenticated', 'authenticated',
      '', '', '', '', '',
      NULL, '', '', ''
    );
  END IF;
END $$;

-- Create or update the storage bucket with a 250MB limit
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'bender_clientes', 
  'bender_clientes', 
  false, 
  262144000, 
  NULL
)
ON CONFLICT (id) DO UPDATE
SET file_size_limit = 262144000, allowed_mime_types = NULL;

-- Enable RLS for storage.objects on the bender_clientes bucket
DROP POLICY IF EXISTS "allow_insert_bender_clientes" ON storage.objects;
CREATE POLICY "allow_insert_bender_clientes" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'bender_clientes');

DROP POLICY IF EXISTS "allow_select_bender_clientes" ON storage.objects;
CREATE POLICY "allow_select_bender_clientes" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'bender_clientes');

DROP POLICY IF EXISTS "allow_update_bender_clientes" ON storage.objects;
CREATE POLICY "allow_update_bender_clientes" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'bender_clientes');

DROP POLICY IF EXISTS "allow_delete_bender_clientes" ON storage.objects;
CREATE POLICY "allow_delete_bender_clientes" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'bender_clientes');
