import { useState, useEffect, useCallback, useRef } from 'react'
import { useLocation } from 'react-router-dom'
import { format } from 'date-fns'
import { supabase } from '@/lib/supabase/client'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Trash2, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

export interface KanbanColumn {
  id: string
  title: string
}

const ALL_STAGES = [
  { id: 'iniciar', title: 'Iniciar' },
  { id: 'medida_fina', title: 'Medida Fina' },
  { id: 'reuniao_analise', title: 'Reunião de Análise' },
  { id: 'caderno_tecnico', title: 'Caderno Técnico' },
  { id: 'lista_materiais', title: 'Lista de Materiais' },
  { id: 'aguardando_plano_corte', title: 'Aguardando Plano de Corte' },
  { id: 'router', title: 'Router' },
  { id: 'coladeira', title: 'Coladeira' },
  { id: 'bancada', title: 'Bancada' },
  { id: 'embalagem', title: 'Embalagem' },
  { id: 'transporte', title: 'Transporte' },
  { id: 'montagem', title: 'Montagem' },
  { id: 'concluido', title: 'Concluído' },
]

export function KanbanListView({
  searchQuery = '',
  columns = [],
  archiveFlag,
}: {
  searchQuery?: string
  columns?: KanbanColumn[]
  archiveFlag?: string
}) {
  const location = useLocation()
  const isMontagem = location.pathname.includes('/montagem')
  const isProducao = location.pathname.includes('/producao')
  const isAnaliseTecnica = location.pathname.includes('/analise-tecnica')

  const [cards, setCards] = useState<any[]>([])
  const [users, setUsers] = useState<any[]>([])
  const [montadores, setMontadores] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [page, setPage] = useState(0)
  const [hasMore, setHasMore] = useState(true)
  const PAGE_SIZE = 30
  const pageRef = useRef(0)

  useEffect(() => {
    pageRef.current = page
  }, [page])

  const columnsKey = JSON.stringify(columns)

  const fetchCards = useCallback(
    async (isLoadMore = false) => {
      if (isLoadMore) setIsLoadingMore(true)
      else setLoading(true)

      const currentPage = isLoadMore ? page + 1 : 0
      const from = currentPage * PAGE_SIZE
      const to = from + PAGE_SIZE - 1

      let query = supabase.from('produtos_servicos_projeto').select(
        `
        *,
        card_pai:produtos_servicos_projeto!card_pai_id(id, nome_produto),
        clientes(nome),
        formulario_comercial(nome_cliente, clientes(nome)),
        alocacao_montagem(montador_id, card_id)
      `,
        { count: 'exact' },
      )

      if (columns && columns.length > 0) {
        query = query.in(
          'status_analise',
          columns.map((c) => c.id),
        )
      }

      if (archiveFlag) {
        query = query.eq(archiveFlag as any, false)
      }

      query = query.order('criado_em', { ascending: false }).range(from, to)

      const { data, count, error } = await query

      if (error) {
        console.error('Erro ao buscar itens:', error)
        toast.error('Erro ao buscar itens')
      } else if (data) {
        if (isLoadMore) {
          setCards((prev) => {
            const newItems = data.filter((d) => !prev.some((p) => p.id === d.id))
            return [...prev, ...newItems]
          })
          setPage(currentPage)
        } else {
          setCards(data)
          setPage(0)
        }

        if (count !== null && to + 1 >= count) {
          setHasMore(false)
        } else if (data.length < PAGE_SIZE) {
          setHasMore(false)
        } else {
          setHasMore(true)
        }
      }
      setLoading(false)
      setIsLoadingMore(false)
    },
    [columnsKey, page],
  )

  const refreshCards = useCallback(async () => {
    const limit = (pageRef.current + 1) * PAGE_SIZE
    let query = supabase.from('produtos_servicos_projeto').select(`
        *,
        card_pai:produtos_servicos_projeto!card_pai_id(id, nome_produto),
        clientes(nome),
        formulario_comercial(nome_cliente, clientes(nome)),
        alocacao_montagem(montador_id, card_id)
      `)

    if (columns && columns.length > 0) {
      query = query.in(
        'status_analise',
        columns.map((c) => c.id),
      )
    }

    if (archiveFlag) {
      query = query.eq(archiveFlag as any, false)
    }

    const { data, error } = await query.order('criado_em', { ascending: false }).limit(limit)
    if (!error && data) {
      setCards(data)
    }
  }, [columnsKey])

  const fetchUsers = useCallback(async () => {
    const { data, error } = await supabase.from('users').select('id, nome').eq('status', true)
    if (error) {
      console.error('Erro ao buscar usuários:', error)
    } else if (data) {
      setUsers(data)
    }
  }, [])

  const fetchMontadores = useCallback(async () => {
    const { data, error } = await supabase
      .from('montadores')
      .select(
        'id, nome_completo, alocacao_montagem(card_id, produtos_servicos_projeto(cliente_id))',
      )

    if (!error && data) {
      setMontadores(data)
    }
  }, [])

  useEffect(() => {
    fetchCards()
    fetchUsers()
    if (isMontagem || isProducao) {
      fetchMontadores()
    }

    const handleUpdate = () => {
      refreshCards()
      if (isMontagem || isProducao) {
        fetchMontadores()
      }
    }
    window.addEventListener('kanban_updated', handleUpdate)
    return () => window.removeEventListener('kanban_updated', handleUpdate)
  }, [fetchCards, refreshCards, fetchUsers, fetchMontadores, isMontagem, isProducao])

  const updateStatus = async (id: string, status: string) => {
    const { error } = await supabase
      .from('produtos_servicos_projeto')
      .update({ status_analise: status })
      .eq('id', id)
    if (error) {
      toast.error('Erro ao atualizar status')
    } else {
      toast.success('Status atualizado')
      refreshCards()
      window.dispatchEvent(new Event('kanban_updated'))
    }
  }

  const updateAnalista = async (id: string, analista_id: string) => {
    const val = analista_id === 'unassigned' ? null : analista_id
    const { error } = await supabase
      .from('produtos_servicos_projeto')
      .update({ analista_id: val })
      .eq('id', id)
    if (error) {
      toast.error('Erro ao atualizar responsável')
    } else {
      toast.success('Responsável atualizado')
      refreshCards()
      window.dispatchEvent(new Event('kanban_updated'))
    }
  }

  const deleteCard = async (id: string) => {
    if (!confirm('Deseja realmente excluir este item?')) return
    const { error } = await supabase.from('produtos_servicos_projeto').delete().eq('id', id)
    if (error) {
      toast.error('Erro ao excluir')
    } else {
      toast.success('Item excluído')
      refreshCards()
      window.dispatchEvent(new Event('kanban_updated'))
    }
  }

  const getClienteNome = (card: any) => {
    if (!card) return null
    const nome = Array.isArray(card?.clientes) ? card.clientes[0]?.nome : card?.clientes?.nome
    if (nome) return nome

    if (card?.formulario_comercial) {
      const form = Array.isArray(card.formulario_comercial)
        ? card.formulario_comercial[0]
        : card.formulario_comercial
      const formClienteNome = Array.isArray(form?.clientes)
        ? form.clientes[0]?.nome
        : form?.clientes?.nome
      if (formClienteNome) return formClienteNome
      if (form?.nome_cliente) return form.nome_cliente
    }

    return null
  }

  const filtered = (cards ?? []).filter((c) => {
    if (!c) return false
    if (columns && columns.length > 0) {
      const validColumn = columns.some((col) => col.id === c?.status_analise)
      if (!validColumn) return false
    }

    if (!searchQuery) return true
    const q = searchQuery.toLowerCase()
    const clienteNome = getClienteNome(c)
    return (
      c?.nome_produto?.toLowerCase().includes(q) ||
      c?.codigo_rastreio?.toLowerCase().includes(q) ||
      clienteNome?.toLowerCase().includes(q)
    )
  })

  if (loading && cards.length === 0) {
    return (
      <div className="p-8 text-center text-muted-foreground font-medium">Carregando itens...</div>
    )
  }

  return (
    <div className="p-4">
      <div className="bg-card rounded-md shadow-sm border border-border overflow-hidden">
        <Table>
          <TableHeader className="bg-card">
            <TableRow className="hover:bg-card border-border">
              {isAnaliseTecnica ? (
                <TableHead className="text-white font-semibold">Identificação</TableHead>
              ) : (
                <>
                  <TableHead className="text-white font-semibold whitespace-nowrap">
                    Codigo
                  </TableHead>
                  <TableHead className="text-white font-semibold">Cliente</TableHead>
                  <TableHead className="text-white font-semibold">Ambiente</TableHead>
                </>
              )}
              <TableHead className="text-white font-semibold whitespace-nowrap">data</TableHead>
              <TableHead className="text-white font-semibold w-[180px]">Status</TableHead>
              {isMontagem ? (
                <TableHead className="text-white font-semibold w-[200px]">equipe alocada</TableHead>
              ) : isProducao ? (
                <>
                  <TableHead className="text-white font-semibold w-[180px]">responsável</TableHead>
                  <TableHead className="text-white font-semibold w-[180px]">
                    equipe alocada
                  </TableHead>
                </>
              ) : (
                <TableHead className="text-white font-semibold w-[180px]">responsável</TableHead>
              )}
              <TableHead className="text-white font-semibold text-right w-[80px]">
                excluir
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={isAnaliseTecnica ? 5 : isProducao ? 8 : 7}
                  className="text-center py-8 text-muted-foreground"
                >
                  {' '}
                  Nenhum item encontrado.
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((card) => {
                const clienteNome = getClienteNome(card)
                const isSubcard = !!card?.card_pai_id
                const parentName = card?.card_pai?.nome_produto
                return (
                  <TableRow
                    key={card.id}
                    className="bg-card hover:bg-muted/50 text-card-foreground border-b border-border transition-colors"
                  >
                    {isAnaliseTecnica ? (
                      <TableCell className="font-medium w-full max-w-0">
                        <div className="flex items-center gap-3 text-sm">
                          <span className="whitespace-nowrap shrink-0 text-muted-foreground">
                            {card?.codigo_rastreio || '-'}
                          </span>
                          <span className="text-muted-foreground shrink-0">|</span>
                          <span className="truncate font-semibold text-card-foreground">
                            {clienteNome || 'Avulso'}
                          </span>
                          <span className="text-muted-foreground shrink-0">|</span>
                          <span className="truncate text-muted-foreground">
                            {card?.nome_produto ?? 'Sem nome'}
                          </span>
                        </div>
                      </TableCell>
                    ) : (
                      <>
                        <TableCell className="font-medium whitespace-nowrap text-card-foreground">
                          {card?.codigo_rastreio || '-'}
                        </TableCell>
                        <TableCell className="font-medium text-card-foreground">
                          {clienteNome || 'Avulso'}
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col gap-0.5">
                            <span className="font-medium">{card?.nome_produto ?? 'Sem nome'}</span>
                            {isSubcard && (
                              <span className="text-[10px] text-primary">
                                ↳ {parentName || 'Card pai'}
                              </span>
                            )}
                          </div>
                        </TableCell>
                      </>
                    )}
                    <TableCell className="whitespace-nowrap">
                      {card?.criado_em ? format(new Date(card.criado_em), 'dd/MM/yyyy') : '-'}
                    </TableCell>
                    <TableCell>
                      <Select
                        value={card?.status_analise || 'iniciar'}
                        onValueChange={(val) => card?.id && updateStatus(card.id, val)}
                      >
                        <SelectTrigger className="w-full h-8 bg-background text-foreground border-input focus:ring-ring">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {(columns && columns.length > 0 ? columns : ALL_STAGES).map((col) => (
                            <SelectItem key={col.id} value={col.id}>
                              {col.title}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    {isMontagem ? (
                      <TableCell>
                        {Array.isArray(card?.alocacao_montagem) &&
                        card.alocacao_montagem.filter(Boolean).length > 0
                          ? card.alocacao_montagem
                              .filter(Boolean)
                              .map((am: any) => {
                                if (am?.pessoa_nome) return am.pessoa_nome
                                const m = Array.isArray(montadores)
                                  ? montadores.find((m) => m?.id === am?.montador_id)
                                  : null
                                return m?.nome_completo || null
                              })
                              .filter(Boolean)
                              .join(', ') || 'Não alocada'
                          : 'Não alocada'}
                      </TableCell>
                    ) : isProducao ? (
                      <>
                        <TableCell>
                          <Select
                            value={card?.analista_id || 'unassigned'}
                            onValueChange={(val) => card?.id && updateAnalista(card.id, val)}
                          >
                            <SelectTrigger className="w-full h-8 bg-background text-foreground border-input focus:ring-ring">
                              <SelectValue placeholder="Não atribuído" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="unassigned">Não atribuído</SelectItem>
                              {users.map((u) => (
                                <SelectItem key={u.id} value={u.id}>
                                  {u.nome}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell>
                          {Array.isArray(card?.alocacao_montagem) &&
                          card.alocacao_montagem.filter(Boolean).length > 0
                            ? card.alocacao_montagem
                                .filter(Boolean)
                                .map((am: any) => {
                                  if (am?.pessoa_nome) return am.pessoa_nome
                                  const m = Array.isArray(montadores)
                                    ? montadores.find((m) => m?.id === am?.montador_id)
                                    : null
                                  return m?.nome_completo || null
                                })
                                .filter(Boolean)
                                .join(', ') || 'Não alocada'
                            : 'Não alocada'}
                        </TableCell>
                      </>
                    ) : (
                      <TableCell>
                        <Select
                          value={card?.analista_id || 'unassigned'}
                          onValueChange={(val) => card?.id && updateAnalista(card.id, val)}
                        >
                          <SelectTrigger className="w-full h-8 bg-background text-foreground border-input focus:ring-ring">
                            <SelectValue placeholder="Não atribuído" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="unassigned">Não atribuído</SelectItem>
                            {users.map((u) => (
                              <SelectItem key={u.id} value={u.id}>
                                {u.nome}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                    )}
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => deleteCard(card.id)}
                        className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                )
              })
            )}
          </TableBody>
        </Table>
        {hasMore && (
          <div className="p-4 flex justify-center border-t border-border">
            <Button
              variant="outline"
              onClick={() => fetchCards(true)}
              disabled={isLoadingMore}
              className="bg-card text-foreground border-input hover:bg-muted/50"
            >
              {isLoadingMore && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Carregar Mais
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
