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

export function useKanbanData(
  columns: KanbanColumnDef[],
  opts?: { fetchMontadores?: boolean; archiveFlag?: string },
) {
  const fetchMontadores = opts?.fetchMontadores ?? false
  const archiveFlag = opts?.archiveFlag
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
        let query = supabase
          .from('produtos_servicos_projeto')
          .select(ITEM_SELECT, { count: 'exact' })
        if (columnIds.length > 0) query = query.in('status_analise', columnIds)
        if (archiveFlag) query = query.eq(archiveFlag as any, false)
        query = query.order('criado_em', { ascending: false }).range(from, to)
        const { data, count, error: err } = await query
        if (err) throw err

        if (fetchMontadores && !isLoadMore) {
          const { data: montData } = await supabase
            .from('montadores')
            .select('*, alocacao_montagem(card_id, produtos_servicos_projeto(cliente_id))')
          if (montData) setAllMontadores(montData)
        }

        const validItems = (data as unknown as KanbanItem[]) || []
        if (isLoadMore) {
          setItems((prev) => [
            ...prev,
            ...validItems.filter((fi) => !prev.some((pi) => pi?.id === fi.id)),
          ])
          setPage(currentPage)
        } else {
          setItems(validItems)
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
    [columnsKey, fetchMontadores],
  )

  const refreshItems = useCallback(async () => {
    try {
      const columnIds = columns.map((c) => c.id)
      let query = supabase.from('produtos_servicos_projeto').select(ITEM_SELECT)
      if (columnIds.length > 0) query = query.in('status_analise', columnIds)
      if (archiveFlag) query = query.eq(archiveFlag as any, false)
      query = query.order('criado_em', { ascending: false })
      const limit = (pageRef.current + 1) * PAGE_SIZE
      const { data, error: err } = await query.limit(limit)
      if (!err && data) setItems(data as unknown as KanbanItem[])
    } catch (e) {
      console.error(e)
    }
  }, [columnsKey])

  useEffect(() => {
    fetchItems()
    const channel = supabase
      .channel('kanban_changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'produtos_servicos_projeto' },
        () => refreshItems(),
      )
      .subscribe()
    const handleUpdate = () => refreshItems()
    window.addEventListener('kanban_updated', handleUpdate)
    return () => {
      supabase.removeChannel(channel)
      window.removeEventListener('kanban_updated', handleUpdate)
    }
  }, [fetchItems, refreshItems])

  useEffect(() => {
    const fetchUsers = async () => {
      const { data } = await supabase
        .from('users')
        .select('id, nome, foto_perfil')
        .eq('status', true)
        .order('nome')
      if (data) {
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
