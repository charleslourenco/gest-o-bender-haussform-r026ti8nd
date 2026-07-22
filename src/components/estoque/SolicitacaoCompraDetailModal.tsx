import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase/client'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { useToast } from '@/hooks/use-toast'
import { Check, X, ShoppingBag, ExternalLink, Clock, Loader2 } from 'lucide-react'

export type SolicitacaoDetalhe = {
  id: string
  usuario_id: string
  nome_item: string
  quantidade: number
  unidade: string
  link: string | null
  cor: string | null
  tamanho: string | null
  modelo: string | null
  motivo: string | null
  urgencia: string
  status: string
  criado_em: string
  cliente_id?: string | null
  usuario?: { nome: string } | null
  cliente?: { nome: string } | null
}

interface Props {
  solicitacao: SolicitacaoDetalhe | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onStatusChanged: () => void
}

export function SolicitacaoCompraDetailModal({
  solicitacao,
  open,
  onOpenChange,
  onStatusChanged,
}: Props) {
  const { toast } = useToast()
  const [updating, setUpdating] = useState<string | null>(null)

  useEffect(() => {
    setUpdating(null)
  }, [solicitacao?.id, open])

  if (!solicitacao) return null

  const handleUpdateStatus = async (newStatus: string) => {
    if (!solicitacao) return
    setUpdating(newStatus)
    try {
      const { error } = await supabase
        .from('solicitacoes_compra')
        .update({ status: newStatus })
        .eq('id', solicitacao.id)
      if (error) throw error
      toast({
        title: 'Status atualizado',
        description: `Solicitação marcada como ${newStatus}.`,
      })
      onStatusChanged()
      onOpenChange(false)
    } catch (err: any) {
      toast({
        title: 'Erro',
        description: err.message || 'Não foi possível atualizar o status.',
        variant: 'destructive',
      })
    } finally {
      setUpdating(null)
    }
  }

  const statusVariant = (status: string) => {
    if (status === 'Pendente') return 'outline'
    if (status === 'Aprovado') return 'default'
    if (status === 'Comprado') return 'secondary'
    return 'destructive'
  }

  const urgenciaVariant = (urgencia: string) => {
    if (['Alta', 'Urgente', 'Crítica'].includes(urgencia)) return 'destructive'
    return 'secondary'
  }

  const parseMotivo = (motivo: string | null) => {
    if (!motivo) return { motivo: '', observacoes: '' }
    const parts = motivo.split('\n\nObservações:')
    return {
      motivo: parts[0]?.trim() || motivo,
      observacoes: parts[1]?.trim() || '',
    }
  }

  const { motivo: motivoTexto, observacoes } = parseMotivo(solicitacao.motivo)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[560px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl">{solicitacao.nome_item}</DialogTitle>
          <DialogDescription>Detalhes da solicitação de compra</DialogDescription>
        </DialogHeader>

        <div className="flex items-center gap-2 flex-wrap mt-2">
          <Badge variant={statusVariant(solicitacao.status)}>
            {solicitacao.status === 'Pendente' && <Clock className="w-3 h-3 mr-1" />}
            {solicitacao.status}
          </Badge>
          <Badge variant={urgenciaVariant(solicitacao.urgencia)}>{solicitacao.urgencia}</Badge>
        </div>

        <Separator className="my-2" />

        <div className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
          <div>
            <span className="text-muted-foreground block">Solicitante</span>
            <span className="font-medium">{solicitacao.usuario?.nome || 'Desconhecido'}</span>
          </div>
          <div>
            <span className="text-muted-foreground block">Data da solicitação</span>
            <span className="font-medium">
              {new Date(solicitacao.criado_em).toLocaleString('pt-BR', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </span>
          </div>
          <div>
            <span className="text-muted-foreground block">Quantidade</span>
            <span className="font-medium">
              {solicitacao.quantidade} {solicitacao.unidade}
            </span>
          </div>
          <div>
            <span className="text-muted-foreground block">Unidade de medida</span>
            <span className="font-medium">{solicitacao.unidade}</span>
          </div>
          {solicitacao.cliente?.nome && (
            <div>
              <span className="text-muted-foreground block">Cliente</span>
              <span className="font-medium">{solicitacao.cliente.nome}</span>
            </div>
          )}
        </div>

        {motivoTexto && (
          <div className="text-sm">
            <span className="text-muted-foreground block mb-1">Motivo</span>
            <p className="bg-muted/50 rounded-md p-3">{motivoTexto}</p>
          </div>
        )}

        {observacoes && (
          <div className="text-sm">
            <span className="text-muted-foreground block mb-1">Observações</span>
            <p className="bg-muted/50 rounded-md p-3 italic">{observacoes}</p>
          </div>
        )}

        {solicitacao.link && (
          <div className="text-sm">
            <span className="text-muted-foreground block mb-1">Link de referência</span>
            <a
              href={solicitacao.link}
              target="_blank"
              rel="noreferrer"
              className="text-primary hover:underline inline-flex items-center gap-1"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              Acessar link
            </a>
          </div>
        )}

        <Separator className="my-2" />

        <div className="flex flex-wrap gap-2 justify-end">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleUpdateStatus('Rejeitado')}
            disabled={updating !== null || solicitacao.status === 'Rejeitado'}
          >
            {updating === 'Rejeitado' ? (
              <Loader2 className="w-4 h-4 mr-1 animate-spin" />
            ) : (
              <X className="w-4 h-4 mr-1 text-destructive" />
            )}
            Rejeitar
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => handleUpdateStatus('Comprado')}
            disabled={updating !== null || solicitacao.status === 'Comprado'}
          >
            {updating === 'Comprado' ? (
              <Loader2 className="w-4 h-4 mr-1 animate-spin" />
            ) : (
              <ShoppingBag className="w-4 h-4 mr-1" />
            )}
            Comprado
          </Button>
          <Button
            size="sm"
            onClick={() => handleUpdateStatus('Aprovado')}
            disabled={updating !== null || solicitacao.status === 'Aprovado'}
          >
            {updating === 'Aprovado' ? (
              <Loader2 className="w-4 h-4 mr-1 animate-spin" />
            ) : (
              <Check className="w-4 h-4 mr-1" />
            )}
            Aprovar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
