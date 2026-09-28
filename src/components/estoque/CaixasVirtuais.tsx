import { useState, useEffect, useMemo } from 'react'
import { supabase } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Plus,
  PackageOpen,
  Check,
  Trash2,
  Link2,
  UserRound,
  Search,
  ChevronDown,
  ChevronUp,
  PackageCheck,
  Boxes,
  Calendar,
  Layers,
  ShieldCheck,
} from 'lucide-react'
import { maskCpf } from '@/lib/cpf'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { useToast } from '@/hooks/use-toast'
import { Badge } from '@/components/ui/badge'
import { ItemSearchModal, type InventoryItem } from '@/components/estoque/ItemSearchModal'

interface CaixaItemData {
  id: string
  caixa_id: string
  item_id: string
  quantidade: number
  status: string
  item?: {
    nome: string
    unidade: string
  }
}

interface CaixaData {
  id: string
  nome: string
  status: string
  cliente_id?: string
  recebedor_nome?: string | null
  recebedor_cpf?: string | null
  comprovante_url?: string | null
  assinado_em?: string | null
  criado_em?: string
  cliente?: {
    nome: string
  } | null
  itens: CaixaItemData[]
}

export function CaixasVirtuais() {
  const [caixas, setCaixas] = useState<CaixaData[]>([])
  const [clientes, setClientes] = useState<any[]>([])
  const [activeTab, setActiveTab] = useState<'abertas' | 'entregues'>('abertas')

  // Controle de caixas expandidas (abertas no clique) — permite abrir/fechar caixas na aba Abertas
  const [expandedCaixas, setExpandedCaixas] = useState<Record<string, boolean>>({})

  // Modais
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isItemModalOpen, setIsItemModalOpen] = useState(false)
  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false)
  const [selectedCaixa, setSelectedCaixa] = useState<CaixaData | null>(null)

  const [novaCaixa, setNovaCaixa] = useState({ nome: '', cliente_id: '' })
  const [novoItem, setNovoItem] = useState<{
    item_id: string
    quantidade: number
    nome?: string
    unidade?: string
    disponivel?: number
  }>({ item_id: '', quantidade: 1 })

  const { toast } = useToast()

  useEffect(() => {
    fetchCaixas()
    fetchClientes()
  }, [])

  async function fetchCaixas() {
    const { data } = await supabase
      .from('estoque_caixas' as any)
      .select(
        '*, cliente:clientes(nome), itens:estoque_caixas_itens(*, item:estoque_itens(nome, unidade))',
      )
      .order('criado_em', { ascending: false })
    if (data) {
      setCaixas(data as unknown as CaixaData[])
    }
  }

  async function fetchClientes() {
    const { data } = await supabase
      .from('clientes' as any)
      .select('id, nome')
      .order('nome')
    if (data) setClientes(data)
  }

  // Caixas abertas (em separação) vs Entregues (histórico)
  const caixasAbertas = useMemo(() => caixas.filter((c) => c.status !== 'entregue'), [caixas])
  const caixasEntregues = useMemo(() => caixas.filter((c) => c.status === 'entregue'), [caixas])

  const toggleExpand = (id: string) => {
    setExpandedCaixas((prev) => ({
      ...prev,
      [id]: !prev[id],
    }))
  }

  async function handleCriarCaixa() {
    if (!novaCaixa.nome.trim() || !novaCaixa.cliente_id) {
      return toast({ title: 'Preencha todos os campos', variant: 'destructive' })
    }
    const { data, error } = await supabase
      .from('estoque_caixas' as any)
      .insert({
        nome: novaCaixa.nome.trim(),
        cliente_id: novaCaixa.cliente_id,
        status: 'separacao',
      })
      .select()

    if (error) {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' })
    } else {
      toast({ title: 'Caixa criada com sucesso!' })
      setIsModalOpen(false)
      setNovaCaixa({ nome: '', cliente_id: '' })
      // Expandir a recém-criada automaticamente
      if (data && data.length > 0) {
        setExpandedCaixas((prev) => ({ ...prev, [data[0].id]: true }))
      }
      fetchCaixas()
    }
  }

  async function handleAdicionarItem() {
    if (!selectedCaixa) return
    if (!novoItem.item_id || novoItem.quantidade <= 0) {
      return toast({ title: 'Dados inválidos', variant: 'destructive' })
    }

    if (novoItem.disponivel !== undefined && novoItem.quantidade > novoItem.disponivel) {
      return toast({
        title: 'Quantidade indisponível',
        description: `Temos apenas ${novoItem.disponivel} ${novoItem.unidade || ''} em estoque.`,
        variant: 'destructive',
      })
    }

    // Se já estiver na caixa com status 'reservado', somar
    const itemExistente = selectedCaixa.itens?.find(
      (i) => i.item_id === novoItem.item_id && i.status === 'reservado',
    )

    if (itemExistente) {
      const novaQtd = Number(itemExistente.quantidade) + Number(novoItem.quantidade)
      const { error } = await supabase
        .from('estoque_caixas_itens' as any)
        .update({ quantidade: novaQtd })
        .eq('id', itemExistente.id)

      if (error) {
        toast({ title: 'Erro ao somar item', description: error.message, variant: 'destructive' })
      } else {
        toast({
          title: 'Item já estava na caixa — quantidade somada',
          description: `Nova quantidade: ${novaQtd} ${novoItem.unidade || 'un'}.`,
        })
        setIsItemModalOpen(false)
        setNovoItem({ item_id: '', quantidade: 1 })
        fetchCaixas()
      }
    } else {
      const { error } = await supabase.from('estoque_caixas_itens' as any).insert({
        caixa_id: selectedCaixa.id,
        item_id: novoItem.item_id,
        quantidade: novoItem.quantidade,
        status: 'reservado',
      })

      if (error) {
        toast({ title: 'Erro', description: error.message, variant: 'destructive' })
      } else {
        toast({ title: 'Item adicionado à caixa!' })
        setIsItemModalOpen(false)
        setNovoItem({ item_id: '', quantidade: 1 })
        fetchCaixas()
      }
    }
  }

  function handleSelectItem(item: InventoryItem) {
    setNovoItem({
      item_id: item.id,
      quantidade: 1,
      nome: item.nome,
      unidade: item.unidade,
      disponivel: Number(item.quantidade || 0),
    })
    setIsSearchModalOpen(false)
    if (!isItemModalOpen) {
      setIsItemModalOpen(true)
    }
  }

  async function handleDeletarCaixa(caixaId: string) {
    if (
      !confirm(
        'Tem certeza que deseja apagar esta caixa? Todos os materiais reservados voltarão ao estoque livre.',
      )
    )
      return

    const { error } = await supabase
      .from('estoque_caixas' as any)
      .delete()
      .eq('id', caixaId)

    if (error) {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' })
    } else {
      toast({ title: 'Caixa apagada', description: 'Itens retornados ao estoque.' })
      fetchCaixas()
    }
  }

  async function handleEntregarCaixa(caixaId: string) {
    if (!confirm('Confirmar o fechamento e a entrega de todos os itens desta caixa?')) return

    const caixa = caixas.find((c) => c.id === caixaId)
    if (!caixa) return
    const itensPendentes = (caixa.itens || []).filter((i: any) => i.status === 'reservado')

    for (const item of itensPendentes) {
      await supabase
        .from('estoque_caixas_itens' as any)
        .update({ status: 'entregue' })
        .eq('id', item.id)
      await supabase.from('estoque_movimentacoes' as any).insert({
        item_id: item.item_id,
        tipo: 'Saída',
        quantidade: item.quantidade,
      })
    }

    await supabase
      .from('estoque_caixas' as any)
      .update({ status: 'entregue' })
      .eq('id', caixaId)

    toast({
      title: 'Caixa fechada e entregue!',
      description:
        'A baixa no estoque foi concluída e a caixa foi movida para o histórico de Entregues.',
    })

    // Remove do estado expandido e atualiza listagem
    setExpandedCaixas((prev) => {
      const next = { ...prev }
      delete next[caixaId]
      return next
    })
    await fetchCaixas()
    // Alterna visualmente para a aba Entregues ou mantém o usuário informado
  }

  return (
    <div className="space-y-6">
      {/* Header com título, descrição e botão Nova Caixa */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-midnight-navy dark:text-slate-100 flex items-center gap-2">
            <span>📦</span> Caixas Virtuais (Separação)
          </h2>
          <p className="text-gray-500 dark:text-slate-400 text-sm">
            Separe os materiais para cada cliente e execute a baixa ao fechar e entregar.
          </p>
        </div>
        <Button
          onClick={() => setIsModalOpen(true)}
          className="bg-steel-blue hover:bg-dark-denim dark:bg-blue-600 dark:hover:bg-blue-700 dark:text-white w-full sm:w-auto shadow-sm"
        >
          <PackageOpen className="w-4 h-4 mr-2" />
          Nova Caixa
        </Button>
      </div>

      {/* Sub-abas / Segmentos: Abertas (Padrão) vs Entregues (Histórico) */}
      <Tabs
        value={activeTab}
        onValueChange={(val) => setActiveTab(val as 'abertas' | 'entregues')}
        className="w-full space-y-4"
      >
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-border pb-2">
          <TabsList className="bg-muted p-1">
            <TabsTrigger value="abertas" className="flex items-center gap-2 text-xs sm:text-sm">
              <span className="text-base">📦</span>
              <span>Abertas (Em Separação)</span>
              <Badge
                variant="secondary"
                className={`ml-1 text-[11px] px-1.5 py-0 h-5 font-bold ${
                  caixasAbertas.length > 0
                    ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                    : 'bg-muted-foreground/10 text-muted-foreground'
                }`}
              >
                {caixasAbertas.length}
              </Badge>
            </TabsTrigger>
            <TabsTrigger value="entregues" className="flex items-center gap-2 text-xs sm:text-sm">
              <PackageCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <span>Entregues (Histórico)</span>
              <Badge
                variant="secondary"
                className="ml-1 text-[11px] px-1.5 py-0 h-5 font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300"
              >
                {caixasEntregues.length}
              </Badge>
            </TabsTrigger>
          </TabsList>

          <div className="text-xs text-muted-foreground">
            {activeTab === 'abertas' ? (
              <span>Clique na caixa para expandir/recolher seus itens e gerenciá-la.</span>
            ) : (
              <span>Histórico de caixas concluídas com comprovante de entrega e recebedor.</span>
            )}
          </div>
        </div>

        {/* SUB-ABA 1: CAIXAS ABERTAS (EM SEPARAÇÃO) */}
        <TabsContent value="abertas" className="m-0 space-y-4">
          {caixasAbertas.length === 0 ? (
            <div className="py-16 text-center text-gray-500 dark:text-slate-400 border-2 border-dashed border-border dark:border-slate-800 rounded-2xl bg-card/40 p-8">
              <div className="text-5xl mb-3">📦</div>
              <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200">
                Nenhuma caixa em separação no momento
              </h3>
              <p className="text-sm text-muted-foreground max-w-md mx-auto mt-1 mb-5">
                Todas as caixas anteriores já foram entregues ou ainda não foram criadas. Clique no
                botão abaixo para iniciar uma nova separação.
              </p>
              <Button
                onClick={() => setIsModalOpen(true)}
                className="bg-steel-blue hover:bg-dark-denim dark:bg-blue-600 dark:hover:bg-blue-700 text-white"
              >
                <Plus className="w-4 h-4 mr-2" />
                Criar Nova Caixa
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {caixasAbertas.map((caixa) => {
                const isExpanded = !!expandedCaixas[caixa.id]
                const totalItens = (caixa.itens || []).length
                const totalQtd = (caixa.itens || []).reduce(
                  (acc, i) => acc + Number(i.quantidade || 0),
                  0,
                )

                return (
                  <Card
                    key={caixa.id}
                    className={`transition-all duration-200 border-2 rounded-xl shadow-sm ${
                      isExpanded
                        ? 'border-amber-400 bg-amber-50/20 dark:border-amber-600/60 dark:bg-amber-950/20 shadow-md ring-1 ring-amber-400/30'
                        : 'border-slate-200 hover:border-amber-300 dark:border-slate-800 dark:hover:border-amber-700 bg-card'
                    }`}
                  >
                    {/* Header estilo Caixa Aberta: Emoji 📦 em destaque + Nome do Cliente na frente + Identificação */}
                    <div
                      role="button"
                      tabIndex={0}
                      onClick={() => toggleExpand(caixa.id)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault()
                          toggleExpand(caixa.id)
                        }
                      }}
                      className="cursor-pointer p-4 pb-3 select-none transition-colors hover:bg-muted/40 rounded-t-xl"
                      title="Clique para abrir/expandir a caixa"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-3 min-w-0">
                          {/* Ícone de caixa aberta com visual destacado */}
                          <div className="relative shrink-0 flex items-center justify-center w-12 h-12 rounded-xl bg-amber-100 border border-amber-300 dark:bg-amber-950/50 dark:border-amber-800 text-2xl shadow-inner">
                            <span className="transform hover:scale-110 transition-transform">
                              📦
                            </span>
                            <span className="absolute -top-1 -right-1 w-3 h-3 bg-amber-500 rounded-full border-2 border-white dark:border-slate-900 animate-pulse" />
                          </div>

                          <div className="min-w-0">
                            {/* NOME DO CLIENTE EM DESTAQUE NA FRENTE */}
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs font-semibold uppercase tracking-wider text-amber-700 dark:text-amber-400">
                                Cliente
                              </span>
                            </div>
                            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 truncate leading-snug">
                              {caixa.cliente?.nome || 'Cliente não identificado'}
                            </h3>

                            {/* Identificação / Nome da Caixa */}
                            <p className="text-xs text-muted-foreground truncate mt-0.5 flex items-center gap-1">
                              <span className="font-semibold text-slate-700 dark:text-slate-300">
                                Caixa:
                              </span>{' '}
                              <span>{caixa.nome}</span>
                            </p>
                          </div>
                        </div>

                        {/* Badges e Chevron de expansão */}
                        <div className="flex flex-col items-end gap-1.5 shrink-0">
                          <Badge
                            variant="secondary"
                            className="bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200 dark:border-amber-800/50 font-semibold text-[11px]"
                          >
                            EM SEPARAÇÃO
                          </Badge>
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <span>
                              {totalItens} {totalItens === 1 ? 'item' : 'itens'}
                            </span>
                            {isExpanded ? (
                              <ChevronUp className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                            ) : (
                              <ChevronDown className="w-4 h-4 text-slate-400" />
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Resumo compacto quando fechada */}
                      {!isExpanded && (
                        <div className="mt-3 pt-2.5 border-t border-dashed border-border/80 flex items-center justify-between text-xs text-muted-foreground">
                          <span className="truncate">
                            {totalItens > 0
                              ? `${totalQtd} unid. reservada(s)`
                              : 'Caixa vazia — clique para adicionar'}
                          </span>
                          <span className="text-[11px] font-medium text-amber-700 dark:text-amber-400 hover:underline">
                            Abrir caixa →
                          </span>
                        </div>
                      )}
                    </div>

                    {/* CONTEÚDO EXPANDIDO (AO CLICAR NA CAIXA) */}
                    {isExpanded && (
                      <div className="border-t border-border/80">
                        {/* Ações rápidas superiores */}
                        <div className="px-4 py-2 bg-muted/30 border-b border-border/50 flex items-center justify-between text-xs">
                          <span className="text-muted-foreground font-medium flex items-center gap-1.5">
                            <Boxes className="w-3.5 h-3.5 text-steel-blue" />
                            Itens dentro da caixa:
                          </span>
                          <div className="flex items-center gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 text-xs px-2 text-steel-blue hover:bg-steel-blue/10 dark:text-blue-400"
                              onClick={(e) => {
                                e.stopPropagation()
                                const link = `${window.location.origin}/recebimento-caixa/${caixa.id}`
                                navigator.clipboard.writeText(link)
                                toast({
                                  title: 'Link copiado!',
                                  description:
                                    'Link de recebimento copiado para a área de transferência.',
                                })
                              }}
                              title="Copiar Link de Recebimento com assinatura"
                            >
                              <Link2 className="w-3.5 h-3.5 mr-1" />
                              Link
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 text-xs px-2 text-red-600 hover:text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/50"
                              onClick={(e) => {
                                e.stopPropagation()
                                handleDeletarCaixa(caixa.id)
                              }}
                              title="Apagar caixa e retornar itens livres ao estoque"
                            >
                              <Trash2 className="w-3.5 h-3.5 mr-1" />
                              Apagar
                            </Button>
                          </div>
                        </div>

                        {/* Lista de Itens */}
                        <CardContent className="pt-3 pb-3 px-4">
                          <div className="space-y-3">
                            <div className="flex justify-between items-center">
                              <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                                Conteúdo ({totalItens})
                              </h4>
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-7 text-xs px-2.5 text-steel-blue hover:text-dark-denim border-steel-blue/30 dark:text-blue-400"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  setSelectedCaixa(caixa)
                                  setIsItemModalOpen(true)
                                }}
                              >
                                <Plus className="w-3 h-3 mr-1" /> Adicionar Item
                              </Button>
                            </div>

                            {totalItens === 0 ? (
                              <div className="py-6 text-center text-xs text-muted-foreground italic border border-dashed border-border rounded-lg bg-card/60">
                                <p>Esta caixa está vazia.</p>
                                <p className="mt-1">
                                  Use o botão acima ou o menu ⋮ no estoque para colocar itens nela.
                                </p>
                              </div>
                            ) : (
                              <ul className="space-y-1.5 max-h-56 overflow-y-auto pr-0.5">
                                {caixa.itens.map((item) => (
                                  <li
                                    key={item.id}
                                    className="flex justify-between items-center text-xs p-2 rounded-lg bg-card border border-border/80 shadow-xs"
                                  >
                                    <div className="min-w-0 pr-2">
                                      <p className="font-medium text-slate-800 dark:text-slate-200 truncate">
                                        {item.item?.nome || 'Item do estoque'}
                                      </p>
                                    </div>
                                    <div className="flex items-center gap-1.5 shrink-0">
                                      <Badge
                                        variant="outline"
                                        className="font-mono text-[11px] bg-muted/60"
                                      >
                                        {item.quantidade} {item.item?.unidade || 'un'}
                                      </Badge>
                                    </div>
                                  </li>
                                ))}
                              </ul>
                            )}
                          </div>
                        </CardContent>

                        {/* Botão Fechar e Entregar: executa baixa e move para Entregues */}
                        <CardFooter className="pt-2 pb-4 px-4 border-t border-border/60 bg-muted/20">
                          <Button
                            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs font-medium"
                            disabled={totalItens === 0}
                            onClick={(e) => {
                              e.stopPropagation()
                              handleEntregarCaixa(caixa.id)
                            }}
                          >
                            <Check className="w-4 h-4 mr-2" /> Fechar e Entregar Caixa
                          </Button>
                        </CardFooter>
                      </div>
                    )}
                  </Card>
                )
              })}
            </div>
          )}
        </TabsContent>

        {/* SUB-ABA 2: CAIXAS ENTREGUES (HISTÓRICO) */}
        <TabsContent value="entregues" className="m-0 space-y-4">
          {caixasEntregues.length === 0 ? (
            <div className="py-16 text-center text-gray-500 dark:text-slate-400 border-2 border-dashed border-border dark:border-slate-800 rounded-2xl bg-card/40 p-8">
              <PackageCheck className="w-12 h-12 mx-auto text-emerald-500/50 mb-3" />
              <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200">
                Nenhuma caixa entregue registrada
              </h3>
              <p className="text-sm text-muted-foreground max-w-md mx-auto mt-1">
                Conforme as caixas forem finalizadas e entregues na obra ou ao cliente, o histórico
                completo com dados de recebedor e CPF será arquivado aqui.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {caixasEntregues.map((caixa) => {
                const totalItens = (caixa.itens || []).length
                const totalQtd = (caixa.itens || []).reduce(
                  (acc, i) => acc + Number(i.quantidade || 0),
                  0,
                )

                return (
                  <Card
                    key={caixa.id}
                    className="border border-emerald-200/70 bg-emerald-50/20 dark:border-emerald-900/50 dark:bg-emerald-950/20 rounded-xl overflow-hidden shadow-xs"
                  >
                    <CardHeader className="p-3.5 pb-2 bg-emerald-50/40 dark:bg-emerald-950/40 border-b border-emerald-100 dark:border-emerald-900/40">
                      <div className="flex items-start justify-between gap-2">
                        {/* Ícone de caixa FECHADA pequeno */}
                        <div className="flex items-start gap-2.5 min-w-0">
                          <div className="shrink-0 flex items-center justify-center w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-950/70 border border-emerald-300 dark:border-emerald-800 text-sm shadow-xs">
                            <span title="Caixa Fechada e Entregue">📦🔒</span>
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
                                Cliente
                              </span>
                            </div>
                            <h4 className="text-sm font-bold text-slate-800 dark:text-slate-100 truncate">
                              {caixa.cliente?.nome || 'Cliente não identificado'}
                            </h4>
                            <p className="text-xs text-muted-foreground truncate">{caixa.nome}</p>
                          </div>
                        </div>

                        <Badge
                          variant="outline"
                          className="text-[10px] uppercase font-bold text-emerald-700 border-emerald-300 bg-emerald-100/70 dark:text-emerald-300 dark:border-emerald-800 dark:bg-emerald-950 px-2 py-0.5"
                        >
                          ENTREGUE
                        </Badge>
                      </div>
                    </CardHeader>

                    <CardContent className="p-3.5 space-y-2.5 text-xs">
                      {/* Dados de recebedor e CPF existentes mantidos fielmente */}
                      {caixa.recebedor_nome ? (
                        <div className="flex items-center gap-2 p-2 rounded-md bg-white dark:bg-slate-900/60 border border-emerald-200/80 dark:border-emerald-900 text-emerald-800 dark:text-emerald-300">
                          <UserRound className="w-3.5 h-3.5 shrink-0 text-emerald-600 dark:text-emerald-400" />
                          <span className="truncate text-[11px] font-medium">
                            Recebido por: <strong>{caixa.recebedor_nome}</strong>
                            {caixa.recebedor_cpf && ` · CPF: ${maskCpf(caixa.recebedor_cpf)}`}
                          </span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground italic px-1">
                          <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
                          <span>Baixa confirmada sem recebedor assinado</span>
                        </div>
                      )}

                      {/* Lista resumida de itens entregues */}
                      <div className="pt-1 border-t border-border/40">
                        <div className="flex justify-between items-center text-[11px] text-muted-foreground mb-1.5 font-medium">
                          <span>Itens entregues ({totalItens}):</span>
                          <span>Total: {totalQtd} unid.</span>
                        </div>
                        <ul className="space-y-1 max-h-36 overflow-y-auto pr-0.5">
                          {(caixa.itens || []).map((item) => (
                            <li
                              key={item.id}
                              className="flex justify-between items-center text-[11px] py-1 px-1.5 rounded bg-muted/40"
                            >
                              <span className="truncate pr-2 text-slate-700 dark:text-slate-300">
                                {item.item?.nome || 'Item entregue'}
                              </span>
                              <span className="font-mono text-muted-foreground shrink-0">
                                {item.quantidade} {item.item?.unidade || 'un'}
                              </span>
                            </li>
                          ))}
                        </ul>
                      </div>

                      {/* Metadados: Data e Ação de ver comprovante */}
                      <div className="pt-2 border-t border-border/40 flex items-center justify-between text-[11px] text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {caixa.criado_em
                            ? new Date(caixa.criado_em).toLocaleDateString('pt-BR')
                            : '-'}
                        </span>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 text-[11px] px-2 text-steel-blue hover:text-dark-denim dark:text-blue-400"
                          onClick={() => {
                            const link = `${window.location.origin}/recebimento-caixa/${caixa.id}`
                            window.open(link, '_blank')
                          }}
                        >
                          <Link2 className="w-3 h-3 mr-1" />
                          Ver Comprovante
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* DIÁLOGO: NOVA CAIXA VIRTUAL */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <span>📦</span> Nova Caixa Virtual
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Nome da Caixa (Ex: Cozinha Sr. João / Ferragens)</Label>
              <Input
                value={novaCaixa.nome}
                onChange={(e) => setNovaCaixa({ ...novaCaixa, nome: e.target.value })}
                placeholder="Ex: Armários da Cozinha - Lote 1"
              />
            </div>
            <div className="space-y-2">
              <Label>Cliente *</Label>
              <Select
                value={novaCaixa.cliente_id}
                onValueChange={(v) => setNovaCaixa({ ...novaCaixa, cliente_id: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o cliente..." />
                </SelectTrigger>
                <SelectContent className="max-h-60">
                  {clientes.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsModalOpen(false)}>
              Cancelar
            </Button>
            <Button
              onClick={handleCriarCaixa}
              className="bg-steel-blue text-white hover:bg-dark-denim dark:bg-blue-600 dark:hover:bg-blue-700"
            >
              Criar Caixa
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODAL DE BUSCA DE ITEM NO ESTOQUE */}
      <ItemSearchModal
        open={isSearchModalOpen}
        onOpenChange={setIsSearchModalOpen}
        onSelect={handleSelectItem}
        title="Buscar Item para a Caixa"
      />

      {/* DIÁLOGO: ADICIONAR ITEM À CAIXA (Aba Separação) */}
      <Dialog open={isItemModalOpen} onOpenChange={setIsItemModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Layers className="w-5 h-5 text-steel-blue" />
              Adicionar Item à Caixa: {selectedCaixa?.nome}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Item do Estoque</Label>
              {novoItem.item_id && novoItem.nome ? (
                <div className="flex items-center justify-between gap-2 rounded-md border border-border bg-muted px-3 py-2">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-800 dark:text-slate-200 truncate">
                      {novoItem.nome}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-slate-400">
                      Unidade: {novoItem.unidade || '-'} · Disponível: {novoItem.disponivel ?? 0}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-steel-blue dark:text-blue-400"
                    onClick={() => {
                      setNovoItem({ item_id: '', quantidade: 1 })
                      setIsSearchModalOpen(true)
                    }}
                  >
                    <Search className="w-4 h-4 mr-1" /> Trocar
                  </Button>
                </div>
              ) : (
                <Button
                  variant="outline"
                  className="w-full justify-start text-muted-foreground"
                  onClick={() => setIsSearchModalOpen(true)}
                >
                  <Search className="w-4 h-4 mr-2" />
                  Buscar item no estoque...
                </Button>
              )}
            </div>
            <div className="space-y-2">
              <Label>Quantidade</Label>
              <Input
                type="number"
                step="0.01"
                min="0.01"
                value={novoItem.quantidade}
                onChange={(e) => setNovoItem({ ...novoItem, quantidade: Number(e.target.value) })}
              />
              {novoItem.disponivel !== undefined && (
                <p className="text-xs text-gray-400 dark:text-slate-500">
                  Disponível em estoque: {novoItem.disponivel} {novoItem.unidade || ''}
                </p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsItemModalOpen(false)}>
              Cancelar
            </Button>
            <Button
              onClick={handleAdicionarItem}
              className="bg-steel-blue text-white hover:bg-dark-denim dark:bg-blue-600 dark:hover:bg-blue-700"
              disabled={!novoItem.item_id}
            >
              Adicionar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
