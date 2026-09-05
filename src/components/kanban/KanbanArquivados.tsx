import { useState, useEffect } from 'react'
import {
  fetchProducaoArquivados,
  desarquivarProducao,
  fetchMontagemArquivados,
  desarquivarMontagem,
  fetchAnaliseArquivados,
  desarquivarAnalise,
  fetchAnaliseFormularioArquivados,
  desarquivarAnaliseFormulario,
} from '@/services/arquivamento'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { RotateCcw, UserMinus, Users } from 'lucide-react'
import { toast } from 'sonner'
import { format } from 'date-fns'
import { supabase } from '@/lib/supabase/client'
import { formatBriefName } from './alocados-helper'

interface KanbanArquivadosProps {
  archiveFlag: 'arquivado_producao' | 'arquivado_montagem' | 'arquivado_analise'
}

const STATUS_ANALISE_LABELS: Record<string, string> = {
  iniciar: 'Iniciar',
  em_andamento: 'Em Andamento',
  concluido: 'Concluído',
}

export function KanbanArquivados({ archiveFlag }: KanbanArquivadosProps) {
  const [items, setItems] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [restoringId, setRestoringId] = useState<string | null>(null)
  const [deallocatingId, setDeallocatingId] = useState<string | null>(null)

  const isProducao = archiveFlag === 'arquivado_producao'
  const isMontagem = archiveFlag === 'arquivado_montagem'
  const isAnalise = archiveFlag === 'arquivado_analise'
  const showEquipe = isProducao || isMontagem

  const fetchData = isProducao
    ? fetchProducaoArquivados
    : isAnalise
      ? fetchAnaliseFormularioArquivados
      : fetchMontagemArquivados
  const unarchiveFn = isProducao
    ? desarquivarProducao
    : isAnalise
      ? desarquivarAnaliseFormulario
      : desarquivarMontagem

  const loadData = async () => {
    try {
      setLoading(true)
      const data = await fetchData()
      setItems(data || [])
    } catch (e: any) {
      toast.error('Erro ao carregar arquivados: ' + e.message)
      setItems([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [archiveFlag])

  const handleUnarchive = async (id: string) => {
    setRestoringId(id)
    try {
      await unarchiveFn(id)
      toast.success('Item restaurado com sucesso!')
      loadData()
    } catch (e: any) {
      toast.error('Erro ao restaurar: ' + e.message)
    } finally {
      setRestoringId(null)
    }
  }

  const handleDesalocar = async (alocacaoId: string, nome?: string) => {
    setDeallocatingId(alocacaoId)
    try {
      const { error } = await supabase.from('alocacao_montagem').delete().eq('id', alocacaoId)
      if (error) throw error
      toast.success(nome ? `${nome} desalocado com sucesso!` : 'Profissional desalocado!')
      // Atualiza o estado local imediatamente e recarrega
      setItems((prev) =>
        prev.map((it) => {
          if (!Array.isArray(it?.alocacao_montagem)) return it
          return {
            ...it,
            alocacao_montagem: it.alocacao_montagem.filter((a: any) => a.id !== alocacaoId),
          }
        }),
      )
    } catch (e: any) {
      toast.error('Erro ao desalocar: ' + e.message)
    } finally {
      setDeallocatingId(null)
    }
  }

  const getClienteNome = (item: any) => {
    if (isAnalise) {
      if (item?.clientes?.nome) return item.clientes.nome
      if (item?.nome_cliente) return item.nome_cliente
      return 'Sem cliente'
    }
    if (item?.clientes?.nome) return item.clientes.nome
    if (item?.formulario_comercial?.nome_cliente) return item.formulario_comercial.nome_cliente
    if (item?.formulario_comercial?.clientes?.nome) return item.formulario_comercial.clientes.nome
    return 'Avulso'
  }

  const getCodigo = (item: any) => {
    if (isAnalise) return '-'
    return item?.codigo_rastreio || '-'
  }

  const getAmbiente = (item: any) => {
    if (isAnalise) {
      const valor = item?.valor_total || 0
      return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL',
      }).format(valor)
    }
    return item?.nome_produto ?? 'Sem nome'
  }

  const getStatus = (item: any) => {
    if (isAnalise) {
      const status = item?.status_analise_projeto
      return STATUS_ANALISE_LABELS[status] || status || '-'
    }
    return item?.status_analise || '-'
  }

  const getData = (item: any) => {
    const dateStr = item?.atualizado_em
    return dateStr ? format(new Date(dateStr), 'dd/MM/yyyy') : '-'
  }

  if (loading) {
    return <div className="p-8 text-center text-muted-foreground font-medium">Carregando...</div>
  }

  return (
    <div className="p-4 h-full overflow-auto">
      <div className="bg-card rounded-md shadow-sm border border-border overflow-hidden">
        <Table>
          <TableHeader className="bg-card">
            <TableRow className="hover:bg-card border-border">
              <TableHead className="text-white font-semibold">Código</TableHead>
              <TableHead className="text-white font-semibold">Cliente</TableHead>
              <TableHead className="text-white font-semibold">
                {isAnalise ? 'Valor Total' : 'Ambiente'}
              </TableHead>
              {showEquipe && (
                <TableHead className="text-white font-semibold">Equipe Alocada</TableHead>
              )}
              <TableHead className="text-white font-semibold">Status</TableHead>
              <TableHead className="text-white font-semibold">Data</TableHead>
              <TableHead className="text-white font-semibold text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={showEquipe ? 7 : 6}
                  className="text-center py-8 text-muted-foreground"
                >
                  Nenhum item arquivado.
                </TableCell>
              </TableRow>
            ) : (
              items.map((item) => {
                const alocacoes: any[] = Array.isArray(item?.alocacao_montagem)
                  ? item.alocacao_montagem.filter(Boolean)
                  : []

                return (
                  <TableRow
                    key={item.id}
                    className="bg-card hover:bg-muted/50 text-card-foreground border-b border-border"
                  >
                    <TableCell className="font-medium whitespace-nowrap">
                      {getCodigo(item)}
                    </TableCell>
                    <TableCell className="font-medium">{getClienteNome(item)}</TableCell>
                    <TableCell>{getAmbiente(item)}</TableCell>
                    {showEquipe && (
                      <TableCell>
                        {alocacoes.length === 0 ? (
                          <span className="text-xs text-muted-foreground">Nenhum</span>
                        ) : (
                          <div className="flex flex-wrap items-center gap-1.5 max-w-[280px]">
                            {alocacoes.map((aloc) => {
                              const nomeCompleto =
                                aloc.pessoa_nome || aloc.montadores?.nome_completo || 'Montador'
                              const nomeBreve = formatBriefName(nomeCompleto) || nomeCompleto
                              const isDeallocating = deallocatingId === aloc.id

                              return (
                                <span
                                  key={aloc.id}
                                  className="inline-flex items-center gap-1 text-[11px] leading-tight px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30"
                                  title={`Equipe alocada: ${nomeCompleto}`}
                                >
                                  <Users className="w-3 h-3 shrink-0" />
                                  <span className="truncate max-w-[120px]">{nomeBreve}</span>
                                  <button
                                    type="button"
                                    onClick={() => handleDesalocar(aloc.id, nomeBreve)}
                                    disabled={isDeallocating}
                                    title={`Desalocar ${nomeCompleto}`}
                                    aria-label={`Desalocar ${nomeCompleto}`}
                                    className="hover:bg-emerald-500/20 rounded p-0.5 text-muted-foreground hover:text-destructive transition-colors ml-0.5 disabled:opacity-50"
                                  >
                                    <UserMinus className="w-3 h-3" />
                                  </button>
                                </span>
                              )
                            })}
                          </div>
                        )}
                      </TableCell>
                    )}
                    <TableCell className="text-sm">{getStatus(item)}</TableCell>
                    <TableCell className="whitespace-nowrap text-sm">{getData(item)}</TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleUnarchive(item.id)}
                        disabled={restoringId === item.id}
                        className="text-primary hover:text-primary/80 hover:bg-primary/5"
                      >
                        <RotateCcw className="w-4 h-4 mr-1" />
                        Restaurar
                      </Button>
                    </TableCell>
                  </TableRow>
                )
              })
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
