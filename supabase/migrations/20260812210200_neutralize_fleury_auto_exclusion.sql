-- Neutralize Fleury auto-exclusion
--
-- This migration replaces the removed migration
-- 20260812180000_soft_delete_diego_fleury_duplicates.sql which previously
-- ran: UPDATE public.clientes SET excluido = true
--      WHERE email = 'diegofleury@hotmail.com' OR nome ILIKE '%FLEURY%';
--
-- That one-time UPDATE caused any client whose name contained "Fleury" or
-- whose email was diegofleury@hotmail.com to be automatically soft-deleted
-- on every fresh database build.  The removal of that file ensures the rule
-- no longer executes.
--
-- This migration is intentionally a NO-OP on existing data:
--   * It does NOT reactivate any currently excluded clients.
--   * It does NOT alter any foreign-key behavior.
--   * It only ensures the excluido column continues to exist with its
--     correct default so that new clients (including any named "Fleury")
--     are created with excluido = false and remain visible.
--
-- Going forward, newly created clients matching the former criteria will
-- persist normally in the system and appear in the client list.

ALTER TABLE public.clientes
  ADD COLUMN IF NOT EXISTS excluido BOOLEAN NOT NULL DEFAULT false;

-- Safety: backfill any NULL values (should not exist, but guarantees
-- idempotency if run on a database where the column was added without
-- a default in an earlier migration).
UPDATE public.clientes SET excluido = false WHERE excluido IS NULL;
