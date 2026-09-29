-- Migration: Adicionar coluna eh_consultor na tabela public.users
-- 100% aditiva, default false, sem NOT NULL forçado, reversível.
-- Preserva todas as colunas, triggers, RLS e dados existentes.

ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS eh_consultor boolean DEFAULT false;

-- Comentário para documentar a coluna
COMMENT ON COLUMN public.users.eh_consultor IS 'Define se o usuário possui a função de Consultor/Responsável no CRM comercial';
