ALTER TABLE public.orcamentos_engenharia 
ADD COLUMN IF NOT EXISTS arquiteto_nome TEXT DEFAULT 'Nome do Arquiteto',
ADD COLUMN IF NOT EXISTS arquiteto_bio TEXT DEFAULT 'Breve biografia do arquiteto parceiro responsável por este projeto.',
ADD COLUMN IF NOT EXISTS arquiteto_foto TEXT DEFAULT 'https://img.usecurling.com/ppl/large?gender=female&seed=2',
ADD COLUMN IF NOT EXISTS textos_institucionais JSONB DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS cliente_nome_manual TEXT;
