import { useState, useEffect, useRef, useCallback } from 'react'
import { supabase } from '@/lib/supabase/client'

export interface KanbanItem {
  id: string
  nome_produto: string
  codigo_rastreio: string | null
  qtd: number
  status_analise: string
  cliente: { nome: string } | null
  cliente_id?: string | null
  criado_em: string
  analista_id: string | null
  formulario: {
    user_id: string
    nome_cliente: string | null
    cliente: { nome: string } | null
  } | null
  alocacao_montagem?: {
    montador_id?: string | null
    pessoa_id?: string | null
    pessoa_nome?: string | null
    tipo_origem?: 'CLT' | 'PJ' | null
    montadores?: { nome_completo: string } | null
  }[]
  terceirizado_validado?: boolean
  outsourced_checked?: boolean
  is_outsourced?: boolean
  card_pai_id?: string | null
  cor_vinculo?: string | null
  semana_planejada_producao?: string | null
  card_pai?: {
    id: string
    nome_produto: string
    status_analise: string
    cor_vinculo: string | null
    semana_planejada_producao?: string | null
  } | null
}

export interface KanbanColumnDef {
  id: string
  title: string
}

const PAGE_SIZE = 30

const ITEM_SELECT = `
  id, nome_produto, codigo_rastreio, qtd, status_analise, criado_em,
  analista_id, cliente_id, terceirizado_validado, outsourced_checked, is_outsourced,
  card_pai_id, cor_vinculo, semana_planejada_producao,
  card_pai:produtos_servicos_projeto!card_pai_id(id, nome_produto, status_analise, cor_vinculo, semana_planejada_producao),
  cliente:clientes(nome),
  formulario:formulario_comercial(user_id, nome_cliente, cliente:clientes(nome)),
  alocacao_montagem(montador_id, pessoa_id, pessoa_nome, tipo_origem, montadores(nome_completo))
`

export function getClienteNome(item: any): string | null {
  if (!item || typeof item !== 'object') return null
  const clienteRaw = item?.cliente ?? item?.clientes
  const nome = Array.isArray(clienteRaw) ? clienteRaw[0]?.nome : clienteRaw?.nome
  if (typeof nome === 'string' && nome.trim().length > 0) return nome.trim()

  const formRaw = item?.formulario ?? item?.formulario_comercial
  if (formRaw) {
    const form = Array.isArray(formRaw) ? formRaw[0] : formRaw
    if (form && typeof form === 'object') {
      const formCliRaw = form?.cliente ?? form?.clientes
      const formCli = Array.isArray(formCliRaw) ? formCliRaw[0]?.nome : formCliRaw?.nome
      if (typeof formCli === 'string' && formCli.trim().length > 0) return formCli.trim()
      if (typeof form?.nome_cliente === 'string' && form.nome_cliente.trim().length > 0) {
        return form.nome_cliente.trim()
      }
    }
  }
  return null
}

