-- Migration: Reorganizar réguas de período do dashboard (Performance do Período vs Raio-X Atual e Régua de Coorte)
-- 20261015000000_dashboard_period_and_cohort_reorganization.sql

CREATE OR REPLACE FUNCTION public.get_dashboard_metrics(
  p_start_date timestamptz DEFAULT NULL,
  p_end_date timestamptz DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET statement_timeout = '30s'
AS $function$
DECLARE
  v_effective_start timestamptz;
  v_effective_end timestamptz;
  v_result jsonb;

  -- Performance do Período (Atendimentos / Geral)
  v_leads_chegados_periodo int;
  v_vendas_periodo_qtd int;
  v_vendas_periodo_valor numeric;
  v_vendas_periodo_ticket_medio numeric;
  v_taxa_conversao_periodo numeric;
  v_leads_media_dia numeric;
  v_consultorias_iniciadas_periodo int;
  v_vendas_com_data_qtd int;
  v_vendas_total_para_cobertura int;

  v_status_atendimento jsonb;
  v_origens jsonb;
  v_ticket_medio_origens jsonb;
  v_ciclo_vendas jsonb;
  v_motivos_perda jsonb;
  v_evolucao_mensal jsonb;
  v_dias_semana jsonb;
  v_leads_sem_origem jsonb;
  v_leads_sem_consultor_consultoria jsonb;
  v_novo_contato jsonb;
  v_consultoria jsonb;
  v_orcamentos jsonb;
  v_tempo_colunas jsonb;
  v_regua_coortes jsonb;
  v_raio_x_estagnados jsonb;

  -- Clientes & Vendas
  v_novos_clientes int;
  v_valor_vendido numeric;
  v_valor_vendido_fechado numeric;
  v_ticket_medio numeric;
  v_ticket_mediana numeric;
  v_menor_ticket numeric;
  v_maior_ticket numeric;
  v_total_formularios_valor int;
  v_total_formularios_vendidos int;
  v_maior_ticket_percentual numeric;
  v_ranking_consultores jsonb;
  v_por_consultor jsonb;

  -- PCP
  v_total_ambientes int;
  v_total_clientes_pcp int;
  v_ambientes_por_cliente numeric;
  v_tempo_total_medio numeric;
  v_taxa_pendencias numeric;
  v_fases_ambientes jsonb;
  v_tempo_fases jsonb;
  v_fase_gargalo text;
  v_carga_analista jsonb;
  v_carga_montagem jsonb;

  -- Gestão de Pessoas
  v_total_clt int;
  v_total_pj int;
  v_total_montadores int;
  v_total_fornecedores int;
  v_idade_media_clt numeric;
  v_tempo_medio_meses_clt numeric;
  v_lista_clt jsonb;
  v_lista_pj jsonb;
  v_lista_fornecedores jsonb;
  v_aniversariantes jsonb;
  v_distribuicao_tempo_casa jsonb;

BEGIN
  v_effective_start := COALESCE(p_start_date, (NOW() - INTERVAL '30 days'));
  v_effective_end := COALESCE(p_end_date, NOW());

  -------------------------------------------------------------
  -- ALERTAS: Leads sem origem e sem consultor (somente leads ativos)
  -------------------------------------------------------------
  SELECT
    COUNT(*),
    COUNT(*) FILTER (WHERE status = 'Vendido' OR data_venda IS NOT NULL)
  INTO v_leads_sem_origem
  FROM (
    SELECT
      COUNT(*)::int as total,
      COUNT(*) FILTER (WHERE status = 'Vendido' OR data_venda IS NOT NULL)::int as convertidos
    FROM public.leads l
    WHERE (l.excluido = false OR l.excluido IS NULL)
      AND (l.origem IS NULL OR TRIM(l.origem) = '' OR LOWER(TRIM(l.origem)) IN ('a definir', 'sem origem', 'whatsapp'))
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
      AND TRIM(l.status) NOT IN ('Perdido', 'Vendido')
      AND (l.status NOT LIKE 'SDR:%' OR l.status NOT IN ('SDR: Perdido', 'SDR: Não é lead'))
  ) sub;

  SELECT
    row_to_json(sub)
  INTO v_leads_sem_origem
  FROM (
    SELECT
      COUNT(*)::int as total,
      COUNT(*) FILTER (WHERE status = 'Vendido' OR data_venda IS NOT NULL)::int as convertidos
    FROM public.leads l
    WHERE (l.excluido = false OR l.excluido IS NULL)
      AND (l.origem IS NULL OR TRIM(l.origem) = '' OR LOWER(TRIM(l.origem)) IN ('a definir', 'sem origem', 'whatsapp'))
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
      AND TRIM(l.status) NOT IN ('Perdido', 'Vendido')
      AND (l.status NOT LIKE 'SDR:%' OR l.status NOT IN ('SDR: Perdido', 'SDR: Não é lead'))
  ) sub;

  SELECT
    row_to_json(sub)
  INTO v_leads_sem_consultor_consultoria
  FROM (
    SELECT
      COUNT(*)::int as total,
      COUNT(*) FILTER (WHERE status = 'Vendido' OR data_venda IS NOT NULL)::int as convertidos
    FROM public.leads l
    WHERE (l.excluido = false OR l.excluido IS NULL)
      AND l.consultor_id IS NULL
      AND COALESCE(TRIM(l.categoria), 'Comercial') IN ('Comercial', 'Já é Cliente')
      AND TRIM(l.status) IN ('Consultoria Inicial', 'Projeto', 'Apresentação', 'Negociação', 'Stand By')
  ) sub;

  -------------------------------------------------------------
  -- (1) PERFORMANCE DO PERÍODO & LEADS CHEGADOS NO PERÍODO
  -------------------------------------------------------------
  -- Leads comerciais com origem válida que CHEGARAM no período (criado_em)
  WITH leads_comerciais_validos AS (
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
    COUNT(*)
  INTO v_leads_chegados_periodo
  FROM leads_comerciais_validos l
  WHERE l.criado_em >= v_effective_start
    AND l.criado_em <= v_effective_end;

  -- VENDAS DO PERÍODO: por evento data_venda no período
  -- Para leads comerciais válidos ou vendas com data_venda
  WITH vendas_periodo_cte AS (
    SELECT
      l.id,
      l.origem,
      l.criado_em,
      COALESCE(nullif(fc.datas->>'data_venda','')::timestamptz, l.data_venda) as effective_data_venda,
      fc.valor_total as valor_total
    FROM public.leads l
    LEFT JOIN public.formulario_comercial fc ON fc.lead_id = l.id
    WHERE (l.excluido = false OR l.excluido IS NULL)
      AND (
        (l.data_venda IS NOT NULL AND l.data_venda >= v_effective_start AND l.data_venda <= v_effective_end)
        OR (nullif(fc.datas->>'data_venda','') IS NOT NULL AND (fc.datas->>'data_venda')::timestamptz >= v_effective_start AND (fc.datas->>'data_venda')::timestamptz <= v_effective_end)
      )
  )
  SELECT
    COUNT(DISTINCT id),
    COALESCE(SUM(valor_total), 0),
    CASE
      WHEN COUNT(DISTINCT id) > 0 THEN ROUND((COALESCE(SUM(valor_total), 0) / COUNT(DISTINCT id))::numeric, 2)
      ELSE 0
    END
  INTO v_vendas_periodo_qtd, v_vendas_periodo_valor, v_vendas_periodo_ticket_medio
  FROM vendas_periodo_cte;

  -- Cobertura de data de vendas no período
  SELECT
    COUNT(*) FILTER (WHERE l.data_venda IS NOT NULL),
    COUNT(*)
  INTO v_vendas_com_data_qtd, v_vendas_total_para_cobertura
  FROM public.leads l
  WHERE (l.excluido = false OR l.excluido IS NULL)
    AND (
      (l.data_venda IS NOT NULL AND l.data_venda >= v_effective_start AND l.data_venda <= v_effective_end)
      OR (l.status = 'Vendido' AND l.atualizado_em >= v_effective_start AND l.atualizado_em <= v_effective_end)
    );

  -- Taxa de conversão do período = vendas do período (por data_venda) / leads chegados no período (criado_em)
  v_taxa_conversao_periodo := CASE
    WHEN v_leads_chegados_periodo > 0 THEN
      ROUND((v_vendas_periodo_qtd::numeric / v_leads_chegados_periodo::numeric) * 100, 1)
    ELSE 0
  END;

  v_leads_media_dia := ROUND((v_leads_chegados_periodo::numeric / GREATEST(1, EXTRACT(DAY FROM (v_effective_end - v_effective_start))))::numeric, 1);

  -- Consultorias iniciadas no período via histórico de movimentação kanban (leads_status_historico e/ou notificacoes)
  SELECT
    COUNT(DISTINCT lsh.lead_id)
  INTO v_consultorias_iniciadas_periodo
  FROM public.leads_status_historico lsh
  WHERE lsh.criado_em >= v_effective_start
    AND lsh.criado_em <= v_effective_end
    AND (
      lsh.status_novo IN ('Consultoria Inicial', 'Projeto', 'Apresentação', 'Negociação', 'Stand By', 'Aguardando Consultor', 'Ação Gerente', 'Designar Consultor')
      AND COALESCE(lsh.status_anterior, '') NOT IN ('Consultoria Inicial', 'Projeto', 'Apresentação', 'Negociação', 'Stand By', 'Aguardando Consultor', 'Ação Gerente', 'Designar Consultor')
    );

  -- Se o histórico tiver 0 ou for recente, complementar com leads cujo status inicial de consultoria foi criado no período
  IF v_consultorias_iniciadas_periodo = 0 THEN
    SELECT
      COUNT(DISTINCT l.id)
    INTO v_consultorias_iniciadas_periodo
    FROM public.leads l
    WHERE (l.excluido = false OR l.excluido IS NULL)
      AND COALESCE(TRIM(l.categoria), 'Comercial') IN ('Comercial', 'Já é Cliente')
      AND TRIM(l.status) IN ('Consultoria Inicial', 'Projeto', 'Apresentação', 'Negociação', 'Stand By', 'Vendido', 'Perdido', 'Aguardando Consultor', 'Ação Gerente', 'Designar Consultor')
      AND l.criado_em >= v_effective_start
      AND l.criado_em <= v_effective_end;
  END IF;

  -- Status de atendimento para leads chegados no período com origem comercial válida
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

  -- Origens dos leads chegados no período com taxa de vendas fechadas pelo evento data_venda
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
    ),
    contagem_chegados AS (
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
        COUNT(*) as total
      FROM leads_filtrados l
      WHERE l.criado_em >= v_effective_start
        AND l.criado_em <= v_effective_end
      GROUP BY 1
    ),
    vendas_periodo_origem AS (
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
        COUNT(DISTINCT l.id) as convertidos
      FROM leads_filtrados l
      WHERE l.data_venda IS NOT NULL
        AND l.data_venda >= v_effective_start
        AND l.data_venda <= v_effective_end
      GROUP BY 1
    )
    SELECT
      op.origem_nome as origem,
      COALESCE(c.total, 0) as total,
      COALESCE(vo.convertidos, 0) as convertidos,
      CASE
        WHEN COALESCE(c.total, 0) > 0 THEN ROUND((COALESCE(vo.convertidos, 0)::numeric / c.total::numeric) * 100, 1)
        ELSE 0
      END as taxa,
      ROUND((COALESCE(c.total, 0)::numeric / GREATEST(1, v_leads_chegados_periodo)::numeric) * 100, 1) as percentual
    FROM origens_padrao op
    LEFT JOIN contagem_chegados c ON op.origem_nome = c.canal
    LEFT JOIN vendas_periodo_origem vo ON op.origem_nome = vo.canal
    ORDER BY COALESCE(c.total, 0) DESC, op.origem_nome ASC
  ) t;

  -- Ticket médio por origem calculado estritamente pelas vendas que ocorreram no período (data_venda)
  SELECT jsonb_agg(row_to_json(t))
  INTO v_ticket_medio_origens
  FROM (
    WITH leads_vendidos_periodo AS (
      SELECT
        l.*,
        COALESCE(nullif(fc.datas->>'data_venda','')::timestamptz, l.data_venda) as effective_data_venda,
        fc.valor_total as fc_valor_total,
        fc.id as fc_id
      FROM public.leads l
      JOIN public.formulario_comercial fc ON fc.lead_id = l.id
      WHERE (l.excluido = false OR l.excluido IS NULL)
        AND l.origem IS NOT NULL
        AND TRIM(l.origem) <> ''
        AND LOWER(TRIM(l.origem)) NOT IN ('whatsapp', 'a definir', 'sem origem')
        AND (
          (l.data_venda IS NOT NULL AND l.data_venda >= v_effective_start AND l.data_venda <= v_effective_end)
          OR (nullif(fc.datas->>'data_venda','') IS NOT NULL AND (fc.datas->>'data_venda')::timestamptz >= v_effective_start AND (fc.datas->>'data_venda')::timestamptz <= v_effective_end)
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
      COUNT(fc_id)::int as qtd_vendas,
      ROUND(COALESCE(SUM(fc_valor_total), 0)::numeric, 2) as valor_total,
      CASE
        WHEN COUNT(fc_id) > 0 THEN
          ROUND((COALESCE(SUM(fc_valor_total), 0) / COUNT(fc_id))::numeric, 2)
        ELSE 0
      END as ticket_medio
    FROM leads_vendidos_periodo l
    GROUP BY 1
    HAVING COUNT(fc_id) > 0
    ORDER BY ticket_medio DESC, valor_total DESC
  ) t;

  -- Ciclo de vendas das vendas ocorridas no período (data_venda)
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
        COALESCE(nullif(fc.datas->>'data_venda','')::timestamptz, l.data_venda) - l.criado_em
      ))/86400.0, 0) as ciclo_dias,
      COALESCE(nullif(fc.datas->>'data_venda','')::timestamptz, l.data_venda) as effective_data_venda
    FROM public.leads l
    LEFT JOIN public.formulario_comercial fc ON fc.lead_id = l.id
    WHERE (l.excluido = false OR l.excluido IS NULL)
      AND l.origem IS NOT NULL
      AND TRIM(l.origem) <> ''
      AND LOWER(TRIM(l.origem)) NOT IN ('whatsapp', 'a definir', 'sem origem')
      AND (
        (l.data_venda IS NOT NULL AND l.data_venda >= v_effective_start AND l.data_venda <= v_effective_end)
        OR (nullif(fc.datas->>'data_venda','') IS NOT NULL AND (fc.datas->>'data_venda')::timestamptz >= v_effective_start AND (fc.datas->>'data_venda')::timestamptz <= v_effective_end)
      )
  ),
  vendas_no_periodo AS (
    SELECT
      origem_padronizada,
      ciclo_dias
    FROM leads_elegiveis_ciclo
    WHERE effective_data_venda IS NOT NULL
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

  -- Motivos de Perda ocorridas no período (via evento de status em leads_status_historico ou atualizado_em quando status=Perdido)
  WITH perdas_historico_ids AS (
    SELECT DISTINCT lead_id, criado_em as data_evento
    FROM public.leads_status_historico
    WHERE criado_em >= v_effective_start
      AND criado_em <= v_effective_end
      AND status_novo IN ('Perdido', 'SDR: Perdido')
  ),
  leads_perdas_base AS (
    SELECT
      l.*
    FROM public.leads l
    LEFT JOIN perdas_historico_ids phi ON phi.lead_id = l.id
    WHERE (l.excluido = false OR l.excluido IS NULL)
      AND l.motivo_perda IS NOT NULL
      AND TRIM(l.motivo_perda) <> ''
      AND (
        (phi.lead_id IS NOT NULL)
        OR (
          l.status IN ('Perdido', 'SDR: Perdido')
          AND l.atualizado_em >= v_effective_start
          AND l.atualizado_em <= v_effective_end
        )
      )
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

  -- Evolução mensal: Leads entrados (criado_em) x Vendas ocorridas (data_venda) mês a mês
  SELECT jsonb_agg(row_to_json(t))
  INTO v_evolucao_mensal
  FROM (
    WITH meses AS (
      SELECT generate_series(
        date_trunc('month', v_effective_start),
        date_trunc('month', v_effective_end),
        '1 month'::interval
      ) as mes_inicio
    ),
    leads_entregues AS (
      SELECT
        date_trunc('month', l.criado_em) as mes,
        COUNT(*) as qtd_leads
      FROM public.leads l
      WHERE (l.excluido = false OR l.excluido IS NULL)
        AND l.origem IS NOT NULL
        AND TRIM(l.origem) <> ''
        AND LOWER(TRIM(l.origem)) NOT IN ('whatsapp', 'a definir', 'sem origem')
        AND l.criado_em >= v_effective_start
        AND l.criado_em <= v_effective_end
      GROUP BY 1
    ),
    vendas_fechadas AS (
      SELECT
        date_trunc('month', l.data_venda) as mes,
        COUNT(DISTINCT l.id) as qtd_vendidos
      FROM public.leads l
      WHERE (l.excluido = false OR l.excluido IS NULL)
        AND l.data_venda IS NOT NULL
        AND l.data_venda >= v_effective_start
        AND l.data_venda <= v_effective_end
      GROUP BY 1
    )
    SELECT
      to_char(m.mes_inicio, 'YYYY-MM') as mes_iso,
      to_char(m.mes_inicio, 'Mon/YY') as mes,
      m.mes_inicio as mes_data,
      COALESCE(le.qtd_leads, 0)::int as leads,
      COALESCE(vf.qtd_vendidos, 0)::int as convertidos,
      COALESCE(vf.qtd_vendidos, 0)::int as vendidos
    FROM meses m
    LEFT JOIN leads_entregues le ON le.mes = m.mes_inicio
    LEFT JOIN vendas_fechadas vf ON vf.mes = m.mes_inicio
    ORDER BY m.mes_inicio ASC
  ) t;

  -- Distribuição por dia da semana (leads entrados no período)
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
  -- (3) RÉGUA DE COORTE PARA CONVERSÃO
  -- Leads chegados há X meses, quantos % fecharam até hoje
  -------------------------------------------------------------
  SELECT jsonb_agg(row_to_json(t))
  INTO v_regua_coortes
  FROM (
    WITH coortes_meses AS (
      SELECT
        i as meses_atras,
        date_trunc('month', NOW() - (i || ' month')::interval) as mes_inicio,
        (date_trunc('month', NOW() - (i || ' month')::interval) + interval '1 month' - interval '1 second') as mes_fim
      FROM generate_series(1, 6) i
    )
    SELECT
      cm.meses_atras,
      to_char(cm.mes_inicio, 'Mon/YY') as rotulo_mes,
      to_char(cm.mes_inicio, 'YYYY-MM') as mes_iso,
      COUNT(l.id)::int as total_leads_coorte,
      COUNT(l.id) FILTER (WHERE l.status IN ('Vendido', 'Cliente Ganho', 'Fechado', 'Contrato Fechado', 'Ganho') OR l.data_venda IS NOT NULL)::int as convertidos_ate_hoje,
      CASE
        WHEN COUNT(l.id) > 0 THEN
          ROUND((COUNT(l.id) FILTER (WHERE l.status IN ('Vendido', 'Cliente Ganho', 'Fechado', 'Contrato Fechado', 'Ganho') OR l.data_venda IS NOT NULL)::numeric / COUNT(l.id)::numeric) * 100, 1)
        ELSE 0
      END as taxa_conversao_coorte
    FROM coortes_meses cm
    LEFT JOIN public.leads l ON (l.excluido = false OR l.excluido IS NULL)
      AND l.criado_em >= cm.mes_inicio
      AND l.criado_em <= cm.mes_fim
      AND COALESCE(TRIM(l.categoria), 'Comercial') NOT IN ('Currículo', 'Fornecedor', 'Parceiro', 'Assistência', 'Outros Assuntos')
    GROUP BY cm.meses_atras, cm.mes_inicio, cm.mes_fim
    ORDER BY cm.meses_atras ASC
  ) t;

  -------------------------------------------------------------
  -- (4) SUB-ABAS: Novo Contato, Consultoria e Orçamentos
  -- A aba Consultoria agora usa criado_em para entrada no período
  -- e data_venda para vendas reais no período!
  -------------------------------------------------------------

  -- BLOCO: 'novo_contato' (Aba 01 / SDR)
  WITH nc_leads_periodo AS (
    SELECT l.*
    FROM public.leads l
    WHERE (l.excluido = false OR l.excluido IS NULL)
      AND COALESCE(TRIM(l.categoria), 'Comercial') NOT IN ('Currículo', 'Fornecedor', 'Parceiro', 'Assistência', 'Outros Assuntos')
      AND l.criado_em >= v_effective_start
      AND l.criado_em <= v_effective_end
  ),
  nc_esteira_base AS (
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
      AND l.criado_em >= v_effective_start
      AND l.criado_em <= v_effective_end
      AND (
        (
          TRIM(l.status) IN (
            'Consultoria Inicial', 'Projeto', 'Apresentação', 'Negociação',
            'Stand By', 'Vendido', 'Perdido', 'Aguardando Consultor',
            'Ação Gerente', 'Designar Consultor'
          )
        )
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

  -- BLOCO: 'consultoria' (Aba 02 / Lead p/ Consultoria)
  -- ANTES: usava atualizado_em (ERRADO!)
  -- AGORA: usa criado_em para entrada no período e data_venda para vendas do período!
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
      AND l.criado_em >= v_effective_start
      AND l.criado_em <= v_effective_end
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
  -- Vendas da Consultoria no período: por data_venda no período
  cons_vendas_periodo AS (
    SELECT
      l.id,
      fc.valor_total as fc_valor_total,
      GREATEST(extract(epoch from (
        COALESCE(nullif(fc.datas->>'data_venda','')::timestamptz, l.data_venda) - l.criado_em
      ))/86400.0, 0) as ciclo_dias,
      COALESCE(nullif(fc.datas->>'data_venda','')::timestamptz, l.data_venda) as effective_data_venda
    FROM public.leads l
    LEFT JOIN public.formulario_comercial fc ON fc.lead_id = l.id
    WHERE (l.excluido = false OR l.excluido IS NULL)
      AND COALESCE(TRIM(l.categoria), 'Comercial') IN ('Comercial', 'Já é Cliente')
      AND (
        (l.data_venda IS NOT NULL AND l.data_venda >= v_effective_start AND l.data_venda <= v_effective_end)
        OR (nullif(fc.datas->>'data_venda','') IS NOT NULL AND (fc.datas->>'data_venda')::timestamptz >= v_effective_start AND (fc.datas->>'data_venda')::timestamptz <= v_effective_end)
      )
  ),
  cons_resumo AS (
    SELECT
      (SELECT COUNT(*)::int FROM cons_base) as total,
      (SELECT COUNT(DISTINCT id)::int FROM cons_vendas_periodo) as vendidos,
      (SELECT COALESCE(SUM(fc_valor_total), 0) FROM cons_vendas_periodo WHERE fc_valor_total > 0) as soma_valor,
      (SELECT COUNT(DISTINCT id) FROM cons_vendas_periodo WHERE fc_valor_total > 0) as qtd_com_valor,
      (SELECT ROUND(AVG(ciclo_dias)::numeric, 1) FROM cons_vendas_periodo WHERE effective_data_venda IS NOT NULL) as ciclo_medio_dias
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

  -- BLOCO: 'orcamentos' (Aba 05 / Leads p/ Orçamentos)
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
  orc_vendas_periodo AS (
    SELECT
      l.id,
      fc.valor_total as fc_valor_total,
      GREATEST(extract(epoch from (
        COALESCE(nullif(fc.datas->>'data_venda','')::timestamptz, l.data_venda) - l.criado_em
      ))/86400.0, 0) as ciclo_dias,
      COALESCE(nullif(fc.datas->>'data_venda','')::timestamptz, l.data_venda) as effective_data_venda
    FROM public.leads l
    LEFT JOIN public.formulario_comercial fc ON fc.lead_id = l.id
    WHERE (l.excluido = false OR l.excluido IS NULL)
      AND LOWER(COALESCE(TRIM(l.categoria), 'Comercial')) IN ('orçamento', 'orcamento')
      AND (
        (l.data_venda IS NOT NULL AND l.data_venda >= v_effective_start AND l.data_venda <= v_effective_end)
        OR (nullif(fc.datas->>'data_venda','') IS NOT NULL AND (fc.datas->>'data_venda')::timestamptz >= v_effective_start AND (fc.datas->>'data_venda')::timestamptz <= v_effective_end)
      )
  ),
  orc_resumo AS (
    SELECT
      (SELECT COUNT(*)::int FROM orc_base) as total,
      (SELECT COUNT(DISTINCT id)::int FROM orc_vendas_periodo) as convertidos,
      (SELECT COALESCE(SUM(fc_valor_total), 0) FROM orc_vendas_periodo WHERE fc_valor_total > 0) as soma_valor,
      (SELECT COUNT(DISTINCT id) FROM orc_vendas_periodo WHERE fc_valor_total > 0) as qtd_com_valor,
      (SELECT ROUND(AVG(ciclo_dias)::numeric, 1) FROM orc_vendas_periodo WHERE effective_data_venda IS NOT NULL) as ciclo_medio_dias
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
  -- (2) RAIO-X ATUAL (SEM FILTRO DE PERÍODO, ESTADO DE HOJE)
  -- Tempo parado em cada coluna da esteira, leads estagnados
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

  -- Resumo de leads estagnados no Raio-X Atual (parados há mais de 30, 60 e 90 dias)
  SELECT jsonb_build_object(
    'parados_mais_30d', COUNT(*) FILTER (WHERE COALESCE(l.atualizado_em, l.criado_em) < (NOW() - interval '30 days')),
    'parados_mais_60d', COUNT(*) FILTER (WHERE COALESCE(l.atualizado_em, l.criado_em) < (NOW() - interval '60 days')),
    'parados_mais_90d', COUNT(*) FILTER (WHERE COALESCE(l.atualizado_em, l.criado_em) < (NOW() - interval '90 days')),
    'total_ativos', COUNT(*)
  )
  INTO v_raio_x_estagnados
  FROM public.leads l
  WHERE (l.excluido = false OR l.excluido IS NULL)
    AND COALESCE(TRIM(l.categoria), 'Comercial') IN ('Comercial', 'Já é Cliente')
    AND TRIM(l.status) NOT IN ('Vendido', 'Perdido', 'SDR: Perdido', 'SDR: Não é lead');

  -------------------------------------------------------------
  -- ABA 2: CLIENTES & VENDAS (HISTÓRICO / RANKINGS)
  -------------------------------------------------------------
  SELECT COUNT(*)
  INTO v_novos_clientes
  FROM public.clientes c
  WHERE (c.excluido = false OR c.excluido IS NULL)
    AND c.criado_em >= v_effective_start
    AND c.criado_em <= v_effective_end;

  -- Vendas totais da empresa calculadas no período
  WITH leads_vendas_valores AS (
    SELECT
      fc.valor_total as fc_valor_total,
      l.status,
      l.data_venda,
      fc.id as fc_id
    FROM public.formulario_comercial fc
    INNER JOIN public.leads l ON fc.lead_id = l.id
    WHERE (l.excluido = false OR l.excluido IS NULL)
      AND fc.valor_total > 0
      AND (
        (l.data_venda IS NOT NULL AND l.data_venda >= v_effective_start AND l.data_venda <= v_effective_end)
        OR (fc.criado_em >= v_effective_start AND fc.criado_em <= v_effective_end)
      )
  )
  SELECT
    COALESCE(SUM(fc_valor_total), 0),
    COALESCE(AVG(fc_valor_total), 0),
    COALESCE(percentile_cont(0.5) WITHIN GROUP (ORDER BY fc_valor_total), 0),
    COALESCE(MIN(fc_valor_total), 0),
    COALESCE(MAX(fc_valor_total), 0),
    COUNT(*),
    COUNT(*) FILTER (WHERE status IN ('Vendido', 'Cliente Ganho', 'Fechado', 'Contrato Fechado', 'Ganho') OR data_venda IS NOT NULL),
    COALESCE(SUM(fc_valor_total) FILTER (WHERE status IN ('Vendido', 'Cliente Ganho', 'Fechado', 'Contrato Fechado', 'Ganho') OR data_venda IS NOT NULL), 0)
  INTO
    v_valor_vendido,
    v_ticket_medio,
    v_ticket_mediana,
    v_menor_ticket,
    v_maior_ticket,
    v_total_formularios_valor,
    v_total_formularios_vendidos,
    v_valor_vendido_fechado
  FROM leads_vendas_valores;

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
    WITH leads_rotulados AS (
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
      INNER JOIN public.leads l ON fc.lead_id = l.id
      LEFT JOIN public.users u ON l.consultor_id = u.id
      WHERE (l.excluido = false OR l.excluido IS NULL)
        AND fc.valor_total > 0
        AND (
          (l.data_venda IS NOT NULL AND l.data_venda >= v_effective_start AND l.data_venda <= v_effective_end)
          OR (fc.criado_em >= v_effective_start AND fc.criado_em <= v_effective_end)
        )
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
  -- BLOCO: por_consultor (Métricas de Conversão por Consultor)
  -- Mantém contagem integral de leads (inclusive Perdidos)
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
        COALESCE(nullif(fc.datas->>'data_venda','')::timestamptz, l.data_venda) as data_venda_efetiva,
        fc.valor_total as fc_valor_total,
        GREATEST(extract(epoch from (
          COALESCE(nullif(fc.datas->>'data_venda','')::timestamptz, l.data_venda) - l.criado_em
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
        AND (
          (l.criado_em >= v_effective_start AND l.criado_em <= v_effective_end)
          OR (l.data_venda IS NOT NULL AND l.data_venda >= v_effective_start AND l.data_venda <= v_effective_end)
        )
    )
    SELECT
      consultor,
      COUNT(DISTINCT lead_id)::int as total_leads,
      COUNT(DISTINCT lead_id) FILTER (WHERE status = 'Vendido' OR data_venda_efetiva IS NOT NULL)::int as vendidos,
      ROUND(
        CASE
          WHEN COUNT(DISTINCT lead_id) > 0 THEN
            (COUNT(DISTINCT lead_id) FILTER (WHERE status = 'Vendido' OR data_venda_efetiva IS NOT NULL)::numeric / COUNT(DISTINCT lead_id)::numeric) * 100
          ELSE 0
        END,
        1
      ) as taxa_conversao,
      ROUND(
        AVG(ciclo_dias) FILTER (WHERE (status = 'Vendido' OR data_venda_efetiva IS NOT NULL) AND data_venda_efetiva IS NOT NULL)::numeric,
        1
      ) as ciclo_medio_dias,
      ROUND(COALESCE(SUM(fc_valor_total) FILTER (WHERE status = 'Vendido' OR data_venda_efetiva IS NOT NULL), 0)::numeric, 2) as valor_total,
      ROUND(
        CASE
          WHEN COUNT(DISTINCT lead_id) FILTER (WHERE (status = 'Vendido' OR data_venda_efetiva IS NOT NULL) AND fc_valor_total > 0) > 0 THEN
            COALESCE(SUM(fc_valor_total) FILTER (WHERE status = 'Vendido' OR data_venda_efetiva IS NOT NULL), 0) / COUNT(DISTINCT lead_id) FILTER (WHERE (status = 'Vendido' OR data_venda_efetiva IS NOT NULL) AND fc_valor_total > 0)::numeric
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
      'total_leads', v_leads_chegados_periodo,
      'convertidos', v_vendas_periodo_qtd,
      'taxa_conversao', v_taxa_conversao_periodo,
      'media_dia', v_leads_media_dia,
      'vendas_com_data_qtd', v_vendas_com_data_qtd,
      'vendas_total_para_cobertura', v_vendas_total_para_cobertura,
      'vendas_periodo_qtd', v_vendas_periodo_qtd,
      'vendas_periodo_valor', v_vendas_periodo_valor,
      'vendas_periodo_ticket_medio', v_vendas_periodo_ticket_medio,
      'consultorias_iniciadas_periodo', v_consultorias_iniciadas_periodo,
      'status_atendimento', COALESCE(v_status_atendimento, '[]'::jsonb),
      'origens', COALESCE(v_origens, '[]'::jsonb),
      'ticket_medio_origens', COALESCE(v_ticket_medio_origens, '[]'::jsonb),
      'ciclo_vendas', COALESCE(v_ciclo_vendas, '{"geral":{"media_dias":0,"mediana_dias":0,"min_dias":0,"max_dias":0,"qtd_vendas":0},"por_origem":[]}'::jsonb),
      'motivos_perda', COALESCE(v_motivos_perda, '{"total_perdas":0,"qtd_outro":0,"por_motivo":[],"por_etapa":[]}'::jsonb),
      'evolucao_mensal', COALESCE(v_evolucao_mensal, '[]'::jsonb),
      'dias_semana', COALESCE(v_dias_semana, '[]'::jsonb),
      'leads_sem_origem', COALESCE(v_leads_sem_origem, '{"total":0,"convertidos":0}'::jsonb),
      'leads_sem_consultor_consultoria', COALESCE(v_leads_sem_consultor_consultoria, '{"total":0,"convertidos":0}'::jsonb),
      'regua_coortes', COALESCE(v_regua_coortes, '[]'::jsonb),
      'raio_x_estagnados', COALESCE(v_raio_x_estagnados, '{"parados_mais_30d":0,"parados_mais_60d":0,"parados_mais_90d":0,"total_ativos":0}'::jsonb),
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
