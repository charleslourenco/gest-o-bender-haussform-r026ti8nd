import { supabase } from '@/lib/supabase/client'

export interface MembroEquipeFiltro {
  id: string
  nome: string
  tipo: 'CLT' | 'PJ'
  areas_atuacao?: string[]
  montador_id?: string | null
}

export interface AlocacaoPeriodoItem {
  id: string
  cardId: string
  cardNome: string
  clienteNome: string
  pessoaId: string
  pessoaNome: string
  tipoOrigem: 'CLT' | 'PJ'
  inicio: string // ISO timestamp
  fim: string | null // ISO timestamp or null if in progress
  emAndamento: boolean
  duracaoMs: number
  duracaoFormatada: string
}

export interface RelatorioAlocacaoResumo {
  totalAlocacoes: number
  tempoMedioFormatado: string
  alocacoesAtivas: number
}

export interface FiltrosRelatorioAlocacao {
  pessoaId: string // 'all' ou ID específico da pessoa (CLT/PJ/Montador)
  dataDe: string // 'YYYY-MM-DD'
  dataAte: string // 'YYYY-MM-DD'
}

/**
 * Formata duração em milissegundos para string amigável:
 * Ex: "3 dias e 4 horas", "2h 15min", "45min", "30 seg"
 */
export function formatarDuracao(ms: number): string {
  if (ms < 0) ms = 0
  const segundos = Math.floor(ms / 1000)
  if (segundos < 60) {
    return `${segundos} seg`
  }
  const minutos = Math.floor(segundos / 60)
  if (minutos < 60) {
    const s = segundos % 60
    return s > 0 ? `${minutos}min ${s}s` : `${minutos}min`
  }
  const horas = Math.floor(minutos / 60)
  const remMinutos = minutos % 60
  if (horas < 24) {
    return remMinutos > 0 ? `${horas}h ${remMinutos}min` : `${horas}h`
  }
  const dias = Math.floor(horas / 24)
  const remHoras = horas % 24
  if (remHoras > 0) {
    return `${dias} dia${dias > 1 ? 's' : ''} e ${remHoras} hora${remHoras > 1 ? 's' : ''}`
  }
  return `${dias} dia${dias > 1 ? 's' : ''}`
}

/**
 * Busca a lista unificada de membros da equipe (CLT + PJ) da Gestão de Pessoas
 * opcionalmente filtrada pela área de atuação (ex: 'producao' ou 'montagem').
 */
export async function fetchEquipeGestaoPessoas(
  modulo?: 'producao' | 'montagem',
): Promise<MembroEquipeFiltro[]> {
  try {
    const [cltRes, pjRes, montRes] = await Promise.all([
      supabase
        .from('equipe_clt')
        .select('id, nome_completo, areas_atuacao, montador_id')
        .order('nome_completo', { ascending: true }),
      supabase
        .from('parceiros_pj')
        .select('id, razao_social, socio_nome, areas_atuacao, montador_id')
        .order('razao_social', { ascending: true }),
      supabase
        .from('montadores')
        .select('id, nome_completo')
        .order('nome_completo', { ascending: true }),
    ])

    const membros: MembroEquipeFiltro[] = []
    const nomesNormalizados = new Map<string, MembroEquipeFiltro>()

    if (Array.isArray(cltRes.data)) {
      for (const c of cltRes.data) {
        if (!c?.id || !c.nome_completo) continue
        const item: MembroEquipeFiltro = {
          id: c.id,
          nome: c.nome_completo,
          tipo: 'CLT',
          areas_atuacao: Array.isArray(c.areas_atuacao) ? c.areas_atuacao : [],
          montador_id: (c as any).montador_id || null,
        }
        membros.push(item)
        nomesNormalizados.set(c.nome_completo.trim().toLowerCase(), item)
      }
    }

    if (Array.isArray(pjRes.data)) {
      for (const p of pjRes.data) {
        const nome = p.socio_nome || p.razao_social
        if (!p?.id || !nome) continue
        const item: MembroEquipeFiltro = {
          id: p.id,
          nome,
          tipo: 'PJ',
          areas_atuacao: Array.isArray(p.areas_atuacao) ? p.areas_atuacao : [],
          montador_id: (p as any).montador_id || null,
        }
        membros.push(item)
        nomesNormalizados.set(nome.trim().toLowerCase(), item)
      }
    }

    // Inclui montadores legados se não houver registro CLT/PJ com o mesmo nome
    if (Array.isArray(montRes.data)) {
      for (const m of montRes.data) {
        if (!m?.id || !m.nome_completo) continue
        const norm = m.nome_completo.trim().toLowerCase()
        if (!nomesNormalizados.has(norm)) {
          const item: MembroEquipeFiltro = {
            id: m.id,
            nome: m.nome_completo,
            tipo: 'PJ',
            areas_atuacao: ['montagem'],
            montador_id: m.id,
          }
          membros.push(item)
          nomesNormalizados.set(norm, item)
        }
      }
    }

    // Filtrar por área se fornecida (se não houver área especificada no membro, mantém por compatibilidade)
    const filtrados = modulo
      ? membros.filter((m) => {
          if (!m.areas_atuacao || m.areas_atuacao.length === 0) return true
          return m.areas_atuacao.includes(modulo)
        })
      : membros

    return filtrados.sort((a, b) => a.nome.localeCompare(b.nome))
  } catch (err) {
    console.error('Erro ao buscar equipe para relatório de alocação:', err)
    return []
  }
}

