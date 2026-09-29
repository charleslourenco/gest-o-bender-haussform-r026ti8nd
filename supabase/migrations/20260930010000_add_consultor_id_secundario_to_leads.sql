-- Adiciona coluna de segundo responsável no lead (vendas em dupla de arquitetos/consultores)
ALTER TABLE public.leads 
  ADD COLUMN IF NOT EXISTS consultor_id_secundario uuid NULL REFERENCES public.users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_leads_consultor_id_secundario 
  ON public.leads(consultor_id_secundario);
