DO $$
BEGIN
  -- table orcamentos_engenharia
  CREATE TABLE IF NOT EXISTS public.orcamentos_engenharia (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome TEXT NOT NULL,
    cliente_id UUID REFERENCES public.clientes(id) ON DELETE SET NULL,
    markup_global NUMERIC NOT NULL DEFAULT 2.5,
    status TEXT NOT NULL DEFAULT 'Rascunho',
    criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    atualizado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    usuario_id UUID REFERENCES auth.users(id) ON DELETE SET NULL
  );

  -- table orcamentos_ambientes
  CREATE TABLE IF NOT EXISTS public.orcamentos_ambientes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    orcamento_id UUID NOT NULL REFERENCES public.orcamentos_engenharia(id) ON DELETE CASCADE,
    nome TEXT NOT NULL,
    descricao_comercial TEXT,
    criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );

  -- table orcamentos_itens
  CREATE TABLE IF NOT EXISTS public.orcamentos_itens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ambiente_id UUID NOT NULL REFERENCES public.orcamentos_ambientes(id) ON DELETE CASCADE,
    item_estoque_id UUID REFERENCES public.estoque_itens(id) ON DELETE SET NULL,
    nome_item TEXT NOT NULL,
    quantidade NUMERIC NOT NULL DEFAULT 1,
    unidade_medida TEXT NOT NULL DEFAULT 'un',
    custo_unitario NUMERIC NOT NULL DEFAULT 0,
    markup NUMERIC NOT NULL DEFAULT 2.5,
    markup_manual BOOLEAN NOT NULL DEFAULT false,
    criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );
END $$;

-- Triggers for atualizado_em
DROP TRIGGER IF EXISTS set_orcamentos_engenharia_atualizado_em ON public.orcamentos_engenharia;
CREATE TRIGGER set_orcamentos_engenharia_atualizado_em
  BEFORE UPDATE ON public.orcamentos_engenharia
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- RLS
ALTER TABLE public.orcamentos_engenharia ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orcamentos_ambientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orcamentos_itens ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "orcamentos_engenharia_all" ON public.orcamentos_engenharia;
CREATE POLICY "orcamentos_engenharia_all" ON public.orcamentos_engenharia FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "orcamentos_ambientes_all" ON public.orcamentos_ambientes;
CREATE POLICY "orcamentos_ambientes_all" ON public.orcamentos_ambientes FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "orcamentos_itens_all" ON public.orcamentos_itens;
CREATE POLICY "orcamentos_itens_all" ON public.orcamentos_itens FOR ALL TO authenticated USING (true) WITH CHECK (true);
