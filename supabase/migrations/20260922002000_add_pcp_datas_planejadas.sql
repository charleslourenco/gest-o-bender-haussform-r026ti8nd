-- Migration puramente aditiva para colunas de data planejada diária no PCP
-- Não destrutiva: adiciona colunas nullable para data_planejada_analise, data_planejada_producao, data_planejada_montagem
-- Formato esperado: date (ex: '2026-09-08')
-- Adiciona suporte no histórico de reprogramação para tipo 'dia' / 'data'

ALTER TABLE public.produtos_servicos_projeto
  ADD COLUMN IF NOT EXISTS data_planejada_analise date,
  ADD COLUMN IF NOT EXISTS data_planejada_producao date,
  ADD COLUMN IF NOT EXISTS data_planejada_montagem date;

CREATE INDEX IF NOT EXISTS idx_psp_data_analise ON public.produtos_servicos_projeto (data_planejada_analise);
CREATE INDEX IF NOT EXISTS idx_psp_data_producao ON public.produtos_servicos_projeto (data_planejada_producao);
CREATE INDEX IF NOT EXISTS idx_psp_data_montagem ON public.produtos_servicos_projeto (data_planejada_montagem);

ALTER TABLE public.pcp_reprogramacao_historico
  ADD COLUMN IF NOT EXISTS data_anterior date,
  ADD COLUMN IF NOT EXISTS data_nova date;
