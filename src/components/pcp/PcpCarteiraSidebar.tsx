import React, { useState, useMemo } from 'react'
import { PcpCardItem, PcpLinhaOperacao } from '@/services/pcp-planejamento'
import { formatBRL } from '@/lib/pcp-capacity'
import { isCardParaAgendar } from '@/lib/pcp-carteira'
import { safeFormatDatePtBr } from '@/lib/date-utils'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Briefcase,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Search,
  Layers,
  GripVertical,
  Building2,
  FolderOpen,
  FolderClosed,
  Undo2,
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface PcpCarteiraSidebarProps {
  cards: PcpCardItem[]
  collapsed: boolean
  modo?: 'anual' | 'mensal' | 'semanal' | 'diario'
  onToggleCollapsed: () => void
  onCardClick: (card: PcpCardItem) => void
  onDropToCarteira?: (
    cardId: string,
    linha: PcpLinhaOperacao,
    isParent: boolean,
    subcardIds?: string[],
  ) => Promise<void> | void
}

interface ParentHierarchyItem {
  id: string // parent.id ou chave virtual 'virtual-${clienteKey}-${formKey}'
  isVirtual: boolean
  parent?: PcpCardItem
  subcards: PcpCardItem[]
  // Subcards que estão pendentes na carteira neste modo
  pendingSubcards: PcpCardItem[]
  isParentPending: boolean
  totalSubcardsCount: number
  totalContratoValor: number
  clientName: string
  empreendimento: string
  cor_vinculo?: string | null
  codigo_rastreio?: string | null
  status_analise?: string | null
  // Dados de prazo e urgência (Spec Etapa 4)
  dataPrometidaEntrega?: string | null
  diasParaEntrega?: number | null // null se sem data
  diasDesdeCriacao?: number // dias desde created_at / criado_em
  agingStatus?: 'vermelho' | 'amarelo' | 'verde' | 'sem_data'
}

/**
 * Extrai a data prometida de entrega do contrato a partir do card/formulário.
 * Prioriza data_prevista_entrega do formulário comercial ou datas.data_entrega_maxima.
 */
function extrairDataPrometidaEntrega(card?: PcpCardItem): string | null {
  if (!card) return null
  const form = card.formulario as any
  const dPrevista = form?.data_prevista_entrega
  if (dPrevista && typeof dPrevista === 'string' && dPrevista.trim()) return dPrevista.trim()
  const dMax = form?.datas?.data_entrega_maxima
  if (dMax && typeof dMax === 'string' && dMax.trim()) return dMax.trim()
  const dMin = form?.datas?.data_entrega_minima
  if (dMin && typeof dMin === 'string' && dMin.trim()) return dMin.trim()
  const dObra = card.data_obra_montagem
  if (dObra && typeof dObra === 'string' && dObra.trim()) return dObra.trim()
  return null
}

/**
 * Calcula a diferença em dias entre duas datas (target - hoje).
 */
function calcularDiasAteData(dateStr: string | null | undefined): number | null {
  if (!dateStr || typeof dateStr !== 'string') return null
  const cleanStr = dateStr.trim()
  if (!cleanStr) return null
  try {
    const target = new Date(cleanStr.length === 10 ? `${cleanStr}T12:00:00` : cleanStr)
    if (isNaN(target.getTime())) return null
    const hoje = new Date()
    const hojeMeioDia = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate(), 12, 0, 0)
    const diffMs = target.getTime() - hojeMeioDia.getTime()
    return Math.ceil(diffMs / (1000 * 60 * 60 * 24))
  } catch {
    return null
  }
}

/**
 * Calcula dias decorridos desde a criação do card até hoje.
 */
function calcularDiasDesdeCriacao(criadoEmStr?: string): number {
  if (!criadoEmStr || typeof criadoEmStr !== 'string') return 0
  try {
    const criado = new Date(criadoEmStr)
    if (isNaN(criado.getTime())) return 0
    const hoje = new Date()
    const diffMs = hoje.getTime() - criado.getTime()
    return Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)))
  } catch {
    return 0
  }
}

/**
 * Semáforo visual de aging no card pai:
 * - 🔴 Badge Vermelho = menos de 30 dias para a data de entrega e ainda sem semana agendada
 * - 🟡 Badge Amarelo = entre 30 e 60 dias
 * - 🟢 Badge Verde = mais de 60 dias
 */
function obterAgingStatus(
  diasParaEntrega: number | null,
  temSemanaAgendada: boolean,
): 'vermelho' | 'amarelo' | 'verde' | 'sem_data' {
  if (diasParaEntrega === null) return 'sem_data'
  if (temSemanaAgendada) {
    if (diasParaEntrega < 30) return 'vermelho'
    if (diasParaEntrega <= 60) return 'amarelo'
    return 'verde'
  }
  if (diasParaEntrega < 30) return 'vermelho'
  if (diasParaEntrega <= 60) return 'amarelo'
  return 'verde'
}

