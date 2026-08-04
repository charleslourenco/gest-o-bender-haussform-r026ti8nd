CREATE TABLE IF NOT EXISTS public.historico_alocacao_montagem (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  card_id UUID NOT NULL REFERENCES public.produtos_servicos_projeto(id) ON DELETE CASCADE,
  montador_id UUID NOT NULL REFERENCES public.montadores(id) ON DELETE CASCADE,
  acao TEXT NOT NULL,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.historico_alocacao_montagem ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "historico_alocacao_select" ON public.historico_alocacao_montagem;
CREATE POLICY "historico_alocacao_select" ON public.historico_alocacao_montagem
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "historico_alocacao_insert" ON public.historico_alocacao_montagem;
CREATE POLICY "historico_alocacao_insert" ON public.historico_alocacao_montagem
  FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "historico_alocacao_update" ON public.historico_alocacao_montagem;
CREATE POLICY "historico_alocacao_update" ON public.historico_alocacao_montagem
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "historico_alocacao_delete" ON public.historico_alocacao_montagem;
CREATE POLICY "historico_alocacao_delete" ON public.historico_alocacao_montagem
  FOR DELETE TO authenticated USING (true);

CREATE INDEX IF NOT EXISTS idx_historico_alocacao_card_id ON public.historico_alocacao_montagem(card_id);
CREATE INDEX IF NOT EXISTS idx_historico_alocacao_montador_id ON public.historico_alocacao_montagem(montador_id);

CREATE OR REPLACE FUNCTION public.log_alocacao_montagem_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
BEGIN
  INSERT INTO public.historico_alocacao_montagem (card_id, montador_id, acao)
  VALUES (NEW.card_id, NEW.montador_id, 'alocado');
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.log_alocacao_montagem_delete()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
BEGIN
  INSERT INTO public.historico_alocacao_montagem (card_id, montador_id, acao)
  VALUES (OLD.card_id, OLD.montador_id, 'desalocado');
  RETURN OLD;
END;
$function$;

DROP TRIGGER IF EXISTS on_alocacao_montagem_insert ON public.alocacao_montagem;
CREATE TRIGGER on_alocacao_montagem_insert
  AFTER INSERT ON public.alocacao_montagem
  FOR EACH ROW EXECUTE FUNCTION public.log_alocacao_montagem_insert();

DROP TRIGGER IF EXISTS on_alocacao_montagem_delete ON public.alocacao_montagem;
CREATE TRIGGER on_alocacao_montagem_delete
  AFTER DELETE ON public.alocacao_montagem
  FOR EACH ROW EXECUTE FUNCTION public.log_alocacao_montagem_delete();
