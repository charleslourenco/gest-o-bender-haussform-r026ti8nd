-- Migração: Fase 1 do Módulo Financeiro
-- 1. Plano de Contas neutro ao regime tributário
-- 2. Configurações fiscais e alíquotas com vigência
-- 3. Adição de colunas categoria_id e natureza em contas_pagar e contas_receber (aditiva)
-- 4. Normalização idempotente dos dados existentes ("Alguel" -> "Aluguel", Insumos, Vendas)
-- 5. Atualização da trigger de NF do Estoque e função de divisões

-- ============================================================================
-- 1. Tabela: plano_contas (Categorias Contábeis / Hierarquia)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.plano_contas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  codigo TEXT,
  natureza TEXT NOT NULL CHECK (natureza IN ('receita', 'custo_direto', 'despesa_fixa', 'imposto', 'financeiro')),
  tipo TEXT NOT NULL DEFAULT 'analitica' CHECK (tipo IN ('sintetica', 'analitica')),
  pai_id UUID REFERENCES public.plano_contas(id) ON DELETE RESTRICT,
  ativo BOOLEAN NOT NULL DEFAULT true,
  padrao BOOLEAN NOT NULL DEFAULT false,
  descricao TEXT,
  ordem INTEGER NOT NULL DEFAULT 0,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_plano_contas_natureza ON public.plano_contas(natureza);
CREATE INDEX IF NOT EXISTS idx_plano_contas_pai_id ON public.plano_contas(pai_id);
CREATE INDEX IF NOT EXISTS idx_plano_contas_ativo ON public.plano_contas(ativo);

-- Habilitar RLS em plano_contas
ALTER TABLE public.plano_contas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "plano_contas_select" ON public.plano_contas;
CREATE POLICY "plano_contas_select" ON public.plano_contas
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "plano_contas_insert" ON public.plano_contas;
CREATE POLICY "plano_contas_insert" ON public.plano_contas
  FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "plano_contas_update" ON public.plano_contas;
CREATE POLICY "plano_contas_update" ON public.plano_contas
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "plano_contas_delete" ON public.plano_contas;
CREATE POLICY "plano_contas_delete" ON public.plano_contas
  FOR DELETE TO authenticated USING (true);

