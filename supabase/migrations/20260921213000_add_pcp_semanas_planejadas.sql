-- Migration aditiva para suporte ao Cronograma e Planejamento Mensal de Capacidade Fabril do Módulo PCP
-- 100% não destrutiva: adiciona colunas opcionais em produtos_servicos_projeto
-- Cria tabela de histórico de reprogramação com RLS habilitado e políticas permissivas para authenticated

ALTER TABLE public.produtos_servicos_projeto
  ADD COLUMN IF NOT EXISTS semana_planejada_analise text NULL,
  ADD COLUMN IF NOT EXISTS semana_planejada_producao text NULL,
  ADD COLUMN IF NOT EXISTS semana_planejada_montagem text NULL;

CREATE INDEX IF NOT EXISTS idx_psp_semana_analise ON public.produtos_servicos_projeto(semana_planejada_analise);
CREATE INDEX IF NOT EXISTS idx_psp_semana_producao ON public.produtos_servicos_projeto(semana_planejada_producao);
CREATE INDEX IF NOT EXISTS idx_psp_semana_montagem ON public.produtos_servicos_projeto(semana_planejada_montagem);

-- Tabela de histórico de reprogramação temporal do PCP
CREATE TABLE IF NOT EXISTS public.pcp_reprogramacao_historico (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  card_id uuid NOT NULL REFERENCES public.produtos_servicos_projeto(id) ON DELETE CASCADE,
  linha_operacao text NOT NULL, -- 'analise' | 'producao' | 'montagem'
  semana_anterior text NULL,
  semana_nova text NULL,
  motivo text NULL,
  usuario_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  criado_em timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_pcp_reprogramacao_card_id ON public.pcp_reprogramacao_historico(card_id);
CREATE INDEX IF NOT EXISTS idx_pcp_reprogramacao_criado_em ON public.pcp_reprogramacao_historico(criado_em DESC);

-- Habilitar RLS
ALTER TABLE public.pcp_reprogramacao_historico ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para pcp_reprogramacao_historico
DROP POLICY IF EXISTS "pcp_reprogramacao_select" ON public.pcp_reprogramacao_historico;
CREATE POLICY "pcp_reprogramacao_select" ON public.pcp_reprogramacao_historico
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "pcp_reprogramacao_insert" ON public.pcp_reprogramacao_historico;
CREATE POLICY "pcp_reprogramacao_insert" ON public.pcp_reprogramacao_historico
  FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "pcp_reprogramacao_update" ON public.pcp_reprogramacao_historico;
CREATE POLICY "pcp_reprogramacao_update" ON public.pcp_reprogramacao_historico
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "pcp_reprogramacao_delete" ON public.pcp_reprogramacao_historico;
CREATE POLICY "pcp_reprogramacao_delete" ON public.pcp_reprogramacao_historico
  FOR DELETE TO authenticated USING (true);
