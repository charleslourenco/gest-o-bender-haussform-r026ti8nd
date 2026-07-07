-- Idempotent migration: disable customer-facing WhatsApp AI automation.
-- All existing sessions are normalized to step 99 (human-managed / manual mode)
-- so operators retain full context without any automatic Catarina replies.

UPDATE public.whatsapp_sessions
SET step = 99,
    updated_at = NOW()
WHERE step IS DISTINCT FROM 99;

-- Ensure RLS still allows the webhook (service role) and authenticated users
-- to manage sessions. Safe to re-run.
ALTER TABLE public.whatsapp_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "whatsapp_sessions_all" ON public.whatsapp_sessions;
CREATE POLICY "whatsapp_sessions_all" ON public.whatsapp_sessions
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
