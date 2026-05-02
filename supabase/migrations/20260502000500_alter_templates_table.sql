DO $$
BEGIN
  -- Adiciona as novas colunas caso a tabela já exista
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'templates' AND column_name = 'descricao') THEN
    ALTER TABLE public.templates ADD COLUMN descricao TEXT;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'templates' AND column_name = 'user_id') THEN
    ALTER TABLE public.templates ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE DEFAULT auth.uid();
  END IF;
END $$;

-- Habilita RLS
ALTER TABLE public.templates ENABLE ROW LEVEL SECURITY;

-- Limpar políticas existentes para evitar conflitos
DROP POLICY IF EXISTS "Admin Editor Templates" ON public.templates;
DROP POLICY IF EXISTS "Usuário autenticado consegue ver templates criados por ele" ON public.templates;
DROP POLICY IF EXISTS "Usuário autenticado consegue criar templates" ON public.templates;
DROP POLICY IF EXISTS "Usuário autenticado consegue editar templates criados por ele" ON public.templates;
DROP POLICY IF EXISTS "Usuário autenticado consegue deletar templates criados por ele" ON public.templates;

-- 1. SELECT: Usuário autenticado consegue ver templates criados por ele
CREATE POLICY "Usuário autenticado consegue ver templates criados por ele" 
ON public.templates FOR SELECT TO authenticated 
USING (auth.uid() = user_id);

-- 2. INSERT: Usuário autenticado consegue criar templates
CREATE POLICY "Usuário autenticado consegue criar templates" 
ON public.templates FOR INSERT TO authenticated 
WITH CHECK (auth.uid() = user_id);

-- 3. UPDATE: Usuário autenticado consegue editar templates criados por ele
CREATE POLICY "Usuário autenticado consegue editar templates criados por ele" 
ON public.templates FOR UPDATE TO authenticated 
USING (auth.uid() = user_id);

-- 4. DELETE: Usuário autenticado consegue deletar templates criados por ele
CREATE POLICY "Usuário autenticado consegue deletar templates criados por ele" 
ON public.templates FOR DELETE TO authenticated 
USING (auth.uid() = user_id);

-- INDICE em (user_id, tipo)
CREATE INDEX IF NOT EXISTS idx_templates_user_id_tipo ON public.templates (user_id, tipo);

-- Função/Trigger de Atualização (atualizado_em)
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.atualizado_em = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_templates_atualizado_em ON public.templates;
CREATE TRIGGER set_templates_atualizado_em
BEFORE UPDATE ON public.templates
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();
