-- Migration: Adicionar status 'Vendido' ao filtro da aba 'lead-orcamentos' em get_dashboard_metrics
-- Permite que leads de orçamento que forem vendidos continuem reconhecidos e contabilizados nas métricas comerciais da função RPC.

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
  v_evolucao_mensal JSONB;
  v_dias_semana JSONB;
  v_leads_sem_origem JSONB;

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
  -- NOVO CAMPO: leads_sem_origem (todos os leads Comerciais não excluídos sem origem válida)
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
          LOWER(COALESCE(TRIM(l.categoria), 'Comercial')) IN ('orçamento', 'orcamento')
          OR TRIM(l.status) IN ('Novo Orçamento', 'Em andamento', 'Orçamento Concluido', 'Orçamento Concluído', 'Vendido', 'Encaminhado')
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
            LOWER(COALESCE(TRIM(l.categoria), 'Comercial')) IN ('orçamento', 'orcamento')
            OR TRIM(l.status) IN ('Novo Orçamento', 'Em andamento', 'Orçamento Concluido', 'Orçamento Concluído', 'Vendido', 'Encaminhado')
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

  -- Origens dos leads das 4 abas com origem válida:
  -- origens_padrao sem WhatsApp e Assistência Técnica, com Meta Ads após Google
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
            LOWER(COALESCE(TRIM(l.categoria), 'Comercial')) IN ('orçamento', 'orcamento')
            OR TRIM(l.status) IN ('Novo Orçamento', 'Em andamento', 'Orçamento Concluido', 'Orçamento Concluído', 'Vendido', 'Encaminhado')
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

  -- Evolução mensal (apenas leads filtrados das 4 abas com origem válida)
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
            LOWER(COALESCE(TRIM(l.categoria), 'Comercial')) IN ('orçamento', 'orcamento')
            OR TRIM(l.status) IN ('Novo Orçamento', 'Em andamento', 'Orçamento Concluido', 'Orçamento Concluído', 'Vendido', 'Encaminhado')
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

  -- Distribuição por dia da semana (apenas leads filtrados das 4 abas com origem válida)
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
            LOWER(COALESCE(TRIM(l.categoria), 'Comercial')) IN ('orçamento', 'orcamento')
            OR TRIM(l.status) IN ('Novo Orçamento', 'Em andamento', 'Orçamento Concluido', 'Orçamento Concluído', 'Vendido', 'Encaminhado')
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
  -- ABA 2: CLIENTES & VENDAS (Métricas de formulários / ranking via JOIN com leads filtrados)
  -------------------------------------------------------------
  SELECT COUNT(*)
  INTO v_novos_clientes
  FROM public.clientes c
  WHERE (c.excluido = false OR c.excluido IS NULL)
    AND c.criado_em >= v_effective_start
    AND c.criado_em <= v_effective_end;

  -- Estatísticas dos formulários comerciais com valor via JOIN com leads válidos das 4 abas
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
          LOWER(COALESCE(TRIM(l.categoria), 'Comercial')) IN ('orçamento', 'orcamento')
          OR TRIM(l.status) IN ('Novo Orçamento', 'Em andamento', 'Orçamento Concluido', 'Orçamento Concluído', 'Vendido', 'Encaminhado')
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

  -- Ranking por consultor via INNER JOIN com leads válidos das 4 abas
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
            LOWER(COALESCE(TRIM(l.categoria), 'Comercial')) IN ('orçamento', 'orcamento')
            OR TRIM(l.status) IN ('Novo Orçamento', 'Em andamento', 'Orçamento Concluido', 'Orçamento Concluído', 'Vendido', 'Encaminhado')
          )
        )
    )
    SELECT
      COALESCE(u.nome, l.criado_por_nome, 'Não informado') as consultor,
      COUNT(fc.id) as vendas,
      COALESCE(SUM(fc.valor_total), 0) as valor_total,
      ROUND(COALESCE(AVG(fc.valor_total), 0), 2) as ticket_medio,
      ROUND(COALESCE(percentile_cont(0.5) WITHIN GROUP (ORDER BY fc.valor_total), 0)::numeric, 2) as ticket_mediana,
      COALESCE(MIN(fc.valor_total), 0) as menor_ticket,
      COALESCE(MAX(fc.valor_total), 0) as maior_ticket
    FROM public.formulario_comercial fc
    INNER JOIN leads_filtrados l ON fc.lead_id = l.id
    LEFT JOIN public.users u ON l.consultor_id = u.id
    WHERE fc.valor_total > 0
      AND fc.criado_em >= v_effective_start
      AND fc.criado_em <= v_effective_end
    GROUP BY COALESCE(u.nome, l.criado_por_nome, 'Não informado')
    ORDER BY valor_total DESC
  ) t;

  -------------------------------------------------------------
  -- ABA 3: PCP (Análise Técnica + Produção + Montagem)
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
      'evolucao_mensal', COALESCE(v_evolucao_mensal, '[]'::jsonb),
      'dias_semana', COALESCE(v_dias_semana, '[]'::jsonb),
      'leads_sem_origem', COALESCE(v_leads_sem_origem, '{"total":0,"convertidos":0}'::jsonb)
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
      'ranking_consultores', COALESCE(v_ranking_consultores, '[]'::jsonb)
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
