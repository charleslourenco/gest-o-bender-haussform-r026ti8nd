import { useState, useMemo } from 'react'
import {
  AlertaNotaFiscal,
  GravidadeAlerta,
  TipoAlertaNota,
  canResolvePendencia,
  rpcMarcarNotaConferida,
  rpcSincronizarEstoqueNota,
} from '@/services/alertas-notas-fiscais'
import { triggerAlertasReload } from '@/hooks/use-alertas-notas-fiscais'
import { useAuth } from '@/hooks/use-auth'
import { useToast } from '@/hooks/use-toast'
import { supabase } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import {
  AlertTriangle,
  AlertCircle,
  CheckCircle2,
  Clock,
  Search,
  Wrench,
  Check,
  PackagePlus,
  Loader2,
  Filter,
  FileText,
  RotateCcw,
  Sparkles,
} from 'lucide-react'
import { NotaReviewPanel } from './NotaReviewPanel'

interface NotasPendenciasTabProps {
  alertas: AlertaNotaFiscal[]
  loading: boolean
  error?: string | null
  onReload: () => Promise<void> | void
}

const TIPO_ALERTA_LABELS: Record<TipoAlertaNota, string> = {
  SEM_ITENS: 'Sem itens',
  ITENS_IDENTICOS: 'Itens idênticos',
  SEM_ENTRADA_ESTOQUE: 'Sem entrada no estoque',
  ITEM_SEM_VINCULO: 'Item sem vínculo',
  TOTAL_DIVERGENTE: 'Total divergente',
  IMPOSTOS_NAO_INFORMADOS: 'Impostos/Frete não informados',
  SEM_CONTA_PAGAR: 'Sem conta a pagar',
}

