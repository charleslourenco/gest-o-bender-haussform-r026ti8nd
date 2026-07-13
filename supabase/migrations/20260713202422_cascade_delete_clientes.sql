DO $$
DECLARE
  rec RECORD;
BEGIN
  -- Tables that reference clientes(id) and should cascade on delete
  -- We drop existing FK constraint and recreate with ON DELETE CASCADE
  FOR rec IN
    SELECT tc.constraint_name, tc.table_name, kcu.column_name
    FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu
      ON tc.constraint_name = kcu.constraint_name
      AND tc.table_schema = kcu.table_schema
    WHERE tc.constraint_type = 'FOREIGN KEY'
      AND tc.table_schema = 'public'
      AND kcu.column_name = 'cliente_id'
      AND tc.table_name IN (
        'ambientes',
        'assinaturas',
        'contas_receber',
        'documentos_cliente',
        'documentos_gerados',
        'dossies',
        'envelopes_assinatura',
        'estoque_caixas',
        'pagamentos',
        'produtos_servicos',
        'produtos_servicos_projeto',
        'timeline_eventos'
      )
  LOOP
    EXECUTE format(
      'ALTER TABLE public.%I DROP CONSTRAINT IF EXISTS %I',
      rec.table_name, rec.constraint_name
    );
  END LOOP;

  -- Recreate constraints with ON DELETE CASCADE
  ALTER TABLE public.ambientes
    ADD CONSTRAINT ambientes_cliente_id_fkey
    FOREIGN KEY (cliente_id) REFERENCES public.clientes(id) ON DELETE CASCADE;

  ALTER TABLE public.assinaturas
    ADD CONSTRAINT assinaturas_cliente_id_fkey
    FOREIGN KEY (cliente_id) REFERENCES public.clientes(id) ON DELETE CASCADE;

  ALTER TABLE public.contas_receber
    ADD CONSTRAINT contas_receber_cliente_id_fkey
    FOREIGN KEY (cliente_id) REFERENCES public.clientes(id) ON DELETE CASCADE;

  ALTER TABLE public.documentos_cliente
    ADD CONSTRAINT documentos_cliente_cliente_id_fkey
    FOREIGN KEY (cliente_id) REFERENCES public.clientes(id) ON DELETE CASCADE;

  ALTER TABLE public.documentos_gerados
    ADD CONSTRAINT documentos_gerados_cliente_id_fkey
    FOREIGN KEY (cliente_id) REFERENCES public.clientes(id) ON DELETE CASCADE;

  ALTER TABLE public.dossies
    ADD CONSTRAINT dossies_cliente_id_fkey
    FOREIGN KEY (cliente_id) REFERENCES public.clientes(id) ON DELETE CASCADE;

  ALTER TABLE public.envelopes_assinatura
    ADD CONSTRAINT envelopes_assinatura_cliente_id_fkey
    FOREIGN KEY (cliente_id) REFERENCES public.clientes(id) ON DELETE CASCADE;

  ALTER TABLE public.estoque_caixas
    ADD CONSTRAINT estoque_caixas_cliente_id_fkey
    FOREIGN KEY (cliente_id) REFERENCES public.clientes(id) ON DELETE CASCADE;

  ALTER TABLE public.pagamentos
    ADD CONSTRAINT pagamentos_cliente_id_fkey
    FOREIGN KEY (cliente_id) REFERENCES public.clientes(id) ON DELETE CASCADE;

  ALTER TABLE public.produtos_servicos
    ADD CONSTRAINT produtos_servicos_cliente_id_fkey
    FOREIGN KEY (cliente_id) REFERENCES public.clientes(id) ON DELETE CASCADE;

  ALTER TABLE public.produtos_servicos_projeto
    ADD CONSTRAINT produtos_servicos_projeto_cliente_id_fkey
    FOREIGN KEY (cliente_id) REFERENCES public.clientes(id) ON DELETE CASCADE;

  ALTER TABLE public.timeline_eventos
    ADD CONSTRAINT timeline_eventos_cliente_id_fkey
    FOREIGN KEY (cliente_id) REFERENCES public.clientes(id) ON DELETE CASCADE;
END $$;

-- Ensure assinantes cascade when envelope is deleted
DO $$
DECLARE
  rec RECORD;
BEGIN
  FOR rec IN
    SELECT tc.constraint_name
    FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu
      ON tc.constraint_name = kcu.constraint_name
    WHERE tc.constraint_type = 'FOREIGN KEY'
      AND tc.table_schema = 'public'
      AND tc.table_name = 'assinantes'
      AND kcu.column_name = 'envelope_id'
  LOOP
    EXECUTE format(
      'ALTER TABLE public.assinantes DROP CONSTRAINT IF EXISTS %I',
      rec.constraint_name
    );
  END LOOP;

  ALTER TABLE public.assinantes
    ADD CONSTRAINT assinantes_envelope_id_fkey
    FOREIGN KEY (envelope_id) REFERENCES public.envelopes_assinatura(id) ON DELETE CASCADE;
END $$;

-- Ensure RLS policy for delete on clientes exists (idempotent)
DROP POLICY IF EXISTS "clientes_delete" ON public.clientes;
CREATE POLICY "clientes_delete" ON public.clientes
  FOR DELETE TO authenticated USING (usuario_id = auth.uid() OR is_admin(auth.uid()));
