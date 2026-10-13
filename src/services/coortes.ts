import { supabase } from '@/lib/supabase/client'
import { runWithAuthRecovery } from '@/lib/supabase/auth-recovery'

export interface RawLeadCoorte {
  id: string
  criado_em: string
  atualizado_em?: string | null
  data_venda: string | null
  status: string
  consultor_id: string | null
  origem: string | null
  excluido: boolean
  motivo_perda: string | null
  etapa_perda: string | null
  categoria: string | null
  consultor?: {
    id: string
    nome: string
  } | null
}

export interface HistoricoItem {
  lead_id: string
  status_novo: string
  criado_em: string
}

export interface ConsultorOption {
  id: string
  nome: string
}

export interface CoorteLinha {
  mes_iso: string // 'YYYY-MM'
  mes_label: string // 'MMM/AAAA'
  ano: number
  mes: number // 1-12
  is_maturidade_recente: boolean // mês corrente ou anterior (em formação)
  is_mes_corrente: boolean

  // Métricas de funil da coorte
  total_chegados: number
  iniciaram_consultoria: number
  vendidos: number
  perdidos: number
  em_aberto: number
  taxa_conversao: number // (vendidos / total_chegados) * 100
  taxa_conversao_consultoria: number // (vendidos / iniciaram_consultoria) * 100

  // Ciclo de fechamento (data_venda - criado_em)
  ciclo_medio_dias: number | null
  ciclo_mediano_dias: number | null

  // Matriz de defasagem de vendas: vendasPorDefasagem[0] = M+0, [1] = M+1, etc.
  vendas_por_defasagem: number[]
  // Matriz de perdas por defasagem: perdasPorDefasagem[0] = M+0, etc.
  perdas_por_defasagem: number[]
}

export interface CoorteResultado {
  coortes: CoorteLinha[]
  max_defasagem: number // Maior número de meses de defasagem M+X encontrado
  total_vendas_geral: number
  total_chegados_geral: number
  total_iniciaram_geral: number
  total_perdidos_geral: number
  total_abertos_geral: number
  taxa_conversao_geral: number
  consultores_disponiveis: ConsultorOption[]
  origens_disponiveis: string[]
}

const COLUNAS_CONSULTORIA = new Set([
  'consultoria inicial',
  'projeto',
  'apresentação',
  'apresentacao',
  'negociação',
  'negociacao',
  'stand by',
  'vendido',
  'perdido',
  'aguardando consultor',
  'ação gerente',
  'acao gerente',
  'designar consultor',
])

const TIMEZONE_SP = 'America/Sao_Paulo'
const SP_FORMATTER = new Intl.DateTimeFormat('en-CA', {
  timeZone: TIMEZONE_SP,
  year: 'numeric',
  month: '2-digit',
})

/**
 * Retorna ano e mês no fuso America/Sao_Paulo.
 * Ex: para "2023-09-30T22:30:00Z" retorna { ano: 2023, mes: 9, mesIso: "2023-09" }
 */
function getAnoMesSP(dateInput: string | Date): { ano: number; mes: number; mesIso: string } {
  const d = typeof dateInput === 'string' ? new Date(dateInput) : dateInput
  const parts = SP_FORMATTER.formatToParts(d)
  let yearStr = '1970'
  let monthStr = '01'
  for (const p of parts) {
    if (p.type === 'year') yearStr = p.value
    if (p.type === 'month') monthStr = p.value
  }
  const ano = parseInt(yearStr, 10)
  const mes = parseInt(monthStr, 10)
  const mesIso = `${yearStr}-${monthStr.padStart(2, '0')}`
  return { ano, mes, mesIso }
}

/**
 * Diferença em meses completos entre duas datas no fuso America/Sao_Paulo:
 * ano/mês de dateLater - ano/mês de dateEarlier.
 */
function diffInMonthsSP(dateLater: string | Date, dateEarlier: string | Date): number {
  const later = getAnoMesSP(dateLater)
  const earlier = getAnoMesSP(dateEarlier)
  return (later.ano - earlier.ano) * 12 + (later.mes - earlier.mes)
}

/**
 * Retorna o primeiro instante do mês da safra no fuso America/Sao_Paulo (UTC Date correspondente)
 */
export function getDataInicioSafraSP(ano: number, mes: number): Date {
  const mm = String(mes).padStart(2, '0')
  return new Date(`${ano}-${mm}-01T00:00:00-03:00`)
}

function formatMesLabel(mesIso: string): string {
  const [yearStr, monthStr] = mesIso.split('-')
  const year = parseInt(yearStr, 10)
  const month = parseInt(monthStr, 10) - 1
  const d = new Date(Date.UTC(year, month, 1, 12, 0, 0))
  const monthName = d.toLocaleDateString('pt-BR', { month: 'short', timeZone: 'UTC' })
  // Capitaliza primeira letra e junta com ano
  const cap = monthName.charAt(0).toUpperCase() + monthName.slice(1).replace('.', '')
  return `${cap}/${year}`
}

