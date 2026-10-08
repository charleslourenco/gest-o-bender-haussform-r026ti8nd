-- Migration: Add audit columns to estoque_sobras and history log table
-- Version: 20261020000000_add_sobras_audit_and_history.sql

-- 1. Colunas adicionais em estoque_sobras
ALTER TABLE public.estoque_sobras
  ADD COLUMN IF NOT EXISTS baixado_por uuid REFERENCES public.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS canal_baixa text,
  ADD COLUMN IF NOT EXISTS restaurado_em timestamptz,
  ADD COLUMN IF NOT EXISTS restaurado_por uuid REFERENCES public.users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_estoque_sobras_status ON public.estoque_sobras(status);
CREATE INDEX IF NOT EXISTS idx_estoque_sobras_item_id ON public.estoque_sobras(item_id);
CREATE INDEX IF NOT EXISTS idx_estoque_sobras_usado_em ON public.estoque_sobras(usado_em);

-- 2. Tabela de histórico de eventos de sobras (baixas e restaurações)
CREATE TABLE IF NOT EXISTS public.sobras_historico (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sobra_id uuid REFERENCES public.estoque_sobras(id) ON DELETE CASCADE,
  acao text NOT NULL, -- 'baixa' | 'restauracao'
  canal text, -- 'manual' | 'qr'
  usuario_id uuid REFERENCES public.users(id) ON DELETE SET NULL,
  observacao text,
  criado_em timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sobras_historico_sobra_id ON public.sobras_historico(sobra_id);
CREATE INDEX IF NOT EXISTS idx_sobras_historico_criado_em ON public.sobras_historico(criado_em);

-- 3. RLS para sobras_historico
ALTER TABLE public.sobras_historico ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "sobras_historico_select" ON public.sobras_historico;
CREATE POLICY "sobras_historico_select" ON public.sobras_historico
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "sobras_historico_insert" ON public.sobras_historico;
CREATE POLICY "sobras_historico_insert" ON public.sobras_historico
  FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "sobras_historico_public_select" ON public.sobras_historico;
CREATE POLICY "sobras_historico_public_select" ON public.sobras_historico
  FOR SELECT TO public USING (true);

DROP POLICY IF EXISTS "sobras_historico_public_insert" ON public.sobras_historico;
CREATE POLICY "sobras_historico_public_insert" ON public.sobras_historico
  FOR INSERT TO public WITH CHECK (true);
