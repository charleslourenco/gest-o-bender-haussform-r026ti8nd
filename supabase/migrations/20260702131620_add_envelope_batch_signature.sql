-- Add envelope_id to documentos_cliente to link multiple docs to one envelope
ALTER TABLE public.documentos_cliente ADD COLUMN IF NOT EXISTS envelope_id UUID REFERENCES public.envelopes_assinatura(id) ON DELETE SET NULL;

-- Add signatario fields to envelopes_assinatura for portal access (no auth required)
ALTER TABLE public.envelopes_assinatura ADD COLUMN IF NOT EXISTS signatario_nome TEXT;
ALTER TABLE public.envelopes_assinatura ADD COLUMN IF NOT EXISTS signatario_email TEXT;
ALTER TABLE public.envelopes_assinatura ADD COLUMN IF NOT EXISTS signatario_cpf TEXT;
ALTER TABLE public.envelopes_assinatura ADD COLUMN IF NOT EXISTS codigo_verificacao TEXT;
ALTER TABLE public.envelopes_assinatura ADD COLUMN IF NOT EXISTS token_acesso TEXT;

CREATE INDEX IF NOT EXISTS idx_documentos_cliente_envelope_id ON public.documentos_cliente(envelope_id);

-- RLS: allow anon to select/update envelopes (portal access without auth)
DROP POLICY IF EXISTS "envelopes_assinatura_select_anon" ON public.envelopes_assinatura;
CREATE POLICY "envelopes_assinatura_select_anon" ON public.envelopes_assinatura
  FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "envelopes_assinatura_update_anon" ON public.envelopes_assinatura;
CREATE POLICY "envelopes_assinatura_update_anon" ON public.envelopes_assinatura
  FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "envelopes_assinatura_insert_auth" ON public.envelopes_assinatura;
CREATE POLICY "envelopes_assinatura_insert_auth" ON public.envelopes_assinatura
  FOR INSERT TO authenticated WITH CHECK (true);

-- RLS: allow anon to select/update documentos_cliente linked to an envelope (portal)
DROP POLICY IF EXISTS "documentos_cliente_select_envelope_anon" ON public.documentos_cliente;
CREATE POLICY "documentos_cliente_select_envelope_anon" ON public.documentos_cliente
  FOR SELECT TO anon USING (envelope_id IS NOT NULL);

DROP POLICY IF EXISTS "documentos_cliente_update_envelope_anon" ON public.documentos_cliente;
CREATE POLICY "documentos_cliente_update_envelope_anon" ON public.documentos_cliente
  FOR UPDATE TO anon USING (envelope_id IS NOT NULL) WITH CHECK (envelope_id IS NOT NULL);

-- RLS: allow anon to read/insert/update assinaturas for portal signing
DROP POLICY IF EXISTS "assinaturas_anon_select" ON public.assinaturas;
CREATE POLICY "assinaturas_anon_select" ON public.assinaturas
  FOR SELECT TO anon USING (true);

DROP POLICY IF EXISTS "assinaturas_anon_insert" ON public.assinaturas;
CREATE POLICY "assinaturas_anon_insert" ON public.assinaturas
  FOR INSERT TO anon WITH CHECK (true);

DROP POLICY IF EXISTS "assinaturas_anon_update" ON public.assinaturas;
CREATE POLICY "assinaturas_anon_update" ON public.assinaturas
  FOR UPDATE TO anon USING (true) WITH CHECK (true);

-- RLS: allow anon to insert timeline_eventos (portal signing events)
DROP POLICY IF EXISTS "timeline_eventos_anon_insert" ON public.timeline_eventos;
CREATE POLICY "timeline_eventos_anon_insert" ON public.timeline_eventos
  FOR INSERT TO anon WITH CHECK (true);
