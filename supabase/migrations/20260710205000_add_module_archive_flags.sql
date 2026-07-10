ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS arquivado_comercial BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE public.produtos_servicos_projeto ADD COLUMN IF NOT EXISTS arquivado_producao BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE public.produtos_servicos_projeto ADD COLUMN IF NOT EXISTS arquivado_montagem BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE public.acompanhamentos ADD COLUMN IF NOT EXISTS arquivado_acompanhamento BOOLEAN NOT NULL DEFAULT false;
