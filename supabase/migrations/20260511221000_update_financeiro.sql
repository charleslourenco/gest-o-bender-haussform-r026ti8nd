DO $$
BEGIN
  -- Add new columns for contas_pagar
  ALTER TABLE public.contas_pagar ADD COLUMN IF NOT EXISTS meio_pagamento TEXT;
  ALTER TABLE public.contas_pagar ADD COLUMN IF NOT EXISTS antecipado BOOLEAN DEFAULT false;

  -- Add new columns for contas_receber
  ALTER TABLE public.contas_receber ADD COLUMN IF NOT EXISTS meio_pagamento TEXT;
  ALTER TABLE public.contas_receber ADD COLUMN IF NOT EXISTS antecipado BOOLEAN DEFAULT false;
  ALTER TABLE public.contas_receber ADD COLUMN IF NOT EXISTS comprovante_url TEXT;
  ALTER TABLE public.contas_receber ADD COLUMN IF NOT EXISTS descricao TEXT;
  ALTER TABLE public.contas_receber ADD COLUMN IF NOT EXISTS categoria TEXT;
END $$;

-- Create financeiro bucket for attachments
INSERT INTO storage.buckets (id, name, public) VALUES ('financeiro', 'financeiro', true)
ON CONFLICT (id) DO NOTHING;

-- RLS policies for the financeiro bucket
DROP POLICY IF EXISTS "Public Access" ON storage.objects;
CREATE POLICY "Public Access" ON storage.objects
  FOR SELECT USING (bucket_id = 'financeiro');

DROP POLICY IF EXISTS "Auth Insert" ON storage.objects;
CREATE POLICY "Auth Insert" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (bucket_id = 'financeiro');

DROP POLICY IF EXISTS "Auth Update" ON storage.objects;
CREATE POLICY "Auth Update" ON storage.objects
  FOR UPDATE TO authenticated USING (bucket_id = 'financeiro');

DROP POLICY IF EXISTS "Auth Delete" ON storage.objects;
CREATE POLICY "Auth Delete" ON storage.objects
  FOR DELETE TO authenticated USING (bucket_id = 'financeiro');
