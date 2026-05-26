CREATE TABLE IF NOT EXISTS public.configuracoes_sistema (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  markup_vista NUMERIC NOT NULL DEFAULT 0.40,
  markup_prazo NUMERIC NOT NULL DEFAULT 0.35,
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Inserir singleton de configurações globais
INSERT INTO public.configuracoes_sistema (id, markup_vista, markup_prazo)
VALUES ('00000000-0000-0000-0000-000000000001'::uuid, 0.40, 0.35)
ON CONFLICT (id) DO NOTHING;

-- Ativar RLS
ALTER TABLE public.configuracoes_sistema ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "auth_read_config" ON public.configuracoes_sistema;
CREATE POLICY "auth_read_config" ON public.configuracoes_sistema
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "admin_update_config" ON public.configuracoes_sistema;
CREATE POLICY "admin_update_config" ON public.configuracoes_sistema
  FOR UPDATE TO authenticated USING (is_admin(auth.uid())) WITH CHECK (is_admin(auth.uid()));

-- Garantir que o admin teste (charleslourenco01@icloud.com) possua acesso administrativo
DO $$
DECLARE
  charles_id uuid;
BEGIN
  SELECT id INTO charles_id FROM auth.users WHERE email = 'charleslourenco01@icloud.com' LIMIT 1;
  IF charles_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.matriz_permissoes 
      WHERE usuario_id = charles_id AND modulo = 'Orçamentos' AND nivel_acesso = 'Admin'
    ) THEN
      INSERT INTO public.matriz_permissoes (usuario_id, modulo, nivel_acesso)
      VALUES (charles_id, 'Orçamentos', 'Admin');
    END IF;
  END IF;
END $$;
