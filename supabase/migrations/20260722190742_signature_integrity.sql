-- Add is_digital flag to documentos_cliente for conditional signature layout
ALTER TABLE public.documentos_cliente ADD COLUMN IF NOT EXISTS is_digital BOOLEAN DEFAULT false;

-- Backfill existing envelope-linked documents as digital
UPDATE public.documentos_cliente
SET is_digital = true
WHERE envelope_id IS NOT NULL AND is_digital = false;

-- Auto-set is_digital when a document is linked to an envelope
CREATE OR REPLACE FUNCTION public.set_is_digital_on_envelope_link()
RETURNS trigger AS $$
BEGIN
  IF NEW.envelope_id IS NOT NULL AND COALESCE(NEW.is_digital, false) = false THEN
    NEW.is_digital := true;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_is_digital_on_envelope_link ON public.documentos_cliente;
CREATE TRIGGER set_is_digital_on_envelope_link
BEFORE INSERT OR UPDATE ON public.documentos_cliente
FOR EACH ROW EXECUTE FUNCTION public.set_is_digital_on_envelope_link();

-- Strict envelope completion gate: prevent premature 'concluido' status
CREATE OR REPLACE FUNCTION public.check_envelope_completion()
RETURNS trigger AS $$
DECLARE
  v_total INT;
  v_signed INT;
BEGIN
  IF NEW.status = 'concluido' AND (OLD.status IS DISTINCT FROM 'concluido') THEN
    SELECT COUNT(*) INTO v_total
    FROM public.assinantes
    WHERE envelope_id = NEW.id;

    SELECT COUNT(*) INTO v_signed
    FROM public.assinantes
    WHERE envelope_id = NEW.id AND status = 'assinado';

    IF v_total > 0 AND v_signed < v_total THEN
      NEW.status := COALESCE(OLD.status, 'aguardando');
      NEW.concluido_em := NULL;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS before_envelope_completion_check ON public.envelopes_assinatura;
CREATE TRIGGER before_envelope_completion_check
BEFORE UPDATE ON public.envelopes_assinatura
FOR EACH ROW EXECUTE FUNCTION public.check_envelope_completion();

-- Seed initial admin user
DO $$
DECLARE
  new_user_id uuid;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'charleslourenco01@icloud.com') THEN
    new_user_id := gen_random_uuid();
    INSERT INTO auth.users (
      id, instance_id, email, encrypted_password, email_confirmed_at,
      created_at, updated_at, raw_app_meta_data, raw_user_meta_data,
      is_super_admin, role, aud,
      confirmation_token, recovery_token, email_change_token_new,
      email_change, email_change_token_current,
      phone, phone_change, phone_change_token, reauthentication_token
    ) VALUES (
      new_user_id,
      '00000000-0000-0000-0000-000000000000',
      'charleslourenco01@icloud.com',
      crypt('Skip@Pass', gen_salt('bf')),
      NOW(), NOW(), NOW(),
      '{"provider": "email", "providers": ["email"]}',
      '{"name": "Charles Lourenco"}',
      false, 'authenticated', 'authenticated',
      '', '', '', '', '',
      NULL, '', '', ''
    );

    INSERT INTO public.users (id, email, nome, funcao, status)
    VALUES (new_user_id, 'charleslourenco01@icloud.com', 'Charles Lourenco', 'Administrador', true)
    ON CONFLICT (id) DO NOTHING;

    INSERT INTO public.matriz_permissoes (usuario_id, modulo, nivel_acesso)
    SELECT new_user_id, m.modulo, 'admin'
    FROM (VALUES
      ('comercial'), ('clientes'), ('financeiro'), ('producao'),
      ('montagem'), ('acompanhamentos'), ('estoque'), ('gestao_pessoas'),
      ('admin'), ('analise_tecnica'), ('documentos'), ('assinaturas')
    ) AS m(modulo)
    WHERE NOT EXISTS (
      SELECT 1 FROM public.matriz_permissoes mp
      WHERE mp.usuario_id = new_user_id AND mp.modulo = m.modulo
    );
  END IF;
END $$;
