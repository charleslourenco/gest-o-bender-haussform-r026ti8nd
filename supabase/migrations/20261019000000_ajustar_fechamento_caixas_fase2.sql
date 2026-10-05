-- Migration: alinhamento de caixas virtuais com destino e estoque_alocacoes Fase 2,
-- normalização de estoque_movimentacoes e retrocorreção da caixa Davi - REPOSIÇÃO.

-- 1. Adicionar coluna destino em estoque_caixas com default 'consumo_interno'
ALTER TABLE public.estoque_caixas
  ADD COLUMN IF NOT EXISTS destino text NOT NULL DEFAULT 'consumo_interno';

-- Constraint para garantir valores válidos de destino em estoque_caixas
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chk_estoque_caixas_destino'
  ) THEN
    ALTER TABLE public.estoque_caixas
      ADD CONSTRAINT chk_estoque_caixas_destino
      CHECK (destino IN ('consumo_interno', 'cliente'));
  END IF;
END $$;

-- 2. Normalizar tipo em estoque_movimentacoes: 'Saída' -> 'saida', 'Entrada' -> 'entrada'
UPDATE public.estoque_movimentacoes
SET tipo = 'saida'
WHERE tipo IN ('Saída', 'SAIDA', 'Saida');

UPDATE public.estoque_movimentacoes
SET tipo = 'entrada'
WHERE tipo IN ('Entrada', 'ENTRADA');

-- 3. Retrocorrigir caixa 'Davi - REPOSIÇÃO' (id: 55be0961-0117-44e2-a757-314999d44b63)
-- Atualizar destino da caixa para consumo_interno (produção)
UPDATE public.estoque_caixas
SET destino = 'consumo_interno'
WHERE id = '55be0961-0117-44e2-a757-314999d44b63'::uuid;

-- Inserir as 4 alocações faltantes em estoque_alocacoes para a caixa Davi - REPOSIÇÃO
-- Respeitando a constraint chk_estoque_alocacoes_baixa_obrigatorios
-- (status='baixado', destino='consumo_interno', valor_total_congelado, valor_unitario_congelado)
DO $$
DECLARE
  v_caixa_id uuid := '55be0961-0117-44e2-a757-314999d44b63'::uuid;
  v_cliente_id uuid := '7d428c26-2e43-4e89-9d84-a7a02b67e661'::uuid;
  v_rec RECORD;
BEGIN
  FOR v_rec IN (
    SELECT 
      ci.item_id,
      ci.quantidade,
      it.nome AS item_nome,
      COALESCE(it.valor_unitario, 0) AS unit_preco
    FROM public.estoque_caixas_itens ci
    JOIN public.estoque_itens it ON it.id = ci.item_id
    WHERE ci.caixa_id = v_caixa_id
  ) LOOP
    -- Evitar duplicações caso a migration seja reexecutada
    IF NOT EXISTS (
      SELECT 1 FROM public.estoque_alocacoes
      WHERE item_id = v_rec.item_id
        AND cliente_nome = 'PRODUÇÃO (Davi - REPOSIÇÃO)'
        AND status = 'baixado'
    ) THEN
      INSERT INTO public.estoque_alocacoes (
        item_id,
        cliente_id,
        cliente_nome,
        quantidade,
        status,
        destino,
        valor_unitario_congelado,
        valor_total_congelado,
        baixado_em,
        baixado_por,
        criado_em
      ) VALUES (
        v_rec.item_id,
        v_cliente_id,
        'PRODUÇÃO (Davi - REPOSIÇÃO)',
        ROUND(v_rec.quantidade)::integer,
        'baixado',
        'consumo_interno',
        v_rec.unit_preco,
        ROUND((v_rec.quantidade * v_rec.unit_preco)::numeric, 2),
        '2026-10-05 21:40:48+00',
        'Fechamento de Caixa',
        '2026-10-05 21:39:12+00'
      );
    END IF;
  END LOOP;
END $$;
