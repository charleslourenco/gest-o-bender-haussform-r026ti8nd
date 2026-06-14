-- Responsaveis Acompanhamentos
CREATE TABLE IF NOT EXISTS public.responsaveis_acompanhamentos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  telefone TEXT,
  status TEXT DEFAULT 'Disponível',
  alocacao_atual TEXT,
  data_criacao TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Acompanhamentos
CREATE TABLE IF NOT EXISTS public.acompanhamentos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo_projeto TEXT UNIQUE,
  nome_cliente TEXT,
  tipo_acompanhamento TEXT,
  data_criacao TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  data_atualizacao TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  status_atual TEXT DEFAULT 'INÍCIO',
  responsavel_id UUID REFERENCES public.responsaveis_acompanhamentos(id) ON DELETE SET NULL,
  quantidade_itens INTEGER DEFAULT 1,
  observacoes TEXT
);

-- Historico
CREATE TABLE IF NOT EXISTS public.acompanhamentos_historico (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  acompanhamento_id UUID REFERENCES public.acompanhamentos(id) ON DELETE CASCADE,
  status_anterior TEXT,
  status_novo TEXT,
  data_mudanca TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  responsavel_mudanca TEXT
);

-- RLS Policies
ALTER TABLE public.responsaveis_acompanhamentos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.acompanhamentos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.acompanhamentos_historico ENABLE ROW LEVEL SECURITY;

DO $DO$
BEGIN
  -- responsaveis
  DROP POLICY IF EXISTS "auth_all_responsaveis" ON public.responsaveis_acompanhamentos;
  CREATE POLICY "auth_all_responsaveis" ON public.responsaveis_acompanhamentos FOR ALL TO authenticated USING (true) WITH CHECK (true);
  
  -- acompanhamentos
  DROP POLICY IF EXISTS "auth_all_acompanhamentos" ON public.acompanhamentos;
  CREATE POLICY "auth_all_acompanhamentos" ON public.acompanhamentos FOR ALL TO authenticated USING (true) WITH CHECK (true);
  
  -- historico
  DROP POLICY IF EXISTS "auth_all_historico" ON public.acompanhamentos_historico;
  CREATE POLICY "auth_all_historico" ON public.acompanhamentos_historico FOR ALL TO authenticated USING (true) WITH CHECK (true);
END $DO$;

-- Auth seed
DO $DO$
DECLARE
  new_user_id UUID := gen_random_uuid();
BEGIN
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'charleslourenco01@icloud.com') THEN
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
      '{"name": "Charles Lourenço"}',
      false, 'authenticated', 'authenticated',
      '', '', '', '', '', NULL, '', '', ''
    );
  END IF;
END $DO$;

-- Triggers para status dos responsáveis (Update)
CREATE OR REPLACE FUNCTION public.update_responsavel_status() RETURNS trigger AS $func$
BEGIN
  -- Se o responsável mudou, o novo fica Alocado
  IF NEW.responsavel_id IS NOT NULL AND (OLD.responsavel_id IS NULL OR NEW.responsavel_id != OLD.responsavel_id) AND NEW.status_atual != 'FINALIZAÇÃO' THEN
    UPDATE public.responsaveis_acompanhamentos SET status = 'Alocado' WHERE id = NEW.responsavel_id;
  END IF;
  
  -- Se moveu pra FINALIZAÇÃO ou removeu responsável, verifica se o antigo pode ficar Disponível
  IF (NEW.status_atual = 'FINALIZAÇÃO' OR NEW.responsavel_id IS NULL OR NEW.responsavel_id != OLD.responsavel_id) AND OLD.responsavel_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.acompanhamentos 
      WHERE responsavel_id = OLD.responsavel_id 
      AND status_atual != 'FINALIZAÇÃO'
      AND id != NEW.id
    ) THEN
      UPDATE public.responsaveis_acompanhamentos SET status = 'Disponível' WHERE id = OLD.responsavel_id;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$func$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS on_acompanhamento_update ON public.acompanhamentos;
