-- Migration: Idempotência de acompanhamentos, limpeza de duplicados e desconto % por item
-- 1. Idempotência em route_acompanhamentos: checar se já existe acompanhamento para o mesmo cliente + tipo antes de inserir
-- 2. Limpeza de acompanhamentos duplicados (mantendo o mais antigo de cada par cliente+tipo)
-- 3. Adicionar coluna aditiva desconto_percentual à tabela produtos_servicos_projeto com DEFAULT 0
-- 4. Atualizar trigger sync_formulario_items para persistir desconto_percentual e calcular valor_total = qtd * vu * (1 - desc/100)

-- ============================================================================
-- PARTE 1 & 2: ACOMPANHAMENTOS (IDEMPOTÊNCIA E LIMPEZA)
-- ============================================================================

-- Limpeza preventiva de duplicados existentes (mantendo o mais antigo por cliente + tipo)
DO $$
DECLARE
  v_deleted_count integer := 0;
BEGIN
  -- Arquiva ou remove duplicados mantendo o id mais antigo de cada grupo (nome_cliente normalizado + tipo_acompanhamento normalizado)
  WITH duplicates AS (
    SELECT id,
           ROW_NUMBER() OVER (
             PARTITION BY LOWER(TRIM(COALESCE(nome_cliente, ''))), LOWER(TRIM(COALESCE(tipo_acompanhamento, '')))
             ORDER BY data_criacao ASC, id ASC
           ) as rn
    FROM public.acompanhamentos
  )
  DELETE FROM public.acompanhamentos
  WHERE id IN (
    SELECT id FROM duplicates WHERE rn > 1
  );

  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
  RAISE NOTICE 'Duplicados de acompanhamentos removidos: %', v_deleted_count;
END $$;

-- Índice para acelerar a checagem idempotente de cliente + tipo
CREATE INDEX IF NOT EXISTS idx_acompanhamentos_cliente_tipo_lower
  ON public.acompanhamentos (LOWER(TRIM(nome_cliente)), LOWER(TRIM(tipo_acompanhamento)));

-- Atualizar route_acompanhamentos com checagem de existência prévia (cliente + tipo)
CREATE OR REPLACE FUNCTION public.route_acompanhamentos() RETURNS trigger AS $$
DECLARE
  item JSONB;
  tipo TEXT;
  proj_codigo TEXT;
  cli_nome TEXT;
  ja_existe BOOLEAN;
BEGIN
  -- 1. Scan produtos_servicos array: insert acompanhamentos de forma idempotente sem remover item do JSON
  IF NEW.produtos_servicos IS NOT NULL THEN
    FOR item IN SELECT * FROM jsonb_array_elements(NEW.produtos_servicos)
    LOOP
      IF (item->>'nome') ILIKE '%acompanhamento%' OR (item->>'descricao') ILIKE '%acompanhamento%' THEN
        tipo := item->>'nome';
        cli_nome := COALESCE(NEW.nome_cliente, 'Desconhecido');

        -- Checagem determinística de idempotência por cliente + tipo
        SELECT EXISTS (
          SELECT 1 FROM public.acompanhamentos
          WHERE LOWER(TRIM(nome_cliente)) = LOWER(TRIM(cli_nome))
            AND LOWER(TRIM(tipo_acompanhamento)) = LOWER(TRIM(tipo))
        ) INTO ja_existe;

        IF NOT ja_existe THEN
          proj_codigo := public.gerar_codigo_acompanhamento(cli_nome);

          INSERT INTO public.acompanhamentos (
            codigo_projeto,
            nome_cliente,
            tipo_acompanhamento,
            status_atual,
            quantidade_itens
          )
          VALUES (
            proj_codigo,
            cli_nome,
            tipo,
            'INÍCIO',
            COALESCE(NULLIF(item->>'qtd', '')::integer, NULLIF(item->>'quantidade', '')::integer, 1)
          )
          ON CONFLICT (codigo_projeto) DO NOTHING;
        END IF;
      END IF;
    END LOOP;
  END IF;

  -- 2. Scan itens array (fallback compatível)
  IF NEW.itens IS NOT NULL THEN
    FOR item IN SELECT * FROM jsonb_array_elements(NEW.itens)
    LOOP
      IF (item->>'nome') ILIKE '%acompanhamento%' OR (item->>'descricao') ILIKE '%acompanhamento%' THEN
        tipo := item->>'nome';
        cli_nome := COALESCE(NEW.nome_cliente, 'Desconhecido');

        SELECT EXISTS (
          SELECT 1 FROM public.acompanhamentos
          WHERE LOWER(TRIM(nome_cliente)) = LOWER(TRIM(cli_nome))
            AND LOWER(TRIM(tipo_acompanhamento)) = LOWER(TRIM(tipo))
        ) INTO ja_existe;

        IF NOT ja_existe THEN
          proj_codigo := public.gerar_codigo_acompanhamento(cli_nome);

          INSERT INTO public.acompanhamentos (
            codigo_projeto,
            nome_cliente,
            tipo_acompanhamento,
            status_atual,
            quantidade_itens
          )
          VALUES (
            proj_codigo,
            cli_nome,
            tipo,
            'INÍCIO',
            COALESCE(NULLIF(item->>'qtd', '')::integer, NULLIF(item->>'quantidade', '')::integer, 1)
          )
          ON CONFLICT (codigo_projeto) DO NOTHING;
        END IF;
      END IF;
    END LOOP;
  END IF;

  -- Return NEW unchanged: produtos_servicos e itens mantêm seus registros
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS route_acompanhamentos_trg ON public.formulario_comercial;
CREATE TRIGGER route_acompanhamentos_trg
BEFORE INSERT OR UPDATE ON public.formulario_comercial
FOR EACH ROW EXECUTE FUNCTION public.route_acompanhamentos();

