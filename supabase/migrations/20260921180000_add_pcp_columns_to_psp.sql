-- Migration aditiva para suporte ao contexto de Planejamento e Programação de Operações (PCP)
-- Sem remover ou alterar colunas existentes nem impactar fluxos atuais

ALTER TABLE public.produtos_servicos_projeto
  ADD COLUMN IF NOT EXISTS visivel_pcp boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS status_pcp text NOT NULL DEFAULT 'planejamento';

CREATE INDEX IF NOT EXISTS idx_produtos_servicos_projeto_visivel_pcp 
  ON public.produtos_servicos_projeto(visivel_pcp);
