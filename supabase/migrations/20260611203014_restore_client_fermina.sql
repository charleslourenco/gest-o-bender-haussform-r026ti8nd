DO $$
DECLARE
  v_cliente_id uuid;
  v_lead_id uuid;
  v_formulario_id uuid;
  v_user_id uuid;
BEGIN
  -- Find the client "Fermina"
  SELECT id INTO v_cliente_id FROM public.clientes WHERE nome ILIKE '%Fermina%' LIMIT 1;

  IF v_cliente_id IS NOT NULL THEN
    -- 1. Update the client status to 'Ativo' preserving all other data (cpf, telefone, endereco_obra, etc)
    UPDATE public.clientes 
    SET status = 'Ativo' 
    WHERE id = v_cliente_id;

    -- 2. Ensure the client has a linked lead
    SELECT lead_id INTO v_lead_id FROM public.clientes WHERE id = v_cliente_id;
    
    IF v_lead_id IS NULL THEN
      -- Look for an existing lead for Fermina
      SELECT id INTO v_lead_id FROM public.leads WHERE nome ILIKE '%Fermina%' LIMIT 1;
      
      IF v_lead_id IS NULL THEN
         v_lead_id := gen_random_uuid();
         INSERT INTO public.leads (id, nome, email, telefone, categoria, origem, status, ordem, kanban_ativo)
         VALUES (v_lead_id, 'Fermina', 'fermina@restaurada.com', '', 'Quente', 'Indicação', 'Vendido', 0, true)
         ON CONFLICT DO NOTHING;
      END IF;
      
      -- Update only the lead_id
      UPDATE public.clientes SET lead_id = v_lead_id WHERE id = v_cliente_id;
    END IF;

    -- 3. Ensure consistency for the commercial form (formulario_comercial)
    SELECT id INTO v_formulario_id FROM public.formulario_comercial WHERE cliente_id = v_cliente_id LIMIT 1;
    
    IF v_formulario_id IS NULL THEN
      v_formulario_id := gen_random_uuid();
      
      -- Try to get a valid user to associate with the form
      SELECT id INTO v_user_id FROM auth.users LIMIT 1;
      
      IF v_user_id IS NULL THEN
        -- Fallback if no user exists in auth.users
        v_user_id := '00000000-0000-0000-0000-000000000000'::uuid;
      END IF;

      INSERT INTO public.formulario_comercial (id, lead_id, cliente_id, nome_cliente, user_id)
      VALUES (v_formulario_id, v_lead_id, v_cliente_id, 'Fermina', v_user_id)
      ON CONFLICT DO NOTHING;
    END IF;

    -- 4. Ensure the dossier exists and is linked properly
    IF NOT EXISTS (SELECT 1 FROM public.dossies WHERE cliente_id = v_cliente_id) THEN
      IF v_formulario_id IS NOT NULL THEN
          INSERT INTO public.dossies (id, cliente_id, formulario_comercial_id, status)
          VALUES (gen_random_uuid(), v_cliente_id, v_formulario_id, 'em_andamento')
          ON CONFLICT DO NOTHING;
      END IF;
    ELSE
      -- Relink if it was unlinked, and ensure status is active to show up in project-based views
      UPDATE public.dossies 
      SET 
        formulario_comercial_id = COALESCE(formulario_comercial_id, v_formulario_id), 
        status = 'em_andamento'
      WHERE cliente_id = v_cliente_id AND (formulario_comercial_id IS NULL OR status != 'em_andamento');
    END IF;
    
  END IF;
END $$;
