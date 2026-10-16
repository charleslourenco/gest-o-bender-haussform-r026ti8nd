import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  PcpCardItem,
  PcpReprogramacaoItem,
  fetchReprogramacaoHistorico,
  getProntidaoTecnica,
  PcpLinhaOperacao,
} from '@/services/pcp-planejamento'
import { formatBRL, IsoWeekRange, semanaLabelComAno } from '@/lib/pcp-capacity'
import { formatSafeDate } from '@/lib/date-utils'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  History,
  ExternalLink,
  Calendar,
  ClipboardList,
  Factory,
  Wrench,
  CheckCircle2,
  Clock,
  ShieldAlert,
  AlertCircle,
  Printer,
} from 'lucide-react'
import { PcpOrdemProducaoModal } from './PcpOrdemProducaoModal'

interface PcpSideDrawerProps {
  card: PcpCardItem | null
  open: boolean
  onClose: () => void
  availableWeeks: IsoWeekRange[]
  onUpdateSemana: (
    cardId: string,
    linha: PcpLinhaOperacao,
    novaSemana: string | null,
    semanaAnterior: string | null,
    motivo?: string,
  ) => Promise<void>
  onUpdateMes?: (
    cardId: string,
    linha: PcpLinhaOperacao,
    novoMes: string | null,
    mesAnterior: string | null,
    motivo?: string,
  ) => Promise<void>
}

const MESES_OPCOES = [
  { key: '01', label: 'Janeiro' },
  { key: '02', label: 'Fevereiro' },
  { key: '03', label: 'Março' },
  { key: '04', label: 'Abril' },
  { key: '05', label: 'Maio' },
  { key: '06', label: 'Junho' },
  { key: '07', label: 'Julho' },
  { key: '08', label: 'Agosto' },
  { key: '09', label: 'Setembro' },
  { key: '10', label: 'Outubro' },
  { key: '11', label: 'Novembro' },
  { key: '12', label: 'Dezembro' },
]

