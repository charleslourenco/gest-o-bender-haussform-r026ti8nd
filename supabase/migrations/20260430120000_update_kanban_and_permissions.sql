DO $$
BEGIN
  ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS criado_por_nome TEXT;
  
  UPDATE public.matriz_permissoes SET modulo = 'Área de Clientes' WHERE modulo = 'Clientes';
  UPDATE public.matriz_permissoes SET modulo = 'Dashboard' WHERE modulo = 'Início';
  UPDATE public.matriz_permissoes SET modulo = 'Administrativo' WHERE modulo = 'Admin';
END $$;
