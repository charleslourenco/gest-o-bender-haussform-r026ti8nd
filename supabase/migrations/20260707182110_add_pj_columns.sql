ALTER TABLE public.clientes ADD COLUMN IF NOT EXISTS tipo_pessoa TEXT;
ALTER TABLE public.clientes ADD COLUMN IF NOT EXISTS nome_fantasia TEXT;
ALTER TABLE public.clientes ADD COLUMN IF NOT EXISTS inscricao_estadual TEXT;
ALTER TABLE public.clientes ADD COLUMN IF NOT EXISTS data_abertura DATE;

ALTER TABLE public.formulario_comercial ADD COLUMN IF NOT EXISTS tipo_pessoa TEXT;
ALTER TABLE public.formulario_comercial ADD COLUMN IF NOT EXISTS nome_fantasia TEXT;
ALTER TABLE public.formulario_comercial ADD COLUMN IF NOT EXISTS inscricao_estadual TEXT;
ALTER TABLE public.formulario_comercial ADD COLUMN IF NOT EXISTS data_abertura DATE;