export const PcpCarteiraSidebar: React.FC<PcpCarteiraSidebarProps> = ({
  cards,
  collapsed,
  modo = 'anual',
  onToggleCollapsed,
  onCardClick,
  onDropToCarteira,
}) => {
  const [search, setSearch] = useState('')
  const [filterType, setFilterType] = useState<'todos' | 'com_ambientes' | 'isolados'>('todos')
  const [expandedParents, setExpandedParents] = useState<Record<string, boolean>>({})
  const [isDragOverCollapsed, setIsDragOverCollapsed] = useState(false)
  const [isDragOverSidebar, setIsDragOverSidebar] = useState(false)

  // Alias para manter compatibilidade com verificações internas
  const isCardPending = isCardParaAgendar

  // Helper para obter nome do cliente de um card
  const getCardClientName = (c: PcpCardItem): string => {
    return (
      c.cliente?.nome ||
      c.formulario?.cliente?.nome ||
      c.formulario?.nome_cliente ||
      'Cliente não informado'
    )
  }

  // Helper para obter empreendimento / obra de um card
  const getCardEmpreendimento = (c: PcpCardItem): string => {
    const form = c.formulario as any
    if (form?.obra_bairro || form?.obra_municipio) {
      return [form.obra_bairro, form.obra_municipio].filter(Boolean).join(' - ')
    }
    return c.cliente?.endereco_obra || c.cliente?.cidade || ''
  }

  // Agrupamento hierárquico Nível 1 (Card Pai real OU Pai Virtual por Cliente/Contrato) + Nível 2 (Subcards / Ambientes)
  const hierarchyList: ParentHierarchyItem[] = useMemo(() => {
    if (!cards || !Array.isArray(cards)) return []

    // Conjunto de todos os IDs presentes na lista
    const cardIdSet = new Set<string>()
    for (const c of cards) {
      if (c?.id) cardIdSet.add(c.id)
    }

    // 1. Identificar todos os subcards explícitos (com card_pai_id)
    const subcardsByParentId = new Map<string, PcpCardItem[]>()
    // Set de pais que possuem filhos e existem na lista
    const parentsWithRealChildren = new Set<string>()

    for (const c of cards) {
      if (!c) continue
      if (c.card_pai_id && cardIdSet.has(c.card_pai_id)) {
        parentsWithRealChildren.add(c.card_pai_id)
        if (!subcardsByParentId.has(c.card_pai_id)) {
          subcardsByParentId.set(c.card_pai_id, [])
        }
        subcardsByParentId.get(c.card_pai_id)!.push(c)
      }
    }

    // 2. Separar cards em dois grupos:
    // a) Pais reais (que possuem filhos apontando para eles via card_pai_id existente)
    // b) Cards sem card_pai_id OU com card_pai_id órfão (cujo pai não está na lista)
    const realParents: PcpCardItem[] = []
    const unparentedCards: PcpCardItem[] = []

    for (const c of cards) {
      if (!c) continue
      if (parentsWithRealChildren.has(c.id)) {
        realParents.push(c)
      } else if (!c.card_pai_id || !cardIdSet.has(c.card_pai_id)) {
        unparentedCards.push(c)
      }
    }

    const list: ParentHierarchyItem[] = []

    // 3. Processar pais reais (com card_pai_id existente no banco)
    for (const parent of realParents) {
      if (!parent) continue
      const allSubs = (subcardsByParentId.get(parent.id) || []).filter(Boolean)
      const pendingSubs = allSubs.filter((s) => isCardPending(s))
      const parentPending = isCardPending(parent)

      if (parentPending || pendingSubs.length > 0) {
        const clientName = getCardClientName(parent)
        const empreendimento = getCardEmpreendimento(parent)

        // Regra de agregação de valor sem dupla contagem:
        // Se houver filhos com valor > 0, soma só os filhos valorados; se nenhum tiver valor > 0, soma o próprio pai
        const subsComValor = allSubs.filter((s) => (Number(s.valor_total) || 0) > 0)
        let totalContratoValor = 0
        if (subsComValor.length > 0) {
          totalContratoValor = subsComValor.reduce(
            (acc, s) => acc + (Number(s.valor_total) || 0),
            0,
          )
        } else {
          totalContratoValor =
            Number(parent.valor_total) || Number(parent.formulario?.valor_total) || 0
        }

        const dataEntrega = extrairDataPrometidaEntrega(parent)
        const diasParaEntrega = dataEntrega ? calcularDiasAteData(dataEntrega) : null
        const diasDesdeCriacao = calcularDiasDesdeCriacao(parent.criado_em)
        const temSemana = Boolean(
          typeof parent.semana_planejada_producao === 'string' &&
          parent.semana_planejada_producao.trim() !== '',
        )
        const aging = obterAgingStatus(diasParaEntrega, temSemana)

        list.push({
          id: parent.id,
          isVirtual: false,
          parent,
          subcards: allSubs,
          pendingSubcards: pendingSubs,
          isParentPending: parentPending,
          totalSubcardsCount: allSubs.length,
          totalContratoValor,
          clientName,
          empreendimento,
          cor_vinculo: parent.cor_vinculo,
          codigo_rastreio: parent.codigo_rastreio,
          status_analise: parent.status_analise,
          dataPrometidaEntrega: dataEntrega,
          diasParaEntrega,
          diasDesdeCriacao,
          agingStatus: aging,
        })
      }
    }

    // 4. Processar cards sem card_pai_id agrupando VIRTUALMENTE por Cliente + Contrato (formulario_comercial_id)
    // Chave de agrupamento: cliente + formulario_comercial_id
    const virtualGroups = new Map<string, PcpCardItem[]>()
    for (const c of unparentedCards) {
      const cliKey = c.cliente_id || (c.cliente?.nome ? c.cliente.nome.trim().toLowerCase() : '')
      const formKey = c.formulario_comercial_id || c.formulario?.id || 'sem_form'
      const groupKey = `${cliKey}__${formKey}`

      if (!virtualGroups.has(groupKey)) {
        virtualGroups.set(groupKey, [])
      }
      virtualGroups.get(groupKey)!.push(c)
    }

    for (const [groupKey, groupCards] of virtualGroups.entries()) {
      const validGroup = groupCards.filter(Boolean)
      const pendingCards = validGroup.filter((c) => isCardPending(c))
      if (pendingCards.length === 0) continue

      const first = validGroup[0]
      if (!first) continue
      const clientName = getCardClientName(first)
      const empreendimento = getCardEmpreendimento(first)

      if (validGroup.length > 1) {
        // Multiplos ambientes do mesmo cliente/contrato: AGRUPAR EM CARD PAI VIRTUAL
        const totalContratoValor = validGroup.reduce(
          (acc, c) => acc + (Number(c.valor_total) || 0),
          0,
        )

        const dataEntrega = extrairDataPrometidaEntrega(first)
        const diasParaEntrega = dataEntrega ? calcularDiasAteData(dataEntrega) : null
        const diasDesdeCriacao = calcularDiasDesdeCriacao(first.criado_em)
        const temSemana = Boolean(
          typeof first.semana_planejada_producao === 'string' &&
          first.semana_planejada_producao.trim() !== '',
        )
        const aging = obterAgingStatus(diasParaEntrega, temSemana)

        list.push({
          id: `virtual-${groupKey}`,
          isVirtual: true,
          parent: first,
          subcards: validGroup,
          pendingSubcards: pendingCards,
          isParentPending: true,
          totalSubcardsCount: validGroup.length,
          totalContratoValor,
          clientName,
          empreendimento,
          cor_vinculo: first.cor_vinculo,
          codigo_rastreio: first.formulario_comercial_id ? first.codigo_rastreio : null,
          status_analise: first.status_analise,
          dataPrometidaEntrega: dataEntrega,
          diasParaEntrega,
          diasDesdeCriacao,
          agingStatus: aging,
        })
      } else {
        // Card isolado único (sem outros ambientes no mesmo cliente/contrato)
        const totalContratoValor = Number(first.valor_total) || 0
        const dataEntrega = extrairDataPrometidaEntrega(first)
        const diasParaEntrega = dataEntrega ? calcularDiasAteData(dataEntrega) : null
        const diasDesdeCriacao = calcularDiasDesdeCriacao(first.criado_em)
        const temSemana = Boolean(
          typeof first.semana_planejada_producao === 'string' &&
          first.semana_planejada_producao.trim() !== '',
        )
        const aging = obterAgingStatus(diasParaEntrega, temSemana)

        list.push({
          id: first.id,
          isVirtual: false,
          parent: first,
          subcards: [],
          pendingSubcards: [],
          isParentPending: true,
          totalSubcardsCount: 0,
          totalContratoValor,
          clientName,
          empreendimento,
          cor_vinculo: first.cor_vinculo,
          codigo_rastreio: first.codigo_rastreio,
          status_analise: first.status_analise,
          dataPrometidaEntrega: dataEntrega,
          diasParaEntrega,
          diasDesdeCriacao,
          agingStatus: aging,
        })
      }
    }

    // ORDENAÇÃO AUTOMÁTICA POR URGÊNCIA (Spec Etapa 4):
    // Prioritariamente pela Data Prometida de Entrega no Contrato (mais urgente no topo).
    // Cards com data definida vêm antes dos sem data; menor diasParaEntrega (mais próximo ou atrasado) no topo.
    list.sort((a, b) => {
      const aTem = a.diasParaEntrega !== null && a.diasParaEntrega !== undefined
      const bTem = b.diasParaEntrega !== null && b.diasParaEntrega !== undefined

      if (aTem && bTem) {
        return (a.diasParaEntrega as number) - (b.diasParaEntrega as number)
      }
      if (aTem && !bTem) return -1
      if (!aTem && bTem) return 1

      // Fallback secundário: mais antigos criados primeiro (maior diasDesdeCriacao)
      return (b.diasDesdeCriacao || 0) - (a.diasDesdeCriacao || 0)
    })

    return list
  }, [cards, modo])

  // Alternar expandir/recolher
  const toggleParentExpand = (parentId: string, e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation()
    }
    setExpandedParents((prev) => ({
      ...prev,
      [parentId]: !prev[parentId],
    }))
  }

  // Expandir todos / recolher todos
  const expandAll = () => {
    const next: Record<string, boolean> = {}
    for (const item of hierarchyList) {
      next[item.id] = true
    }
    setExpandedParents(next)
  }

  const collapseAll = () => {
    setExpandedParents({})
  }

  // Filtragem por busca e filtros rápidos
  const filteredHierarchy = useMemo(() => {
    if (!hierarchyList || !Array.isArray(hierarchyList)) return []
    return hierarchyList.filter((item) => {
      if (!item) return false
      const subcards = Array.isArray(item.subcards) ? item.subcards : []
      // Filtro rápido
      if (filterType === 'com_ambientes' && subcards.length === 0) return false
      if (filterType === 'isolados' && subcards.length > 0) return false

      // Busca por texto
      if (!search || !search.trim()) return true
      const term = search.toLowerCase().trim()
      const clientMatch = (item.clientName || '').toLowerCase().includes(term)
      const empMatch = (item.empreendimento || '').toLowerCase().includes(term)
      const parentNameMatch = (item.parent?.nome_produto || '').toLowerCase().includes(term)
      const parentCodeMatch = (item.codigo_rastreio || item.parent?.codigo_rastreio || '')
        .toLowerCase()
        .includes(term)

      // Verificar se algum subcard casa com a busca
      const subcardMatch = subcards.some((s) => {
        if (!s) return false
        const subName = (s.nome_produto || '').toLowerCase()
        const subCode = (s.codigo_rastreio || '').toLowerCase()
        return subName.includes(term) || subCode.includes(term)
      })

      return clientMatch || empMatch || parentNameMatch || parentCodeMatch || subcardMatch
    })
  }, [hierarchyList, search, filterType])

  // Contagem total de cards/subcards pendentes na carteira
  const totalPendentesCount = useMemo(() => {
    let count = 0
    if (!Array.isArray(hierarchyList)) return 0
    for (const item of hierarchyList) {
      if (!item) continue
      if (item.isParentPending) count++
      // Contar também subcards pendentes
      if (Array.isArray(item.pendingSubcards)) {
        count += item.pendingSubcards.length
      }
    }
    return count
  }, [hierarchyList])

  // Valor total financeiro da carteira
  const totalValorCarteira = useMemo(() => {
    return hierarchyList.reduce((acc, item) => acc + item.totalContratoValor, 0)
  }, [hierarchyList])

  // Handlers de Drag & Drop para o Card Pai (Nível 1) - Suporte a Pai Real e Pai Virtual
  const handleParentDragStart = (e: React.DragEvent, item: ParentHierarchyItem) => {
    // Para pai real, cardId é item.parent.id; para virtual, usamos o id do primeiro item ou subcard
    const rootCardId = item.parent ? item.parent.id : item.subcards[0]?.id || item.id
    e.dataTransfer.setData('cardId', rootCardId)
    e.dataTransfer.setData('isParent', 'true')
    e.dataTransfer.setData('isVirtual', item.isVirtual ? 'true' : 'false')
    e.dataTransfer.setData('isSubcard', 'false')
    e.dataTransfer.setData('sourceLinha', 'producao')

    // Lista completa de IDs de todos os ambientes filhos/do grupo para alocação conjunta
    const validSubs = Array.isArray(item.subcards) ? item.subcards.filter(Boolean) : []
    const subcardIds = validSubs.map((s) => s.id).filter(Boolean)
    e.dataTransfer.setData('subcardIds', JSON.stringify(subcardIds))
    e.dataTransfer.effectAllowed = 'move'
  }

  // Handlers de Drag & Drop para o Subcard (Nível 2)
  const handleSubcardDragStart = (
    e: React.DragEvent,
    subcard: PcpCardItem,
    parentItem: ParentHierarchyItem,
  ) => {
    e.stopPropagation()
    e.dataTransfer.setData('cardId', subcard.id)
    e.dataTransfer.setData('isParent', 'false')
    e.dataTransfer.setData('isSubcard', 'true')
    e.dataTransfer.setData('parentId', parentItem.parent?.id || parentItem.id)
    e.dataTransfer.setData('sourceLinha', 'producao')
    // Não envia subcardIds para alocar somente este ambiente individual
    e.dataTransfer.effectAllowed = 'move'
  }

  // Handler unificado de drop para desagendamento na Carteira
  const handleDropToCarteira = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragOverSidebar(false)
    setIsDragOverCollapsed(false)

    const cardId = e.dataTransfer.getData('cardId')
    if (!cardId) return

    const isParentStr = e.dataTransfer.getData('isParent')
    const isSubcardStr = e.dataTransfer.getData('isSubcard')
    const isParent = isParentStr === 'true' || isSubcardStr === 'false'

    const sourceLinha = (e.dataTransfer.getData('sourceLinha') as PcpLinhaOperacao) || 'producao'

    let subcardIds: string[] | undefined
    const rawSubcards = e.dataTransfer.getData('subcardIds')
    if (rawSubcards) {
      try {
        const parsed = JSON.parse(rawSubcards)
        if (Array.isArray(parsed)) {
          subcardIds = parsed
        }
      } catch {
        // Ignora erro de JSON parse
      }
    }

    if (onDropToCarteira) {
      onDropToCarteira(cardId, sourceLinha, isParent, subcardIds)
    }
  }

  if (collapsed) {
    return (
      <aside
        onDragOver={(e) => {
          e.preventDefault()
          e.dataTransfer.dropEffect = 'move'
          setIsDragOverCollapsed(true)
        }}
        onDragLeave={(e) => {
          // Evita flicker quando passa por elementos filhos
          if (!e.currentTarget.contains(e.relatedTarget as Node)) {
            setIsDragOverCollapsed(false)
          }
        }}
        onDrop={(e) => {
          handleDropToCarteira(e)
          onToggleCollapsed()
        }}
        className={cn(
          'w-10 bg-card border-r border-border flex flex-col items-center py-2.5 select-none shrink-0 transition-all z-20 group relative shadow-xs',
          isDragOverCollapsed &&
            'bg-primary/20 ring-2 ring-primary ring-inset border-dashed border-primary',
        )}
      >
        <Button
          variant="ghost"
          size="icon"
          onClick={onToggleCollapsed}
          title="Abrir Carteira de Pendentes"
          className="h-7 w-7 text-muted-foreground hover:text-foreground hover:bg-muted mb-2 group-hover:scale-105 transition-transform"
        >
          <ChevronRight className="w-4 h-4" />
        </Button>

        <button
          type="button"
          onClick={onToggleCollapsed}
          className="flex-1 w-full flex flex-col items-center justify-center gap-3 hover:bg-muted/40 transition-colors py-2"
          title={`Abrir Carteira (${totalPendentesCount} itens pendentes)`}
        >
          <div className="p-1.5 rounded-md bg-amber-500/15 text-amber-600 dark:text-amber-400 relative">
            <Briefcase className="w-3.5 h-3.5" />
            {totalPendentesCount > 0 && (
              <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-amber-500" />
            )}
          </div>
          <span
            className="text-[10px] font-bold text-muted-foreground group-hover:text-amber-600 dark:group-hover:text-amber-400 tracking-wider uppercase whitespace-nowrap transition-colors"
            style={{ writingMode: 'vertical-rl' }}
          >
            📥 PARA AGENDAR ({totalPendentesCount})
          </span>{' '}
        </button>
      </aside>
    )
  }

  return (
    <aside
      onDragOver={(e) => {
        e.preventDefault()
        e.dataTransfer.dropEffect = 'move'
        setIsDragOverSidebar(true)
      }}
      onDragLeave={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node)) {
          setIsDragOverSidebar(false)
        }
      }}
      onDrop={handleDropToCarteira}
      className={cn(
        'w-[300px] sm:w-[320px] bg-card border-r border-border flex flex-col h-full min-h-0 shrink-0 select-none transition-all z-20 shadow-xs relative overflow-hidden',
        isDragOverSidebar &&
          'bg-primary/10 border-2 border-dashed border-primary ring-2 ring-primary ring-inset',
      )}
    >
      {/* Indicador visual de zona de soltura sobreposta */}
      {isDragOverSidebar && (
        <div className="absolute inset-0 bg-primary/10 backdrop-blur-[1px] border-2 border-dashed border-primary z-30 pointer-events-none flex flex-col items-center justify-center p-4 text-center animate-in fade-in-50 duration-150">
          <div className="w-12 h-12 rounded-full bg-primary/20 text-primary flex items-center justify-center mb-2 shadow-xs">
            <Undo2 className="w-6 h-6 animate-pulse" />
          </div>
          <p className="text-xs font-bold text-foreground uppercase tracking-wide">
            Solte para Retornar à Carteira
          </p>
          <span className="text-[11px] text-muted-foreground mt-1 max-w-[200px]">
            O projeto/ambiente será desagendado e voltará para a lista de pendentes.
          </span>
        </div>
      )}

      {/* Cabeçalho da Sidebar */}
      <div className="p-3 border-b border-border space-y-2.5 shrink-0 bg-card">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <Briefcase className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-xs font-bold text-foreground tracking-tight leading-none uppercase">
                PROJETOS PARA AGENDAR
              </h2>
              <span className="text-[10px] text-muted-foreground font-medium">
                {filteredHierarchy.length} {filteredHierarchy.length === 1 ? 'projeto' : 'projetos'}{' '}
                • {formatBRL(totalValorCarteira)}
              </span>
            </div>
          </div>

          <Button
            variant="ghost"
            size="icon"
            onClick={onToggleCollapsed}
            title="Recolher Carteira"
            className="h-7 w-7 text-muted-foreground hover:text-foreground shrink-0"
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
        </div>

        {/* Input de busca */}
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <Input
            placeholder="Buscar cliente, empreendimento, ambiente..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8 h-7 text-xs bg-background border-border text-foreground placeholder:text-muted-foreground focus-visible:ring-primary"
          />
        </div>

        {/* Filtros rápidos e controles de expansão */}
        <div className="flex items-center justify-between gap-1">
          <div className="flex items-center gap-1 p-0.5 bg-muted/60 rounded-md flex-1">
            <button
              type="button"
              onClick={() => setFilterType('todos')}
              className={cn(
                'flex-1 text-[10px] font-semibold py-1 rounded transition-all',
                filterType === 'todos'
                  ? 'bg-background text-foreground shadow-2xs'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              Todos ({hierarchyList.length})
            </button>
            <button
              type="button"
              onClick={() => setFilterType('com_ambientes')}
              className={cn(
                'flex-1 text-[10px] font-semibold py-1 rounded transition-all',
                filterType === 'com_ambientes'
                  ? 'bg-background text-foreground shadow-2xs'
                  : 'text-muted-foreground hover:text-foreground',
              )}
              title="Apenas projetos com subcards/ambientes cadastrados"
            >
              C/ Ambientes
            </button>
            <button
              type="button"
              onClick={() => setFilterType('isolados')}
              className={cn(
                'flex-1 text-[10px] font-semibold py-1 rounded transition-all',
                filterType === 'isolados'
                  ? 'bg-background text-foreground shadow-2xs'
                  : 'text-muted-foreground hover:text-foreground',
              )}
              title="Apenas cards únicos sem subcards"
            >
              Únicos
            </button>
          </div>

          <div className="flex items-center gap-0.5 shrink-0 pl-1">
            <Button
              variant="ghost"
              size="icon"
              onClick={expandAll}
              title="Expandir todos os ambientes"
              className="h-6 w-6 text-muted-foreground hover:text-foreground"
            >
              <FolderOpen className="w-3.5 h-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={collapseAll}
              title="Recolher todos os ambientes"
              className="h-6 w-6 text-muted-foreground hover:text-foreground"
            >
              <FolderClosed className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
      </div>

      {/* Lista de Cards Hierárquicos (Accordion Card Pai + Subcards) - Rolagem vertical própria e independente */}
      <div
        onDragOver={(e) => {
          e.preventDefault()
          e.dataTransfer.dropEffect = 'move'
          setIsDragOverSidebar(true)
        }}
        onDrop={handleDropToCarteira}
        className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden p-2.5 space-y-2.5 overscroll-contain"
      >
        {filteredHierarchy.length === 0 ? (
          <div className="h-48 flex flex-col items-center justify-center text-center p-4 text-muted-foreground">
            <Layers className="w-8 h-8 mb-2 opacity-40" />
            <p className="text-xs font-semibold text-foreground">
              {search ? 'Nenhum resultado' : 'Carteira vazia'}
            </p>
            <p className="text-[11px] text-muted-foreground mt-1 max-w-[200px]">
              {search
                ? 'Tente outro termo de busca'
                : modo === 'mensal'
                  ? 'Todos os cards já possuem semana de produção definida.'
                  : modo === 'diario'
                    ? 'Todos os cards já possuem data definida.'
                    : 'Todos os cards já possuem planejamento definido.'}
            </p>
          </div>
        ) : (
          filteredHierarchy.map((item) => {
            const isExpanded = Boolean(expandedParents[item.id])
            const hasSubcards = item.subcards.length > 0

            return (
              <div
                key={item.id}
                className={cn(
                  'rounded-lg border border-border bg-card overflow-hidden shadow-2xs transition-all',
                  'hover:border-amber-500/50 group/parent',
                  isExpanded && 'ring-1 ring-amber-500/20',
                )}
              >
                {/* NÍVEL 1: CARD PAI (PROJETO DO CLIENTE - REAL OU VIRTUAL) */}
                <div
                  draggable
                  onDragStart={(e) => handleParentDragStart(e, item)}
                  onClick={() => {
                    if (item.parent) onCardClick(item.parent)
                  }}
                  className={cn(
                    'p-2.5 bg-amber-50/40 dark:bg-amber-950/20 hover:bg-muted/40 transition-colors cursor-grab active:cursor-grabbing select-none',
                    'border-l-4 border-l-amber-500',
                  )}
                  style={item.cor_vinculo ? { borderLeftColor: item.cor_vinculo } : undefined}
                >
                  {/* Linha 1: Nome do Cliente + Botão Sanfona / Expandir */}
                  <div className="flex items-start justify-between gap-1.5">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1 flex-wrap">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400">
                          Projeto
                        </span>
                        {item.codigo_rastreio && (
                          <span className="font-mono text-[9px] bg-amber-500/15 text-amber-700 dark:text-amber-400 px-1 rounded font-medium">
                            {item.codigo_rastreio}
                          </span>
                        )}
                        {item.isVirtual && (
                          <span className="text-[9px] bg-muted text-muted-foreground px-1 rounded font-normal">
                            Contrato
                          </span>
                        )}
                        {/* Selo discreto "Entrada há X dias" */}
                        {typeof item.diasDesdeCriacao === 'number' && (
                          <span
                            className="text-[9px] bg-muted/80 text-muted-foreground px-1 rounded"
                            title={`Criado no sistema há ${item.diasDesdeCriacao} dias`}
                          >
                            Entrada há {item.diasDesdeCriacao}d
                          </span>
                        )}
                      </div>

                      <h3
                        className="text-xs font-bold text-foreground truncate leading-tight group-hover/parent:text-amber-600 dark:group-hover/parent:text-amber-400 transition-colors mt-0.5 uppercase"
                        title={item.clientName}
                      >
                        {item.clientName}
                      </h3>

                      {/* Empreendimento */}
                      {item.empreendimento ? (
                        <p
                          className="text-[10px] text-muted-foreground truncate flex items-center gap-1 mt-0.5"
                          title={item.empreendimento}
                        >
                          <Building2 className="w-2.5 h-2.5 shrink-0 opacity-70" />
                          <span>{item.empreendimento}</span>
                        </p>
                      ) : (
                        <p
                          className="text-[10px] text-muted-foreground truncate mt-0.5"
                          title={item.parent?.nome_produto}
                        >
                          {item.parent?.nome_produto}
                        </p>
                      )}

                      {/* Semáforo visual de aging + Data Prometida de Entrega (Spec Etapa 4) */}
                      {Boolean(item.dataPrometidaEntrega) && (
                        <div className="flex items-center gap-1 mt-1 flex-wrap">
                          {item.agingStatus === 'vermelho' && (
                            <Badge
                              variant="destructive"
                              className="text-[9px] px-1.5 py-0 h-4 font-bold bg-rose-500/15 text-rose-700 dark:text-rose-400 border-rose-300 dark:border-rose-700"
                              title="Menos de 30 dias para entrega no contrato e sem semana agendada!"
                            >
                              🔴 Entrega:{' '}
                              {item.diasParaEntrega !== null && item.diasParaEntrega !== undefined
                                ? `${item.diasParaEntrega}d`
                                : ''}{' '}
                              ({safeFormatDatePtBr(item.dataPrometidaEntrega, { short: true })})
                            </Badge>
                          )}
                          {item.agingStatus === 'amarelo' && (
                            <Badge
                              variant="outline"
                              className="text-[9px] px-1.5 py-0 h-4 font-bold bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-300 dark:border-amber-700"
                              title="Entre 30 e 60 dias para entrega no contrato"
                            >
                              🟡 Entrega:{' '}
                              {item.diasParaEntrega !== null && item.diasParaEntrega !== undefined
                                ? `${item.diasParaEntrega}d`
                                : ''}{' '}
                              ({safeFormatDatePtBr(item.dataPrometidaEntrega, { short: true })})
                            </Badge>
                          )}
                          {item.agingStatus === 'verde' && (
                            <Badge
                              variant="outline"
                              className="text-[9px] px-1.5 py-0 h-4 font-semibold bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-300 dark:border-emerald-700"
                              title="Mais de 60 dias para entrega no contrato"
                            >
                              🟢 Entrega:{' '}
                              {item.diasParaEntrega !== null && item.diasParaEntrega !== undefined
                                ? `${item.diasParaEntrega}d`
                                : ''}{' '}
                              ({safeFormatDatePtBr(item.dataPrometidaEntrega, { short: true })})
                            </Badge>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Botão de seta para expandir/recolher subcards (ambientes) */}
                    {hasSubcards ? (
                      <button
                        type="button"
                        onClick={(e) => toggleParentExpand(item.id, e)}
                        className={cn(
                          'p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-all shrink-0',
                          isExpanded && 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
                        )}
                        title={
                          isExpanded
                            ? 'Recolher lista de ambientes'
                            : `Expandir ${item.subcards.length} ambientes`
                        }
                      >
                        <ChevronDown
                          className={cn(
                            'w-4 h-4 transition-transform duration-200',
                            isExpanded
                              ? 'rotate-180 text-amber-600 dark:text-amber-400'
                              : 'rotate-0',
                          )}
                        />
                      </button>
                    ) : (
                      <GripVertical className="w-3.5 h-3.5 text-muted-foreground/40 group-hover/parent:text-muted-foreground transition-colors shrink-0" />
                    )}
                  </div>

                  {/* Linha 2: Valor Total em R$ do Contrato + Quantidade de Ambientes */}
                  <div className="flex items-center justify-between gap-2 mt-2 pt-1.5 border-t border-border/50 text-[11px]">
                    <div className="flex items-center gap-1">
                      <span className="text-[10px] text-muted-foreground font-medium">
                        Contrato:
                      </span>
                      <strong className="text-primary font-bold">
                        {formatBRL(item.totalContratoValor)}
                      </strong>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {hasSubcards ? (
                        <Badge
                          variant="secondary"
                          className={cn(
                            'text-[9px] px-1.5 py-0 h-4 font-semibold transition-colors',
                            isExpanded
                              ? 'bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-300 dark:border-amber-800'
                              : 'bg-muted text-muted-foreground',
                          )}
                        >
                          <Layers className="w-2.5 h-2.5 mr-0.5" />({item.subcards.length}{' '}
                          {item.subcards.length === 1 ? 'item' : 'itens'})
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-[9px] px-1 py-0 h-4">
                          Único
                        </Badge>
                      )}
                      <GripVertical className="w-3 h-3 text-muted-foreground/40 group-hover/parent:text-muted-foreground transition-colors shrink-0" />
                    </div>
                  </div>
                </div>

                {/* NÍVEL 2: SUBCARDS (AMBIENTES INDIVIDUAIS) - LISTA SANFONA */}
                {isExpanded && hasSubcards && (
                  <div className="bg-muted/30 border-t border-border/60 divide-y divide-border/40 p-1.5 space-y-1">
                    <div className="px-1.5 py-1 text-[10px] font-semibold text-muted-foreground uppercase flex items-center justify-between">
                      <span>Ambientes do Projeto ({item.subcards.length})</span>
                      <span className="text-[9px] font-normal normal-case italic">
                        Arraste para alocar só o ambiente
                      </span>
                    </div>

                    {item.subcards.map((subcard) => {
                      const subcardValor = Number(subcard.valor_total) || 0
                      const isSubcardAlocado = !isCardPending(subcard)

                      return (
                        <div
                          key={subcard.id}
                          draggable
                          onDragStart={(e) => handleSubcardDragStart(e, subcard, item)}
                          onClick={(e) => {
                            e.stopPropagation()
                            onCardClick(subcard)
                          }}
                          className={cn(
                            'p-2 rounded-md bg-card/90 border border-border/70 hover:border-primary/60 transition-all cursor-grab active:cursor-grabbing select-none group/sub',
                            'hover:bg-card hover:shadow-2xs',
                            isSubcardAlocado && 'opacity-60 bg-muted/40',
                          )}
                        >
                          <div className="flex items-start justify-between gap-1.5">
                            <div className="min-w-0 flex-1">
                              {/* Código do Subcard + Nome do Ambiente */}
                              <div className="flex items-center gap-1.5">
                                {subcard.codigo_rastreio && (
                                  <span className="font-mono text-[9px] font-bold text-primary bg-primary/10 px-1 py-0.2 rounded shrink-0">
                                    {subcard.codigo_rastreio}
                                  </span>
                                )}
                                <span
                                  className="text-xs font-semibold text-foreground truncate group-hover/sub:text-primary transition-colors"
                                  title={subcard.nome_produto}
                                >
                                  {subcard.nome_produto}
                                </span>
                              </div>

                              {/* Status se já foi alocado individualmente */}
                              {isSubcardAlocado && (
                                <span className="text-[9px] text-emerald-600 dark:text-emerald-400 font-medium block mt-0.5">
                                  ✓ Alocado:{' '}
                                  {subcard.semana_planejada_producao ||
                                    subcard.mes_planejado_producao ||
                                    subcard.data_planejada_producao}
                                </span>
                              )}
                            </div>

                            {/* Ícone de arraste */}
                            <GripVertical className="w-3 h-3 text-muted-foreground/30 group-hover/sub:text-muted-foreground transition-colors shrink-0 mt-0.5" />
                          </div>

                          {/* Valor individual em R$ ou '— (parte do contrato)' */}
                          <div className="flex items-center justify-between gap-2 mt-1.5 pt-1 border-t border-border/30 text-[10px]">
                            <span className="text-muted-foreground font-medium">
                              Valor individual:
                            </span>
                            <span
                              className={cn(
                                'font-bold',
                                subcardValor > 0
                                  ? 'text-primary'
                                  : 'text-muted-foreground font-normal',
                              )}
                            >
                              {subcardValor > 0 ? formatBRL(subcardValor) : '— (parte do contrato)'}
                            </span>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          })
        )}
      </div>

      {/* Dica de usabilidade na base */}
      <div className="p-2 border-t border-border bg-muted/30 shrink-0 text-[10px] text-muted-foreground flex items-center justify-between">
        <span>Arraste Pai (todos) ou Subcard</span>
        <Badge variant="outline" className="text-[9px] px-1 py-0">
          Hierárquico
        </Badge>
      </div>
    </aside>
  )
}
