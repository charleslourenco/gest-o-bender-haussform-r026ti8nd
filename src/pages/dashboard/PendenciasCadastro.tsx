import React, { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '@/lib/supabase/client'
import { runWithAuthRecovery } from '@/lib/supabase/auth-recovery'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  AlertTriangle,
  AlertCircle,
  CheckCircle2,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Wrench,
  Check,
  Loader2,
} from 'lucide-react'

export interface PendenciaOpcaoItem {
  valor: string
  rotulo: string
}

export type PendenciaOpcoesMap = Record<string, PendenciaOpcaoItem[]>

export interface PendenciaCampo {
  nome: string
  rotulo: string
  tipo: 'select' | 'texto' | string
  opcoes?: string
  obrigatorio?: boolean
}

export interface PendenciaAcao {
  acao: string
  rotulo: string
  campos?: PendenciaCampo[]
}

export interface PendenciaItem {
  lead_id: string
  nome: string | null
  telefone: string | null
  status: string | null
  responsavel: string | null
  origem: string | null
  criado_em: string | null
  observacao: string | null
}

export interface PendenciaFila {
  chave: string
  titulo: string
  explicacao: string
  como_resolver: string
  quantidade: number
  itens: PendenciaItem[]
  acoes?: PendenciaAcao[]
}

export interface PendenciasListasResponse {
  gerado_em?: string
  total: number
  cadastros_distintos: number
  erros_de_registro: number
  filas: PendenciaFila[]
  opcoes?: PendenciaOpcoesMap
}

function formatData(val: string | null | undefined): string {
  if (!val) return '-'
  try {
    const dataPart = val.split('T')[0]
    const partes = dataPart.split('-')
    if (partes.length === 3) {
      const [ano, mes, dia] = partes
      if (ano.length === 4 && mes.length <= 2 && dia.length <= 2) {
        return `${dia.padStart(2, '0')}/${mes.padStart(2, '0')}/${ano}`
      }
    }
    const d = new Date(val)
    if (!isNaN(d.getTime())) {
      const dia = String(d.getDate()).padStart(2, '0')
      const mes = String(d.getMonth() + 1).padStart(2, '0')
      const ano = d.getFullYear()
      return `${dia}/${mes}/${ano}`
    }
  } catch {
    // fallback
  }
  return val
}

interface FormInlineProps {
  acao: PendenciaAcao
  opcoes: PendenciaOpcoesMap
  isSaving: boolean
  errorMessage: string | null
  onConfirm: (valores: Record<string, string>) => void
  onCancel: () => void
}

