ALTER TABLE public.templates ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'ativo';
