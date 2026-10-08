-- Migration: Criar RPC public.get_origens_despacho_perda_consultor
-- Retorna distribuição de leads por origem com despachados, taxa_despacho, perdidos e taxa_perda
-- (verificada no QA da versão 0.0.1044)
-- Aceita filtro opcional por consultor (p_consultor_id uuid).
-- Regra de negócio: leads perdidos MANTÊM atribuição de consultor (consultor_id preservado).
-- Considera tanto consultor_id quanto consultor_id_secundario quando filtrado por consultor.

CREATE OR REPLACE FUNCTION public.get_origens_despacho_perda_consultor(
  p_start_date timestamptz DEFAULT NULL,
  p_end_date timestamptz DEFAULT NULL,
  p_consultor_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_effective_start timestamptz;
  v_effective_end timestamptz;
  v_result jsonb;
BEGIN
  -- Definir período efetivo:
  -- Se ambos forem nulos, abrange todo o histórico
  IF p_start_date IS NULL AND p_end_date IS NULL THEN
    SELECT COALESCE(MIN(criado_em), NOW() - INTERVAL '12 months')
    INTO v_effective_start
    FROM public.leads
    WHERE (excluido = false OR excluido IS NULL);

    v_effective_end := NOW();
  ELSE
    v_effective_start := COALESCE(p_start_date, NOW() - INTERVAL '30 days');
    v_effective_end := COALESCE(p_end_date, NOW());
  END IF;

  WITH leads_periodo AS (
    SELECT
      l.id,
      l.status,
      l.categoria,
      CASE
        WHEN l.origem IS NULL OR TRIM(l.origem) = '' THEN 'A definir'
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
      END as origem_norm
    FROM public.leads l
    WHERE (l.excluido = false OR l.excluido IS NULL)
      AND l.criado_em >= v_effective_start
      AND l.criado_em <= v_effective_end
      AND (
        p_consultor_id IS NULL
        OR l.consultor_id = p_consultor_id
        OR l.consultor_id_secundario = p_consultor_id
      )
  ),
  despachados_cte AS (
    SELECT DISTINCT l.id
    FROM public.leads l
    WHERE (l.excluido = false OR l.excluido IS NULL)
      AND l.criado_em >= v_effective_start
      AND l.criado_em <= v_effective_end
      AND (
        p_consultor_id IS NULL
        OR l.consultor_id = p_consultor_id
        OR l.consultor_id_secundario = p_consultor_id
      )
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
        OR EXISTS (
          SELECT 1 FROM public.leads_status_historico h
          WHERE h.lead_id = l.id
            AND (
              TRIM(h.status_novo) IN (
                'Consultoria Inicial', 'Projeto', 'Apresentação', 'Negociação',
                'Stand By', 'Vendido', 'Perdido', 'Aguardando Consultor',
                'Ação Gerente', 'Designar Consultor'
              )
              OR TRIM(h.status_novo) IN ('Novo Orçamento', 'Em andamento', 'Orçamento Concluido', 'Orçamento Concluído', 'Encaminhado')
            )
        )
      )
  ),
  agrupado AS (
    SELECT
      lp.origem_norm as origem,
      COUNT(*)::int as total_leads,
      COUNT(d.id)::int as despachados,
      COUNT(CASE WHEN TRIM(lp.status) IN ('Perdido', 'SDR: Perdido') THEN 1 END)::int as perdidos
    FROM leads_periodo lp
    LEFT JOIN despachados_cte d ON d.id = lp.id
    GROUP BY lp.origem_norm
  )
  SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'origem', a.origem,
        'total_leads', a.total_leads,
        'despachados', a.despachados,
        'taxa_despacho', CASE
          WHEN a.total_leads > 0 THEN ROUND((a.despachados::numeric / a.total_leads::numeric) * 100, 1)
          ELSE 0
        END,
        'perdidos', a.perdidos,
        'taxa_perda', CASE
          WHEN a.total_leads > 0 THEN ROUND((a.perdidos::numeric / a.total_leads::numeric) * 100, 1)
          ELSE 0
        END
      )
      ORDER BY a.total_leads DESC, a.origem ASC
    ),
    '[]'::jsonb
  )
  INTO v_result
  FROM agrupado a;

  RETURN v_result;
END;
$$;

-- Permissões de execução
GRANT EXECUTE ON FUNCTION public.get_origens_despacho_perda_consultor(timestamptz, timestamptz, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_origens_despacho_perda_consultor(timestamptz, timestamptz, uuid) TO anon;
