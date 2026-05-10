ALTER TABLE public.formulario_comercial 
  ADD COLUMN IF NOT EXISTS parcelas jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS metodo_pagamento text,
  ADD COLUMN IF NOT EXISTS data_pagamento date,
  ADD COLUMN IF NOT EXISTS nome_cliente text,
  ADD COLUMN IF NOT EXISTS ambientes jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS itens jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS especificacoes text;
