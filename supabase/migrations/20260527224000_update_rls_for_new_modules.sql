-- Re-apply RLS policies correctly for listas_materiais
DROP POLICY IF EXISTS "listas_mat_auth_all" ON public.listas_materiais;
DROP POLICY IF EXISTS "listas_materiais_delete" ON public.listas_materiais;
DROP POLICY IF EXISTS "listas_materiais_insert" ON public.listas_materiais;
DROP POLICY IF EXISTS "listas_materiais_select" ON public.listas_materiais;
DROP POLICY IF EXISTS "listas_materiais_update" ON public.listas_materiais;

CREATE POLICY "listas_materiais_select" ON public.listas_materiais
  FOR SELECT TO authenticated
  USING (has_module_access(auth.uid(), 'Criar Lista de Materiais') OR is_admin(auth.uid()));

CREATE POLICY "listas_materiais_insert" ON public.listas_materiais
  FOR INSERT TO authenticated
  WITH CHECK (has_module_access(auth.uid(), 'Criar Lista de Materiais') OR is_admin(auth.uid()));

CREATE POLICY "listas_materiais_update" ON public.listas_materiais
  FOR UPDATE TO authenticated
  USING (has_module_access(auth.uid(), 'Criar Lista de Materiais') OR is_admin(auth.uid()))
  WITH CHECK (has_module_access(auth.uid(), 'Criar Lista de Materiais') OR is_admin(auth.uid()));

CREATE POLICY "listas_materiais_delete" ON public.listas_materiais
  FOR DELETE TO authenticated
  USING (has_module_access(auth.uid(), 'Criar Lista de Materiais') OR is_admin(auth.uid()));


-- Re-apply RLS policies correctly for itens_lista_material
DROP POLICY IF EXISTS "itens_listas_mat_auth_all" ON public.itens_lista_material;
DROP POLICY IF EXISTS "itens_lista_material_delete" ON public.itens_lista_material;
DROP POLICY IF EXISTS "itens_lista_material_insert" ON public.itens_lista_material;
DROP POLICY IF EXISTS "itens_lista_material_select" ON public.itens_lista_material;
DROP POLICY IF EXISTS "itens_lista_material_update" ON public.itens_lista_material;

CREATE POLICY "itens_lista_material_select" ON public.itens_lista_material
  FOR SELECT TO authenticated
  USING (has_module_access(auth.uid(), 'Criar Lista de Materiais') OR is_admin(auth.uid()));

CREATE POLICY "itens_lista_material_insert" ON public.itens_lista_material
  FOR INSERT TO authenticated
  WITH CHECK (has_module_access(auth.uid(), 'Criar Lista de Materiais') OR is_admin(auth.uid()));

CREATE POLICY "itens_lista_material_update" ON public.itens_lista_material
  FOR UPDATE TO authenticated
  USING (has_module_access(auth.uid(), 'Criar Lista de Materiais') OR is_admin(auth.uid()))
  WITH CHECK (has_module_access(auth.uid(), 'Criar Lista de Materiais') OR is_admin(auth.uid()));

CREATE POLICY "itens_lista_material_delete" ON public.itens_lista_material
  FOR DELETE TO authenticated
  USING (has_module_access(auth.uid(), 'Criar Lista de Materiais') OR is_admin(auth.uid()));


-- Re-apply RLS policies correctly for orcamentos
DROP POLICY IF EXISTS "orc_auth_all" ON public.orcamentos;
DROP POLICY IF EXISTS "orcamentos_delete" ON public.orcamentos;
DROP POLICY IF EXISTS "orcamentos_insert" ON public.orcamentos;
DROP POLICY IF EXISTS "orcamentos_select" ON public.orcamentos;
DROP POLICY IF EXISTS "orcamentos_update" ON public.orcamentos;

CREATE POLICY "orcamentos_select" ON public.orcamentos
  FOR SELECT TO authenticated
  USING (has_module_access(auth.uid(), 'Criar Orçamento') OR is_admin(auth.uid()));

CREATE POLICY "orcamentos_insert" ON public.orcamentos
  FOR INSERT TO authenticated
  WITH CHECK (has_module_access(auth.uid(), 'Criar Orçamento') OR is_admin(auth.uid()));

CREATE POLICY "orcamentos_update" ON public.orcamentos
  FOR UPDATE TO authenticated
  USING (has_module_access(auth.uid(), 'Criar Orçamento') OR is_admin(auth.uid()))
  WITH CHECK (has_module_access(auth.uid(), 'Criar Orçamento') OR is_admin(auth.uid()));

CREATE POLICY "orcamentos_delete" ON public.orcamentos
  FOR DELETE TO authenticated
  USING (has_module_access(auth.uid(), 'Criar Orçamento') OR is_admin(auth.uid()));


-- Re-apply RLS policies correctly for itens_orcamento
DROP POLICY IF EXISTS "itens_orc_auth_all" ON public.itens_orcamento;
DROP POLICY IF EXISTS "itens_orcamento_delete" ON public.itens_orcamento;
DROP POLICY IF EXISTS "itens_orcamento_insert" ON public.itens_orcamento;
DROP POLICY IF EXISTS "itens_orcamento_select" ON public.itens_orcamento;
DROP POLICY IF EXISTS "itens_orcamento_update" ON public.itens_orcamento;

