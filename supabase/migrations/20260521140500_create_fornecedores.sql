CREATE TABLE IF NOT EXISTS public.fornecedores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  razao_social TEXT NOT NULL,
  cnpj TEXT NOT NULL UNIQUE,
  nome_fantasia TEXT,
  cep TEXT,
  logradouro TEXT,
  numero TEXT,
  complemento TEXT,
  bairro TEXT,
  municipio TEXT,
  estado TEXT,
  email TEXT,
  telefone TEXT,
  inscricao_estadual TEXT,
  data_abertura DATE,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.fornecedores ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "fornecedores_all" ON public.fornecedores;
CREATE POLICY "fornecedores_all" ON public.fornecedores
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP TRIGGER IF EXISTS set_fornecedores_atualizado_em ON public.fornecedores;
CREATE TRIGGER set_fornecedores_atualizado_em BEFORE UPDATE ON public.fornecedores FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

INSERT INTO public.fornecedores (razao_social, cnpj, nome_fantasia, logradouro, numero, bairro, municipio, estado, email, telefone)
VALUES
  ('Fornecedor de Madeiras Ltda', '12345678000199', 'Madeiras Brasil', 'Rua das Árvores', '100', 'Centro', 'São Paulo', 'SP', 'contato@madeirasbr.com', '11999999999'),
  ('Ferragens Silva SA', '98765432000111', 'Silva Ferragens', 'Av. dos Parafusos', '250', 'Industrial', 'Joinville', 'SC', 'vendas@silvaferragens.com', '47888888888')
ON CONFLICT (cnpj) DO NOTHING;
