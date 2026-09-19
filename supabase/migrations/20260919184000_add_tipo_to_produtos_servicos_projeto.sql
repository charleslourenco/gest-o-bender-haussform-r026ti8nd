-- Adiciona a coluna `tipo` à tabela produtos_servicos_projeto.
-- Guarda o tipo escolhido na lista suspensa da Seção 4 do formulário comercial:
--   'Sob medida' | 'Móveis soltos' | 'Acompanhamento Bender Essencial'
--   | 'Acompanhamento Bender Forma' | 'Acompanhamento Bender Hauss'
-- O tipo NÃO é enviado ao PDF do contrato (payload do PDFMonkey) — ele serve
-- apenas para classificar o item internamente (módulo, compras, acompanhamento).

ALTER TABLE public.produtos_servicos_projeto
  ADD COLUMN IF NOT EXISTS tipo TEXT;

-- Índice para consultas por tipo (opcional, barato).
CREATE INDEX IF NOT EXISTS idx_produtos_servicos_projeto_tipo
  ON public.produtos_servicos_projeto (tipo);

-- Atualiza sync_formulario_items para propagar o `tipo` do item do JSON
-- (produtos_servicos / itens do formulario_comercial) para o card kanban.
-- O JSON do formulário passa a ter `tipo` em cada item (gravado pela Seção 4).
CREATE OR REPLACE FUNCTION public.sync_formulario_items()
RETURNS trigger AS $$
DECLARE
  item jsonb;
  v_nome text;
  v_qtd integer;
  v_desc text;
  v_vu numeric;
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
        v_desc := item->>'descricao';
        v_vu := COALESCE(NULLIF(item->>'valor_unitario', '')::numeric, 0);
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
              valor_total = v_qtd * v_vu,
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
            v_qtd * v_vu,
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
