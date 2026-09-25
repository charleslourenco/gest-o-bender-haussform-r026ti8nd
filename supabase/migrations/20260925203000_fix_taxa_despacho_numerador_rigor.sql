-- Migration: 20260925203000_fix_taxa_despacho_numerador_rigor.sql
-- Correção de rigor da métrica "Taxa de Despacho" na sub-aba Novo Contato da função public.get_dashboard_metrics:
-- Adicionar ao numerador de despachados_real o MESMO filtro de categorias comerciais aplicado no denominador:
-- COALESCE(TRIM(l.categoria), 'Comercial') NOT IN ('Currículo', 'Fornecedor', 'Parceiro', 'Assistência', 'Outros Assuntos')
-- Mantendo a única assinatura existente: (p_start_date timestamptz, p_end_date timestamptz)

CREATE OR REPLACE FUNCTION public.get_dashboard_metrics(
  p_start_date timestamp with time zone DEFAULT NULL::timestamp with time zone,
  p_end_date timestamp with time zone DEFAULT NULL::timestamp with time zone
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  v_result JSONB;
  v_effective_start TIMESTAMPTZ;
  v_effective_end TIMESTAMPTZ;

  -- Variáveis Aba 1: Atendimentos (Apenas leads pertencentes às 4 abas comerciais com origem válida)
  v_leads_total INT := 0;
  v_leads_convertidos INT := 0;
  v_taxa_conversao NUMERIC := 0;
  v_leads_media_dia NUMERIC := 0;
  v_vendas_com_data_qtd INT := 0;
  v_vendas_total_para_cobertura INT := 0;
  v_status_atendimento JSONB;
  v_origens JSONB;
  v_ticket_medio_origens JSONB;
  v_ciclo_vendas JSONB;
  v_motivos_perda JSONB;
  v_evolucao_mensal JSONB;
  v_dias_semana JSONB;
  v_leads_sem_origem JSONB;
  v_leads_sem_consultor_consultoria JSONB;

  -- Sub-abas operacionais sem filtro de origem válida
  v_novo_contato JSONB;
  v_orcamentos JSONB;
  v_consultoria JSONB;

  -- Tempo dos leads por coluna (operação HOJE na esteira)
  v_tempo_colunas JSONB;

  -- Variáveis Aba 2: Clientes & Vendas
  v_novos_clientes INT := 0;
  v_valor_vendido NUMERIC := 0;
  v_ticket_medio NUMERIC := 0;
  v_ticket_mediana NUMERIC := 0;
  v_menor_ticket NUMERIC := 0;
  v_maior_ticket NUMERIC := 0;
  v_total_formularios_valor INT := 0;
  v_total_formularios_vendidos INT := 0;
  v_valor_vendido_fechado NUMERIC := 0;
  v_maior_ticket_percentual NUMERIC := 0;
  v_ranking_consultores JSONB;
  v_por_consultor JSONB;

  -- Variáveis Aba 3: PCP
  v_total_ambientes INT := 0;
  v_total_clientes_pcp INT := 0;
  v_ambientes_por_cliente NUMERIC := 0;
  v_tempo_total_medio NUMERIC := NULL;
  v_taxa_pendencias NUMERIC := 0;
  v_fases_ambientes JSONB;
  v_tempo_fases JSONB;
  v_fase_gargalo TEXT := NULL;
  v_carga_analista JSONB;
  v_carga_montagem JSONB;

  -- Variáveis Aba 4: Gestão de Pessoas
  v_total_clt INT := 0;
  v_total_pj INT := 0;
  v_total_montadores INT := 0;
  v_total_fornecedores INT := 0;
  v_idade_media_clt NUMERIC := 0;
  v_tempo_medio_meses_clt NUMERIC := 0;
  v_lista_clt JSONB;
  v_lista_pj JSONB;
  v_lista_fornecedores JSONB;
  v_aniversariantes JSONB;
  v_distribuicao_tempo_casa JSONB;
BEGIN
  v_effective_start := COALESCE(p_start_date, '1970-01-01'::timestamptz);
  v_effective_end := COALESCE(p_end_date, NOW());

  -------------------------------------------------------------
  -- CAMPO: leads_sem_origem (todos os leads Comerciais não excluídos sem origem válida)
  -- SEM o filtro das 4 abas (para o aviso continuar vendo todo o passivo comercial)
  -------------------------------------------------------------
  SELECT jsonb_build_object(
    'total', COUNT(*),
    'convertidos', COUNT(*) FILTER (WHERE l.status IN ('Vendido', 'Cliente Ganho', 'Fechado', 'Contrato Fechado', 'Ganho') OR l.data_venda IS NOT NULL)
  )
  INTO v_leads_sem_origem
  FROM public.leads l
  WHERE (l.excluido = false OR l.excluido IS NULL)
    AND COALESCE(TRIM(l.categoria), 'Comercial') = 'Comercial'
    AND (
      l.origem IS NULL
      OR TRIM(l.origem) = ''
      OR LOWER(TRIM(l.origem)) IN ('whatsapp', 'a definir', 'sem origem')
    )
    AND l.criado_em >= v_effective_start
    AND l.criado_em <= v_effective_end;

  -------------------------------------------------------------
  -- CAMPO: leads_sem_consultor_consultoria (leads Comerciais não excluídos da aba 'lead-consultoria' sem consultor_id)
  -- Aplica a mesma regra da pílula em LeadsSemOrigem.tsx e da esteira comercial
  -------------------------------------------------------------
  SELECT jsonb_build_object(
    'total', COUNT(*),
    'convertidos', COUNT(*) FILTER (WHERE l.status IN ('Vendido', 'Cliente Ganho', 'Fechado', 'Contrato Fechado', 'Ganho') OR l.data_venda IS NOT NULL)
  )
  INTO v_leads_sem_consultor_consultoria
  FROM public.leads l
  WHERE (l.excluido = false OR l.excluido IS NULL)
    AND COALESCE(TRIM(l.categoria), 'Comercial') = 'Comercial'
    AND (l.consultor_id IS NULL OR TRIM(l.consultor_id::text) = '')
    AND TRIM(l.status) IN (
      'Consultoria Inicial', 'Projeto', 'Apresentação', 'Negociação',
      'Stand By', 'Vendido', 'Perdido', 'Aguardando Consultor',
      'Ação Gerente', 'Designar Consultor'
    )
    AND l.criado_em >= v_effective_start
    AND l.criado_em <= v_effective_end;

  -------------------------------------------------------------
  -- ABA 1: ATENDIMENTOS (LEADS)
  -- Critérios:
  -- (a) Pertencem às abas 'novo-contato', 'lead-consultoria', 'lead-followup' ou 'lead-orcamentos' (leadBelongsToAba)
  -- (b) Origem NÃO seja 'WhatsApp', 'A definir', vazia/nula nem 'sem origem'
  -------------------------------------------------------------
  WITH leads_filtrados AS (
    SELECT l.*
    FROM public.leads l
    WHERE (l.excluido = false OR l.excluido IS NULL)
      -- Critério (b): Origem válida
      AND l.origem IS NOT NULL
      AND TRIM(l.origem) <> ''
      AND LOWER(TRIM(l.origem)) NOT IN ('whatsapp', 'a definir', 'sem origem')
      -- Critério (a): Pertencem a uma das 4 abas
      AND (
        -- Aba 01: novo-contato
        (
          l.status LIKE 'SDR:%'
          OR l.status IN ('Novo contato', 'Novo Contato', 'Novo Lead', 'Novo', 'Despachados', 'Encaminhado Para')
          OR (
            COALESCE(TRIM(l.categoria), 'Comercial') = 'Comercial'
            AND (l.kanban_ativo = false OR l.kanban_ativo IS NULL)
            AND COALESCE(TRIM(l.status), '') NOT IN ('Consultoria Inicial', 'Projeto', 'Apresentação', 'Negociação', 'Stand By', 'Vendido', 'Perdido', 'Aguardando Consultor', 'Ação Gerente', 'Designar Consultor')
          )
        )
        OR
        -- Aba 02: lead-consultoria
        (
          COALESCE(TRIM(l.categoria), 'Comercial') IN ('Comercial', 'Já é Cliente')
          AND TRIM(l.status) IN ('Consultoria Inicial', 'Projeto', 'Apresentação', 'Negociação', 'Stand By', 'Vendido', 'Perdido', 'Aguardando Consultor', 'Ação Gerente', 'Designar Consultor')
        )
        OR
        -- Aba 03: lead-followup
        (
          LOWER(COALESCE(TRIM(l.categoria), 'Comercial')) = 'follow up'
          OR TRIM(l.status) IN ('Follow up', 'Encaminhado p/ Consultoria')
        )
        OR
        -- Aba 05: lead-orcamentos
        (
          CASE
            WHEN TRIM(l.status) = 'Vendido' THEN
              LOWER(COALESCE(TRIM(l.categoria), 'Comercial')) IN ('orçamento', 'orcamento')
            ELSE
              LOWER(COALESCE(TRIM(l.categoria), 'Comercial')) IN ('orçamento', 'orcamento')
              OR TRIM(l.status) IN ('Novo Orçamento', 'Em andamento', 'Orçamento Concluido', 'Orçamento Concluído', 'Encaminhado')
          END
        )
      )
  )
  SELECT
    COUNT(*),
    COUNT(*) FILTER (WHERE (l.status IN ('Vendido', 'Cliente Ganho', 'Fechado', 'Contrato Fechado', 'Ganho') OR l.data_venda IS NOT NULL)),
    COUNT(*) FILTER (WHERE (l.status IN ('Vendido', 'Cliente Ganho', 'Fechado', 'Contrato Fechado', 'Ganho') OR l.data_venda IS NOT NULL) AND l.data_venda IS NOT NULL)
  INTO v_leads_total, v_leads_convertidos, v_vendas_com_data_qtd
  FROM leads_filtrados l
  WHERE l.criado_em >= v_effective_start
    AND l.criado_em <= v_effective_end;

  v_vendas_total_para_cobertura := v_leads_convertidos;
  v_taxa_conversao := CASE WHEN v_leads_total > 0 THEN ROUND((v_leads_convertidos::numeric / v_leads_total::numeric) * 100, 1) ELSE 0 END;
  v_leads_media_dia := ROUND((v_leads_total::numeric / GREATEST(1, EXTRACT(DAY FROM (v_effective_end - v_effective_start))))::numeric, 1);

  -- Status de atendimento para leads filtrados das 4 abas com origem válida
  SELECT jsonb_agg(row_to_json(t))
  INTO v_status_atendimento
  FROM (
    WITH leads_filtrados AS (
      SELECT l.*
      FROM public.leads l
      WHERE (l.excluido = false OR l.excluido IS NULL)
        AND l.origem IS NOT NULL
        AND TRIM(l.origem) <> ''
        AND LOWER(TRIM(l.origem)) NOT IN ('whatsapp', 'a definir', 'sem origem')
        AND (
          (
            l.status LIKE 'SDR:%'
            OR l.status IN ('Novo contato', 'Novo Contato', 'Novo Lead', 'Novo', 'Despachados', 'Encaminhado Para')
            OR (
              COALESCE(TRIM(l.categoria), 'Comercial') = 'Comercial'
              AND (l.kanban_ativo = false OR l.kanban_ativo IS NULL)
              AND COALESCE(TRIM(l.status), '') NOT IN ('Consultoria Inicial', 'Projeto', 'Apresentação', 'Negociação', 'Stand By', 'Vendido', 'Perdido', 'Aguardando Consultor', 'Ação Gerente', 'Designar Consultor')
            )
          )
          OR
          (
            COALESCE(TRIM(l.categoria), 'Comercial') IN ('Comercial', 'Já é Cliente')
            AND TRIM(l.status) IN ('Consultoria Inicial', 'Projeto', 'Apresentação', 'Negociação', 'Stand By', 'Vendido', 'Perdido', 'Aguardando Consultor', 'Ação Gerente', 'Designar Consultor')
          )
          OR
          (
            LOWER(COALESCE(TRIM(l.categoria), 'Comercial')) = 'follow up'
            OR TRIM(l.status) IN ('Follow up', 'Encaminhado p/ Consultoria')
          )
          OR
          (
            CASE
              WHEN TRIM(l.status) = 'Vendido' THEN
                LOWER(COALESCE(TRIM(l.categoria), 'Comercial')) IN ('orçamento', 'orcamento')
              ELSE
                LOWER(COALESCE(TRIM(l.categoria), 'Comercial')) IN ('orçamento', 'orcamento')
                OR TRIM(l.status) IN ('Novo Orçamento', 'Em andamento', 'Orçamento Concluido', 'Orçamento Concluído', 'Encaminhado')
            END
          )
        )
    )
    SELECT
      CASE
        WHEN status_atendimento = 'em_atendimento' THEN 'em_atendimento'
        WHEN status_atendimento = 'aguardando_resposta' THEN 'aguardando_resposta'
        ELSE 'nao_informado'
      END as status,
      COUNT(*) as count
    FROM leads_filtrados
    WHERE criado_em >= v_effective_start
      AND criado_em <= v_effective_end
    GROUP BY
      CASE
        WHEN status_atendimento = 'em_atendimento' THEN 'em_atendimento'
        WHEN status_atendimento = 'aguardando_resposta' THEN 'aguardando_resposta'
        ELSE 'nao_informado'
      END
    ORDER BY count DESC
  ) t;

  -- Origens dos leads das 4 abas com origem válida
  SELECT jsonb_agg(row_to_json(t))
  INTO v_origens
  FROM (
    WITH origens_padrao AS (
      SELECT unnest(ARRAY[
        'Instagram',
        'Indicação',
        'Recompra',
        'Google',
        'Meta Ads',
        'Corretor',
        'Porta',
        'Arquiteto',
        'Bender Conecta'
      ]) as origem_nome
    ),
    leads_filtrados AS (
      SELECT l.*
      FROM public.leads l
      WHERE (l.excluido = false OR l.excluido IS NULL)
        AND l.origem IS NOT NULL
        AND TRIM(l.origem) <> ''
        AND LOWER(TRIM(l.origem)) NOT IN ('whatsapp', 'a definir', 'sem origem')
        AND (
          (
            l.status LIKE 'SDR:%'
            OR l.status IN ('Novo contato', 'Novo Contato', 'Novo Lead', 'Novo', 'Despachados', 'Encaminhado Para')
            OR (
              COALESCE(TRIM(l.categoria), 'Comercial') = 'Comercial'
              AND (l.kanban_ativo = false OR l.kanban_ativo IS NULL)
              AND COALESCE(TRIM(l.status), '') NOT IN ('Consultoria Inicial', 'Projeto', 'Apresentação', 'Negociação', 'Stand By', 'Vendido', 'Perdido', 'Aguardando Consultor', 'Ação Gerente', 'Designar Consultor')
            )
          )
          OR
          (
            COALESCE(TRIM(l.categoria), 'Comercial') IN ('Comercial', 'Já é Cliente')
            AND TRIM(l.status) IN ('Consultoria Inicial', 'Projeto', 'Apresentação', 'Negociação', 'Stand By', 'Vendido', 'Perdido', 'Aguardando Consultor', 'Ação Gerente', 'Designar Consultor')
          )
          OR
          (
            LOWER(COALESCE(TRIM(l.categoria), 'Comercial')) = 'follow up'
            OR TRIM(l.status) IN ('Follow up', 'Encaminhado p/ Consultoria')
          )
          OR
          (
            CASE
              WHEN TRIM(l.status) = 'Vendido' THEN
                LOWER(COALESCE(TRIM(l.categoria), 'Comercial')) IN ('orçamento', 'orcamento')
              ELSE
                LOWER(COALESCE(TRIM(l.categoria), 'Comercial')) IN ('orçamento', 'orcamento')
                OR TRIM(l.status) IN ('Novo Orçamento', 'Em andamento', 'Orçamento Concluido', 'Orçamento Concluído', 'Encaminhado')
            END
          )
        )
    ),
    contagem AS (
      SELECT
        CASE
          WHEN TRIM(l.origem) ILIKE 'bender conecta' THEN 'Bender Conecta'
          WHEN TRIM(l.origem) = 'Instagram' OR TRIM(l.origem) ILIKE '%insta%' THEN 'Instagram'
          WHEN TRIM(l.origem) = 'Google' OR TRIM(l.origem) ILIKE '%goog%' THEN 'Google'
          WHEN TRIM(l.origem) = 'Meta Ads' OR TRIM(l.origem) ILIKE '%meta%' OR TRIM(l.origem) ILIKE '%face%' THEN 'Meta Ads'
          WHEN TRIM(l.origem) = 'Recompra' OR TRIM(l.origem) ILIKE '%recomp%' THEN 'Recompra'
          WHEN TRIM(l.origem) = 'Corretor' OR TRIM(l.origem) ILIKE '%corret%' THEN 'Corretor'
          WHEN TRIM(l.origem) = 'Arquiteto' OR TRIM(l.origem) ILIKE '%arquit%' THEN 'Arquiteto'
          WHEN TRIM(l.origem) = 'Indicação' OR TRIM(l.origem) ILIKE '%indic%' THEN 'Indicação'
          WHEN TRIM(l.origem) = 'Porta' OR TRIM(l.origem) ILIKE '%porta%' THEN 'Porta'
          ELSE TRIM(l.origem)
        END as canal,
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE l.status IN ('Vendido', 'Cliente Ganho', 'Fechado', 'Contrato Fechado', 'Ganho') OR l.data_venda IS NOT NULL) as convertidos
      FROM leads_filtrados l
      WHERE l.criado_em >= v_effective_start
        AND l.criado_em <= v_effective_end
      GROUP BY 1
    )
    SELECT
      op.origem_nome as origem,
      COALESCE(c.total, 0) as total,
      COALESCE(c.convertidos, 0) as convertidos,
      CASE WHEN COALESCE(c.total, 0) > 0 THEN ROUND((COALESCE(c.convertidos, 0)::numeric / c.total::numeric) * 100, 1) ELSE 0 END as taxa,
      ROUND((COALESCE(c.total, 0)::numeric / GREATEST(1, v_leads_total)::numeric) * 100, 1) as percentual
    FROM origens_padrao op
    LEFT JOIN contagem c ON op.origem_nome = c.canal
    ORDER BY COALESCE(c.total, 0) DESC, op.origem_nome ASC
  ) t;

  -------------------------------------------------------------
  -- CAMPO: ticket_medio_origens
  -------------------------------------------------------------
  SELECT jsonb_agg(row_to_json(t))
  INTO v_ticket_medio_origens
  FROM (
    WITH leads_vendidos AS (
      SELECT l.*
      FROM public.leads l
      WHERE (l.excluido = false OR l.excluido IS NULL)
        AND l.origem IS NOT NULL
        AND TRIM(l.origem) <> ''
        AND LOWER(TRIM(l.origem)) NOT IN ('whatsapp', 'a definir', 'sem origem')
        AND TRIM(l.status) = 'Vendido'
        AND (
          (
            COALESCE(TRIM(l.categoria), 'Comercial') IN ('Comercial', 'Já é Cliente')
            AND TRIM(l.status) IN ('Consultoria Inicial', 'Projeto', 'Apresentação', 'Negociação', 'Stand By', 'Vendido', 'Perdido', 'Aguardando Consultor', 'Ação Gerente', 'Designar Consultor')
          )
          OR
          (
            CASE
              WHEN TRIM(l.status) = 'Vendido' THEN
                LOWER(COALESCE(TRIM(l.categoria), 'Comercial')) IN ('orçamento', 'orcamento')
              ELSE
                LOWER(COALESCE(TRIM(l.categoria), 'Comercial')) IN ('orçamento', 'orcamento')
                OR TRIM(l.status) IN ('Novo Orçamento', 'Em andamento', 'Orçamento Concluido', 'Orçamento Concluído', 'Encaminhado')
            END
          )
        )
        AND (
          (l.data_venda IS NOT NULL AND l.data_venda >= v_effective_start AND l.data_venda <= v_effective_end)
          OR
          (l.data_venda IS NULL AND l.criado_em >= v_effective_start AND l.criado_em <= v_effective_end)
        )
    )
    SELECT
      CASE
        WHEN TRIM(l.origem) ILIKE 'bender conecta' THEN 'Bender Conecta'
        WHEN TRIM(l.origem) = 'Instagram' OR TRIM(l.origem) ILIKE '%insta%' THEN 'Instagram'
        WHEN TRIM(l.origem) = 'Google' OR TRIM(l.origem) ILIKE '%goog%' THEN 'Google'
        WHEN TRIM(l.origem) = 'Meta Ads' OR TRIM(l.origem) ILIKE '%meta%' OR TRIM(l.origem) ILIKE '%face%' THEN 'Meta Ads'
        WHEN TRIM(l.origem) = 'Recompra' OR TRIM(l.origem) ILIKE '%recomp%' THEN 'Recompra'
        WHEN TRIM(l.origem) = 'Corretor' OR TRIM(l.origem) ILIKE '%corret%' THEN 'Corretor'
        WHEN TRIM(l.origem) = 'Arquiteto' OR TRIM(l.origem) ILIKE '%arquit%' THEN 'Arquiteto'
        WHEN TRIM(l.origem) = 'Indicação' OR TRIM(l.origem) ILIKE '%indic%' THEN 'Indicação'
        WHEN TRIM(l.origem) = 'Porta' OR TRIM(l.origem) ILIKE '%porta%' THEN 'Porta'
        ELSE TRIM(l.origem)
      END as origem,
      COUNT(fc.id)::int as qtd_vendas,
      ROUND(COALESCE(SUM(fc.valor_total), 0)::numeric, 2) as valor_total,
      CASE
        WHEN COUNT(fc.id) > 0 THEN
          ROUND((COALESCE(SUM(fc.valor_total), 0) / COUNT(fc.id))::numeric, 2)
        ELSE 0
      END as ticket_medio
    FROM leads_vendidos l
    JOIN public.formulario_comercial fc ON fc.lead_id = l.id
    GROUP BY 1
    HAVING COUNT(fc.id) > 0
    ORDER BY ticket_medio DESC, valor_total DESC
  ) t;

  -------------------------------------------------------------
  -- CAMPO: ciclo_vendas (geral + por_origem)
  -------------------------------------------------------------
  WITH leads_elegiveis_ciclo AS (
    SELECT
      CASE
        WHEN TRIM(l.origem) ILIKE 'bender conecta' THEN 'Bender Conecta'
        WHEN TRIM(l.origem) = 'Instagram' OR TRIM(l.origem) ILIKE '%insta%' THEN 'Instagram'
        WHEN TRIM(l.origem) = 'Google' OR TRIM(l.origem) ILIKE '%goog%' THEN 'Google'
        WHEN TRIM(l.origem) = 'Meta Ads' OR TRIM(l.origem) ILIKE '%meta%' OR TRIM(l.origem) ILIKE '%face%' THEN 'Meta Ads'
        WHEN TRIM(l.origem) = 'Recompra' OR TRIM(l.origem) ILIKE '%recomp%' THEN 'Recompra'
        WHEN TRIM(l.origem) = 'Corretor' OR TRIM(l.origem) ILIKE '%corret%' THEN 'Corretor'
        WHEN TRIM(l.origem) = 'Arquiteto' OR TRIM(l.origem) ILIKE '%arquit%' THEN 'Arquiteto'
        WHEN TRIM(l.origem) = 'Indicação' OR TRIM(l.origem) ILIKE '%indic%' THEN 'Indicação'
        WHEN TRIM(l.origem) = 'Porta' OR TRIM(l.origem) ILIKE '%porta%' THEN 'Porta'
        ELSE TRIM(l.origem)
      END as origem_padronizada,
      GREATEST(extract(epoch from (
        COALESCE(nullif(fc.datas->>'data_venda','')::timestamptz, data_venda) - l.criado_em
      ))/86400.0, 0) as ciclo_dias,
      COALESCE(nullif(fc.datas->>'data_venda','')::timestamptz, data_venda) as effective_data_venda
    FROM public.leads l
    LEFT JOIN public.formulario_comercial fc ON fc.lead_id = l.id
    WHERE (l.excluido = false OR l.excluido IS NULL)
      AND l.origem IS NOT NULL
      AND TRIM(l.origem) <> ''
      AND LOWER(TRIM(l.origem)) NOT IN ('whatsapp', 'a definir', 'sem origem')
      AND TRIM(l.status) = 'Vendido'
      AND (
        (
          COALESCE(TRIM(l.categoria), 'Comercial') IN ('Comercial', 'Já é Cliente')
          AND TRIM(l.status) IN ('Consultoria Inicial', 'Projeto', 'Apresentação', 'Negociação', 'Stand By', 'Vendido', 'Perdido', 'Aguardando Consultor', 'Ação Gerente', 'Designar Consultor')
        )
        OR
        (
          CASE
            WHEN TRIM(l.status) = 'Vendido' THEN
              LOWER(COALESCE(TRIM(l.categoria), 'Comercial')) IN ('orçamento', 'orcamento')
            ELSE
              LOWER(COALESCE(TRIM(l.categoria), 'Comercial')) IN ('orçamento', 'orcamento')
              OR TRIM(l.status) IN ('Novo Orçamento', 'Em andamento', 'Orçamento Concluido', 'Orçamento Concluído', 'Encaminhado')
          END
        )
      )
  ),
  vendas_no_periodo AS (
    SELECT
      origem_padronizada,
      ciclo_dias
    FROM leads_elegiveis_ciclo
    WHERE effective_data_venda IS NOT NULL
      AND effective_data_venda >= v_effective_start
      AND effective_data_venda <= v_effective_end
  ),
  geral_ciclo AS (
    SELECT
      ROUND(COALESCE(AVG(ciclo_dias), 0)::numeric, 1) as media_dias,
      ROUND(COALESCE(percentile_cont(0.5) WITHIN GROUP (ORDER BY ciclo_dias), 0)::numeric, 1) as mediana_dias,
      ROUND(COALESCE(MIN(ciclo_dias), 0)::numeric, 1) as min_dias,
      ROUND(COALESCE(MAX(ciclo_dias), 0)::numeric, 1) as max_dias,
      COUNT(*)::int as qtd_vendas
    FROM vendas_no_periodo
  ),
  por_origem_ciclo AS (
    SELECT
      origem_padronizada as origem,
      COUNT(*)::int as qtd_vendas,
      ROUND(AVG(ciclo_dias)::numeric, 1) as ciclo_medio_dias,
      ROUND(MIN(ciclo_dias)::numeric, 1) as ciclo_min_dias,
      ROUND(MAX(ciclo_dias)::numeric, 1) as ciclo_max_dias
    FROM vendas_no_periodo
    GROUP BY origem_padronizada
    HAVING COUNT(*) > 0
    ORDER BY ciclo_medio_dias ASC, qtd_vendas DESC, origem_padronizada ASC
  )
  SELECT jsonb_build_object(
    'geral', (SELECT row_to_json(g) FROM geral_ciclo g),
    'por_origem', COALESCE((SELECT jsonb_agg(row_to_json(po)) FROM por_origem_ciclo po), '[]'::jsonb)
  )
  INTO v_ciclo_vendas;

  -------------------------------------------------------------
  -- CAMPO: motivos_perda
  -------------------------------------------------------------
  WITH leads_perdas_base AS (
    SELECT l.*
    FROM public.leads l
    WHERE (l.excluido = false OR l.excluido IS NULL)
      AND l.motivo_perda IS NOT NULL
      AND TRIM(l.motivo_perda) <> ''
      AND (
        l.status IN ('Perdido', 'SDR: Perdido')
        OR (
          (
            l.status LIKE 'SDR:%'
            OR l.status IN ('Novo contato', 'Novo Contato', 'Novo Lead', 'Novo', 'Despachados', 'Encaminhado Para')
            OR (
              COALESCE(TRIM(l.categoria), 'Comercial') = 'Comercial'
              AND (l.kanban_ativo = false OR l.kanban_ativo IS NULL)
              AND COALESCE(TRIM(l.status), '') NOT IN ('Consultoria Inicial', 'Projeto', 'Apresentação', 'Negociação', 'Stand By', 'Vendido', 'Aguardando Consultor', 'Ação Gerente', 'Designar Consultor')
            )
          )
          OR
          (
            COALESCE(TRIM(l.categoria), 'Comercial') IN ('Comercial', 'Já é Cliente')
            AND TRIM(l.status) IN ('Consultoria Inicial', 'Projeto', 'Apresentação', 'Negociação', 'Stand By', 'Vendido', 'Aguardando Consultor', 'Ação Gerente', 'Designar Consultor')
          )
          OR
          (
            LOWER(COALESCE(TRIM(l.categoria), 'Comercial')) = 'follow up'
            OR TRIM(l.status) IN ('Follow up', 'Encaminhado p/ Consultoria')
          )
          OR
          (
            LOWER(COALESCE(TRIM(l.categoria), 'Comercial')) IN ('orçamento', 'orcamento')
            OR TRIM(l.status) IN ('Novo Orçamento', 'Em andamento', 'Orçamento Concluido', 'Orçamento Concluído', 'Encaminhado', 'Vendido')
          )
        )
      )
      AND COALESCE(l.atualizado_em, l.criado_em) >= v_effective_start
      AND COALESCE(l.atualizado_em, l.criado_em) <= v_effective_end
  ),
  ranking_motivo AS (
    SELECT
      TRIM(motivo_perda) as motivo,
      COUNT(*)::int as qtd_perdas
    FROM leads_perdas_base
    GROUP BY TRIM(motivo_perda)
    ORDER BY qtd_perdas DESC, motivo ASC
  ),
  ranking_etapa AS (
    SELECT
      TRIM(etapa_perda) as etapa,
      COUNT(*)::int as qtd_perdas
    FROM leads_perdas_base
    WHERE etapa_perda IS NOT NULL
      AND TRIM(etapa_perda) <> ''
    GROUP BY TRIM(etapa_perda)
    ORDER BY qtd_perdas DESC, etapa ASC
  ),
  resumo_perdas AS (
    SELECT
      COUNT(*)::int as total_perdas,
      COUNT(*) FILTER (WHERE LOWER(TRIM(motivo_perda)) = 'outro')::int as qtd_outro
    FROM leads_perdas_base
  )
  SELECT jsonb_build_object(
    'total_perdas', COALESCE((SELECT total_perdas FROM resumo_perdas), 0),
    'qtd_outro', COALESCE((SELECT qtd_outro FROM resumo_perdas), 0),
    'por_motivo', COALESCE((SELECT jsonb_agg(row_to_json(rm)) FROM ranking_motivo rm), '[]'::jsonb),
    'por_etapa', COALESCE((SELECT jsonb_agg(row_to_json(re)) FROM ranking_etapa re), '[]'::jsonb)
  )
  INTO v_motivos_perda;

  -- Evolução mensal
  SELECT jsonb_agg(row_to_json(t))
  INTO v_evolucao_mensal
  FROM (
    WITH leads_filtrados AS (
      SELECT l.*
      FROM public.leads l
      WHERE (l.excluido = false OR l.excluido IS NULL)
        AND l.origem IS NOT NULL
        AND TRIM(l.origem) <> ''
        AND LOWER(TRIM(l.origem)) NOT IN ('whatsapp', 'a definir', 'sem origem')
        AND (
          (
            l.status LIKE 'SDR:%'
            OR l.status IN ('Novo contato', 'Novo Contato', 'Novo Lead', 'Novo', 'Despachados', 'Encaminhado Para')
            OR (
              COALESCE(TRIM(l.categoria), 'Comercial') = 'Comercial'
              AND (l.kanban_ativo = false OR l.kanban_ativo IS NULL)
              AND COALESCE(TRIM(l.status), '') NOT IN ('Consultoria Inicial', 'Projeto', 'Apresentação', 'Negociação', 'Stand By', 'Vendido', 'Perdido', 'Aguardando Consultor', 'Ação Gerente', 'Designar Consultor')
            )
          )
          OR
          (
            COALESCE(TRIM(l.categoria), 'Comercial') IN ('Comercial', 'Já é Cliente')
            AND TRIM(l.status) IN ('Consultoria Inicial', 'Projeto', 'Apresentação', 'Negociação', 'Stand By', 'Vendido', 'Perdido', 'Aguardando Consultor', 'Ação Gerente', 'Designar Consultor')
          )
          OR
          (
            LOWER(COALESCE(TRIM(l.categoria), 'Comercial')) = 'follow up'
            OR TRIM(l.status) IN ('Follow up', 'Encaminhado p/ Consultoria')
          )
          OR
          (
            CASE
              WHEN TRIM(l.status) = 'Vendido' THEN
                LOWER(COALESCE(TRIM(l.categoria), 'Comercial')) IN ('orçamento', 'orcamento')
              ELSE
                LOWER(COALESCE(TRIM(l.categoria), 'Comercial')) IN ('orçamento', 'orcamento')
                OR TRIM(l.status) IN ('Novo Orçamento', 'Em andamento', 'Orçamento Concluido', 'Orçamento Concluído', 'Encaminhado')
            END
          )
        )
    )
    SELECT
      to_char(date_trunc('month', criado_em), 'YYYY-MM') as mes_iso,
      to_char(date_trunc('month', criado_em), 'Mon/YY') as mes,
      date_trunc('month', criado_em) as mes_data,
      COUNT(*) as leads,
      COUNT(*) FILTER (WHERE status IN ('Vendido', 'Cliente Ganho', 'Fechado', 'Contrato Fechado', 'Ganho') OR data_venda IS NOT NULL) as convertidos,
      COUNT(*) FILTER (WHERE status IN ('Vendido', 'Cliente Ganho', 'Fechado', 'Contrato Fechado', 'Ganho') OR data_venda IS NOT NULL) as vendidos
    FROM leads_filtrados
    WHERE criado_em >= v_effective_start
      AND criado_em <= v_effective_end
    GROUP BY date_trunc('month', criado_em), to_char(date_trunc('month', criado_em), 'Mon/YY')
    ORDER BY mes_data ASC
  ) t;

  -- Distribuição por dia da semana
  SELECT jsonb_agg(row_to_json(t))
  INTO v_dias_semana
  FROM (
    WITH leads_filtrados AS (
      SELECT l.*
      FROM public.leads l
      WHERE (l.excluido = false OR l.excluido IS NULL)
        AND l.origem IS NOT NULL
        AND TRIM(l.origem) <> ''
        AND LOWER(TRIM(l.origem)) NOT IN ('whatsapp', 'a definir', 'sem origem')
        AND (
          (
            l.status LIKE 'SDR:%'
            OR l.status IN ('Novo contato', 'Novo Contato', 'Novo Lead', 'Novo', 'Despachados', 'Encaminhado Para')
            OR (
              COALESCE(TRIM(l.categoria), 'Comercial') = 'Comercial'
              AND (l.kanban_ativo = false OR l.kanban_ativo IS NULL)
              AND COALESCE(TRIM(l.status), '') NOT IN ('Consultoria Inicial', 'Projeto', 'Apresentação', 'Negociação', 'Stand By', 'Vendido', 'Perdido', 'Aguardando Consultor', 'Ação Gerente', 'Designar Consultor')
            )
          )
          OR
          (
            COALESCE(TRIM(l.categoria), 'Comercial') IN ('Comercial', 'Já é Cliente')
            AND TRIM(l.status) IN ('Consultoria Inicial', 'Projeto', 'Apresentação', 'Negociação', 'Stand By', 'Vendido', 'Perdido', 'Aguardando Consultor', 'Ação Gerente', 'Designar Consultor')
          )
          OR
          (
            LOWER(COALESCE(TRIM(l.categoria), 'Comercial')) = 'follow up'
            OR TRIM(l.status) IN ('Follow up', 'Encaminhado p/ Consultoria')
          )
          OR
          (
            CASE
              WHEN TRIM(l.status) = 'Vendido' THEN
                LOWER(COALESCE(TRIM(l.categoria), 'Comercial')) IN ('orçamento', 'orcamento')
              ELSE
                LOWER(COALESCE(TRIM(l.categoria), 'Comercial')) IN ('orçamento', 'orcamento')
                OR TRIM(l.status) IN ('Novo Orçamento', 'Em andamento', 'Orçamento Concluido', 'Orçamento Concluído', 'Encaminhado')
            END
          )
        )
    )
    SELECT
      CASE EXTRACT(DOW FROM criado_em)
        WHEN 0 THEN 'Domingo'
        WHEN 1 THEN 'Segunda'
        WHEN 2 THEN 'Terça'
        WHEN 3 THEN 'Quarta'
        WHEN 4 THEN 'Quinta'
        WHEN 5 THEN 'Sexta'
        WHEN 6 THEN 'Sábado'
      END as dia,
      EXTRACT(DOW FROM criado_em) as dia_num,
      EXTRACT(DOW FROM criado_em) as dow,
      COUNT(*) as count,
      COUNT(*) as total
    FROM leads_filtrados
    WHERE criado_em >= v_effective_start
      AND criado_em <= v_effective_end
    GROUP BY EXTRACT(DOW FROM criado_em)
    ORDER BY dia_num ASC
  ) t;

  -------------------------------------------------------------
  -- BLOCO (a): 'novo_contato' (Aba 01 / SDR)
  -- FÓRMULA DE TAXA DE DESPACHO E DESPACHADOS REAL:
  -- Denominador: todos os leads criados na janela do período não excluídos,
  -- com categoria comercial (exclui Currículo, Fornecedor, Parceiro, Assistência, Outros Assuntos).
  -- Numerador: leads criados na janela do período não excluídos, com a MESMA regra de categoria
  -- comercial (exclui Currículo, Fornecedor, Parceiro, Assistência, Outros Assuntos), que HOJE estão
  -- (a) no funil de Consultoria (status IN 'Consultoria Inicial','Projeto','Apresentação','Negociação','Stand By','Vendido','Perdido','Aguardando Consultor','Ação Gerente','Designar Consultor')
  -- OU (b) na esteira de Orçamentos (categoria orcamento/orçamento OU status IN 'Novo Orçamento','Em andamento','Orçamento Concluido','Orçamento Concluído','Encaminhado')
  -- sem dupla contagem (OR com exclusão mútua clara).
  -- taxa_despacho = LEAST(100.0, ROUND(despachados_real / GREATEST(total, 1) * 100, 1))
  -------------------------------------------------------------
  WITH nc_leads_periodo AS (
    SELECT l.*
    FROM public.leads l
    WHERE (l.excluido = false OR l.excluido IS NULL)
      AND COALESCE(TRIM(l.categoria), 'Comercial') NOT IN ('Currículo', 'Fornecedor', 'Parceiro', 'Assistência', 'Outros Assuntos')
      AND l.criado_em >= v_effective_start
      AND l.criado_em <= v_effective_end
  ),
  nc_esteira_base AS (
    -- Leads na esteira de Novo Contato no período (para manter distribuição por status/origem da esteira SDR)
    SELECT l.*
    FROM public.leads l
    WHERE (l.excluido = false OR l.excluido IS NULL)
      AND (
        l.status LIKE 'SDR:%'
        OR l.status IN ('Novo contato', 'Novo Contato', 'Novo Lead', 'Novo', 'Despachados', 'Encaminhado Para')
        OR (
          COALESCE(TRIM(l.categoria), 'Comercial') = 'Comercial'
          AND (l.kanban_ativo = false OR l.kanban_ativo IS NULL)
          AND COALESCE(TRIM(l.status), '') NOT IN ('Consultoria Inicial', 'Projeto', 'Apresentação', 'Negociação', 'Stand By', 'Vendido', 'Perdido', 'Aguardando Consultor', 'Ação Gerente', 'Designar Consultor')
        )
      )
      AND l.criado_em >= v_effective_start
      AND l.criado_em <= v_effective_end
  ),
  nc_por_status AS (
    SELECT
      TRIM(status) as status,
      COUNT(*)::int as qtd
    FROM nc_esteira_base
    GROUP BY TRIM(status)
    ORDER BY qtd DESC, status ASC
  ),
  nc_por_origem AS (
    SELECT
      CASE
        WHEN origem IS NULL OR TRIM(origem) = '' THEN 'A definir'
        WHEN TRIM(origem) ILIKE 'bender conecta' THEN 'Bender Conecta'
        WHEN TRIM(origem) = 'Instagram' OR TRIM(origem) ILIKE '%insta%' THEN 'Instagram'
        WHEN TRIM(origem) = 'Google' OR TRIM(origem) ILIKE '%goog%' THEN 'Google'
        WHEN TRIM(origem) = 'Meta Ads' OR TRIM(origem) ILIKE '%meta%' OR TRIM(origem) ILIKE '%face%' THEN 'Meta Ads'
        WHEN TRIM(origem) = 'Recompra' OR TRIM(origem) ILIKE '%recomp%' THEN 'Recompra'
        WHEN TRIM(origem) = 'Corretor' OR TRIM(origem) ILIKE '%corret%' THEN 'Corretor'
        WHEN TRIM(origem) = 'Arquiteto' OR TRIM(origem) ILIKE '%arquit%' THEN 'Arquiteto'
        WHEN TRIM(origem) = 'Indicação' OR TRIM(origem) ILIKE '%indic%' THEN 'Indicação'
        WHEN TRIM(origem) = 'Porta' OR TRIM(origem) ILIKE '%porta%' THEN 'Porta'
        ELSE TRIM(origem)
      END as origem,
      COUNT(*)::int as qtd
    FROM nc_esteira_base
    GROUP BY 1
    ORDER BY qtd DESC, origem ASC
  ),
  despacho_real_cte AS (
    SELECT
      COUNT(DISTINCT l.id)::int as despachados_real
    FROM public.leads l
    WHERE (l.excluido = false OR l.excluido IS NULL)
      AND COALESCE(TRIM(l.categoria), 'Comercial') NOT IN ('Currículo', 'Fornecedor', 'Parceiro', 'Assistência', 'Outros Assuntos')
      AND l.criado_em >= v_effective_start
      AND l.criado_em <= v_effective_end
      AND (
        -- (a) Funil de Consultoria
        (
          TRIM(l.status) IN (
            'Consultoria Inicial', 'Projeto', 'Apresentação', 'Negociação',
            'Stand By', 'Vendido', 'Perdido', 'Aguardando Consultor',
            'Ação Gerente', 'Designar Consultor'
          )
        )
        -- (b) Esteira de Orçamentos
        OR (
          COALESCE(l.categoria, '') ILIKE '%orçamento%'
          OR COALESCE(l.categoria, '') ILIKE '%orcamento%'
          OR TRIM(l.status) IN ('Novo Orçamento', 'Em andamento', 'Orçamento Concluido', 'Orçamento Concluído', 'Encaminhado')
        )
      )
  ),
  nc_resumo AS (
    SELECT
      COUNT(*)::int as total,
      COUNT(*)::int as criados_no_periodo
    FROM nc_leads_periodo
  )
  SELECT jsonb_build_object(
    'total', COALESCE((SELECT total FROM nc_resumo), 0),
    'criados_no_periodo', COALESCE((SELECT criados_no_periodo FROM nc_resumo), 0),
    'despachados_real', COALESCE((SELECT despachados_real FROM despacho_real_cte), 0),
    'por_status', COALESCE((SELECT jsonb_agg(row_to_json(s)) FROM nc_por_status s), '[]'::jsonb),
    'por_origem', COALESCE((SELECT jsonb_agg(row_to_json(o)) FROM nc_por_origem o), '[]'::jsonb),
    'taxa_despacho', CASE
      WHEN COALESCE((SELECT total FROM nc_resumo), 0) > 0 THEN
        LEAST(
          100.0,
          ROUND(((SELECT despachados_real FROM despacho_real_cte)::numeric / GREATEST((SELECT total FROM nc_resumo)::numeric, 1)) * 100, 1)
        )
      ELSE 0
    END
  )
  INTO v_novo_contato;

  -------------------------------------------------------------
  -- BLOCO (b): 'consultoria' (Aba 02 / Lead p/ Consultoria)
  -------------------------------------------------------------
  WITH cons_base AS (
    SELECT
      l.*,
      fc.valor_total as fc_valor_total,
      fc.datas as fc_datas
    FROM public.leads l
    LEFT JOIN public.formulario_comercial fc ON fc.lead_id = l.id
    WHERE (l.excluido = false OR l.excluido IS NULL)
      AND COALESCE(TRIM(l.categoria), 'Comercial') IN ('Comercial', 'Já é Cliente')
      AND TRIM(l.status) IN (
        'Consultoria Inicial', 'Projeto', 'Apresentação', 'Negociação',
        'Stand By', 'Vendido', 'Perdido', 'Aguardando Consultor',
        'Ação Gerente', 'Designar Consultor'
      )
      AND COALESCE(l.atualizado_em, l.criado_em) >= v_effective_start
      AND COALESCE(l.atualizado_em, l.criado_em) <= v_effective_end
  ),
  cons_por_status AS (
    SELECT
      TRIM(status) as status,
      COUNT(*)::int as qtd
    FROM cons_base
    GROUP BY TRIM(status)
    ORDER BY qtd DESC, status ASC
  ),
  cons_por_origem AS (
    SELECT
      CASE
        WHEN origem IS NULL OR TRIM(origem) = '' THEN 'A definir'
        WHEN TRIM(origem) ILIKE 'bender conecta' THEN 'Bender Conecta'
        WHEN TRIM(origem) = 'Instagram' OR TRIM(origem) ILIKE '%insta%' THEN 'Instagram'
        WHEN TRIM(origem) = 'Google' OR TRIM(origem) ILIKE '%goog%' THEN 'Google'
        WHEN TRIM(origem) = 'Meta Ads' OR TRIM(origem) ILIKE '%meta%' OR TRIM(origem) ILIKE '%face%' THEN 'Meta Ads'
        WHEN TRIM(origem) = 'Recompra' OR TRIM(origem) ILIKE '%recomp%' THEN 'Recompra'
        WHEN TRIM(origem) = 'Corretor' OR TRIM(origem) ILIKE '%corret%' THEN 'Corretor'
        WHEN TRIM(origem) = 'Arquiteto' OR TRIM(origem) ILIKE '%arquit%' THEN 'Arquiteto'
        WHEN TRIM(origem) = 'Indicação' OR TRIM(origem) ILIKE '%indic%' THEN 'Indicação'
        WHEN TRIM(origem) = 'Porta' OR TRIM(origem) ILIKE '%porta%' THEN 'Porta'
        ELSE TRIM(origem)
      END as origem,
      COUNT(*)::int as qtd
    FROM cons_base
    GROUP BY 1
    ORDER BY qtd DESC, origem ASC
  ),
  cons_vendidos AS (
    SELECT
      fc_valor_total,
      GREATEST(extract(epoch from (
        COALESCE(nullif(fc_datas->>'data_venda','')::timestamptz, data_venda) - criado_em
      ))/86400.0, 0) as ciclo_dias,
      COALESCE(nullif(fc_datas->>'data_venda','')::timestamptz, data_venda) as effective_data_venda
    FROM cons_base
    WHERE TRIM(status) = 'Vendido'
      AND COALESCE(TRIM(categoria), 'Comercial') IN ('Comercial', 'Já é Cliente')
  ),
  cons_resumo AS (
    SELECT
      (SELECT COUNT(*)::int FROM cons_base) as total,
      (SELECT COUNT(*)::int FROM cons_vendidos) as vendidos,
      (SELECT COALESCE(SUM(fc_valor_total), 0) FROM cons_vendidos WHERE fc_valor_total > 0) as soma_valor,
      (SELECT COUNT(*) FROM cons_vendidos WHERE fc_valor_total > 0) as qtd_com_valor,
      (SELECT ROUND(AVG(ciclo_dias)::numeric, 1) FROM cons_vendidos WHERE effective_data_venda IS NOT NULL) as ciclo_medio_dias
  )
  SELECT jsonb_build_object(
    'total', COALESCE((SELECT total FROM cons_resumo), 0),
    'por_status', COALESCE((SELECT jsonb_agg(row_to_json(s)) FROM cons_por_status s), '[]'::jsonb),
    'por_origem', COALESCE((SELECT jsonb_agg(row_to_json(o)) FROM cons_por_origem o), '[]'::jsonb),
    'vendidos', COALESCE((SELECT vendidos FROM cons_resumo), 0),
    'taxa_conversao', CASE
      WHEN COALESCE((SELECT total FROM cons_resumo), 0) > 0 THEN
        ROUND(((SELECT vendidos FROM cons_resumo)::numeric / (SELECT total FROM cons_resumo)::numeric) * 100, 1)
      ELSE 0
    END,
    'ticket_medio_consultoria', CASE
      WHEN COALESCE((SELECT qtd_com_valor FROM cons_resumo), 0) > 0 THEN
        ROUND(((SELECT soma_valor FROM cons_resumo) / (SELECT qtd_com_valor FROM cons_resumo))::numeric, 2)
      ELSE 0
    END,
    'ciclo_medio_dias', (SELECT ciclo_medio_dias FROM cons_resumo)
  )
  INTO v_consultoria;

  -------------------------------------------------------------
  -- BLOCO (c): 'orcamentos' (Aba 05 / Leads p/ Orçamentos)
  -------------------------------------------------------------
  WITH orc_base AS (
    SELECT
      l.*,
      fc.valor_total as fc_valor_total,
      fc.datas as fc_datas
    FROM public.leads l
    LEFT JOIN public.formulario_comercial fc ON fc.lead_id = l.id
    WHERE (l.excluido = false OR l.excluido IS NULL)
      AND (
        CASE
          WHEN TRIM(l.status) IN ('Vendido', 'Perdido') THEN
            LOWER(COALESCE(TRIM(l.categoria), 'Comercial')) IN ('orçamento', 'orcamento')
          ELSE
            LOWER(COALESCE(TRIM(l.categoria), 'Comercial')) IN ('orçamento', 'orcamento')
            OR TRIM(l.status) IN ('Novo Orçamento', 'Em andamento', 'Orçamento Concluido', 'Orçamento Concluído', 'Encaminhado')
        END
      )
      AND l.criado_em >= v_effective_start
      AND l.criado_em <= v_effective_end
  ),
  orc_por_status AS (
    SELECT
      TRIM(status) as status,
      COUNT(*)::int as qtd
    FROM orc_base
    GROUP BY TRIM(status)
    ORDER BY qtd DESC, status ASC
  ),
  orc_por_origem AS (
    SELECT
      CASE
        WHEN origem IS NULL OR TRIM(origem) = '' THEN 'A definir'
        WHEN TRIM(origem) ILIKE 'bender conecta' THEN 'Bender Conecta'
        WHEN TRIM(origem) = 'Instagram' OR TRIM(origem) ILIKE '%insta%' THEN 'Instagram'
        WHEN TRIM(origem) = 'Google' OR TRIM(origem) ILIKE '%goog%' THEN 'Google'
        WHEN TRIM(origem) = 'Meta Ads' OR TRIM(origem) ILIKE '%meta%' OR TRIM(origem) ILIKE '%face%' THEN 'Meta Ads'
        WHEN TRIM(origem) = 'Recompra' OR TRIM(origem) ILIKE '%recomp%' THEN 'Recompra'
        WHEN TRIM(origem) = 'Corretor' OR TRIM(origem) ILIKE '%corret%' THEN 'Corretor'
        WHEN TRIM(origem) = 'Arquiteto' OR TRIM(origem) ILIKE '%arquit%' THEN 'Arquiteto'
        WHEN TRIM(origem) = 'Indicação' OR TRIM(origem) ILIKE '%indic%' THEN 'Indicação'
        WHEN TRIM(origem) = 'Porta' OR TRIM(origem) ILIKE '%porta%' THEN 'Porta'
        ELSE TRIM(origem)
      END as origem,
      COUNT(*)::int as qtd
    FROM orc_base
    GROUP BY 1
    ORDER BY qtd DESC, origem ASC
  ),
  orc_vendidos AS (
    SELECT
      fc_valor_total,
      GREATEST(extract(epoch from (
        COALESCE(nullif(fc_datas->>'data_venda','')::timestamptz, data_venda) - criado_em
      ))/86400.0, 0) as ciclo_dias,
      COALESCE(nullif(fc_datas->>'data_venda','')::timestamptz, data_venda) as effective_data_venda
    FROM orc_base
    WHERE TRIM(status) = 'Vendido'
      AND LOWER(COALESCE(TRIM(categoria), 'Comercial')) IN ('orçamento', 'orcamento')
  ),
  orc_resumo AS (
    SELECT
      (SELECT COUNT(*)::int FROM orc_base) as total,
      (SELECT COUNT(*)::int FROM orc_vendidos) as convertidos,
      (SELECT COALESCE(SUM(fc_valor_total), 0) FROM orc_vendidos WHERE fc_valor_total > 0) as soma_valor,
      (SELECT COUNT(*) FROM orc_vendidos WHERE fc_valor_total > 0) as qtd_com_valor,
      (SELECT ROUND(AVG(ciclo_dias)::numeric, 1) FROM orc_vendidos WHERE effective_data_venda IS NOT NULL) as ciclo_medio_dias
  )
  SELECT jsonb_build_object(
    'total', COALESCE((SELECT total FROM orc_resumo), 0),
    'por_status', COALESCE((SELECT jsonb_agg(row_to_json(s)) FROM orc_por_status s), '[]'::jsonb),
    'por_origem', COALESCE((SELECT jsonb_agg(row_to_json(o)) FROM orc_por_origem o), '[]'::jsonb),
    'convertidos', COALESCE((SELECT convertidos FROM orc_resumo), 0),
    'taxa_conversao', CASE
      WHEN COALESCE((SELECT total FROM orc_resumo), 0) > 0 THEN
        ROUND(((SELECT convertidos FROM orc_resumo)::numeric / (SELECT total FROM orc_resumo)::numeric) * 100, 1)
      ELSE 0
    END,
    'ticket_medio_orcamentos', CASE
      WHEN COALESCE((SELECT qtd_com_valor FROM orc_resumo), 0) > 0 THEN
        ROUND(((SELECT soma_valor FROM orc_resumo) / (SELECT qtd_com_valor FROM orc_resumo))::numeric, 2)
      ELSE 0
    END,
    'ciclo_medio_dias', (SELECT ciclo_medio_dias FROM orc_resumo)
  )
  INTO v_orcamentos;

  -------------------------------------------------------------
  -- BLOCO (d): 'tempo_colunas' (HOJE na esteira)
  -------------------------------------------------------------
  WITH nc_colunas AS (
    SELECT coluna, ord
    FROM (
      SELECT unnest(ARRAY[
        'Novo contato',
        'SDR: Em contato',
        'SDR: Follow up 1',
        'SDR: Follow up 2',
        'SDR: Follow up 3',
        'SDR: Stand By',
        'SDR: Perdido',
        'SDR: Não é lead'
      ]) as coluna,
      generate_subscripts(ARRAY[
        'Novo contato',
        'SDR: Em contato',
        'SDR: Follow up 1',
        'SDR: Follow up 2',
        'SDR: Follow up 3',
        'SDR: Stand By',
        'SDR: Perdido',
        'SDR: Não é lead'
      ], 1) as ord
    ) s
  ),
  nc_leads_norm AS (
    SELECT
      CASE
        WHEN TRIM(l.status) IN ('Novo', 'Novo Lead', 'Novo contato', 'Novo Contato', 'Encaminhado Para', 'Despachados') THEN 'Novo contato'
        WHEN TRIM(l.status) IN ('Em contato', 'SDR: Em contato') THEN 'SDR: Em contato'
        WHEN TRIM(l.status) IN ('Follow up 1', 'SDR: Follow up 1') THEN 'SDR: Follow up 1'
        WHEN TRIM(l.status) IN ('Follow up 2', 'SDR: Follow up 2') THEN 'SDR: Follow up 2'
        WHEN TRIM(l.status) IN ('Follow up 3', 'SDR: Follow up 3') THEN 'SDR: Follow up 3'
        WHEN TRIM(l.status) IN ('Stand By', 'SDR: Stand By') THEN 'SDR: Stand By'
        WHEN TRIM(l.status) IN ('Perdido', 'SDR: Perdido') THEN 'SDR: Perdido'
        WHEN TRIM(l.status) IN ('Não é lead', 'SDR: Não é lead') THEN 'SDR: Não é lead'
        ELSE TRIM(l.status)
      END as status_norm,
      l.atualizado_em,
      l.criado_em
    FROM public.leads l
    WHERE (l.excluido = false OR l.excluido IS NULL)
      AND (
        l.status LIKE 'SDR:%'
        OR l.status IN ('Novo contato', 'Novo Contato', 'Novo Lead', 'Novo', 'Despachados', 'Encaminhado Para')
        OR (
          COALESCE(TRIM(l.categoria), 'Comercial') = 'Comercial'
          AND (l.kanban_ativo = false OR l.kanban_ativo IS NULL)
          AND COALESCE(TRIM(l.status), '') NOT IN ('Consultoria Inicial', 'Projeto', 'Apresentação', 'Negociação', 'Stand By', 'Vendido', 'Perdido', 'Aguardando Consultor', 'Ação Gerente', 'Designar Consultor')
        )
      )
  ),
  nc_agg AS (
    SELECT
      status_norm,
      COUNT(*)::int as qtd_cards,
      ROUND(AVG(EXTRACT(EPOCH FROM (NOW() - COALESCE(atualizado_em, criado_em))) / 86400.0)::numeric, 1) as tempo_medio_dias,
      ROUND(MAX(EXTRACT(EPOCH FROM (NOW() - COALESCE(atualizado_em, criado_em))) / 86400.0)::numeric, 1) as tempo_max_dias
    FROM nc_leads_norm
    GROUP BY status_norm
  ),
  tc_nc AS (
    SELECT
      c.coluna,
      COALESCE(a.qtd_cards, 0) as qtd_cards,
      COALESCE(a.tempo_medio_dias, 0) as tempo_medio_dias,
      COALESCE(a.tempo_max_dias, 0) as tempo_max_dias
    FROM nc_colunas c
    LEFT JOIN nc_agg a ON c.coluna = a.status_norm
    ORDER BY c.ord
  ),
  cons_colunas AS (
    SELECT coluna, ord
    FROM (
      SELECT unnest(ARRAY[
        'Consultoria Inicial',
        'Projeto',
        'Apresentação',
        'Negociação',
        'Stand By',
        'Vendido',
        'Perdido'
      ]) as coluna,
      generate_subscripts(ARRAY[
        'Consultoria Inicial',
        'Projeto',
        'Apresentação',
        'Negociação',
        'Stand By',
        'Vendido',
        'Perdido'
      ], 1) as ord
    ) s
  ),
  cons_leads_norm AS (
    SELECT
      CASE
        WHEN TRIM(l.status) IN ('Aguardando Consultor', 'Ação Gerente', 'Designar Consultor') THEN 'Consultoria Inicial'
        ELSE TRIM(l.status)
      END as status_norm,
      l.atualizado_em,
      l.criado_em
    FROM public.leads l
    WHERE (l.excluido = false OR l.excluido IS NULL)
      AND COALESCE(TRIM(l.categoria), 'Comercial') IN ('Comercial', 'Já é Cliente')
      AND TRIM(l.status) IN (
        'Consultoria Inicial', 'Projeto', 'Apresentação', 'Negociação',
        'Stand By', 'Vendido', 'Perdido', 'Aguardando Consultor',
        'Ação Gerente', 'Designar Consultor'
      )
  ),
  cons_agg AS (
    SELECT
      status_norm,
      COUNT(*)::int as qtd_cards,
      ROUND(AVG(EXTRACT(EPOCH FROM (NOW() - COALESCE(atualizado_em, criado_em))) / 86400.0)::numeric, 1) as tempo_medio_dias,
      ROUND(MAX(EXTRACT(EPOCH FROM (NOW() - COALESCE(atualizado_em, criado_em))) / 86400.0)::numeric, 1) as tempo_max_dias
    FROM cons_leads_norm
    GROUP BY status_norm
  ),
  tc_cons AS (
    SELECT
      c.coluna,
      COALESCE(a.qtd_cards, 0) as qtd_cards,
      COALESCE(a.tempo_medio_dias, 0) as tempo_medio_dias,
      COALESCE(a.tempo_max_dias, 0) as tempo_max_dias
    FROM cons_colunas c
    LEFT JOIN cons_agg a ON c.coluna = a.status_norm
    ORDER BY c.ord
  ),
  tc_orc AS (
    SELECT
      TRIM(l.status) as coluna,
      COUNT(*)::int as qtd_cards,
      ROUND(AVG(EXTRACT(EPOCH FROM (NOW() - COALESCE(l.atualizado_em, l.criado_em))) / 86400.0)::numeric, 1) as tempo_medio_dias,
      ROUND(MAX(EXTRACT(EPOCH FROM (NOW() - COALESCE(l.atualizado_em, l.criado_em))) / 86400.0)::numeric, 1) as tempo_max_dias
    FROM public.leads l
    WHERE (l.excluido = false OR l.excluido IS NULL)
      AND (
        CASE
          WHEN TRIM(l.status) IN ('Vendido', 'Perdido') THEN
            LOWER(COALESCE(TRIM(l.categoria), 'Comercial')) IN ('orçamento', 'orcamento')
          ELSE
            LOWER(COALESCE(TRIM(l.categoria), 'Comercial')) IN ('orçamento', 'orcamento')
            OR TRIM(l.status) IN ('Novo Orçamento', 'Em andamento', 'Orçamento Concluido', 'Orçamento Concluído', 'Encaminhado')
        END
      )
    GROUP BY TRIM(l.status)
  )
  SELECT jsonb_build_object(
    'novo_contato', COALESCE((SELECT jsonb_agg(row_to_json(nc)) FROM tc_nc nc), '[]'::jsonb),
    'consultoria', COALESCE((SELECT jsonb_agg(row_to_json(cons)) FROM tc_cons cons), '[]'::jsonb),
    'orcamentos', COALESCE((SELECT jsonb_agg(row_to_json(orc)) FROM tc_orc orc), '[]'::jsonb)
  )
  INTO v_tempo_colunas;

  -------------------------------------------------------------
  -- ABA 2: CLIENTES & VENDAS
  -------------------------------------------------------------
  SELECT COUNT(*)
  INTO v_novos_clientes
  FROM public.clientes c
  WHERE (c.excluido = false OR c.excluido IS NULL)
    AND c.criado_em >= v_effective_start
    AND c.criado_em <= v_effective_end;

  WITH leads_filtrados AS (
    SELECT l.*
    FROM public.leads l
    WHERE (l.excluido = false OR l.excluido IS NULL)
      AND l.origem IS NOT NULL
      AND TRIM(l.origem) <> ''
      AND LOWER(TRIM(l.origem)) NOT IN ('whatsapp', 'a definir', 'sem origem')
      AND (
        (
          l.status LIKE 'SDR:%'
          OR l.status IN ('Novo contato', 'Novo Contato', 'Novo Lead', 'Novo', 'Despachados', 'Encaminhado Para')
          OR (
            COALESCE(TRIM(l.categoria), 'Comercial') = 'Comercial'
            AND (l.kanban_ativo = false OR l.kanban_ativo IS NULL)
            AND COALESCE(TRIM(l.status), '') NOT IN ('Consultoria Inicial', 'Projeto', 'Apresentação', 'Negociação', 'Stand By', 'Vendido', 'Perdido', 'Aguardando Consultor', 'Ação Gerente', 'Designar Consultor')
          )
        )
        OR
        (
          COALESCE(TRIM(l.categoria), 'Comercial') IN ('Comercial', 'Já é Cliente')
          AND TRIM(l.status) IN ('Consultoria Inicial', 'Projeto', 'Apresentação', 'Negociação', 'Stand By', 'Vendido', 'Perdido', 'Aguardando Consultor', 'Ação Gerente', 'Designar Consultor')
        )
        OR
        (
          LOWER(COALESCE(TRIM(l.categoria), 'Comercial')) = 'follow up'
          OR TRIM(l.status) IN ('Follow up', 'Encaminhado p/ Consultoria')
        )
        OR
        (
          CASE
            WHEN TRIM(l.status) = 'Vendido' THEN
              LOWER(COALESCE(TRIM(l.categoria), 'Comercial')) IN ('orçamento', 'orcamento')
            ELSE
              LOWER(COALESCE(TRIM(l.categoria), 'Comercial')) IN ('orçamento', 'orcamento')
              OR TRIM(l.status) IN ('Novo Orçamento', 'Em andamento', 'Orçamento Concluido', 'Orçamento Concluído', 'Encaminhado')
          END
        )
      )
  )
  SELECT
    COALESCE(SUM(fc.valor_total), 0),
    COALESCE(AVG(fc.valor_total), 0),
    COALESCE(percentile_cont(0.5) WITHIN GROUP (ORDER BY fc.valor_total), 0),
    COALESCE(MIN(fc.valor_total), 0),
    COALESCE(MAX(fc.valor_total), 0),
    COUNT(*),
    COUNT(*) FILTER (WHERE l.status IN ('Vendido', 'Cliente Ganho', 'Fechado', 'Contrato Fechado', 'Ganho') OR l.data_venda IS NOT NULL),
    COALESCE(SUM(fc.valor_total) FILTER (WHERE l.status IN ('Vendido', 'Cliente Ganho', 'Fechado', 'Contrato Fechado', 'Ganho') OR l.data_venda IS NOT NULL), 0)
  INTO
    v_valor_vendido,
    v_ticket_medio,
    v_ticket_mediana,
    v_menor_ticket,
    v_maior_ticket,
    v_total_formularios_valor,
    v_total_formularios_vendidos,
    v_valor_vendido_fechado
  FROM public.formulario_comercial fc
  INNER JOIN leads_filtrados l ON fc.lead_id = l.id
  WHERE fc.valor_total > 0
    AND fc.criado_em >= v_effective_start
    AND fc.criado_em <= v_effective_end;

  v_ticket_medio := ROUND(v_ticket_medio, 2);
  v_ticket_mediana := ROUND(v_ticket_mediana, 2);

  IF v_valor_vendido > 0 THEN
    v_maior_ticket_percentual := ROUND((v_maior_ticket / v_valor_vendido) * 100, 1);
  ELSE
    v_maior_ticket_percentual := 0;
  END IF;

  -------------------------------------------------------------
  -- RANKING DE CONSULTORES
  -------------------------------------------------------------
  SELECT jsonb_agg(row_to_json(t))
  INTO v_ranking_consultores
  FROM (
    WITH leads_filtrados AS (
      SELECT l.*
      FROM public.leads l
      WHERE (l.excluido = false OR l.excluido IS NULL)
        AND l.origem IS NOT NULL
        AND TRIM(l.origem) <> ''
        AND LOWER(TRIM(l.origem)) NOT IN ('whatsapp', 'a definir', 'sem origem')
        AND (
          (
            l.status LIKE 'SDR:%'
            OR l.status IN ('Novo contato', 'Novo Contato', 'Novo Lead', 'Novo', 'Despachados', 'Encaminhado Para')
            OR (
              COALESCE(TRIM(l.categoria), 'Comercial') = 'Comercial'
              AND (l.kanban_ativo = false OR l.kanban_ativo IS NULL)
              AND COALESCE(TRIM(l.status), '') NOT IN ('Consultoria Inicial', 'Projeto', 'Apresentação', 'Negociação', 'Stand By', 'Vendido', 'Perdido', 'Aguardando Consultor', 'Ação Gerente', 'Designar Consultor')
            )
          )
          OR
          (
            COALESCE(TRIM(l.categoria), 'Comercial') IN ('Comercial', 'Já é Cliente')
            AND TRIM(l.status) IN ('Consultoria Inicial', 'Projeto', 'Apresentação', 'Negociação', 'Stand By', 'Vendido', 'Perdido', 'Aguardando Consultor', 'Ação Gerente', 'Designar Consultor')
          )
          OR
          (
            LOWER(COALESCE(TRIM(l.categoria), 'Comercial')) = 'follow up'
            OR TRIM(l.status) IN ('Follow up', 'Encaminhado p/ Consultoria')
          )
          OR
          (
            CASE
              WHEN TRIM(l.status) = 'Vendido' THEN
                LOWER(COALESCE(TRIM(l.categoria), 'Comercial')) IN ('orçamento', 'orcamento')
              ELSE
                LOWER(COALESCE(TRIM(l.categoria), 'Comercial')) IN ('orçamento', 'orcamento')
                OR TRIM(l.status) IN ('Novo Orçamento', 'Em andamento', 'Orçamento Concluido', 'Orçamento Concluído', 'Encaminhado')
            END
          )
        )
    ),
    leads_rotulados AS (
      SELECT
        fc.id as fc_id,
        fc.valor_total as fc_valor_total,
        regexp_replace(
          TRIM(
            CASE
              WHEN COALESCE(u.nome, l.criado_por_nome, '') ILIKE '%conecta%' THEN 'Bender Conecta'
              WHEN u.nome IS NOT NULL AND TRIM(u.nome) <> '' THEN u.nome
              WHEN l.criado_por_nome IS NOT NULL AND TRIM(l.criado_por_nome) <> '' THEN
                COALESCE(
                  (
                    SELECT u_match.nome
                    FROM public.users u_match
                    WHERE u_match.nome IS NOT NULL
                      AND TRIM(u_match.nome) <> ''
                      AND (
                        LOWER(TRIM(u_match.nome)) = LOWER(TRIM(l.criado_por_nome))
                        OR LOWER(TRIM(u_match.nome)) LIKE LOWER(TRIM(l.criado_por_nome)) || '%'
                        OR LOWER(TRIM(l.criado_por_nome)) LIKE LOWER(TRIM(u_match.nome)) || '%'
                      )
                    ORDER BY length(u_match.nome) ASC
                    LIMIT 1
                  ),
                  l.criado_por_nome
                )
              ELSE 'Não informado'
            END
          ),
          '\s+',
          ' ',
          'g'
        ) as consultor
      FROM public.formulario_comercial fc
      INNER JOIN leads_filtrados l ON fc.lead_id = l.id
      LEFT JOIN public.users u ON l.consultor_id = u.id
      WHERE fc.valor_total > 0
        AND fc.criado_em >= v_effective_start
        AND fc.criado_em <= v_effective_end
    )
    SELECT
      consultor,
      COUNT(fc_id) as vendas,
      COALESCE(SUM(fc_valor_total), 0) as valor_total,
      ROUND(COALESCE(AVG(fc_valor_total), 0), 2) as ticket_medio,
      ROUND(COALESCE(percentile_cont(0.5) WITHIN GROUP (ORDER BY fc_valor_total), 0)::numeric, 2) as ticket_mediana,
      COALESCE(MIN(fc_valor_total), 0) as menor_ticket,
      COALESCE(MAX(fc_valor_total), 0) as maior_ticket
    FROM leads_rotulados
    WHERE consultor IS NOT NULL
      AND consultor <> ''
      AND LOWER(consultor) NOT IN ('sistema', 'não informado', 'nao informado')
    GROUP BY consultor
    ORDER BY valor_total DESC
  ) t;

  -------------------------------------------------------------
  -- BLOCO: por_consultor
  -------------------------------------------------------------
  SELECT jsonb_agg(row_to_json(t))
  INTO v_por_consultor
  FROM (
    WITH leads_consultor_base AS (
      SELECT
        regexp_replace(
          TRIM(
            CASE
              WHEN COALESCE(u.nome, l.criado_por_nome, '') ILIKE '%conecta%' THEN 'Bender Conecta'
              WHEN u.nome IS NOT NULL AND TRIM(u.nome) <> '' THEN u.nome
              WHEN l.criado_por_nome IS NOT NULL AND TRIM(l.criado_por_nome) <> '' THEN
                COALESCE(
                  (
                    SELECT u_match.nome
                    FROM public.users u_match
                    WHERE u_match.nome IS NOT NULL
                      AND TRIM(u_match.nome) <> ''
                      AND (
                        LOWER(TRIM(u_match.nome)) = LOWER(TRIM(l.criado_por_nome))
                        OR LOWER(TRIM(u_match.nome)) LIKE LOWER(TRIM(l.criado_por_nome)) || '%'
                        OR LOWER(TRIM(l.criado_por_nome)) LIKE LOWER(TRIM(u_match.nome)) || '%'
                      )
                    ORDER BY length(u_match.nome) ASC
                    LIMIT 1
                  ),
                  l.criado_por_nome
                )
              ELSE 'Não informado'
            END
          ),
          '\s+',
          ' ',
          'g'
        ) as consultor,
        l.id as lead_id,
        l.status,
        l.criado_em,
        COALESCE(nullif(fc.datas->>'data_venda','')::timestamptz, data_venda) as data_venda_efetiva,
        fc.valor_total as fc_valor_total,
        GREATEST(extract(epoch from (
          COALESCE(nullif(fc.datas->>'data_venda','')::timestamptz, data_venda) - l.criado_em
        ))/86400.0, 0) as ciclo_dias
      FROM public.leads l
      LEFT JOIN public.formulario_comercial fc ON fc.lead_id = l.id
      LEFT JOIN public.users u ON l.consultor_id = u.id
      WHERE (l.excluido = false OR l.excluido IS NULL)
        AND l.origem IS NOT NULL
        AND TRIM(l.origem) <> ''
        AND LOWER(TRIM(l.origem)) NOT IN ('whatsapp', 'a definir', 'sem origem')
        AND (
          (
            l.status LIKE 'SDR:%'
            OR l.status IN ('Novo contato', 'Novo Contato', 'Novo Lead', 'Novo', 'Despachados', 'Encaminhado Para')
            OR (
              COALESCE(TRIM(l.categoria), 'Comercial') = 'Comercial'
              AND (l.kanban_ativo = false OR l.kanban_ativo IS NULL)
              AND COALESCE(TRIM(l.status), '') NOT IN ('Consultoria Inicial', 'Projeto', 'Apresentação', 'Negociação', 'Stand By', 'Vendido', 'Perdido', 'Aguardando Consultor', 'Ação Gerente', 'Designar Consultor')
            )
          )
          OR
          (
            COALESCE(TRIM(l.categoria), 'Comercial') IN ('Comercial', 'Já é Cliente')
            AND TRIM(l.status) IN ('Consultoria Inicial', 'Projeto', 'Apresentação', 'Negociação', 'Stand By', 'Vendido', 'Perdido', 'Aguardando Consultor', 'Ação Gerente', 'Designar Consultor')
          )
          OR
          (
            LOWER(COALESCE(TRIM(l.categoria), 'Comercial')) = 'follow up'
            OR TRIM(l.status) IN ('Follow up', 'Encaminhado p/ Consultoria')
          )
          OR
          (
            CASE
              WHEN TRIM(l.status) = 'Vendido' THEN
                LOWER(COALESCE(TRIM(l.categoria), 'Comercial')) IN ('orçamento', 'orcamento')
              ELSE
                LOWER(COALESCE(TRIM(l.categoria), 'Comercial')) IN ('orçamento', 'orcamento')
                OR TRIM(l.status) IN ('Novo Orçamento', 'Em andamento', 'Orçamento Concluido', 'Orçamento Concluído', 'Encaminhado')
            END
          )
        )
        AND COALESCE(l.atualizado_em, l.criado_em) >= v_effective_start
        AND COALESCE(l.atualizado_em, l.criado_em) <= v_effective_end
    )
    SELECT
      consultor,
      COUNT(DISTINCT lead_id)::int as total_leads,
      COUNT(DISTINCT lead_id) FILTER (WHERE status = 'Vendido')::int as vendidos,
      ROUND(
        CASE
          WHEN COUNT(DISTINCT lead_id) > 0 THEN
            (COUNT(DISTINCT lead_id) FILTER (WHERE status = 'Vendido')::numeric / COUNT(DISTINCT lead_id)::numeric) * 100
          ELSE 0
        END,
        1
      ) as taxa_conversao,
      ROUND(
        AVG(ciclo_dias) FILTER (WHERE status = 'Vendido' AND data_venda_efetiva IS NOT NULL)::numeric,
        1
      ) as ciclo_medio_dias,
      ROUND(COALESCE(SUM(fc_valor_total) FILTER (WHERE status = 'Vendido'), 0)::numeric, 2) as valor_total,
      ROUND(
        CASE
          WHEN COUNT(DISTINCT lead_id) FILTER (WHERE status = 'Vendido' AND fc_valor_total > 0) > 0 THEN
            COALESCE(SUM(fc_valor_total) FILTER (WHERE status = 'Vendido'), 0) / COUNT(DISTINCT lead_id) FILTER (WHERE status = 'Vendido' AND fc_valor_total > 0)::numeric
          ELSE 0
        END,
        2
      ) as ticket_medio
    FROM leads_consultor_base
    WHERE consultor IS NOT NULL
      AND consultor <> ''
      AND LOWER(consultor) NOT IN ('sistema', 'não informado', 'nao informado')
    GROUP BY consultor
    ORDER BY taxa_conversao DESC, vendidos DESC, consultor ASC
  ) t;

  -------------------------------------------------------------
  -- ABA 3: PCP
  -------------------------------------------------------------
  SELECT
    COUNT(DISTINCT psp.id),
    COUNT(DISTINCT psp.cliente_id)
  INTO v_total_ambientes, v_total_clientes_pcp
  FROM public.produtos_servicos_projeto psp
  WHERE (psp.excluido_analise = false OR psp.excluido_analise IS NULL)
    AND psp.criado_em >= v_effective_start
    AND psp.criado_em <= v_effective_end;

  v_ambientes_por_cliente := CASE WHEN v_total_clientes_pcp > 0 THEN ROUND((v_total_ambientes::numeric / v_total_clientes_pcp::numeric), 1) ELSE 0 END;

  SELECT jsonb_agg(row_to_json(t))
  INTO v_fases_ambientes
  FROM (
    SELECT
      psp.status_analise as fase,
      COUNT(*) as count
    FROM public.produtos_servicos_projeto psp
    WHERE (psp.excluido_analise = false OR psp.excluido_analise IS NULL)
      AND psp.criado_em >= v_effective_start
      AND psp.criado_em <= v_effective_end
    GROUP BY psp.status_analise
    ORDER BY count DESC
  ) t;

  WITH transicoes AS (
    SELECT
      status_anterior as fase,
      criado_em,
      LEAD(criado_em) OVER (PARTITION BY card_id ORDER BY criado_em ASC) as proxima_mudanca
    FROM public.kanban_historico
    WHERE status_anterior IS NOT NULL
  ),
  duracoes AS (
    SELECT
      fase,
      EXTRACT(EPOCH FROM (proxima_mudanca - criado_em)) / 86400 as dias
    FROM transicoes
    WHERE proxima_mudanca IS NOT NULL
      AND proxima_mudanca >= criado_em
  ),
  medias_reais AS (
    SELECT
      fase,
      ROUND(AVG(dias)::numeric, 1) as media_dias,
      COUNT(*) as amostras
    FROM duracoes
    GROUP BY fase
  )
  SELECT fase
  INTO v_fase_gargalo
  FROM medias_reais
  WHERE amostras >= 3
  ORDER BY media_dias DESC
  LIMIT 1;

  SELECT jsonb_agg(row_to_json(t))
  INTO v_tempo_fases
  FROM (
    WITH transicoes AS (
      SELECT
        status_anterior as fase,
        criado_em,
        LEAD(criado_em) OVER (PARTITION BY card_id ORDER BY criado_em ASC) as proxima_mudanca
      FROM public.kanban_historico
      WHERE status_anterior IS NOT NULL
    ),
    duracoes AS (
      SELECT
        fase,
        EXTRACT(EPOCH FROM (proxima_mudanca - criado_em)) / 86400 as dias
      FROM transicoes
      WHERE proxima_mudanca IS NOT NULL
        AND proxima_mudanca >= criado_em
    ),
    medias_reais AS (
      SELECT
        fase,
        ROUND(AVG(dias)::numeric, 1) as media_dias,
        COUNT(*) as amostras
      FROM duracoes
      GROUP BY fase
    ),
    todas_as_fases AS (
      SELECT unnest(ARRAY[
        'iniciar',
        'reuniao_analise',
        'medida_fina',
        'pendencia',
        'aguardando_liberacao',
        'item_terceirizado',
        'montagem',
        'router',
        'bancada',
        'aguardando_agenda',
        'aguardando_plano_corte',
        'caderno_tecnico',
        'coladeira',
        'lista_materiais',
        'expedicao',
        'transporte',
        'embalagem'
      ]) as fase
    )
    SELECT
      f.fase,
      m.media_dias,
      COALESCE(m.amostras, 0) as transicoes_registradas,
      (f.fase = v_fase_gargalo) as is_gargalo
    FROM todas_as_fases f
    LEFT JOIN medias_reais m ON f.fase = m.fase
    ORDER BY COALESCE(m.media_dias, -1) DESC, f.fase ASC
  ) t;

  SELECT
    ROUND(AVG(EXTRACT(EPOCH FROM (psp.atualizado_em - psp.criado_em)) / 86400)::numeric, 1)
  INTO v_tempo_total_medio
  FROM public.produtos_servicos_projeto psp
  WHERE psp.status_analise = 'concluido'
    AND (psp.excluido_analise = false OR psp.excluido_analise IS NULL)
    AND psp.criado_em >= v_effective_start
    AND psp.criado_em <= v_effective_end;

  SELECT
    ROUND((COUNT(*) FILTER (WHERE status_analise = 'pendencia' OR status_analise ILIKE '%assist%')::numeric / GREATEST(1, COUNT(*))::numeric) * 100, 1)
  INTO v_taxa_pendencias
  FROM public.produtos_servicos_projeto
  WHERE (excluido_analise = false OR excluido_analise IS NULL)
    AND criado_em >= v_effective_start
    AND criado_em <= v_effective_end;

  SELECT jsonb_agg(row_to_json(t))
  INTO v_carga_analista
  FROM (
    SELECT
      COALESCE(u.nome, 'Não Atribuído') as analista,
      COUNT(psp.id) as ambientes,
      COUNT(DISTINCT psp.cliente_id) as clientes
    FROM public.produtos_servicos_projeto psp
    LEFT JOIN public.users u ON psp.analista_id = u.id
    WHERE (psp.excluido_analise = false OR psp.excluido_analise IS NULL)
      AND psp.criado_em >= v_effective_start
      AND psp.criado_em <= v_effective_end
    GROUP BY COALESCE(u.nome, 'Não Atribuído')
    ORDER BY ambientes DESC
  ) t;

  SELECT jsonb_agg(row_to_json(t))
  INTO v_carga_montagem
  FROM (
    SELECT
      m.nome_completo as montador,
      m.telefone,
      m.status,
      COUNT(DISTINCT am.card_id) as ambientes_alocados
    FROM public.montadores m
    LEFT JOIN public.alocacao_montagem am ON m.id = am.montador_id
    GROUP BY m.id, m.nome_completo, m.telefone, m.status
    ORDER BY ambientes_alocados DESC, m.nome_completo ASC
  ) t;

  -------------------------------------------------------------
  -- ABA 4: GESTÃO DE PESSOAS
  -------------------------------------------------------------
  SELECT COUNT(*) INTO v_total_clt FROM public.equipe_clt;
  SELECT COUNT(*) INTO v_total_pj FROM public.parceiros_pj;
  SELECT COUNT(*) INTO v_total_montadores FROM public.montadores;
  SELECT COUNT(*) INTO v_total_fornecedores FROM public.fornecedores;

  SELECT
    ROUND(AVG(EXTRACT(YEAR FROM age(CURRENT_DATE, data_nascimento)))::numeric, 1),
    ROUND(AVG(EXTRACT(YEAR FROM age(CURRENT_DATE, data_admissao)) * 12 + EXTRACT(MONTH FROM age(CURRENT_DATE, data_admissao)))::numeric, 1)
  INTO v_idade_media_clt, v_tempo_medio_meses_clt
  FROM public.equipe_clt
  WHERE data_nascimento IS NOT NULL;

  SELECT jsonb_agg(row_to_json(t))
  INTO v_lista_clt
  FROM (
    SELECT
      id,
      nome_completo,
      data_admissao,
      data_nascimento,
      telefone,
      email,
      municipio,
      areas_atuacao,
      ROUND(EXTRACT(YEAR FROM age(CURRENT_DATE, data_nascimento))) as idade,
      ROUND((EXTRACT(YEAR FROM age(CURRENT_DATE, data_admissao)) * 12 + EXTRACT(MONTH FROM age(CURRENT_DATE, data_admissao)))) as meses_empresa
    FROM public.equipe_clt
    ORDER BY data_admissao ASC NULLS LAST, criado_em ASC
  ) t;

  SELECT jsonb_agg(row_to_json(t))
  INTO v_lista_pj
  FROM (
    SELECT
      id,
      razao_social,
      cnpj,
      socio_nome,
      telefone,
      email,
      criado_em,
      areas_atuacao,
      ROUND((EXTRACT(YEAR FROM age(CURRENT_DATE, criado_em::date)) * 12 + EXTRACT(MONTH FROM age(CURRENT_DATE, criado_em::date)))) as meses_parceria
    FROM public.parceiros_pj
    ORDER BY criado_em ASC
  ) t;

  SELECT jsonb_agg(row_to_json(t))
  INTO v_lista_fornecedores
  FROM (
    SELECT
      id,
      razao_social,
      nome_fantasia,
      cnpj,
      telefone,
      email,
      municipio,
      criado_em
    FROM public.fornecedores
    ORDER BY criado_em ASC
  ) t;

  SELECT jsonb_agg(row_to_json(t))
  INTO v_aniversariantes
  FROM (
    SELECT
      nome_completo as nome,
      'CLT' as tipo,
      data_nascimento,
      to_char(data_nascimento, 'DD/MM') as dia_mes,
      EXTRACT(DAY FROM data_nascimento) as dia
    FROM public.equipe_clt
    WHERE data_nascimento IS NOT NULL
      AND EXTRACT(MONTH FROM data_nascimento) = EXTRACT(MONTH FROM CURRENT_DATE)
    UNION ALL
    SELECT
      socio_nome as nome,
      'PJ (Sócio)' as tipo,
      socio_data_nascimento as data_nascimento,
      to_char(socio_data_nascimento, 'DD/MM') as dia_mes,
      EXTRACT(DAY FROM socio_data_nascimento) as dia
    FROM public.parceiros_pj
    WHERE socio_data_nascimento IS NOT NULL
      AND EXTRACT(MONTH FROM socio_data_nascimento) = EXTRACT(MONTH FROM CURRENT_DATE)
    ORDER BY dia ASC
  ) t;

  SELECT jsonb_agg(row_to_json(t))
  INTO v_distribuicao_tempo_casa
  FROM (
    SELECT
      faixa,
      COUNT(*) as total
    FROM (
      SELECT
        CASE
          WHEN data_admissao >= CURRENT_DATE - INTERVAL '3 months' THEN 'Até 3 meses'
          WHEN data_admissao >= CURRENT_DATE - INTERVAL '6 months' THEN '3 a 6 meses'
          WHEN data_admissao >= CURRENT_DATE - INTERVAL '1 year' THEN '6 a 12 meses'
          WHEN data_admissao >= CURRENT_DATE - INTERVAL '2 years' THEN '1 a 2 anos'
          ELSE 'Mais de 2 anos'
        END as faixa,
        CASE
          WHEN data_admissao >= CURRENT_DATE - INTERVAL '3 months' THEN 1
          WHEN data_admissao >= CURRENT_DATE - INTERVAL '6 months' THEN 2
          WHEN data_admissao >= CURRENT_DATE - INTERVAL '1 year' THEN 3
          WHEN data_admissao >= CURRENT_DATE - INTERVAL '2 years' THEN 4
          ELSE 5
        END as ordem
      FROM public.equipe_clt
      WHERE data_admissao IS NOT NULL
    ) sub
    GROUP BY faixa, ordem
    ORDER BY ordem ASC
  ) t;

  -------------------------------------------------------------
  -- CONSTRUÇÃO DO RESULTADO JSON
  -------------------------------------------------------------
  v_result := jsonb_build_object(
    'atendimentos', jsonb_build_object(
      'total_leads', v_leads_total,
      'convertidos', v_leads_convertidos,
      'taxa_conversao', v_taxa_conversao,
      'media_dia', v_leads_media_dia,
      'vendas_com_data_qtd', v_vendas_com_data_qtd,
      'vendas_total_para_cobertura', v_vendas_total_para_cobertura,
      'status_atendimento', COALESCE(v_status_atendimento, '[]'::jsonb),
      'origens', COALESCE(v_origens, '[]'::jsonb),
      'ticket_medio_origens', COALESCE(v_ticket_medio_origens, '[]'::jsonb),
      'ciclo_vendas', COALESCE(v_ciclo_vendas, '{"geral":{"media_dias":0,"mediana_dias":0,"min_dias":0,"max_dias":0,"qtd_vendas":0},"por_origem":[]}'::jsonb),
      'motivos_perda', COALESCE(v_motivos_perda, '{"total_perdas":0,"qtd_outro":0,"por_motivo":[],"por_etapa":[]}'::jsonb),
      'evolucao_mensal', COALESCE(v_evolucao_mensal, '[]'::jsonb),
      'dias_semana', COALESCE(v_dias_semana, '[]'::jsonb),
      'leads_sem_origem', COALESCE(v_leads_sem_origem, '{"total":0,"convertidos":0}'::jsonb),
      'leads_sem_consultor_consultoria', COALESCE(v_leads_sem_consultor_consultoria, '{"total":0,"convertidos":0}'::jsonb),
      'novo_contato', COALESCE(v_novo_contato, '{"total":0,"criados_no_periodo":0,"despachados_real":0,"por_status":[],"por_origem":[],"taxa_despacho":0}'::jsonb),
      'consultoria', COALESCE(v_consultoria, '{"total":0,"por_status":[],"por_origem":[],"vendidos":0,"taxa_conversao":0,"ticket_medio_consultoria":0,"ciclo_medio_dias":null}'::jsonb),
      'orcamentos', COALESCE(v_orcamentos, '{"total":0,"por_status":[],"por_origem":[],"convertidos":0,"taxa_conversao":0,"ticket_medio_orcamentos":0,"ciclo_medio_dias":null}'::jsonb),
      'tempo_colunas', COALESCE(v_tempo_colunas, '{"novo_contato":[],"consultoria":[],"orcamentos":[]}'::jsonb)
    ),
    'clientes', jsonb_build_object(
      'novos_clientes', v_novos_clientes,
      'valor_vendido', v_valor_vendido,
      'valor_vendido_fechado', v_valor_vendido_fechado,
      'ticket_medio', v_ticket_medio,
      'ticket_mediana', v_ticket_mediana,
      'menor_ticket', v_menor_ticket,
      'maior_ticket', v_maior_ticket,
      'total_formularios_valor', v_total_formularios_valor,
      'total_formularios_vendidos', v_total_formularios_vendidos,
      'maior_ticket_percentual', v_maior_ticket_percentual,
      'ranking_consultores', COALESCE(v_ranking_consultores, '[]'::jsonb),
      'por_consultor', COALESCE(v_por_consultor, '[]'::jsonb)
    ),
    'pcp', jsonb_build_object(
      'total_ambientes', v_total_ambientes,
      'total_clientes', v_total_clientes_pcp,
      'ambientes_por_cliente', v_ambientes_por_cliente,
      'tempo_total_medio_dias', v_tempo_total_medio,
      'taxa_pendencias', v_taxa_pendencias,
      'fases_ambientes', COALESCE(v_fases_ambientes, '[]'::jsonb),
      'tempo_fases', COALESCE(v_tempo_fases, '[]'::jsonb),
      'fase_gargalo', v_fase_gargalo,
      'carga_analista', COALESCE(v_carga_analista, '[]'::jsonb),
      'carga_montagem', COALESCE(v_carga_montagem, '[]'::jsonb)
    ),
    'gestao_pessoas', jsonb_build_object(
      'total_clt', v_total_clt,
      'total_pj', v_total_pj,
      'total_montadores', v_total_montadores,
      'total_fornecedores', v_total_fornecedores,
      'idade_media_clt', COALESCE(v_idade_media_clt, 0),
      'tempo_medio_meses_clt', COALESCE(v_tempo_medio_meses_clt, 0),
      'lista_clt', COALESCE(v_lista_clt, '[]'::jsonb),
      'lista_pj', COALESCE(v_lista_pj, '[]'::jsonb),
      'lista_fornecedores', COALESCE(v_lista_fornecedores, '[]'::jsonb),
      'aniversariantes', COALESCE(v_aniversariantes, '[]'::jsonb),
      'distribuicao_tempo_casa', COALESCE(v_distribuicao_tempo_casa, '[]'::jsonb)
    )
  );

  RETURN v_result;
END;
$function$;
