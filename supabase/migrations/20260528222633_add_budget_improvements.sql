DO $$
DECLARE
  new_user_id uuid;
BEGIN
  -- Seed user charleslourenco01@icloud.com
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
      '', '', '', '', '', NULL, '', '', ''
    );

    INSERT INTO public.users (id, email, nome, status)
    VALUES (new_user_id, 'charleslourenco01@icloud.com', 'Charles Lourenço', true)
    ON CONFLICT (id) DO NOTHING;
    
    INSERT INTO public.matriz_permissoes (usuario_id, modulo, nivel_acesso)
    VALUES (new_user_id, 'Comercial', 'Admin'),
           (new_user_id, 'Criar Orçamento', 'Admin'),
           (new_user_id, 'Clientes', 'Admin'),
           (new_user_id, 'Análise Técnica', 'Admin'),
           (new_user_id, 'Produção', 'Admin'),
           (new_user_id, 'Montagem', 'Admin'),
           (new_user_id, 'Estoque & Compras', 'Admin'),
           (new_user_id, 'Financeiro', 'Admin'),
           (new_user_id, 'Gestão de Pessoas', 'Admin'),
           (new_user_id, 'Usuários', 'Admin'),
           (new_user_id, 'Administrativo', 'Admin');
  END IF;
END $$;

-- Ensure RLS policies for engineering budgets
DROP POLICY IF EXISTS "orcamentos_engenharia_all" ON public.orcamentos_engenharia;
CREATE POLICY "orcamentos_engenharia_all" ON public.orcamentos_engenharia FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "orcamentos_ambientes_all" ON public.orcamentos_ambientes;
CREATE POLICY "orcamentos_ambientes_all" ON public.orcamentos_ambientes FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "orcamentos_itens_all" ON public.orcamentos_itens;
CREATE POLICY "orcamentos_itens_all" ON public.orcamentos_itens FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "configuracoes_sistema_all" ON public.configuracoes_sistema;
CREATE POLICY "configuracoes_sistema_all" ON public.configuracoes_sistema FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Provide initial system config if not exists
INSERT INTO public.configuracoes_sistema (markup_vista, markup_prazo)
SELECT 0.40, 0.35
WHERE NOT EXISTS (SELECT 1 FROM public.configuracoes_sistema);
