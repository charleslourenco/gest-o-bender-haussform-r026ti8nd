// Validação de integridade da Matriz PCP
import { supabase } from '@/lib/supabase/client'
import { calcularDatasDerivadasPcp } from '@/lib/pcp-capacity'
import { getFaseFluxo } from '@/lib/pcp-fases'

export { getProntidaoPercentual } from '@/lib/pcp-fases'

export type PcpLinhaOperacao = 'analise' | 'producao' | 'montagem'

export interface PcpCardItem {
  id: string
  nome_produto: string
  descricao: string | null
  qtd: number
  valor_unitario: number
  valor_total: number
  desconto_percentual: number
  status_analise: string
  status_pcp: string
  visivel_pcp: boolean
  cliente_id: string | null
  formulario_comercial_id: string | null
  card_pai_id: string | null
  cor_vinculo: string | null
  tipo: string | null
  codigo_rastreio: string | null
  is_outsourced: boolean
  terceirizado_validado: boolean
  outsourced_checked: boolean
  arquivado_analise: boolean
  arquivado_producao: boolean
  arquivado_montagem: boolean
  excluido_analise: boolean
  excluido_producao: boolean
  excluido_montagem: boolean
  criado_em: string
  atualizado_em: string
  // Colunas de planejamento temporal aditivas
  semana_planejada_analise: string | null
  semana_planejada_producao: string | null
  semana_planejada_montagem: string | null
  semana_producao_inicio?: string | null
  semana_montagem_inicio?: string | null
  semana_analise_inicio?: string | null
  mes_planejado_analise?: string | null
  mes_planejado_producao?: string | null
  mes_planejado_montagem?: string | null
  data_planejada_analise?: string | null
  data_planejada_producao?: string | null
  data_planejada_montagem?: string | null
  data_limite_analise?: string | null
  data_obra_montagem?: string | null
  data_prometida_montagem?: string | null
  analista_id?: string | null
  analista?: {
    id: string
    nome: string
    foto_perfil?: string | null
  } | null
  // Relacionamentos
  cliente?: {
    id?: string
    nome: string
    telefone?: string | null
    email?: string | null
    endereco_obra?: string | null
    cidade?: string | null
  } | null
  formulario?: {
    id?: string
    nome_cliente?: string | null
    valor_total?: number | null
    data_prevista_entrega?: string | null
    obra_bairro?: string | null
    obra_municipio?: string | null
    datas?: any
    produtos_servicos?: any
    cliente?: { nome: string } | null
  } | null
  card_pai?: {
    id: string
    nome_produto: string
    cor_vinculo: string | null
    status_analise: string
  } | null
  subcards?: PcpCardItem[]
}

export interface PcpReprogramacaoItem {
  id: string
  card_id: string
  linha_operacao: PcpLinhaOperacao
  semana_anterior: string | null
  semana_nova: string | null
  mes_anterior?: string | null
  mes_novo?: string | null
  data_anterior?: string | null
  data_nova?: string | null
  tipo_planejamento?: string | null
  motivo: string | null
  usuario_id: string | null
  criado_em: string
  usuario?: {
    id: string
    nome: string
    email?: string
  } | null
}

const SELECT_QUERY = `
  id, nome_produto, descricao, qtd, valor_unitario, valor_total, desconto_percentual,
  status_analise, status_pcp, visivel_pcp, cliente_id, formulario_comercial_id,
  card_pai_id, cor_vinculo, tipo, codigo_rastreio,
  is_outsourced, terceirizado_validado, outsourced_checked,
  arquivado_analise, arquivado_producao, arquivado_montagem,
  excluido_analise, excluido_producao, excluido_montagem,
  criado_em, atualizado_em,
  semana_planejada_analise, semana_planejada_producao, semana_planejada_montagem,
  semana_producao_inicio, semana_montagem_inicio, semana_analise_inicio,
  mes_planejado_analise, mes_planejado_producao, mes_planejado_montagem,
  data_planejada_analise, data_planejada_producao, data_planejada_montagem,
  data_limite_analise, data_obra_montagem, data_prometida_montagem,
  analista_id,
  analista:users!analista_id(id, nome, foto_perfil),
  cliente:clientes(id, nome, telefone, email),
  formulario:formulario_comercial(id, nome_cliente, valor_total, data_prevista_entrega, datas, obra_bairro, obra_municipio, produtos_servicos, cliente:clientes(nome)),
  card_pai:produtos_servicos_projeto!card_pai_id(id, nome_produto, cor_vinculo, status_analise)
`

