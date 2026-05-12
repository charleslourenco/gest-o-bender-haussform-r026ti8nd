DO $$
BEGIN
  ALTER TABLE public.produtos_servicos_projeto ADD COLUMN IF NOT EXISTS analista_id UUID REFERENCES public.users(id) ON DELETE SET NULL;
  ALTER TABLE public.produtos_servicos_projeto ADD COLUMN IF NOT EXISTS codigo_rastreio TEXT;
END $$;
