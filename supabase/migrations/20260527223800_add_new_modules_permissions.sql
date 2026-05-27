DO $$
DECLARE
  user_rec RECORD;
BEGIN
  -- Insert Admin access for all Super Admins or existing Admins to ensure no backward compatibility issues
  FOR user_rec IN SELECT DISTINCT usuario_id FROM public.matriz_permissoes WHERE nivel_acesso = 'Admin' LOOP
    
    IF NOT EXISTS (SELECT 1 FROM public.matriz_permissoes WHERE usuario_id = user_rec.usuario_id AND modulo = 'Criar Lista de Materiais') THEN
      INSERT INTO public.matriz_permissoes (usuario_id, modulo, nivel_acesso)
      VALUES (user_rec.usuario_id, 'Criar Lista de Materiais', 'Admin');
    END IF;

    IF NOT EXISTS (SELECT 1 FROM public.matriz_permissoes WHERE usuario_id = user_rec.usuario_id AND modulo = 'Criar Orçamento') THEN
      INSERT INTO public.matriz_permissoes (usuario_id, modulo, nivel_acesso)
      VALUES (user_rec.usuario_id, 'Criar Orçamento', 'Admin');
    END IF;

  END LOOP;
END $$;
