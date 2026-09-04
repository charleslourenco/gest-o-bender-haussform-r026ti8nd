-- Migration: 20260904020000_higienizacao_naturezas_e_duplicatas.sql
-- 1. Preencher natureza e categoria_id faltantes em contas_receber (Ivanice Favil e eventuais outras)
-- 2. Garantir que contas_pagar com natureza vazia recebam natureza e categoria contábil adequadas
-- 3. Consolidar registros duplicados de contratos unificados sem projeto vinculado (ex: Dieter Kuhr e Margarete Colossi)

DO $$
DECLARE
  v_rec_vendas_id UUID := '10000000-0000-0000-0000-000000000001'::uuid;
  v_custo_insumos_id UUID := '20000000-0000-0000-0000-000000000001'::uuid;
  v_desp_aluguel_id UUID := '30000000-0000-0000-0000-000000000001'::uuid;
BEGIN
  -- 1. Preencher natureza de contas_receber onde está NULL ou vazia
  UPDATE public.contas_receber
  SET
    natureza = 'receita',
    categoria = COALESCE(NULLIF(categoria, ''), 'Venda de Projetos e Móveis'),
    categoria_id = COALESCE(categoria_id, v_rec_vendas_id),
    atualizado_em = NOW()
  WHERE natureza IS NULL OR trim(natureza) = '';

  -- 2. Garantir que contas_pagar sem natureza recebam natureza adequada conforme descrição/categoria
  UPDATE public.contas_pagar
  SET
    natureza = 'despesa_fixa',
    categoria = 'Aluguel',
    categoria_id = COALESCE(categoria_id, v_desp_aluguel_id),
    atualizado_em = NOW()
  WHERE (natureza IS NULL OR trim(natureza) = '')
    AND (categoria ILIKE '%aluguel%' OR descricao ILIKE '%aluguel%');

  UPDATE public.contas_pagar
  SET
    natureza = 'custo_direto',
    categoria = COALESCE(NULLIF(categoria, ''), 'Matéria-Prima e Insumos de Produção'),
    categoria_id = COALESCE(categoria_id, v_custo_insumos_id),
    atualizado_em = NOW()
  WHERE natureza IS NULL OR trim(natureza) = '';

  -- 3. Consolidação de duplicatas de receitas:
  -- Dieter Kuhr e Margarete Colossi têm lançamentos de 'Contrato Unificado de Soluções para Interiores'
  -- criados com parcela 1/1 sem formulario_comercial_id, cujo valor é a soma exata das parcelas
  -- registradas com vínculo direto a seus respectivos formulario_comercial_id.
  -- Excluir as duplicatas sem vínculo de projeto para evitar dupla contagem.
  DELETE FROM public.contas_receber
  WHERE formulario_comercial_id IS NULL
    AND descricao ILIKE '%Contrato Unificado%'
    AND valor > 0;

  -- Também limpar eventual contrato unificado residual com valor zerado e sem cliente
  DELETE FROM public.contas_receber
  WHERE formulario_comercial_id IS NULL
    AND cliente_id IS NULL
    AND valor = 0
    AND descricao ILIKE '%Contrato Unificado%';

END $$;
