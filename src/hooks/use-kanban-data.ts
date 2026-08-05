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
  alocacao_montagem?: { montador_id: string }[]
  terceirizado_validado?: boolean
  outsourced_checked?: boolean
  is_outsourced?: boolean
}

export interface KanbanColumnDef {
  id: string
  title: string
}

const PAGE_SIZE = 30

const ITEM_SELECT = `
  id, nome_produto, codigo_rastreio, qtd, status_analise, criado_em,
  analista_id, cliente_id, terceirizado_validado, outsourced_checked, is_outsourced,
  cliente:clientes(nome),
  formulario:formulario_comercial(user_id, nome_cliente, cliente:clientes(nome)),
  alocacao_montagem(montador_id)
`

export function getClienteNome(item: any): string | null {
  if (!item) return null
  const nome = Array.isArray(item?.cliente) ? item.cliente[0]?.nome : item?.cliente?.nome
  if (nome) return nome
  if (item?.formulario) {
    const form = Array.isArray(item.formulario) ? item.formulario[0] : item.formulario
    const formCli = Array.isArray(form?.cliente) ? form.cliente[0]?.nome : form?.cliente?.nome
    if (formCli) return formCli
    if (form?.nome_cliente) return form.nome_cliente
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
    }
  }
  const cliente = Array.isArray(item?.cliente) ? (item.cliente[0] ?? null) : (item?.cliente ?? null)
  const formularioRaw = Array.isArray(item?.formulario)
    ? (item.formulario[0] ?? null)
    : (item?.formulario ?? null)
  const formulario = formularioRaw
    ? {
        user_id: formularioRaw.user_id ?? '',
        nome_cliente: formularioRaw.nome_cliente ?? null,
        cliente: Array.isArray(formularioRaw.cliente)
          ? (formularioRaw.cliente[0] ?? null)
          : (formularioRaw.cliente ?? null),
      }
    : null
  return {
    ...item,
    alocacao_montagem: Array.isArray(item?.alocacao_montagem) ? item.alocacao_montagem : [],
    cliente,
    formulario,
    status_analise: item?.status_analise ?? null,
    nome_produto: item?.nome_produto ?? '',
    qtd: item?.qtd ?? 0,
    codigo_rastreio: item?.codigo_rastreio ?? null,
    analista_id: item?.analista_id ?? null,
    criado_em: item?.criado_em ?? '',
    cliente_id: item?.cliente_id ?? null,
    terceirizado_validado: item?.terceirizado_validado ?? false,
    outsourced_checked: item?.outsourced_checked ?? false,
    is_outsourced: item?.is_outsourced ?? false,
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

  const fetchItems = useCallback(
    async (isLoadMore = false) => {
      if (isLoadMore) setIsLoadingMore(true)
      else setLoading(true)
      setError(null)
      try {
        const columnIds = columns.map((c) => c.id)
        const currentPage = isLoadMore ? pageRef.current + 1 : 0
        const from = currentPage * PAGE_SIZE
        const to = from + PAGE_SIZE - 1

        let priorityItems: KanbanItem[] = []
        if (priorityColumnId) {
          let pq = supabase
            .from('produtos_servicos_projeto')
            .select(ITEM_SELECT)
            .eq('status_analise', priorityColumnId)
          pq = applyFilters(pq)
          const { data: pData, error: pErr } = await pq
            .order('criado_em', { ascending: false })
            .limit(500)
          if (pErr) throw pErr
          priorityItems = (Array.isArray(pData) ? (pData as unknown as KanbanItem[]) : []).map(
            normalizeItem,
          )
        }

        let query = supabase
          .from('produtos_servicos_projeto')
          .select(ITEM_SELECT, { count: 'exact' })
        if (columnIds.length > 0) query = query.in('status_analise', columnIds)
        query = applyFilters(query)
        query = query.order('criado_em', { ascending: false }).range(from, to)
        const { data, count, error: err } = await query
        if (err) throw err

        if (fetchMontadores && !isLoadMore) {
          const { data: montData } = await supabase
            .from('montadores')
            .select('*, alocacao_montagem(card_id, produtos_servicos_projeto(cliente_id))')
          if (Array.isArray(montData)) {
            setAllMontadores(
              montData
                .filter((m: any) => m && m.id)
                .map((m: any) => ({
                  ...m,
                  alocacao_montagem: Array.isArray(m?.alocacao_montagem) ? m.alocacao_montagem : [],
                })),
            )
          }
        }

        const validItems = (Array.isArray(data) ? (data as unknown as KanbanItem[]) : []).map(
          normalizeItem,
        )
        const merged = [...priorityItems, ...validItems].filter(
          (item, idx, arr) => arr.findIndex((i) => i?.id === item?.id) === idx,
        )

        if (isLoadMore) {
          setItems((prev) => [
            ...prev,
            ...merged.filter((fi) => !prev.some((pi) => pi?.id === fi.id)),
          ])
          setPage(currentPage)
        } else {
          setItems(merged)
          setPage(0)
        }

        if (count !== null && to + 1 >= count) setHasMore(false)
        else if (validItems.length < PAGE_SIZE) setHasMore(false)
        else setHasMore(true)
      } catch (err: any) {
        console.error('Erro ao carregar dados do Kanban:', err)
        setError(err.message || 'Erro ao carregar dados do Kanban.')
      } finally {
        setLoading(false)
        setIsLoadingMore(false)
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [columnsKey, fetchMontadores, archiveFlag, excluidoFlag, priorityColumnId],
  )

  const refreshItems = useCallback(async () => {
    try {
      const columnIds = columns.map((c) => c.id)
      const limit = (pageRef.current + 1) * PAGE_SIZE

      let priorityItems: KanbanItem[] = []
      if (priorityColumnId) {
        let pq = supabase
          .from('produtos_servicos_projeto')
          .select(ITEM_SELECT)
          .eq('status_analise', priorityColumnId)
        pq = applyFilters(pq)
        const { data: pData } = await pq.order('criado_em', { ascending: false }).limit(500)
        priorityItems = (Array.isArray(pData) ? (pData as unknown as KanbanItem[]) : []).map(
          normalizeItem,
        )
      }

      let query = supabase.from('produtos_servicos_projeto').select(ITEM_SELECT)
      if (columnIds.length > 0) query = query.in('status_analise', columnIds)
      query = applyFilters(query)
      query = query.order('criado_em', { ascending: false }).limit(Math.max(limit, PAGE_SIZE))
      const { data, error: err } = await query
      if (!err && data) {
        const normalized = (Array.isArray(data) ? (data as unknown as KanbanItem[]) : []).map(
          normalizeItem,
        )
        const merged = [...priorityItems, ...normalized].filter(
          (item, idx, arr) => arr.findIndex((i) => i?.id === item?.id) === idx,
        )
        setItems(merged)
      }
    } catch (e) {
      console.error(e)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [columnsKey, archiveFlag, excluidoFlag, priorityColumnId])

  useEffect(() => {
    fetchItems()
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'produtos_servicos_projeto' },
        () => {
          try {
            refreshItems()
          } catch (e) {
            console.error('Realtime refresh error:', e)
          }
        },
      )
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
    fetchItems,
    refreshItems,
  }
}
