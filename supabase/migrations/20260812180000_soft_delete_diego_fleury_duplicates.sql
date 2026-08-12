-- Soft-delete the three duplicated "Diego Fleury" client records.
-- Targeted, idempotent, reversible point-only operation.
-- Sets excluido = true on rows matching email = 'diegofleury@hotmail.com'
-- OR nome ILIKE '%FLEURY%'. No structural or code changes.

UPDATE public.clientes
SET excluido = true,
    atualizado_em = NOW()
WHERE email = 'diegofleury@hotmail.com'
   OR nome ILIKE '%FLEURY%';
