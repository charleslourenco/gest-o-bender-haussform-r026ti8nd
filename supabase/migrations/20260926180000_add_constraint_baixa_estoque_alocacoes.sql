-- Migration: Constraint NOT VALID para garantir que alocações baixadas tenham destino e valor_total_congelado preenchidos
-- Versão: 20260926180000_add_constraint_baixa_estoque_alocacoes.sql

-- 1. Garante que se a constraint já existir, seja dropada para idempotência
ALTER TABLE public.estoque_alocacoes
  DROP CONSTRAINT IF EXISTS chk_estoque_alocacoes_baixa_obrigatorios;

-- 2. Adiciona a constraint NOT VALID (não bloqueia linhas antigas, aplica-se a novas inserções e updates futuros)
ALTER TABLE public.estoque_alocacoes
  ADD CONSTRAINT chk_estoque_alocacoes_baixa_obrigatorios
  CHECK (
    status != 'baixado'
    OR (
      destino IS NOT NULL
      AND valor_total_congelado IS NOT NULL
    )
  ) NOT VALID;
