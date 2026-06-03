CREATE OR REPLACE FUNCTION public.notify_solicitacao_comprada()
RETURNS trigger AS $function$
BEGIN
  IF NEW.status = 'Comprado' AND OLD.status != 'Comprado' THEN
    INSERT INTO public.notificacoes (usuario_id, titulo, mensagem)
    VALUES (
      NEW.usuario_id,
      'Material Disponível!',
      'Sua solicitação do item "' || NEW.nome_item || '" foi marcada como Comprada/Disponível.'
    );
  END IF;
  RETURN NEW;
END;
$function$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_solicitacao_comprada ON public.solicitacoes_compra;
CREATE TRIGGER on_solicitacao_comprada
  AFTER UPDATE ON public.solicitacoes_compra
  FOR EACH ROW EXECUTE FUNCTION public.notify_solicitacao_comprada();
