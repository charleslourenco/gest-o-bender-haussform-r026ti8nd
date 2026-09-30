import { supabase } from '@/lib/supabase/client'
import { runWithAuthRecovery } from '@/lib/supabase/auth-recovery'

export interface RawLeadCoorte {
  id: string
  criado_em: string
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

function diffInMonths(dateLater: Date, dateEarlier: Date): number {
  const yDiff = dateLater.getUTCFullYear() - dateEarlier.getUTCFullYear()
  const mDiff = dateLater.getUTCMonth() - dateEarlier.getUTCMonth()
  return yDiff * 12 + mDiff
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
}> {
  // 1. SELECT nos leads com hint obrigatório na FK do consultor titular
  const leadsResult = await runWithAuthRecovery<RawLeadCoorte[]>(() =>
    supabase
      .from('leads')
      .select(
        'id, criado_em, data_venda, status, consultor_id, origem, excluido, motivo_perda, etapa_perda, categoria, consultor:users!leads_consultor_id_fkey(id, nome)',
      )
      .eq('excluido', false)
      .order('criado_em', { ascending: false }),
  )

  if (leadsResult.error) {
    throw new Error(leadsResult.error.message || 'Erro ao consultar leads para coortes')
  }

  const rawLeads = leadsResult.data || []

  // 2. SELECT no histórico de status para identificar transições para consultoria
  const historicoResult = await runWithAuthRecovery<{ lead_id: string; status_novo: string }[]>(
    () => supabase.from('leads_status_historico').select('lead_id, status_novo').limit(10000),
  )

  const historicoMap = new Set<string>()
  if (historicoResult.data) {
    for (const h of historicoResult.data) {
      const norm = (h.status_novo || '').trim().toLowerCase()
      if (COLUNAS_CONSULTORIA.has(norm)) {
        historicoMap.add(h.lead_id)
      }
    }
  }

  return {
    leads: rawLeads,
    historicoMap,
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
  } = {},
): CoorteResultado {
  const { consultorId, origem, mesesJanela = 12 } = filtros

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

  // Data atual de referência para avaliar maturidade
  const now = new Date()
  const currentYear = now.getUTCFullYear()
  const currentMonth = now.getUTCMonth() // 0-11
  const mesAtualIso = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}`

  const prevMonthDate = new Date(Date.UTC(currentYear, currentMonth - 1, 1))
  const mesAnteriorIso = `${prevMonthDate.getUTCFullYear()}-${String(
    prevMonthDate.getUTCMonth() + 1,
  ).padStart(2, '0')}`

  // Agrupar leads por mês de criado_em (safra)
  interface CoorteAcc {
    mes_iso: string
    ano: number
    mes: number
    leads: RawLeadCoorte[]
  }

  const coortesMap = new Map<string, CoorteAcc>()

  for (const l of leadsFiltrados) {
    if (!l.criado_em) continue
    const d = new Date(l.criado_em)
    const mesIso = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`

    let acc = coortesMap.get(mesIso)
    if (!acc) {
      acc = {
        mes_iso: mesIso,
        ano: d.getUTCFullYear(),
        mes: d.getUTCMonth() + 1,
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

  // Encontrar a defasagem máxima para dimensionar as colunas M+X
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
    const vendasPorDefasagemMap = new Map<number, number>()
    const perdasPorDefasagemMap = new Map<number, number>()

    const dataInicioSafra = new Date(Date.UTC(ano, mes - 1, 1))

    for (const lead of safraLeads) {
      const criadoEmDate = new Date(lead.criado_em)
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
        const dataVendaDate = new Date(lead.data_venda!)

        // Ciclo em dias
        const diffMs = dataVendaDate.getTime() - criadoEmDate.getTime()
        const dias = Math.max(0, Math.round((diffMs / (1000 * 60 * 60 * 24)) * 10) / 10)
        ciclosDias.push(dias)

        // Defasagem em meses (mês da data_venda - mês de criado_em)
        const def = Math.max(0, diffInMonths(dataVendaDate, dataInicioSafra))
        vendasPorDefasagemMap.set(def, (vendasPorDefasagemMap.get(def) || 0) + 1)
        if (def > maxDefasagemGeral) {
          maxDefasagemGeral = def
        }
      } else if (isPerdido) {
        perdidos++
        // Defasagem de perda: usa atualizado_em se houver ou criado_em
        // Como o lead veio sem atualizado_em para economizar payload, usa criado_em ou mês corrente
        // Por aproximação na coorte, perdas contam no M+0 ou defasagem se lead antigo
        perdasPorDefasagemMap.set(0, (perdasPorDefasagemMap.get(0) || 0) + 1)
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

    // Converte os maps de defasagem em arrays até maxDefasagemGeral (ajustado depois)
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
      vendas_por_defasagem: [], // preenchido logo abaixo quando maxDefasagemGeral estiver estável
      perdas_por_defasagem: [],
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
    const dataInicioSafra = new Date(Date.UTC(l.ano, l.mes - 1, 1))

    const vendasArr = new Array(maxDef + 1).fill(0)
    const perdasArr = new Array(maxDef + 1).fill(0)

    for (const lead of safra.leads) {
      if (lead.data_venda) {
        const dv = new Date(lead.data_venda)
        const def = Math.max(0, diffInMonths(dv, dataInicioSafra))
        if (def <= maxDef) {
          vendasArr[def]++
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
