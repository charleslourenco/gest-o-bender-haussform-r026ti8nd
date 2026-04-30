DO $$
BEGIN
  INSERT INTO storage.buckets (id, name, public) VALUES ('bender_assets', 'bender_assets', true) ON CONFLICT DO NOTHING;
  INSERT INTO storage.buckets (id, name, public) VALUES ('bender_templates', 'bender_templates', true) ON CONFLICT DO NOTHING;
END $$;

DROP POLICY IF EXISTS "Public Access" ON storage.objects;
CREATE POLICY "Public Access" ON storage.objects FOR SELECT USING (bucket_id IN ('bender_assets', 'bender_templates'));

DROP POLICY IF EXISTS "Auth Insert" ON storage.objects;
CREATE POLICY "Auth Insert" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id IN ('bender_assets', 'bender_templates'));

DROP POLICY IF EXISTS "Auth Update" ON storage.objects;
CREATE POLICY "Auth Update" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id IN ('bender_assets', 'bender_templates'));

DROP POLICY IF EXISTS "Auth Delete" ON storage.objects;
CREATE POLICY "Auth Delete" ON storage.objects FOR DELETE TO authenticated USING (bucket_id IN ('bender_assets', 'bender_templates'));

CREATE TABLE IF NOT EXISTS public.templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  tipo TEXT NOT NULL,
  arquivo_url TEXT NOT NULL,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.documentos_obrigatorios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo TEXT NOT NULL UNIQUE,
  template_id UUID REFERENCES public.templates(id) ON DELETE SET NULL,
  status BOOLEAN NOT NULL DEFAULT true,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documentos_obrigatorios ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admin Editor Templates" ON public.templates;
CREATE POLICY "Admin Editor Templates" ON public.templates FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Admin Editor Docs" ON public.documentos_obrigatorios;
CREATE POLICY "Admin Editor Docs" ON public.documentos_obrigatorios FOR ALL TO authenticated USING (true) WITH CHECK (true);

INSERT INTO public.empresa (id, nome, logo_url) 
SELECT gen_random_uuid(), 'Bender Haussform', ''
WHERE NOT EXISTS (SELECT 1 FROM public.empresa);

INSERT INTO public.documentos_obrigatorios (tipo) VALUES 
('Contrato'), ('Termo de Vistoria'), ('Representação'), ('Recusa'), ('Alteração'), ('Não Conformidade'), ('Garantia')
ON CONFLICT (tipo) DO NOTHING;
