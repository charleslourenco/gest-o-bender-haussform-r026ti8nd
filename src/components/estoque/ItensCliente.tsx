import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/hooks/use-toast'
import {
  RefreshCw,
  Check,
  Trash2,
  ExternalLink,
  Copy,
  Send,
  Clock,
  ChevronLeft,
  ChevronRight,
  Pencil,
} from 'lucide-react'
import { useAuth } from '@/hooks/use-auth'
import { EditarItemClienteModal, ItemClienteData } from './EditarItemClienteModal'
import { useTableScroll } from '@/hooks/use-table-scroll'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'

type ItemCliente = {
  id: string
  cliente_nome: string
  produto: string
  recebido_em: string
  entregue_em: string | null
  responsavel_entrega: string | null
  recebedor_nome: string | null
  recebedor_cpf: string | null
  comprovante_url: string | null
  assinado_em: string | null
  status: string | null
}

export function ItensCliente() {
  const [itens, setItens] = useState<ItemCliente[]>([])
  const [loading, setLoading] = useState(true)
  const [cliente, setCliente] = useState('')
  const [produto, setProduto] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [selectedItem, setSelectedItem] = useState<ItemCliente | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [isAdmin, setIsAdmin] = useState(false)
  const [editingItem, setEditingItem] = useState<ItemCliente | null>(null)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [userRole, setUserRole] = useState<string | null>(null)
  const { user, permissions } = useAuth()
  const { toast } = useToast()
  const { scrollRef, canScrollLeft, canScrollRight, scrollLeft, scrollRight, checkScroll } =
    useTableScroll()

  const fetchItens = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('estoque_itens_cliente')
      .select('*')
      .order('recebido_em', { ascending: false })

    if (error) {
      toast({
        title: 'Erro',
        description: 'Erro ao buscar itens de clientes.',
        variant: 'destructive',
      })
    } else {
      setItens((data || []) as ItemCliente[])
    }
    setLoading(false)
  }

  useEffect(() => {
    fetchItens()
    checkAdminAndRole()
  }, [])

  async function checkAdminAndRole() {
    const {
      data: { user: currentUser },
    } = await supabase.auth.getUser()
    if (currentUser) {
      const [{ data: adminData }, { data: dbUserData }] = await Promise.all([
        supabase.rpc('is_admin', { user_id: currentUser.id }),
        supabase.from('users').select('funcao').eq('id', currentUser.id).maybeSingle(),
      ])
      setIsAdmin(!!adminData)
      if (dbUserData?.funcao) {
        setUserRole(dbUserData.funcao)
      }
    }
  }

  // Permissão: Gestor, Compras e Produção podem editar; os demais veem o botão desabilitado (só visualização).
  const canEdit = (() => {
    if (isAdmin) return true

    // 1. Papel direto em users.funcao ou metadata
    const userRoleStr = (
      userRole ||
      user?.user_metadata?.role ||
      user?.user_metadata?.funcao ||
      (user as any)?.role ||
      ''
    ).toLowerCase()

    if (
      userRoleStr.includes('gestor') ||
      userRoleStr.includes('gerente') ||
      userRoleStr.includes('admin') ||
      userRoleStr.includes('compras') ||
      userRoleStr.includes('produção') ||
      userRoleStr.includes('producao')
    ) {
      return true
    }

    // 2. Permissões de matriz por módulo
    // Módulos relevantes: Estoque & Compras, Produção, Planejamento e Programação de Operações
    const allowedLevels = ['Editor', 'Admin']
    const modEstoque = permissions['Estoque & Compras']
    const modProducao = permissions['Produção']
    const modPcp = permissions['Planejamento e Programação de Operações']

    if (
      (modEstoque && allowedLevels.includes(modEstoque)) ||
      (modProducao && allowedLevels.includes(modProducao)) ||
      (modPcp && allowedLevels.includes(modPcp))
    ) {
      return true
    }

    return false
  })()

  const handleDelete = async (id: string) => {
    if (!window.confirm('Tem certeza que deseja apagar este item?')) return
    await supabase.from('estoque_itens_cliente').delete().eq('id', id)
    fetchItens()
    toast({ title: 'Item apagado' })
  }

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!cliente || !produto) return
    setIsSubmitting(true)
    const { error } = await supabase.from('estoque_itens_cliente').insert({
      cliente_nome: cliente,
      produto: produto,
    })

    if (error) {
      toast({ title: 'Erro', description: 'Erro ao registrar item.', variant: 'destructive' })
    } else {
      toast({ title: 'Sucesso', description: 'Item registrado com sucesso.' })
      setCliente('')
      setProduto('')
      fetchItens()
    }
    setIsSubmitting(false)
  }

  const copySignatureLink = (item: ItemCliente) => {
    const link = `${window.location.origin}/recebimento-item-cliente/${item.id}`
    navigator.clipboard
      .writeText(link)
      .then(() => {
        toast({ title: 'Link copiado!', description: 'Envie o link para o cliente assinar.' })
      })
      .catch(() => {
        toast({
          title: 'Erro',
          description: 'Não foi possível copiar o link.',
          variant: 'destructive',
        })
      })
  }

  const formatDate = (isoString: string | null) => {
    if (!isoString) return null
    const d = new Date(isoString)
    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(d)
  }

  const openModal = (item: ItemCliente) => {
    setSelectedItem(item)
    setDialogOpen(true)
  }

  return (
    <div className="h-full flex flex-col space-y-6 min-h-0">
      <Card className="flex-none animate-in fade-in duration-300">
        <CardHeader>
          <CardTitle>Registrar Novo Item de Cliente</CardTitle>
          <CardDescription>
            Use para fogões, geladeiras ou outros produtos que o cliente enviou para guardar na
            fábrica.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleAdd} className="flex flex-col sm:flex-row gap-4 items-end">
            <div className="space-y-2 w-full sm:w-1/3">
              <Label htmlFor="cliente">Nome do Cliente</Label>
              <Input
                id="cliente"
                value={cliente}
                onChange={(e) => setCliente(e.target.value)}
                required
                placeholder="Ex: João Silva"
              />
            </div>
            <div className="space-y-2 w-full sm:w-1/2">
              <Label htmlFor="produto">Produto Recebido</Label>
              <Input
                id="produto"
                value={produto}
                onChange={(e) => setProduto(e.target.value)}
                required
                placeholder="Ex: Fogão 4 bocas Electrolux"
              />
            </div>
            <Button type="submit" disabled={isSubmitting} className="w-full sm:w-auto shrink-0">
              Registrar Entrada
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card className="flex-1 min-h-0 flex flex-col animate-in fade-in duration-300 delay-100 fill-mode-both">
        <CardHeader className="flex-none flex flex-row items-center justify-between">
          <CardTitle>Histórico de Itens</CardTitle>
          <Button
            variant="outline"
            size="icon"
            onClick={fetchItens}
            disabled={loading}
            title="Atualizar"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </CardHeader>
        <CardContent className="flex-1 min-h-0 flex flex-col pb-6">
          <div className="flex-1 rounded-md border border-border overflow-hidden flex flex-col min-h-0 relative">
            {canScrollLeft && (
              <Button
                variant="outline"
                size="icon"
                onClick={scrollLeft}
                className="absolute left-0 top-1/2 -translate-y-1/2 z-20 h-10 w-8 rounded-l-none rounded-r-md bg-card/70 hover:bg-card/90 backdrop-blur-sm shadow-md border-l-0"
              >
                <ChevronLeft className="h-5 w-5" />
              </Button>
            )}
            {canScrollRight && (
              <Button
                variant="outline"
                size="icon"
                onClick={scrollRight}
                className="absolute right-0 top-1/2 -translate-y-1/2 z-20 h-10 w-8 rounded-r-none rounded-l-md bg-card/70 hover:bg-card/90 backdrop-blur-sm shadow-md border-r-0"
              >
                <ChevronRight className="h-5 w-5" />
              </Button>
            )}
            <div ref={scrollRef} onScroll={checkScroll} className="overflow-auto flex-1">
              <Table className="min-w-[1000px] relative">
                <TableHeader className="bg-muted sticky top-0 z-10 shadow-sm">
                  <TableRow>
                    <TableHead className="whitespace-nowrap">Cliente</TableHead>
                    <TableHead className="min-w-[200px] max-w-[350px]">Produto</TableHead>
                    <TableHead className="whitespace-nowrap">Recebido Em</TableHead>
                    <TableHead className="whitespace-nowrap">Entregue Em</TableHead>
                    <TableHead className="whitespace-nowrap">Responsável (Entrega)</TableHead>
                    <TableHead className="text-right whitespace-nowrap">Ação</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {itens.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                        Nenhum item registrado.
                      </TableCell>
                    </TableRow>
                  ) : (
                    itens.map((item) => {
                      const entregue = !!item.entregue_em
                      return (
                        <TableRow key={item.id}>
                          <TableCell className="font-medium whitespace-nowrap">
                            {item.cliente_nome}
                          </TableCell>
                          <TableCell className="min-w-[200px] max-w-[350px] whitespace-normal break-words">
                            {item.produto}
                          </TableCell>
                          <TableCell className="whitespace-nowrap">
                            {formatDate(item.recebido_em) || '-'}
                          </TableCell>
                          <TableCell className="whitespace-nowrap">
                            {entregue ? (
                              formatDate(item.entregue_em)
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </TableCell>
                          <TableCell className="whitespace-nowrap">
                            {item.recebedor_nome || item.responsavel_entrega || (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </TableCell>
                          <TableCell className="text-right whitespace-nowrap">
                            {entregue ? (
                              <>
                                <Badge
                                  variant="secondary"
                                  className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100 dark:bg-emerald-950 dark:text-emerald-400 dark:hover:bg-emerald-900 mr-2"
                                >
                                  <Check className="h-3 w-3 mr-1" />
                                  Entregue
                                </Badge>
                                {item.comprovante_url && (
                                  <a
                                    href={`${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/comprovantes-itens-cliente/${item.comprovante_url.replace(/^comprovantes\//, '')}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                  >
                                    <Button size="sm" variant="outline">
                                      <ExternalLink className="h-4 w-4 mr-2" />
                                      Ver Comprovante
                                    </Button>
                                  </a>
                                )}
                              </>
                            ) : (
                              <Dialog
                                open={dialogOpen && selectedItem?.id === item.id}
                                onOpenChange={(open) => {
                                  if (!open) {
                                    setDialogOpen(false)
                                    setSelectedItem(null)
                                  } else {
                                    openModal(item)
                                  }
                                }}
                              >
                                <DialogTrigger asChild>
                                  <Button size="sm" variant="outline">
                                    <Send className="h-4 w-4 mr-2" />
                                    Registrar Entrega
                                  </Button>
                                </DialogTrigger>
                                <DialogContent>
                                  <DialogHeader>
                                    <DialogTitle>Registrar Entrega</DialogTitle>
                                  </DialogHeader>
                                  {selectedItem && (
                                    <div className="space-y-4 py-2">
                                      <div className="rounded-md border bg-muted/30 p-4 space-y-2">
                                        <div className="flex justify-between text-sm">
                                          <span className="text-muted-foreground">Cliente:</span>
                                          <span className="font-medium">
                                            {selectedItem.cliente_nome}
                                          </span>
                                        </div>
                                        <div className="flex justify-between text-sm">
                                          <span className="text-muted-foreground">Produto:</span>
                                          <span className="font-medium text-right">
                                            {selectedItem.produto}
                                          </span>
                                        </div>
                                      </div>

                                      <div className="flex items-center gap-2 text-sm">
                                        <Clock className="h-4 w-4 text-amber-500" />
                                        <span className="text-muted-foreground">
                                          Status:{' '}
                                          <span className="font-medium text-amber-600">
                                            Aguardando assinatura
                                          </span>
                                        </span>
                                      </div>

                                      <div className="space-y-2">
                                        <Label>Link de Assinatura</Label>
                                        <p className="text-xs text-muted-foreground">
                                          Copie o link abaixo e envie ao cliente para que ele
                                          preencha seus dados e assine o comprovante de entrega.
                                        </p>
                                        <div className="flex gap-2">
                                          <Input
                                            readOnly
                                            value={`${window.location.origin}/recebimento-item-cliente/${selectedItem.id}`}
                                            className="text-xs"
                                          />
                                          <Button
                                            type="button"
                                            variant="secondary"
                                            onClick={() => copySignatureLink(selectedItem)}
                                            className="shrink-0"
                                          >
                                            <Copy className="h-4 w-4 mr-2" />
                                            Copiar Link
                                          </Button>
                                        </div>
                                      </div>
                                    </div>
                                  )}
                                  <DialogFooter>
                                    <Button variant="outline" onClick={() => setDialogOpen(false)}>
                                      Fechar
                                    </Button>
                                  </DialogFooter>
                                </DialogContent>
                              </Dialog>
                            )}
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setEditingItem(item)
                                setIsEditModalOpen(true)
                              }}
                              disabled={!canEdit}
                              className="ml-2"
                              title={
                                canEdit
                                  ? 'Editar item'
                                  : 'Apenas Gestor, Compras e Produção podem editar este item'
                              }
                            >
                              <Pencil className="h-4 w-4 mr-1.5" />
                              Editar
                            </Button>

                            {isAdmin && (
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleDelete(item.id)}
                                className="ml-1 text-red-500 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/50 h-8 w-8"
                                title="Apagar"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      )
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        </CardContent>
      </Card>

      <EditarItemClienteModal
        item={editingItem as ItemClienteData | null}
        open={isEditModalOpen}
        onOpenChange={(open) => {
          setIsEditModalOpen(open)
          if (!open) setEditingItem(null)
        }}
        onSaved={fetchItens}
        currentUserId={user?.id}
      />
    </div>
  )
}
