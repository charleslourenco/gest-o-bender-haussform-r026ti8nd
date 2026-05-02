DO $$
BEGIN
  -- Add new columns for the document generation process
  ALTER TABLE public.documentos_cliente ADD COLUMN IF NOT EXISTS projeto_id UUID;
  ALTER TABLE public.documentos_cliente ADD COLUMN IF NOT EXISTS arquivo_url TEXT;
  ALTER TABLE public.documentos_cliente ADD COLUMN IF NOT EXISTS template_nome TEXT;
END $$;

-- Create dossiers bucket if not exists
INSERT INTO storage.buckets (id, name, public) 
VALUES ('dossiers', 'dossiers', true)
ON CONFLICT (id) DO NOTHING;

-- RLS policies for dossiers bucket to allow authenticated users to read
DROP POLICY IF EXISTS "Public Read dossiers" ON storage.objects;
CREATE POLICY "Public Read dossiers"
ON storage.objects FOR SELECT
USING (bucket_id = 'dossiers');

DROP POLICY IF EXISTS "Authenticated Insert dossiers" ON storage.objects;
CREATE POLICY "Authenticated Insert dossiers"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'dossiers');