/**
 * Busca todos os cards e subcards ativos no fluxo de PCP/Operações.
 */
export async function fetchPcpCards(): Promise<PcpCardItem[]> {
  const { data, error } = await supabase
    .from('produtos_servicos_projeto')
    .select(SELECT_QUERY)
    .eq('excluido_analise', false)
    .eq('excluido_producao', false)
    .eq('excluido_montagem', false)
    .order('criado_em', { ascending: false })

  if (error) {
    console.error('Erro ao buscar cards do PCP:', error)
    throw error
  }

  const rawList = Array.isArray(data) ? (data as unknown as any[]) : []

  return rawList.map((item) => {
    const cliSource = item?.cliente
    const cliente = Array.isArray(cliSource) ? cliSource[0] : cliSource
    const formSource = item?.formulario
    const formulario = Array.isArray(formSource) ? formSource[0] : formSource
    const paiSource = item?.card_pai
    const card_pai = Array.isArray(paiSource) ? paiSource[0] : paiSource
    const analistaSource = item?.analista
    const analista = Array.isArray(analistaSource) ? analistaSource[0] : analistaSource

    let valorTotal = Number(item.valor_total) || 0
    let valorUnitario = Number(item.valor_unitario) || 0
    let descontoPercentual = Number(item.desconto_percentual) || 0
    const qtd = Number(item.qtd) || 1

    // Se o valor_total estiver zerado, tentar extrair do jsonb produtos_servicos do formulario_comercial
    if (valorTotal === 0 && formulario?.produtos_servicos) {
      const produtosServicosRaw = formulario.produtos_servicos
      let listaItens: any[] = []
      if (Array.isArray(produtosServicosRaw)) {
        listaItens = produtosServicosRaw
      } else if (typeof produtosServicosRaw === 'string') {
        try {
          listaItens = JSON.parse(produtosServicosRaw)
        } catch {
          listaItens = []
        }
      }

      if (listaItens.length > 0) {
        const nomeNorm = String(item.nome_produto || '')
          .trim()
          .toLowerCase()
        const matched = listaItens.find((it: any) => {
          if (!it || !it.nome) return false
          const itNomeNorm = String(it.nome).trim().toLowerCase()
          return (
            itNomeNorm === nomeNorm ||
            (nomeNorm.length >= 4 && itNomeNorm.includes(nomeNorm)) ||
            (itNomeNorm.length >= 4 && nomeNorm.includes(itNomeNorm))
          )
        })

        if (matched) {
          const uVal = Number(matched.valor_unitario) || 0
          const descVal = Number(matched.desconto_percentual ?? matched.desconto) || 0
          const itemQtd = Number(matched.qtd) || qtd
          const calcTotal = uVal * (1 - descVal / 100) * itemQtd
          if (calcTotal > 0) {
            valorTotal = Math.round(calcTotal * 100) / 100
            valorUnitario = uVal
            descontoPercentual = descVal
          }
        }
      }
    }

    return {
      ...item,
      cliente: cliente || null,
      formulario: formulario || null,
      card_pai: card_pai || null,
      analista: analista || null,
      mes_planejado_analise: item.mes_planejado_analise || null,
      mes_planejado_producao: item.mes_planejado_producao || null,
      mes_planejado_montagem: item.mes_planejado_montagem || null,
      data_planejada_analise: item.data_planejada_analise || null,
      data_planejada_producao: item.data_planejada_producao || null,
      data_planejada_montagem: item.data_planejada_montagem || null,
      data_limite_analise: item.data_limite_analise || null,
      data_obra_montagem: item.data_obra_montagem || null,
      data_prometida_montagem: item.data_prometida_montagem || null,
      valor_total: valorTotal,
      valor_unitario: valorUnitario,
      desconto_percentual: descontoPercentual,
      qtd: qtd,
      visivel_pcp: item.visivel_pcp !== false,
      status_pcp: item.status_pcp || 'planejamento',
      subcards: [],
    } as PcpCardItem
  })
}

/**
 * Atualiza a semana planejada de um card em uma das 3 linhas operacionais.
 * NUNCA altera status_analise, status_pcp ou fases existentes.
 * Registra histórico em `pcp_reprogramacao_historico`.
 */
