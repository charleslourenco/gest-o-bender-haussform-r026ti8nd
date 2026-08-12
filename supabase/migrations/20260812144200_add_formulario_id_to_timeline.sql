-- Add formulario_id column to timeline_eventos for sale-level filtering.
-- Also updates the get_timeline_eventos RPC to support filtering by sale with a date fallback
-- for legacy events that have no formulario_id.
-- Idempotent and non-destructive.

ALTER TABLE public.timeline_eventos
  ADD COLUMN IF NOT EXISTS formulario_id UUID REFERENCES public.formulario_comercial(id) ON DELETE SET NULL;

-- Recreate RLS policies to ensure authenticated users can read/write the new column
DROP POLICY IF EXISTS "timeline_eventos_select" ON public.timeline_eventos;
DROP POLICY IF EXISTS "timeline_eventos_insert" ON public.timeline_eventos;
DROP POLICY IF EXISTS "timeline_eventos_update" ON public.timeline_eventos;
DROP POLICY IF EXISTS "timeline_eventos_delete" ON public.timeline_eventos;

CREATE POLICY "timeline_eventos_select" ON public.timeline_eventos
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "timeline_eventos_insert" ON public.timeline_eventos
  FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "timeline_eventos_update" ON public.timeline_eventos
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "timeline_eventos_delete" ON public.timeline_eventos
  FOR DELETE TO authenticated USING (true);

-- Replace the RPC to support sale-level filtering.
-- When p_formulario_id is provided, returns only events linked to that sale OR legacy events
-- (formulario_id IS NULL) created after the sale's creation date (date fallback).
-- When p_formulario_id is NULL, returns all events for the client (unchanged behavior).
DROP FUNCTION IF EXISTS public.get_timeline_eventos(uuid);
DROP FUNCTION IF EXISTS public.get_timeline_eventos(uuid, uuid, timestamptz);

CREATE OR REPLACE FUNCTION public.get_timeline_eventos(
  p_cliente_id uuid,
  p_formulario_id uuid DEFAULT NULL,
  p_sale_created_at timestamptz DEFAULT NULL
)
RETURNS TABLE (
  id uuid,
  cliente_id uuid,
  usuario_nome text,
  acao text,
  icone text,
  criado_em timestamptz,
  nome_exibicao text,
  formulario_id uuid
)
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  IF p_formulario_id IS NOT NULL THEN
    RETURN QUERY
    SELECT
      t.id,
      t.cliente_id,
      t.usuario_nome,
      t.acao,
      t.icone,
      t.criado_em,
      COALESCE(u.nome, t.usuario_nome) AS nome_exibicao,
      t.formulario_id
    FROM public.timeline_eventos t
    LEFT JOIN public.users u ON u.email = t.usuario_nome
    WHERE t.cliente_id = p_cliente_id
      AND (
        t.formulario_id = p_formulario_id
        OR (
          t.formulario_id IS NULL
          AND (p_sale_created_at IS NULL OR t.criado_em >= p_sale_created_at)
        )
      )
    ORDER BY t.criado_em DESC;
  ELSE
    RETURN QUERY
    SELECT
      t.id,
      t.cliente_id,
      t.usuario_nome,
      t.acao,
      t.icone,
      t.criado_em,
      COALESCE(u.nome, t.usuario_nome) AS nome_exibicao,
      t.formulario_id
    FROM public.timeline_eventos t
    LEFT JOIN public.users u ON u.email = t.usuario_nome
    WHERE t.cliente_id = p_cliente_id
    ORDER BY t.criado_em DESC;
  END IF;
END;
$function$ LANGUAGE plpgsql;