export function NotasPendenciasTab({ alertas, loading, error, onReload }: NotasPendenciasTabProps) {
  const { user, permissions, isAdmin } = useAuth()
  const { toast } = useToast()

  const [search, setSearch] = useState('')
  const [filterGravidade, setFilterGravidade] = useState<string>('todas')
  const [filterTipo, setFilterTipo] = useState<string>('todos')

  // Estado para NotaReviewPanel (resolver nota em modal de edição)
  const [selectedNotaForEdit, setSelectedNotaForEdit] = useState<any | null>(null)
  const [isLoadingNotaEdit, setIsLoadingNotaEdit] = useState(false)

  // Estado para ação rápida "Lançar estoque" (SEM_ENTRADA_ESTOQUE)
  const [lancarEstoqueNota, setLancarEstoqueNota] = useState<AlertaNotaFiscal | null>(null)
  const [itensEstoquePreview, setItensEstoquePreview] = useState<any[]>([])
  const [isLoadingItens, setIsLoadingItens] = useState(false)
  const [isSubmittingEstoque, setIsSubmittingEstoque] = useState(false)

  // Estado para ação rápida "Marcar como conferida" (TOTAL_DIVERGENTE / SEM_CONTA_PAGAR)
  const [conferirNota, setConferirNota] = useState<AlertaNotaFiscal | null>(null)
  const [observacaoConferencia, setObservacaoConferencia] = useState('')
  const [isSubmittingConferencia, setIsSubmittingConferencia] = useState(false)

  // Estado para modal "Informar impostos/frete" (IMPOSTOS_NAO_INFORMADOS)
  const [impostosModalNota, setImpostosModalNota] = useState<AlertaNotaFiscal | null>(null)
  const [formImpostos, setFormImpostos] = useState({
    frete: 0,
    ipi: 0,
    st: 0,
    outras: 0,
    desconto: 0,
  })
  const [isSubmittingImpostos, setIsSubmittingImpostos] = useState(false)
  const [erroImpostosRpc, setErroImpostosRpc] = useState<string | null>(null)

  // Estado para "Reprocessar totais em lote"
  const [isBatchReprocessing, setIsBatchReprocessing] = useState(false)
  const [batchResultModal, setBatchResultModal] = useState<{
    resolvidas: number
    pendentes: number
    total: number
    erros: string[]
  } | null>(null)

  const userCanResolve = canResolvePendencia(user, permissions, isAdmin)

  const formatCurrency = (val: number | null | undefined) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(val) || 0)

  const formatDate = (dateStr: string | null | undefined) => {
    if (!dateStr) return '-'
    try {
      const [year, month, day] = dateStr.split('T')[0].split('-')
      if (year && month && day) return `${day}/${month}/${year}`
      return new Date(dateStr).toLocaleDateString('pt-BR')
    } catch {
      return dateStr
    }
  }

  // Filtragem no front
  const filteredAlertas = useMemo(() => {
    return alertas.filter((a) => {
      const g = a.tipo_alerta === 'IMPOSTOS_NAO_INFORMADOS' ? 'baixa' : a.gravidade
      if (filterGravidade !== 'todas' && g !== filterGravidade) {
        return false
      }
      if (filterTipo !== 'todos' && a.tipo_alerta !== filterTipo) {
        return false
      }
      if (search.trim()) {
        const q = search.trim().toLowerCase()
        const matchNota = (a.numero_nota || '').toLowerCase().includes(q)
        const matchForn = (a.fornecedor || '').toLowerCase().includes(q)
        if (!matchNota && !matchForn) return false
      }
      return true
    })
  }, [alertas, filterGravidade, filterTipo, search])

  // Abrir NotaReviewPanel para a nota correspondente
  const handleOpenResolver = async (alerta: AlertaNotaFiscal) => {
    setIsLoadingNotaEdit(true)
    try {
      const { data, error } = await supabase
        .from('notas_fiscais')
        .select('*')
        .eq('id', alerta.nota_id)
        .single()

      if (error || !data) {
        throw new Error(error?.message || 'Nota fiscal não encontrada no banco')
      }

      setSelectedNotaForEdit(data)
    } catch (err: any) {
      toast({
        title: 'Erro ao abrir nota',
        description: err.message,
        variant: 'destructive',
      })
    } finally {
      setIsLoadingNotaEdit(false)
    }
  }

  // Ao salvar dentro do NotaReviewPanel
  const handleNotaResolved = async () => {
    setSelectedNotaForEdit(null)
    triggerAlertasReload()
    await onReload()
    toast({
      title: 'Nota atualizada!',
      description: 'Pendência reavaliada. Se tudo estiver correto, ela sumirá da lista.',
    })
  }

  // Abrir modal de confirmação de Lançar Estoque
  const handleOpenLancarEstoque = async (alerta: AlertaNotaFiscal) => {
    setLancarEstoqueNota(alerta)
    setIsLoadingItens(true)
    setItensEstoquePreview([])
    try {
      // 1. Tenta carregar de itens_nota_fiscal
      const { data: itensNf } = await supabase
        .from('itens_nota_fiscal')
        .select('*')
        .eq('nota_fiscal_id', alerta.nota_id)

      if (itensNf && itensNf.length > 0) {
        setItensEstoquePreview(
          itensNf.map((i) => ({
            nome: i.nome_produto,
            quantidade: i.quantidade,
            unidade: i.unidade,
            valor: i.valor_unitario,
          })),
        )
      } else {
        // Fallback: carregar de notas_fiscais.dados_ocr.itens
        const { data: notaRow } = await supabase
          .from('notas_fiscais')
          .select('dados_ocr')
          .eq('id', alerta.nota_id)
          .single()

        const rawItens = (notaRow?.dados_ocr as any)?.itens || []
        setItensEstoquePreview(
          rawItens.map((i: any) => ({
            nome: i.produto || i.nome || 'Item sem nome',
            quantidade: i.quantidade || 1,
            unidade: i.unidade || 'UN',
            valor: i.preco_unitario || i.valor_unitario || 0,
          })),
        )
      }
    } catch (err) {
      console.warn('Erro ao carregar itens para preview:', err)
    } finally {
      setIsLoadingItens(false)
    }
  }

  // Confirmar Lançar Estoque chamando a RPC
  const handleConfirmLancarEstoque = async () => {
    if (!lancarEstoqueNota) return
    setIsSubmittingEstoque(true)
    try {
      const res = await rpcSincronizarEstoqueNota({
        nota_id: lancarEstoqueNota.nota_id,
        usuario_id: user?.id || null,
        tipo_alerta: lancarEstoqueNota.tipo_alerta,
      })

      if (!res.success) {
        throw new Error(res.error || 'Falha ao sincronizar estoque')
      }

      toast({
        title: 'Estoque lançado com sucesso!',
        description: `Os itens da nota ${lancarEstoqueNota.numero_nota || ''} deram entrada no estoque.`,
      })

      setLancarEstoqueNota(null)
      triggerAlertasReload()
      await onReload()
    } catch (err: any) {
      toast({
        title: 'Erro ao lançar estoque',
        description: err.message,
        variant: 'destructive',
      })
    } finally {
      setIsSubmittingEstoque(false)
    }
  }

  // Abrir modal de Marcar como conferida
  const handleOpenConferir = (alerta: AlertaNotaFiscal) => {
    setConferirNota(alerta)
    setObservacaoConferencia('')
  }

  // Abrir modal "Informar impostos/frete"
  const handleOpenInformarImpostos = (alerta: AlertaNotaFiscal) => {
    setImpostosModalNota(alerta)
    setErroImpostosRpc(null)
    setFormImpostos({
      frete: 0,
      ipi: 0,
      st: 0,
      outras: 0,
      desconto: 0,
    })
  }

  // Confirmar chamada da RPC classificar_diferenca_nota
  const handleConfirmClassificarDiferenca = async () => {
    if (!impostosModalNota) return
    setIsSubmittingImpostos(true)
    setErroImpostosRpc(null)
    try {
      const { data: rpcRes, error: rpcErr } = await supabase.rpc('classificar_diferenca_nota', {
        p_nota_id: impostosModalNota.nota_id,
        p_frete: Number(formImpostos.frete) || 0,
        p_ipi: Number(formImpostos.ipi) || 0,
        p_st: Number(formImpostos.st) || 0,
        p_outras: Number(formImpostos.outras) || 0,
        p_desconto: Number(formImpostos.desconto) || 0,
        p_usuario_id: user?.id || null,
      })

      if (rpcErr) {
        setErroImpostosRpc(rpcErr.message || 'Erro ao classificar diferença da nota')
        return
      }

      // Se a RPC retornou um objeto ou booleano com erro
      if (rpcRes && typeof rpcRes === 'object' && rpcRes.success === false) {
        setErroImpostosRpc(
          rpcRes.error || rpcRes.mensagem || 'Valores não fecham com a diferença da nota',
        )
        return
      }

      toast({
        title: 'Impostos e frete classificados!',
        description: `Nota fiscal ${impostosModalNota.numero_nota || ''} atualizada e removida de pendências.`,
      })

      setImpostosModalNota(null)
      triggerAlertasReload()
      await onReload()
    } catch (err: any) {
      setErroImpostosRpc(err.message || 'Falha na comunicação com o banco')
    } finally {
      setIsSubmittingImpostos(false)
    }
  }

  // Rotina de "Reprocessar totais em lote"
  const handleReprocessarTotaisEmLote = async () => {
    const notasCandidatas = alertas.filter(
      (a) => a.tipo_alerta === 'IMPOSTOS_NAO_INFORMADOS' || a.tipo_alerta === 'TOTAL_DIVERGENTE',
    )

    if (notasCandidatas.length === 0) {
      toast({
        title: 'Nenhuma nota elegível',
        description:
          'Não há notas com alerta de "Impostos não informados" ou "Total divergente" na lista.',
      })
      return
    }

    if (
      !window.confirm(
        `Deseja reprocessar a leitura de totais da Camada 1 para as ${notasCandidatas.length} nota(s) elegíveis? Os itens existentes não serão alterados.`,
      )
    ) {
      return
    }

    setIsBatchReprocessing(true)
    let resolvidas = 0
    let continuamPendentes = 0
    const errosOcorridos: string[] = []

    try {
      const { extractTextFromPdf } = await import('@/lib/pdf-to-images')
      const { parseDanfeText } = await import('@/services/danfe-pdf-parser')

      for (const alerta of notasCandidatas) {
        try {
          // 1. Obter arquivo_url e dados_ocr da nota
          const { data: notaRow, error: nfErr } = await supabase
            .from('notas_fiscais')
            .select('id, numero_nota, fornecedor, valor_total, arquivo_url, dados_ocr')
            .eq('id', alerta.nota_id)
            .single()

          if (nfErr || !notaRow || !notaRow.arquivo_url) {
            continuamPendentes++
            continue
          }

          // 2. Download do PDF do storage
          const cleanPath = notaRow.arquivo_url
            .replace(/^https?:\/\/[^/]+\/storage\/v1\/object\/(?:public|sign)\/[^/]+\//, '')
            .replace(/^\/+/, '')

          let fileBlob: Blob | null = null
          const tryBuckets = ['notas-fiscais', 'documentos', 'comprovantes']
          for (const b of tryBuckets) {
            const pathCandidate = cleanPath.startsWith(`${b}/`)
              ? cleanPath.replace(`${b}/`, '')
              : cleanPath
            const res = await supabase.storage.from(b).download(pathCandidate)
            if (res.data) {
              fileBlob = res.data
              break
            }
          }

          if (!fileBlob) {
            continuamPendentes++
            continue
          }

          const fileName = cleanPath.split('/').pop() || 'nota.pdf'
          const file = new File([fileBlob], fileName, { type: fileBlob.type || 'application/pdf' })

          // 3. Extrair texto e executar Danfe Parser Camada 1 (sem IA)
          const text = await extractTextFromPdf(file)
          if (!text || text.trim().length === 0) {
            continuamPendentes++
            continue
          }

          const parsed = parseDanfeText(text)
          if (!parsed || !parsed.totais) {
            continuamPendentes++
            continue
          }

          const t = parsed.totais
          const vProdutos = Number(t.valor_produtos) || 0
          const vFrete = Number(t.valor_frete) || 0
          const vSeguro = Number(t.valor_seguro) || 0
          const vDesconto = Number(t.valor_desconto) || 0
          const vOutras = Number(t.valor_outras_despesas) || 0
          const vIpi = Number(t.valor_ipi) || 0
          const vSt = Number(t.valor_st) || 0
          const vTotal = Number(t.valor_total_nota) || Number(notaRow.valor_total) || 0

          // Atualizar colunas fiscais novas + dados_ocr.totais SEM alterar itens
          const updatedDadosOcr = {
            ...(notaRow.dados_ocr || {}),
            totais: {
              ...(notaRow.dados_ocr?.totais || {}),
              ...t,
            },
          }

          const { error: updErr } = await supabase
            .from('notas_fiscais')
            .update({
              valor_produtos: vProdutos,
              valor_frete: vFrete,
              valor_seguro: vSeguro,
              valor_desconto: vDesconto,
              valor_outras_despesas: vOutras,
              valor_ipi: vIpi,
              valor_st: vSt,
              valor_total: vTotal,
              dados_ocr: updatedDadosOcr,
            })
            .eq('id', alerta.nota_id)

          if (updErr) {
            errosOcorridos.push(`Nota ${notaRow.numero_nota || alerta.nota_id}: ${updErr.message}`)
            continuamPendentes++
          } else {
            resolvidas++
          }
        } catch (itemErr: any) {
          errosOcorridos.push(`Nota ${alerta.numero_nota || alerta.nota_id}: ${itemErr.message}`)
          continuamPendentes++
        }
      }

      // Recarrega alertas para conferir o resultado final após a view recalcular
      triggerAlertasReload()
      await onReload()

      setBatchResultModal({
        resolvidas,
        pendentes: continuamPendentes,
        total: notasCandidatas.length,
        erros: errosOcorridos,
      })
    } catch (gErr: any) {
      toast({
        title: 'Erro no processamento em lote',
        description: gErr.message || 'Falha ao reprocessar notas.',
        variant: 'destructive',
      })
    } finally {
      setIsBatchReprocessing(false)
    }
  }

  // Confirmar Marcar como conferida com observação obrigatória
  const handleConfirmConferencia = async () => {
    if (!conferirNota) return
    const obs = observacaoConferencia.trim()
    if (!obs) {
      toast({
        title: 'Observação obrigatória',
        description:
          'Informe o motivo ou justificativa (ex.: "diferença é frete", "conferido com financeiro").',
        variant: 'destructive',
      })
      return
    }

    setIsSubmittingConferencia(true)
    try {
      const res = await rpcMarcarNotaConferida({
        nota_id: conferirNota.nota_id,
        usuario_id: user?.id || null,
        observacao: obs,
        tipo_alerta: conferirNota.tipo_alerta,
      })

      if (!res.success) {
        throw new Error(res.error || 'Falha ao marcar nota como conferida')
      }

      toast({
        title: 'Nota conferida!',
        description: `Nota ${conferirNota.numero_nota || ''} marcada como conferida e removida da lista.`,
      })

      setConferirNota(null)
      setObservacaoConferencia('')
      triggerAlertasReload()
      await onReload()
    } catch (err: any) {
      toast({
        title: 'Erro ao conferir nota',
        description: err.message,
        variant: 'destructive',
      })
    } finally {
      setIsSubmittingConferencia(false)
    }
  }

  const getGravidadeBadge = (gravidade: GravidadeAlerta, tipoAlerta?: TipoAlertaNota) => {
    const efGravidade = tipoAlerta === 'IMPOSTOS_NAO_INFORMADOS' ? 'baixa' : gravidade
    if (efGravidade === 'alta') {
      return (
        <Badge className="bg-red-500 hover:bg-red-600 text-white border-none gap-1 font-semibold text-[11px]">
          <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
          Alta
        </Badge>
      )
    }
    if (efGravidade === 'media') {
      return (
        <Badge className="bg-amber-500 hover:bg-amber-600 text-white border-none gap-1 font-semibold text-[11px]">
          <span className="w-1.5 h-1.5 rounded-full bg-white" />
          Média
        </Badge>
      )
    }
    return (
      <Badge
        variant="outline"
        className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700 font-medium text-[11px]"
      >
        Baixa
      </Badge>
    )
  }

  const getTipoAlertaBadge = (tipo: TipoAlertaNota) => {
    const label = TIPO_ALERTA_LABELS[tipo] || tipo
    return (
      <Badge
        variant="outline"
        className="text-[10px] font-medium bg-muted/60 text-foreground border-border whitespace-nowrap"
      >
        {label}
      </Badge>
    )
  }

  return (
    <div className="space-y-4">
      {/* Barra de Filtros e Busca */}
      <Card className="border-border shadow-xs">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por número da nota ou fornecedor..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8 h-9 text-xs"
              />
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <Select value={filterGravidade} onValueChange={setFilterGravidade}>
                <SelectTrigger className="w-[140px] h-9 text-xs">
                  <SelectValue placeholder="Gravidade" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todas" className="text-xs">
                    Todas as gravidades
                  </SelectItem>
                  <SelectItem value="alta" className="text-xs">
                    Alta (Vermelho)
                  </SelectItem>
                  <SelectItem value="media" className="text-xs">
                    Média (Amarelo)
                  </SelectItem>
                  <SelectItem value="baixa" className="text-xs">
                    Baixa (Cinza)
                  </SelectItem>
                </SelectContent>
              </Select>

              <Select value={filterTipo} onValueChange={setFilterTipo}>
                <SelectTrigger className="w-[190px] h-9 text-xs">
                  <SelectValue placeholder="Tipo de alerta" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos" className="text-xs">
                    Todos os tipos
                  </SelectItem>
                  <SelectItem value="SEM_ITENS" className="text-xs">
                    Sem itens
                  </SelectItem>
                  <SelectItem value="ITENS_IDENTICOS" className="text-xs">
                    Itens idênticos
                  </SelectItem>
                  <SelectItem value="SEM_ENTRADA_ESTOQUE" className="text-xs">
                    Sem entrada no estoque
                  </SelectItem>
                  <SelectItem value="ITEM_SEM_VINCULO" className="text-xs">
                    Item sem vínculo
                  </SelectItem>
                  <SelectItem value="TOTAL_DIVERGENTE" className="text-xs">
                    Total divergente
                  </SelectItem>
                  <SelectItem value="IMPOSTOS_NAO_INFORMADOS" className="text-xs">
                    Impostos/Frete não informados
                  </SelectItem>
                  <SelectItem value="SEM_CONTA_PAGAR" className="text-xs">
                    Sem conta a pagar
                  </SelectItem>
                </SelectContent>
              </Select>

              {userCanResolve && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleReprocessarTotaisEmLote}
                  disabled={isBatchReprocessing || loading}
                  className="h-9 text-xs text-blue-700 border-blue-300 hover:bg-blue-50 dark:text-blue-300 dark:border-blue-700 dark:hover:bg-blue-950/40 gap-1.5"
                  title="Reprocessar leitura de totais da Camada 1 para notas com alerta de impostos ou divergência"
                >
                  {isBatchReprocessing ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Sparkles className="w-3.5 h-3.5" />
                  )}
                  <span>Reprocessar totais em lote</span>
                </Button>
              )}

              {(search || filterGravidade !== 'todas' || filterTipo !== 'todos') && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setSearch('')
                    setFilterGravidade('todas')
                    setFilterTipo('todos')
                  }}
                  className="h-9 text-xs text-muted-foreground hover:text-foreground gap-1"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  Limpar
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabela de Pendências */}
      <Card className="border-border shadow-xs overflow-hidden">
        <CardHeader className="py-3 px-4 bg-muted/30 border-b border-border flex flex-row items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-orange-500" />
            <CardTitle className="text-sm font-semibold">
              Notas com Pendência ({filteredAlertas.length})
            </CardTitle>
          </div>
          <span className="text-[11px] text-muted-foreground">
            Ordenado por gravidade e maior divergência
          </span>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="py-16 text-center flex flex-col items-center justify-center gap-2 text-muted-foreground">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
              <p className="text-xs">Carregando notas pendentes...</p>
            </div>
          ) : error && filteredAlertas.length === 0 ? (
            <div className="py-12 text-center flex flex-col items-center justify-center gap-3 px-4">
              <AlertCircle className="w-8 h-8 text-amber-500" />
              <div>
                <p className="font-semibold text-sm text-foreground">
                  Não foi possível obter o resumo de pendências
                </p>
                <p className="text-xs text-muted-foreground max-w-md mt-1">
                  A visualização de pendências está temporariamente indisponível. Você ainda pode
                  usar o Leitor de Notas e gerenciar o estoque normalmente.
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => onReload()}
                className="text-xs gap-1.5 h-8 mt-1"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Tentar novamente
              </Button>
            </div>
          ) : filteredAlertas.length === 0 ? (
            <div className="py-16 text-center flex flex-col items-center justify-center gap-2">
              <CheckCircle2 className="w-10 h-10 text-emerald-500" />
              <p className="font-semibold text-sm text-foreground">
                Nenhuma nota com pendência encontrada!
              </p>
              <p className="text-xs text-muted-foreground max-w-sm">
                {alertas.length === 0
                  ? 'Todas as notas fiscais estão em dia e conferidas.'
                  : 'Nenhum registro corresponde aos filtros selecionados.'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-b border-border hover:bg-transparent">
                    <TableHead className="w-[85px] text-xs font-semibold">Gravidade</TableHead>
                    <TableHead className="w-[100px] text-xs font-semibold">Nota</TableHead>
                    <TableHead className="min-w-[150px] text-xs font-semibold">
                      Fornecedor
                    </TableHead>
                    <TableHead className="w-[95px] text-xs font-semibold">Emissão</TableHead>
                    <TableHead className="w-[110px] text-xs font-semibold text-right">
                      Valor
                    </TableHead>
                    <TableHead className="min-w-[200px] text-xs font-semibold">Mensagem</TableHead>
                    <TableHead className="min-w-[180px] text-xs font-semibold">
                      Ação Sugerida
                    </TableHead>
                    <TableHead className="w-[180px] text-xs font-semibold text-right">
                      Ações
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredAlertas.map((alerta, idx) => {
                    const isTotalDiv = alerta.tipo_alerta === 'TOTAL_DIVERGENTE'
                    const isImpostos = alerta.tipo_alerta === 'IMPOSTOS_NAO_INFORMADOS'
                    const isSemConta = alerta.tipo_alerta === 'SEM_CONTA_PAGAR'
                    const isSemEstoque = alerta.tipo_alerta === 'SEM_ENTRADA_ESTOQUE'

                    return (
                      <TableRow
                        key={`${alerta.nota_id}-${alerta.tipo_alerta}-${idx}`}
                        className="border-b border-border hover:bg-muted/40 transition-colors"
                      >
                        <TableCell className="py-3">
                          {getGravidadeBadge(alerta.gravidade, alerta.tipo_alerta)}
                        </TableCell>
                        <TableCell className="py-3 font-semibold text-xs text-foreground">
                          {alerta.numero_nota || 'S/N'}
                        </TableCell>
                        <TableCell className="py-3 text-xs text-foreground">
                          <div
                            className="font-medium truncate max-w-[200px]"
                            title={alerta.fornecedor || ''}
                          >
                            {alerta.fornecedor || 'Desconhecido'}
                          </div>
                          <div className="mt-0.5">{getTipoAlertaBadge(alerta.tipo_alerta)}</div>
                        </TableCell>
                        <TableCell className="py-3 text-xs text-muted-foreground whitespace-nowrap">
                          {formatDate(alerta.data_emissao)}
                        </TableCell>
                        <TableCell className="py-3 text-xs text-right font-medium">
                          <div className="text-foreground">
                            {formatCurrency(alerta.valor_total)}
                          </div>
                          {alerta.diferenca !== null &&
                            alerta.diferenca !== undefined &&
                            Math.abs(alerta.diferenca) > 0.001 && (
                              <div
                                className="text-[10px] font-semibold text-rose-600 dark:text-rose-400"
                                title={`Soma itens: ${formatCurrency(alerta.soma_itens)}`}
                              >
                                Dif: {formatCurrency(alerta.diferenca)}
                              </div>
                            )}
                        </TableCell>
                        <TableCell className="py-3 text-xs text-foreground">
                          <p className="line-clamp-2 leading-relaxed" title={alerta.mensagem}>
                            {alerta.mensagem}
                          </p>
                        </TableCell>
                        <TableCell className="py-3 text-xs text-muted-foreground">
                          <p
                            className="line-clamp-2 leading-relaxed italic"
                            title={alerta.acao_sugerida}
                          >
                            {alerta.acao_sugerida}
                          </p>
                        </TableCell>
                        <TableCell className="py-3 text-right">
                          <div className="flex items-center justify-end gap-1.5 flex-nowrap">
                            {/* Ações rápidas por tipo */}
                            {isImpostos && (
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <span>
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        disabled={!userCanResolve}
                                        onClick={() => handleOpenInformarImpostos(alerta)}
                                        className="h-7 px-2 text-[11px] font-semibold border-amber-300 dark:border-amber-700 text-amber-800 dark:text-amber-300 bg-amber-50/50 hover:bg-amber-100 dark:bg-amber-950/30 dark:hover:bg-amber-950/50 gap-1"
                                      >
                                        <Sparkles className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                                        <span>Informar impostos/frete</span>
                                      </Button>
                                    </span>
                                  </TooltipTrigger>
                                  {!userCanResolve && (
                                    <TooltipContent className="text-xs">
                                      Disponível apenas para os papéis Gestor e Compras
                                    </TooltipContent>
                                  )}
                                </Tooltip>
                              </TooltipProvider>
                            )}

                            {isSemEstoque && (
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <span>
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        disabled={!userCanResolve}
                                        onClick={() => handleOpenLancarEstoque(alerta)}
                                        className="h-7 px-2 text-[11px] font-medium border-emerald-300 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 gap-1"
                                      >
                                        <PackagePlus className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                                        <span>Lançar estoque</span>
                                      </Button>
                                    </span>
                                  </TooltipTrigger>
                                  {!userCanResolve && (
                                    <TooltipContent className="text-xs">
                                      Disponível apenas para os papéis Gestor e Compras
                                    </TooltipContent>
                                  )}
                                </Tooltip>
                              </TooltipProvider>
                            )}

                            {(isTotalDiv || isSemConta) && (
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <span>
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        disabled={!userCanResolve}
                                        onClick={() => handleOpenConferir(alerta)}
                                        className="h-7 px-2 text-[11px] font-medium border-blue-300 dark:border-blue-800 text-blue-700 dark:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-950/40 gap-1"
                                      >
                                        <Check className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                                        <span>Marcar como conferida</span>
                                      </Button>
                                    </span>
                                  </TooltipTrigger>
                                  {!userCanResolve && (
                                    <TooltipContent className="text-xs">
                                      Disponível apenas para os papéis Gestor e Compras
                                    </TooltipContent>
                                  )}
                                </Tooltip>
                              </TooltipProvider>
                            )}

                            {/* Botão "Resolver" principal (abre NotaReviewPanel) */}
                            <Button
                              size="sm"
                              onClick={() => handleOpenResolver(alerta)}
                              disabled={isLoadingNotaEdit}
                              className="h-7 px-2.5 text-[11px] font-semibold bg-primary hover:bg-primary/90 text-primary-foreground gap-1"
                            >
                              <Wrench className="w-3 h-3" />
                              <span>Resolver</span>
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* MODAL 1: Resolver Nota com o NotaReviewPanel em modo de edição já existente */}
      <Dialog
        open={Boolean(selectedNotaForEdit)}
        onOpenChange={(open) => {
          if (!open) setSelectedNotaForEdit(null)
        }}
      >
        <DialogContent className="max-w-5xl max-h-[92vh] overflow-y-auto p-6">
          <DialogHeader className="border-b border-border pb-3">
            <div className="flex items-center justify-between">
              <div>
                <DialogTitle className="text-lg font-bold flex items-center gap-2">
                  <FileText className="w-5 h-5 text-primary" />
                  Editar e Conciliar Nota Fiscal: {selectedNotaForEdit?.numero_nota || 'S/N'}
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                  Fornecedor: {selectedNotaForEdit?.fornecedor} · Emissão:{' '}
                  {formatDate(selectedNotaForEdit?.data_emissao)} · Total:{' '}
                  {formatCurrency(selectedNotaForEdit?.valor_total)}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          {selectedNotaForEdit && (
            <div className="py-2">
              <NotaReviewPanel nota={selectedNotaForEdit} onResolved={handleNotaResolved} />
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* MODAL 2: Ação Rápida "Lançar Estoque" com confirmação dos itens */}
      <Dialog
        open={Boolean(lancarEstoqueNota)}
        onOpenChange={(open) => {
          if (!open) setLancarEstoqueNota(null)
        }}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2 text-emerald-700 dark:text-emerald-400">
              <PackagePlus className="w-5 h-5" />
              Lançar Itens no Estoque
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Confira os itens e quantidades da nota fiscal{' '}
              <strong>{lancarEstoqueNota?.numero_nota || ''}</strong> que entrarão no estoque:
            </DialogDescription>
          </DialogHeader>

          <div className="py-2">
            {isLoadingItens ? (
              <div className="py-8 text-center flex flex-col items-center justify-center gap-2 text-muted-foreground">
                <Loader2 className="w-5 h-5 animate-spin text-primary" />
                <p className="text-xs">Buscando itens da nota fiscal...</p>
              </div>
            ) : itensEstoquePreview.length === 0 ? (
              <div className="p-4 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 text-xs text-amber-800 dark:text-amber-200">
                Aviso: Nenhum item estruturado foi encontrado para esta nota. O sincronismo pode dar
                entrada com base nos dados registrados.
              </div>
            ) : (
              <div className="border border-border rounded-lg max-h-60 overflow-y-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="border-b border-border">
                      <TableHead className="text-[11px] font-semibold py-2">Item</TableHead>
                      <TableHead className="text-[11px] font-semibold py-2 text-right">
                        Qtd
                      </TableHead>
                      <TableHead className="text-[11px] font-semibold py-2 text-right">
                        Vlr Unit
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {itensEstoquePreview.map((item, idx) => (
                      <TableRow key={idx} className="border-b border-border/50">
                        <TableCell className="py-1.5 text-xs font-medium text-foreground">
                          {item.nome}
                        </TableCell>
                        <TableCell className="py-1.5 text-xs text-right font-semibold text-foreground">
                          {item.quantidade} {item.unidade || 'UN'}
                        </TableCell>
                        <TableCell className="py-1.5 text-xs text-right text-muted-foreground">
                          {formatCurrency(item.valor)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setLancarEstoqueNota(null)}
              disabled={isSubmittingEstoque}
              className="text-xs"
            >
              Cancelar
            </Button>
            <Button
              size="sm"
              onClick={handleConfirmLancarEstoque}
              disabled={isSubmittingEstoque || isLoadingItens}
              className="text-xs bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5"
            >
              {isSubmittingEstoque ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Lançando...</span>
                </>
              ) : (
                <>
                  <Check className="w-3.5 h-3.5" />
                  <span>Confirmar e Lançar Estoque</span>
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODAL 3: Ação Rápida "Marcar como Conferida" com observação obrigatória */}
      <Dialog
        open={Boolean(conferirNota)}
        onOpenChange={(open) => {
          if (!open) {
            setConferirNota(null)
            setObservacaoConferencia('')
          }
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2 text-blue-700 dark:text-blue-400">
              <Check className="w-5 h-5" />
              Marcar Nota Fiscal como Conferida
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Nota: <strong>{conferirNota?.numero_nota || 'S/N'}</strong> · Fornecedor:{' '}
              <strong>{conferirNota?.fornecedor || ''}</strong>
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <div className="bg-blue-50 dark:bg-blue-950/30 p-3 rounded-lg border border-blue-200 dark:border-blue-800 text-xs text-blue-900 dark:text-blue-100">
              <p className="font-semibold mb-0.5">
                Alerta atual: {conferirNota ? TIPO_ALERTA_LABELS[conferirNota.tipo_alerta] : ''}
              </p>
              <p>{conferirNota?.mensagem}</p>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground flex items-center gap-1">
                <span>Observação da conferência</span>
                <span className="text-rose-500">* (Obrigatório)</span>
              </label>
              <Textarea
                rows={3}
                placeholder="Exemplo: 'Diferença de R$ 35,00 é frete destacado fora da soma de produtos' ou 'Conferido com financeiro'."
                value={observacaoConferencia}
                onChange={(e) => setObservacaoConferencia(e.target.value)}
                className="text-xs"
                autoFocus
              />
              <p className="text-[11px] text-muted-foreground">
                Esta justificativa será registrada no histórico e na auditoria do sistema.
              </p>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setConferirNota(null)
                setObservacaoConferencia('')
              }}
              disabled={isSubmittingConferencia}
              className="text-xs"
            >
              Cancelar
            </Button>
            <Button
              size="sm"
              onClick={handleConfirmConferencia}
              disabled={isSubmittingConferencia || !observacaoConferencia.trim()}
              className="text-xs bg-blue-600 hover:bg-blue-700 text-white gap-1.5"
            >
              {isSubmittingConferencia ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Salvando...</span>
                </>
              ) : (
                <>
                  <Check className="w-3.5 h-3.5" />
                  <span>Confirmar Conferência</span>
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODAL 4: Informar impostos/frete (IMPOSTOS_NAO_INFORMADOS) */}
      <Dialog
        open={Boolean(impostosModalNota)}
        onOpenChange={(open) => {
          if (!open) {
            setImpostosModalNota(null)
            setErroImpostosRpc(null)
          }
        }}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2 text-amber-700 dark:text-amber-400">
              <Sparkles className="w-5 h-5" />
              Informar Impostos e Frete da Nota
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Nota fiscal <strong>{impostosModalNota?.numero_nota || 'S/N'}</strong> · Fornecedor:{' '}
              <strong>{impostosModalNota?.fornecedor || 'Desconhecido'}</strong>
            </DialogDescription>
          </DialogHeader>

          {impostosModalNota &&
            (() => {
              const totalNota = Number(impostosModalNota.valor_total) || 0
              const somaItens = Number(impostosModalNota.soma_itens) || 0
              const diferencaCalculada =
                impostosModalNota.diferenca !== null && impostosModalNota.diferenca !== undefined
                  ? Math.abs(impostosModalNota.diferenca)
                  : Math.max(0, Math.round((totalNota - somaItens) * 100) / 100)

              const somaInformada =
                Math.round(
                  (Number(formImpostos.frete) +
                    Number(formImpostos.ipi) +
                    Number(formImpostos.st) +
                    Number(formImpostos.outras) -
                    Number(formImpostos.desconto)) *
                    100,
                ) / 100

              const saldoPendente = Math.round((diferencaCalculada - somaInformada) * 100) / 100

              return (
                <div className="space-y-4 py-2">
                  {/* Resumo da Diferença */}
                  <div className="bg-amber-50 dark:bg-amber-950/30 p-3 rounded-lg border border-amber-200 dark:border-amber-800 space-y-1.5 text-xs text-amber-900 dark:text-amber-200">
                    <div className="flex items-center justify-between font-medium">
                      <span>Total da nota:</span>
                      <strong className="text-sm">{formatCurrency(totalNota)}</strong>
                    </div>
                    <div className="flex items-center justify-between text-muted-foreground">
                      <span>Soma dos itens:</span>
                      <span>{formatCurrency(somaItens)}</span>
                    </div>
                    <div className="flex items-center justify-between border-t border-amber-200 dark:border-amber-800 pt-1.5 font-bold text-amber-900 dark:text-amber-100">
                      <span>Diferença a classificar (Total − Itens):</span>
                      <span className="text-sm text-rose-600 dark:text-rose-400">
                        {formatCurrency(diferencaCalculada)}
                      </span>
                    </div>
                  </div>

                  {/* Atalhos rápidos para preenchimento */}
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-semibold text-muted-foreground">Atalhos:</span>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setFormImpostos({
                          frete: diferencaCalculada,
                          ipi: 0,
                          st: 0,
                          outras: 0,
                          desconto: 0,
                        })
                        setErroImpostosRpc(null)
                      }}
                      className="h-7 text-xs border-amber-300 hover:bg-amber-50 dark:border-amber-800 dark:hover:bg-amber-950/40 text-amber-800 dark:text-amber-300"
                    >
                      A diferença toda é frete
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setFormImpostos({
                          frete: 0,
                          ipi: diferencaCalculada,
                          st: 0,
                          outras: 0,
                          desconto: 0,
                        })
                        setErroImpostosRpc(null)
                      }}
                      className="h-7 text-xs border-amber-300 hover:bg-amber-50 dark:border-amber-800 dark:hover:bg-amber-950/40 text-amber-800 dark:text-amber-300"
                    >
                      A diferença toda é IPI
                    </Button>
                  </div>

                  {/* Campos: Frete, IPI, ICMS-ST, Outras e Desconto */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="text-[11px] font-medium text-slate-700 dark:text-slate-300 block mb-1">
                        Frete (R$)
                      </label>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        value={formImpostos.frete}
                        onChange={(e) => {
                          setFormImpostos((p) => ({ ...p, frete: parseFloat(e.target.value) || 0 }))
                          setErroImpostosRpc(null)
                        }}
                        className="h-8 text-xs font-semibold"
                      />
                    </div>

                    <div>
                      <label className="text-[11px] font-medium text-slate-700 dark:text-slate-300 block mb-1">
                        IPI (R$)
                      </label>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        value={formImpostos.ipi}
                        onChange={(e) => {
                          setFormImpostos((p) => ({ ...p, ipi: parseFloat(e.target.value) || 0 }))
                          setErroImpostosRpc(null)
                        }}
                        className="h-8 text-xs font-semibold"
                      />
                    </div>

                    <div>
                      <label className="text-[11px] font-medium text-slate-700 dark:text-slate-300 block mb-1">
                        ICMS-ST (R$)
                      </label>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        value={formImpostos.st}
                        onChange={(e) => {
                          setFormImpostos((p) => ({ ...p, st: parseFloat(e.target.value) || 0 }))
                          setErroImpostosRpc(null)
                        }}
                        className="h-8 text-xs"
                      />
                    </div>

                    <div>
                      <label className="text-[11px] font-medium text-slate-700 dark:text-slate-300 block mb-1">
                        Outras despesas (R$)
                      </label>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        value={formImpostos.outras}
                        onChange={(e) => {
                          setFormImpostos((p) => ({
                            ...p,
                            outras: parseFloat(e.target.value) || 0,
                          }))
                          setErroImpostosRpc(null)
                        }}
                        className="h-8 text-xs"
                      />
                    </div>

                    <div>
                      <label className="text-[11px] font-medium text-slate-700 dark:text-slate-300 block mb-1">
                        Desconto (-) (R$)
                      </label>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        value={formImpostos.desconto}
                        onChange={(e) => {
                          setFormImpostos((p) => ({
                            ...p,
                            desconto: parseFloat(e.target.value) || 0,
                          }))
                          setErroImpostosRpc(null)
                        }}
                        className="h-8 text-xs text-emerald-700 dark:text-emerald-400 font-medium"
                      />
                    </div>

                    <div className="flex flex-col justify-end">
                      <span className="text-[11px] text-muted-foreground block mb-1">
                        Saldo restante:
                      </span>
                      <div
                        className={`h-8 px-2 flex items-center font-bold text-xs rounded-md border ${
                          Math.abs(saldoPendente) <= 0.05
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-950/40 dark:border-emerald-800'
                            : 'bg-rose-50 text-rose-700 border-rose-300 dark:bg-rose-950/40 dark:border-rose-800'
                        }`}
                      >
                        {formatCurrency(saldoPendente)}
                      </div>
                    </div>
                  </div>

                  {/* Exibição de mensagem de erro da RPC caso os valores não fechem */}
                  {erroImpostosRpc && (
                    <div className="p-3 bg-red-50 dark:bg-red-950/40 border border-red-300 dark:border-red-800 rounded-md text-xs text-red-800 dark:text-red-200 flex items-start gap-2">
                      <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                      <div>
                        <p className="font-semibold">Erro ao validar classificação:</p>
                        <p className="mt-0.5">{erroImpostosRpc}</p>
                      </div>
                    </div>
                  )}
                </div>
              )
            })()}

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setImpostosModalNota(null)
                setErroImpostosRpc(null)
              }}
              disabled={isSubmittingImpostos}
              className="text-xs"
            >
              Cancelar
            </Button>
            <Button
              size="sm"
              onClick={handleConfirmClassificarDiferenca}
              disabled={isSubmittingImpostos}
              className="text-xs bg-amber-600 hover:bg-amber-700 text-white gap-1.5"
            >
              {isSubmittingImpostos ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Validando no banco...</span>
                </>
              ) : (
                <>
                  <Check className="w-3.5 h-3.5" />
                  <span>Confirmar e Salvar</span>
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODAL 5: Relatório do Reprocessamento em Lote */}
      <Dialog
        open={Boolean(batchResultModal)}
        onOpenChange={(open) => {
          if (!open) setBatchResultModal(null)
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2 text-blue-700 dark:text-blue-400">
              <Sparkles className="w-5 h-5" />
              Reprocessamento de Totais em Lote Concluído
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Resultado da execução da Camada 1 (parser de texto sem IA) sobre as notas elegíveis:
            </DialogDescription>
          </DialogHeader>

          {batchResultModal && (
            <div className="space-y-3 py-2 text-xs">
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800 border dark:border-slate-700">
                  <span className="text-[11px] text-muted-foreground block">Total Elegíveis</span>
                  <strong className="text-base text-foreground font-bold">
                    {batchResultModal.total}
                  </strong>
                </div>
                <div className="p-2.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800">
                  <span className="text-[11px] text-emerald-700 dark:text-emerald-400 block">
                    Resolvidas / Atualizadas
                  </span>
                  <strong className="text-base text-emerald-700 dark:text-emerald-300 font-bold">
                    {batchResultModal.resolvidas}
                  </strong>
                </div>
                <div className="p-2.5 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800">
                  <span className="text-[11px] text-amber-700 dark:text-amber-400 block">
                    Continuam Pendentes
                  </span>
                  <strong className="text-base text-amber-700 dark:text-amber-300 font-bold">
                    {batchResultModal.pendentes}
                  </strong>
                </div>
              </div>

              {batchResultModal.erros.length > 0 && (
                <div className="mt-2 p-2.5 bg-muted/40 rounded-md border border-border text-[11px] max-h-36 overflow-y-auto space-y-1">
                  <p className="font-semibold text-foreground">
                    Notas que exigem conferência manual:
                  </p>
                  {batchResultModal.erros.map((e, idx) => (
                    <p key={idx} className="text-muted-foreground">
                      • {e}
                    </p>
                  ))}
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button
              size="sm"
              onClick={() => setBatchResultModal(null)}
              className="text-xs bg-primary text-primary-foreground"
            >
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
