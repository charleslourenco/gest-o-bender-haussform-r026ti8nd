-- Garante que o bucket bender_clientes existe e é público
INSERT INTO storage.buckets (id, name, public)
VALUES ('bender_clientes', 'bender_clientes', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Garante que o bucket bender_templates existe e é público
INSERT INTO storage.buckets (id, name, public)
VALUES ('bender_templates', 'bender_templates', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Recria política de leitura pública para visualização do PDF pelos clientes
DROP POLICY IF EXISTS "bender_clientes_public_read" ON storage.objects;
CREATE POLICY "bender_clientes_public_read" ON storage.objects
  FOR SELECT USING (bucket_id = 'bender_clientes');

-- Permite inserção para usuários autenticados e funções do sistema
DROP POLICY IF EXISTS "bender_clientes_auth_insert" ON storage.objects;
CREATE POLICY "bender_clientes_auth_insert" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (bucket_id = 'bender_clientes');

-- Permite atualização para usuários autenticados e funções do sistema
DROP POLICY IF EXISTS "bender_clientes_auth_update" ON storage.objects;
CREATE POLICY "bender_clientes_auth_update" ON storage.objects
  FOR UPDATE TO authenticated USING (bucket_id = 'bender_clientes');

-- Recria política de leitura pública para o bucket bender_templates (para a logo)
DROP POLICY IF EXISTS "bender_templates_public_read" ON storage.objects;
CREATE POLICY "bender_templates_public_read" ON storage.objects
  FOR SELECT USING (bucket_id = 'bender_templates');
