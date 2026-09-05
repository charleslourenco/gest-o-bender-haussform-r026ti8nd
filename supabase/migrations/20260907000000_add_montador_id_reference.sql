-- Migration: Adiciona montador_id a equipe_clt e parceiros_pj e vincula registros existentes
ALTER TABLE public.equipe_clt 
  ADD COLUMN IF NOT EXISTS montador_id uuid REFERENCES public.montadores(id) ON DELETE SET NULL;

ALTER TABLE public.parceiros_pj 
  ADD COLUMN IF NOT EXISTS montador_id uuid REFERENCES public.montadores(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_equipe_clt_montador_id ON public.equipe_clt(montador_id);
CREATE INDEX IF NOT EXISTS idx_parceiros_pj_montador_id ON public.parceiros_pj(montador_id);

-- Preencher os 6 vínculos existentes em parceiros_pj confirmados
UPDATE public.parceiros_pj
SET montador_id = '9df5b5df-a981-461c-9e4a-91f04d93eb12'::uuid
WHERE id = 'e10ae529-b5ba-4355-a89b-ad9406682ce0'::uuid;

UPDATE public.parceiros_pj
SET montador_id = '81570e53-5534-436e-8cba-1f874eda89b3'::uuid
WHERE id = '934402a5-99ec-4190-b8e0-d17c93f41445'::uuid;

UPDATE public.parceiros_pj
SET montador_id = '4b8b4e35-ddf8-4174-99d6-a09fefd10698'::uuid
WHERE id = '4d84873e-2df9-4c4d-9a9e-3b2a67f9b67d'::uuid;

UPDATE public.parceiros_pj
SET montador_id = 'b96565dc-ed68-4405-8002-7b042daf7aef'::uuid
WHERE id = '47568d44-05d1-4b58-9999-11d657c0b0b9'::uuid;

UPDATE public.parceiros_pj
SET montador_id = 'ac355390-4015-4ac2-9281-78422c35a3bc'::uuid
WHERE id = '1d8aaa6c-8dec-41da-84b9-d9bfd747b741'::uuid;

UPDATE public.parceiros_pj
SET montador_id = '91a2f3fc-ec90-4532-9b1e-c6d4105097fb'::uuid
WHERE id = '6c3ebaa7-946d-4045-b7e2-a1eb35998658'::uuid;
