ALTER TABLE public.templates ADD COLUMN IF NOT EXISTS placeholders_customizados jsonb DEFAULT '[]'::jsonb;
ALTER TABLE public.formulario_comercial ADD COLUMN IF NOT EXISTS placeholders_customizados jsonb DEFAULT '{}'::jsonb;
