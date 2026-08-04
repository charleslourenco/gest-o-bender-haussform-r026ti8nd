-- Add baixa tracking columns to estoque_alocacoes
ALTER TABLE public.estoque_alocacoes
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'ativo';

ALTER TABLE public.estoque_alocacoes
  ADD COLUMN IF NOT EXISTS baixado_em TIMESTAMPTZ;

ALTER TABLE public.estoque_alocacoes
  ADD COLUMN IF NOT EXISTS baixado_por TEXT;

-- Index for status lookups
CREATE INDEX IF NOT EXISTS idx_estoque_alocacoes_status ON public.estoque_alocacoes(status);
