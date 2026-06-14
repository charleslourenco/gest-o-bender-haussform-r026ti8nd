ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS status_atendimento TEXT DEFAULT 'aguardando_resposta';

DO $$
BEGIN
  -- Update existing leads based on whatsapp_sessions step to sync the handover state
  UPDATE public.leads l
  SET status_atendimento = 'aguardando_resposta'
  FROM public.whatsapp_sessions ws
  WHERE l.id = ws.lead_id AND ws.step = 99;
END $$;
