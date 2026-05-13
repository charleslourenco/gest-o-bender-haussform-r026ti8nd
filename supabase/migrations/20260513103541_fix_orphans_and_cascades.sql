-- Clean up orphaned records in contas_receber where cliente_id is no longer valid
DELETE FROM public.contas_receber
WHERE cliente_id IS NOT NULL 
  AND NOT EXISTS (SELECT 1 FROM public.clientes WHERE id = contas_receber.cliente_id);

-- Clean up orphaned records in assinaturas where cliente_id is no longer valid
DELETE FROM public.assinaturas
WHERE cliente_id IS NOT NULL 
  AND NOT EXISTS (SELECT 1 FROM public.clientes WHERE id = assinaturas.cliente_id);

-- Clean up orphaned records in dossies where cliente_id is no longer valid
DELETE FROM public.dossies
WHERE cliente_id IS NOT NULL 
  AND NOT EXISTS (SELECT 1 FROM public.clientes WHERE id = dossies.cliente_id);

-- Clean up orphaned records in produtos_servicos_projeto where cliente_id is no longer valid
DELETE FROM public.produtos_servicos_projeto
WHERE cliente_id IS NOT NULL 
  AND NOT EXISTS (SELECT 1 FROM public.clientes WHERE id = produtos_servicos_projeto.cliente_id);