export async function updateCardSemanaPlanejada(
  cardId: string,
  linha: PcpLinhaOperacao,
  semanaNova: string | null,
  semanaAnterior: string | null,
  motivo?: string,
  extraDates?: {
    dataLimiteAnalise?: string | null
    dataObraMontagem?: string | null
    dataPlanejada?: string | null
  },
): Promise<void> {
  const campos: Record<string, any> = {
    semana: semanaNova,
  }

  if (extraDates) {
    if (extraDates.dataLimiteAnalise !== undefined) {
      campos.data_limite_analise = extraDates.dataLimiteAnalise
    }
    if (extraDates.dataObraMontagem !== undefined) {
      campos.data_obra_montagem = extraDates.dataObraMontagem
    }
    if (extraDates.dataPlanejada !== undefined) {
      campos.data = extraDates.dataPlanejada
    }
  }

  const { error } = await supabase.rpc('pcp_reprogramar_cards' as any, {
    p_card_ids: [cardId],
    p_linha: linha,
    p_campos: campos,
    p_motivo: motivo ?? null,
  })

  if (error) {
    console.error('Erro ao atualizar semana planejada via RPC:', error)
    throw error
  }
}

/**
 * Atualiza em lote a semana planejada de múltiplos cards (ex: pai + subcards).
 * Garante que a data seja gravada no pai e em todos os subcards filhos.
 */
export async function updateMultipleCardsSemanaPlanejada(
  cardIds: string[],
  linha: PcpLinhaOperacao,
  semanaNova: string | null,
  motivo?: string,
  extraDates?: {
    dataLimiteAnalise?: string | null
    dataObraMontagem?: string | null
    dataPlanejada?: string | null
  },
): Promise<void> {
  if (cardIds.length === 0) return

  const campos: Record<string, any> = {
    semana: semanaNova,
  }

  if (extraDates) {
    if (extraDates.dataLimiteAnalise !== undefined) {
      campos.data_limite_analise = extraDates.dataLimiteAnalise
    }
    if (extraDates.dataObraMontagem !== undefined) {
      campos.data_obra_montagem = extraDates.dataObraMontagem
    }
    if (extraDates.dataPlanejada !== undefined) {
      campos.data = extraDates.dataPlanejada
    }
  }

  const { error } = await supabase.rpc('pcp_reprogramar_cards' as any, {
    p_card_ids: cardIds,
    p_linha: linha,
    p_campos: campos,
    p_motivo: motivo ?? null,
  })

  if (error) {
    console.error('Erro ao atualizar lote de semanas planejadas via RPC:', error)
    throw error
  }
}

/**
 * Atualiza em lote o mês planejado de múltiplos cards (ex: pai + subcards).
 */
export async function updateMultipleCardsMesPlanejado(
  cardIds: string[],
  linha: PcpLinhaOperacao,
  mesNovo: string | null,
  motivo?: string,
): Promise<void> {
  if (cardIds.length === 0) return

  const campos: Record<string, any> = {
    mes: mesNovo,
  }

  const { error } = await supabase.rpc('pcp_reprogramar_cards' as any, {
    p_card_ids: cardIds,
    p_linha: linha,
    p_campos: campos,
    p_motivo: motivo ?? null,
  })

  if (error) {
    console.error('Erro ao atualizar lote de meses planejados via RPC:', error)
    throw error
  }
}

/**
 * Atualiza em lote a data planejada diária de múltiplos cards (ex: pai + subcards).
 */
export async function updateMultipleCardsDataPlanejada(
  cardIds: string[],
  linha: PcpLinhaOperacao,
  dataNova: string | null,
  motivo?: string,
  extraDates?: {
    dataLimiteAnalise?: string | null
    dataObraMontagem?: string | null
    semanaPlanejada?: string | null
  },
): Promise<void> {
  if (cardIds.length === 0) return

  const campos: Record<string, any> = {
    data: dataNova,
  }

  if (extraDates) {
    if (extraDates.semanaPlanejada !== undefined) {
      campos.semana = extraDates.semanaPlanejada
    }
    if (extraDates.dataLimiteAnalise !== undefined) {
      campos.data_limite_analise = extraDates.dataLimiteAnalise
    }
    if (extraDates.dataObraMontagem !== undefined) {
      campos.data_obra_montagem = extraDates.dataObraMontagem
    }
  }

  const { error } = await supabase.rpc('pcp_reprogramar_cards' as any, {
    p_card_ids: cardIds,
    p_linha: linha,
    p_campos: campos,
    p_motivo: motivo ?? null,
  })

  if (error) {
    console.error('Erro ao atualizar lote de datas planejadas via RPC:', error)
    throw error
  }
}

