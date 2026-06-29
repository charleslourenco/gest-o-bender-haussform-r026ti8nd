-- Add index on phone for whatsapp_messages to optimize conversation sync queries
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_phone
  ON public.whatsapp_messages (phone);
