import React, { useState, useMemo } from 'react'
import { PcpCardItem } from '@/services/pcp-planejamento'
import { formatBRL } from '@/lib/pcp-capacity'
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
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface PcpCarteiraSidebarProps {
  cards: PcpCardItem[]
  collapsed: boolean
  modo?: 'anual' | 'mensal' | 'semanal' | 'diario'
  onToggleCollapsed: () => void
  onCardClick: (card: PcpCardItem) => void
}

interface ParentHierarchyItem {
  parent: PcpCardItem
  subcards: PcpCardItem[]
  // Subcards que estão pendentes na carteira neste modo
  pendingSubcards: PcpCardItem[]
  isParentPending: boolean
  totalSubcardsCount: number
  totalContratoValor: number
  clientName: string
  empreendimento: string
}

export const PcpCarteiraSidebar: React.FC<PcpCarteiraSidebarProps> = ({
  cards,
  collapsed,
  modo = 'anual',
  onToggleCollapsed,
  onCardClick,
}) => {
  const [search, setSearch] = useState('')
  const [filterType, setFilterType] = useState<'todos' | 'com_ambientes' | 'isolados'>('todos')
  const [expandedParents, setExpandedParents] = useState<Record<string, boolean>>({})
  const [isDragOverCollapsed, setIsDragOverCollapsed] = useState(false)
  const [isEmAnaliseExpanded, setIsEmAnaliseExpanded] = useState(false)
  const [expandedEmAnaliseParents, setExpandedEmAnaliseParents] = useState<Record<string, boolean>>(
    {},
  )

  // Status iniciais de análise que ficam na seção colapsada de rodapé "🚀 Em análise"
  const STATUS_EM_ANALISE = useMemo(() => new Set(['iniciar', 'reuniao_analise']), [])

  // Status de análise bloqueados / já em produção ou concluídos que NÃO devem aparecer em 'Projetos para Agendar'
  const STATUS_ANALISE_EXCLUIDOS = useMemo(
    () =>
      new Set([
        'aguardando_plano_corte',
        'router',
        'coladeira',
        'bancada',
        'embalagem',
        'expedicao',
        'aguardando_agenda',
        'montagem',
        'item_terceirizado',
        'pendencia',
        'concluido',
        'iniciar',
        'reuniao_analise',
      ]),
    [],
  )

  // Condição estrita do filtro da Carteira principal 'PROJETOS PARA AGENDAR':
  // - visivel_pcp = true
  // - semana_planejada_producao IS NULL E mes_planejado_producao IS NULL
  // - status_analise NOT IN ('aguardando_plano_corte','router','coladeira','bancada','embalagem','expedicao','aguardando_agenda','montagem','item_terceirizado','pendencia','concluido','iniciar','reuniao_analise')
  // - arquivado_analise = false, arquivado_producao = false, arquivado_montagem = false
  // - excluido_analise = false, excluido_producao = false, excluido_montagem = false
  const isCardAptoParaAgendar = (c: PcpCardItem): boolean => {
    if (c.visivel_pcp === false) return false
    if (c.arquivado_analise || c.arquivado_producao || c.arquivado_montagem) return false
    if (c.excluido_analise || c.excluido_producao || c.excluido_montagem) return false

    // semana e mês de produção nulos
    const temSemana = Boolean(
      c.semana_planejada_producao && c.semana_planejada_producao.trim() !== '',
    )
    const temMes = Boolean(c.mes_planejado_producao && c.mes_planejado_producao.trim() !== '')
    if (temSemana || temMes) return false

    // status_analise não pode estar na lista de excluídos (inclui iniciar e reuniao_analise)
    const st = (c.status_analise || '').toLowerCase().trim()
    if (STATUS_ANALISE_EXCLUIDOS.has(st)) return false

    return true
  }

  // Condição para itens em análise inicial (visão de funil no rodapé):
  // - visivel_pcp = true
  // - semana_planejada_producao IS NULL E mes_planejado_producao IS NULL
  // - status_analise IN ('iniciar', 'reuniao_analise')
  // - não arquivado e não excluído
  const isCardEmAnalise = (c: PcpCardItem): boolean => {
    if (c.visivel_pcp === false) return false
    if (c.arquivado_analise || c.arquivado_producao || c.arquivado_montagem) return false
    if (c.excluido_analise || c.excluido_producao || c.excluido_montagem) return false

    const temSemana = Boolean(
      c.semana_planejada_producao && c.semana_planejada_producao.trim() !== '',
    )
    const temMes = Boolean(c.mes_planejado_producao && c.mes_planejado_producao.trim() !== '')
    if (temSemana || temMes) return false

    const st = (c.status_analise || '').toLowerCase().trim()
    return STATUS_EM_ANALISE.has(st)
  }

  // Alias para manter compatibilidade com verificações internas
  const isCardPending = isCardAptoParaAgendar

  // Agrupamento hierárquico Nível 1 (Card Pai / Projeto) + Nível 2 (Subcards / Ambientes)
  const hierarchyList: ParentHierarchyItem[] = useMemo(() => {
    // 1. Mapear subcards pertencentes a cada card_pai_id
    const subcardsByParentId = new Map<string, PcpCardItem[]>()
    // Subcards órfãos (caso haja algum subcard cujo pai não esteja na lista)
    const orphanSubcards: PcpCardItem[] = []

    const cardsMap = new Map<string, PcpCardItem>()
    for (const c of cards) {
      cardsMap.set(c.id, c)
    }

    for (const c of cards) {
      if (c.card_pai_id) {
        if (!subcardsByParentId.has(c.card_pai_id)) {
          subcardsByParentId.set(c.card_pai_id, [])
        }
        subcardsByParentId.get(c.card_pai_id)!.push(c)

        if (!cardsMap.has(c.card_pai_id)) {
          orphanSubcards.push(c)
        }
      }
    }

    // 2. Construir itens de pais
    const list: ParentHierarchyItem[] = []
    const allParentCards = cards.filter((c) => !c.card_pai_id)

    for (const parent of allParentCards) {
      const allSubs = subcardsByParentId.get(parent.id) || []
      const pendingSubs = allSubs.filter((s) => isCardPending(s))
      const parentPending = isCardPending(parent)

      // O item só aparece na Carteira se o pai estiver pendente OU se tiver algum subcard pendente
      if (parentPending || pendingSubs.length > 0) {
        const clientName =
          parent.cliente?.nome ||
          parent.formulario?.cliente?.nome ||
          parent.formulario?.nome_cliente ||
          'Cliente não informado'

        // Empreendimento / Local da Obra se disponível
        const form = parent.formulario as any
        const empreendimento =
          form?.obra_bairro || form?.obra_municipio
            ? [form.obra_bairro, form.obra_municipio].filter(Boolean).join(' - ')
            : parent.cliente?.endereco_obra || parent.cliente?.cidade || ''

        // Valor Total do Contrato: soma do valor do pai + filhos que tenham valor extra
        const totalContratoValor =
          Number(parent.valor_total) || Number(parent.formulario?.valor_total) || 0

        list.push({
          parent,
          subcards: allSubs,
          pendingSubcards: pendingSubs,
          isParentPending: parentPending,
          totalSubcardsCount: allSubs.length,
          totalContratoValor,
          clientName,
          empreendimento,
        })
      }
    }

    return list
  }, [cards, modo])

  // Agrupamento hierárquico específico para o funil "🚀 Em análise" (status 'iniciar' e 'reuniao_analise')
  const emAnaliseHierarchyList: ParentHierarchyItem[] = useMemo(() => {
    const subcardsByParentId = new Map<string, PcpCardItem[]>()
    for (const c of cards) {
      if (c.card_pai_id) {
        if (!subcardsByParentId.has(c.card_pai_id)) {
          subcardsByParentId.set(c.card_pai_id, [])
        }
        subcardsByParentId.get(c.card_pai_id)!.push(c)
      }
    }

    const list: ParentHierarchyItem[] = []
    const allParentCards = cards.filter((c) => !c.card_pai_id)

    for (const parent of allParentCards) {
      const allSubs = subcardsByParentId.get(parent.id) || []
      const emAnaliseSubs = allSubs.filter((s) => isCardEmAnalise(s))
      const parentEmAnalise = isCardEmAnalise(parent)

      // Aparece no grupo se o próprio pai estiver em análise ou tiver subcards em análise
      if (parentEmAnalise || emAnaliseSubs.length > 0) {
        const clientName =
          parent.cliente?.nome ||
          parent.formulario?.cliente?.nome ||
          parent.formulario?.nome_cliente ||
          'Cliente não informado'

        const form = parent.formulario as any
        const empreendimento =
          form?.obra_bairro || form?.obra_municipio
            ? [form.obra_bairro, form.obra_municipio].filter(Boolean).join(' - ')
            : parent.cliente?.endereco_obra || parent.cliente?.cidade || ''

        const totalContratoValor =
          Number(parent.valor_total) || Number(parent.formulario?.valor_total) || 0

        list.push({
          parent,
          subcards: allSubs,
          pendingSubcards: emAnaliseSubs,
          isParentPending: parentEmAnalise,
          totalSubcardsCount: allSubs.length,
          totalContratoValor,
          clientName,
          empreendimento,
        })
      }
    }

    return list
  }, [cards])

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
      next[item.parent.id] = true
    }
    setExpandedParents(next)
  }

  const collapseAll = () => {
    setExpandedParents({})
  }

  // Filtragem por busca e filtros rápidos
  const filteredHierarchy = useMemo(() => {
    return hierarchyList.filter((item) => {
      // Filtro rápido
      if (filterType === 'com_ambientes' && item.subcards.length === 0) return false
      if (filterType === 'isolados' && item.subcards.length > 0) return false

      // Busca por texto
      if (!search.trim()) return true
      const term = search.toLowerCase()
      const clientMatch = item.clientName.toLowerCase().includes(term)
      const empMatch = item.empreendimento.toLowerCase().includes(term)
      const parentNameMatch = (item.parent.nome_produto || '').toLowerCase().includes(term)
      const parentCodeMatch = (item.parent.codigo_rastreio || '').toLowerCase().includes(term)

      // Verificar se algum subcard casa com a busca
      const subcardMatch = item.subcards.some((s) => {
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
    for (const item of hierarchyList) {
      if (item.isParentPending) count++
      // Contar também subcards pendentes
      count += item.pendingSubcards.length
    }
    return count
  }, [hierarchyList])

  // Valor total financeiro da carteira
  const totalValorCarteira = useMemo(() => {
    return hierarchyList.reduce((acc, item) => acc + item.totalContratoValor, 0)
  }, [hierarchyList])

  // Handlers de Drag & Drop para o Card Pai (Nível 1)
  const handleParentDragStart = (e: React.DragEvent, item: ParentHierarchyItem) => {
    e.dataTransfer.setData('cardId', item.parent.id)
    e.dataTransfer.setData('isParent', 'true')
    e.dataTransfer.setData('isSubcard', 'false')
    e.dataTransfer.setData('sourceLinha', 'producao')
    // Lista de IDs dos subcards para sincronização atômica
    const subcardIds = item.subcards.map((s) => s.id)
    e.dataTransfer.setData('subcardIds', JSON.stringify(subcardIds))
    e.dataTransfer.effectAllowed = 'move'
  }

  // Handlers de Drag & Drop para o Subcard (Nível 2)
  const handleSubcardDragStart = (
    e: React.DragEvent,
    subcard: PcpCardItem,
    parent: PcpCardItem,
  ) => {
    e.stopPropagation()
    e.dataTransfer.setData('cardId', subcard.id)
    e.dataTransfer.setData('isParent', 'false')
    e.dataTransfer.setData('isSubcard', 'true')
    e.dataTransfer.setData('parentId', parent.id)
    e.dataTransfer.setData('sourceLinha', 'producao')
    e.dataTransfer.effectAllowed = 'move'
  }

  if (collapsed) {
    return (
      <aside
        onDragOver={(e) => {
          e.preventDefault()
          setIsDragOverCollapsed(true)
        }}
        onDragLeave={() => setIsDragOverCollapsed(false)}
        onDrop={() => {
          setIsDragOverCollapsed(false)
          onToggleCollapsed()
        }}
        className={cn(
          'w-10 bg-card border-r border-border flex flex-col items-center py-2.5 select-none shrink-0 transition-all z-20 group relative shadow-xs',
          isDragOverCollapsed && 'bg-primary/20 ring-2 ring-primary ring-inset',
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
          <div className="p-1.5 rounded-md bg-primary/10 text-primary relative">
            <Briefcase className="w-3.5 h-3.5" />
            {totalPendentesCount > 0 && (
              <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-amber-500" />
            )}
          </div>
          <span
            className="text-[10px] font-bold text-muted-foreground group-hover:text-foreground tracking-wider uppercase whitespace-nowrap"
            style={{ writingMode: 'vertical-rl' }}
          >
            📥 PARA AGENDAR ({totalPendentesCount})
          </span>{' '}
        </button>
      </aside>
    )
  }

  return (
    <aside className="w-[300px] sm:w-[320px] bg-card border-r border-border flex flex-col h-full shrink-0 select-none transition-all z-20 shadow-xs">
      {/* Cabeçalho da Sidebar */}
      <div className="p-3 border-b border-border space-y-2.5 shrink-0 bg-card">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
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

      {/* Lista de Cards Hierárquicos (Accordion Card Pai + Subcards) */}
      <div className="flex-1 overflow-y-auto p-2.5 space-y-2.5">
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
            const isExpanded = Boolean(expandedParents[item.parent.id])
            const hasSubcards = item.subcards.length > 0

            return (
              <div
                key={item.parent.id}
                className={cn(
                  'rounded-lg border border-border bg-card overflow-hidden shadow-2xs transition-all',
                  'hover:border-primary/50 group/parent',
                  isExpanded && 'ring-1 ring-primary/20',
                )}
              >
                {/* NÍVEL 1: CARD PAI (PROJETO DO CLIENTE) */}
                <div
                  draggable
                  onDragStart={(e) => handleParentDragStart(e, item)}
                  onClick={() => onCardClick(item.parent)}
                  className={cn(
                    'p-2.5 bg-card hover:bg-muted/40 transition-colors cursor-grab active:cursor-grabbing select-none',
                    'border-l-4 border-l-primary',
                  )}
                  style={
                    item.parent.cor_vinculo
                      ? { borderLeftColor: item.parent.cor_vinculo }
                      : undefined
                  }
                >
                  {/* Linha 1: Nome do Cliente + Botão Sanfona / Expandir */}
                  <div className="flex items-start justify-between gap-1.5">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-primary">
                          Projeto
                        </span>
                        {item.parent.codigo_rastreio && (
                          <span className="font-mono text-[9px] bg-primary/10 text-primary px-1 rounded font-medium">
                            {item.parent.codigo_rastreio}
                          </span>
                        )}
                      </div>

                      <h3
                        className="text-xs font-bold text-foreground truncate leading-tight group-hover/parent:text-primary transition-colors mt-0.5"
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
                          title={item.parent.nome_produto}
                        >
                          {item.parent.nome_produto}
                        </p>
                      )}
                    </div>

                    {/* Botão de seta para expandir/recolher subcards (ambientes) */}
                    {hasSubcards ? (
                      <button
                        type="button"
                        onClick={(e) => toggleParentExpand(item.parent.id, e)}
                        className={cn(
                          'p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-all shrink-0',
                          isExpanded && 'bg-muted text-primary',
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
                            isExpanded ? 'rotate-180 text-primary' : 'rotate-0',
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
                              ? 'bg-primary/10 text-primary border-primary/20'
                              : 'bg-muted text-muted-foreground',
                          )}
                        >
                          <Layers className="w-2.5 h-2.5 mr-0.5" />
                          {item.subcards.length}{' '}
                          {item.subcards.length === 1 ? 'ambiente' : 'ambientes'}
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
                          onDragStart={(e) => handleSubcardDragStart(e, subcard, item.parent)}
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
                                <span className="font-mono text-[9px] font-bold text-primary bg-primary/10 px-1 py-0.2 rounded shrink-0">
                                  {subcard.codigo_rastreio || 'SUBCARD'}
                                </span>
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
                                subcardValor > 0 ? 'text-primary' : 'text-foreground font-semibold',
                              )}
                            >
                              {formatBRL(subcardValor)}
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

      {/* SEÇÃO RODAPÉ: 🚀 Em análise (N) colapsada - Visão de Funil (Sem arraste) */}
      <div className="border-t border-border bg-card shrink-0 flex flex-col">
        {/* Cabeçalho colapsável */}
        <button
          type="button"
          onClick={() => setIsEmAnaliseExpanded((prev) => !prev)}
          className={cn(
            'w-full px-3 py-2 flex items-center justify-between text-xs font-bold transition-colors select-none',
            'hover:bg-muted/60 text-muted-foreground hover:text-foreground',
            isEmAnaliseExpanded && 'bg-muted/40 text-foreground border-b border-border/50',
          )}
          title="Itens com status 'iniciar' ou 'reuniao_analise' (em fase pré-agendamento fabril)"
        >
          <div className="flex items-center gap-1.5 min-w-0">
            <span className="text-sm shrink-0">🚀</span>
            <span className="truncate">Em análise ({emAnaliseHierarchyList.length})</span>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <Badge
              variant="outline"
              className="text-[9px] px-1.5 py-0 h-4 bg-muted/80 text-muted-foreground font-semibold"
            >
              Funil
            </Badge>
            <ChevronDown
              className={cn(
                'w-4 h-4 transition-transform duration-200',
                isEmAnaliseExpanded ? 'rotate-180 text-primary' : 'rotate-0',
              )}
            />
          </div>
        </button>

        {/* Conteúdo expandido (apenas leitura / clique para detalhe, SEM DRAG) */}
        {isEmAnaliseExpanded && (
          <div className="max-h-60 overflow-y-auto p-2 space-y-2 bg-muted/20">
            <div className="px-1 text-[10px] text-muted-foreground/80 italic flex items-center justify-between">
              <span>Fase inicial (iniciar / reunião)</span>
              <span>Arraste desabilitado</span>
            </div>

            {emAnaliseHierarchyList.length === 0 ? (
              <div className="p-3 text-center text-[11px] text-muted-foreground">
                Nenhum projeto em análise inicial no momento.
              </div>
            ) : (
              emAnaliseHierarchyList.map((item) => {
                const isItemExpanded = Boolean(expandedEmAnaliseParents[item.parent.id])
                const hasSubs = item.subcards.length > 0

                return (
                  <div
                    key={item.parent.id}
                    className="rounded-lg border border-border/70 bg-card overflow-hidden shadow-2xs opacity-90 hover:opacity-100 transition-all"
                  >
                    {/* Card Pai Em Análise (NÃO DRAGGABLE) */}
                    <div
                      onClick={() => onCardClick(item.parent)}
                      className={cn(
                        'p-2 bg-card hover:bg-muted/30 transition-colors cursor-pointer select-none',
                        'border-l-4 border-l-slate-400',
                      )}
                      style={
                        item.parent.cor_vinculo
                          ? { borderLeftColor: item.parent.cor_vinculo }
                          : undefined
                      }
                      title="Card em análise inicial. Clique para visualizar detalhes (drag desabilitado nesta fase)."
                    >
                      <div className="flex items-start justify-between gap-1.5">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1">
                            <span className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">
                              {item.parent.status_analise === 'reuniao_analise'
                                ? 'Reunião de Análise'
                                : 'Iniciar Análise'}
                            </span>
                            {item.parent.codigo_rastreio && (
                              <span className="font-mono text-[9px] bg-muted text-muted-foreground px-1 rounded font-medium">
                                {item.parent.codigo_rastreio}
                              </span>
                            )}
                          </div>

                          <h4
                            className="text-xs font-bold text-foreground truncate leading-tight mt-0.5"
                            title={item.clientName}
                          >
                            {item.clientName}
                          </h4>

                          <p
                            className="text-[10px] text-muted-foreground truncate mt-0.5"
                            title={item.empreendimento || item.parent.nome_produto}
                          >
                            {item.empreendimento || item.parent.nome_produto}
                          </p>
                        </div>

                        {hasSubs ? (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation()
                              setExpandedEmAnaliseParents((prev) => ({
                                ...prev,
                                [item.parent.id]: !prev[item.parent.id],
                              }))
                            }}
                            className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted shrink-0"
                            title={
                              isItemExpanded
                                ? 'Recolher ambientes'
                                : `Expandir ${item.subcards.length} ambientes`
                            }
                          >
                            <ChevronDown
                              className={cn(
                                'w-3.5 h-3.5 transition-transform duration-200',
                                isItemExpanded ? 'rotate-180 text-primary' : 'rotate-0',
                              )}
                            />
                          </button>
                        ) : null}
                      </div>

                      <div className="flex items-center justify-between gap-2 mt-1.5 pt-1 border-t border-border/40 text-[10px]">
                        <div className="flex items-center gap-1">
                          <span className="text-muted-foreground font-medium">Contrato:</span>
                          <strong className="text-foreground font-semibold">
                            {formatBRL(item.totalContratoValor)}
                          </strong>
                        </div>

                        <Badge
                          variant="secondary"
                          className="text-[9px] px-1 py-0 h-4 bg-muted text-muted-foreground"
                        >
                          {hasSubs ? `${item.subcards.length} amb.` : 'Único'}
                        </Badge>
                      </div>
                    </div>

                    {/* Subcards se expandido (NÃO DRAGGABLE) */}
                    {isItemExpanded && hasSubs && (
                      <div className="bg-muted/30 border-t border-border/50 divide-y divide-border/30 p-1 space-y-1">
                        {item.subcards.map((subcard) => {
                          const subcardValor = Number(subcard.valor_total) || 0
                          return (
                            <div
                              key={subcard.id}
                              onClick={(e) => {
                                e.stopPropagation()
                                onCardClick(subcard)
                              }}
                              className="p-1.5 rounded bg-card/80 border border-border/60 hover:bg-card hover:border-primary/40 transition-all cursor-pointer select-none"
                              title="Ambiente em análise inicial (arraste desabilitado)"
                            >
                              <div className="flex items-center justify-between gap-1">
                                <span className="text-[11px] font-semibold text-foreground truncate">
                                  {subcard.nome_produto}
                                </span>
                                <span className="text-[10px] text-muted-foreground font-mono">
                                  {subcard.codigo_rastreio}
                                </span>
                              </div>
                              <div className="flex items-center justify-between gap-1 mt-0.5 text-[9px] text-muted-foreground">
                                <span>Valor: {formatBRL(subcardValor)}</span>
                                <span className="capitalize">
                                  {(subcard.status_analise || '').replace(/_/g, ' ')}
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
