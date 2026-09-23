-- Migration aditiva para registro de motivo e etapa da perda de leads
-- Campos nulos por padrão; cards existentes em 'Perdido' permanecem intactos.

ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS motivo_perda TEXT,
  ADD COLUMN IF NOT EXISTS etapa_perda TEXT;

-- Comentários descritivos
COMMENT ON COLUMN public.leads.motivo_perda IS 'Motivo preenchido quando o lead é movido para Perdido/SDR: Perdido';
COMMENT ON COLUMN public.leads.etapa_perda IS 'Etapa em que o lead estava quando foi perdido';