-- ============================================================================
-- 2. Tabela: configuracoes_fiscais (Regime tributário da empresa)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.configuracoes_fiscais (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  regime_tributario TEXT NOT NULL CHECK (regime_tributario IN ('simples_nacional', 'lucro_presumido', 'lucro_real')),
  data_inicio_vigencia DATE NOT NULL DEFAULT CURRENT_DATE,
  data_fim_vigencia DATE,
  observacoes TEXT,
  ativo BOOLEAN NOT NULL DEFAULT true,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.configuracoes_fiscais ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "configuracoes_fiscais_select" ON public.configuracoes_fiscais;
CREATE POLICY "configuracoes_fiscais_select" ON public.configuracoes_fiscais
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "configuracoes_fiscais_insert" ON public.configuracoes_fiscais;
CREATE POLICY "configuracoes_fiscais_insert" ON public.configuracoes_fiscais
  FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "configuracoes_fiscais_update" ON public.configuracoes_fiscais;
CREATE POLICY "configuracoes_fiscais_update" ON public.configuracoes_fiscais
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "configuracoes_fiscais_delete" ON public.configuracoes_fiscais;
CREATE POLICY "configuracoes_fiscais_delete" ON public.configuracoes_fiscais
  FOR DELETE TO authenticated USING (true);

-- ============================================================================
-- 3. Tabela: aliquotas_fiscais (Alíquotas flexíveis por imposto/regime com vigência)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.aliquotas_fiscais (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  regime_tributario TEXT NOT NULL CHECK (regime_tributario IN ('simples_nacional', 'lucro_presumido', 'lucro_real')),
  nome_imposto TEXT NOT NULL, -- ex: 'DAS', 'IRPJ', 'CSLL', 'PIS', 'COFINS', 'ICMS', 'ISS'
  aliquota_percentual NUMERIC NOT NULL CHECK (aliquota_percentual >= 0),
  base_calculo_percentual NUMERIC DEFAULT 100.0, -- ex: 100% ou 8%/32% para presunção
  data_inicio_vigencia DATE NOT NULL DEFAULT CURRENT_DATE,
  data_fim_vigencia DATE,
  descricao TEXT,
  ativo BOOLEAN NOT NULL DEFAULT true,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_aliquotas_regime ON public.aliquotas_fiscais(regime_tributario);
CREATE INDEX IF NOT EXISTS idx_aliquotas_vigencia ON public.aliquotas_fiscais(data_inicio_vigencia, data_fim_vigencia);

ALTER TABLE public.aliquotas_fiscais ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "aliquotas_fiscais_select" ON public.aliquotas_fiscais;
CREATE POLICY "aliquotas_fiscais_select" ON public.aliquotas_fiscais
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "aliquotas_fiscais_insert" ON public.aliquotas_fiscais;
CREATE POLICY "aliquotas_fiscais_insert" ON public.aliquotas_fiscais
  FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "aliquotas_fiscais_update" ON public.aliquotas_fiscais;
CREATE POLICY "aliquotas_fiscais_update" ON public.aliquotas_fiscais
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "aliquotas_fiscais_delete" ON public.aliquotas_fiscais;
CREATE POLICY "aliquotas_fiscais_delete" ON public.aliquotas_fiscais
  FOR DELETE TO authenticated USING (true);

-- ============================================================================
-- 4. Adicionar colunas categoria_id e natureza em contas_pagar e contas_receber
-- ============================================================================
ALTER TABLE public.contas_pagar
  ADD COLUMN IF NOT EXISTS categoria_id UUID REFERENCES public.plano_contas(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS natureza TEXT;

ALTER TABLE public.contas_receber
  ADD COLUMN IF NOT EXISTS categoria_id UUID REFERENCES public.plano_contas(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS natureza TEXT;

CREATE INDEX IF NOT EXISTS idx_contas_pagar_categoria_id ON public.contas_pagar(categoria_id);
CREATE INDEX IF NOT EXISTS idx_contas_pagar_natureza ON public.contas_pagar(natureza);
CREATE INDEX IF NOT EXISTS idx_contas_receber_categoria_id ON public.contas_receber(categoria_id);
CREATE INDEX IF NOT EXISTS idx_contas_receber_natureza ON public.contas_receber(natureza);

-- ============================================================================
-- 5. Seed inicial das Categorias Contábeis (Plano de Contas Neutro)
-- ============================================================================
DO $$
DECLARE
  v_rec_vendas_id UUID := '10000000-0000-0000-0000-000000000001'::uuid;
  v_rec_servicos_id UUID := '10000000-0000-0000-0000-000000000002'::uuid;
  v_rec_outras_id UUID := '10000000-0000-0000-0000-000000000003'::uuid;
  v_custo_insumos_id UUID := '20000000-0000-0000-0000-000000000001'::uuid;
  v_custo_terceirizacao_id UUID := '20000000-0000-0000-0000-000000000002'::uuid;
  v_custo_montagem_id UUID := '20000000-0000-0000-0000-000000000003'::uuid;
  v_desp_aluguel_id UUID := '30000000-0000-0000-0000-000000000001'::uuid;
  v_desp_energia_id UUID := '30000000-0000-0000-0000-000000000002'::uuid;
  v_desp_folha_id UUID := '30000000-0000-0000-0000-000000000003'::uuid;
  v_desp_adm_id UUID := '30000000-0000-0000-0000-000000000004'::uuid;
  v_imp_das_id UUID := '40000000-0000-0000-0000-000000000001'::uuid;
  v_imp_irpj_csll_id UUID := '40000000-0000-0000-0000-000000000002'::uuid;
  v_imp_pis_cofins_id UUID := '40000000-0000-0000-0000-000000000003'::uuid;
  v_fin_tarifas_id UUID := '50000000-0000-0000-0000-000000000001'::uuid;
  v_fin_juros_id UUID := '50000000-0000-0000-0000-000000000002'::uuid;
BEGIN
  -- Receitas
  INSERT INTO public.plano_contas (id, nome, codigo, natureza, tipo, ativo, padrao, descricao, ordem)
  VALUES (v_rec_vendas_id, 'Venda de Projetos e Móveis', '1.1.01', 'receita', 'analitica', true, true, 'Receitas decorrentes de vendas de projetos, móveis sob medida e contratos comerciais', 10)
  ON CONFLICT (id) DO UPDATE SET nome = EXCLUDED.nome, natureza = EXCLUDED.natureza, atualizado_em = NOW();

  INSERT INTO public.plano_contas (id, nome, codigo, natureza, tipo, ativo, padrao, descricao, ordem)
  VALUES (v_rec_servicos_id, 'Prestação de Serviços', '1.1.02', 'receita', 'analitica', true, false, 'Serviços de montagem, frete cobrado, consultoria ou manutenção', 20)
  ON CONFLICT (id) DO UPDATE SET nome = EXCLUDED.nome, natureza = EXCLUDED.natureza, atualizado_em = NOW();

  INSERT INTO public.plano_contas (id, nome, codigo, natureza, tipo, ativo, padrao, descricao, ordem)
  VALUES (v_rec_outras_id, 'Outras Receitas Operacionais', '1.1.99', 'receita', 'analitica', true, false, 'Receitas avulsas e eventuais', 30)
  ON CONFLICT (id) DO UPDATE SET nome = EXCLUDED.nome, natureza = EXCLUDED.natureza, atualizado_em = NOW();

  -- Custos Diretos
  INSERT INTO public.plano_contas (id, nome, codigo, natureza, tipo, ativo, padrao, descricao, ordem)
  VALUES (v_custo_insumos_id, 'Matéria-Prima e Insumos de Produção', '2.1.01', 'custo_direto', 'analitica', true, true, 'Chapas de MDF, fitas de borda, ferragens, puxadores, colas, vernizes e compras de estoque', 40)
  ON CONFLICT (id) DO UPDATE SET nome = EXCLUDED.nome, natureza = EXCLUDED.natureza, atualizado_em = NOW();

  INSERT INTO public.plano_contas (id, nome, codigo, natureza, tipo, ativo, padrao, descricao, ordem)
  VALUES (v_custo_terceirizacao_id, 'Serviços Terceirizados de Produção', '2.1.02', 'custo_direto', 'analitica', true, false, 'Corte, usinagem, pintura ou furação terceirizada', 50)
  ON CONFLICT (id) DO UPDATE SET nome = EXCLUDED.nome, natureza = EXCLUDED.natureza, atualizado_em = NOW();

  INSERT INTO public.plano_contas (id, nome, codigo, natureza, tipo, ativo, padrao, descricao, ordem)
  VALUES (v_custo_montagem_id, 'Mão de Obra Direta e Montagem', '2.1.03', 'custo_direto', 'analitica', true, false, 'Comissões de montadores e custos diretos de instalação', 60)
  ON CONFLICT (id) DO UPDATE SET nome = EXCLUDED.nome, natureza = EXCLUDED.natureza, atualizado_em = NOW();

  -- Despesas Fixas / Operacionais
  INSERT INTO public.plano_contas (id, nome, codigo, natureza, tipo, ativo, padrao, descricao, ordem)
  VALUES (v_desp_aluguel_id, 'Aluguel do Galpão e Imóveis', '3.1.01', 'despesa_fixa', 'analitica', true, true, 'Locação de galpão industrial, showroom ou escritórios', 70)
  ON CONFLICT (id) DO UPDATE SET nome = EXCLUDED.nome, natureza = EXCLUDED.natureza, atualizado_em = NOW();

  INSERT INTO public.plano_contas (id, nome, codigo, natureza, tipo, ativo, padrao, descricao, ordem)
  VALUES (v_desp_energia_id, 'Energia, Água e Utilidades', '3.1.02', 'despesa_fixa', 'analitica', true, false, 'Contas de energia elétrica, água, internet e telefonia', 80)
  ON CONFLICT (id) DO UPDATE SET nome = EXCLUDED.nome, natureza = EXCLUDED.natureza, atualizado_em = NOW();

  INSERT INTO public.plano_contas (id, nome, codigo, natureza, tipo, ativo, padrao, descricao, ordem)
  VALUES (v_desp_folha_id, 'Folha de Pagamento e Encargos', '3.1.03', 'despesa_fixa', 'analitica', true, false, 'Salários CLT, pró-labore, adiantamentos e encargos', 90)
  ON CONFLICT (id) DO UPDATE SET nome = EXCLUDED.nome, natureza = EXCLUDED.natureza, atualizado_em = NOW();

  INSERT INTO public.plano_contas (id, nome, codigo, natureza, tipo, ativo, padrao, descricao, ordem)
  VALUES (v_desp_adm_id, 'Despesas Administrativas e Gerais', '3.1.04', 'despesa_fixa', 'analitica', true, false, 'Material de escritório, contabilidade, softwares e licenças', 100)
  ON CONFLICT (id) DO UPDATE SET nome = EXCLUDED.nome, natureza = EXCLUDED.natureza, atualizado_em = NOW();

  -- Impostos
  INSERT INTO public.plano_contas (id, nome, codigo, natureza, tipo, ativo, padrao, descricao, ordem)
  VALUES (v_imp_das_id, 'Simples Nacional (DAS)', '4.1.01', 'imposto', 'analitica', true, true, 'Guia única do Simples Nacional', 110)
  ON CONFLICT (id) DO UPDATE SET nome = EXCLUDED.nome, natureza = EXCLUDED.natureza, atualizado_em = NOW();

  INSERT INTO public.plano_contas (id, nome, codigo, natureza, tipo, ativo, padrao, descricao, ordem)
  VALUES (v_imp_irpj_csll_id, 'IRPJ / CSLL', '4.1.02', 'imposto', 'analitica', true, false, 'Impostos sobre o lucro (Lucro Presumido / Real)', 120)
  ON CONFLICT (id) DO UPDATE SET nome = EXCLUDED.nome, natureza = EXCLUDED.natureza, atualizado_em = NOW();

  INSERT INTO public.plano_contas (id, nome, codigo, natureza, tipo, ativo, padrao, descricao, ordem)
  VALUES (v_imp_pis_cofins_id, 'PIS / COFINS / ICMS / ISS', '4.1.03', 'imposto', 'analitica', true, false, 'Contribuições e impostos indiretos sobre faturamento', 130)
  ON CONFLICT (id) DO UPDATE SET nome = EXCLUDED.nome, natureza = EXCLUDED.natureza, atualizado_em = NOW();

  -- Financeiro
  INSERT INTO public.plano_contas (id, nome, codigo, natureza, tipo, ativo, padrao, descricao, ordem)
  VALUES (v_fin_tarifas_id, 'Tarifas Bancárias e Taxas de Cartão', '5.1.01', 'financeiro', 'analitica', true, true, 'Tarifas de manutenção, boletos e taxas de maquininha', 140)
  ON CONFLICT (id) DO UPDATE SET nome = EXCLUDED.nome, natureza = EXCLUDED.natureza, atualizado_em = NOW();

  INSERT INTO public.plano_contas (id, nome, codigo, natureza, tipo, ativo, padrao, descricao, ordem)
  VALUES (v_fin_juros_id, 'Juros e Multas Passivos', '5.1.02', 'financeiro', 'analitica', true, false, 'Juros pagos por atraso ou encargos financeiros de empréstimos', 150)
  ON CONFLICT (id) DO UPDATE SET nome = EXCLUDED.nome, natureza = EXCLUDED.natureza, atualizado_em = NOW();

  -- ============================================================================
  -- 6. Normalização Idempotente dos Dados Existentes
  -- ============================================================================

  -- A. Corrigir erro de digitação "Alguel" -> "Aluguel" e vincular à categoria de Aluguel
  UPDATE public.contas_pagar
  SET
    categoria = 'Aluguel',
    categoria_id = v_desp_aluguel_id,
    natureza = 'despesa_fixa',
    atualizado_em = NOW()
  WHERE categoria ILIKE 'Alguel%' OR categoria ILIKE 'Aluguel%';

  -- B. Unificar "Insumos/Estoque" e "material e insumos para a produção" -> "Matéria-Prima e Insumos de Produção" (custo_direto)
  UPDATE public.contas_pagar
  SET
    categoria = 'Matéria-Prima e Insumos de Produção',
    categoria_id = v_custo_insumos_id,
    natureza = 'custo_direto',
    atualizado_em = NOW()
  WHERE categoria ILIKE 'Insumos/Estoque%'
     OR categoria ILIKE '%material e insumos%'
     OR nota_fiscal_id IS NOT NULL;

  -- C. Preencher contas a pagar restantes sem natureza
  UPDATE public.contas_pagar
  SET
    natureza = 'custo_direto',
    categoria_id = COALESCE(categoria_id, v_custo_insumos_id),
    atualizado_em = NOW()
  WHERE natureza IS NULL;

  -- D. Unificar "Venda" e "Venda de Projetos" -> "Venda de Projetos e Móveis" (receita)
  UPDATE public.contas_receber
  SET
    categoria = 'Venda de Projetos e Móveis',
    categoria_id = v_rec_vendas_id,
    natureza = 'receita',
    atualizado_em = NOW()
  WHERE categoria ILIKE 'Venda%' OR categoria IS NULL;

  -- E. Preencher contas a receber restantes sem natureza
  UPDATE public.contas_receber
  SET
    natureza = 'receita',
    categoria_id = COALESCE(categoria_id, v_rec_vendas_id),
    atualizado_em = NOW()
  WHERE natureza IS NULL;

  -- ============================================================================
  -- 7. Seed de Configuração Fiscal Inicial (Simples Nacional ativo)
  -- ============================================================================
  IF NOT EXISTS (SELECT 1 FROM public.configuracoes_fiscais WHERE ativo = true) THEN
    INSERT INTO public.configuracoes_fiscais (
      id, regime_tributario, data_inicio_vigencia, observacoes, ativo
    ) VALUES (
      '00000000-0000-0000-0000-000000000001'::uuid,
      'simples_nacional',
      '2024-01-01',
      'Regime tributário atual da fábrica (Simples Nacional - Anexo II/III)',
      true
    ) ON CONFLICT (id) DO NOTHING;
  END IF;

  -- Alíquotas padrão para Simples Nacional e Lucro Presumido/Real
  IF NOT EXISTS (SELECT 1 FROM public.aliquotas_fiscais) THEN
    -- Simples Nacional
    INSERT INTO public.aliquotas_fiscais (regime_tributario, nome_imposto, aliquota_percentual, base_calculo_percentual, data_inicio_vigencia, descricao, ativo)
    VALUES
      ('simples_nacional', 'DAS (Simples Nacional)', 6.0, 100.0, '2024-01-01', 'Guia única Simples Nacional sobre faturamento', true),
    -- Lucro Presumido
      ('lucro_presumido', 'IRPJ', 15.0, 8.0, '2024-01-01', 'Imposto de Renda Pessoa Jurídica (Base Presunção 8%)', true),
      ('lucro_presumido', 'CSLL', 9.0, 12.0, '2024-01-01', 'Contribuição Social sobre Lucro Líquido (Base 12%)', true),
      ('lucro_presumido', 'PIS (Cumulativo)', 0.65, 100.0, '2024-01-01', 'Programa de Integração Social', true),
      ('lucro_presumido', 'COFINS (Cumulativo)', 3.00, 100.0, '2024-01-01', 'Contribuição Financiamento Seguridade Social', true),
    -- Lucro Real
      ('lucro_real', 'IRPJ', 15.0, 100.0, '2024-01-01', 'IRPJ 15% sobre o Lucro Real apurado', true),
      ('lucro_real', 'Adicional IRPJ', 10.0, 100.0, '2024-01-01', 'Adicional de 10% sobre lucro excedente a R$ 20k/mês', true),
      ('lucro_real', 'CSLL', 9.0, 100.0, '2024-01-01', 'CSLL 9% sobre o Lucro Real apurado', true),
      ('lucro_real', 'PIS (Não Cumulativo)', 1.65, 100.0, '2024-01-01', 'PIS Não Cumulativo com direito a crédito de compras', true),
      ('lucro_real', 'COFINS (Não Cumulativo)', 7.60, 100.0, '2024-01-01', 'COFINS Não Cumulativo com direito a crédito de compras', true);
  END IF;
END $$;

-- ============================================================================
-- 8. Atualizar trigger auto_create_conta_pagar_from_nota com categoria e natureza automáticas
-- ============================================================================
CREATE OR REPLACE FUNCTION public.auto_create_conta_pagar_from_nota()
RETURNS trigger AS $$
DECLARE
  v_insumo_id UUID := '20000000-0000-0000-0000-000000000001'::uuid;
BEGIN
  -- Idempotency: skip if conta_pagar already exists for this nota_fiscal
  IF NOT EXISTS (
    SELECT 1 FROM public.contas_pagar
    WHERE nota_fiscal_id = NEW.id
  ) THEN
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
      NOW(),
      NOW()
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_nota_fiscal_created ON public.notas_fiscais;
CREATE TRIGGER on_nota_fiscal_created
  AFTER INSERT ON public.notas_fiscais
  FOR EACH ROW EXECUTE FUNCTION public.auto_create_conta_pagar_from_nota();

-- ============================================================================
-- 9. Atualizar função insert_conta_pagar_with_divisoes com categoria_id e natureza
-- ============================================================================
DROP FUNCTION IF EXISTS public.insert_conta_pagar_with_divisoes(text, text, numeric, date, text, uuid, uuid, integer, jsonb, uuid, text) CASCADE;
DROP FUNCTION IF EXISTS public.insert_conta_pagar_with_divisoes(text, text, numeric, date, text, uuid, uuid, integer, jsonb, uuid, text, uuid, text) CASCADE;

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
  p_natureza text DEFAULT NULL
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
      criado_em, atualizado_em
    ) VALUES (
      p_user_id, p_fornecedor, p_descricao, p_valor, v_current_date,
      p_categoria, p_categoria_id, v_nat, 'aguardando', p_conta_bancaria_id, p_grupo_id, p_observacoes,
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

GRANT EXECUTE ON FUNCTION public.insert_conta_pagar_with_divisoes(text, text, numeric, date, text, uuid, uuid, integer, jsonb, uuid, text, uuid, text) TO authenticated;
