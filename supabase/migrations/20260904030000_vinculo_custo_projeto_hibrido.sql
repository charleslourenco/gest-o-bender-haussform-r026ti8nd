-- ============================================================================
-- Migração: Vínculo Custo -> Projeto (Modelo Híbrido)
-- 1. Adicionar colunas cliente_id e formulario_comercial_id em contas_pagar
-- 2. Índices e FKs
-- 3. Backfill automático a partir do estoque (estoque_caixas e estoque_alocacoes)
-- 4. Atualizar trigger auto_create_conta_pagar_from_nota e insert_conta_pagar_with_divisoes
-- 5. Trigger para propagar alocação de estoque para contas_pagar vinculadas à NF
-- ============================================================================

-- 1. Adicionar colunas se não existirem
ALTER TABLE public.contas_pagar
  ADD COLUMN IF NOT EXISTS cliente_id UUID REFERENCES public.clientes(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS formulario_comercial_id UUID REFERENCES public.formulario_comercial(id) ON DELETE SET NULL;

-- 2. Criar índices para performance de queries analíticas
CREATE INDEX IF NOT EXISTS idx_contas_pagar_cliente_id ON public.contas_pagar(cliente_id);
CREATE INDEX IF NOT EXISTS idx_contas_pagar_formulario_comercial_id ON public.contas_pagar(formulario_comercial_id);

-- 3. Função auxiliar para resolver vínculo de projeto via estoque para uma nota fiscal
CREATE OR REPLACE FUNCTION public.resolver_projeto_estoque_por_nota(p_nota_fiscal_id UUID)
RETURNS TABLE (
  r_cliente_id UUID,
  r_formulario_comercial_id UUID
)
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  v_cli_id UUID := NULL;
  v_fc_id UUID := NULL;
  v_count_cli INT := 0;
  v_cli_nome TEXT := NULL;
BEGIN
  IF p_nota_fiscal_id IS NULL THEN
    RETURN;
  END IF;

  -- Estratégia 1: Via estoque_caixas e itens_nota_fiscal
  -- Itens desta NF que estão reservados em estoque_caixas
  SELECT
    ec.cliente_id,
    ec.projeto_id,
    COUNT(DISTINCT ec.cliente_id)
  INTO
    v_cli_id,
    v_fc_id,
    v_count_cli
  FROM public.itens_nota_fiscal inf
  JOIN public.estoque_caixas_itens eci ON eci.item_id = inf.produto_id
  JOIN public.estoque_caixas ec ON ec.id = eci.caixa_id
  WHERE inf.nota_fiscal_id = p_nota_fiscal_id
    AND ec.cliente_id IS NOT NULL
  GROUP BY ec.cliente_id, ec.projeto_id
  LIMIT 1;

  IF v_count_cli = 1 AND v_cli_id IS NOT NULL THEN
    -- Se formulario_comercial_id não estava no estoque_caixas, tenta achar o projeto mais recente do cliente
    IF v_fc_id IS NULL THEN
      SELECT fc.id INTO v_fc_id
      FROM public.formulario_comercial fc
      WHERE fc.cliente_id = v_cli_id
      ORDER BY fc.criado_em DESC
      LIMIT 1;
    END IF;

    r_cliente_id := v_cli_id;
    r_formulario_comercial_id := v_fc_id;
    RETURN NEXT;
    RETURN;
  END IF;

  -- Estratégia 2: Via estoque_alocacoes e itens_nota_fiscal
  -- Verificar se as alocações dos itens da NF apontam para um único cliente inequívoco
  SELECT
    UPPER(TRIM(ea.cliente_nome)),
    COUNT(DISTINCT UPPER(TRIM(ea.cliente_nome)))
  INTO
    v_cli_nome,
    v_count_cli
  FROM public.itens_nota_fiscal inf
  JOIN public.estoque_alocacoes ea ON ea.item_id = inf.produto_id
  WHERE inf.nota_fiscal_id = p_nota_fiscal_id
    AND ea.cliente_nome IS NOT NULL
    AND TRIM(ea.cliente_nome) <> ''
    AND UPPER(TRIM(ea.cliente_nome)) NOT IN ('SOBRA', 'PRODUÇÃO', 'TESTE', 'TESTE 02', 'CLIEN')
  GROUP BY UPPER(TRIM(ea.cliente_nome))
  LIMIT 1;

  IF v_count_cli = 1 AND v_cli_nome IS NOT NULL THEN
    -- Buscar cliente que coincida com o nome da alocação
    SELECT c.id INTO v_cli_id
    FROM public.clientes c
    WHERE (c.excluido = false OR c.excluido IS NULL)
      AND (
        UPPER(TRIM(c.nome)) = v_cli_nome
        OR UPPER(TRIM(c.nome)) LIKE v_cli_nome || ' %'
        OR v_cli_nome LIKE UPPER(TRIM(c.nome)) || ' %'
      )
    ORDER BY
      CASE WHEN UPPER(TRIM(c.nome)) = v_cli_nome THEN 0 ELSE 1 END,
      c.criado_em DESC
    LIMIT 1;

    IF v_cli_id IS NOT NULL THEN
      SELECT fc.id INTO v_fc_id
      FROM public.formulario_comercial fc
      WHERE fc.cliente_id = v_cli_id
      ORDER BY fc.criado_em DESC
      LIMIT 1;

      r_cliente_id := v_cli_id;
      r_formulario_comercial_id := v_fc_id;
      RETURN NEXT;
      RETURN;
    END IF;
  END IF;

  RETURN;
END;
$$;

-- 4. Executar Backfill seguro dos lançamentos existentes de custo_direto em contas_pagar
DO $$
DECLARE
  rec RECORD;
  v_res RECORD;
  v_updated INT := 0;
BEGIN
  FOR rec IN
    SELECT id, nota_fiscal_id
    FROM public.contas_pagar
    WHERE (cliente_id IS NULL OR formulario_comercial_id IS NULL)
      AND nota_fiscal_id IS NOT NULL
  LOOP
    SELECT r_cliente_id, r_formulario_comercial_id INTO v_res
    FROM public.resolver_projeto_estoque_por_nota(rec.nota_fiscal_id);

    IF v_res.r_cliente_id IS NOT NULL OR v_res.r_formulario_comercial_id IS NOT NULL THEN
      UPDATE public.contas_pagar
      SET
        cliente_id = COALESCE(cliente_id, v_res.r_cliente_id),
        formulario_comercial_id = COALESCE(formulario_comercial_id, v_res.r_formulario_comercial_id),
        atualizado_em = NOW()
      WHERE id = rec.id;
      v_updated := v_updated + 1;
    END IF;
  END LOOP;

  RAISE NOTICE 'Backfill concluído: % lançamentos vinculados via estoque.', v_updated;
END $$;

-- 5. Atualizar a trigger auto_create_conta_pagar_from_nota para resolver vínculo de projeto se disponível
CREATE OR REPLACE FUNCTION public.auto_create_conta_pagar_from_nota()
RETURNS trigger AS $$
DECLARE
  v_insumo_id UUID := '20000000-0000-0000-0000-000000000001'::uuid;
  v_cli_id UUID := NULL;
  v_fc_id UUID := NULL;
BEGIN
  -- Idempotency: skip if conta_pagar already exists for this nota_fiscal
  IF NOT EXISTS (
    SELECT 1 FROM public.contas_pagar
    WHERE nota_fiscal_id = NEW.id
  ) THEN
    -- Tentar inferir cliente/projeto via estoque se os itens da nota já existirem
    SELECT r_cliente_id, r_formulario_comercial_id
    INTO v_cli_id, v_fc_id
    FROM public.resolver_projeto_estoque_por_nota(NEW.id);

    INSERT INTO public.contas_pagar (
      user_id,
      fornecedor,
      valor,
      comprovante_url,
      status_pagamento,
      data_vencimento,
      categoria,
      categoria_id,
      natureza,
      descricao,
      nota_fiscal_id,
      cliente_id,
      formulario_comercial_id,
      criado_em,
      atualizado_em
    ) VALUES (
      auth.uid(),
      COALESCE(NEW.fornecedor, 'Desconhecido'),
      COALESCE(NEW.valor_total, 0),
      NEW.arquivo_url,
      'a_classificar',
      NULL,
      'Matéria-Prima e Insumos de Produção',
      v_insumo_id,
      'custo_direto',
      'Nota Fiscal: ' || COALESCE(NEW.numero_nota, 'Sem numero'),
      NEW.id,
      v_cli_id,
      v_fc_id,
      NOW(),
      NOW()
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Trigger para quando uma alocação de estoque é criada/atualizada:
-- Propagar o vínculo de cliente/projeto para a conta_pagar das notas fiscais daquele item
CREATE OR REPLACE FUNCTION public.propagar_alocacao_estoque_para_contas_pagar()
RETURNS trigger AS $$
DECLARE
  rec_nf RECORD;
  v_res RECORD;
BEGIN
  IF NEW.item_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Achar todas as contas a pagar vinculadas a notas que contenham este item e ainda não tenham projeto
  FOR rec_nf IN
    SELECT DISTINCT cp.id, cp.nota_fiscal_id
    FROM public.contas_pagar cp
    JOIN public.itens_nota_fiscal inf ON inf.nota_fiscal_id = cp.nota_fiscal_id
    WHERE inf.produto_id = NEW.item_id
      AND (cp.cliente_id IS NULL OR cp.formulario_comercial_id IS NULL)
  LOOP
    SELECT r_cliente_id, r_formulario_comercial_id INTO v_res
    FROM public.resolver_projeto_estoque_por_nota(rec_nf.nota_fiscal_id);

    IF v_res.r_cliente_id IS NOT NULL OR v_res.r_formulario_comercial_id IS NOT NULL THEN
      UPDATE public.contas_pagar
      SET
        cliente_id = COALESCE(cliente_id, v_res.r_cliente_id),
        formulario_comercial_id = COALESCE(formulario_comercial_id, v_res.r_formulario_comercial_id),
        atualizado_em = NOW()
      WHERE id = rec_nf.id;
    END IF;
  END LOOP;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_propagar_alocacao_contas_pagar ON public.estoque_alocacoes;
CREATE TRIGGER trg_propagar_alocacao_contas_pagar
  AFTER INSERT OR UPDATE ON public.estoque_alocacoes
  FOR EACH ROW
  EXECUTE FUNCTION public.propagar_alocacao_estoque_para_contas_pagar();

-- 7. Atualizar insert_conta_pagar_with_divisoes com parâmetros cliente_id e formulario_comercial_id
DROP FUNCTION IF EXISTS public.insert_conta_pagar_with_divisoes(text, text, numeric, date, text, uuid, uuid, integer, jsonb, uuid, text, uuid, text) CASCADE;
DROP FUNCTION IF EXISTS public.insert_conta_pagar_with_divisoes(text, text, numeric, date, text, uuid, uuid, integer, jsonb, uuid, text, uuid, text, uuid, uuid) CASCADE;

CREATE OR REPLACE FUNCTION public.insert_conta_pagar_with_divisoes(
  p_fornecedor text,
  p_descricao text,
  p_valor numeric,
  p_data_vencimento date,
  p_categoria text,
  p_user_id uuid,
  p_conta_bancaria_id uuid,
  p_meses integer,
  p_divisoes jsonb,
  p_grupo_id uuid DEFAULT NULL,
  p_observacoes text DEFAULT NULL,
  p_categoria_id uuid DEFAULT NULL,
  p_natureza text DEFAULT NULL,
  p_cliente_id uuid DEFAULT NULL,
  p_formulario_comercial_id uuid DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_i integer;
  v_current_date date;
  v_conta_id uuid;
  v_divisao jsonb;
  v_nat text;
BEGIN
  v_current_date := p_data_vencimento;
  
  -- Inferir natureza se categoria_id fornecido e natureza nula
  IF p_categoria_id IS NOT NULL AND p_natureza IS NULL THEN
    SELECT natureza INTO v_nat FROM public.plano_contas WHERE id = p_categoria_id;
  ELSE
    v_nat := COALESCE(p_natureza, 'custo_direto');
  END IF;

  FOR v_i IN 1..p_meses LOOP
    INSERT INTO public.contas_pagar (
      user_id, fornecedor, descricao, valor, data_vencimento,
      categoria, categoria_id, natureza, status_pagamento, conta_bancaria_id, grupo_id, observacoes,
      cliente_id, formulario_comercial_id,
      criado_em, atualizado_em
    ) VALUES (
      p_user_id, p_fornecedor, p_descricao, p_valor, v_current_date,
      p_categoria, p_categoria_id, v_nat, 'aguardando', p_conta_bancaria_id, p_grupo_id, p_observacoes,
      p_cliente_id, p_formulario_comercial_id,
      NOW(), NOW()
    ) RETURNING id INTO v_conta_id;

    FOR v_divisao IN SELECT * FROM jsonb_array_elements(p_divisoes) LOOP
      INSERT INTO public.contas_pagar_divisoes (conta_pagar_id, descricao, valor)
      VALUES (v_conta_id, v_divisao->>'descricao', (v_divisao->>'valor')::numeric);
    END LOOP;

    v_current_date := (v_current_date + INTERVAL '1 month')::date;
  END LOOP;

  RETURN jsonb_build_object('success', true, 'meses', p_meses);
END;
$$;

GRANT EXECUTE ON FUNCTION public.insert_conta_pagar_with_divisoes(
  text, text, numeric, date, text, uuid, uuid, integer, jsonb, uuid, text, uuid, text, uuid, uuid
) TO authenticated;
