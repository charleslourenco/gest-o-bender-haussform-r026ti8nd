-- Add comprovante and signature columns to estoque_caixas
ALTER TABLE public.estoque_caixas ADD COLUMN IF NOT EXISTS comprovante_url TEXT;
ALTER TABLE public.estoque_caixas ADD COLUMN IF NOT EXISTS assinado_em TIMESTAMPTZ;

-- Create storage bucket for comprovantes
INSERT INTO storage.buckets (id, name, public)
VALUES ('comprovantes-caixas', 'comprovantes-caixas', true)
ON CONFLICT (id) DO NOTHING;

-- Public read access for comprovantes bucket
DROP POLICY IF EXISTS "comprovantes_caixas_public_read" ON storage.objects;
CREATE POLICY "comprovantes_caixas_public_read" ON storage.objects
  FOR SELECT USING (bucket_id = 'comprovantes-caixas');

-- Allow authenticated to upload comprovantes
DROP POLICY IF EXISTS "comprovantes_caixas_auth_insert" ON storage.objects;
CREATE POLICY "comprovantes_caixas_auth_insert" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (bucket_id = 'comprovantes-caixas');

DROP POLICY IF EXISTS "comprovantes_caixas_auth_update" ON storage.objects;
CREATE POLICY "comprovantes_caixas_auth_update" ON storage.objects
  FOR UPDATE TO authenticated USING (bucket_id = 'comprovantes-caixas');

-- Public (anon) SELECT access for receipt page
DROP POLICY IF EXISTS "estoque_caixas_anon_select" ON public.estoque_caixas;
CREATE POLICY "estoque_caixas_anon_select" ON public.estoque_caixas
  FOR SELECT TO anon USING (true);

DROP POLICY IF EXISTS "estoque_caixas_itens_anon_select" ON public.estoque_caixas_itens;
CREATE POLICY "estoque_caixas_itens_anon_select" ON public.estoque_caixas_itens
  FOR SELECT TO anon USING (true);

DROP POLICY IF EXISTS "estoque_itens_anon_select_limited" ON public.estoque_itens;
CREATE POLICY "estoque_itens_anon_select_limited" ON public.estoque_itens
  FOR SELECT TO anon USING (true);
