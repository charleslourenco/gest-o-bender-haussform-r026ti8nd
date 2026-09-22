import React, { useState, useMemo } from 'react'
import {
  IsoWeekRange,
  getAllIsoWeeksForYear,
  avaliarCapacidadeFinanceira,
  matchWeek,
  formatBRL,
  CapacidadeInfo,
} from '@/lib/pcp-capacity'
import { PcpCardItem } from '@/services/pcp-planejamento'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import {
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  Search,
  Calendar,
  Layers,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  Building2,
  DollarSign,
  AlertTriangle,
  CheckCircle2,
  Sparkles,
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface PcpCargaSemanalProps {
  cards: PcpCardItem[]
  onRefresh?: () => void
  onCardClick?: (card: PcpCardItem) => void
}

interface SemanaCalculada {
  week: IsoWeekRange
  totalProducao: number
  capacidade: CapacidadeInfo
  cardsDaSemana: PcpCardItem[]
  contagemProjetos: number
}

export const PcpCargaSemanal: React.FC<PcpCargaSemanalProps> = ({
  cards = [],
  onRefresh,
  onCardClick,
}) => {
  const currentActualYear = new Date().getFullYear()
  const [selectedYear, setSelectedYear] = useState<number>(currentActualYear)
  const [selectedWeekKey, setSelectedWeekKey] = useState<string | null>(null)
  const [searchFilter, setSearchFilter] = useState<string>('')
  const [statusFilter, setStatusFilter] = useState<
    'todos' | 'azul' | 'verde' | 'amarelo' | 'vermelho'
  >('todos')

  // Semanas ISO do ano selecionado (S01 a S52/S53)
  const allWeeksOfYear = useMemo(() => {
    return getAllIsoWeeksForYear(selectedYear)
  }, [selectedYear])

  // Agrupamento e cálculo financeiro por semana ISO:
  // Regra de agregação sem dupla contagem:
  // Quando um card pai possui filhos com valor_total > 0 alocados na mesma semana,
  // somar APENAS os filhos (o pai é só contêiner);
  // Pai sem filhos valorados soma o próprio valor.
  const semanasCalculadas = useMemo<SemanaCalculada[]>(() => {
    if (!cards || !Array.isArray(cards)) return []

    return allWeeksOfYear.map((week) => {
      // Filtrar cards de produção que batem com esta semana ISO
      const weekCards = cards.filter((c) => {
        if (!c) return false
        // Verificar semana_planejada_producao
        return matchWeek(c.semana_planejada_producao, week)
      })

      // Identificar pais com filhos valorados nesta semana
      const paisComFilhosValorados = new Set<string>()
      for (const c of weekCards) {
        if (c.card_pai_id && (Number(c.valor_total) || 0) > 0) {
          paisComFilhosValorados.add(c.card_pai_id)
        }
      }

      // Calcular soma em R$
      const totalProducao = weekCards.reduce((acc, c) => {
        const isParent = !c.card_pai_id
        if (isParent && paisComFilhosValorados.has(c.id)) {
          return acc
        }
        return acc + (Number(c.valor_total) || 0)
      }, 0)

      const capacidade = avaliarCapacidadeFinanceira(totalProducao)

      // Identificar projetos únicos (clientes distintos ou contratos distintos)
      const projetosUnicos = new Set<string>()
      for (const c of weekCards) {
        const pKey = c.card_pai_id || c.formulario_comercial_id || c.cliente_id || c.id
        projetosUnicos.add(pKey)
      }

      return {
        week,
        totalProducao,
        capacidade,
        cardsDaSemana: weekCards,
        contagemProjetos: projetosUnicos.size,
      }
    })
  }, [allWeeksOfYear, cards])

  // Semana selecionada para detalhamento
  const semanaAtiva = useMemo(() => {
    if (!selectedWeekKey) {
      // Por padrão, selecionar a primeira com valor ou a semana atual se existir
      const comValor = semanasCalculadas.find((s) => s.totalProducao > 0)
      return comValor || semanasCalculadas[0] || null
    }
    return (
      semanasCalculadas.find((s) => s.week.key === selectedWeekKey) || semanasCalculadas[0] || null
    )
  }, [semanasCalculadas, selectedWeekKey])

  // Cards da semana ativa filtrados para exibição compacta em pílula
  const cardsSemanaAtiva = useMemo(() => {
    if (!semanaAtiva) return []
    let list = [...semanaAtiva.cardsDaSemana]

    // Se houver busca
    if (searchFilter.trim()) {
      const q = searchFilter.toLowerCase().trim()
      list = list.filter((c) => {
        const cli = (c.cliente?.nome || c.formulario?.nome_cliente || '').toLowerCase()
        const amb = (c.nome_produto || '').toLowerCase()
        const cod = (c.codigo_rastreio || '').toLowerCase()
        return cli.includes(q) || amb.includes(q) || cod.includes(q)
      })
    }

    return list
  }, [semanaAtiva, searchFilter])

  // Totais anuais e contadores do semáforo
  const totaisGerais = useMemo(() => {
    let somaTotalAno = 0
    let semanasAzul = 0
    let semanasVerde = 0
    let semanasAmarelo = 0
    let semanasVermelho = 0
    let semanasComCarga = 0

    for (const sem of semanasCalculadas) {
      somaTotalAno += sem.totalProducao
      if (sem.totalProducao > 0) semanasComCarga++
      if (sem.capacidade.status === 'azul') semanasAzul++
      else if (sem.capacidade.status === 'verde') semanasVerde++
      else if (sem.capacidade.status === 'amarelo') semanasAmarelo++
      else if (sem.capacidade.status === 'vermelho') semanasVermelho++
    }

    return {
      somaTotalAno,
      semanasComCarga,
      semanasAzul,
      semanasVerde,
      semanasAmarelo,
      semanasVermelho,
    }
  }, [semanasCalculadas])

  // Filtragem das colunas de semana na barra de visualização
  const semanasFiltradas = useMemo(() => {
    if (statusFilter === 'todos') return semanasCalculadas
    return semanasCalculadas.filter((s) => s.capacidade.status === statusFilter)
  }, [semanasCalculadas, statusFilter])

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-background">
      {/* 1. BARRA SUPERIOR DE CONTROLE E INDICADORES DA CARGA SEMANAL */}
      <div className="px-4 lg:px-6 py-2.5 bg-card border-b border-border flex flex-wrap items-center justify-between gap-3 shrink-0 shadow-2xs">
        {/* Controles de Navegação de Ano */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1 bg-muted/60 p-0.5 rounded-lg border border-border/50">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSelectedYear((y) => y - 1)}
              title="Ano anterior"
              className="h-7 w-7 text-muted-foreground hover:text-foreground"
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>

            <span className="text-xs font-bold text-foreground px-3 min-w-[70px] text-center select-none">
              {selectedYear}
            </span>

            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSelectedYear((y) => y + 1)}
              title="Próximo ano"
              className="h-7 w-7 text-muted-foreground hover:text-foreground"
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setSelectedYear(currentActualYear)}
            className="h-7 px-2.5 text-xs text-muted-foreground hover:text-foreground hidden sm:inline-flex"
          >
            Ano Atual ({currentActualYear})
          </Button>

          {onRefresh && (
            <Button
              variant="ghost"
              size="icon"
              onClick={onRefresh}
              title="Atualizar dados"
              className="h-7 w-7 text-muted-foreground hover:text-foreground"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </Button>
          )}

          {/* Filtros Rápidos por Status de Semáforo */}
          <div className="flex items-center p-0.5 bg-muted/70 rounded-lg gap-0.5 border border-border/50 ml-2">
            <Button
              variant={statusFilter === 'todos' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setStatusFilter('todos')}
              className={cn(
                'h-6 px-2 text-[10px] font-semibold transition-all',
                statusFilter === 'todos'
                  ? 'bg-primary text-primary-foreground shadow-2xs'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              Todas ({semanasCalculadas.length})
            </Button>
            <Button
              variant={statusFilter === 'azul' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setStatusFilter('azul')}
              className={cn(
                'h-6 px-2 text-[10px] font-semibold gap-1 transition-all',
                statusFilter === 'azul'
                  ? 'bg-blue-600 text-white shadow-2xs'
                  : 'text-blue-600 dark:text-blue-400 hover:text-foreground',
              )}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-blue-500 inline-block" />
              Livre ({totaisGerais.semanasAzul})
            </Button>
            <Button
              variant={statusFilter === 'verde' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setStatusFilter('verde')}
              className={cn(
                'h-6 px-2 text-[10px] font-semibold gap-1 transition-all',
                statusFilter === 'verde'
                  ? 'bg-emerald-600 text-white shadow-2xs'
                  : 'text-emerald-600 dark:text-emerald-400 hover:text-foreground',
              )}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />
              Meta Full ({totaisGerais.semanasVerde})
            </Button>
            <Button
              variant={statusFilter === 'amarelo' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setStatusFilter('amarelo')}
              className={cn(
                'h-6 px-2 text-[10px] font-semibold gap-1 transition-all',
                statusFilter === 'amarelo'
                  ? 'bg-amber-600 text-white shadow-2xs'
                  : 'text-amber-600 dark:text-amber-400 hover:text-foreground',
              )}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 inline-block" />
              Atenção ({totaisGerais.semanasAmarelo})
            </Button>
            <Button
              variant={statusFilter === 'vermelho' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setStatusFilter('vermelho')}
              className={cn(
                'h-6 px-2 text-[10px] font-semibold gap-1 transition-all',
                statusFilter === 'vermelho'
                  ? 'bg-rose-600 text-white shadow-2xs'
                  : 'text-rose-600 dark:text-rose-400 hover:text-foreground',
              )}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-rose-500 inline-block" />
              Sobrecarga ({totaisGerais.semanasVermelho})
            </Button>
          </div>
        </div>

        {/* Indicadores Resumo do Ano */}
        <div className="flex items-center gap-3 text-xs">
          <div className="flex items-center gap-2 px-3 py-1 rounded-md bg-primary/10 border border-primary/20 text-primary">
            <span className="text-[11px] font-medium text-foreground">Produção Total Ano:</span>
            <strong className="font-extrabold text-sm text-primary">
              {formatBRL(totaisGerais.somaTotalAno)}
            </strong>
          </div>

          <div className="hidden lg:flex items-center gap-2 text-[11px] text-muted-foreground bg-muted/40 px-2.5 py-1 rounded border border-border">
            <span>Semanas c/ Carga:</span>
            <strong className="text-foreground font-bold">
              {totaisGerais.semanasComCarga} de 52
            </strong>
          </div>
        </div>
      </div>

      {/* 2. RÉGUA EXECUTIVA DO SEMÁFORO DE METAS (LEGENDA EXPLICATIVA) */}
      <div className="px-4 lg:px-6 py-1.5 bg-muted/20 border-b border-border/60 flex flex-wrap items-center justify-between gap-2 text-[11px]">
        <div className="flex items-center gap-1.5 text-muted-foreground font-medium">
          <TrendingUp className="w-3.5 h-3.5 text-primary" />
          <span className="font-semibold text-foreground">Regra do Semáforo Fabril:</span>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-500 shadow-2xs" />
            <span className="text-foreground font-medium">Até R$ 299.999,99:</span>
            <span className="text-blue-700 dark:text-blue-400 font-semibold">Capacidade Livre</span>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-2xs" />
            <span className="text-foreground font-medium">R$ 300k a R$ 350k:</span>
            <span className="text-emerald-700 dark:text-emerald-400 font-bold">
              META FULL ATINGIDA
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500 shadow-2xs" />
            <span className="text-foreground font-medium">R$ 350.001 a R$ 399.999:</span>
            <span className="text-amber-700 dark:text-amber-400 font-semibold">
              Atenção / Limite Próximo
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500 shadow-2xs" />
            <span className="text-foreground font-medium">A partir de R$ 400.000:</span>
            <span className="text-rose-700 dark:text-rose-400 font-bold">Sobrecarga Crítica</span>
          </div>
        </div>
      </div>

      {/* 3. ÁREA PRINCIPAL: GRADE HORIZONTAL DE COLUNAS/BARRAS DE CAPACIDADE ISO (S01 a S52) */}
      <div className="flex-1 overflow-x-auto overflow-y-auto p-4 lg:p-6 space-y-4">
        <div>
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-1.5">
              <Calendar className="w-4 h-4 text-primary" />
              Semanas ISO ({selectedYear}) — Clique na semana para ver o detalhamento
            </h3>
            <span className="text-[11px] text-muted-foreground">
              Exibindo {semanasFiltradas.length} de {semanasCalculadas.length} semanas
            </span>
          </div>

          {/* Grid responsivo em trilha horizontal rolável de colunas de semana */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 2xl:grid-cols-10 gap-2.5">
            {semanasFiltradas.map((sem) => {
              const isSelected = semanaAtiva?.week.key === sem.week.key
              const hasProjects = sem.cardsDaSemana.length > 0
              const cap = sem.capacidade

              // Cor da barra de progresso
              const barColor =
                cap.status === 'azul'
                  ? 'bg-blue-500'
                  : cap.status === 'verde'
                    ? 'bg-emerald-500'
                    : cap.status === 'amarelo'
                      ? 'bg-amber-500'
                      : 'bg-rose-500'

              return (
                <div
                  key={sem.week.key}
                  onClick={() => setSelectedWeekKey(sem.week.key)}
                  className={cn(
                    'p-2.5 rounded-lg border text-left cursor-pointer transition-all flex flex-col justify-between gap-2 shadow-2xs select-none relative',
                    isSelected
                      ? 'border-primary ring-2 ring-primary bg-primary/5 shadow-sm'
                      : 'border-border bg-card hover:border-primary/50 hover:bg-muted/30',
                    sem.totalProducao > 0 &&
                      !isSelected &&
                      (cap.status === 'verde'
                        ? 'border-emerald-500/40'
                        : cap.status === 'amarelo'
                          ? 'border-amber-500/40'
                          : cap.status === 'vermelho'
                            ? 'border-rose-500/40'
                            : 'border-blue-500/30'),
                  )}
                >
                  {/* Cabeçalho da Semana: Label (Sxx) + Badge do Semáforo */}
                  <div className="flex items-center justify-between gap-1">
                    <div className="flex items-baseline gap-1">
                      <span className="text-xs font-black text-foreground">{sem.week.label}</span>
                      <span className="text-[9px] text-muted-foreground font-mono">
                        {sem.week.formattedRange}
                      </span>
                    </div>

                    <Badge
                      variant="outline"
                      className={cn(
                        'text-[9px] px-1 py-0 border font-bold shrink-0',
                        cap.badgeClass,
                      )}
                    >
                      {cap.status === 'azul' && 'Livre'}
                      {cap.status === 'verde' && 'Meta Full'}
                      {cap.status === 'amarelo' && 'Atenção'}
                      {cap.status === 'vermelho' && 'Sobrecarga'}
                    </Badge>
                  </div>

                  {/* Valor Total da Semana */}
                  <div className="space-y-1">
                    <div className="flex items-baseline justify-between text-[11px]">
                      <span className="text-muted-foreground text-[10px]">Carga:</span>
                      <strong
                        className={cn(
                          'text-xs font-extrabold',
                          sem.totalProducao > 0 ? cap.textClass : 'text-muted-foreground',
                        )}
                      >
                        {formatBRL(sem.totalProducao)}
                      </strong>
                    </div>

                    {/* Barra Visual de Carga / Capacidade */}
                    <div className="w-full bg-muted/60 h-2 rounded-full overflow-hidden border border-border/40">
                      <div
                        className={cn('h-full transition-all duration-300 rounded-full', barColor)}
                        style={{
                          width: `${Math.max(sem.totalProducao > 0 ? 5 : 0, cap.progressPct)}%`,
                        }}
                      />
                    </div>
                  </div>

                  {/* Rodapé do Card da Semana */}
                  <div className="flex items-center justify-between pt-1 border-t border-border/40 text-[10px] text-muted-foreground">
                    <span>
                      {sem.contagemProjetos} {sem.contagemProjetos === 1 ? 'projeto' : 'projetos'}
                    </span>
                    <span className="font-medium text-foreground/80">
                      {sem.cardsDaSemana.length} {sem.cardsDaSemana.length === 1 ? 'amb.' : 'ambs.'}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* 4. DETALHAMENTO DA SEMANA SELECIONADA */}
        {semanaAtiva && (
          <div className="mt-6 rounded-xl border border-border bg-card p-4 shadow-sm space-y-3">
            {/* Header da Semana Selecionada com Resumo em R$ e Semáforo */}
            <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-border">
              <div className="flex items-center gap-2.5">
                <div
                  className={cn(
                    'w-9 h-9 rounded-lg flex items-center justify-center font-bold text-sm shadow-2xs',
                    semanaAtiva.capacidade.bgClass,
                    semanaAtiva.capacidade.textClass,
                    'border',
                    semanaAtiva.capacidade.borderClass,
                  )}
                >
                  {semanaAtiva.week.label}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="text-sm font-bold text-foreground">
                      Detalhamento da Semana {semanaAtiva.week.label} (
                      {semanaAtiva.week.formattedRange})
                    </h4>
                    <Badge
                      variant="outline"
                      className={cn(
                        'text-[10px] px-2 py-0.5 border font-bold',
                        semanaAtiva.capacidade.badgeClass,
                      )}
                    >
                      {semanaAtiva.capacidade.status === 'azul' &&
                        'Capacidade Livre (Até R$ 299.999,99)'}
                      {semanaAtiva.capacidade.status === 'verde' &&
                        'META FULL ATINGIDA (R$ 300.000 a R$ 350.000)'}
                      {semanaAtiva.capacidade.status === 'amarelo' &&
                        'Atenção / Limite Próximo (R$ 350.001 a R$ 399.999)'}
                      {semanaAtiva.capacidade.status === 'vermelho' &&
                        'Sobrecarga Crítica (A partir de R$ 400.000)'}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {semanaAtiva.capacidade.label} • {cardsSemanaAtiva.length} ambientes alocados
                  </p>
                </div>
              </div>

              {/* Valor total e busca na semana */}
              <div className="flex items-center gap-3">
                <div className="text-right">
                  <span className="text-[10px] text-muted-foreground uppercase tracking-wider block">
                    Carga Semanal Total
                  </span>
                  <strong className={cn('text-base font-black', semanaAtiva.capacidade.textClass)}>
                    {formatBRL(semanaAtiva.totalProducao)}
                  </strong>
                </div>

                <div className="relative w-48 sm:w-56">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                  <Input
                    placeholder="Filtrar projetos da semana..."
                    value={searchFilter}
                    onChange={(e) => setSearchFilter(e.target.value)}
                    className="pl-8 h-8 text-xs bg-background border-border"
                  />
                </div>
              </div>
            </div>

            {/* Lista limpa e compacta no formato de linha pílula: [ Cliente | Ambiente | Valor R$ ] */}
            {cardsSemanaAtiva.length === 0 ? (
              <div className="py-8 text-center text-muted-foreground flex flex-col items-center justify-center">
                <Layers className="w-8 h-8 opacity-30 mb-2" />
                <p className="text-xs font-semibold text-foreground">
                  Nenhum projeto alocado na semana {semanaAtiva.week.label}
                </p>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  Arraste projetos da carteira na aba Matriz Mensal para programar nesta semana ISO.
                </p>
              </div>
            ) : (
              <div className="space-y-1.5 max-h-[420px] overflow-y-auto pr-1">
                {cardsSemanaAtiva.map((c) => {
                  const clientName =
                    c.cliente?.nome ||
                    c.formulario?.cliente?.nome ||
                    c.formulario?.nome_cliente ||
                    'Cliente Haussform'

                  const ambienteNome = c.nome_produto || 'Ambiente do Projeto'
                  const valorAmbiente = Number(c.valor_total) || 0
                  const isSubcard = Boolean(c.card_pai_id)

                  return (
                    <div
                      key={c.id}
                      onClick={() => onCardClick?.(c)}
                      className={cn(
                        'flex items-center justify-between gap-2 px-3 py-2 rounded-lg border text-xs transition-colors select-none group',
                        onCardClick && 'cursor-pointer hover:border-primary/50 hover:bg-muted/30',
                        isSubcard
                          ? 'bg-card border-border/80'
                          : 'bg-card border-border font-medium',
                      )}
                      style={
                        c.cor_vinculo
                          ? { borderLeftWidth: '3px', borderLeftColor: c.cor_vinculo }
                          : undefined
                      }
                    >
                      {/* Pílula Compacta: [ Cliente | Ambiente | Valor R$ ] */}
                      <div className="flex items-center gap-2 min-w-0 flex-1 truncate">
                        {/* 1. Cliente */}
                        <div className="flex items-center gap-1.5 min-w-[140px] max-w-[240px] truncate">
                          <Building2 className="w-3.5 h-3.5 text-muted-foreground shrink-0 opacity-70" />
                          <span
                            className="font-bold text-foreground truncate group-hover:text-primary transition-colors uppercase"
                            title={clientName}
                          >
                            {clientName}
                          </span>
                        </div>

                        <span className="text-muted-foreground/60 shrink-0">|</span>

                        {/* 2. Ambiente */}
                        <div className="flex items-center gap-1.5 min-w-0 flex-1 truncate">
                          <span className="text-foreground/90 truncate" title={ambienteNome}>
                            {ambienteNome}
                          </span>
                          {c.codigo_rastreio && (
                            <span className="font-mono text-[9px] bg-muted text-muted-foreground px-1 rounded shrink-0">
                              {c.codigo_rastreio}
                            </span>
                          )}
                          {isSubcard && (
                            <Badge
                              variant="secondary"
                              className="text-[9px] px-1 py-0 h-4 shrink-0 font-normal"
                            >
                              Subcard
                            </Badge>
                          )}
                        </div>

                        <span className="text-muted-foreground/60 shrink-0">|</span>

                        {/* 3. Valor em R$ */}
                        <div className="flex items-center gap-1 shrink-0 text-right min-w-[110px] justify-end">
                          <strong className="font-extrabold text-primary text-xs">
                            {formatBRL(valorAmbiente)}
                          </strong>
                        </div>
                      </div>

                      {/* Status da Análise / PCP */}
                      <div className="shrink-0 flex items-center gap-1.5 pl-2 border-l border-border/60">
                        <span className="text-[10px] text-muted-foreground capitalize">
                          {c.status_analise ? c.status_analise.replace(/_/g, ' ') : 'Planejado'}
                        </span>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
