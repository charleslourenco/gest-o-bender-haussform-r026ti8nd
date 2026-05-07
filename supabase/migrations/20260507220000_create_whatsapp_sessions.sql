CREATE TABLE IF NOT EXISTS public.whatsapp_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone TEXT UNIQUE NOT NULL,
  lead_id UUID REFERENCES public.leads(id) ON DELETE CASCADE,
  step INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Habilitar RLS
ALTER TABLE public.whatsapp_sessions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "whatsapp_sessions_all" ON public.whatsapp_sessions;
CREATE POLICY "whatsapp_sessions_all" ON public.whatsapp_sessions FOR ALL USING (true) WITH CHECK (true);