function calculateMedian(values: number[]): number | null {
  if (values.length === 0) return null
  const sorted = [...values].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  if (sorted.length % 2 !== 0) {
    return sorted[mid]
  }
  return (sorted[mid - 1] + sorted[mid]) / 2
}

/**
 * Busca todos os dados necessários para análise de coorte de conversão de leads:
 * - Leads (não excluídos)
 * - Histórico de status (para verificar se iniciaram consultoria)
 */
export async function fetchDadosCoorte(): Promise<{
  leads: RawLeadCoorte[]
  historicoMap: Set<string> // Set de lead_ids que têm evento de consultoria
  historicoPerdasMap: Map<string, string> // lead_id -> criado_em da perda mais recente
}> {
  const PAGE_SIZE = 1000

  // 1. SELECT paginado de 1000 em 1000 em leads (excluindo categorias não-comerciais)
  const allLeads: RawLeadCoorte[] = []
  let leadsFrom = 0

  while (true) {
    const leadsTo = leadsFrom + PAGE_SIZE - 1
    const res = await runWithAuthRecovery<RawLeadCoorte[]>(() =>
      supabase
        .from('leads')
        .select(
          'id, criado_em, atualizado_em, data_venda, status, consultor_id, origem, excluido, motivo_perda, etapa_perda, categoria, consultor:users!leads_consultor_id_fkey(id, nome)',
        )
        .eq('excluido', false)
        .or(
          'categoria.is.null,categoria.not.in.("Currículo","Fornecedor","Parceiro","Assistência","Outros Assuntos")',
        )
        .order('id', { ascending: true })
        .range(leadsFrom, leadsTo),
    )

    if (res.error) {
      throw new Error(res.error.message || 'Erro ao consultar leads para coortes')
    }

    const rows = res.data || []
    allLeads.push(...rows)

    if (rows.length < PAGE_SIZE) {
      break
    }
    leadsFrom += PAGE_SIZE
  }

  // 2. SELECT paginado de 1000 em 1000 em leads_status_historico
  // Busca lead_id, status_novo e criado_em para consultoria e perdas
  const historicoMap = new Set<string>()
  const historicoPerdasMap = new Map<string, string>() // lead_id -> data mais recente de perda

  let histFrom = 0
  while (true) {
    const histTo = histFrom + PAGE_SIZE - 1
    const res = await runWithAuthRecovery<
      { id?: string; lead_id: string; status_novo: string; criado_em: string | null }[]
    >(() =>
      supabase
        .from('leads_status_historico')
        .select('id, lead_id, status_novo, criado_em')
        .order('id', { ascending: true })
        .range(histFrom, histTo),
    )

    if (res.error) {
      throw new Error(res.error.message || 'Erro ao consultar histórico de leads para coortes')
    }

    const rows = res.data || []
    for (const h of rows) {
      const norm = (h.status_novo || '').trim().toLowerCase()

      // Consultoria
      if (COLUNAS_CONSULTORIA.has(norm)) {
        historicoMap.add(h.lead_id)
      }

      // Perda (status_novo contendo 'perdido', sem diferenciar maiúsculas)
      if (norm.includes('perdido') && h.criado_em) {
        const prev = historicoPerdasMap.get(h.lead_id)
        if (!prev || new Date(h.criado_em).getTime() > new Date(prev).getTime()) {
          historicoPerdasMap.set(h.lead_id, h.criado_em)
        }
      }
    }

    if (rows.length < PAGE_SIZE) {
      break
    }
    histFrom += PAGE_SIZE
  }

  return {
    leads: allLeads,
    historicoMap,
    historicoPerdasMap,
  }
}

/**
 * Agrega e calcula as coortes no cliente de forma eficiente e determinística.
 */
