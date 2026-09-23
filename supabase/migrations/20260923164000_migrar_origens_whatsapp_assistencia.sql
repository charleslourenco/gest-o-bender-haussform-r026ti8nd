-- Migration: Atualizar origens legadas ('WhatsApp', 'Assistência Técnica', 'Assistência') para 'A definir'
-- Data: 2026-09-23
-- Não toca status, categoria, coluna, notas, notas_pessoais nem outros campos.

UPDATE public.leads
SET origem = 'A definir'
WHERE lower(trim(coalesce(origem, ''))) = 'whatsapp'
   OR origem IN ('Assistência Técnica', 'Assistência');