CREATE POLICY "itens_orcamento_select" ON public.itens_orcamento
  FOR SELECT TO authenticated
  USING (has_module_access(auth.uid(), 'Criar Orçamento') OR is_admin(auth.uid()));

CREATE POLICY "itens_orcamento_insert" ON public.itens_orcamento
  FOR INSERT TO authenticated
  WITH CHECK (has_module_access(auth.uid(), 'Criar Orçamento') OR is_admin(auth.uid()));

CREATE POLICY "itens_orcamento_update" ON public.itens_orcamento
  FOR UPDATE TO authenticated
  USING (has_module_access(auth.uid(), 'Criar Orçamento') OR is_admin(auth.uid()))
  WITH CHECK (has_module_access(auth.uid(), 'Criar Orçamento') OR is_admin(auth.uid()));

CREATE POLICY "itens_orcamento_delete" ON public.itens_orcamento
  FOR DELETE TO authenticated
  USING (has_module_access(auth.uid(), 'Criar Orçamento') OR is_admin(auth.uid()));


-- Re-apply RLS policies correctly for orcamentos_engenharia
DROP POLICY IF EXISTS "orcamentos_engenharia_all" ON public.orcamentos_engenharia;

CREATE POLICY "orcamentos_engenharia_select" ON public.orcamentos_engenharia
  FOR SELECT TO authenticated
  USING (has_module_access(auth.uid(), 'Criar Orçamento') OR is_admin(auth.uid()));

CREATE POLICY "orcamentos_engenharia_insert" ON public.orcamentos_engenharia
  FOR INSERT TO authenticated
  WITH CHECK (has_module_access(auth.uid(), 'Criar Orçamento') OR is_admin(auth.uid()));

CREATE POLICY "orcamentos_engenharia_update" ON public.orcamentos_engenharia
  FOR UPDATE TO authenticated
  USING (has_module_access(auth.uid(), 'Criar Orçamento') OR is_admin(auth.uid()))
  WITH CHECK (has_module_access(auth.uid(), 'Criar Orçamento') OR is_admin(auth.uid()));

CREATE POLICY "orcamentos_engenharia_delete" ON public.orcamentos_engenharia
  FOR DELETE TO authenticated
  USING (has_module_access(auth.uid(), 'Criar Orçamento') OR is_admin(auth.uid()));


-- Re-apply RLS policies correctly for orcamentos_ambientes
DROP POLICY IF EXISTS "orcamentos_ambientes_all" ON public.orcamentos_ambientes;

CREATE POLICY "orcamentos_ambientes_select" ON public.orcamentos_ambientes
  FOR SELECT TO authenticated
  USING (has_module_access(auth.uid(), 'Criar Orçamento') OR is_admin(auth.uid()));

CREATE POLICY "orcamentos_ambientes_insert" ON public.orcamentos_ambientes
  FOR INSERT TO authenticated
  WITH CHECK (has_module_access(auth.uid(), 'Criar Orçamento') OR is_admin(auth.uid()));

CREATE POLICY "orcamentos_ambientes_update" ON public.orcamentos_ambientes
  FOR UPDATE TO authenticated
  USING (has_module_access(auth.uid(), 'Criar Orçamento') OR is_admin(auth.uid()))
  WITH CHECK (has_module_access(auth.uid(), 'Criar Orçamento') OR is_admin(auth.uid()));

CREATE POLICY "orcamentos_ambientes_delete" ON public.orcamentos_ambientes
  FOR DELETE TO authenticated
  USING (has_module_access(auth.uid(), 'Criar Orçamento') OR is_admin(auth.uid()));


-- Re-apply RLS policies correctly for orcamentos_itens
DROP POLICY IF EXISTS "orcamentos_itens_all" ON public.orcamentos_itens;

CREATE POLICY "orcamentos_itens_select" ON public.orcamentos_itens
  FOR SELECT TO authenticated
  USING (has_module_access(auth.uid(), 'Criar Orçamento') OR is_admin(auth.uid()));

CREATE POLICY "orcamentos_itens_insert" ON public.orcamentos_itens
  FOR INSERT TO authenticated
  WITH CHECK (has_module_access(auth.uid(), 'Criar Orçamento') OR is_admin(auth.uid()));

CREATE POLICY "orcamentos_itens_update" ON public.orcamentos_itens
  FOR UPDATE TO authenticated
  USING (has_module_access(auth.uid(), 'Criar Orçamento') OR is_admin(auth.uid()))
  WITH CHECK (has_module_access(auth.uid(), 'Criar Orçamento') OR is_admin(auth.uid()));

CREATE POLICY "orcamentos_itens_delete" ON public.orcamentos_itens
  FOR DELETE TO authenticated
  USING (has_module_access(auth.uid(), 'Criar Orçamento') OR is_admin(auth.uid()));
