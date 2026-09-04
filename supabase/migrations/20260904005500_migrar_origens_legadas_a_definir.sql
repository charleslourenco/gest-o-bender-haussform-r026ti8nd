-- Migration: Migrar origens legadas (Cadastro Direto, Assistência Técnica, Parceiros, Outdoor) para 'A definir'
-- Data: 2026-09-04
-- Idempotente: preserva a nota original [Origem anterior: <origem>] sem duplicar e atualiza origem para 'A definir'.

-- 1. Apendar às notas [Origem anterior: <origem>] para os leads cuja origem atual seja uma das 4 legadas,
-- apenas se a nota ainda não contiver essa informação (idempotência).
UPDATE public.leads
SET notas = CASE
  WHEN notas IS NULL OR TRIM(notas) = '' THEN '[Origem anterior: ' || TRIM(origem) || ']'
  WHEN notas NOT ILIKE '%[Origem anterior:%' THEN notas || E'\n[Origem anterior: ' || TRIM(origem) || ']'
  ELSE notas
END
WHERE (
  LOWER(TRIM(origem)) = 'cadastro direto'
  OR LOWER(TRIM(origem)) = 'assistência técnica'
  OR LOWER(TRIM(origem)) = 'assistencia tecnica'
  OR LOWER(TRIM(origem)) = 'parceiros'
  OR LOWER(TRIM(origem)) = 'outdoor'
);

-- 2. Atualizar a coluna origem para 'A definir' para todas as variações dessas 4 origens
UPDATE public.leads
SET origem = 'A definir'
WHERE (
  LOWER(TRIM(origem)) = 'cadastro direto'
  OR LOWER(TRIM(origem)) = 'assistência técnica'
  OR LOWER(TRIM(origem)) = 'assistencia tecnica'
  OR LOWER(TRIM(origem)) = 'parceiros'
  OR LOWER(TRIM(origem)) = 'outdoor'
);
