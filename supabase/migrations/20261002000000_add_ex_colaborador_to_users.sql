-- Migration: Adicionar coluna ex_colaborador na tabela public.users
-- 100% aditiva, default false, preserva dados existentes e RLS.

ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS ex_colaborador boolean DEFAULT false;

COMMENT ON COLUMN public.users.ex_colaborador IS 'Indica se o usuário é um ex-colaborador. Pode também ter eh_consultor=true para elegibilidade no CRM.';
