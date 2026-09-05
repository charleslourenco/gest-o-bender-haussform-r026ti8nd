import { useState, useEffect, useMemo, useCallback } from 'react'
import { format, subDays, startOfMonth, endOfMonth, subMonths } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import {
  Calendar as CalendarIcon,
  ChevronDown,
  Check,
  RotateCcw,
  Users,
  Clock,
  Activity,
  Layers,
  Search,
  RefreshCw,
  X,
  FileSpreadsheet,
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'

import {
  fetchEquipeGestaoPessoas,
  fetchRelatorioAlocacao,
  type MembroEquipeFiltro,
  type AlocacaoPeriodoItem,
  type RelatorioAlocacaoResumo,
} from '@/services/relatorio-alocacao'

interface RelatorioAlocacaoProps {
  modulo?: 'producao' | 'montagem'
}

interface PeriodPreset {
  id: string
  label: string
  getRange: () => { de: string; ate: string }
}

const PERIOD_PRESETS: PeriodPreset[] = [
  {
    id: 'hoje',
    label: 'Hoje',
    getRange: () => {
      const today = format(new Date(), 'yyyy-MM-dd')
      return { de: today, ate: today }
    },
  },
  {
    id: 'ontem',
    label: 'Ontem',
    getRange: () => {
      const yesterday = format(subDays(new Date(), 1), 'yyyy-MM-dd')
      return { de: yesterday, ate: yesterday }
    },
  },
  {
    id: '7dias',
    label: 'Últimos 7 dias',
    getRange: () => {
      const now = new Date()
      return {
        de: format(subDays(now, 6), 'yyyy-MM-dd'),
        ate: format(now, 'yyyy-MM-dd'),
      }
    },
  },
  {
    id: '30dias',
    label: 'Últimos 30 dias',
    getRange: () => {
      const now = new Date()
      return {
        de: format(subDays(now, 29), 'yyyy-MM-dd'),
        ate: format(now, 'yyyy-MM-dd'),
      }
    },
  },
  {
    id: 'este_mes',
    label: 'Este mês',
    getRange: () => {
      const now = new Date()
      return {
        de: format(startOfMonth(now), 'yyyy-MM-dd'),
        ate: format(endOfMonth(now), 'yyyy-MM-dd'),
      }
    },
  },
  {
    id: 'mes_passado',
    label: 'Mês passado',
    getRange: () => {
      const lastMonth = subMonths(new Date(), 1)
      return {
        de: format(startOfMonth(lastMonth), 'yyyy-MM-dd'),
        ate: format(endOfMonth(lastMonth), 'yyyy-MM-dd'),
      }
    },
  },
]

export function RelatorioAlocacao({ modulo }: RelatorioAlocacaoProps) {
  // Estado dos filtros
  const [equipe, setEquipe] = useState<MembroEquipeFiltro[]>([])
  const [pessoaFilter, setPessoaFilter] = useState('all')
  const [dataDe, setDataDe] = useState('')
  const [dataAte, setDataAte] = useState('')
  const [activePreset, setActivePreset] = useState<string | null>(null)
  const [isCustomOpen, setIsCustomOpen] = useState(false)
  const [periodDropdownOpen, setPeriodDropdownOpen] = useState(false)
  const [buscaTabela, setBuscaTabela] = useState('')

  // Estado dos dados
  const [loading, setLoading] = useState(true)
  const [itens, setItens] = useState<AlocacaoPeriodoItem[]>([])
  const [resumo, setResumo] = useState<RelatorioAlocacaoResumo>({
    totalAlocacoes: 0,
    tempoMedioFormatado: '—',
    alocacoesAtivas: 0,
  })

  // Carregar equipe da Gestão de Pessoas (CLT + PJ)
  useEffect(() => {
    let isMounted = true
    const loadEquipe = async () => {
      const membros = await fetchEquipeGestaoPessoas(modulo)
      if (isMounted) {
        setEquipe(membros)
      }
    }
    loadEquipe()
    return () => {
      isMounted = false
    }
  }, [modulo])

  // Buscar dados do relatório
  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const result = await fetchRelatorioAlocacao(
        {
          pessoaId: pessoaFilter,
          dataDe,
          dataAte,
        },
        modulo,
      )
      setItens(result.itens)
      setResumo(result.resumo)
    } catch (err) {
      console.error('Erro ao carregar dados do relatório de alocação:', err)
      setItens([])
      setResumo({
        totalAlocacoes: 0,
        tempoMedioFormatado: '—',
        alocacoesAtivas: 0,
      })
    } finally {
      setLoading(false)
    }
  }, [pessoaFilter, dataDe, dataAte, modulo])

  useEffect(() => {
    loadData()
  }, [loadData])

  // Ações de filtro de período
  const handleApplyPreset = (preset: PeriodPreset) => {
    const range = preset.getRange()
    setDataDe(range.de)
    setDataAte(range.ate)
    setActivePreset(preset.id)
    setPeriodDropdownOpen(false)
  }

  const handleClearPeriod = () => {
    setDataDe('')
    setDataAte('')
    setActivePreset(null)
    setPeriodDropdownOpen(false)
  }

  const handleClearFilters = () => {
    setPessoaFilter('all')
    setDataDe('')
    setDataAte('')
    setActivePreset(null)
    setBuscaTabela('')
  }

  const hasActiveFilters =
    pessoaFilter !== 'all' || dataDe !== '' || dataAte !== '' || buscaTabela !== ''

  // Filtragem rápida da tabela por texto (card, cliente ou pessoa)
  const filteredItens = useMemo(() => {
    if (!buscaTabela.trim()) return itens
    const q = buscaTabela.toLowerCase().trim()
    return itens.filter(
      (item) =>
        item.cardNome.toLowerCase().includes(q) ||
        item.clienteNome.toLowerCase().includes(q) ||
        item.pessoaNome.toLowerCase().includes(q),
    )
  }, [itens, buscaTabela])

  const formatDateTime = (isoString: string) => {
    try {
      return format(new Date(isoString), 'dd/MM/yyyy HH:mm', { locale: ptBR })
    } catch {
      return isoString
    }
  }

  return (
    <div className="flex-1 overflow-y-auto p-4 md:p-6 bg-background space-y-4">
      {/* Barra de Filtros */}
      <div className="bg-card border border-border rounded-xl p-4 shadow-xs">
        <div className="flex flex-wrap items-end gap-3 justify-between">
          <div className="flex flex-wrap items-end gap-3 flex-1 min-w-[280px]">
            {/* Filtro por Pessoa (Lista única CLT + PJ com Badges) */}
            <div className="flex flex-col gap-1.5 min-w-[220px] max-w-sm flex-1">
              <Label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-primary" />
                Profissional / Montador
              </Label>
              <Select value={pessoaFilter} onValueChange={setPessoaFilter}>
                <SelectTrigger className="h-9 text-xs bg-background">
                  <SelectValue placeholder="Todas as pessoas" />
                </SelectTrigger>
                <SelectContent className="max-h-[300px]">
                  <SelectItem value="all" className="text-xs font-medium">
                    Todas as pessoas (CLT + PJ)
                  </SelectItem>
                  {equipe.map((p) => (
                    <SelectItem key={p.id} value={p.id} className="text-xs">
                      <div className="flex items-center justify-between w-full gap-2">
                        <span className="truncate">{p.nome}</span>
                        <Badge
                          variant="secondary"
                          className={cn(
                            'text-[9px] px-1.5 py-0 h-4 font-bold border uppercase shrink-0',
                            p.tipo === 'CLT'
                              ? 'bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-500/30'
                              : 'bg-purple-500/15 text-purple-700 dark:text-purple-300 border-purple-500/30',
                          )}
                        >
                          {p.tipo}
                        </Badge>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Filtro por Período com Presets exatamente idêntico ao Clientes/Dashboard */}
            <div className="flex flex-col gap-1.5">
              <Label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                <CalendarIcon className="w-3.5 h-3.5 text-primary" />
                Período
              </Label>
              <Popover open={periodDropdownOpen} onOpenChange={setPeriodDropdownOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="h-9 px-3 border-border text-foreground hover:bg-muted font-medium text-xs gap-1.5 bg-background justify-between min-w-[180px]"
                  >
                    <span className="flex items-center gap-1.5 truncate">
                      <CalendarIcon className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                      {(() => {
                        if (activePreset) {
                          const p = PERIOD_PRESETS.find((x) => x.id === activePreset)
                          if (p) return p.label
                        }
                        if (dataDe || dataAte) {
                          if (dataDe && dataAte) {
                            try {
                              const deFormatted = format(
                                new Date(dataDe + 'T12:00:00'),
                                'dd/MM/yyyy',
                                { locale: ptBR },
                              )
                              const ateFormatted = format(
                                new Date(dataAte + 'T12:00:00'),
                                'dd/MM/yyyy',
                                { locale: ptBR },
                              )
                              return `${deFormatted} - ${ateFormatted}`
                            } catch {
                              return `${dataDe} a ${dataAte}`
                            }
                          }
                          return dataDe ? `A partir de ${dataDe}` : `Até ${dataAte}`
                        }
                        return 'Todo o histórico'
                      })()}
                    </span>
                    <ChevronDown className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent
                  align="start"
                  className="w-56 p-1 bg-popover border-border shadow-md z-50"
                >
                  <div className="flex flex-col space-y-0.5">
                    {PERIOD_PRESETS.map((preset) => {
                      const isSelected = activePreset === preset.id
                      return (
                        <button
                          key={preset.id}
                          type="button"
                          onClick={() => handleApplyPreset(preset)}
                          className="w-full flex items-center justify-between px-2.5 py-1.5 text-xs text-foreground hover:bg-muted rounded-sm transition-colors text-left"
                        >
                          <span>{preset.label}</span>
                          {isSelected && <Check className="h-3.5 w-3.5 text-primary shrink-0" />}
                        </button>
                      )
                    })}

                    <div className="border-t border-border my-1" />

                    <button
                      type="button"
                      onClick={() => setIsCustomOpen((prev) => !prev)}
                      className="w-full flex items-center justify-between px-2.5 py-1.5 text-xs text-foreground hover:bg-muted rounded-sm transition-colors text-left font-medium"
                    >
                      <span>Personalizado</span>
                      <div className="flex items-center gap-1">
                        {activePreset === 'custom' && (
                          <Check className="h-3.5 w-3.5 text-primary shrink-0" />
                        )}
                        <ChevronDown
                          className={cn(
                            'h-3.5 w-3.5 text-muted-foreground transition-transform duration-200',
                            isCustomOpen && 'rotate-180',
                          )}
                        />
                      </div>
                    </button>

                    {isCustomOpen && (
                      <div className="p-2 space-y-2 bg-muted/40 rounded-md border border-border/60 mt-1">
                        <div className="space-y-1">
                          <Label className="text-[11px] font-medium text-muted-foreground">
                            De
                          </Label>
                          <Input
                            type="date"
                            value={dataDe}
                            onChange={(e) => {
                              setDataDe(e.target.value)
                              setActivePreset('custom')
                            }}
                            className="h-8 text-xs bg-background"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-[11px] font-medium text-muted-foreground">
                            Até
                          </Label>
                          <Input
                            type="date"
                            value={dataAte}
                            onChange={(e) => {
                              setDataAte(e.target.value)
                              setActivePreset('custom')
                            }}
                            className="h-8 text-xs bg-background"
                          />
                        </div>
                      </div>
                    )}

                    {(dataDe || dataAte || activePreset) && (
                      <>
                        <div className="border-t border-border my-1" />
                        <button
                          type="button"
                          onClick={handleClearPeriod}
                          className="w-full flex items-center gap-1.5 px-2.5 py-1.5 text-xs text-muted-foreground hover:text-foreground hover:bg-muted rounded-sm transition-colors text-left"
                        >
                          <RotateCcw className="h-3 w-3" />
                          Limpar período
                        </button>
                      </>
                    )}
                  </div>
                </PopoverContent>
              </Popover>
            </div>

            {/* Busca textual por card ou cliente */}
            <div className="flex flex-col gap-1.5 min-w-[160px] flex-1">
              <Label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                <Search className="w-3.5 h-3.5 text-primary" />
                Busca Rápida
              </Label>
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                <Input
                  placeholder="Filtrar por card, cliente ou pessoa..."
                  value={buscaTabela}
                  onChange={(e) => setBuscaTabela(e.target.value)}
                  className="pl-8 h-9 text-xs bg-background"
                />
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 pt-2 md:pt-0">
            <Button
              variant="outline"
              size="sm"
              onClick={handleClearFilters}
              disabled={!hasActiveFilters}
              className="h-9 text-xs"
              title="Limpar todos os filtros"
            >
              <X className="w-3.5 h-3.5 mr-1.5" />
              Limpar
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={loadData}
              disabled={loading}
              className="h-9 text-xs"
              title="Recarregar dados"
            >
              <RefreshCw className={cn('w-3.5 h-3.5 mr-1.5', loading && 'animate-spin')} />
              Atualizar
            </Button>
          </div>
        </div>
      </div>

      {/* Resumo no topo */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="bg-card border-border shadow-xs">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-primary/10 text-primary shrink-0">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground">Total de Alocações</p>
              {loading ? (
                <Skeleton className="h-7 w-16 mt-1" />
              ) : (
                <h3 className="text-xl font-bold text-foreground tracking-tight">
                  {resumo.totalAlocacoes}
                </h3>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border shadow-xs">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 shrink-0">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground">Tempo Médio por Serviço</p>
              {loading ? (
                <Skeleton className="h-7 w-24 mt-1" />
              ) : (
                <h3 className="text-xl font-bold text-foreground tracking-tight">
                  {resumo.tempoMedioFormatado}
                </h3>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border shadow-xs">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 shrink-0">
              <Activity className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground">Alocações Ativas</p>
              {loading ? (
                <Skeleton className="h-7 w-16 mt-1" />
              ) : (
                <h3 className="text-xl font-bold text-foreground tracking-tight">
                  {resumo.alocacoesAtivas}
                </h3>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabela de Resultados */}
      <div className="bg-card border border-border rounded-xl shadow-xs overflow-hidden">
        <div className="px-4 py-3 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileSpreadsheet className="w-4 h-4 text-primary" />
            <h3 className="text-sm font-semibold text-foreground">
              Histórico de Alocações {filteredItens.length > 0 && `(${filteredItens.length})`}
            </h3>
          </div>
          <span className="text-[11px] text-muted-foreground">
            Tempos calculados automaticamente pelos eventos de auditoria
          </span>
        </div>

        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-muted/40">
              <TableRow className="border-b border-border text-xs">
                <TableHead className="font-semibold text-foreground">Profissional</TableHead>
                <TableHead className="font-semibold text-foreground">Card / Subcard</TableHead>
                <TableHead className="font-semibold text-foreground">Cliente</TableHead>
                <TableHead className="font-semibold text-foreground whitespace-nowrap">
                  Início
                </TableHead>
                <TableHead className="font-semibold text-foreground whitespace-nowrap">
                  Fim
                </TableHead>
                <TableHead className="font-semibold text-foreground text-right whitespace-nowrap">
                  Duração
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell>
                      <Skeleton className="h-4 w-32" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-4 w-40" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-4 w-28" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-4 w-24" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-4 w-24" />
                    </TableCell>
                    <TableCell className="text-right">
                      <Skeleton className="h-4 w-16 ml-auto" />
                    </TableCell>
                  </TableRow>
                ))
              ) : filteredItens.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-36 text-center text-muted-foreground">
                    <div className="flex flex-col items-center justify-center gap-1.5">
                      <Clock className="w-7 h-7 text-muted-foreground/40" />
                      <p className="text-sm font-medium">
                        Nenhuma alocação encontrada para o período selecionado.
                      </p>
                      <p className="text-xs text-muted-foreground/70">
                        Ajuste os filtros de pessoa ou período acima para visualizar o histórico.
                      </p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                filteredItens.map((item) => (
                  <TableRow
                    key={item.id}
                    className="border-b border-border hover:bg-muted/30 text-xs transition-colors"
                  >
                    <TableCell className="font-medium text-foreground">
                      <div className="flex items-center gap-1.5">
                        <span className="truncate max-w-[180px]">{item.pessoaNome}</span>
                        <Badge
                          variant="secondary"
                          className={cn(
                            'text-[9px] px-1 py-0 h-4 font-bold border uppercase shrink-0',
                            item.tipoOrigem === 'CLT'
                              ? 'bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-500/30'
                              : 'bg-purple-500/15 text-purple-700 dark:text-purple-300 border-purple-500/30',
                          )}
                        >
                          {item.tipoOrigem}
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell className="font-medium text-foreground">
                      <span className="line-clamp-1">{item.cardNome}</span>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      <span className="line-clamp-1">{item.clienteNome}</span>
                    </TableCell>
                    <TableCell className="text-muted-foreground whitespace-nowrap">
                      {formatDateTime(item.inicio)}
                    </TableCell>
                    <TableCell className="whitespace-nowrap">
                      {item.emAndamento ? (
                        <Badge
                          variant="outline"
                          className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 font-semibold gap-1 text-[10px] px-2 py-0.5"
                        >
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                          Em andamento
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground">
                          {item.fim ? formatDateTime(item.fim) : '—'}
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-right font-medium text-foreground whitespace-nowrap">
                      <span
                        className={cn(
                          item.emAndamento
                            ? 'text-emerald-600 dark:text-emerald-400 font-semibold'
                            : 'text-foreground',
                        )}
                        title={
                          item.emAndamento
                            ? 'Tempo corrido até o momento'
                            : 'Tempo total de alocação'
                        }
                      >
                        {item.duracaoFormatada}
                      </span>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  )
}
