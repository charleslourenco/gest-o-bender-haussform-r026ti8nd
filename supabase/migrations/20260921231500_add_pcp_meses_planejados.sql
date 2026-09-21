-- Migration aditiva para colunas de mês planejado no PCP
-- Não destrutiva: adiciona colunas nullable para mes_planejado_analise, mes_planejado_producao, mes_planejado_montagem
-- Formato esperado: 'YYYY-MM' (ex: '2026-01', '2026-10')

ALTER TABLE public.produtos_servicos_projeto
  ADD COLUMN IF NOT EXISTS mes_planejado_analise text,
  ADD COLUMN IF NOT EXISTS mes_planejado_producao text,
  ADD COLUMN IF NOT EXISTS mes_planejado_montagem text;

CREATE INDEX IF NOT EXISTS idx_psp_mes_analise ON public.produtos_servicos_projeto (mes_planejado_analise);
CREATE INDEX IF NOT EXISTS idx_psp_mes_producao ON public.produtos_servicos_projeto (mes_planejado_producao);
CREATE INDEX IF NOT EXISTS idx_psp_mes_montagem ON public.produtos_servicos_projeto (mes_planejado_montagem);

-- Adicionar colunas opcionais no histórico de reprogramação para suportar tanto semana quanto mês
ALTER TABLE public.pcp_reprogramacao_historico
  ADD COLUMN IF NOT EXISTS tipo_planejamento text DEFAULT 'semana',
  ADD COLUMN IF NOT EXISTS mes_anterior text,
  ADD COLUMN IF NOT EXISTS mes_novo text;
