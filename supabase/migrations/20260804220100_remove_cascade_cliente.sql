-- Remove ON DELETE CASCADE from foreign keys referencing clientes(id)
-- so that soft-deleting a client does not cascade-delete related data.
DO $$
DECLARE
  rec RECORD;
BEGIN
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

  ALTER TABLE public.ambientes
    ADD CONSTRAINT ambientes_cliente_id_fkey
    FOREIGN KEY (cliente_id) REFERENCES public.clientes(id) ON DELETE NO ACTION;

  ALTER TABLE public.assinaturas
    ADD CONSTRAINT assinaturas_cliente_id_fkey
    FOREIGN KEY (cliente_id) REFERENCES public.clientes(id) ON DELETE NO ACTION;

  ALTER TABLE public.contas_receber
    ADD CONSTRAINT contas_receber_cliente_id_fkey
    FOREIGN KEY (cliente_id) REFERENCES public.clientes(id) ON DELETE NO ACTION;

  ALTER TABLE public.documentos_cliente
    ADD CONSTRAINT documentos_cliente_cliente_id_fkey
    FOREIGN KEY (cliente_id) REFERENCES public.clientes(id) ON DELETE NO ACTION;

  ALTER TABLE public.documentos_gerados
    ADD CONSTRAINT documentos_gerados_cliente_id_fkey
    FOREIGN KEY (cliente_id) REFERENCES public.clientes(id) ON DELETE NO ACTION;

  ALTER TABLE public.dossies
    ADD CONSTRAINT dossies_cliente_id_fkey
    FOREIGN KEY (cliente_id) REFERENCES public.clientes(id) ON DELETE NO ACTION;

  ALTER TABLE public.envelopes_assinatura
    ADD CONSTRAINT envelopes_assinatura_cliente_id_fkey
    FOREIGN KEY (cliente_id) REFERENCES public.clientes(id) ON DELETE NO ACTION;

  ALTER TABLE public.estoque_caixas
    ADD CONSTRAINT estoque_caixas_cliente_id_fkey
    FOREIGN KEY (cliente_id) REFERENCES public.clientes(id) ON DELETE NO ACTION;

  ALTER TABLE public.pagamentos
    ADD CONSTRAINT pagamentos_cliente_id_fkey
    FOREIGN KEY (cliente_id) REFERENCES public.clientes(id) ON DELETE NO ACTION;

  ALTER TABLE public.produtos_servicos
    ADD CONSTRAINT produtos_servicos_cliente_id_fkey
    FOREIGN KEY (cliente_id) REFERENCES public.clientes(id) ON DELETE NO ACTION;

  ALTER TABLE public.produtos_servicos_projeto
    ADD CONSTRAINT produtos_servicos_projeto_cliente_id_fkey
    FOREIGN KEY (cliente_id) REFERENCES public.clientes(id) ON DELETE NO ACTION;

  ALTER TABLE public.timeline_eventos
    ADD CONSTRAINT timeline_eventos_cliente_id_fkey
    FOREIGN KEY (cliente_id) REFERENCES public.clientes(id) ON DELETE NO ACTION;
END $$;

-- Also relax clientes -> leads FK to ON DELETE NO ACTION (was SET NULL)
DO $$
DECLARE
  rec RECORD;
BEGIN
  FOR rec IN
    SELECT tc.constraint_name
    FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu
      ON tc.constraint_name = kcu.constraint_name
    WHERE tc.table_name = 'clientes'
      AND kcu.column_name = 'lead_id'
      AND tc.constraint_type = 'FOREIGN KEY'
      AND tc.table_schema = 'public'
  LOOP
    EXECUTE 'ALTER TABLE public.clientes DROP CONSTRAINT IF EXISTS ' || quote_ident(rec.constraint_name);
  END LOOP;

  ALTER TABLE public.clientes
    ADD CONSTRAINT clientes_lead_id_fkey
    FOREIGN KEY (lead_id) REFERENCES public.leads(id) ON DELETE NO ACTION;
END $$;
