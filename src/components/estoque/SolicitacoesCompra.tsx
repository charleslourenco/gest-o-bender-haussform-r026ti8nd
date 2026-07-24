import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { useToast } from '@/hooks/use-toast'
import { RefreshCw, Clock, ShoppingBag, Archive } from 'lucide-react'
import { SolicitacaoCompraDetailModal, SolicitacaoDetalhe } from './SolicitacaoCompraDetailModal'
import { SolicitacaoCompraDialog } from '@/components/SolicitacaoCompraDialog'

type Solicitacao = SolicitacaoDetalhe

export function SolicitacoesCompra({ onDataChange }: { onDataChange?: () => void }) {
  const [solicitacoes, setSolicitacoes] = useState<Solicitacao[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<Solicitacao | null>(null)
  const [detailOpen, setDetailOpen] = useState(false)
  const [mostrarArquivados, setMostrarArquivados] = useState(false)
  const { toast } = useToast()

  const fetchSolicitacoes = useCallback(async () => {
    setLoading(true)
    try {
      let query = supabase
        .from('solicitacoes_compra')
        .select(
          `
          *,
          usuario:users(nome),
          cliente:clientes(nome)
        `,
        )
        .order('criado_em', { ascending: false })

      query = query.eq('arquivado', mostrarArquivados)

      const { data, error } = await query

      if (error) throw error
      setSolicitacoes((data as Solicitacao[]) || [])
    } catch (err: any) {
      toast({
        title: 'Erro ao carregar',
        description: err.message || 'Houve um erro ao buscar as solicitações.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
      onDataChange?.()
    }
  }, [toast, mostrarArquivados, onDataChange])

  useEffect(() => {
    fetchSolicitacoes()
    const channel = supabase
      .channel('solicitacoes_compra_list')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'solicitacoes_compra' }, () =>
        fetchSolicitacoes(),
      )
      .subscribe()
    return () => {
      supabase.removeChannel(channel)
    }
  }, [fetchSolicitacoes])

  const handleRowClick = (s: Solicitacao) => {
    setSelected(s)
    setDetailOpen(true)
  }

  const pendingCount = solicitacoes.filter((s) => s.status === 'Pendente').length

  const renderTipoLabel = (s: Solicitacao) => {
    const tipo = s.tipo_solicitacao || 'Cliente'
    if (tipo === 'Produção') {
      return (
        <Badge className="bg-green-600 hover:bg-green-700 text-white border-none">
          Para Produção
        </Badge>
      )
    }
    if (tipo === 'Reposição') {
      return (
        <Badge className="bg-blue-600 hover:bg-blue-700 text-white border-none">
          Reposição de Estoque
        </Badge>
      )
    }
    return (
      <span className="text-sm text-muted-foreground truncate">
        {s.cliente?.nome || 'Sem cliente'}
      </span>
    )
  }

  return (
    <Card className="h-full flex flex-col animate-in fade-in duration-300 min-h-0">
      <CardHeader className="flex-none flex flex-row items-center justify-between">
        <div>
          <CardTitle className="flex items-center gap-2">
            Solicitações de Compra
            {pendingCount > 0 && (
              <Badge className="bg-orange-500 hover:bg-orange-600 text-white border-none animate-pulse">
                {pendingCount} pendente{pendingCount > 1 ? 's' : ''}
              </Badge>
            )}
          </CardTitle>
          <CardDescription>Clique em uma solicitação para editar todos os detalhes</CardDescription>
        </div>
        <div className="flex items-center gap-2">
          <SolicitacaoCompraDialog onCreated={fetchSolicitacoes} />
          <Button
            variant="outline"
            size="icon"
            onClick={fetchSolicitacoes}
            disabled={loading}
            title="Atualizar"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="flex-1 min-h-0 flex flex-col pb-6 gap-3">
        <div className="flex items-center gap-2 px-1">
          <Switch
            id="mostrar-arquivados"
            checked={mostrarArquivados}
            onCheckedChange={setMostrarArquivados}
          />
          <Label htmlFor="mostrar-arquivados" className="text-sm cursor-pointer">
            Mostrar arquivados
          </Label>
        </div>
        <ScrollArea className="flex-1 min-h-0 rounded-md border">
          {loading ? (
            <div className="p-4 space-y-3">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : solicitacoes.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-2">
              <ShoppingBag className="w-10 h-10 opacity-40" />
              <p>Nenhuma solicitação encontrada.</p>
            </div>
          ) : (
            <div className="divide-y">
              {solicitacoes.map((s) => {
                const isPending = s.status === 'Pendente'
                const isArchived = s.arquivado === true
                return (
                  <button
                    key={s.id}
                    onClick={() => handleRowClick(s)}
                    className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/60 group relative ${
                      isPending ? 'bg-orange-50/60 dark:bg-orange-950/20' : ''
                    } ${isArchived ? 'opacity-60' : ''}`}
                  >
                    {isPending && (
                      <span className="absolute left-0 top-0 bottom-0 w-1.5 bg-orange-500" />
                    )}
                    {isArchived && (
                      <span className="absolute left-0 top-0 bottom-0 w-1.5 bg-gray-400" />
                    )}
                    <div className="w-[90px] shrink-0 text-xs text-muted-foreground">
                      {new Date(s.criado_em).toLocaleDateString('pt-BR', {
                        day: '2-digit',
                        month: '2-digit',
                      })}
                    </div>
                    <div className="w-[140px] shrink-0 text-sm font-medium truncate">
                      {s.usuario?.nome || 'Desconhecido'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate flex items-center gap-1">
                        {s.nome_item}
                        {isArchived && <Archive className="w-3 h-3 text-muted-foreground" />}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        {s.quantidade} {s.unidade}
                      </p>
                    </div>
                    <div className="shrink-0 min-w-[140px] flex justify-end">
                      {renderTipoLabel(s)}
                    </div>
                    <div className="shrink-0">
                      <Badge
                        variant={
                          s.status === 'Pendente'
                            ? 'outline'
                            : s.status === 'Aprovado'
                              ? 'default'
                              : s.status === 'Comprado'
                                ? 'secondary'
                                : 'destructive'
                        }
                        className={
                          isPending
                            ? 'border-orange-400 text-orange-600 dark:text-orange-400 bg-orange-100/50 dark:bg-orange-950/40'
                            : ''
                        }
                      >
                        {s.status === 'Pendente' && <Clock className="w-3 h-3 mr-1" />}
                        {s.status}
                      </Badge>
                    </div>
                  </button>
                )
              })}
            </div>
          )}
        </ScrollArea>
      </CardContent>

      <SolicitacaoCompraDetailModal
        solicitacao={selected}
        open={detailOpen}
        onOpenChange={setDetailOpen}
        onStatusChanged={fetchSolicitacoes}
      />
    </Card>
  )
}
