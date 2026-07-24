-- Ensure arquivado_analise column exists on produtos_servicos_projeto (idempotent)
ALTER TABLE public.produtos_servicos_projeto
  ADD COLUMN IF NOT EXISTS arquivado_analise BOOLEAN NOT NULL DEFAULT false;