/**
 * Atualiza o mês planejado de um card em uma das 3 linhas operacionais.
 * NUNCA altera status_analise, status_pcp ou fases existentes.
 * mesNovo no formato 'YYYY-MM' (ex: '2026-10') ou null.
 */
export async function updateCardMesPlanejado(
  cardId: string,
  linha: PcpLinhaOperacao,
  mesNovo: string | null,
  mesAnterior: string | null,
  motivo?: string,
): Promise<void> {
  const campos: Record<string, any> = {
    mes: mesNovo,
  }

  const { error } = await supabase.rpc('pcp_reprogramar_cards' as any, {
    p_card_ids: [cardId],
    p_linha: linha,
    p_campos: campos,
    p_motivo: motivo ?? null,
  })

  if (error) {
    console.error('Erro ao atualizar mês planejado via RPC:', error)
    throw error
  }
}

/**
 * Atualiza a data planejada diária de um card em uma das 3 linhas operacionais.
 * dataNova no formato 'YYYY-MM-DD' (ex: '2026-09-08') ou null.
 */
export async function updateCardDataPlanejada(
  cardId: string,
  linha: PcpLinhaOperacao,
  dataNova: string | null,
  dataAnterior: string | null,
  motivo?: string,
  extraDates?: {
    dataLimiteAnalise?: string | null
    dataObraMontagem?: string | null
    semanaPlanejada?: string | null
  },
): Promise<void> {
  const campos: Record<string, any> = {
    data: dataNova,
  }

  if (extraDates) {
    if (extraDates.semanaPlanejada !== undefined) {
      campos.semana = extraDates.semanaPlanejada
    }
    if (extraDates.dataLimiteAnalise !== undefined) {
      campos.data_limite_analise = extraDates.dataLimiteAnalise
    }
    if (extraDates.dataObraMontagem !== undefined) {
      campos.data_obra_montagem = extraDates.dataObraMontagem
    }
  }

  const { error } = await supabase.rpc('pcp_reprogramar_cards' as any, {
    p_card_ids: [cardId],
    p_linha: linha,
    p_campos: campos,
    p_motivo: motivo ?? null,
  })

  if (error) {
    console.error('Erro ao atualizar data planejada via RPC:', error)
    throw error
  }
}

/**
 * Busca histórico de reprogramação de um card específico.
 */
export async function fetchReprogramacaoHistorico(cardId: string): Promise<PcpReprogramacaoItem[]> {
  const { data, error } = await supabase
    .from('pcp_reprogramacao_historico')
    .select(`
      id, card_id, linha_operacao, tipo_planejamento,
      semana_anterior, semana_nova,
      mes_anterior, mes_novo,
      data_anterior, data_nova,
      motivo, usuario_id, criado_em,
      usuario:users!usuario_id(id, nome, email)
    `)
    .eq('card_id', cardId)
    .order('criado_em', { ascending: false })

  if (error) {
    console.error('Erro ao buscar histórico de reprogramação:', error)
    return []
  }

  const list = Array.isArray(data) ? (data as any[]) : []
  return list.map((item) => ({
    ...item,
    usuario: Array.isArray(item.usuario) ? item.usuario[0] : item.usuario,
  }))
}

/**
 * Determina o status de prontidão técnica de um card/ambiente para manufatura.
 * - 'pronto': Caderno Técnico concluído / lista liberada / plano de corte
 * - 'em_analise': Em análise, reunião ou medida fina
 * - 'bloqueado': Pendência técnica ou item terceirizado não validado
 * - 'inicial': Iniciar análise
 */
export type ProntidaoTecnicaStatus = 'pronto' | 'em_analise' | 'bloqueado' | 'inicial'

export interface ProntidaoInfo {
  status: ProntidaoTecnicaStatus
  label: string
  iconColor: string
  badgeClass: string
  tooltip: string
}

/**
 * Atualiza a Data Prometida na Obra (gravando em data_prometida_montagem)
 * e recalcula automaticamente a semana sugerida de produção mantendo a margem padrão:
 * -2 semanas para análise técnica, data da montagem e semana sugerida de produção.
 * Registra histórico em `pcp_reprogramacao_historico`.
 */
