CREATE OR REPLACE FUNCTION public.sync_formulario_items()
RETURNS trigger AS $$
DECLARE
  item jsonb;
  v_nome text;
  v_qtd integer;
  v_desc text;
  v_vu numeric;
  v_is_out boolean;
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
              is_outsourced = v_is_out
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

DROP TRIGGER IF EXISTS on_formulario_comercial_update ON public.formulario_comercial;
CREATE TRIGGER on_formulario_comercial_update
AFTER INSERT OR UPDATE ON public.formulario_comercial
FOR EACH ROW
EXECUTE FUNCTION public.sync_formulario_items();

DROP POLICY IF EXISTS "produtos_servicos_projeto_insert" ON public.produtos_servicos_projeto;
CREATE POLICY "produtos_servicos_projeto_insert" ON public.produtos_servicos_projeto
FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "produtos_servicos_projeto_update" ON public.produtos_servicos_projeto;
CREATE POLICY "produtos_servicos_projeto_update" ON public.produtos_servicos_projeto
FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "produtos_servicos_projeto_delete" ON public.produtos_servicos_projeto;
CREATE POLICY "produtos_servicos_projeto_delete" ON public.produtos_servicos_projeto
FOR DELETE TO authenticated USING (true);