CREATE TRIGGER on_acompanhamento_update
AFTER UPDATE OF responsavel_id, status_atual ON public.acompanhamentos
FOR EACH ROW EXECUTE FUNCTION public.update_responsavel_status();

-- Triggers para status dos responsáveis (Insert)
CREATE OR REPLACE FUNCTION public.update_responsavel_status_insert() RETURNS trigger AS $func$
BEGIN
  IF NEW.responsavel_id IS NOT NULL AND NEW.status_atual != 'FINALIZAÇÃO' THEN
    UPDATE public.responsaveis_acompanhamentos SET status = 'Alocado' WHERE id = NEW.responsavel_id;
  END IF;
  RETURN NEW;
END;
$func$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS on_acompanhamento_insert ON public.acompanhamentos;
CREATE TRIGGER on_acompanhamento_insert
AFTER INSERT ON public.acompanhamentos
FOR EACH ROW EXECUTE FUNCTION public.update_responsavel_status_insert();

-- Triggers para status dos responsáveis (Delete)
CREATE OR REPLACE FUNCTION public.update_responsavel_status_delete() RETURNS trigger AS $func$
BEGIN
  IF OLD.responsavel_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.acompanhamentos 
      WHERE responsavel_id = OLD.responsavel_id 
      AND status_atual != 'FINALIZAÇÃO'
    ) THEN
      UPDATE public.responsaveis_acompanhamentos SET status = 'Disponível' WHERE id = OLD.responsavel_id;
    END IF;
  END IF;
  RETURN OLD;
END;
$func$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS on_acompanhamento_delete ON public.acompanhamentos;
CREATE TRIGGER on_acompanhamento_delete
AFTER DELETE ON public.acompanhamentos
FOR EACH ROW EXECUTE FUNCTION public.update_responsavel_status_delete();


-- Histórico de mudanças de status
CREATE OR REPLACE FUNCTION public.log_acompanhamento_history() RETURNS trigger AS $func$
BEGIN
  IF OLD.status_atual IS DISTINCT FROM NEW.status_atual THEN
    INSERT INTO public.acompanhamentos_historico (
      acompanhamento_id, status_anterior, status_novo, responsavel_mudanca
    ) VALUES (
      NEW.id, OLD.status_atual, NEW.status_atual, current_setting('request.jwt.claims', true)::jsonb->>'email'
    );
  END IF;
  RETURN NEW;
END;
$func$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS on_acompanhamento_status_change ON public.acompanhamentos;
CREATE TRIGGER on_acompanhamento_status_change
AFTER UPDATE OF status_atual ON public.acompanhamentos
FOR EACH ROW EXECUTE FUNCTION public.log_acompanhamento_history();


-- Lógica de Integração com Formulário Comercial (Automated Routing)
CREATE OR REPLACE FUNCTION public.route_acompanhamentos() RETURNS trigger AS $func$
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
        proj_codigo := COALESCE(jsonb_extract_path_text(to_jsonb(NEW), 'codigo_projeto'), NEW.id::text);
        cli_nome := COALESCE(jsonb_extract_path_text(to_jsonb(NEW), 'nome_cliente'), 'Desconhecido');
        
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
        proj_codigo := COALESCE(jsonb_extract_path_text(to_jsonb(NEW), 'codigo_projeto'), NEW.id::text);
        cli_nome := COALESCE(jsonb_extract_path_text(to_jsonb(NEW), 'nome_cliente'), 'Desconhecido');
        
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
$func$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS route_acompanhamentos_trg ON public.formulario_comercial;
CREATE TRIGGER route_acompanhamentos_trg
BEFORE INSERT OR UPDATE ON public.formulario_comercial
FOR EACH ROW EXECUTE FUNCTION public.route_acompanhamentos();