export function processarCoortes(
  leads: RawLeadCoorte[],
  historicoConsultoria: Set<string>,
  filtros: {
    consultorId?: string | null
    origem?: string | null
    mesesJanela?: number // padrão 12
    historicoPerdasMap?: Map<string, string>
  } = {},
  historicoPerdasFallback?: Map<string, string>,
): CoorteResultado {
  const { consultorId, origem, mesesJanela = 12 } = filtros
  const perdasMap =
    filtros.historicoPerdasMap || historicoPerdasFallback || new Map<string, string>()

  // Mapear consultores e origens disponíveis antes dos filtros
  const consultoresMap = new Map<string, string>()
  const origensSet = new Set<string>()

  for (const l of leads) {
    if (l.consultor?.id && l.consultor?.nome) {
      consultoresMap.set(l.consultor.id, l.consultor.nome)
    }
    if (l.origem && l.origem.trim()) {
      origensSet.add(l.origem.trim())
    }
  }

  const consultoresDisponiveis: ConsultorOption[] = Array.from(consultoresMap.entries())
    .map(([id, nome]) => ({ id, nome }))
    .sort((a, b) => a.nome.localeCompare(b.nome))

  const origensDisponiveis: string[] = Array.from(origensSet).sort((a, b) => a.localeCompare(b))

  // Filtrar leads
  const leadsFiltrados = leads.filter((l) => {
    if (consultorId && l.consultor_id !== consultorId) {
      return false
    }
    if (origem && l.origem !== origem) {
      return false
    }
    return true
  })

  // Data atual e mês anterior de referência no fuso America/Sao_Paulo
  const now = new Date()
  const nowSP = getAnoMesSP(now)
  const mesAtualIso = nowSP.mesIso

  // Mês anterior em SP:
  const prevMonthDate = new Date(now.getTime() - 32 * 24 * 60 * 60 * 1000)
  // Calcula com base nos números ano/mês para ser 100% determinístico:
  const prevAno = nowSP.mes === 1 ? nowSP.ano - 1 : nowSP.ano
  const prevMes = nowSP.mes === 1 ? 12 : nowSP.mes - 1
  const mesAnteriorIso = `${prevAno}-${String(prevMes).padStart(2, '0')}`

  // Agrupar leads por mês de criado_em (safra) no fuso America/Sao_Paulo
  interface CoorteAcc {
    mes_iso: string
    ano: number
    mes: number
    leads: RawLeadCoorte[]
  }

  const coortesMap = new Map<string, CoorteAcc>()

  for (const l of leadsFiltrados) {
    if (!l.criado_em) continue
    const { ano, mes, mesIso } = getAnoMesSP(l.criado_em)

    let acc = coortesMap.get(mesIso)
    if (!acc) {
      acc = {
        mes_iso: mesIso,
        ano,
        mes,
        leads: [],
      }
      coortesMap.set(mesIso, acc)
    }
    acc.leads.push(l)
  }

  // Ordenar safras da mais recente para a mais antiga e cortar na janela
  const safrasOrdenadas = Array.from(coortesMap.values()).sort((a, b) =>
    b.mes_iso.localeCompare(a.mes_iso),
  )

  const safrasJanela = safrasOrdenadas.slice(0, mesesJanela)

  // Encontrar a defasagem máxima (entre vendas e perdas) para dimensionar colunas M+X
  let maxDefasagemGeral = 0

  // Linhas calculadas
  const linhas: CoorteLinha[] = []

  let totalVendasGeral = 0
  let totalChegadosGeral = 0
  let totalIniciaramGeral = 0
  let totalPerdidosGeral = 0
  let totalAbertosGeral = 0

  for (const safra of safrasJanela) {
    const { mes_iso, ano, mes, leads: safraLeads } = safra
    const mesLabel = formatMesLabel(mes_iso)

    const isMesCorrente = mes_iso === mesAtualIso
    const isMaturidadeRecente = mes_iso === mesAtualIso || mes_iso === mesAnteriorIso

    let totalChegados = safraLeads.length
    let iniciaramConsultoria = 0
    let vendidos = 0
    let perdidos = 0
    let emAberto = 0

    const ciclosDias: number[] = []

    for (const lead of safraLeads) {
      const isVenda = !!lead.data_venda
      const isPerdido =
        lead.status === 'Perdido' ||
        lead.status === 'SDR: Perdido' ||
        (lead.motivo_perda !== null && lead.motivo_perda.trim() !== '') ||
        (lead.status && lead.status.toLowerCase().includes('perdido'))

      // Iniciou consultoria?
      // Regra: histórico de status em coluna de consultoria OU status atual em coluna de consultoria
      const normStatus = (lead.status || '').trim().toLowerCase()
      const isIniciou = historicoConsultoria.has(lead.id) || COLUNAS_CONSULTORIA.has(normStatus)

      if (isIniciou) {
        iniciaramConsultoria++
      }

      if (isVenda) {
        vendidos++
        const criadoEmDate = new Date(lead.criado_em)
        const dataVendaDate = new Date(lead.data_venda!)

        // Ciclo em dias
        const diffMs = dataVendaDate.getTime() - criadoEmDate.getTime()
        const dias = Math.max(0, Math.round((diffMs / (1000 * 60 * 60 * 24)) * 10) / 10)
        ciclosDias.push(dias)

        // Defasagem em meses no fuso America/Sao_Paulo (mês da data_venda - mês da safra)
        const def = Math.max(
          0,
          diffInMonthsSP(lead.data_venda!, getDataInicioSafraSP(safra.ano, safra.mes)),
        )
        if (def > maxDefasagemGeral) {
          maxDefasagemGeral = def
        }
      } else if (isPerdido) {
        perdidos++
        // Data da perda: data mais recente no histórico onde status_novo contém 'perdido',
        // se não houver, fallback para lead.atualizado_em, e fallback final lead.criado_em
        const dataPerda = perdasMap.get(lead.id) || lead.atualizado_em || lead.criado_em
        const defPerda = Math.max(
          0,
          diffInMonthsSP(dataPerda, getDataInicioSafraSP(safra.ano, safra.mes)),
        )
        if (defPerda > maxDefasagemGeral) {
          maxDefasagemGeral = defPerda
        }
      } else {
        emAberto++
      }
    }

    // Ciclo médio e mediano
    let cicloMedio: number | null = null
    if (ciclosDias.length > 0) {
      const soma = ciclosDias.reduce((acc, v) => acc + v, 0)
      cicloMedio = Math.round((soma / ciclosDias.length) * 10) / 10
    }
    const cicloMediano = calculateMedian(ciclosDias)

    const taxaConversao = totalChegados > 0 ? Math.round((vendidos / totalChegados) * 1000) / 10 : 0
    const taxaConversaoConsultoria =
      iniciaramConsultoria > 0 ? Math.round((vendidos / iniciaramConsultoria) * 1000) / 10 : 0

    linhas.push({
      mes_iso,
      mes_label: mesLabel,
      ano,
      mes,
      is_maturidade_recente: isMaturidadeRecente,
      is_mes_corrente: isMesCorrente,
      total_chegados: totalChegados,
      iniciaram_consultoria: iniciaramConsultoria,
      vendidos,
      perdidos,
      em_aberto: emAberto,
      taxa_conversao: taxaConversao,
      taxa_conversao_consultoria: taxaConversaoConsultoria,
      ciclo_medio_dias: cicloMedio,
      ciclo_mediano_dias: cicloMediano !== null ? Math.round(cicloMediano * 10) / 10 : null,
      vendas_por_defasagem: [], // preenchido logo abaixo
      perdas_por_defasagem: [], // preenchido logo abaixo
    })

    totalVendasGeral += vendidos
    totalChegadosGeral += totalChegados
    totalIniciaramGeral += iniciaramConsultoria
    totalPerdidosGeral += perdidos
    totalAbertosGeral += emAberto
  }

  // Garantir pelo menos M+0, M+1, M+2, M+3 na visualização para boa clareza
  const maxDef = Math.max(3, maxDefasagemGeral)

  // Agora preenche os arrays de defasagem com tamanho fixo (0 até maxDef)
  for (let i = 0; i < linhas.length; i++) {
    const l = linhas[i]
    const safra = safrasJanela[i]

    const vendasArr = new Array(maxDef + 1).fill(0)
    const perdasArr = new Array(maxDef + 1).fill(0)

    for (const lead of safra.leads) {
      const isVenda = !!lead.data_venda
      const isPerdido =
        lead.status === 'Perdido' ||
        lead.status === 'SDR: Perdido' ||
        (lead.motivo_perda !== null && lead.motivo_perda.trim() !== '') ||
        (lead.status && lead.status.toLowerCase().includes('perdido'))

      if (isVenda && lead.data_venda) {
        const def = Math.max(
          0,
          diffInMonthsSP(lead.data_venda, getDataInicioSafraSP(safra.ano, safra.mes)),
        )
        if (def <= maxDef) {
          vendasArr[def]++
        }
      } else if (isPerdido) {
        const dataPerda = perdasMap.get(lead.id) || lead.atualizado_em || lead.criado_em
        const def = Math.max(
          0,
          diffInMonthsSP(dataPerda, getDataInicioSafraSP(safra.ano, safra.mes)),
        )
        if (def <= maxDef) {
          perdasArr[def]++
        }
      }
    }

    l.vendas_por_defasagem = vendasArr
    l.perdas_por_defasagem = perdasArr
  }

  const taxaConversaoGeral =
    totalChegadosGeral > 0 ? Math.round((totalVendasGeral / totalChegadosGeral) * 1000) / 10 : 0

  return {
    coortes: linhas,
    max_defasagem: maxDef,
    total_vendas_geral: totalVendasGeral,
    total_chegados_geral: totalChegadosGeral,
    total_iniciaram_geral: totalIniciaramGeral,
    total_perdidos_geral: totalPerdidosGeral,
    total_abertos_geral: totalAbertosGeral,
    taxa_conversao_geral: taxaConversaoGeral,
    consultores_disponiveis: consultoresDisponiveis,
    origens_disponiveis: origensDisponiveis,
  }
}
