ALTER TABLE public.produtos_servicos_projeto 
ADD COLUMN IF NOT EXISTS outsourced_checked BOOLEAN NOT NULL DEFAULT false;
