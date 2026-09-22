-- Migration idempotente para backfill de valores em subcards de produtos_servicos_projeto
-- Para cada subcard (card_pai_id IS NOT NULL) com valor_total nulo ou 0:
-- Casa pelo nome do produto/ambiente com o item do JSON produtos_servicos do formulário vinculado
-- (via formulario_comercial_id do próprio subcard ou do pai).
-- Calcula valor_liquido = valor_unitario * (1 - desconto_percentual/100) * qtd.
-- Onde não casar com confiança, deixa 0.

DO $$
DECLARE
  v_sub RECORD;
  v_item JSONB;
  v_prod_nome TEXT;
  v_item_nome TEXT;
  v_unit NUMERIC;
  v_desc NUMERIC;
  v_qtd NUMERIC;
  v_total NUMERIC;
  v_matched BOOLEAN;
BEGIN
  FOR v_sub IN
    SELECT
      c.id,
      c.nome_produto,
      c.qtd AS sub_qtd,
      f.produtos_servicos
    FROM public.produtos_servicos_projeto c
    LEFT JOIN public.produtos_servicos_projeto pai ON pai.id = c.card_pai_id
    LEFT JOIN public.formulario_comercial f ON f.id = COALESCE(c.formulario_comercial_id, pai.formulario_comercial_id)
    WHERE c.card_pai_id IS NOT NULL
      AND (c.valor_total IS NULL OR c.valor_total = 0)
      AND f.produtos_servicos IS NOT NULL
  LOOP
    v_matched := FALSE;
    v_prod_nome := lower(trim(regexp_replace(v_sub.nome_produto, '[:\s]+$', '')));

    -- Iterar sobre os elementos do jsonb produtos_servicos
    FOR v_item IN SELECT * FROM jsonb_array_elements(v_sub.produtos_servicos)
    LOOP
      v_item_nome := lower(trim(regexp_replace(COALESCE(v_item->>'nome', ''), '[:\s]+$', '')));
      
      -- Casamento com confiança: nome idêntico ou um contido no outro se tamanho relevante
      IF v_item_nome <> '' AND (
        v_item_nome = v_prod_nome
        OR (length(v_prod_nome) >= 4 AND v_item_nome = v_prod_nome)
        OR (length(v_prod_nome) >= 4 AND length(v_item_nome) >= 4 AND (
             v_item_nome LIKE '%' || v_prod_nome || '%'
             OR v_prod_nome LIKE '%' || v_item_nome || '%'
           ))
      ) THEN
        v_unit := COALESCE((v_item->>'valor_unitario')::numeric, 0);
        v_desc := COALESCE((v_item->>'desconto_percentual')::numeric, (v_item->>'desconto')::numeric, 0);
        v_qtd := COALESCE(NULLIF((v_item->>'qtd')::numeric, 0), v_sub.sub_qtd, 1);
        v_total := round(v_unit * (1 - (v_desc / 100)) * v_qtd, 2);

        UPDATE public.produtos_servicos_projeto
        SET
          valor_unitario = v_unit,
          desconto_percentual = v_desc,
          qtd = v_qtd::int,
          valor_total = v_total,
          atualizado_em = NOW()
        WHERE id = v_sub.id;

        v_matched := TRUE;
        EXIT; -- sai do loop de itens para este subcard
      END IF;
    END LOOP;

  END LOOP;
END $$;