export const PcpSideDrawer: React.FC<PcpSideDrawerProps> = ({
  card,
  open,
  onClose,
  availableWeeks,
  onUpdateSemana,
  onUpdateMes,
}) => {
  const navigate = useNavigate()
  const [historico, setHistorico] = useState<PcpReprogramacaoItem[]>([])
  const [loadingHistorico, setLoadingHistorico] = useState(false)
  const [savingLinha, setSavingLinha] = useState<PcpLinhaOperacao | null>(null)
  const [opModalOpen, setOpModalOpen] = useState(false)

  useEffect(() => {
    if (card && open) {
      setLoadingHistorico(true)
      fetchReprogramacaoHistorico(card.id)
        .then((data) => setHistorico(data))
        .catch((err) => console.error(err))
        .finally(() => setLoadingHistorico(false))
    } else {
      setHistorico([])
    }
  }, [card?.id, open])

  if (!card) return null

  const prontidao = getProntidaoTecnica(card)
  const clientName =
    card?.cliente?.nome ||
    card?.formulario?.cliente?.nome ||
    card?.formulario?.nome_cliente ||
    'Cliente não informado'

  const isSubcard = Boolean(card?.card_pai_id)

  const handleSemanaChange = async (linha: PcpLinhaOperacao, novaSemanaValue: string) => {
    const val = novaSemanaValue === 'none' ? null : novaSemanaValue
    const currentSemana =
      linha === 'analise'
        ? card.semana_planejada_analise
        : linha === 'producao'
          ? card.semana_planejada_producao
          : card.semana_planejada_montagem

    if (val === currentSemana) return

    setSavingLinha(linha)
    try {
      await onUpdateSemana(card.id, linha, val, currentSemana)
      // Atualizar lista local de histórico
      const updated = await fetchReprogramacaoHistorico(card.id)
      setHistorico(updated)
    } finally {
      setSavingLinha(null)
    }
  }

  const handleMesChange = async (linha: PcpLinhaOperacao, novoMesValue: string) => {
    if (!onUpdateMes) return
    const val = novoMesValue === 'none' ? null : novoMesValue
    const currentMes =
      linha === 'analise'
        ? card.mes_planejado_analise
        : linha === 'producao'
          ? card.mes_planejado_producao
          : card.mes_planejado_montagem

    if (val === currentMes) return

    setSavingLinha(linha)
    try {
      await onUpdateMes(card.id, linha, val, currentMes)
      const updated = await fetchReprogramacaoHistorico(card.id)
      setHistorico(updated)
    } finally {
      setSavingLinha(null)
    }
  }

  const renderProntidaoIcon = () => {
    switch (prontidao.status) {
      case 'pronto':
        return <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
      case 'bloqueado':
        return <ShieldAlert className="w-4 h-4 text-rose-600 dark:text-rose-400" />
      case 'em_analise':
        return <Clock className="w-4 h-4 text-blue-600 dark:text-blue-400" />
      default:
        return <AlertCircle className="w-4 h-4 text-slate-400" />
    }
  }

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-lg p-0 flex flex-col bg-card border-l border-border h-full shadow-2xl overflow-hidden"
      >
        {/* Header do Drawer */}
        <div className="p-5 border-b border-border bg-card shrink-0">
          <SheetHeader className="space-y-1 text-left">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                {card.codigo_rastreio ? (
                  <strong className="text-primary font-bold bg-primary/10 px-2 py-0.5 rounded">
                    {card.codigo_rastreio}
                  </strong>
                ) : (
                  <span>Sem rastreio</span>
                )}
                {isSubcard && (
                  <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                    Subcard
                  </Badge>
                )}
              </span>

              <Badge
                variant="outline"
                className={`text-xs px-2 py-0.5 border flex items-center gap-1 ${prontidao.badgeClass}`}
              >
                {renderProntidaoIcon()}
                <span>{prontidao.label}</span>
              </Badge>
            </div>

            <SheetTitle className="text-lg font-bold text-foreground leading-snug">
              {card.nome_produto}
            </SheetTitle>
            <SheetDescription className="text-xs text-muted-foreground">
              Cliente: <strong className="text-foreground">{clientName}</strong>
            </SheetDescription>
          </SheetHeader>

          {/* BOTÃO DE DESTAQUE: GERAR ORDEM DE PRODUÇÃO (OP) */}
          <div className="mt-3 pt-3 border-t border-border">
            <Button
              type="button"
              variant="default"
              size="sm"
              onClick={() => setOpModalOpen(true)}
              className="w-full h-9 bg-primary text-primary-foreground font-bold text-xs gap-2 shadow-sm hover:bg-primary/90 transition-all cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>🖨️ Gerar Ordem de Produção (OP)</span>
            </Button>
          </div>

          {/* Atalhos rápidos para os Kanbans operacionais originais (conforme especificação item 4) */}
          <div className="flex flex-wrap items-center gap-1.5 mt-3 pt-3 border-t border-border/60">
            <span className="text-[10px] font-semibold text-muted-foreground uppercase mr-1">
              Kanban Original:
            </span>

            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                onClose()
                navigate('/pcp/analise-tecnica')
              }}
              className="h-7 px-2.5 text-xs gap-1 hover:border-primary hover:text-primary transition-colors"
            >
              <ClipboardList className="w-3.5 h-3.5" />
              Análise Técnica
              <ExternalLink className="w-2.5 h-2.5 opacity-60" />
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                onClose()
                navigate('/pcp/producao')
              }}
              className="h-7 px-2.5 text-xs gap-1 hover:border-primary hover:text-primary transition-colors"
            >
              <Factory className="w-3.5 h-3.5" />
              Produção
              <ExternalLink className="w-2.5 h-2.5 opacity-60" />
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                onClose()
                navigate('/pcp/montagem')
              }}
              className="h-7 px-2.5 text-xs gap-1 hover:border-primary hover:text-primary transition-colors"
            >
              <Wrench className="w-3.5 h-3.5" />
              Montagem
              <ExternalLink className="w-2.5 h-2.5 opacity-60" />
            </Button>
          </div>
        </div>

        {/* Corpo scrollável do Drawer */}
        <div className="flex-1 overflow-y-auto p-5 space-y-6">
          {/* Card de Resumo Financeiro e Técnico */}
          <div className="grid grid-cols-2 gap-3 p-3.5 rounded-xl bg-muted/40 border border-border">
            <div>
              <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">
                Valor Total do Item
              </span>
              <p className="text-lg font-black text-primary mt-0.5">
                {formatBRL(card.valor_total || 0)}
              </p>
              {card.desconto_percentual > 0 && (
                <span className="text-[10px] text-muted-foreground">
                  Desconto aplicado: {card.desconto_percentual}%
                </span>
              )}
            </div>

            <div>
              <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">
                Status Operacional
              </span>
              <p className="text-sm font-semibold text-foreground mt-1 capitalize">
                {(card.status_analise || '').replace(/_/g, ' ')}
              </p>
              <span className="text-[10px] text-muted-foreground">Fase no Kanban nativo</span>
            </div>

            {card.descricao && (
              <div className="col-span-2 pt-2 border-t border-border/50">
                <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">
                  Descrição / Observações
                </span>
                <p className="text-xs text-foreground mt-0.5 leading-relaxed">{card.descricao}</p>
              </div>
            )}
          </div>

          {/* Programação Temporal por Linha de Operação */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-primary" />
                Programação por Linha Operacional
              </h3>
              <span className="text-[10px] text-muted-foreground">(Apenas visão temporal)</span>
            </div>

            <div className="space-y-2.5">
              {/* Linha 1: Análise Técnica */}
              <div className="p-3 rounded-lg border border-border bg-card flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span className="text-base">📐</span>
                  <div>
                    <p className="text-xs font-bold text-foreground">Análise Técnica</p>
                    <span className="text-[10px] text-muted-foreground">
                      Engenharia e Caderno Técnico
                    </span>
                  </div>
                </div>

                <div className="w-40 shrink-0">
                  <Select
                    disabled={savingLinha === 'analise'}
                    value={card.semana_planejada_analise || 'none'}
                    onValueChange={(val) => handleSemanaChange('analise', val)}
                  >
                    <SelectTrigger className="h-8 text-xs bg-background">
                      <SelectValue placeholder="Sem semana" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">-- Não agendado --</SelectItem>
                      {availableWeeks.map((w) => (
                        <SelectItem key={w.key} value={semanaLabelComAno(w)}>
                          {semanaLabelComAno(w)} ({w.formattedRange})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Linha 2: Produção */}
              <div className="p-3 rounded-lg border border-border bg-card flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span className="text-base">🏭</span>
                  <div>
                    <p className="text-xs font-bold text-foreground">Produção</p>
                    <span className="text-[10px] text-muted-foreground">
                      Fabricação e Capacidade Fabril
                    </span>
                  </div>
                </div>

                <div className="w-40 shrink-0">
                  <Select
                    disabled={savingLinha === 'producao'}
                    value={card.semana_planejada_producao || 'none'}
                    onValueChange={(val) => handleSemanaChange('producao', val)}
                  >
                    <SelectTrigger className="h-8 text-xs bg-background">
                      <SelectValue placeholder="Sem semana" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">-- Não agendado --</SelectItem>
                      {availableWeeks.map((w) => (
                        <SelectItem key={w.key} value={semanaLabelComAno(w)}>
                          {semanaLabelComAno(w)} ({w.formattedRange})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Linha 3: Montagem */}
              <div className="p-3 rounded-lg border border-border bg-card flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span className="text-base">🔧</span>
                  <div>
                    <p className="text-xs font-bold text-foreground">Montagem</p>
                    <span className="text-[10px] text-muted-foreground">
                      Instalação e Finalização
                    </span>
                  </div>
                </div>

                <div className="w-40 shrink-0">
                  <Select
                    disabled={savingLinha === 'montagem'}
                    value={card.semana_planejada_montagem || 'none'}
                    onValueChange={(val) => handleSemanaChange('montagem', val)}
                  >
                    <SelectTrigger className="h-8 text-xs bg-background">
                      <SelectValue placeholder="Sem semana" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">-- Não agendado --</SelectItem>
                      {availableWeeks.map((w) => (
                        <SelectItem key={w.key} value={semanaLabelComAno(w)}>
                          {semanaLabelComAno(w)} ({w.formattedRange})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          </div>

          {/* Histórico de Reprogramação (conforme especificação item 4) */}
          <div className="space-y-3 pt-2 border-t border-border">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-1.5">
                <History className="w-3.5 h-3.5 text-primary" />
                Histórico de Reprogramação
              </h3>
              <span className="text-[10px] text-muted-foreground">
                {historico.length} {historico.length === 1 ? 'registro' : 'registros'}
              </span>
            </div>

            {loadingHistorico ? (
              <div className="p-4 text-center text-xs text-muted-foreground">
                Carregando histórico...
              </div>
            ) : historico.length === 0 ? (
              <div className="p-4 rounded-lg bg-muted/30 border border-border/50 text-center text-xs text-muted-foreground">
                Nenhuma reprogramação registrada para este item ainda.
              </div>
            ) : (
              <div className="space-y-2">
                {historico.map((h) => {
                  const linhaLabel =
                    h.linha_operacao === 'analise'
                      ? 'Análise Técnica'
                      : h.linha_operacao === 'producao'
                        ? 'Produção'
                        : 'Montagem'

                  return (
                    <div
                      key={h.id}
                      className="p-2.5 rounded-lg border border-border bg-card text-xs space-y-1 shadow-2xs"
                    >
                      <div className="flex items-center justify-between text-muted-foreground text-[10px]">
                        <span className="font-semibold text-foreground">{linhaLabel}</span>
                        <span>{formatSafeDate(h.criado_em, 'dd/MM/yyyy HH:mm')}</span>
                      </div>

                      <div className="flex items-center gap-2 text-xs">
                        <span className="text-muted-foreground">
                          {h.semana_anterior ? (
                            <strong className="text-foreground">{h.semana_anterior}</strong>
                          ) : h.data_anterior ? (
                            <strong className="text-foreground">
                              {formatSafeDate(h.data_anterior, 'dd/MM/yyyy')}
                            </strong>
                          ) : h.mes_anterior ? (
                            <strong className="text-foreground">{h.mes_anterior}</strong>
                          ) : (
                            <span className="italic">Não definido</span>
                          )}
                        </span>
                        <span className="text-primary font-bold">➔</span>
                        <span>
                          {h.semana_nova ? (
                            <strong className="text-primary">{h.semana_nova}</strong>
                          ) : h.data_nova ? (
                            <strong className="text-primary">
                              {formatSafeDate(h.data_nova, 'dd/MM/yyyy')}
                            </strong>
                          ) : h.mes_novo ? (
                            <strong className="text-primary">{h.mes_novo}</strong>
                          ) : (
                            <span className="italic text-muted-foreground">Removido</span>
                          )}
                        </span>
                      </div>

                      <div className="text-[10px] text-muted-foreground flex items-center justify-between pt-0.5">
                        <span>{h.motivo || 'Reprogramação'}</span>
                        {h.usuario?.nome && <span>Por: {h.usuario.nome}</span>}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>

        {/* Rodapé do Drawer */}
        <div className="p-3 border-t border-border bg-muted/20 shrink-0 flex items-center justify-between">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setOpModalOpen(true)}
            className="text-xs gap-1.5 font-semibold text-primary border-primary/30 hover:bg-primary/10"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Ficha de Fábrica (OP)</span>
          </Button>

          <Button variant="outline" size="sm" onClick={onClose} className="text-xs">
            Fechar Painel
          </Button>
        </div>

        {/* Modal de Ordem de Produção (Print Preview e Emissão A4) */}
        <PcpOrdemProducaoModal
          open={opModalOpen}
          onClose={() => setOpModalOpen(false)}
          card={card}
        />
      </SheetContent>
    </Sheet>
  )
}
