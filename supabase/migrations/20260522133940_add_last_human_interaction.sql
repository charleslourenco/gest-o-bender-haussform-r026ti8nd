ALTER TABLE public.whatsapp_sessions 
ADD COLUMN IF NOT EXISTS last_human_interaction_at TIMESTAMPTZ;
