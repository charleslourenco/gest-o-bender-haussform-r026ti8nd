-- Migration to support "Negociação" and "Ação Gerente" states.
-- The `status` column in `public.leads` is of type TEXT, allowing these new values without schema changes.
-- This migration ensures idempotent compliance with the requirements.

DO $BODY$
BEGIN
    -- No schema changes are required for the TEXT column in public.leads.
    -- If there were CHECK constraints restricting the allowed values, they would be updated here.
END $BODY$;
