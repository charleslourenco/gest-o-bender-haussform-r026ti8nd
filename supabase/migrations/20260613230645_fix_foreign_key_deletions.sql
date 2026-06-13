DO $$
DECLARE
  rec RECORD;
BEGIN
  -- Fix clientes -> leads foreign key to be ON DELETE SET NULL instead of CASCADE
  FOR rec IN
    SELECT tc.constraint_name
    FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu
      ON tc.constraint_name = kcu.constraint_name
    WHERE tc.table_name = 'clientes'
      AND kcu.column_name = 'lead_id'
      AND tc.constraint_type = 'FOREIGN KEY'
  LOOP
    EXECUTE 'ALTER TABLE public.clientes DROP CONSTRAINT ' || quote_ident(rec.constraint_name);
  END LOOP;

  ALTER TABLE public.clientes
    ADD CONSTRAINT clientes_lead_id_fkey
    FOREIGN KEY (lead_id) REFERENCES public.leads(id) ON DELETE SET NULL;

  -- Ensure no triggers or constraints exist that delete clientes when produtos_servicos_projeto is deleted
  DROP TRIGGER IF EXISTS trg_delete_cliente_on_psp_delete ON public.produtos_servicos_projeto;
END $$;
