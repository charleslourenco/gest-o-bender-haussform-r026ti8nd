-- Migration: 20260915150000_fix_whatsapp_messages_external_id_unique_index.sql
-- Descrição: Substitui o índice parcial whatsapp_messages_external_id_idx por um índice único COMPLETO
-- em public.whatsapp_messages(external_id).
-- No PostgreSQL, o comando ON CONFLICT (external_id) falha com 42P10 se o índice correspondente
-- for parcial (WHERE external_id IS NOT NULL). Um índice único B-Tree padrão já ignora valores NULL
-- (múltiplos NULLs são permitidos por definição SQL) e permite cláusula ON CONFLICT (external_id).

DROP INDEX IF EXISTS public.whatsapp_messages_external_id_idx;

CREATE UNIQUE INDEX IF NOT EXISTS whatsapp_messages_external_id_idx
ON public.whatsapp_messages (external_id);
