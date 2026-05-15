CREATE TABLE IF NOT EXISTS public.estoque_caixas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id UUID REFERENCES public.clientes(id) ON DELETE CASCADE,
  projeto_id UUID REFERENCES public.formulario_comercial(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'separacao',
  criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.estoque_caixas_itens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  caixa_id UUID REFERENCES public.estoque_caixas(id) ON DELETE CASCADE,
  item_id UUID REFERENCES public.estoque_itens(id) ON DELETE CASCADE,
  quantidade NUMERIC NOT NULL,
  status TEXT NOT NULL DEFAULT 'reservado',
  criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.estoque_sobras (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  largura NUMERIC NOT NULL,
  altura NUMERIC NOT NULL,
  area NUMERIC NOT NULL,
  status TEXT NOT NULL DEFAULT 'disponivel',
  criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.estoque_caixas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.estoque_caixas_itens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.estoque_sobras ENABLE ROW LEVEL SECURITY;

-- Create Policies
DROP POLICY IF EXISTS "estoque_caixas_all" ON public.estoque_caixas;
CREATE POLICY "estoque_caixas_all" ON public.estoque_caixas FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "estoque_caixas_itens_all" ON public.estoque_caixas_itens;
CREATE POLICY "estoque_caixas_itens_all" ON public.estoque_caixas_itens FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "estoque_sobras_all" ON public.estoque_sobras;
CREATE POLICY "estoque_sobras_all" ON public.estoque_sobras FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Create Trigger to deduct inventory when adding to virtual boxes
CREATE OR REPLACE FUNCTION public.handle_caixa_item_reservado()
RETURNS trigger AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.estoque_itens SET quantidade = quantidade - NEW.quantidade WHERE id = NEW.item_id;
  ELSIF TG_OP = 'DELETE' THEN
    IF OLD.status = 'reservado' THEN
      UPDATE public.estoque_itens SET quantidade = quantidade + OLD.quantidade WHERE id = OLD.item_id;
    END IF;
  ELSIF TG_OP = 'UPDATE' THEN
    IF NEW.quantidade <> OLD.quantidade AND NEW.status = 'reservado' THEN
      UPDATE public.estoque_itens SET quantidade = quantidade - (NEW.quantidade - OLD.quantidade) WHERE id = NEW.item_id;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_caixa_item_reservado ON public.estoque_caixas_itens;
CREATE TRIGGER trg_caixa_item_reservado
  AFTER INSERT OR UPDATE OR DELETE ON public.estoque_caixas_itens
  FOR EACH ROW EXECUTE FUNCTION public.handle_caixa_item_reservado();
