CREATE OR REPLACE FUNCTION public.has_module_access(user_id uuid, mod text)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  has_access boolean;
BEGIN
  SELECT EXISTS(
    SELECT 1 FROM public.matriz_permissoes
    WHERE usuario_id = user_id AND modulo = mod AND nivel_acesso IN ('Admin', 'Editor', 'Leitor')
  ) INTO has_access;
  RETURN has_access;
END;
$function$;

DROP POLICY IF EXISTS "produtos_servicos_projeto_select_analise" ON public.produtos_servicos_projeto;
CREATE POLICY "produtos_servicos_projeto_select_analise" ON public.produtos_servicos_projeto
  FOR SELECT TO authenticated USING (has_module_access(auth.uid(), 'Análise Técnica') OR is_admin(auth.uid()));

DROP POLICY IF EXISTS "produtos_servicos_projeto_update_analise" ON public.produtos_servicos_projeto;
CREATE POLICY "produtos_servicos_projeto_update_analise" ON public.produtos_servicos_projeto
  FOR UPDATE TO authenticated USING (has_module_access(auth.uid(), 'Análise Técnica') OR is_admin(auth.uid())) WITH CHECK (has_module_access(auth.uid(), 'Análise Técnica') OR is_admin(auth.uid()));