const normalizeItem = (item: any): KanbanItem => {
  if (!item || typeof item !== 'object' || Array.isArray(item)) {
    return {
      id: '',
      nome_produto: '',
      codigo_rastreio: null,
      qtd: 0,
      status_analise: '',
      cliente: null,
      cliente_id: null,
      criado_em: '',
      analista_id: null,
      formulario: null,
      alocacao_montagem: [],
      terceirizado_validado: false,
      outsourced_checked: false,
      is_outsourced: false,
      card_pai_id: null,
      cor_vinculo: null,
      card_pai: null,
    }
  }
  const clienteSource = item?.cliente ?? item?.clientes
  const clienteRaw = Array.isArray(clienteSource)
    ? (clienteSource[0] ?? null)
    : (clienteSource ?? null)
  const cliente =
    clienteRaw && typeof clienteRaw === 'object'
      ? { nome: typeof clienteRaw.nome === 'string' ? clienteRaw.nome : '' }
      : { nome: '' }

  const formSource = item?.formulario ?? item?.formulario_comercial
  const formularioRaw = Array.isArray(formSource) ? (formSource[0] ?? null) : (formSource ?? null)

  let formulario: KanbanItem['formulario'] = null
  if (formularioRaw && typeof formularioRaw === 'object') {
    const formCliSource = formularioRaw.cliente ?? formularioRaw.clientes
    const formCliRaw = Array.isArray(formCliSource)
      ? (formCliSource[0] ?? null)
      : (formCliSource ?? null)

    formulario = {
      user_id:
        typeof formularioRaw.user_id === 'string'
          ? formularioRaw.user_id
          : (formularioRaw.usuario_id ?? ''),
      nome_cliente:
        typeof formularioRaw.nome_cliente === 'string' ? formularioRaw.nome_cliente : null,
      cliente:
        formCliRaw && typeof formCliRaw === 'object'
          ? { nome: typeof formCliRaw.nome === 'string' ? formCliRaw.nome : '' }
          : null,
    }
  }

  const alocacaoRaw = Array.isArray(item?.alocacao_montagem)
    ? item.alocacao_montagem.filter(Boolean)
    : []

  return {
    ...item,
    alocacao_montagem: alocacaoRaw,
    cliente,
    formulario,
    status_analise: item?.status_analise ?? null,
    nome_produto: typeof item?.nome_produto === 'string' ? item.nome_produto : '',
    qtd: typeof item?.qtd === 'number' ? item.qtd : Number(item?.qtd) || 0,
    codigo_rastreio: item?.codigo_rastreio ?? null,
    analista_id: item?.analista_id ?? null,
    criado_em: item?.criado_em ?? '',
    cliente_id: item?.cliente_id ?? null,
    terceirizado_validado: Boolean(item?.terceirizado_validado),
    outsourced_checked: Boolean(item?.outsourced_checked),
    is_outsourced: Boolean(item?.is_outsourced),
    card_pai_id: item?.card_pai_id ?? null,
    cor_vinculo: item?.cor_vinculo ?? null,
    semana_planejada_producao: item?.semana_planejada_producao ?? null,
    card_pai: Array.isArray(item?.card_pai) ? (item.card_pai[0] ?? null) : (item?.card_pai ?? null),
  }
}

