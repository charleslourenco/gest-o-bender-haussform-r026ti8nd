ALTER TABLE public.produtos_servicos_projeto
  ADD COLUMN IF NOT EXISTS arquivado_analise BOOLEAN NOT NULL DEFAULT false;
