CREATE OR REPLACE FUNCTION public.get_timeline_eventos(p_cliente_id uuid)
RETURNS TABLE (
  id uuid,
  cliente_id uuid,
  usuario_nome text,
  acao text,
  icone text,
  criado_em timestamptz,
  nome_exibicao text
)
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  RETURN QUERY
  SELECT
    t.id,
    t.cliente_id,
    t.usuario_nome,
    t.acao,
    t.icone,
    t.criado_em,
    COALESCE(u.nome, t.usuario_nome) AS nome_exibicao
  FROM public.timeline_eventos t
  LEFT JOIN public.users u ON u.email = t.usuario_nome
  WHERE t.cliente_id = p_cliente_id
  ORDER BY t.criado_em DESC;
END;
$function$ LANGUAGE plpgsql;
