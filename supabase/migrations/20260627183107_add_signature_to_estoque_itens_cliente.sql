-- Add signature-related columns to estoque_itens_cliente
ALTER TABLE public.estoque_itens_cliente
  ADD COLUMN IF NOT EXISTS recebedor_nome TEXT,
  ADD COLUMN IF NOT EXISTS recebedor_cpf TEXT,
  ADD COLUMN IF NOT EXISTS comprovante_url TEXT,
  ADD COLUMN IF NOT EXISTS assinado_em TIMESTAMPTZ;

-- Create public storage bucket for item receipts
INSERT INTO storage.buckets (id, name, public)
VALUES ('comprovantes-itens-cliente', 'comprovantes-itens-cliente', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies: public read, authenticated write
DROP POLICY IF EXISTS "comprovantes_itens_cliente_public_read" ON storage.objects;
CREATE POLICY "comprovantes_itens_cliente_public_read" ON storage.objects
  FOR SELECT USING (bucket_id = 'comprovantes-itens-cliente');

DROP POLICY IF EXISTS "comprovantes_itens_cliente_auth_insert" ON storage.objects;
CREATE POLICY "comprovantes_itens_cliente_auth_insert" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (bucket_id = 'comprovantes-itens-cliente');

DROP POLICY IF EXISTS "comprovantes_itens_cliente_auth_update" ON storage.objects;
CREATE POLICY "comprovantes_itens_cliente_auth_update" ON storage.objects
  FOR UPDATE TO authenticated USING (bucket_id = 'comprovantes-itens-cliente');

-- RLS for estoque_itens_cliente: anon can SELECT and UPDATE (only pending rows)
DROP POLICY IF EXISTS "estoque_itens_cliente_anon_select" ON public.estoque_itens_cliente;
CREATE POLICY "estoque_itens_cliente_anon_select" ON public.estoque_itens_cliente
  FOR SELECT TO anon USING (true);

DROP POLICY IF EXISTS "estoque_itens_cliente_anon_update" ON public.estoque_itens_cliente;
CREATE POLICY "estoque_itens_cliente_anon_update" ON public.estoque_itens_cliente
  FOR UPDATE TO anon
  USING (entregue_em IS NULL)
  WITH CHECK (true);

-- Column-level grants restricting anon updates to signature-related columns only
GRANT UPDATE (recebedor_nome, recebedor_cpf, assinado_em, comprovante_url, status, entregue_em, responsavel_entrega) ON public.estoque_itens_cliente TO anon;
GRANT SELECT ON public.estoque_itens_cliente TO anon;
