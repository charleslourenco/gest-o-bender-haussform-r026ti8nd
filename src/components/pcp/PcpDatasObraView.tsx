import React, { useState, useMemo } from 'react'
import {
  Calendar,
  Building2,
  CalendarDays,
  Factory,
  Search,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Edit2,
  Check,
  X,
  ExternalLink,
  ShieldAlert,
  ArrowUpDown,
  RefreshCw,
} from 'lucide-react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import {
  PcpCardItem,
  updateCardDataPrometidaObra,
  getProntidaoTecnica,
} from '@/services/pcp-planejamento'
import { isAnaliseTecnicaConcluida, formatBRL } from '@/lib/pcp-capacity'
import { cn } from '@/lib/utils'

interface PcpDatasObraViewProps {
  cards: PcpCardItem[]
  onRefresh: () => void
  onOpenCardDrawer: (card: PcpCardItem) => void
}

interface ContratoObraRow {
  key: string
  clienteNome: string
  empreendimento: string
  cardPrincipal: PcpCardItem
  todosCards: PcpCardItem[]
  dataPrometida: string | null
  origemData: 'card' | 'comercial_min' | 'comercial_max' | 'comercial_prevista' | 'sem_data'
  semanaFabricaAtual: string | null
  statusProntidao: {
    status: 'pronto' | 'em_analise' | 'bloqueado' | 'inicial'
    label: string
    badgeClass: string
    isConcluida: boolean
    percentual: number
  }
  totalValor: number
}

/**
 * Extrai a data prometida da obra respeitando a hierarquia:
 * 1. data_prometida_montagem do card/projeto (quando preenchida/editada)
 * 2. formulário comercial -> datas.data_entrega_minima
 * 3. formulário comercial -> datas.data_entrega_maxima
 * 4. formulário comercial -> data_prevista_entrega (fallback)
 * 5. card.data_obra_montagem (fallback adicional)
 */
export function extrairDataPrometidaObra(card: PcpCardItem): {
  data: string | null
  origem: 'card' | 'comercial_min' | 'comercial_max' | 'comercial_prevista' | 'sem_data'
} {
  if (!card) return { data: null, origem: 'sem_data' }

  if (
    card.data_prometida_montagem &&
    typeof card.data_prometida_montagem === 'string' &&
    card.data_prometida_montagem.trim()
  ) {
    return { data: card.data_prometida_montagem.trim().slice(0, 10), origem: 'card' }
  }

  const form = card.formulario as any
  const datasJson = form?.datas

  if (datasJson && typeof datasJson === 'object') {
    const dMin = datasJson.data_entrega_minima
    if (dMin && typeof dMin === 'string' && dMin.trim()) {
      return { data: dMin.trim().slice(0, 10), origem: 'comercial_min' }
    }
    const dMax = datasJson.data_entrega_maxima
    if (dMax && typeof dMax === 'string' && dMax.trim()) {
      return { data: dMax.trim().slice(0, 10), origem: 'comercial_max' }
    }
  }

  const dPrev = form?.data_prevista_entrega
  if (dPrev && typeof dPrev === 'string' && dPrev.trim()) {
    return { data: dPrev.trim().slice(0, 10), origem: 'comercial_prevista' }
  }

  if (
    card.data_obra_montagem &&
    typeof card.data_obra_montagem === 'string' &&
    card.data_obra_montagem.trim()
  ) {
    return { data: card.data_obra_montagem.trim().slice(0, 10), origem: 'card' }
  }

  return { data: null, origem: 'sem_data' }
}

/**
 * Helper para obter texto do empreendimento do contrato
 */
export function getEmpreendimentoDisplay(card: PcpCardItem): string {
  if (!card) return 'Não informado'
  const form = card.formulario as any
  if (form?.obra_bairro || form?.obra_municipio) {
    return [form.obra_bairro, form.obra_municipio].filter(Boolean).join(' - ')
  }
  if (card.cliente?.endereco_obra) {
    return card.cliente.endereco_obra
  }
  if (card.cliente?.cidade) {
    return card.cliente.cidade
  }
  return 'Não informado'
}

