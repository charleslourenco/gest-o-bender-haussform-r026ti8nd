import { useEffect, useState, useMemo } from 'react'
import { supabase } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Loader2,
  FolderKanban,
  ShoppingBag,
  PackageCheck,
  AlertCircle,
  TrendingUp,
} from 'lucide-react'
import { formatCurrency } from '@/lib/utils'

// Constante única de markup alvo para todo o componente
export const MARKUP_ALVO = 4.8
// % máxima saudável de custo de material sobre a venda: 100 / 4.8 = 20.833%
export const PCT_MATERIAL_META = 100 / MARKUP_ALVO // ≈ 20.833%
export const PCT_MATERIAL_TOLERANCIA = 25.0 // Limiar de alerta: 20.833% a 25.0%

interface ProjetoOption {
  formularioId: string
  clienteId: string | null
  clienteNome: string
  label: string
  valorVenda: number
}

interface ItemCompra {
  id: string
  origem: 'conta_pagar' | 'estoque_alocacao'
  descricao: string
  fornecedor: string
  data: string | null
  valor: number
  status: string
  badgeLabel: string
  badgeVariant?: 'default' | 'secondary' | 'outline' | 'destructive'
}

export function DREProjetoSimplificado() {
  const [projetos, setProjetos] = useState<ProjetoOption[]>([])
  const [loadingProjetos, setLoadingProjetos] = useState(true)
  const [selectedProjetoId, setSelectedProjetoId] = useState<string>('')

  // Dados do projeto selecionado
  const [loadingDetalhes, setLoadingDetalhes] = useState(false)
  const [valorVendaCalculado, setValorVendaCalculado] = useState<number>(0)
  const [compras, setCompras] = useState<ItemCompra[]>([])

  // 1. Carrega a lista de formulários comerciais não arquivados com valor de venda conhecido
  useEffect(() => {
    let cancelled = false

    async function carregarProjetos() {
      setLoadingProjetos(true)
      try {
        // Buscar formulários não arquivados
        const { data: forms, error: formsErr } = await supabase
          .from('formulario_comercial')
          .select('id, cliente_id, nome_cliente, nome_fantasia, valor_total, arquivado')
          .neq('arquivado', true)
          .order('criado_em', { ascending: false })

        if (formsErr) {
          console.error('Erro ao carregar projetos para DRE simplificado:', formsErr)
          return
        }

        if (!forms || forms.length === 0) {
          if (!cancelled) {
            setProjetos([])
            setLoadingProjetos(false)
          }
          return
        }

        // Buscar clientes para fallback de nome
        const { data: clientesData } = await supabase
          .from('clientes')
          .select('id, nome, nome_fantasia')

        const clienteMap = new Map<string, string>()
        clientesData?.forEach((c) => {
          clienteMap.set(c.id, c.nome || c.nome_fantasia || 'Cliente')
        })

        // Buscar produtos_servicos_projeto para compor o valor caso valor_total seja nulo ou zero
        const formIds = forms.map((f) => f.id)
        const { data: pspData } = await supabase
          .from('produtos_servicos_projeto')
          .select('formulario_comercial_id, valor_total, valor_unitario, qtd')
          .in('formulario_comercial_id', formIds)

        const pspSumMap = new Map<string, number>()
        pspData?.forEach((p) => {
          const fid = p.formulario_comercial_id
          if (!fid) return
          const v = Number(p.valor_total) || (Number(p.valor_unitario) || 0) * (Number(p.qtd) || 1)
          pspSumMap.set(fid, (pspSumMap.get(fid) || 0) + v)
        })

        const options: ProjetoOption[] = []

        forms.forEach((f) => {
          const cliNome =
            f.nome_cliente ||
            f.nome_fantasia ||
            (f.cliente_id ? clienteMap.get(f.cliente_id) : null) ||
            'Cliente sem nome'

          // Determinar valor de venda do projeto
          const pspSum = pspSumMap.get(f.id) || 0
          const formVal = Number(f.valor_total) || 0
          const valorFinal = formVal > 0 ? formVal : pspSum

          // Escopo: "listando formulários comerciais não arquivados com valor de venda conhecido"
          // Se tiver valor de venda conhecido (> 0)
          if (valorFinal > 0) {
            const shortId = f.id.substring(0, 8).toUpperCase()
            options.push({
              formularioId: f.id,
              clienteId: f.cliente_id || null,
              clienteNome: cliNome,
              label: `${cliNome} — Projeto #${shortId}`,
              valorVenda: valorFinal,
            })
          }
        })

        // Ordenar por cliente
        options.sort((a, b) => a.clienteNome.localeCompare(b.clienteNome, 'pt-BR'))

        if (!cancelled) {
          setProjetos(options)
          if (options.length > 0) {
            setSelectedProjetoId(options[0].formularioId)
          }
        }
      } catch (err) {
        console.error('Falha geral ao carregar lista de projetos:', err)
      } finally {
        if (!cancelled) setLoadingProjetos(false)
      }
    }

    carregarProjetos()

    return () => {
      cancelled = true
    }
  }, [])

  // 2. Quando seleciona um projeto, buscar contas a pagar e estoque_alocacoes
  const selectedProjeto = useMemo(
    () => projetos.find((p) => p.formularioId === selectedProjetoId),
    [projetos, selectedProjetoId],
  )

  useEffect(() => {
    if (!selectedProjetoId || !selectedProjeto) {
      setCompras([])
      setValorVendaCalculado(0)
      return
    }

    let cancelled = false

    async function carregarDetalhesProjeto() {
      setLoadingDetalhes(true)
      try {
        const formularioId = selectedProjeto.formularioId
        const clienteId = selectedProjeto.clienteId
        const clienteNome = selectedProjeto.clienteNome

        // (a) Garantir valor de venda atualizado
        const { data: pspData } = await supabase
          .from('produtos_servicos_projeto')
          .select('valor_total, valor_unitario, qtd')
          .eq('formulario_comercial_id', formularioId)

        let sumPsp = 0
        pspData?.forEach((p) => {
          const v = Number(p.valor_total) || (Number(p.valor_unitario) || 0) * (Number(p.qtd) || 1)
          sumPsp += v
        })
        const valorVendaFinal = selectedProjeto.valorVenda > 0 ? selectedProjeto.valorVenda : sumPsp
        if (!cancelled) {
          setValorVendaCalculado(valorVendaFinal)
        }

        // (b) Buscar contas a pagar vinculadas ao formulario_comercial_id ou cliente_id
        // Excluindo canceladas
        let queryCp = supabase
          .from('contas_pagar')
          .select(
            'id, descricao, fornecedor, valor, data_vencimento, data_pagamento, status_pagamento, formulario_comercial_id, cliente_id',
          )

        if (clienteId) {
          queryCp = queryCp.or(
            `formulario_comercial_id.eq.${formularioId},cliente_id.eq.${clienteId}`,
          )
        } else {
          queryCp = queryCp.eq('formulario_comercial_id', formularioId)
        }

        const { data: cpData, error: cpErr } = await queryCp
        if (cpErr) {
          console.error('Erro ao buscar contas a pagar do projeto:', cpErr)
        }

        const itemsCp: ItemCompra[] = []
        if (cpData) {
          cpData.forEach((cp) => {
            const st = (cp.status_pagamento || '').toLowerCase()
            // Excluir canceladas e agrupadas
            if (st === 'cancelado' || st === 'cancelada' || st === 'agrupado') return

            const val = Number(cp.valor) || 0
            if (val <= 0) return

            itemsCp.push({
              id: `cp-${cp.id}`,
              origem: 'conta_pagar',
              descricao: cp.descricao || 'Conta a pagar',
              fornecedor: cp.fornecedor || '-',
              data: cp.data_pagamento || cp.data_vencimento || null,
              valor: val,
              status: cp.status_pagamento || 'aguardando',
              badgeLabel: 'Conta a pagar',
            })
          })
        }

        // (c) Buscar estoque_alocacoes casadas
        // Regra estrutural: preferir cliente_id quando projeto e alocação tiverem, com fallback para cliente_nome (trim/lowercase)
        const { data: alocData, error: alocErr } = await supabase
          .from('estoque_alocacoes')
          .select(
            'id, quantidade, status, cliente_nome, cliente_id, criado_em, baixado_em, item:estoque_itens(id, nome, valor_unitario, fornecedor)',
          )

        if (alocErr) {
          console.error('Erro ao buscar estoque_alocacoes:', alocErr)
        }

        const itemsAloc: ItemCompra[] = []
        if (alocData) {
          const targetNorm = (clienteNome || '').trim().toLowerCase()

          alocData.forEach((aloc: any) => {
            // 1. Preferir casamento por cliente_id se ambos tiverem
            let match = false
            if (clienteId && aloc.cliente_id) {
              match = String(aloc.cliente_id) === String(clienteId)
            } else if (targetNorm) {
              // 2. Fallback ao casamento por nome
              const alocCli = (aloc.cliente_nome || '').trim().toLowerCase()
              match = !!alocCli && alocCli === targetNorm
            }

            if (!match) return

            const item = aloc.item || {}
            const qtd = Number(aloc.quantidade) || 0
            const unit = Number(item.valor_unitario) || 0
            const totalCusto = qtd * unit

            if (totalCusto <= 0 && qtd <= 0) return

            const isBaixado = (aloc.status || '').toLowerCase() === 'baixado'
            const statusTexto = isBaixado ? 'Baixado' : 'Reservado'

            itemsAloc.push({
              id: `aloc-${aloc.id}`,
              origem: 'estoque_alocacao',
              descricao: `Alocação de estoque: ${item.nome || 'Item'} (${qtd} un × ${formatCurrency(unit)})`,
              fornecedor: item.fornecedor || 'Estoque interno',
              data: aloc.baixado_em || aloc.criado_em || null,
              valor: totalCusto,
              status: statusTexto,
              badgeLabel: `Estoque — ${statusTexto}`,
            })
          })
        }

        // Combinar compras
        const todasCompras = [...itemsCp, ...itemsAloc]
        // Ordenar por data decrescente
        todasCompras.sort((a, b) => {
          const dtA = a.data ? new Date(a.data).getTime() : 0
          const dtB = b.data ? new Date(b.data).getTime() : 0
          return dtB - dtA
        })

        if (!cancelled) {
          setCompras(todasCompras)
        }
      } catch (err) {
        console.error('Erro ao carregar detalhes do projeto selecionado:', err)
      } finally {
        if (!cancelled) setLoadingDetalhes(false)
      }
    }

    carregarDetalhesProjeto()

    return () => {
      cancelled = true
    }
  }, [selectedProjetoId, selectedProjeto])

  // Cálculos de totais
  const totalMaterialComprado = useMemo(() => {
    return compras.reduce((acc, c) => acc + (Number(c.valor) || 0), 0)
  }, [compras])

  const totalEstoqueReservado = useMemo(() => {
    return compras
      .filter((c) => c.origem === 'estoque_alocacao' && c.status.toLowerCase() === 'reservado')
      .reduce((acc, c) => acc + (Number(c.valor) || 0), 0)
  }, [compras])

  const totalEstoqueBaixado = useMemo(() => {
    return compras
      .filter((c) => c.origem === 'estoque_alocacao' && c.status.toLowerCase() === 'baixado')
      .reduce((acc, c) => acc + (Number(c.valor) || 0), 0)
  }, [compras])

  const totalContasPagar = useMemo(() => {
    return compras
      .filter((c) => c.origem === 'conta_pagar')
      .reduce((acc, c) => acc + (Number(c.valor) || 0), 0)
  }, [compras])

  const valorVenda =
    valorVendaCalculado > 0 ? valorVendaCalculado : selectedProjeto?.valorVenda || 0

  // Porcentagem gasta de material em relação à venda
  const porcentagemMaterial = useMemo(() => {
    if (valorVenda <= 0 || isNaN(valorVenda)) return 0
    const pct = (totalMaterialComprado / valorVenda) * 100
    if (isNaN(pct) || !isFinite(pct)) return 0
    return pct
  }, [totalMaterialComprado, valorVenda])

  // Markup efetivo = valorVenda ÷ totalMaterial
  const markupEfetivo = useMemo(() => {
    if (totalMaterialComprado <= 0 || valorVenda <= 0) return null
    const mk = valorVenda / totalMaterialComprado
    if (isNaN(mk) || !isFinite(mk)) return null
    return mk
  }, [valorVenda, totalMaterialComprado])

  // Régua de Markup derivada de MARKUP_ALVO = 4.8 (META ≈ 20,8% de material):
  // - verde: se % material ≤ 100/4.8 (≈20,8%), badge "Dentro do markup 4,8×"
  // - âmbar: se entre 20,8% e 25%, badge "Comendo margem"
  // - vermelho: se > 25% ou material > venda, badge "Acima do saudável"
  const getBadgeColor = (pct: number, material: number, venda: number) => {
    if (material > venda || pct > PCT_MATERIAL_TOLERANCIA) {
      return {
        bg: 'bg-rose-500/15 border-rose-500/30 text-rose-700 dark:text-rose-400',
        badge: 'bg-rose-600 text-white',
        badgeLabel: 'Acima do saudável',
        text: 'text-rose-600 dark:text-rose-400',
        description: `Custo acima do saudável (> ${PCT_MATERIAL_TOLERANCIA.toFixed(1).replace('.', ',')}%)`,
      }
    }
    if (pct > PCT_MATERIAL_META) {
      return {
        bg: 'bg-amber-500/15 border-amber-500/30 text-amber-700 dark:text-amber-400',
        badge: 'bg-amber-600 text-white',
        badgeLabel: 'Comendo margem',
        text: 'text-amber-600 dark:text-amber-400',
        description: `Comendo margem (${PCT_MATERIAL_META.toFixed(1).replace('.', ',')}% a ${PCT_MATERIAL_TOLERANCIA.toFixed(1).replace('.', ',')}%)`,
      }
    }
    return {
      bg: 'bg-emerald-500/15 border-emerald-500/30 text-emerald-700 dark:text-emerald-400',
      badge: 'bg-emerald-600 text-white',
      badgeLabel: `Dentro do markup ${MARKUP_ALVO.toFixed(1).replace('.', ',')}×`,
      text: 'text-emerald-600 dark:text-emerald-400',
      description: `Dentro da meta do markup ${MARKUP_ALVO.toFixed(1).replace('.', ',')}× (≤ ${PCT_MATERIAL_META.toFixed(1).replace('.', ',')}%)`,
    }
  }

  const highlight = getBadgeColor(porcentagemMaterial, totalMaterialComprado, valorVenda)

  function formatDisplayDate(d: string | null) {
    if (!d) return '-'
    const str = typeof d === 'string' ? d.substring(0, 10) : ''
    const parts = str.split('-')
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`
    }
    return new Date(d).toLocaleDateString('pt-BR')
  }

  return (
    <Card className="border-border shadow-sm bg-card">
      <CardHeader className="pb-3 border-b border-border/50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FolderKanban className="w-5 h-5 text-primary" />
            <CardTitle className="text-lg">DRE Simplificado por Projeto</CardTitle>
          </div>
          <Badge variant="outline" className="text-xs font-medium">
            Visão Individual
          </Badge>
        </div>
        <CardDescription className="text-xs">
          Acompanhe o valor de venda, total de compras/materiais e a porcentagem gasta para cada
          projeto.
        </CardDescription>
      </CardHeader>

      <CardContent className="pt-4 space-y-5">
        {/* Selecionar Projeto (Cliente — Projeto) */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
            <FolderKanban className="w-3.5 h-3.5 text-primary" />
            Selecionar Projeto
          </label>
          {loadingProjetos ? (
            <div className="flex items-center gap-2 text-xs text-muted-foreground py-2">
              <Loader2 className="w-4 h-4 animate-spin text-primary" />
              Carregando lista de projetos comerciais...
            </div>
          ) : projetos.length === 0 ? (
            <div className="text-xs text-muted-foreground italic py-2">
              Nenhum projeto comercial não arquivado com valor de venda encontrado.
            </div>
          ) : (
            <Select value={selectedProjetoId} onValueChange={setSelectedProjetoId}>
              <SelectTrigger className="w-full bg-background border-border text-sm font-medium">
                <SelectValue placeholder="Selecione um projeto..." />
              </SelectTrigger>
              <SelectContent className="max-h-[300px]">
                {projetos
                  .filter((p) => p && p.formularioId && String(p.formularioId).trim() !== '')
                  .map((p) => (
                    <SelectItem
                      key={p.formularioId}
                      value={String(p.formularioId)}
                      className="text-sm"
                    >
                      {p.label}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          )}
        </div>

        {/* Valores e Indicadores do Projeto Selecionado */}
        {selectedProjeto && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              {/* Valor de Venda */}
              <div className="p-3.5 rounded-lg border border-border/80 bg-muted/30 flex flex-col justify-between">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                  <ShoppingBag className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                  Valor de Venda do Projeto
                </span>
                <div className="mt-2">
                  <div className="text-xl font-bold text-foreground">
                    {formatCurrency(valorVenda)}
                  </div>
                  <span className="text-[11px] text-muted-foreground">Valor total contratado</span>
                </div>
              </div>

              {/* Total de Material Comprado */}
              <div className="p-3.5 rounded-lg border border-border/80 bg-muted/30 flex flex-col justify-between">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                  <PackageCheck className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                  Total de Material Comprado
                </span>
                <div className="mt-2">
                  <div className="text-xl font-bold text-foreground">
                    {loadingDetalhes ? (
                      <Loader2 className="w-4 h-4 animate-spin inline mr-1 text-primary" />
                    ) : (
                      formatCurrency(totalMaterialComprado)
                    )}
                  </div>
                  <div className="text-[11px] text-muted-foreground flex items-center gap-2 mt-0.5">
                    <span>CP: {formatCurrency(totalContasPagar)}</span>
                    <span>•</span>
                    <span>Res: {formatCurrency(totalEstoqueReservado)}</span>
                    <span>•</span>
                    <span>Bx: {formatCurrency(totalEstoqueBaixado)}</span>
                  </div>
                </div>
              </div>

              {/* Porcentagem de Material */}
              <div
                className={`p-3.5 rounded-lg border flex flex-col justify-between transition-colors ${highlight.bg}`}
              >
                <span className="text-xs font-semibold uppercase tracking-wider flex items-center justify-between">
                  <span>% Material / Venda</span>
                  <span
                    className={`text-[10px] px-1.5 py-0.5 rounded font-bold uppercase ${highlight.badge}`}
                  >
                    {highlight.badgeLabel}
                  </span>
                </span>
                <div className="mt-2">
                  <div className={`text-2xl font-black ${highlight.text}`}>
                    {loadingDetalhes ? (
                      <Loader2 className="w-4 h-4 animate-spin inline mr-1" />
                    ) : (
                      `${porcentagemMaterial.toFixed(1).replace('.', ',')}%`
                    )}
                  </div>
                  <span className="text-[11px] opacity-80">{highlight.description}</span>
                </div>
              </div>

              {/* Markup Efetivo */}
              <div className="p-3.5 rounded-lg border border-border/80 bg-muted/30 flex flex-col justify-between">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                  <TrendingUp className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                  Markup Efetivo
                </span>
                <div className="mt-2">
                  <div className="text-xl font-bold text-foreground">
                    {loadingDetalhes ? (
                      <Loader2 className="w-4 h-4 animate-spin inline mr-1 text-primary" />
                    ) : markupEfetivo !== null ? (
                      `${markupEfetivo.toFixed(1).replace('.', ',')}×`
                    ) : (
                      '—'
                    )}
                  </div>
                  <span className="text-[11px] text-muted-foreground">
                    {markupEfetivo !== null
                      ? `${markupEfetivo.toFixed(1).replace('.', ',')}× (meta ${MARKUP_ALVO.toFixed(1).replace('.', ',')}×)`
                      : `Meta: ${MARKUP_ALVO.toFixed(1).replace('.', ',')}×`}
                  </span>
                </div>
              </div>
            </div>

            {/* Tabela das compras do projeto */}
            <div className="space-y-2 pt-2">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  Compras e Alocações Realizadas para o Projeto ({compras.length})
                </h4>
                {loadingDetalhes && (
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-primary" />
                    Atualizando...
                  </div>
                )}
              </div>

              {compras.length === 0 && !loadingDetalhes ? (
                <div className="p-8 text-center rounded-lg border border-dashed border-border/80 bg-muted/20">
                  <AlertCircle className="w-8 h-8 mx-auto text-muted-foreground/60 mb-2" />
                  <p className="text-sm font-semibold text-foreground">
                    Nenhuma compra vinculada encontrada
                  </p>
                  <p className="text-xs text-muted-foreground mt-1 max-w-md mx-auto">
                    Vincule contas a pagar ao projeto ao criá-las/editá-las; alocações antigas sem
                    cliente ficarão de fora.
                  </p>
                </div>
              ) : (
                <div className="border border-border rounded-lg overflow-x-auto bg-background">
                  <Table className="text-xs">
                    <TableHeader>
                      <TableRow className="bg-muted/50">
                        <TableHead className="font-bold">Origem</TableHead>
                        <TableHead className="font-bold">Descrição</TableHead>
                        <TableHead className="font-bold">Fornecedor</TableHead>
                        <TableHead className="font-bold">Data</TableHead>
                        <TableHead className="font-bold">Status</TableHead>
                        <TableHead className="font-bold text-right">Valor</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {compras.map((item) => (
                        <TableRow key={item.id} className="hover:bg-muted/40 transition-colors">
                          <TableCell className="whitespace-nowrap font-medium">
                            <Badge
                              variant={item.origem === 'conta_pagar' ? 'secondary' : 'outline'}
                              className="text-[11px]"
                            >
                              {item.badgeLabel}
                            </Badge>
                          </TableCell>
                          <TableCell className="max-w-[260px] truncate" title={item.descricao}>
                            {item.descricao}
                          </TableCell>
                          <TableCell className="max-w-[160px] truncate" title={item.fornecedor}>
                            {item.fornecedor}
                          </TableCell>
                          <TableCell className="whitespace-nowrap text-muted-foreground">
                            {formatDisplayDate(item.data)}
                          </TableCell>
                          <TableCell className="whitespace-nowrap capitalize">
                            <span
                              className={`inline-block px-1.5 py-0.5 rounded text-[11px] font-semibold ${
                                item.status.toLowerCase() === 'pago' ||
                                item.status.toLowerCase() === 'baixado'
                                  ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400'
                                  : 'bg-amber-500/15 text-amber-700 dark:text-amber-400'
                              }`}
                            >
                              {item.status}
                            </span>
                          </TableCell>
                          <TableCell className="text-right font-bold text-foreground whitespace-nowrap">
                            {formatCurrency(item.valor)}
                          </TableCell>
                        </TableRow>
                      ))}

                      {/* Linha de TOTAL */}
                      <TableRow className="bg-muted/70 font-bold border-t-2 border-border">
                        <TableCell
                          colSpan={5}
                          className="text-right text-xs uppercase tracking-wider"
                        >
                          TOTAL GASTO COM MATERIAL:
                        </TableCell>
                        <TableCell className="text-right text-sm font-extrabold text-foreground whitespace-nowrap">
                          {formatCurrency(totalMaterialComprado)}
                        </TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </div>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