-- ============================================================================
-- PARTE 3 & 4: DESCONTO % POR ITEM NA TABELA PRODUTOS_SERVICOS_PROJETO
-- ============================================================================

-- Coluna aditiva com default 0
ALTER TABLE public.produtos_servicos_projeto
  ADD COLUMN IF NOT EXISTS desconto_percentual NUMERIC NOT NULL DEFAULT 0;

-- Atualizar trigger sync_formulario_items para suportar desconto_percentual
CREATE OR REPLACE FUNCTION public.sync_formulario_items()
RETURNS trigger AS $$
DECLARE
  item jsonb;
  v_nome text;
  v_qtd integer;
  v_desc text;
  v_vu numeric;
  v_desc_perc numeric;
  v_vt numeric;
  v_is_out boolean;
  v_tipo text;
  v_exist_id uuid;
  items_array jsonb;
  valid_names text[] := ARRAY[]::text[];
BEGIN
  items_array := NEW.produtos_servicos;
  IF items_array IS NULL OR jsonb_array_length(items_array) = 0 THEN
    items_array := NEW.itens;
  END IF;
  IF items_array IS NULL OR jsonb_array_length(items_array) = 0 THEN
    items_array := NEW.ambientes;
  END IF;
  IF items_array IS NULL THEN
    items_array := '[]'::jsonb;
  END IF;

  IF jsonb_typeof(items_array) = 'array' THEN
    FOR item IN SELECT * FROM jsonb_array_elements(items_array)
    LOOP
      v_nome := item->>'nome';

      IF v_nome IS NOT NULL AND v_nome != '' THEN
        v_qtd := COALESCE(NULLIF(item->>'qtd', '')::integer, NULLIF(item->>'quantidade', '')::integer, 1);
        IF v_qtd < 1 THEN
          v_qtd := 1;
        END IF;

        v_desc := item->>'descricao';
        v_vu := COALESCE(NULLIF(item->>'valor_unitario', '')::numeric, 0);
        v_desc_perc := COALESCE(NULLIF(item->>'desconto_percentual', '')::numeric, 0);
        IF v_desc_perc < 0 THEN
          v_desc_perc := 0;
        ELSIF v_desc_perc > 100 THEN
          v_desc_perc := 100;
        END IF;

        -- Total da linha com desconto percentual por item
        v_vt := GREATEST(0, (v_qtd * v_vu) * (1 - (v_desc_perc / 100.0)));

        v_is_out := COALESCE(NULLIF(item->>'is_outsourced', '')::boolean, false);
        v_tipo := NULLIF(item->>'tipo', '');

        valid_names := array_append(valid_names, v_nome);

        SELECT id INTO v_exist_id
        FROM public.produtos_servicos_projeto
        WHERE formulario_comercial_id = NEW.id
          AND nome_produto = v_nome
        LIMIT 1;

        IF v_exist_id IS NOT NULL THEN
          UPDATE public.produtos_servicos_projeto
          SET qtd = v_qtd,
              descricao = v_desc,
              valor_unitario = v_vu,
              desconto_percentual = v_desc_perc,
              valor_total = v_vt,
              is_outsourced = v_is_out,
              tipo = v_tipo
          WHERE id = v_exist_id;
        ELSE
          INSERT INTO public.produtos_servicos_projeto (
            formulario_comercial_id,
            cliente_id,
            nome_produto,
            qtd,
            descricao,
            valor_unitario,
            desconto_percentual,
            valor_total,
            is_outsourced,
            tipo,
            status_analise
          ) VALUES (
            NEW.id,
            NEW.cliente_id,
            v_nome,
            v_qtd,
            v_desc,
            v_vu,
            v_desc_perc,
            v_vt,
            v_is_out,
            v_tipo,
            'iniciar'
          );
        END IF;

        IF v_is_out THEN
          DECLARE
            v_sol_exist_id uuid;
          BEGIN
            SELECT id INTO v_sol_exist_id
            FROM public.solicitacoes_compra
            WHERE cliente_id = NEW.cliente_id
              AND nome_item = v_nome
            LIMIT 1;

            IF v_sol_exist_id IS NOT NULL THEN
              UPDATE public.solicitacoes_compra
              SET quantidade = v_qtd
              WHERE id = v_sol_exist_id AND status = 'Pendente';
            ELSE
              INSERT INTO public.solicitacoes_compra (
                usuario_id,
                cliente_id,
                nome_item,
                quantidade,
                unidade,
                urgencia,
                status
              ) VALUES (
                NEW.user_id,
                NEW.cliente_id,
                v_nome,
                v_qtd,
                'un',
                'Média',
                'Pendente'
              );
            END IF;
          END;
        END IF;
      END IF;
    END LOOP;
  END IF;

  IF array_length(valid_names, 1) > 0 THEN
    DELETE FROM public.produtos_servicos_projeto
    WHERE formulario_comercial_id = NEW.id
      AND nome_produto != ALL(valid_names);
  ELSE
    DELETE FROM public.produtos_servicos_projeto
    WHERE formulario_comercial_id = NEW.id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