/**
 * Helper para formatar data ISO YYYY-MM-DD para DD/MM/YYYY com segurança
 */
export function formatDataPtBr(dateStr: string | null | undefined): string {
  if (!dateStr || typeof dateStr !== 'string') return '-'
  const clean = dateStr.trim()
  if (!clean) return '-'
  const parts = clean.slice(0, 10).split('-')
  if (parts.length === 3 && parts[0].length === 4) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`
  }
  return clean
}

export const PcpDatasObraView: React.FC<PcpDatasObraViewProps> = ({
  cards,
  onRefresh,
  onOpenCardDrawer,
}) => {
  const [searchTerm, setSearchTerm] = useState('')
  const [editingCardId, setEditingCardId] = useState<string | null>(null)
  const [editDateValue, setEditDateValue] = useState<string>('')
  const [savingId, setSavingId] = useState<string | null>(null)
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc')

  // Agrupar os cards por Contrato (formulario_comercial_id) ou Cliente/Card Pai
  const rows: ContratoObraRow[] = useMemo(() => {
    if (!cards || !Array.isArray(cards)) return []

    // 1. Agrupar por formulário ou cliente
    const groups = new Map<string, PcpCardItem[]>()
    for (const c of cards) {
      if (!c) continue
      const groupKey =
        c.formulario_comercial_id || c.formulario?.id || c.card_pai_id || c.cliente_id || c.id

      if (!groups.has(groupKey)) {
        groups.set(groupKey, [])
      }
      groups.get(groupKey)!.push(c)
    }

    const result: ContratoObraRow[] = []

    for (const [key, groupCards] of groups.entries()) {
      // Priorizar o card pai se existir, senão o primeiro card
      const parentCard = groupCards.find((c) => !c.card_pai_id) || groupCards[0]

      const clienteNome =
        parentCard.cliente?.nome ||
        parentCard.formulario?.cliente?.nome ||
        parentCard.formulario?.nome_cliente ||
        'Cliente não identificado'

      const empreendimento = getEmpreendimentoDisplay(parentCard)
      const { data: dataPrometida, origem: origemData } = extrairDataPrometidaObra(parentCard)

      // Semana de fábrica atual do contrato (produção)
      const semanaFabricaAtual =
        parentCard.semana_planejada_producao ||
        groupCards.find((c) => c.semana_planejada_producao)?.semana_planejada_producao ||
        null

      // Prontidão Técnica: verificar status da Análise Técnica de todos os ambientes
      // Se todos estiverem 100% ou se o pai estiver liberado
      const concluidos = groupCards.filter((c) => isAnaliseTecnicaConcluida(c.status_analise))
      const pctProntidao =
        groupCards.length > 0 ? Math.round((concluidos.length / groupCards.length) * 100) : 0

      const prontidaoInfo = getProntidaoTecnica(parentCard)
      const isTotalmenteConcluido = pctProntidao === 100

      let prontLabel = prontidaoInfo.label
      let prontBadgeClass = prontidaoInfo.badgeClass
      if (isTotalmenteConcluido) {
        prontLabel = '100% Concluído (Pronto)'
        prontBadgeClass =
          'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-300'
      } else if (pctProntidao > 0) {
        prontLabel = `${pctProntidao}% Concluído`
        prontBadgeClass =
          'bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300 border-blue-300'
      }

      // Soma de valor sem dupla contagem (se houver filhos com valor, soma só filhos)
      const subsComValor = groupCards.filter(
        (c) => c.card_pai_id && (Number(c.valor_total) || 0) > 0,
      )
      let totalValor = 0
      if (subsComValor.length > 0) {
        totalValor = subsComValor.reduce((acc, c) => acc + (Number(c.valor_total) || 0), 0)
      } else {
        totalValor =
          Number(parentCard.valor_total) ||
          Number(parentCard.formulario?.valor_total) ||
          groupCards.reduce((acc, c) => acc + (Number(c.valor_total) || 0), 0)
      }

      result.push({
        key,
        clienteNome,
        empreendimento,
        cardPrincipal: parentCard,
        todosCards: groupCards,
        dataPrometida,
        origemData,
        semanaFabricaAtual,
        statusProntidao: {
          status: prontidaoInfo.status,
          label: prontLabel,
          badgeClass: prontBadgeClass,
          isConcluida: isTotalmenteConcluido,
          percentual: pctProntidao,
        },
        totalValor,
      })
    }

    // Ordenação pela Data de Montagem na Obra
    result.sort((a, b) => {
      const dateA = a.dataPrometida
      const dateB = b.dataPrometida

      if (dateA && dateB) {
        const cmp = dateA.localeCompare(dateB)
        return sortDirection === 'asc' ? cmp : -cmp
      }
      if (dateA && !dateB) return -1
      if (!dateA && dateB) return 1
      return a.clienteNome.localeCompare(b.clienteNome)
    })

    return result
  }, [cards, sortDirection])

  // Filtragem por busca
  const filteredRows = useMemo(() => {
    if (!searchTerm.trim()) return rows
    const term = searchTerm.toLowerCase().trim()
    return rows.filter((r) => {
      const cliMatch = r.clienteNome.toLowerCase().includes(term)
      const empMatch = r.empreendimento.toLowerCase().includes(term)
      const semMatch = (r.semanaFabricaAtual || '').toLowerCase().includes(term)
      const dataMatch = (r.dataPrometida || '').includes(term)
      return cliMatch || empMatch || semMatch || dataMatch
    })
  }, [rows, searchTerm])

  // Iniciar edição inline de data
  const handleStartEdit = (row: ContratoObraRow) => {
    setEditingCardId(row.cardPrincipal.id)
    setEditDateValue(row.dataPrometida || '')
  }

  // Cancelar edição
  const handleCancelEdit = () => {
    setEditingCardId(null)
    setEditDateValue('')
  }

  // Salvar nova data prometida na obra
  const handleSaveDate = async (row: ContratoObraRow) => {
    const cardId = row.cardPrincipal.id
    setSavingId(cardId)
    try {
      const novaData = editDateValue.trim() || null
      const res = await updateCardDataPrometidaObra(
        cardId,
        novaData,
        `Data da obra alterada via visão 'Datas da Obra' (${novaData || 'Sem data'})`,
      )

      toast.success(
        `Data da obra atualizada! Semana sugerida de produção: ${res.semanaSugeridaProducao || 'Não calculada'}`,
      )
      setEditingCardId(null)
      onRefresh()
    } catch (err: any) {
      toast.error('Erro ao salvar data da obra: ' + (err.message || 'Erro'))
    } finally {
      setSavingId(null)
    }
  }

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-background">
      {/* Topo / Barra de Ferramentas */}
      <div className="px-6 py-3 bg-card border-b border-border flex flex-wrap items-center justify-between gap-3 shrink-0 shadow-2xs">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary border border-primary/20">
            <Calendar className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-foreground leading-none">
              Cronograma de Datas da Obra
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Lista ordenada pela Data de Montagem na Obra com sincronização da semana fabril
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Campo de Busca */}
          <div className="relative w-64">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Buscar cliente, obra, semana..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="h-8 pl-8 text-xs bg-background"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground hover:text-foreground"
              >
                ✕
              </button>
            )}
          </div>

          {/* Botão Ordenação */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'))}
            className="h-8 px-2.5 text-xs gap-1"
            title="Inverter ordem das datas"
          >
            <ArrowUpDown className="w-3.5 h-3.5" />
            <span>{sortDirection === 'asc' ? 'Mais Próximas' : 'Mais Distantes'}</span>
          </Button>

          {/* Botão Atualizar */}
          <Button
            variant="ghost"
            size="icon"
            onClick={onRefresh}
            className="h-8 w-8 text-muted-foreground hover:text-foreground"
            title="Atualizar dados"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>

      {/* Conteúdo / Tabela Principal */}
      <div className="flex-1 overflow-auto p-4 bg-muted/15">
        <div className="bg-card rounded-xl border border-border shadow-xs overflow-hidden">
          <Table>
            <TableHeader className="bg-muted/40">
              <TableRow className="hover:bg-transparent">
                <TableHead className="font-bold text-xs text-foreground min-w-[220px]">
                  Nome do Cliente
                </TableHead>
                <TableHead className="font-bold text-xs text-foreground min-w-[200px]">
                  Empreendimento / Obra
                </TableHead>
                <TableHead className="font-bold text-xs text-foreground min-w-[210px]">
                  Data Prometida na Obra
                </TableHead>
                <TableHead className="font-bold text-xs text-foreground min-w-[160px] text-center">
                  Semana de Fábrica Atual
                </TableHead>
                <TableHead className="font-bold text-xs text-foreground min-w-[180px]">
                  Status de Prontidão
                </TableHead>
                <TableHead className="font-bold text-xs text-foreground min-w-[110px] text-right">
                  Valor Total
                </TableHead>
                <TableHead className="font-bold text-xs text-foreground text-center w-[90px]">
                  Ações
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredRows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-40 text-center text-muted-foreground">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <CalendarDays className="w-8 h-8 opacity-40 text-muted-foreground" />
                      <p className="text-sm font-semibold text-foreground">
                        {searchTerm
                          ? 'Nenhum contrato encontrado para a busca'
                          : 'Nenhum contrato no PCP'}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        As datas comerciais dos contratos serão refletidas automaticamente aqui.
                      </p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                filteredRows.map((row) => {
                  const isEditing = editingCardId === row.cardPrincipal.id
                  const isSaving = savingId === row.cardPrincipal.id

                  return (
                    <TableRow
                      key={row.key}
                      className="hover:bg-muted/30 transition-colors cursor-pointer"
                      onClick={() => onOpenCardDrawer(row.cardPrincipal)}
                    >
                      {/* 1. Nome do Cliente */}
                      <TableCell className="font-semibold text-xs text-foreground py-3">
                        <div className="flex flex-col">
                          <span className="font-bold text-foreground hover:text-primary transition-colors">
                            {row.clienteNome}
                          </span>
                          <span className="text-[10px] text-muted-foreground font-normal">
                            {row.todosCards.length > 1
                              ? `${row.todosCards.length} ambientes cadastrados`
                              : row.cardPrincipal.nome_produto}
                          </span>
                        </div>
                      </TableCell>

                      {/* 2. Empreendimento */}
                      <TableCell className="text-xs text-muted-foreground py-3">
                        <div className="flex items-center gap-1.5">
                          <Building2 className="w-3.5 h-3.5 text-muted-foreground/70 shrink-0" />
                          <span className="truncate max-w-[220px]" title={row.empreendimento}>
                            {row.empreendimento}
                          </span>
                        </div>
                      </TableCell>

                      {/* 3. Data Prometida na Obra (com edição inline) */}
                      <TableCell
                        className="text-xs py-3"
                        onClick={(e) => {
                          // Se estiver editando, não abre o drawer
                          if (isEditing) e.stopPropagation()
                        }}
                      >
                        {isEditing ? (
                          <div
                            className="flex items-center gap-1.5"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <Input
                              type="date"
                              value={editDateValue}
                              onChange={(e) => setEditDateValue(e.target.value)}
                              className="h-7 text-xs w-36 bg-background"
                              autoFocus
                            />
                            <Button
                              size="icon"
                              variant="default"
                              className="h-7 w-7 bg-emerald-600 hover:bg-emerald-700 text-white"
                              disabled={isSaving}
                              onClick={() => handleSaveDate(row)}
                              title="Salvar e recalcular semana sugerida"
                            >
                              <Check className="w-3.5 h-3.5" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-7 w-7 text-muted-foreground"
                              onClick={handleCancelEdit}
                              title="Cancelar"
                            >
                              <X className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        ) : (
                          <div className="flex items-center justify-between gap-2 group/date">
                            <div className="flex items-center gap-1.5">
                              <CalendarDays className="w-3.5 h-3.5 text-primary shrink-0" />
                              <span
                                className={cn(
                                  'font-semibold',
                                  row.dataPrometida
                                    ? 'text-foreground'
                                    : 'text-muted-foreground italic',
                                )}
                              >
                                {row.dataPrometida
                                  ? formatDataPtBr(row.dataPrometida)
                                  : 'Não informada'}
                              </span>

                              {/* Origem da data */}
                              {row.origemData !== 'sem_data' && (
                                <Badge
                                  variant="outline"
                                  className={cn(
                                    'text-[9px] px-1 py-0 h-4 border-dashed',
                                    row.origemData === 'card'
                                      ? 'border-emerald-300 text-emerald-700 dark:text-emerald-400 bg-emerald-500/10'
                                      : 'border-blue-300 text-blue-700 dark:text-blue-400 bg-blue-500/10',
                                  )}
                                  title={
                                    row.origemData === 'card'
                                      ? 'Data personalizada editada no PCP'
                                      : 'Data lida do formulário comercial'
                                  }
                                >
                                  {row.origemData === 'card' ? 'PCP' : 'Comercial'}
                                </Badge>
                              )}
                            </div>

                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6 opacity-40 group-hover/date:opacity-100 hover:bg-muted text-muted-foreground hover:text-foreground transition-all"
                              onClick={(e) => {
                                e.stopPropagation()
                                handleStartEdit(row)
                              }}
                              title="Editar Data da Obra"
                            >
                              <Edit2 className="w-3 h-3" />
                            </Button>
                          </div>
                        )}
                      </TableCell>

                      {/* 4. Semana de Fábrica Atual */}
                      <TableCell className="text-center py-3">
                        {row.semanaFabricaAtual ? (
                          <Badge
                            variant="secondary"
                            className="font-mono font-bold text-xs px-2 py-0.5 bg-primary/10 text-primary border border-primary/20 shadow-2xs"
                          >
                            <Factory className="w-3 h-3 mr-1" />
                            {row.semanaFabricaAtual}
                          </Badge>
                        ) : (
                          <Badge
                            variant="outline"
                            className="text-[10px] text-muted-foreground border-dashed bg-muted/30"
                          >
                            Não agendada
                          </Badge>
                        )}
                      </TableCell>

                      {/* 5. Status de Prontidão (Análise Técnica) */}
                      <TableCell className="py-3">
                        <div className="flex items-center gap-1.5">
                          {row.statusProntidao.isConcluida ? (
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                          ) : row.statusProntidao.status === 'bloqueado' ? (
                            <ShieldAlert className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                          ) : (
                            <Clock className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                          )}
                          <Badge
                            variant="outline"
                            className={cn(
                              'text-[10px] font-semibold px-2 py-0.5 border shadow-2xs',
                              row.statusProntidao.badgeClass,
                            )}
                          >
                            {row.statusProntidao.label}
                          </Badge>
                        </div>
                      </TableCell>

                      {/* 6. Valor Total */}
                      <TableCell className="text-right font-medium text-xs text-foreground py-3">
                        {row.totalValor > 0 ? (
                          <span className="font-bold text-foreground">
                            {formatBRL(row.totalValor)}
                          </span>
                        ) : (
                          <span className="text-muted-foreground/60 text-[11px]">-</span>
                        )}
                      </TableCell>

                      {/* 7. Ações */}
                      <TableCell className="text-center py-3" onClick={(e) => e.stopPropagation()}>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onOpenCardDrawer(row.cardPrincipal)}
                          className="h-7 px-2 text-[11px] gap-1 text-primary hover:text-primary hover:bg-primary/10"
                          title="Abrir ficha do card"
                        >
                          <ExternalLink className="w-3 h-3" />
                          <span>Ficha</span>
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
    </div>
  )
}
