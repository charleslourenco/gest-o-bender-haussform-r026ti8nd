DO $$
BEGIN
  -- Atualiza o nome legado para 'Clientes' nos registros que ainda não possuem 'Clientes' para o mesmo usuário
  UPDATE public.matriz_permissoes mp1
  SET modulo = 'Clientes'
  WHERE modulo = 'Área de Clientes'
    AND NOT EXISTS (
      SELECT 1 FROM public.matriz_permissoes mp2 
      WHERE mp2.usuario_id = mp1.usuario_id 
        AND mp2.modulo = 'Clientes'
    );
    
  -- Remove eventuais duplicatas restantes de 'Área de Clientes'
  DELETE FROM public.matriz_permissoes WHERE modulo = 'Área de Clientes';

END $$;
