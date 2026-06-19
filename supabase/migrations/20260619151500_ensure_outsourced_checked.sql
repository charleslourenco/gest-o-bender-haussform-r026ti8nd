DO $$
BEGIN
  -- Ensure column exists (idempotent)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'produtos_servicos_projeto' 
    AND column_name = 'outsourced_checked'
  ) THEN
    ALTER TABLE public.produtos_servicos_projeto ADD COLUMN outsourced_checked boolean DEFAULT false;
  END IF;
END $$;

-- Ensure RLS allows authenticated updates
DROP POLICY IF EXISTS "Enable update for outsourced_checked" ON public.produtos_servicos_projeto;
CREATE POLICY "Enable update for outsourced_checked" ON public.produtos_servicos_projeto
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
