-- Add per-module soft delete flags to produtos_servicos_projeto
ALTER TABLE public.produtos_servicos_projeto
  ADD COLUMN IF NOT EXISTS excluido_analise BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE public.produtos_servicos_projeto
  ADD COLUMN IF NOT EXISTS excluido_producao BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE public.produtos_servicos_projeto
  ADD COLUMN IF NOT EXISTS excluido_montagem BOOLEAN NOT NULL DEFAULT false;

-- Add soft delete flag to clientes
ALTER TABLE public.clientes
  ADD COLUMN IF NOT EXISTS excluido BOOLEAN NOT NULL DEFAULT false;

-- Add soft delete flag to leads
ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS excluido BOOLEAN NOT NULL DEFAULT false;

-- Backfill any NULL values (safety)
UPDATE public.produtos_servicos_projeto SET excluido_analise = false WHERE excluido_analise IS NULL;
UPDATE public.produtos_servicos_projeto SET excluido_producao = false WHERE excluido_producao IS NULL;
UPDATE public.produtos_servicos_projeto SET excluido_montagem = false WHERE excluido_montagem IS NULL;
UPDATE public.clientes SET excluido = false WHERE excluido IS NULL;
UPDATE public.leads SET excluido = false WHERE excluido IS NULL;