export function useKanbanData(
  columns: KanbanColumnDef[],
  opts?: {
    fetchMontadores?: boolean
    archiveFlag?: string
    excluidoFlag?: string
    priorityColumnId?: string
  },
) {
  const fetchMontadores = opts?.fetchMontadores ?? false
  const archiveFlag = opts?.archiveFlag
  const excluidoFlag = opts?.excluidoFlag
  const priorityColumnId = opts?.priorityColumnId
  const [items, setItems] = useState<KanbanItem[]>([])
  const [loading, setLoading] = useState(true)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [page, setPage] = useState(0)
  const [hasMore, setHasMore] = useState(true)
  const [usersMap, setUsersMap] = useState<Record<string, any>>({})
  const [allUsers, setAllUsers] = useState<any[]>([])
  const [allMontadores, setAllMontadores] = useState<any[]>([])
  const [allEquipe, setAllEquipe] = useState<any[]>([])
  const pageRef = useRef(0)

  useEffect(() => {
    pageRef.current = page
  }, [page])

  const columnsKey = JSON.stringify(columns)
  const channelName = `kanban_changes_${archiveFlag || excluidoFlag || 'default'}`

  const applyFilters = (q: any) => {
    if (archiveFlag) q = q.eq(archiveFlag as any, false)
    if (excluidoFlag) q = q.eq(excluidoFlag as any, false)
    return q
  }

  const fetchPriorityItems = useCallback(async (): Promise<KanbanItem[]> => {
    if (!priorityColumnId) return []
    let pq = supabase
      .from('produtos_servicos_projeto')
      .select(ITEM_SELECT)
      .eq('status_analise', priorityColumnId)
    pq = applyFilters(pq)
    const { data: pData, error: pErr } = await pq
      .order('criado_em', { ascending: false })
      .limit(500)
    if (pErr) throw pErr
    return (Array.isArray(pData) ? (pData as unknown as KanbanItem[]) : []).map(normalizeItem)
  }, [priorityColumnId, archiveFlag, excluidoFlag])

  const fetchItems = useCallback(
    async (isLoadMore = false) => {
      if (isLoadMore) setIsLoadingMore(true)
      else setLoading(true)
      setError(null)
      try {
        const paginatedColumnIds = priorityColumnId
          ? columns.filter((c) => c.id !== priorityColumnId).map((c) => c.id)
          : columns.map((c) => c.id)

        const currentPage = isLoadMore ? pageRef.current + 1 : 0
        const from = currentPage * PAGE_SIZE
        const to = from + PAGE_SIZE - 1

        let priorityItems: KanbanItem[] = []
        if (!isLoadMore) {
          priorityItems = await fetchPriorityItems()
        }

        if (fetchMontadores && !isLoadMore) {
          const [montRes, cltRes, pjRes, alocRes] = await Promise.all([
            supabase.from('montadores').select('*, alocacao_montagem(card_id)'),
            supabase
              .from('equipe_clt')
              .select('id, nome_completo, telefone, areas_atuacao, montador_id'),
            supabase
              .from('parceiros_pj')
              .select('id, razao_social, socio_nome, telefone, areas_atuacao, montador_id'),
            supabase
              .from('alocacao_montagem')
              .select(
                'card_id, montador_id, pessoa_id, tipo_origem, produtos_servicos_projeto(cliente_id)',
              ),
          ])

          const alocacoesList = Array.isArray(alocRes.data) ? alocRes.data : []

          if (Array.isArray(montRes.data)) {
            setAllMontadores(
              montRes.data
                .filter((m: any) => m && m.id)
                .map((m: any) => ({
                  ...m,
                  alocacao_montagem: Array.isArray(m?.alocacao_montagem) ? m.alocacao_montagem : [],
                })),
            )
          }

          // Monta lista unificada de membros CLT + PJ
          const membros: any[] = []
          const vistos = new Set<string>()

          if (Array.isArray(cltRes.data)) {
            cltRes.data.forEach((c) => {
              if (c?.id && c.nome_completo) {
                const key = `CLT-${c.id}`
                vistos.add(key)
                const cAlocs = alocacoesList.filter(
                  (a) => a.pessoa_id === c.id || a.montador_id === c.id,
                )
                membros.push({
                  id: c.id,
                  nome: c.nome_completo,
                  telefone: c.telefone,
                  tipo: 'CLT',
                  areas_atuacao: Array.isArray(c.areas_atuacao) ? c.areas_atuacao : [],
                  montador_id: (c as any).montador_id || null,
                  alocacoes: cAlocs,
                })
              }
            })
          }

          if (Array.isArray(pjRes.data)) {
            pjRes.data.forEach((p) => {
              const nome = p.socio_nome || p.razao_social
              if (p?.id && nome) {
                const key = `PJ-${p.id}`
                vistos.add(key)
                const pAlocs = alocacoesList.filter(
                  (a) => a.pessoa_id === p.id || a.montador_id === p.id,
                )
                membros.push({
                  id: p.id,
                  nome,
                  telefone: p.telefone,
                  tipo: 'PJ',
                  areas_atuacao: Array.isArray(p.areas_atuacao) ? p.areas_atuacao : [],
                  montador_id: (p as any).montador_id || null,
                  alocacoes: pAlocs,
                })
              }
            })
          }

          // Preserva montadores legados que possam não ter registro correspondente ainda
          if (Array.isArray(montRes.data)) {
            montRes.data.forEach((m) => {
              const jaExiste = membros.some(
                (mb) => mb.nome.trim().toLowerCase() === m.nome_completo.trim().toLowerCase(),
              )
              if (!jaExiste && m?.id && m.nome_completo) {
                const mAlocs = alocacoesList.filter(
                  (a) => a.montador_id === m.id || a.pessoa_id === m.id,
                )
                membros.push({
                  id: m.id,
                  nome: m.nome_completo,
                  telefone: m.telefone,
                  tipo: 'PJ',
                  areas_atuacao: ['montagem'],
                  montador_id: m.id,
                  alocacoes: mAlocs,
                })
              }
            })
          }

          membros.sort((a, b) => a.nome.localeCompare(b.nome))
          setAllEquipe(membros)
        }

        let query = supabase
          .from('produtos_servicos_projeto')
          .select(ITEM_SELECT, { count: 'exact' })
        if (paginatedColumnIds.length > 0) {
          query = query.in('status_analise', paginatedColumnIds)
        }
        query = applyFilters(query)
        query = query.order('criado_em', { ascending: false }).range(from, to)
        const { data, count, error: err } = await query
        if (err) throw err

        const validItems = (Array.isArray(data) ? (data as unknown as KanbanItem[]) : []).map(
          normalizeItem,
        )

        if (isLoadMore) {
          setItems((prev) => {
            const existingIds = new Set(prev.map((i) => i?.id).filter(Boolean))
            const newItems = validItems.filter((fi) => fi?.id && !existingIds.has(fi.id))
            return [...prev, ...newItems]
          })
          setPage(currentPage)
        } else {
          const merged = [...priorityItems, ...validItems]
          setItems(merged)
          setPage(0)
        }

        const totalCount = count ?? 0
        const totalLoaded = (currentPage + 1) * PAGE_SIZE
        if (validItems.length < PAGE_SIZE || totalLoaded >= totalCount) {
          setHasMore(false)
        } else {
          setHasMore(true)
        }
      } catch (err: any) {
        console.error('Erro ao carregar dados do Kanban:', err)
        setError(err.message || 'Erro ao carregar dados do Kanban.')
      } finally {
        setLoading(false)
        setIsLoadingMore(false)
      }
    },
    [columnsKey, fetchMontadores, archiveFlag, excluidoFlag, priorityColumnId, fetchPriorityItems],
  )

  const refreshItems = useCallback(async () => {
    try {
      const paginatedColumnIds = priorityColumnId
        ? columns.filter((c) => c.id !== priorityColumnId).map((c) => c.id)
        : columns.map((c) => c.id)

      const priorityItems = await fetchPriorityItems()

      const limit = (pageRef.current + 1) * PAGE_SIZE
      let query = supabase.from('produtos_servicos_projeto').select(ITEM_SELECT)
      if (paginatedColumnIds.length > 0) query = query.in('status_analise', paginatedColumnIds)
      query = applyFilters(query)
      query = query.order('criado_em', { ascending: false }).limit(Math.max(limit, PAGE_SIZE))
      const { data, error: err } = await query
      if (!err && data) {
        const normalized = (Array.isArray(data) ? (data as unknown as KanbanItem[]) : []).map(
          normalizeItem,
        )
        const merged = [...priorityItems, ...normalized]
        setItems(merged)
      }
    } catch (e) {
      console.error(e)
    }
  }, [columnsKey, archiveFlag, excluidoFlag, priorityColumnId, fetchPriorityItems])

  useEffect(() => {
    fetchItems()
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'produtos_servicos_projeto' },
        () => {
          refreshItems().catch((e) => console.error('Realtime refresh error:', e))
        },
      )
      .on('postgres_changes', { event: '*', schema: 'public', table: 'alocacao_montagem' }, () => {
        refreshItems().catch((e) => console.error('Realtime refresh error (alocacao):', e))
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'montadores' }, () => {
        refreshItems().catch((e) => console.error('Realtime refresh error (montadores):', e))
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'equipe_clt' }, () => {
        refreshItems().catch((e) => console.error('Realtime refresh error (equipe_clt):', e))
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'parceiros_pj' }, () => {
        refreshItems().catch((e) => console.error('Realtime refresh error (parceiros_pj):', e))
      })
      .subscribe()
    const handleUpdate = () => refreshItems()
    window.addEventListener('kanban_updated', handleUpdate)
    return () => {
      supabase.removeChannel(channel)
      window.removeEventListener('kanban_updated', handleUpdate)
    }
  }, [fetchItems, refreshItems, channelName])

  useEffect(() => {
    const fetchUsers = async () => {
      const { data } = await supabase
        .from('users')
        .select('id, nome, foto_perfil')
        .eq('status', true)
        .order('nome')
      if (Array.isArray(data)) {
        const map: Record<string, any> = {}
        data.forEach((u) => {
          map[u.id] = u
        })
        setUsersMap(map)
        setAllUsers(data)
      }
    }
    fetchUsers()
  }, [])

  return {
    items,
    setItems,
    loading,
    isLoadingMore,
    error,
    page,
    hasMore,
    usersMap,
    allUsers,
    allMontadores,
    allEquipe,
    setAllEquipe,
    fetchItems,
    refreshItems,
  }
}
