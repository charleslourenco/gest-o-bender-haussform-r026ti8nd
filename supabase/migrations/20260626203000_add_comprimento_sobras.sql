DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'estoque_sobras' 
    AND column_name = 'comprimento'
  ) THEN
    ALTER TABLE public.estoque_sobras ADD COLUMN comprimento numeric;
  END IF;
END $$;
