-- Fix: route_acompanhamentos was REMOVING the "acompanhamento" item from the
-- produtos_servicos / itens JSON arrays after inserting it into the
-- acompanhamentos table. This mutilated the JSON, which then caused the
-- sync_formulario_items (AFTER) trigger to delete the corresponding kanban card
-- (its nome_produto was no longer in valid_names) and broke the valor_total sum.
--
-- Correction: keep inserting into acompanhamentos (ON CONFLICT DO NOTHING) but
-- STOP removing the item from the JSON arrays. NEW.produtos_servicos and
-- NEW.itens are returned untouched.
--
-- Verification of sync_formulario_items (no change needed):
--   It uses SELECT id ... WHERE formulario_comercial_id = NEW.id AND
--   nome_produto = v_nome LIMIT 1, then UPDATE-if-exists / INSERT-if-not.
--   This existence check prevents duplicate kanban cards for the same
--   nome_produto within a form, so keeping the acompanhamento item in the JSON
--   is safe — it will create/update exactly one card, never a duplicate.
--   (There is no unique index on (formulario_comercial_id, nome_produto), so
--   ON CONFLICT is not applicable here; the SELECT-then-INSERT guard is the
--   correct and sufficient dedup mechanism.)

CREATE OR REPLACE FUNCTION public.route_acompanhamentos() RETURNS trigger AS $$
DECLARE
  item JSONB;
  tipo TEXT;
  proj_codigo TEXT;
  cli_nome TEXT;
BEGIN
  -- 1. Scan produtos_servicos array: insert acompanhamentos, but DO NOT remove
  --    the item from the JSON (previously this mutilated the array).
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
      END IF;
    END LOOP;
  END IF;

  -- 2. Scan itens array (fallback if structure is slightly different): same
  --    behaviour — insert into acompanhamentos, keep the item in the JSON.
  IF NEW.itens IS NOT NULL THEN
    FOR item IN SELECT * FROM jsonb_array_elements(NEW.itens)
    LOOP
      IF (item->>'nome') ILIKE '%acompanhamento%' OR (item->>'descricao') ILIKE '%acompanhamento%' THEN
        tipo := item->>'nome';
        cli_nome := COALESCE(NEW.nome_cliente, 'Desconhecido');
        proj_codigo := public.gerar_codigo_acompanhamento(cli_nome);

        INSERT INTO public.acompanhamentos (codigo_projeto, nome_cliente, tipo_acompanhamento, status_atual, quantidade_itens)
        VALUES (proj_codigo, cli_nome, tipo, 'INÍCIO', COALESCE((item->>'quantidade')::integer, 1))
        ON CONFLICT (codigo_projeto) DO NOTHING;
      END IF;
    END LOOP;
  END IF;

  -- Return NEW unchanged: produtos_servicos and itens keep all their items.
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Recreate the trigger to ensure it uses the corrected function.
DROP TRIGGER IF EXISTS route_acompanhamentos_trg ON public.formulario_comercial;
CREATE TRIGGER route_acompanhamentos_trg
BEFORE INSERT OR UPDATE ON public.formulario_comercial
FOR EACH ROW EXECUTE FUNCTION public.route_acompanhamentos();
