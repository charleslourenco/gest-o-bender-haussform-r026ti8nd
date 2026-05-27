DO $$
DECLARE
  v_user_id uuid;
BEGIN
  -- Verificar se o usuário já existe
  SELECT id INTO v_user_id FROM auth.users WHERE email = 'charleslourenco01@icloud.com';
  
  IF v_user_id IS NULL THEN
    v_user_id := gen_random_uuid();
    INSERT INTO auth.users (
      id, instance_id, email, encrypted_password, email_confirmed_at,
      created_at, updated_at, raw_app_meta_data, raw_user_meta_data,
      is_super_admin, role, aud,
      confirmation_token, recovery_token, email_change_token_new,
      email_change, email_change_token_current,
      phone, phone_change, phone_change_token, reauthentication_token
    ) VALUES (
      v_user_id,
      '00000000-0000-0000-0000-000000000000',
      'charleslourenco01@icloud.com',
      crypt('Skip@Pass', gen_salt('bf')),
      NOW(), NOW(), NOW(),
      '{"provider": "email", "providers": ["email"]}',
      '{"nome": "Charles Lourenço"}',
      false, 'authenticated', 'authenticated',
      '', '', '', '', '', NULL, '', '', ''
    );
  END IF;

  -- Garantir que o perfil público exista
  INSERT INTO public.users (id, email, nome)
  VALUES (v_user_id, 'charleslourenco01@icloud.com', 'Charles Lourenço')
  ON CONFLICT (id) DO UPDATE SET email = EXCLUDED.email, nome = EXCLUDED.nome;
  
  -- Limpar permissões antigas para recriar as novas e garantir que seja Admin total
  DELETE FROM public.matriz_permissoes WHERE usuario_id = v_user_id;
  
  INSERT INTO public.matriz_permissoes (usuario_id, modulo, nivel_acesso)
  VALUES 
    (v_user_id, 'Comercial', 'Admin'),
    (v_user_id, 'Área de Clientes', 'Admin'),
    (v_user_id, 'Análise Técnica', 'Admin'),
    (v_user_id, 'Produção', 'Admin'),
    (v_user_id, 'Montagem', 'Admin'),
    (v_user_id, 'Estoque & Compras', 'Admin'),
    (v_user_id, 'Financeiro', 'Admin'),
    (v_user_id, 'Gestão de Pessoas', 'Admin'),
    (v_user_id, 'Usuários', 'Admin');
END $$;