/**
 * Reúne o histórico de alocação/desalocação, liga aos cards/subcards e clientes,
 * calcula início, fim, duração e estado 'em andamento'.
 */
export async function fetchRelatorioAlocacao(
  filtros: FiltrosRelatorioAlocacao,
  modulo?: 'producao' | 'montagem',
): Promise<{
  itens: AlocacaoPeriodoItem[]
  resumo: RelatorioAlocacaoResumo
}> {
  // 1. Carregar mapeamento de equipe para identificar nomes e IDs correspondentes
  const equipe = await fetchEquipeGestaoPessoas()
  const [montadoresRes, ativasRes] = await Promise.all([
    supabase.from('montadores').select('id, nome_completo'),
    supabase
      .from('alocacao_montagem')
      .select('card_id, pessoa_id, montador_id, pessoa_nome, tipo_origem, criado_em'),
  ])

  // Mapas para resolução de pessoa
  const montadoresMap = new Map<string, string>()
  if (Array.isArray(montadoresRes.data)) {
    for (const m of montadoresRes.data) {
      if (m?.id && m.nome_completo) {
        montadoresMap.set(m.id, m.nome_completo)
      }
    }
  }

  // Identifica quais IDs de pessoa correspondem ao filtro de pessoa selecionado
  const selectedPessoaId = filtros.pessoaId && filtros.pessoaId !== 'all' ? filtros.pessoaId : null
  const allowedPessoaIds = new Set<string>()
  let selectedPessoaNome: string | null = null

  if (selectedPessoaId) {
    allowedPessoaIds.add(selectedPessoaId)
    // Tenta achar na equipe
    const membro = equipe.find((e) => e.id === selectedPessoaId)
    if (membro) {
      selectedPessoaNome = membro.nome.trim().toLowerCase()
      // Se este membro também existir como montador, adiciona o id do montador
      for (const [mId, mNome] of montadoresMap.entries()) {
        if (mNome.trim().toLowerCase() === selectedPessoaNome) {
          allowedPessoaIds.add(mId)
        }
      }
    } else {
      // Pode ser um ID da tabela montadores
      const mNome = montadoresMap.get(selectedPessoaId)
      if (mNome) {
        selectedPessoaNome = mNome.trim().toLowerCase()
        for (const e of equipe) {
          if (e.nome.trim().toLowerCase() === selectedPessoaNome) {
            allowedPessoaIds.add(e.id)
          }
        }
      }
    }
  }

  // 2. Consulta histórico de alocação ordenado cronologicamente (ascendente para emparelhamento)
  let query = supabase
    .from('historico_alocacao_montagem')
    .select('id, card_id, montador_id, pessoa_id, pessoa_nome, tipo_origem, acao, criado_em')
    .order('criado_em', { ascending: true })

  const { data: histData, error: histError } = await query
  if (histError) {
    console.error('Erro ao consultar historico_alocacao_montagem:', histError)
    throw histError
  }

  const historico = Array.isArray(histData) ? histData : []

  // 3. Buscar dados dos cards referenciados no histórico e alocações ativas
  const cardIdsSet = new Set<string>()
  for (const h of historico) {
    if (h.card_id) cardIdsSet.add(h.card_id)
  }
  const ativas = Array.isArray(ativasRes.data) ? ativasRes.data : []
  for (const a of ativas) {
    if (a.card_id) cardIdsSet.add(a.card_id)
  }

  const cardIds = Array.from(cardIdsSet)
  const cardsMap = new Map<
    string,
    {
      id: string
      nome_produto: string
      status_analise: string
      cliente_nome: string
      card_pai_id: string | null
      arquivado_producao: boolean
      arquivado_montagem: boolean
    }
  >()

  if (cardIds.length > 0) {
    // Buscar em lotes se necessário (tipicamente <= 100)
    const { data: cardsData, error: cardsError } = await supabase
      .from('produtos_servicos_projeto')
      .select(`
        id,
        nome_produto,
        status_analise,
        card_pai_id,
        arquivado_producao,
        arquivado_montagem,
        cliente:clientes(nome),
        formulario:formulario_comercial(nome_cliente, cliente:clientes(nome)),
        card_pai:produtos_servicos_projeto!card_pai_id(
          id,
          nome_produto,
          cliente:clientes(nome),
          formulario:formulario_comercial(nome_cliente, cliente:clientes(nome))
        )
      `)
      .in('id', cardIds)

    if (cardsError) {
      console.error('Erro ao consultar produtos_servicos_projeto:', cardsError)
    } else if (Array.isArray(cardsData)) {
      for (const row of cardsData) {
        // Resolver nome do cliente: direto ou via formulário ou via card pai
        let clienteNome = ''
        if (row.cliente) {
          clienteNome = Array.isArray(row.cliente) ? row.cliente[0]?.nome : row.cliente?.nome
        }
        if (!clienteNome && row.formulario) {
          const f = Array.isArray(row.formulario) ? row.formulario[0] : row.formulario
          const fc = Array.isArray(f?.cliente) ? f.cliente[0]?.nome : f?.cliente?.nome
          clienteNome = fc || f?.nome_cliente || ''
        }
        if (!clienteNome && row.card_pai) {
          const pai = Array.isArray(row.card_pai) ? row.card_pai[0] : row.card_pai
          if (pai?.cliente) {
            clienteNome = Array.isArray(pai.cliente) ? pai.cliente[0]?.nome : pai.cliente?.nome
          }
          if (!clienteNome && pai?.formulario) {
            const pf = Array.isArray(pai.formulario) ? pai.formulario[0] : pai.formulario
            const pfc = Array.isArray(pf?.cliente) ? pf.cliente[0]?.nome : pf?.cliente?.nome
            clienteNome = pfc || pf?.nome_cliente || ''
          }
        }

        cardsMap.set(row.id, {
          id: row.id,
          nome_produto: row.nome_produto || 'Sem nome',
          status_analise: row.status_analise || '',
          cliente_nome: clienteNome || 'Cliente não informado',
          card_pai_id: row.card_pai_id || null,
          arquivado_producao: !!row.arquivado_producao,
          arquivado_montagem: !!row.arquivado_montagem,
        })
      }
    }
  }

  // 4. Agrupar eventos por pessoa + card para reconstruir os intervalos
  // Chave canônica por pessoa:
  // Se houver pessoa_id, usa pessoa_id. Se montador_id, mapeia para nome e depois pessoa_id se houver, ou 'montador_' + montador_id.
  const resolvePessoaInfo = (item: {
    pessoa_id?: string | null
    montador_id?: string | null
    pessoa_nome?: string | null
    tipo_origem?: string | null
  }) => {
    let resolvedId = item.pessoa_id || item.montador_id || ''
    let resolvedNome = item.pessoa_nome || ''
    let resolvedTipo: 'CLT' | 'PJ' = (item.tipo_origem as 'CLT' | 'PJ') || 'PJ'

    // Casamento preferencial por montador_id ou pessoa_id fixo
    const matchMembro = equipe.find((m) => {
      if (item.montador_id && m.montador_id === item.montador_id) return true
      if (item.pessoa_id && m.id === item.pessoa_id) return true
      return false
    })

    if (matchMembro) {
      resolvedId = matchMembro.id
      resolvedNome = matchMembro.nome
      resolvedTipo = matchMembro.tipo
    } else {
      if (item.montador_id && !resolvedNome) {
        resolvedNome = montadoresMap.get(item.montador_id) || ''
      }

      if (resolvedNome) {
        const match = equipe.find(
          (e) => e.nome.trim().toLowerCase() === resolvedNome.trim().toLowerCase(),
        )
        if (match) {
          resolvedId = match.id
          resolvedNome = match.nome
          resolvedTipo = match.tipo
        }
      } else if (item.pessoa_id) {
        const match = equipe.find((e) => e.id === item.pessoa_id)
        if (match) {
          resolvedNome = match.nome
          resolvedTipo = match.tipo
        }
      }
    }

    if (!resolvedNome) {
      resolvedNome = 'Não identificado'
    }

    return {
      id: resolvedId,
      nome: resolvedNome,
      tipo: resolvedTipo,
    }
  }

  // Tabela de alocações ativas atualmente (do banco de dados)
  // para verificar se uma sessão em aberto continua realmente alocada
  const activeLookup = new Set<string>()
  for (const a of ativas) {
    const p = resolvePessoaInfo(a)
    activeLookup.add(`${p.id}__${a.card_id}`)
    if (a.pessoa_id) activeLookup.add(`${a.pessoa_id}__${a.card_id}`)
    if (a.montador_id) activeLookup.add(`${a.montador_id}__${a.card_id}`)
  }

  // 5. Agrupar eventos e construir sessões de alocação
  // Agrupamos por chave (pessoaKey, cardId)
  interface RawSession {
    sessionKey: string
    cardId: string
    pessoaId: string
    pessoaNome: string
    tipoOrigem: 'CLT' | 'PJ'
    inicio: string
    fim: string | null
  }

  // Ordenar o histórico por tempo ascendente
  const eventsByPersonCard = new Map<string, typeof historico>()
  for (const h of historico) {
    if (!h.card_id) continue
    const p = resolvePessoaInfo(h)
    const key = `${p.id}__${h.card_id}`
    if (!eventsByPersonCard.has(key)) {
      eventsByPersonCard.set(key, [])
    }
    eventsByPersonCard.get(key)!.push(h)
  }

  const sessions: RawSession[] = []

  for (const [key, events] of eventsByPersonCard.entries()) {
    // events estão em ordem cronológica
    let currentOpen: (typeof events)[0] | null = null

    for (const ev of events) {
      if (ev.acao === 'alocado') {
        if (currentOpen) {
          // Se já havia um "alocado" sem desalocado correspondente, fechamos o anterior na hora deste novo
          const p = resolvePessoaInfo(currentOpen)
          sessions.push({
            sessionKey: `${currentOpen.id}`,
            cardId: currentOpen.card_id,
            pessoaId: p.id,
            pessoaNome: p.nome,
            tipoOrigem: p.tipo,
            inicio: currentOpen.criado_em,
            fim: ev.criado_em,
          })
        }
        currentOpen = ev
      } else if (ev.acao === 'desalocado') {
        if (currentOpen) {
          const p = resolvePessoaInfo(currentOpen)
          sessions.push({
            sessionKey: `${currentOpen.id}_${ev.id}`,
            cardId: currentOpen.card_id,
            pessoaId: p.id,
            pessoaNome: p.nome,
            tipoOrigem: p.tipo,
            inicio: currentOpen.criado_em,
            fim: ev.criado_em,
          })
          currentOpen = null
        } else {
          // Evento desalocado sem evento alocado prévio conhecido (ex: alocado antes de o histórico ser criado)
          // Registra como sessão concluída que finalizou neste momento
          const p = resolvePessoaInfo(ev)
          sessions.push({
            sessionKey: `${ev.id}_desalocado_orphan`,
            cardId: ev.card_id,
            pessoaId: p.id,
            pessoaNome: p.nome,
            tipoOrigem: p.tipo,
            inicio: ev.criado_em, // início = fim (ou instante da desalocação registrada)
            fim: ev.criado_em,
          })
        }
      }
    }

    if (currentOpen) {
      // Ainda em andamento!
      const p = resolvePessoaInfo(currentOpen)
      sessions.push({
        sessionKey: `${currentOpen.id}_open`,
        cardId: currentOpen.card_id,
        pessoaId: p.id,
        pessoaNome: p.nome,
        tipoOrigem: p.tipo,
        inicio: currentOpen.criado_em,
        fim: null, // em andamento
      })
    }
  }

  // Também verificar se há alocações ativas em alocacao_montagem que NÃO têm NENHUM evento no histórico
  for (const a of ativas) {
    if (!a.card_id) continue
    const p = resolvePessoaInfo(a)
    const key = `${p.id}__${a.card_id}`
    const alreadyTracked = sessions.some(
      (s) => (s.pessoaId === p.id || s.pessoaNome === p.nome) && s.cardId === a.card_id && !s.fim,
    )
    if (!alreadyTracked) {
      sessions.push({
        sessionKey: `active_${a.card_id}_${p.id}`,
        cardId: a.card_id,
        pessoaId: p.id,
        pessoaNome: p.nome,
        tipoOrigem: p.tipo,
        inicio: (a as any).criado_em || new Date().toISOString(),
        fim: null,
      })
    }
  }

  // 6. Filtrar por módulo (se aplicável), pessoa e período
  const nowMs = Date.now()
  const itens: AlocacaoPeriodoItem[] = []

  // Prepara limites de data se fornecidos
  let minDateMs = -Infinity
  let maxDateMs = Infinity

  if (filtros.dataDe) {
    minDateMs = new Date(`${filtros.dataDe}T00:00:00`).getTime()
  }
  if (filtros.dataAte) {
    maxDateMs = new Date(`${filtros.dataAte}T23:59:59.999`).getTime()
  }

  const producaoStatuses = new Set([
    'aguardando_plano_corte',
    'router',
    'coladeira',
    'bancada',
    'embalagem',
    'aguardando_agenda',
  ])

  const montagemStatuses = new Set([
    'aguardando_agenda',
    'montagem',
    'item_terceirizado',
    'pendencia',
    'concluido',
  ])

  for (const s of sessions) {
    const cardInfo = cardsMap.get(s.cardId)
    if (!cardInfo) continue

    // Filtragem por módulo de kanban:
    if (modulo === 'producao') {
      if (!producaoStatuses.has(cardInfo.status_analise) || cardInfo.arquivado_producao) {
        continue
      }
    } else if (modulo === 'montagem') {
      if (!montagemStatuses.has(cardInfo.status_analise) || cardInfo.arquivado_montagem) {
        continue
      }
    }

    const cardNome = cardInfo.nome_produto || 'Card do Projeto'
    const clienteNome = cardInfo.cliente_nome || 'Cliente não informado'

    // Filtragem por pessoa:
    if (selectedPessoaId) {
      const matchId = allowedPessoaIds.has(s.pessoaId)
      const matchNome =
        selectedPessoaNome && s.pessoaNome.trim().toLowerCase() === selectedPessoaNome
      if (!matchId && !matchNome) {
        continue
      }
    }

    // Filtragem por período:
    // A alocação pertence ao período se houver sobreposição:
    // inicio <= maxDate e (fim >= minDate ou fim é null)
    const inicioMs = new Date(s.inicio).getTime()
    const fimMs = s.fim ? new Date(s.fim).getTime() : nowMs

    if (inicioMs > maxDateMs) continue
    if (fimMs < minDateMs) continue

    const emAndamento = s.fim === null
    const duracaoMs = Math.max(0, fimMs - inicioMs)

    itens.push({
      id: s.sessionKey,
      cardId: s.cardId,
      cardNome,
      clienteNome,
      pessoaId: s.pessoaId,
      pessoaNome: s.pessoaNome,
      tipoOrigem: s.tipoOrigem,
      inicio: s.inicio,
      fim: s.fim,
      emAndamento,
      duracaoMs,
      duracaoFormatada: formatarDuracao(duracaoMs),
    })
  }

  // Ordenar por início mais recente no topo
  itens.sort((a, b) => new Date(b.inicio).getTime() - new Date(a.inicio).getTime())

  // 7. Calcular métricas do resumo
  const totalAlocacoes = itens.length
  const alocacoesAtivas = itens.filter((i) => i.emAndamento).length

  // Tempo médio por serviço (considera apenas as sessões concluídas ou todas com duração decorrida)
  // Para cálculo preciso de "tempo médio por serviço", usamos a média de duração das alocações filtradas
  const duracoesCompletas = itens.filter((i) => !i.emAndamento).map((i) => i.duracaoMs)
  // Se só tiver em andamento ou nenhuma concluída, usa todas
  const baseCalculo =
    duracoesCompletas.length > 0 ? duracoesCompletas : itens.map((i) => i.duracaoMs)
  const somaDuracao = baseCalculo.reduce((acc, curr) => acc + curr, 0)
  const mediaMs = baseCalculo.length > 0 ? somaDuracao / baseCalculo.length : 0
  const tempoMedioFormatado = baseCalculo.length > 0 ? formatarDuracao(mediaMs) : '—'

  return {
    itens,
    resumo: {
      totalAlocacoes,
      tempoMedioFormatado,
      alocacoesAtivas,
    },
  }
}