export async function updateCardDataPrometidaObra(
  cardId: string,
  novaDataObra: string | null,
  motivo?: string,
): Promise<{ semanaSugeridaProducao: string | null; dataLimiteAnalise: string | null }> {
  let semanaSugeridaProducao: string | null = null
  let dataLimiteAnalise: string | null = null
  let dataObraMontagem: string | null = novaDataObra || null

  if (novaDataObra && novaDataObra.trim()) {
    const cleanDate = novaDataObra.slice(0, 10)
    // Se a data informada é a data de montagem/obra, calcular data de produção voltando 4 semanas (-28 dias)
    // ou calcular derivadas usando calcularDatasDerivadasPcp a partir da data de produção derivada
    const targetMontagem = new Date(`${cleanDate}T12:00:00`)
    if (!isNaN(targetMontagem.getTime())) {
      // Data de produção sugerida = Data de montagem na obra - 4 semanas (28 dias)
      const dataProdDate = new Date(targetMontagem)
      dataProdDate.setDate(targetMontagem.getDate() - 28)

      const yyyy = dataProdDate.getFullYear()
      const mm = String(dataProdDate.getMonth() + 1).padStart(2, '0')
      const dd = String(dataProdDate.getDate()).padStart(2, '0')
      const prodDateStr = `${yyyy}-${mm}-${dd}`

      const { dataLimiteAnalise: derivedAnalise, semanaPlanejada: derivedSemana } =
        calcularDatasDerivadasPcp(prodDateStr)

      semanaSugeridaProducao = derivedSemana
      dataLimiteAnalise = derivedAnalise
      dataObraMontagem = cleanDate
    }
  }

  const updatePayload: Record<string, any> = {
    data_prometida_montagem: novaDataObra || null,
    data_obra_montagem: dataObraMontagem,
    atualizado_em: new Date().toISOString(),
  }

  if (semanaSugeridaProducao) {
    updatePayload.semana_planejada_producao = semanaSugeridaProducao
  }
  if (dataLimiteAnalise) {
    updatePayload.data_limite_analise = dataLimiteAnalise
  }

  const { error: updateErr } = await supabase
    .from('produtos_servicos_projeto')
    .update(updatePayload as any)
    .eq('id', cardId)

  if (updateErr) {
    console.error('Erro ao atualizar data prometida da obra:', updateErr)
    throw updateErr
  }

  try {
    const { data: authData } = await supabase.auth.getUser()
    const userId = authData?.user?.id || null

    await supabase.from('pcp_reprogramacao_historico').insert({
      card_id: cardId,
      linha_operacao: 'montagem',
      tipo_planejamento: 'dia',
      data_anterior: null,
      data_nova: novaDataObra || null,
      semana_nova: semanaSugeridaProducao,
      motivo:
        motivo ||
        `Atualização da Data Prometida na Obra (${novaDataObra || 'Removida'}) com recálculo sugerido para ${semanaSugeridaProducao || 'N/A'}`,
      usuario_id: userId,
    } as any)
  } catch (histErr) {
    console.warn('Aviso ao registrar histórico de reprogramação da data da obra:', histErr)
  }

  return { semanaSugeridaProducao, dataLimiteAnalise }
}

export function getProntidaoTecnica(card: PcpCardItem): ProntidaoInfo {
  const st = card.status_analise || 'iniciar'

  if (st === 'pendencia') {
    return {
      status: 'bloqueado',
      label: 'Pendência Técnica',
      iconColor: 'text-rose-600',
      badgeClass:
        'bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-400 border-rose-200',
      tooltip: 'Bloqueado por pendência técnica não resolvida',
    }
  }

  if (card.is_outsourced && !card.terceirizado_validado) {
    return {
      status: 'bloqueado',
      label: 'Terceirizado Pendente',
      iconColor: 'text-amber-600',
      badgeClass:
        'bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-400 border-amber-200',
      tooltip: 'Item terceirizado aguardando validação técnica',
    }
  }

  const fase = getFaseFluxo(st)
  if (fase && fase.pct === 100) {
    return {
      status: 'pronto',
      label: 'Prontidão Aprovada',
      iconColor: 'text-emerald-600',
      badgeClass:
        'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400 border-emerald-200',
      tooltip: 'Prontidão técnica liberada para programação fabril',
    }
  }

  if (fase && fase.ordem >= 2) {
    return {
      status: 'em_analise',
      label: 'Engenharia em Andamento',
      iconColor: 'text-blue-600',
      badgeClass:
        'bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-400 border-blue-200',
      tooltip: 'Em fase de detalhamento técnico / validação de medidas',
    }
  }

  return {
    status: 'inicial',
    label: 'Aguardando Início',
    iconColor: 'text-slate-500',
    badgeClass:
      'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-200',
    tooltip: 'Aguardando liberação de engenharia',
  }
}
