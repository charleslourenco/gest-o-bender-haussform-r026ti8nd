-- Migração para adicionar suporte a subcards em produtos_servicos_projeto
-- card_pai_id referencia o card pai (ambiente)
-- cor_vinculo armazena a cor única gerada para o vínculo visual
-- Restrição: sem subcard de subcard (um card que tem card_pai_id não pode ser pai de outro)

ALTER TABLE public.produtos_servicos_projeto
  ADD COLUMN IF NOT EXISTS card_pai_id UUID REFERENCES public.produtos_servicos_projeto(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS cor_vinculo TEXT;

-- Índice para busca rápida de subcards de um pai
CREATE INDEX IF NOT EXISTS idx_produtos_servicos_projeto_card_pai_id
  ON public.produtos_servicos_projeto(card_pai_id);

-- Constraint / Trigger para garantir no máximo 2 níveis dentro de produtos_servicos_projeto:
-- Um card que já é subcard (tem card_pai_id NOT NULL) nunca pode ser apontado como card_pai_id de outro.
CREATE OR REPLACE FUNCTION public.check_no_subcard_of_subcard()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.card_pai_id IS NOT NULL THEN
    -- Verifica se o pai já possui card_pai_id
    IF EXISTS (
      SELECT 1 FROM public.produtos_servicos_projeto
      WHERE id = NEW.card_pai_id AND card_pai_id IS NOT NULL
    ) THEN
      RAISE EXCEPTION 'Não é permitido criar subcard de subcard (máximo 3 camadas: projeto -> ambiente -> subcard).';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_check_no_subcard_of_subcard ON public.produtos_servicos_projeto;
CREATE TRIGGER trg_check_no_subcard_of_subcard
  BEFORE INSERT OR UPDATE OF card_pai_id
  ON public.produtos_servicos_projeto
  FOR EACH ROW
  EXECUTE FUNCTION public.check_no_subcard_of_subcard();
