CREATE TABLE IF NOT EXISTS public.solicitacoes_compra (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  nome_item TEXT NOT NULL,
  quantidade NUMERIC NOT NULL,
  unidade TEXT NOT NULL,
  link TEXT,
  cor TEXT,
  tamanho TEXT,
  modelo TEXT,
  motivo TEXT,
  urgencia TEXT NOT NULL DEFAULT 'Média',
  status TEXT NOT NULL DEFAULT 'Pendente',
  criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.solicitacoes_compra ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Enable read access for all authenticated users" ON public.solicitacoes_compra;
CREATE POLICY "Enable read access for all authenticated users" ON public.solicitacoes_compra
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Enable insert for authenticated users" ON public.solicitacoes_compra;
CREATE POLICY "Enable insert for authenticated users" ON public.solicitacoes_compra
  FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "Enable update for own or admin" ON public.solicitacoes_compra;
CREATE POLICY "Enable update for own or admin" ON public.solicitacoes_compra
  FOR UPDATE TO authenticated USING (usuario_id = auth.uid() OR is_admin(auth.uid())) WITH CHECK (true);

DROP POLICY IF EXISTS "Enable delete for own or admin" ON public.solicitacoes_compra;
CREATE POLICY "Enable delete for own or admin" ON public.solicitacoes_compra
  FOR DELETE TO authenticated USING (usuario_id = auth.uid() OR is_admin(auth.uid()));

DROP TRIGGER IF EXISTS set_solicitacoes_compra_atualizado_em ON public.solicitacoes_compra;
CREATE TRIGGER set_solicitacoes_compra_atualizado_em
  BEFORE UPDATE ON public.solicitacoes_compra
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();


CREATE TABLE IF NOT EXISTS public.notificacoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  titulo TEXT NOT NULL,
  mensagem TEXT NOT NULL,
  lida BOOLEAN NOT NULL DEFAULT false,
  link TEXT,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.notificacoes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Enable read access for own notifications" ON public.notificacoes;
CREATE POLICY "Enable read access for own notifications" ON public.notificacoes
  FOR SELECT TO authenticated USING (usuario_id = auth.uid());

DROP POLICY IF EXISTS "Enable update for own notifications" ON public.notificacoes;
CREATE POLICY "Enable update for own notifications" ON public.notificacoes
  FOR UPDATE TO authenticated USING (usuario_id = auth.uid()) WITH CHECK (usuario_id = auth.uid());

DROP POLICY IF EXISTS "Enable insert for system or admins" ON public.notificacoes;
CREATE POLICY "Enable insert for system or admins" ON public.notificacoes
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE OR REPLACE FUNCTION public.notify_solicitacao_comprada()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'Comprado' AND OLD.status != 'Comprado' THEN
    INSERT INTO public.notificacoes (usuario_id, titulo, mensagem)
    VALUES (
      NEW.usuario_id,
      'Material Disponível!',
      'Sua solicitação do item "' || NEW.nome_item || '" foi marcada como Comprada/Disponível.'
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_solicitacao_comprada ON public.solicitacoes_compra;
CREATE TRIGGER on_solicitacao_comprada
  AFTER UPDATE ON public.solicitacoes_compra
  FOR EACH ROW EXECUTE FUNCTION public.notify_solicitacao_comprada();
