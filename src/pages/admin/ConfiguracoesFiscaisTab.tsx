import { useState, useEffect, useMemo } from 'react'
import {
  RegimeTributario,
  REGIME_TRIBUTARIO_LABELS,
  REGIME_TRIBUTARIO_DESCRIPTIONS,
  ConfiguracaoFiscal,
  AliquotaFiscal,
  fetchConfiguracaoFiscalAtiva,
  fetchHistoricoConfiguracoesFiscais,
  trocarRegimeFiscal,
  updateConfiguracaoFiscal,
  fetchAliquotasFiscais,
  createAliquotaFiscal,
  updateAliquotaFiscal,
  setAliquotaFiscalAtiva,
} from '@/services/configuracoes-fiscais'
import { useToast } from '@/hooks/use-toast'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
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
import {
  Calculator,
  Plus,
  Pencil,
  CheckCircle2,
  XCircle,
  Loader2,
  Archive,
  RefreshCw,
  Landmark,
  Calendar,
  AlertTriangle,
  History,
  ArrowRight,
  ShieldAlert,
} from 'lucide-react'

const REGIMES: RegimeTributario[] = ['simples_nacional', 'lucro_presumido', 'lucro_real']

function fmtDate(d: string | null) {
  if (!d) return 'Vigente'
  const [year, month, day] = d.split('-')
  if (year && month && day) return `${day}/${month}/${year}`
  return new Date(d).toLocaleDateString('pt-BR')
}

