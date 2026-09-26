-- Migration: Adiciona cliente_id em estoque_alocacoes e realiza backfill inteligente
-- Versao: 20260926150000_add_cliente_id_to_estoque_alocacoes.sql

-- (a) Adiciona coluna cliente_id e indice
ALTER TABLE public.estoque_alocacoes
  ADD COLUMN IF NOT EXISTS cliente_id uuid REFERENCES public.clientes(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_estoque_alocacoes_cliente_id
  ON public.estoque_alocacoes(cliente_id);

-- (b) Backfill inteligente:
-- Vincula cliente_id quando cliente_nome corresponder a clientes cadastrados,
-- ignorando registros internos de producao/sobra/teste.
DO $$
DECLARE
  v_updated INT := 0;
BEGIN
  UPDATE public.estoque_alocacoes aloc
  SET cliente_id = (
    SELECT c.id
    FROM public.clientes c
    WHERE lower(trim(c.nome)) = lower(trim(aloc.cliente_nome))
       OR (length(c.nome) >= 4 AND (c.nome ILIKE '%' || aloc.cliente_nome || '%' OR aloc.cliente_nome ILIKE '%' || c.nome || '%'))
       OR (aloc.cliente_nome ILIKE '%MARCO%' AND c.nome ILIKE '%Marco%')
       OR (aloc.cliente_nome ILIKE '%ROGGA%' AND c.nome ILIKE '%Rogga%')
       OR (aloc.cliente_nome ILIKE '%CAMILA%' AND c.nome ILIKE '%Marco%')
    ORDER BY
      CASE
        WHEN lower(trim(c.nome)) = lower(trim(aloc.cliente_nome)) THEN 1
        WHEN c.nome ILIKE '%' || aloc.cliente_nome || '%' OR aloc.cliente_nome ILIKE '%' || c.nome || '%' THEN 2
        ELSE 3
      END
    LIMIT 1
  )
  WHERE aloc.cliente_id IS NULL
    AND upper(trim(aloc.cliente_nome)) NOT IN (
      'PRODUÇÃO',
      'SOBRA',
      'TESTE',
      'TESTE 02',
      'RAFAEL TESTE',
      'PRODUÇÃO / SACRIFÍCIO'
    );

  GET DIAGNOSTICS v_updated = ROW_COUNT;
  RAISE NOTICE 'Backfill concluido: % alocacoes vinculadas a clientes.', v_updated;
END $$;