function PendenciaFormInline({
  acao,
  opcoes,
  isSaving,
  errorMessage,
  onConfirm,
  onCancel,
}: FormInlineProps) {
  const campos = acao.campos || []
  const [formValues, setFormValues] = useState<Record<string, string>>({})
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({})

  const handleChange = (nome: string, valor: string) => {
    setFormValues((prev) => ({ ...prev, [nome]: valor }))
    if (validationErrors[nome]) {
      setValidationErrors((prev) => {
        const next = { ...prev }
        delete next[nome]
        return next
      })
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (isSaving) return

    const errors: Record<string, string> = {}
    for (const campo of campos) {
      if (campo.obrigatorio) {
        const val = formValues[campo.nome]?.trim()
        if (!val) {
          errors[campo.nome] = `O campo "${campo.rotulo}" é obrigatório.`
        }
      }
    }

    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors)
      return
    }

    setValidationErrors({})
    onConfirm(formValues)
  }

  return (
    <div className="p-3 my-1 rounded-lg border border-primary/20 bg-background shadow-xs text-xs space-y-3 animate-in fade-in-50 duration-200">
      <form onSubmit={handleSubmit} className="space-y-3">
        {campos.length === 0 ? (
          <p className="text-sm font-medium text-foreground py-1">
            Confirmar: <strong className="text-primary">{acao.rotulo}</strong>?
          </p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {campos.map((campo) => {
              const isRequired = Boolean(campo.obrigatorio)
              const hasError = Boolean(validationErrors[campo.nome])

              if (campo.tipo === 'select') {
                const listaOpcoes = campo.opcoes ? opcoes[campo.opcoes] || [] : []
                const currentVal = formValues[campo.nome] || ''

                return (
                  <div key={campo.nome} className="space-y-1">
                    <Label className="text-xs font-semibold text-foreground flex items-center gap-1">
                      <span>{campo.rotulo}</span>
                      {isRequired && <span className="text-destructive font-bold">*</span>}
                    </Label>
                    <Select
                      value={currentVal}
                      onValueChange={(val) => handleChange(campo.nome, val)}
                      disabled={isSaving}
                    >
                      <SelectTrigger
                        className={`h-8 text-xs bg-card ${
                          hasError ? 'border-destructive focus:ring-destructive' : ''
                        }`}
                      >
                        <SelectValue placeholder={`Selecione ${campo.rotulo.toLowerCase()}...`} />
                      </SelectTrigger>
                      <SelectContent className="max-h-56 z-50">
                        {listaOpcoes.map((op) => (
                          <SelectItem key={op.valor} value={op.valor} className="text-xs">
                            {op.rotulo}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {hasError && (
                      <p className="text-[11px] text-destructive font-medium">
                        {validationErrors[campo.nome]}
                      </p>
                    )}
                  </div>
                )
              }

              return (
                <div key={campo.nome} className="space-y-1">
                  <Label className="text-xs font-semibold text-foreground flex items-center gap-1">
                    <span>{campo.rotulo}</span>
                    {isRequired && <span className="text-destructive font-bold">*</span>}
                  </Label>
                  <Input
                    type="text"
                    value={formValues[campo.nome] || ''}
                    onChange={(e) => handleChange(campo.nome, e.target.value)}
                    disabled={isSaving}
                    placeholder={`Informe ${campo.rotulo.toLowerCase()}...`}
                    className={`h-8 text-xs bg-card ${
                      hasError ? 'border-destructive focus-visible:ring-destructive' : ''
                    }`}
                  />
                  {hasError && (
                    <p className="text-[11px] text-destructive font-medium">
                      {validationErrors[campo.nome]}
                    </p>
                  )}
                </div>
              )
            })}
          </div>
        )}

        {errorMessage && (
          <div className="p-2.5 rounded-md border border-destructive/40 bg-destructive/10 text-destructive flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span className="text-xs font-medium">{errorMessage}</span>
          </div>
        )}

        <div className="flex items-center justify-end gap-2 pt-1 border-t border-border/40">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onCancel}
            disabled={isSaving}
            className="h-7 px-3 text-xs"
          >
            Cancelar
          </Button>
          <Button
            type="submit"
            size="sm"
            disabled={isSaving}
            className="h-7 px-3 text-xs gap-1.5 font-semibold"
          >
            {isSaving ? (
              <>
                <Loader2 className="h-3 w-3 animate-spin" />
                <span>Gravando...</span>
              </>
            ) : (
              <span>OK</span>
            )}
          </Button>
        </div>
      </form>
    </div>
  )
}

export function PendenciasCadastro() {
  const [data, setData] = useState<PendenciasListasResponse | null>(null)
  const [loading, setLoading] = useState<boolean>(true)
  const [refreshing, setRefreshing] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)
  const [expandedFilas, setExpandedFilas] = useState<Record<string, boolean>>({})

  // Estado para resolver inline
  const [resolvingLeadKey, setResolvingLeadKey] = useState<string | null>(null)
  const [selectedAction, setSelectedAction] = useState<{
    leadId: string
    filaChave: string
    acao: PendenciaAcao
  } | null>(null)
  const [savingLeadKey, setSavingLeadKey] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  const fetchData = useCallback(async (isSilentRefresh = false) => {
    if (isSilentRefresh) {
      setRefreshing(true)
    } else {
      setLoading(true)
    }
    setError(null)
    try {
      const res = await runWithAuthRecovery<PendenciasListasResponse>(() =>
        supabase.rpc('painel_pendencias_listas'),
      )

      if (res.error) {
        console.error('[PendenciasCadastro] Erro ao carregar painel_pendencias_listas:', res.error)
        setError(res.error.message || 'Erro ao carregar pendências de cadastro.')
      } else if (res.data) {
        const parsed = (
          typeof res.data === 'string' ? JSON.parse(res.data) : res.data
        ) as PendenciasListasResponse
        setData(parsed)
      } else {
        setError('Nenhum dado retornado da função painel_pendencias_listas.')
      }
    } catch (err: unknown) {
      console.error('[PendenciasCadastro] Exceção ao consultar painel_pendencias_listas:', err)
      const msg = err instanceof Error ? err.message : 'Erro inesperado ao consultar pendências.'
      setError(msg)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const toggleFila = (chave: string) => {
    setExpandedFilas((prev) => ({
      ...prev,
      [chave]: !prev[chave],
    }))
  }

  const handleStartResolver = (leadId: string, filaChave: string, acao: PendenciaAcao) => {
    setActionError(null)
    setSelectedAction({ leadId, filaChave, acao })
    setResolvingLeadKey(`${filaChave}-${leadId}`)
  }

  const handleCancelResolver = () => {
    setSelectedAction(null)
    setResolvingLeadKey(null)
    setActionError(null)
  }

  const handleExecuteResolver = async (
    leadId: string,
    filaChave: string,
    acao: PendenciaAcao,
    valores: Record<string, string>,
  ) => {
    const itemKey = `${filaChave}-${leadId}`
    setSavingLeadKey(itemKey)
    setActionError(null)

    try {
      const res = await runWithAuthRecovery<{ ok?: boolean; mensagem?: string }>(() =>
        supabase.rpc('pendencia_resolver', {
          p_lead_id: leadId,
          p_chave: filaChave,
          p_acao: acao.acao,
          p_dados: valores,
        }),
      )

      if (res.error) {
        console.error('[PendenciasCadastro] Erro RPC pendencia_resolver:', res.error)
        setActionError(res.error.message || 'Erro ao processar resolução da pendência.')
        return
      }

      const resposta = (typeof res.data === 'string' ? JSON.parse(res.data) : res.data) as {
        ok?: boolean
        mensagem?: string
      } | null

      if (!resposta || resposta.ok === false) {
        setActionError(resposta?.mensagem || 'Falha ao resolver pendência.')
        return
      }

      // Sucesso
      const msg = resposta.mensagem || 'Pendência resolvida com sucesso.'
      setSuccessMessage(msg)
      setTimeout(() => {
        setSuccessMessage((prev) => (prev === msg ? null : prev))
      }, 5000)

      setSelectedAction(null)
      setResolvingLeadKey(null)
      setActionError(null)

      // Recarregar mantendo filas expandidas
      await fetchData(true)
    } catch (err: unknown) {
      console.error('[PendenciasCadastro] Exceção em pendencia_resolver:', err)
      const msg = err instanceof Error ? err.message : 'Erro inesperado ao resolver pendência.'
      setActionError(msg)
    } finally {
      setSavingLeadKey(null)
    }
  }

  // Estado de Carregando
  if (loading) {
    return (
      <div className="space-y-3 rounded-xl border border-border p-4 bg-card/60 shadow-xs animate-in fade-in duration-300">
        <div className="flex items-center justify-between">
          <Skeleton className="h-5 w-48" />
          <Skeleton className="h-4 w-36" />
        </div>
        <div className="space-y-2 pt-2">
          <Skeleton className="h-20 w-full rounded-xl" />
          <Skeleton className="h-20 w-full rounded-xl" />
        </div>
      </div>
    )
  }

  // Mensagem de Erro
  if (error || !data) {
    return (
      <div className="rounded-xl border border-destructive/40 bg-destructive/5 p-4 shadow-xs">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <AlertCircle className="h-5 w-5 text-destructive shrink-0" />
            <div>
              <p className="text-sm font-bold text-destructive">
                Falha ao carregar Pendências de cadastro
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {error || 'Não foi possível obter a lista de pendências do banco de dados.'}
              </p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchData()}
            className="border-destructive/30 hover:bg-destructive/10 text-xs gap-1.5 self-end sm:self-auto shrink-0"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Tentar novamente
          </Button>
        </div>
      </div>
    )
  }

  const { total = 0, cadastros_distintos = 0, erros_de_registro = 0, filas = [] } = data
  const filasAtivas = filas.filter((f) => (f.quantidade ?? 0) > 0)
  const temErros = (erros_de_registro ?? 0) > 0
  const semPendencias = total === 0 && !temErros

  return (
    <div className="space-y-3">
      {/* Cabeçalho do Bloco */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border/80 pb-2">
        <div className="flex items-center gap-2 flex-wrap">
          <h3 className="text-sm font-bold tracking-tight text-foreground uppercase">
            Pendências de cadastro
          </h3>
          <span className="text-xs font-medium text-muted-foreground">
            {total} {total === 1 ? 'pendência' : 'pendências'} em {cadastros_distintos}{' '}
            {cadastros_distintos === 1 ? 'cadastro' : 'cadastros'}
          </span>
        </div>

        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => fetchData(true)}
          disabled={refreshing || loading}
          className="h-7 px-2.5 text-xs gap-1.5 self-start sm:self-auto font-medium"
        >
          <RefreshCw className={`h-3 w-3 ${refreshing ? 'animate-spin' : ''}`} />
          <span>Atualizar</span>
        </Button>
      </div>

      {/* Alerta de sucesso de resolução */}
      {successMessage && (
        <div className="p-3 rounded-lg border border-emerald-300/80 bg-emerald-50 dark:border-emerald-900/60 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-200 flex items-center justify-between gap-2 text-xs font-medium animate-in fade-in-50 duration-200">
          <div className="flex items-center gap-2">
            <Check className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span>{successMessage}</span>
          </div>
          <button
            type="button"
            onClick={() => setSuccessMessage(null)}
            className="text-xs text-muted-foreground hover:text-foreground font-semibold px-1"
          >
            ✕
          </button>
        </div>
      )}

      {/* Alerta vermelho: Erros de registro */}
      {temErros && (
        <div className="p-4 rounded-xl border border-rose-300/80 bg-rose-50/90 dark:border-rose-900/60 dark:bg-rose-950/30 flex items-start gap-3 shadow-xs">
          <div className="p-2 rounded-lg bg-rose-600 text-white shrink-0 shadow-xs">
            <AlertCircle className="h-5 w-5" />
          </div>
          <div className="space-y-0.5">
            <p className="text-xs sm:text-sm font-bold text-rose-950 dark:text-rose-100">
              Erros de registro: {erros_de_registro}. Avisar o responsável pelo sistema.
            </p>
            <p className="text-xs text-rose-800 dark:text-rose-300">
              Inconsistências críticas detectadas nos registros cadastrais.
            </p>
          </div>
        </div>
      )}

      {/* Aviso verde: Sem pendências de cadastro */}
      {semPendencias && (
        <div className="p-4 rounded-xl border border-emerald-300/80 bg-emerald-50/90 dark:border-emerald-900/60 dark:bg-emerald-950/30 flex items-center gap-3 shadow-xs">
          <div className="p-2 rounded-lg bg-emerald-600 text-white shrink-0 shadow-xs">
            <CheckCircle2 className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs sm:text-sm font-bold text-emerald-950 dark:text-emerald-100">
              Sem pendências de cadastro.
            </p>
            <p className="text-xs text-emerald-800 dark:text-emerald-300">
              Todos os registros estão com dados consistentes para o cálculo do funil.
            </p>
          </div>
        </div>
      )}

      {/* Filas ativas em estilo alerta âmbar */}
      {filasAtivas.map((fila) => {
        const isExpanded = Boolean(expandedFilas[fila.chave])
        return (
          <div
            key={fila.chave}
            className="rounded-xl border border-amber-300/80 bg-amber-50/90 dark:border-amber-900/60 dark:bg-amber-950/30 shadow-xs overflow-hidden transition-all"
          >
            {/* Linha principal do alerta */}
            <div className="p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div className="flex items-start gap-3 flex-1 min-w-0">
                <div className="p-2 rounded-lg bg-amber-500 text-white shrink-0 shadow-xs mt-0.5 sm:mt-0">
                  <AlertTriangle className="h-5 w-5" />
                </div>
                <div className="min-w-0 space-y-1 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs uppercase font-extrabold text-amber-800 dark:text-amber-300 tracking-wider">
                      {fila.titulo}
                    </span>
                    <Badge
                      variant="outline"
                      className="border-amber-400 text-amber-800 dark:text-amber-300 bg-amber-100/60 dark:bg-amber-900/40 text-[10px] py-0 px-2 font-bold"
                    >
                      {fila.quantidade}
                    </Badge>
                  </div>
                  <p className="text-xs sm:text-sm text-amber-900 dark:text-amber-200 font-medium leading-relaxed">
                    {fila.explicacao}
                  </p>
                  <p className="text-xs text-amber-950 dark:text-amber-100 pt-0.5">
                    <strong className="font-extrabold text-amber-900 dark:text-amber-300">
                      Como resolver:{' '}
                    </strong>
                    <span className="font-semibold">{fila.como_resolver}</span>
                  </p>
                </div>
              </div>

              {/* Botão Ver lista / Recolher */}
              <div className="flex items-center self-end md:self-center shrink-0">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => toggleFila(fila.chave)}
                  className="border-amber-400/80 bg-amber-100/70 hover:bg-amber-200/80 text-amber-900 dark:border-amber-800 dark:bg-amber-900/40 dark:hover:bg-amber-900/70 dark:text-amber-200 font-semibold gap-1.5 shadow-2xs text-xs whitespace-nowrap"
                >
                  {isExpanded ? (
                    <>
                      <span>Recolher lista</span>
                      <ChevronUp className="h-3.5 w-3.5" />
                    </>
                  ) : (
                    <>
                      <span>Ver lista ({fila.quantidade})</span>
                      <ChevronDown className="h-3.5 w-3.5" />
                    </>
                  )}
                </Button>
              </div>
            </div>

            {/* Tabela expansível dos itens */}
            {isExpanded && (
              <div className="border-t border-amber-300/70 dark:border-amber-900/60 bg-background/95 dark:bg-card/95">
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left">
                    <thead>
                      <tr className="border-b border-border/80 bg-muted/40 text-muted-foreground font-semibold">
                        <th className="py-2.5 px-3 whitespace-nowrap">Nome</th>
                        <th className="py-2.5 px-3 whitespace-nowrap">Telefone</th>
                        <th className="py-2.5 px-3 whitespace-nowrap">Status</th>
                        <th className="py-2.5 px-3 whitespace-nowrap">Responsável</th>
                        <th className="py-2.5 px-3 whitespace-nowrap">Origem</th>
                        <th className="py-2.5 px-3 whitespace-nowrap">Criado em</th>
                        <th className="py-2.5 px-3">Observação</th>
                        <th className="py-2.5 px-3 text-right whitespace-nowrap">Ação</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/60">
                      {!fila.itens || fila.itens.length === 0 ? (
                        <tr>
                          <td colSpan={8} className="py-4 text-center text-muted-foreground">
                            Nenhum item listado para esta fila.
                          </td>
                        </tr>
                      ) : (
                        fila.itens.map((item, idx) => {
                          const itemKey = `${fila.chave}-${item.lead_id || idx}`
                          const temAcoes = Array.isArray(fila.acoes) && fila.acoes.length > 0
                          const isSaving = savingLeadKey === itemKey
                          const isFormOpen =
                            resolvingLeadKey === itemKey &&
                            selectedAction?.leadId === item.lead_id &&
                            selectedAction?.filaChave === fila.chave

                          return (
                            <React.Fragment key={itemKey}>
                              <tr className="hover:bg-muted/30 transition-colors">
                                <td className="py-2 px-3 font-semibold text-foreground whitespace-nowrap">
                                  {item.nome || '-'}
                                </td>
                                <td className="py-2 px-3 text-muted-foreground whitespace-nowrap">
                                  {item.telefone || '-'}
                                </td>
                                <td className="py-2 px-3 whitespace-nowrap">
                                  <Badge
                                    variant="outline"
                                    className="text-[10px] py-0 px-1.5 font-medium border-border"
                                  >
                                    {item.status || '-'}
                                  </Badge>
                                </td>
                                <td className="py-2 px-3 text-muted-foreground whitespace-nowrap">
                                  {item.responsavel || '-'}
                                </td>
                                <td className="py-2 px-3 whitespace-nowrap">
                                  <Badge
                                    variant="outline"
                                    className="text-[10px] py-0 px-1.5 font-medium border-border text-foreground/80"
                                  >
                                    {item.origem || 'Não informada'}
                                  </Badge>
                                </td>
                                <td className="py-2 px-3 text-muted-foreground whitespace-nowrap">
                                  {formatData(item.criado_em)}
                                </td>
                                <td
                                  className="py-2 px-3 text-muted-foreground max-w-xs truncate"
                                  title={item.observacao || ''}
                                >
                                  {item.observacao || '-'}
                                </td>
                                <td className="py-2 px-3 text-right whitespace-nowrap">
                                  <div className="flex items-center justify-end gap-1">
                                    {temAcoes && item.lead_id && (
                                      <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                          <Button
                                            type="button"
                                            size="sm"
                                            variant="outline"
                                            disabled={isSaving}
                                            className="h-7 px-2 text-xs font-semibold gap-1 text-foreground border-border hover:bg-muted"
                                          >
                                            <Wrench className="h-3 w-3 text-amber-600 dark:text-amber-400" />
                                            <span>Resolver</span>
                                            <ChevronDown className="h-3 w-3 opacity-60" />
                                          </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end" className="w-56 z-50">
                                          {fila.acoes!.map((acao) => (
                                            <DropdownMenuItem
                                              key={acao.acao}
                                              onClick={() =>
                                                handleStartResolver(item.lead_id, fila.chave, acao)
                                              }
                                              className="text-xs cursor-pointer"
                                            >
                                              {acao.rotulo}
                                            </DropdownMenuItem>
                                          ))}
                                        </DropdownMenuContent>
                                      </DropdownMenu>
                                    )}

                                    {item.lead_id ? (
                                      <Button
                                        asChild
                                        size="sm"
                                        variant="ghost"
                                        disabled={isSaving}
                                        className="h-7 px-2 text-xs font-semibold gap-1 text-primary hover:text-primary hover:bg-primary/10"
                                      >
                                        <Link to={`/comercial?lead_id=${item.lead_id}`}>
                                          <span>Abrir</span>
                                          <ExternalLink className="h-3 w-3" />
                                        </Link>
                                      </Button>
                                    ) : (
                                      <span className="text-muted-foreground text-[11px]">-</span>
                                    )}
                                  </div>
                                </td>
                              </tr>

                              {/* Formulário inline logo abaixo da linha */}
                              {isFormOpen && selectedAction && (
                                <tr className="bg-muted/20 border-b border-border/60">
                                  <td colSpan={8} className="p-3">
                                    <PendenciaFormInline
                                      acao={selectedAction.acao}
                                      opcoes={data.opcoes || {}}
                                      isSaving={isSaving}
                                      errorMessage={actionError}
                                      onConfirm={(valores) =>
                                        handleExecuteResolver(
                                          selectedAction.leadId,
                                          selectedAction.filaChave,
                                          selectedAction.acao,
                                          valores,
                                        )
                                      }
                                      onCancel={handleCancelResolver}
                                    />
                                  </td>
                                </tr>
                              )}
                            </React.Fragment>
                          )
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