export function ConfiguracoesFiscaisTab() {
  const { toast } = useToast()

  const [loading, setLoading] = useState(true)
  const [configAtiva, setConfigAtiva] = useState<ConfiguracaoFiscal | null>(null)
  const [historicoRegimes, setHistoricoRegimes] = useState<ConfiguracaoFiscal[]>([])
  const [aliquotas, setAliquotas] = useState<AliquotaFiscal[]>([])
  const [selectedRegimeTab, setSelectedRegimeTab] = useState<RegimeTributario>('simples_nacional')

  // Modal: Trocar Regime Fiscal
  const [isTrocarRegimeOpen, setIsTrocarRegimeOpen] = useState(false)
  const [trocaRegime, setTrocaRegime] = useState<RegimeTributario>('simples_nacional')
  const [trocaDataInicio, setTrocaDataInicio] = useState(new Date().toISOString().split('T')[0])
  const [trocaObservacoes, setTrocaObservacoes] = useState('')
  const [trocandoRegime, setTrocandoRegime] = useState(false)

  // Modal: Editar Observações da Configuração Ativa
  const [isEditObsOpen, setIsEditObsOpen] = useState(false)
  const [editObservacoes, setEditObservacoes] = useState('')
  const [savingObs, setSavingObs] = useState(false)

  // Modal: Criar / Editar Alíquota
  const [isAliquotaModalOpen, setIsAliquotaModalOpen] = useState(false)
  const [editingAliquota, setEditingAliquota] = useState<AliquotaFiscal | null>(null)
  const [savingAliquota, setSavingAliquota] = useState(false)
  const [formImpostoNome, setFormImpostoNome] = useState('')
  const [formImpostoRegime, setFormImpostoRegime] = useState<RegimeTributario>('simples_nacional')
  const [formImpostoAliquota, setFormImpostoAliquota] = useState('')
  const [formImpostoBase, setFormImpostoBase] = useState('100')
  const [formImpostoInicio, setFormImpostoInicio] = useState(new Date().toISOString().split('T')[0])
  const [formImpostoFim, setFormImpostoFim] = useState('')
  const [formImpostoDescricao, setFormImpostoDescricao] = useState('')
  const [formImpostoAtivo, setFormImpostoAtivo] = useState(true)

  const loadData = async () => {
    setLoading(true)
    try {
      const [configRes, histRes, aliqRes] = await Promise.all([
        fetchConfiguracaoFiscalAtiva(),
        fetchHistoricoConfiguracoesFiscais(),
        fetchAliquotasFiscais(null, true),
      ])

      if (configRes.error) throw new Error(configRes.error)
      if (histRes.error) throw new Error(histRes.error)
      if (aliqRes.error) throw new Error(aliqRes.error)

      setConfigAtiva(configRes.data)
      setHistoricoRegimes(histRes.data || [])
      setAliquotas(aliqRes.data || [])

      if (configRes.data?.regime_tributario) {
        setSelectedRegimeTab(configRes.data.regime_tributario as RegimeTributario)
      }
    } catch (err: any) {
      toast({
        title: 'Erro ao carregar dados fiscais',
        description: err.message || 'Falha na comunicação com o banco.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  // Abertura do modal de troca de regime
  const handleOpenTrocarRegime = () => {
    if (configAtiva) {
      // Sugerir outro regime padrão
      const other = REGIMES.find((r) => r !== configAtiva.regime_tributario) || 'simples_nacional'
      setTrocaRegime(other)
    } else {
      setTrocaRegime('simples_nacional')
    }
    setTrocaDataInicio(new Date().toISOString().split('T')[0])
    setTrocaObservacoes('')
    setIsTrocarRegimeOpen(true)
  }

  const handleConfirmTrocarRegime = async (e: React.FormEvent) => {
    e.preventDefault()
    setTrocandoRegime(true)
    try {
      const { data, error } = await trocarRegimeFiscal({
        regime_tributario: trocaRegime,
        data_inicio_vigencia: trocaDataInicio,
        observacoes: trocaObservacoes || null,
      })
      if (error) throw new Error(error)

      toast({
        title: 'Regime Tributário Atualizado',
        description: `O regime fiscal foi alterado para ${REGIME_TRIBUTARIO_LABELS[trocaRegime]} a partir de ${fmtDate(trocaDataInicio)}.`,
      })
      setIsTrocarRegimeOpen(false)
      if (data?.regime_tributario) {
        setSelectedRegimeTab(data.regime_tributario as RegimeTributario)
      }
      loadData()
    } catch (err: any) {
      toast({
        title: 'Erro ao trocar regime fiscal',
        description: err.message,
        variant: 'destructive',
      })
    } finally {
      setTrocandoRegime(false)
    }
  }

  const handleOpenEditObs = () => {
    if (!configAtiva) return
    setEditObservacoes(configAtiva.observacoes || '')
    setIsEditObsOpen(true)
  }

  const handleSaveObs = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!configAtiva) return
    setSavingObs(true)
    try {
      const { error } = await updateConfiguracaoFiscal(configAtiva.id, {
        observacoes: editObservacoes,
      })
      if (error) throw new Error(error)
      toast({
        title: 'Observações atualizadas',
        description: 'Notas da configuração fiscal salvas com sucesso.',
      })
      setIsEditObsOpen(false)
      loadData()
    } catch (err: any) {
      toast({
        title: 'Erro ao salvar',
        description: err.message,
        variant: 'destructive',
      })
    } finally {
      setSavingObs(false)
    }
  }

  // Abertura do modal de Alíquota
  const handleOpenAliquotaModal = (aliquota?: AliquotaFiscal) => {
    if (aliquota) {
      setEditingAliquota(aliquota)
      setFormImpostoNome(aliquota.nome_imposto || '')
      setFormImpostoRegime((aliquota.regime_tributario as RegimeTributario) || selectedRegimeTab)
      setFormImpostoAliquota(aliquota.aliquota_percentual?.toString() || '0')
      setFormImpostoBase(aliquota.base_calculo_percentual?.toString() || '100')
      setFormImpostoInicio(aliquota.data_inicio_vigencia || new Date().toISOString().split('T')[0])
      setFormImpostoFim(aliquota.data_fim_vigencia || '')
      setFormImpostoDescricao(aliquota.descricao || '')
      setFormImpostoAtivo(aliquota.ativo)
    } else {
      setEditingAliquota(null)
      setFormImpostoNome('')
      setFormImpostoRegime(selectedRegimeTab)
      setFormImpostoAliquota('')
      setFormImpostoBase('100')
      setFormImpostoInicio(new Date().toISOString().split('T')[0])
      setFormImpostoFim('')
      setFormImpostoDescricao('')
      setFormImpostoAtivo(true)
    }
    setIsAliquotaModalOpen(true)
  }

  const handleSaveAliquota = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formImpostoNome.trim()) {
      toast({ title: 'Nome do imposto é obrigatório', variant: 'destructive' })
      return
    }

    setSavingAliquota(true)
    try {
      const aliqNum = parseFloat(formImpostoAliquota.replace(',', '.')) || 0
      const baseNum = parseFloat(formImpostoBase.replace(',', '.')) || 100.0

      if (editingAliquota) {
        const { error } = await updateAliquotaFiscal(editingAliquota.id, {
          nome_imposto: formImpostoNome,
          regime_tributario: formImpostoRegime,
          aliquota_percentual: aliqNum,
          base_calculo_percentual: baseNum,
          data_inicio_vigencia: formImpostoInicio,
          data_fim_vigencia: formImpostoFim || null,
          descricao: formImpostoDescricao || null,
          ativo: formImpostoAtivo,
        })
        if (error) throw new Error(error)
        toast({
          title: 'Alíquota atualizada',
          description: `Alíquota do imposto "${formImpostoNome}" atualizada com sucesso.`,
        })
      } else {
        const { error } = await createAliquotaFiscal({
          nome_imposto: formImpostoNome,
          regime_tributario: formImpostoRegime,
          aliquota_percentual: aliqNum,
          base_calculo_percentual: baseNum,
          data_inicio_vigencia: formImpostoInicio,
          data_fim_vigencia: formImpostoFim || null,
          descricao: formImpostoDescricao || null,
          ativo: formImpostoAtivo,
        })
        if (error) throw new Error(error)
        toast({
          title: 'Alíquota cadastrada',
          description: `Alíquota do imposto "${formImpostoNome}" criada com sucesso.`,
        })
      }

      setIsAliquotaModalOpen(false)
      loadData()
    } catch (err: any) {
      toast({
        title: 'Erro ao salvar alíquota',
        description: err.message,
        variant: 'destructive',
      })
    } finally {
      setSavingAliquota(false)
    }
  }

  const handleToggleAliquotaAtiva = async (aliq: AliquotaFiscal) => {
    const novoStatus = !aliq.ativo
    try {
      const { error } = await setAliquotaFiscalAtiva(aliq.id, novoStatus)
      if (error) throw new Error(error)
      toast({
        title: novoStatus ? 'Alíquota ativada' : 'Alíquota inativada',
        description: `O imposto "${aliq.nome_imposto}" foi ${novoStatus ? 'ativado' : 'inativado'}.`,
      })
      loadData()
    } catch (err: any) {
      toast({
        title: 'Erro ao alterar status da alíquota',
        description: err.message,
        variant: 'destructive',
      })
    }
  }

  const aliquotasDoRegime = useMemo(() => {
    return aliquotas.filter((a) => a.regime_tributario === selectedRegimeTab)
  }, [aliquotas, selectedRegimeTab])

  const currentRegimeLabel = configAtiva?.regime_tributario
    ? REGIME_TRIBUTARIO_LABELS[configAtiva.regime_tributario as RegimeTributario] ||
      configAtiva.regime_tributario
    : 'Não configurado'

  return (
    <div className="space-y-6">
      {/* CARD 1: Regime Tributário Vigente */}
      <Card className="bg-midnight-navy border-none text-off-white">
        <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4">
          <div>
            <CardTitle className="text-xl font-bold flex items-center gap-2 text-off-white">
              <Landmark className="h-5 w-5 text-off-white" /> Regime Tributário da Empresa
            </CardTitle>
            <CardDescription className="text-off-white/70">
              Configuração do enquadramento tributário ativo que rege os cálculos fiscais da
              fábrica.
            </CardDescription>
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={loadData}
              disabled={loading}
              className="bg-dark-denim border-steel-blue/40 text-off-white hover:bg-dark-denim/80 h-9"
              title="Atualizar dados"
            >
              <RefreshCw className={`h-4 w-4 mr-1.5 ${loading ? 'animate-spin' : ''}`} />
              Atualizar
            </Button>
            <Button
              onClick={handleOpenTrocarRegime}
              className="bg-steel-blue text-off-white hover:bg-steel-blue/90 w-full sm:w-auto h-9"
            >
              <ArrowRight className="h-4 w-4 mr-1.5" /> Alterar Regime Tributário
            </Button>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {loading ? (
            <div className="p-8 flex justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-off-white" />
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              {/* Box 1: Regime Ativo */}
              <div className="bg-dark-denim/60 border-2 border-emerald-500/40 rounded-xl p-5 relative overflow-hidden flex flex-col justify-between">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs uppercase tracking-wider font-semibold text-emerald-400 flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4" /> Regime Ativo Vigente
                    </span>
                    <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/40 text-xs font-semibold">
                      Em Vigência
                    </Badge>
                  </div>
                  <h3 className="text-2xl font-black text-off-white pt-1">{currentRegimeLabel}</h3>
                  <p className="text-xs text-off-white/70 leading-relaxed">
                    {configAtiva?.regime_tributario &&
                      REGIME_TRIBUTARIO_DESCRIPTIONS[
                        configAtiva.regime_tributario as RegimeTributario
                      ]}
                  </p>
                </div>

                <div className="pt-4 mt-4 border-t border-steel-blue/30 flex items-center justify-between text-xs text-off-white/80">
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-off-white/60" /> Início da vigência:
                  </span>
                  <strong className="text-off-white font-mono">
                    {fmtDate(configAtiva?.data_inicio_vigencia || null)}
                  </strong>
                </div>
              </div>

              {/* Box 2: Observações / Enquadramento */}
              <div className="bg-dark-denim/40 border border-steel-blue/30 rounded-xl p-5 flex flex-col justify-between">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs uppercase tracking-wider font-semibold text-off-white/70">
                      Observações Fiscais
                    </span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={handleOpenEditObs}
                      className="h-7 px-2 text-xs text-off-white hover:bg-dark-denim hover:text-off-white"
                    >
                      <Pencil className="w-3 h-3 mr-1" /> Editar Notas
                    </Button>
                  </div>
                  <p className="text-xs text-off-white/80 leading-relaxed italic bg-midnight-navy/60 p-3 rounded border border-steel-blue/20 min-h-[70px]">
                    {configAtiva?.observacoes ||
                      'Nenhuma observação ou instrução complementar registrada.'}
                  </p>
                </div>

                <div className="pt-3 border-t border-steel-blue/30 text-[11px] text-off-white/60 flex items-center justify-between">
                  <span>
                    Cadastrado em: {fmtDate(configAtiva?.criado_em?.split('T')[0] || null)}
                  </span>
                  <span>ID: {configAtiva?.id?.substring(0, 8)}...</span>
                </div>
              </div>

              {/* Box 3: Histórico de Enquadramentos */}
              <div className="bg-dark-denim/40 border border-steel-blue/30 rounded-xl p-5 flex flex-col justify-between">
                <div className="space-y-2">
                  <span className="text-xs uppercase tracking-wider font-semibold text-off-white/70 flex items-center gap-1.5">
                    <History className="w-3.5 h-3.5" /> Histórico de Regimes (
                    {historicoRegimes.length})
                  </span>
                  <div className="max-h-28 overflow-y-auto space-y-1.5 pr-1">
                    {historicoRegimes.map((h) => (
                      <div
                        key={h.id}
                        className={`text-xs p-2 rounded flex items-center justify-between border ${
                          h.ativo
                            ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300 font-medium'
                            : 'bg-midnight-navy/40 border-steel-blue/20 text-off-white/60'
                        }`}
                      >
                        <div>
                          <span>
                            {REGIME_TRIBUTARIO_LABELS[h.regime_tributario as RegimeTributario] ||
                              h.regime_tributario}
                          </span>
                          {h.ativo && (
                            <span className="ml-1 text-[10px] text-emerald-400 font-bold">
                              (Atual)
                            </span>
                          )}
                        </div>
                        <span className="text-[11px] font-mono">
                          {fmtDate(h.data_inicio_vigencia)}{' '}
                          {h.data_fim_vigencia ? `→ ${fmtDate(h.data_fim_vigencia)}` : '→ Vigente'}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                <p className="text-[11px] text-off-white/50 pt-2">
                  Trocas de regime encerram automaticamente o ciclo anterior com vigência até a
                  véspera do novo regime.
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* CARD 2: Tabela de Alíquotas por Regime */}
      <Card className="bg-midnight-navy border-none text-off-white">
        <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4">
          <div>
            <CardTitle className="text-xl font-bold flex items-center gap-2 text-off-white">
              <Calculator className="h-5 w-5 text-off-white" /> Tabela de Alíquotas Fiscais
            </CardTitle>
            <CardDescription className="text-off-white/70">
              Parametrização dos percentuais de impostos aplicados sobre faturamento, lucro ou
              presunção.
            </CardDescription>
          </div>
          <Button
            onClick={() => handleOpenAliquotaModal()}
            className="bg-steel-blue text-off-white hover:bg-steel-blue/90 w-full sm:w-auto h-9"
          >
            <Plus className="h-4 w-4 mr-1.5" /> Nova Alíquota
          </Button>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Seletor de Regime para Visualização */}
          <div className="flex flex-wrap items-center gap-2 border-b border-steel-blue/30 pb-3">
            {REGIMES.map((r) => {
              const isActive = selectedRegimeTab === r
              const isCurrentCompanyRegime = configAtiva?.regime_tributario === r
              const count = aliquotas.filter((a) => a.regime_tributario === r).length

              return (
                <button
                  key={r}
                  type="button"
                  onClick={() => setSelectedRegimeTab(r)}
                  className={`px-3.5 py-2 rounded-lg text-xs font-semibold flex items-center gap-2 transition-colors ${
                    isActive
                      ? 'bg-dark-denim text-off-white border-2 border-steel-blue shadow-sm'
                      : 'bg-dark-denim/40 text-off-white/60 hover:text-off-white hover:bg-dark-denim/60 border border-steel-blue/20'
                  }`}
                >
                  <span>{REGIME_TRIBUTARIO_LABELS[r]}</span>
                  {isCurrentCompanyRegime && (
                    <span className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 font-normal">
                      Vigente
                    </span>
                  )}
                  <span className="text-[10px] px-1.5 py-0.2 rounded bg-midnight-navy text-off-white/70">
                    {count}
                  </span>
                </button>
              )
            })}
          </div>

          {/* Tabela de alíquotas */}
          <div className="rounded-lg border border-steel-blue/30 overflow-hidden bg-midnight-navy/90">
            {loading ? (
              <div className="p-12 flex flex-col items-center justify-center text-off-white/70 gap-2">
                <Loader2 className="h-8 w-8 animate-spin text-off-white" />
                <span>Carregando alíquotas...</span>
              </div>
            ) : aliquotasDoRegime.length === 0 ? (
              <div className="p-12 text-center text-off-white/60 space-y-2">
                <p>
                  Nenhuma alíquota cadastrada para {REGIME_TRIBUTARIO_LABELS[selectedRegimeTab]}.
                </p>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleOpenAliquotaModal()}
                  className="bg-dark-denim border-steel-blue/40 text-off-white hover:bg-dark-denim/80 mt-2"
                >
                  <Plus className="w-3.5 h-3.5 mr-1" /> Adicionar Primeira Alíquota
                </Button>
              </div>
            ) : (
              <Table>
                <TableHeader className="bg-dark-denim/80">
                  <TableRow className="border-steel-blue/30 hover:bg-transparent">
                    <TableHead className="text-off-white font-semibold">
                      Imposto / Tributo
                    </TableHead>
                    <TableHead className="text-off-white font-semibold text-right w-32">
                      Alíquota (%)
                    </TableHead>
                    <TableHead className="text-off-white font-semibold text-right w-36">
                      Base Cálculo (%)
                    </TableHead>
                    <TableHead className="text-off-white font-semibold w-48">Vigência</TableHead>
                    <TableHead className="text-off-white font-semibold hidden md:table-cell">
                      Descrição / Notas
                    </TableHead>
                    <TableHead className="text-off-white font-semibold text-center w-28">
                      Situação
                    </TableHead>
                    <TableHead className="text-off-white font-semibold text-right w-36">
                      Ações
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {aliquotasDoRegime.map((aliq) => (
                    <TableRow
                      key={aliq.id}
                      className={`border-steel-blue/20 hover:bg-dark-denim/40 transition-colors ${
                        !aliq.ativo ? 'opacity-60 bg-dark-denim/20' : ''
                      }`}
                    >
                      <TableCell className="font-semibold text-off-white">
                        <div className="flex items-center gap-2">
                          <span>{aliq.nome_imposto}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-mono font-bold text-off-white">
                        {Number(aliq.aliquota_percentual || 0).toFixed(2)}%
                      </TableCell>
                      <TableCell className="text-right font-mono text-off-white/80">
                        {aliq.base_calculo_percentual !== null
                          ? `${Number(aliq.base_calculo_percentual).toFixed(2)}%`
                          : '100.00%'}
                      </TableCell>
                      <TableCell className="text-xs text-off-white font-mono">
                        {fmtDate(aliq.data_inicio_vigencia)}{' '}
                        {aliq.data_fim_vigencia
                          ? `→ ${fmtDate(aliq.data_fim_vigencia)}`
                          : '→ Vigente'}
                      </TableCell>
                      <TableCell
                        className="text-xs text-off-white/70 hidden md:table-cell max-w-xs truncate"
                        title={aliq.descricao || ''}
                      >
                        {aliq.descricao || '—'}
                      </TableCell>
                      <TableCell className="text-center">
                        {aliq.ativo ? (
                          <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-400">
                            <CheckCircle2 className="w-3.5 h-3.5" /> Ativo
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-xs font-medium text-zinc-400">
                            <XCircle className="w-3.5 h-3.5" /> Inativo
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => handleOpenAliquotaModal(aliq)}
                            className="h-8 px-2 text-off-white hover:bg-dark-denim hover:text-off-white"
                            title="Editar alíquota"
                          >
                            <Pencil className="w-3.5 h-3.5 mr-1" /> Editar
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => handleToggleAliquotaAtiva(aliq)}
                            className={`h-8 px-2 text-xs ${
                              aliq.ativo
                                ? 'text-amber-400 hover:text-amber-300 hover:bg-amber-500/10'
                                : 'text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10'
                            }`}
                            title={aliq.ativo ? 'Inativar alíquota' : 'Reativar alíquota'}
                          >
                            {aliq.ativo ? (
                              <>
                                <Archive className="w-3.5 h-3.5 mr-1" /> Inativar
                              </>
                            ) : (
                              <>
                                <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Reativar
                              </>
                            )}
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        </CardContent>
      </Card>

      {/* DIALOG: Trocar Regime Fiscal */}
      <Dialog open={isTrocarRegimeOpen} onOpenChange={setIsTrocarRegimeOpen}>
        <DialogContent className="sm:max-w-[540px] bg-midnight-navy text-off-white border-steel-blue/40">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-off-white flex items-center gap-2">
              <Landmark className="h-5 w-5 text-amber-400" /> Alterar Regime Tributário da Empresa
            </DialogTitle>
            <DialogDescription className="text-off-white/70">
              Esta ação encerra a vigência do regime atual e inicia um novo ciclo fiscal para a
              fábrica.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleConfirmTrocarRegime} className="space-y-4 pt-2">
            <div className="rounded-lg bg-amber-500/10 border border-amber-500/30 p-3 text-xs text-amber-200 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <span>
                Ao confirmar, o regime atual ({currentRegimeLabel}) será finalizado em{' '}
                <strong>
                  {fmtDate(
                    new Date(
                      new Date(trocaDataInicio + 'T00:00:00').getTime() - 24 * 60 * 60 * 1000,
                    )
                      .toISOString()
                      .split('T')[0],
                  )}
                </strong>{' '}
                e o novo regime passará a vigorar a partir de{' '}
                <strong>{fmtDate(trocaDataInicio)}</strong>.
              </span>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="novo-regime" className="text-xs font-semibold text-off-white">
                Novo Regime Tributário <span className="text-rose-400">*</span>
              </Label>
              <Select
                value={trocaRegime}
                onValueChange={(v) => setTrocaRegime(v as RegimeTributario)}
              >
                <SelectTrigger
                  id="novo-regime"
                  className="bg-dark-denim border-steel-blue/40 text-off-white"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-dark-denim border-steel-blue/40 text-off-white">
                  {REGIMES.map((r) => (
                    <SelectItem key={r} value={r}>
                      {REGIME_TRIBUTARIO_LABELS[r]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-[11px] text-off-white/60 pt-0.5">
                {REGIME_TRIBUTARIO_DESCRIPTIONS[trocaRegime]}
              </p>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="troca-data-inicio" className="text-xs font-semibold text-off-white">
                Data de Início da Nova Vigência <span className="text-rose-400">*</span>
              </Label>
              <Input
                id="troca-data-inicio"
                type="date"
                value={trocaDataInicio}
                onChange={(e) => setTrocaDataInicio(e.target.value)}
                className="bg-dark-denim border-steel-blue/40 text-off-white"
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="troca-observacoes" className="text-xs font-semibold text-off-white">
                Motivo / Observações da Mudança
              </Label>
              <Textarea
                id="troca-observacoes"
                value={trocaObservacoes}
                onChange={(e) => setTrocaObservacoes(e.target.value)}
                placeholder="Ex: Mudança de enquadramento anual / Desenquadramento do Simples Nacional por limite de receita..."
                rows={3}
                className="bg-dark-denim border-steel-blue/40 text-off-white placeholder:text-off-white/40"
              />
            </div>

            <DialogFooter className="pt-3 gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsTrocarRegimeOpen(false)}
                disabled={trocandoRegime}
                className="bg-dark-denim border-steel-blue/40 text-off-white hover:bg-dark-denim/80"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={trocandoRegime}
                className="bg-amber-600 text-white hover:bg-amber-700 font-semibold"
              >
                {trocandoRegime && <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />}
                {trocandoRegime ? 'Alterando...' : 'Confirmar Novo Regime'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* DIALOG: Editar Observações da Configuração Ativa */}
      <Dialog open={isEditObsOpen} onOpenChange={setIsEditObsOpen}>
        <DialogContent className="sm:max-w-[500px] bg-midnight-navy text-off-white border-steel-blue/40">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-off-white">
              Editar Observações Fiscais
            </DialogTitle>
            <DialogDescription className="text-off-white/70">
              Atualize as instruções de apuração ou notas contábeis do regime vigente.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSaveObs} className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label htmlFor="edit-obs" className="text-xs font-semibold text-off-white">
                Observações
              </Label>
              <Textarea
                id="edit-obs"
                value={editObservacoes}
                onChange={(e) => setEditObservacoes(e.target.value)}
                rows={4}
                placeholder="Insira as notas contábeis..."
                className="bg-dark-denim border-steel-blue/40 text-off-white placeholder:text-off-white/40"
              />
            </div>

            <DialogFooter className="pt-2 gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsEditObsOpen(false)}
                disabled={savingObs}
                className="bg-dark-denim border-steel-blue/40 text-off-white hover:bg-dark-denim/80"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={savingObs}
                className="bg-steel-blue text-off-white hover:bg-steel-blue/90"
              >
                {savingObs && <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />}
                {savingObs ? 'Salvando...' : 'Salvar'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* DIALOG: Criar / Editar Alíquota */}
      <Dialog open={isAliquotaModalOpen} onOpenChange={setIsAliquotaModalOpen}>
        <DialogContent className="sm:max-w-[540px] bg-midnight-navy text-off-white border-steel-blue/40">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-off-white">
              {editingAliquota ? 'Editar Alíquota Fiscal' : 'Nova Alíquota Fiscal'}
            </DialogTitle>
            <DialogDescription className="text-off-white/70">
              Configure o imposto, alíquota percentual e base de cálculo correspondente.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSaveAliquota} className="space-y-4 pt-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="aliq-nome" className="text-xs font-semibold text-off-white">
                  Nome do Imposto <span className="text-rose-400">*</span>
                </Label>
                <Input
                  id="aliq-nome"
                  value={formImpostoNome}
                  onChange={(e) => setFormImpostoNome(e.target.value)}
                  placeholder="Ex: DAS, IRPJ, CSLL, PIS, COFINS"
                  className="bg-dark-denim border-steel-blue/40 text-off-white placeholder:text-off-white/40"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="aliq-regime" className="text-xs font-semibold text-off-white">
                  Regime Tributário <span className="text-rose-400">*</span>
                </Label>
                <Select
                  value={formImpostoRegime}
                  onValueChange={(v) => setFormImpostoRegime(v as RegimeTributario)}
                >
                  <SelectTrigger
                    id="aliq-regime"
                    className="bg-dark-denim border-steel-blue/40 text-off-white"
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-dark-denim border-steel-blue/40 text-off-white">
                    {REGIMES.map((r) => (
                      <SelectItem key={r} value={r}>
                        {REGIME_TRIBUTARIO_LABELS[r]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="aliq-percentual" className="text-xs font-semibold text-off-white">
                  Alíquota (%) <span className="text-rose-400">*</span>
                </Label>
                <Input
                  id="aliq-percentual"
                  type="number"
                  step="0.01"
                  min="0"
                  max="100"
                  value={formImpostoAliquota}
                  onChange={(e) => setFormImpostoAliquota(e.target.value)}
                  placeholder="Ex: 6.00, 15.00"
                  className="bg-dark-denim border-steel-blue/40 text-off-white"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="aliq-base" className="text-xs font-semibold text-off-white">
                  Base de Cálculo (%)
                </Label>
                <Input
                  id="aliq-base"
                  type="number"
                  step="0.01"
                  min="0"
                  max="100"
                  value={formImpostoBase}
                  onChange={(e) => setFormImpostoBase(e.target.value)}
                  placeholder="Ex: 100.00 (ou 8.00 / 12.00)"
                  className="bg-dark-denim border-steel-blue/40 text-off-white"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="aliq-inicio" className="text-xs font-semibold text-off-white">
                  Início de Vigência <span className="text-rose-400">*</span>
                </Label>
                <Input
                  id="aliq-inicio"
                  type="date"
                  value={formImpostoInicio}
                  onChange={(e) => setFormImpostoInicio(e.target.value)}
                  className="bg-dark-denim border-steel-blue/40 text-off-white"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="aliq-fim" className="text-xs font-semibold text-off-white">
                  Fim de Vigência (Opcional)
                </Label>
                <Input
                  id="aliq-fim"
                  type="date"
                  value={formImpostoFim}
                  onChange={(e) => setFormImpostoFim(e.target.value)}
                  className="bg-dark-denim border-steel-blue/40 text-off-white"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="aliq-desc" className="text-xs font-semibold text-off-white">
                Descrição / Instrução de Apuração
              </Label>
              <Textarea
                id="aliq-desc"
                value={formImpostoDescricao}
                onChange={(e) => setFormImpostoDescricao(e.target.value)}
                placeholder="Ex: Apurado sobre o faturamento bruto em guia única..."
                rows={2}
                className="bg-dark-denim border-steel-blue/40 text-off-white placeholder:text-off-white/40"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="aliq-status" className="text-xs font-semibold text-off-white">
                Situação
              </Label>
              <Select
                value={formImpostoAtivo ? 'ativo' : 'inativo'}
                onValueChange={(v) => setFormImpostoAtivo(v === 'ativo')}
              >
                <SelectTrigger
                  id="aliq-status"
                  className="bg-dark-denim border-steel-blue/40 text-off-white"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-dark-denim border-steel-blue/40 text-off-white">
                  <SelectItem value="ativo">Ativo</SelectItem>
                  <SelectItem value="inativo">Inativo</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <DialogFooter className="pt-3 gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsAliquotaModalOpen(false)}
                disabled={savingAliquota}
                className="bg-dark-denim border-steel-blue/40 text-off-white hover:bg-dark-denim/80"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={savingAliquota}
                className="bg-steel-blue text-off-white hover:bg-steel-blue/90"
              >
                {savingAliquota && <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />}
                {savingAliquota
                  ? 'Salvando...'
                  : editingAliquota
                    ? 'Salvar Alterações'
                    : 'Criar Alíquota'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
