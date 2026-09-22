-- Migration aditiva para ETAPA 4 do PCP:
-- Adiciona data_limite_analise e data_obra_montagem em produtos_servicos_projeto
-- Preserva compatibilidade e RLS já existente na tabela.

ALTER TABLE public.produtos_servicos_projeto
  ADD COLUMN IF NOT EXISTS data_limite_analise date NULL,
  ADD COLUMN IF NOT EXISTS data_obra_montagem date NULL;

CREATE INDEX IF NOT EXISTS idx_psp_data_limite_analise ON public.produtos_servicos_projeto (data_limite_analise);
CREATE INDEX IF NOT EXISTS idx_psp_data_obra_montagem ON public.produtos_servicos_projeto (data_obra_montagem);
