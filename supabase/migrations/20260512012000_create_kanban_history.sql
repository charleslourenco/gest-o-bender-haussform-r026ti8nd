CREATE TABLE IF NOT EXISTS public.kanban_historico (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  card_id UUID REFERENCES public.produtos_servicos_projeto(id) ON DELETE CASCADE,
  status_anterior TEXT,
  status_novo TEXT NOT NULL,
  usuario_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.kanban_historico ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "kanban_history_access" ON public.kanban_historico;
CREATE POLICY "kanban_history_access" ON public.kanban_historico 
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE OR REPLACE FUNCTION public.log_kanban_history()
RETURNS trigger AS $$
BEGIN
  IF NEW.status_analise IS DISTINCT FROM OLD.status_analise THEN
    INSERT INTO public.kanban_historico (card_id, status_anterior, status_novo, usuario_id)
    VALUES (NEW.id, OLD.status_analise, NEW.status_analise, auth.uid());
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_kanban_status_change ON public.produtos_servicos_projeto;
CREATE TRIGGER on_kanban_status_change
  AFTER UPDATE ON public.produtos_servicos_projeto
  FOR EACH ROW EXECUTE FUNCTION public.log_kanban_history();
