DO $$
BEGIN
  -- Safe removal of the legacy column if it exists
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'leads' 
    AND column_name = 'tipo_conversa'
  ) THEN
    ALTER TABLE public.leads DROP COLUMN tipo_conversa;
  END IF;
END $$;

-- Update the classify_lead_conversation trigger to map directly to 'categoria'
CREATE OR REPLACE FUNCTION public.classify_lead_conversation()
RETURNS trigger AS $$
BEGIN
  -- We ensure intents correctly reflect in the categoria column 
  -- since tipo_conversa is no longer used.
  IF NEW.categoria IS NULL THEN
    NEW.categoria := 'Comercial';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
