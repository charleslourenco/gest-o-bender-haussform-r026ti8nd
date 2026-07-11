-- Helper function to generate standardized acompanhamento codes
-- Pattern: [Client Initials] + ACP + [Sequential Number padded to 3 digits]
-- Example: "Charles Lourenco" -> "CLACP001"
CREATE OR REPLACE FUNCTION public.gerar_codigo_acompanhamento(p_nome TEXT)
RETURNS TEXT AS $$
DECLARE
  iniciais TEXT := '';
  palavras TEXT[];
  palavra TEXT;
  seq INTEGER;
BEGIN
  palavras := string_to_array(TRIM(COALESCE(p_nome, '')), ' ');
  FOREACH palavra IN ARRAY palavras
  LOOP
    IF palavra != '' THEN
      iniciais := iniciais || UPPER(SUBSTRING(palavra FROM 1 FOR 1));
    END IF;
  END LOOP;

  IF iniciais = '' THEN
    iniciais := 'XX';
  END IF;

  SELECT COUNT(*) + 1 INTO seq FROM public.acompanhamentos;

  RETURN iniciais || 'ACP' || LPAD(seq::TEXT, 3, '0');
END;
$$ LANGUAGE plpgsql;

-- Update route_acompanhamentos trigger function to use standardized code generation
CREATE OR REPLACE FUNCTION public.route_acompanhamentos() RETURNS trigger AS $$
DECLARE
  item JSONB;
  tipo TEXT;
  proj_codigo TEXT;
  cli_nome TEXT;
  found_acompanhamento BOOLEAN := FALSE;
  new_produtos JSONB := '[]'::jsonb;
BEGIN
  -- 1. Scan produtos_servicos array
  IF NEW.produtos_servicos IS NOT NULL THEN
    FOR item IN SELECT * FROM jsonb_array_elements(NEW.produtos_servicos)
    LOOP
      IF (item->>'nome') ILIKE '%acompanhamento%' OR (item->>'descricao') ILIKE '%acompanhamento%' THEN
        tipo := item->>'nome';
        cli_nome := COALESCE(NEW.nome_cliente, 'Desconhecido');
        proj_codigo := public.gerar_codigo_acompanhamento(cli_nome);

        INSERT INTO public.acompanhamentos (codigo_projeto, nome_cliente, tipo_acompanhamento, status_atual, quantidade_itens)
        VALUES (proj_codigo, cli_nome, tipo, 'INÍCIO', COALESCE((item->>'quantidade')::integer, 1))
        ON CONFLICT (codigo_projeto) DO NOTHING;

        found_acompanhamento := TRUE;
      ELSE
        new_produtos := new_produtos || item;
      END IF;
    END LOOP;

    IF found_acompanhamento THEN
      NEW.produtos_servicos := new_produtos;
    END IF;
  END IF;

  -- 2. Scan itens array (fallback if structure is slightly different)
  IF NEW.itens IS NOT NULL THEN
    new_produtos := '[]'::jsonb;
    found_acompanhamento := FALSE;
    FOR item IN SELECT * FROM jsonb_array_elements(NEW.itens)
    LOOP
      IF (item->>'nome') ILIKE '%acompanhamento%' OR (item->>'descricao') ILIKE '%acompanhamento%' THEN
        tipo := item->>'nome';
        cli_nome := COALESCE(NEW.nome_cliente, 'Desconhecido');
        proj_codigo := public.gerar_codigo_acompanhamento(cli_nome);

        INSERT INTO public.acompanhamentos (codigo_projeto, nome_cliente, tipo_acompanhamento, status_atual, quantidade_itens)
        VALUES (proj_codigo, cli_nome, tipo, 'INÍCIO', COALESCE((item->>'quantidade')::integer, 1))
        ON CONFLICT DO NOTHING;

        found_acompanhamento := TRUE;
      ELSE
        new_produtos := new_produtos || item;
      END IF;
    END LOOP;

    IF found_acompanhamento THEN
      NEW.itens := new_produtos;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Recreate the trigger to ensure it uses the updated function
DROP TRIGGER IF EXISTS route_acompanhamentos_trg ON public.formulario_comercial;
CREATE TRIGGER route_acompanhamentos_trg
BEFORE INSERT OR UPDATE ON public.formulario_comercial
FOR EACH ROW EXECUTE FUNCTION public.route_acompanhamentos();

-- Auth seed: ensure initial user exists for testing
DO $$
DECLARE
  new_user_id uuid;
BEGIN
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

    INSERT INTO public.users (id, email, nome, status)
    VALUES (new_user_id, 'charleslourenco01@icloud.com', 'Charles Lourenço', true)
    ON CONFLICT (id) DO NOTHING;
  END IF;
END $$;
