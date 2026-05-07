ALTER TABLE public.assinaturas ADD COLUMN IF NOT EXISTS signatario_data_nascimento DATE;
ALTER TABLE public.assinaturas ADD COLUMN IF NOT EXISTS assinatura_imagem TEXT;
