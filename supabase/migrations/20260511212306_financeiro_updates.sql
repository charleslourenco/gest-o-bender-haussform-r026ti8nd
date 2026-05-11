-- Add fields to contas_pagar
ALTER TABLE public.contas_pagar ADD COLUMN IF NOT EXISTS meio_pagamento TEXT;
ALTER TABLE public.contas_pagar ADD COLUMN IF NOT EXISTS antecipado BOOLEAN DEFAULT FALSE;

-- Add fields to contas_receber
ALTER TABLE public.contas_receber ADD COLUMN IF NOT EXISTS descricao TEXT;
ALTER TABLE public.contas_receber ADD COLUMN IF NOT EXISTS categoria TEXT;
ALTER TABLE public.contas_receber ADD COLUMN IF NOT EXISTS meio_pagamento TEXT;
ALTER TABLE public.contas_receber ADD COLUMN IF NOT EXISTS antecipado BOOLEAN DEFAULT FALSE;
