import React, { useState } from 'react'
import { PcpCardItem } from '@/services/pcp-planejamento'
import { PcpCard } from './PcpCard'
import { formatBRL } from '@/lib/pcp-capacity'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Briefcase, ChevronLeft, ChevronRight, Search, Layers } from 'lucide-react'
import { cn } from '@/lib/utils'

interface PcpCarteiraSidebarProps {
  cards: PcpCardItem[]
  collapsed: boolean
  modo?: 'anual' | 'mensal' | 'semanal' | 'diario'
  onToggleCollapsed: () => void
  onCardClick: (card: PcpCardItem) => void
}

export const PcpCarteiraSidebar: React.FC<PcpCarteiraSidebarProps> = ({
  cards,
  collapsed,
  modo = 'anual',
  onToggleCollapsed,
  onCardClick,
}) => {
  const [search, setSearch] = useState('')
  const [filterType, setFilterType] = useState<'todos' | 'ambientes' | 'subcards'>('todos')

  // Modo de exibição da carteira:
  // Se modo === 'mensal', lista cards sem semana planejada de produção (mesmo que já tenham mes_planejado definido).
  // Se modo === 'anual', lista cards sem semana E sem mês de produção definidos.
  // Se modo === 'diario', lista cards sem data planejada de produção.
  const unassignedCards = cards.filter((c) => {
    const semSemanaProd = !c.semana_planejada_producao || c.semana_planejada_producao.trim() === ''
    if (modo === 'mensal') {
      return semSemanaProd
    }
    if (modo === 'diario') {
      const semDataProd = !c.data_planejada_producao || c.data_planejada_producao.trim() === ''
      return semDataProd
    }
    // modo === 'anual' (default)
    const semMesProd = !c.mes_planejado_producao || c.mes_planejado_producao.trim() === ''
    return semSemanaProd && semMesProd
  })

  const filteredCards = unassignedCards.filter((card) => {
    // Filtro por tipo
    if (filterType === 'ambientes' && card.card_pai_id) return false
    if (filterType === 'subcards' && !card.card_pai_id) return false

    // Filtro por busca
    if (!search.trim()) return true
    const term = search.toLowerCase()
    const clientName = (
      card.cliente?.nome ||
      card.formulario?.cliente?.nome ||
      card.formulario?.nome_cliente ||
      ''
    ).toLowerCase()
    const prodName = (card.nome_produto || '').toLowerCase()
    const code = (card.codigo_rastreio || '').toLowerCase()

    return clientName.includes(term) || prodName.includes(term) || code.includes(term)
  })

  const totalValor = filteredCards.reduce((acc, c) => acc + (c.valor_total || 0), 0)

  if (collapsed) {
    return (
      <aside className="w-12 bg-card border-r border-border flex flex-col items-center py-3 select-none shrink-0 transition-all">
        <Button
          variant="ghost"
          size="icon"
          onClick={onToggleCollapsed}
          title="Expandir Carteira"
          className="h-8 w-8 text-muted-foreground hover:text-foreground mb-3"
        >
          <ChevronRight className="w-4 h-4" />
        </Button>

        <div className="flex-1 flex flex-col items-center justify-center gap-6">
          <div className="p-2 rounded-lg bg-primary/10 text-primary">
            <Briefcase className="w-4 h-4" />
          </div>
          <span
            className="text-[11px] font-bold text-muted-foreground tracking-wider uppercase whitespace-nowrap rotate-90"
            style={{ writingMode: 'vertical-rl' }}
          >
            CARTEIRA ({unassignedCards.length})
          </span>
        </div>
      </aside>
    )
  }

  return (
    <aside className="w-[300px] bg-card border-r border-border flex flex-col h-full shrink-0 select-none transition-all">
      {/* Cabeçalho da Sidebar */}
      <div className="p-3 border-b border-border space-y-2.5 shrink-0 bg-card">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
              <Briefcase className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-xs font-bold text-foreground tracking-tight leading-none uppercase">
                CARTEIRA (Aguardando Planejamento)
              </h2>
              <span className="text-[10px] text-muted-foreground font-medium">
                {filteredCards.length} {filteredCards.length === 1 ? 'item' : 'itens'} •{' '}
                {formatBRL(totalValor)}
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
            placeholder="Buscar cliente, ambiente..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8 h-7 text-xs bg-background border-border text-foreground placeholder:text-muted-foreground focus-visible:ring-primary"
          />
        </div>

        {/* Filtros rápidos: Todos / Ambientes / Subcards */}
        <div className="flex items-center gap-1 p-0.5 bg-muted/60 rounded-md">
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
            Todos ({unassignedCards.length})
          </button>
          <button
            type="button"
            onClick={() => setFilterType('ambientes')}
            className={cn(
              'flex-1 text-[10px] font-semibold py-1 rounded transition-all',
              filterType === 'ambientes'
                ? 'bg-background text-foreground shadow-2xs'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            Ambientes
          </button>
          <button
            type="button"
            onClick={() => setFilterType('subcards')}
            className={cn(
              'flex-1 text-[10px] font-semibold py-1 rounded transition-all',
              filterType === 'subcards'
                ? 'bg-background text-foreground shadow-2xs'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            Subcards
          </button>
        </div>
      </div>

      {/* Lista de Cards para arrastar */}
      <div className="flex-1 overflow-y-auto p-2.5 space-y-2">
        {filteredCards.length === 0 ? (
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
          filteredCards.map((card) => (
            <PcpCard
              key={card.id}
              card={card}
              onClick={() => onCardClick(card)}
              showClientName={true}
            />
          ))
        )}
      </div>

      {/* Dica de usabilidade na base */}
      <div className="p-2 border-t border-border bg-muted/30 shrink-0 text-[10px] text-muted-foreground flex items-center justify-between">
        <span>Arraste para uma coluna temporal</span>
        <Badge variant="outline" className="text-[9px] px-1 py-0">
          Drag & Drop
        </Badge>
      </div>
    </aside>
  )
}
