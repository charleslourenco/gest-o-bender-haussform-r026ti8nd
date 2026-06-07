DO $$
DECLARE
  new_user_id uuid;
BEGIN
  -- Insert seed user charleslourenco01@icloud.com
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'charleslourenco01@icloud.com') THEN
    new_user_id := gen_random_uuid();
    INSERT INTO auth.users (
      id, instance_id, email, encrypted_password, email_confirmed_at,
      created_at, updated_at, raw_app_meta_data, raw_user_meta_data,
      is_super_admin, role, aud,
      confirmation_token, recovery_token, email_change_token_new,
      email_change, email_change_token_current,
      phone, phone_change, phone_change_token, reauthentication_token
    ) VALUES (
      new_user_id,
      '00000000-0000-0000-0000-000000000000',
      'charleslourenco01@icloud.com',
      crypt('Skip@Pass', gen_salt('bf')),
      NOW(), NOW(), NOW(),
      '{"provider": "email", "providers": ["email"]}',
      '{"nome": "Charles Lourenço"}',
      false, 'authenticated', 'authenticated',
      '', '', '', '', '',
      NULL, '', '', ''
    );

    INSERT INTO public.users (id, email, nome, funcao, status)
    VALUES (new_user_id, 'charleslourenco01@icloud.com', 'Charles Lourenço', 'Administrador', true)
    ON CONFLICT (id) DO NOTHING;

    INSERT INTO public.matriz_permissoes (usuario_id, modulo, nivel_acesso)
    VALUES
      (new_user_id, 'Usuários', 'Admin'),
      (new_user_id, 'Clientes', 'Admin'),
      (new_user_id, 'Comercial', 'Admin'),
      (new_user_id, 'Financeiro', 'Admin'),
      (new_user_id, 'Produção', 'Admin'),
      (new_user_id, 'Montagem', 'Admin'),
      (new_user_id, 'Estoque', 'Admin')
    ON CONFLICT DO NOTHING;
  END IF;
END $$;

-- Seed Contrato Unificado template if it doesn't exist
INSERT INTO public.templates (nome, tipo, arquivo_url, status, external_template_id)
SELECT 'Contrato Unificado de Soluções para Interiores', 'contrato', 'pdfmonkey', 'ativo', 'pending_pdfmonkey_id'
WHERE NOT EXISTS (
  SELECT 1 FROM public.templates WHERE nome = 'Contrato Unificado de Soluções para Interiores'
);
