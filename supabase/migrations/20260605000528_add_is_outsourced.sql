ALTER TABLE public.produtos_servicos_projeto ADD COLUMN IF NOT EXISTS is_outsourced BOOLEAN NOT NULL DEFAULT false;
