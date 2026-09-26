-- Migration: Adicionar valor_unitario_congelado, valor_total_congelado e destino em estoque_alocacoes
-- Reversível: colunas novas com defaults seguros, backfill em lote idempotente

ALTER TABLE public.estoque_alocacoes 
  ADD COLUMN IF NOT EXISTS valor_unitario_congelado numeric(12,2),
  ADD COLUMN IF NOT EXISTS valor_total_congelado numeric(12,2),
  ADD COLUMN IF NOT EXISTS destino text DEFAULT 'cliente' CHECK (destino IN ('cliente', 'consumo_interno'));

-- Backfill idempotente corrigindo precedência com parênteses
UPDATE public.estoque_alocacoes ea
SET 
  valor_unitario_congelado = COALESCE(ei.valor_unitario, 0),
  valor_total_congelado = ROUND(COALESCE(ea.quantidade, 0) * COALESCE(ei.valor_unitario, 0), 2),
  destino = COALESCE(ea.destino, 'cliente')
FROM public.estoque_itens ei
WHERE ea.item_id = ei.id
  AND (ea.valor_unitario_congelado IS NULL OR ea.valor_total_congelado IS NULL);

-- Garantir destino 'cliente' caso restem linhas orfãs sem estoque_itens correspondente
UPDATE public.estoque_alocacoes
SET 
  valor_unitario_congelado = COALESCE(valor_unitario_congelado, 0),
  valor_total_congelado = COALESCE(valor_total_congelado, 0),
  destino = COALESCE(destino, 'cliente')
WHERE valor_unitario_congelado IS NULL OR valor_total_congelado IS NULL OR destino IS NULL;

-- Índice para acelerar filtros por destino
CREATE INDEX IF NOT EXISTS idx_estoque_alocacoes_destino ON public.estoque_alocacoes (destino);
