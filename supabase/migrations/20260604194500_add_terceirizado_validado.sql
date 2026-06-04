ALTER TABLE public.produtos_servicos_projeto 
ADD COLUMN IF NOT EXISTS terceirizado_validado boolean NOT NULL DEFAULT false;
