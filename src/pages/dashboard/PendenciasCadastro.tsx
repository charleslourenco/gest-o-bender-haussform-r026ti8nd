import React, { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '@/lib/supabase/client'
import { runWithAuthRecovery } from '@/lib/supabase/auth-recovery'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import {
  AlertTriangle,
  AlertCircle,
  CheckCircle2,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  ExternalLink,
} from 'lucide-react'

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
}

export interface PendenciasListasResponse {
  gerado_em?: string
  total: number
  cadastros_distintos: number
  erros_de_registro: number
  filas: PendenciaFila[]
}

function formatData(val: string | null | undefined): string {
  if (!val) return '-'
  try {
    // Pode vir como "2026-05-14", "2026-05-14T10:00:00" ou ISO
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

export function PendenciasCadastro() {
  const [data, setData] = useState<PendenciasListasResponse | null>(null)
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)
  const [expandedFilas, setExpandedFilas] = useState<Record<string, boolean>>({})

  const fetchData = useCallback(async () => {
    setLoading(true)
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
    } catch (err: any) {
      console.error('[PendenciasCadastro] Exceção ao consultar painel_pendencias_listas:', err)
      setError(err?.message || 'Erro inesperado ao consultar pendências de cadastro.')
    } finally {
      setLoading(false)
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
            onClick={fetchData}
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 border-b border-border/80 pb-2">
        <div className="flex items-center gap-2 flex-wrap">
          <h3 className="text-sm font-bold tracking-tight text-foreground uppercase">
            Pendências de cadastro
          </h3>
          <span className="text-xs font-medium text-muted-foreground">
            {total} {total === 1 ? 'pendência' : 'pendências'} em {cadastros_distintos}{' '}
            {cadastros_distintos === 1 ? 'cadastro' : 'cadastros'}
          </span>
        </div>
      </div>

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
                        fila.itens.map((item, idx) => (
                          <tr
                            key={item.lead_id || `fila-${fila.chave}-item-${idx}`}
                            className="hover:bg-muted/30 transition-colors"
                          >
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
                              {item.lead_id ? (
                                <Button
                                  asChild
                                  size="sm"
                                  variant="ghost"
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
                            </td>
                          </tr>
                        ))
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
