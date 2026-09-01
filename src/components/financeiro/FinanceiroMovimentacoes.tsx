import { useState, useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Group, CheckCircle2, Paperclip, MoreVertical, Pencil, Eye } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { AgruparContasDialog } from '@/components/financeiro/AgruparContasDialog'
import { EditarContaDialog } from '@/components/financeiro/EditarContaDialog'
import { DetalhesContaDialog } from '@/components/financeiro/DetalhesContaDialog'
import { MarcarPagoDialog } from '@/components/financeiro/MarcarPagoDialog'
import { getInvoiceSignedUrl } from '@/services/notas-fiscais-storage'
import { formatCurrency } from '@/lib/utils'

export interface ExtendedTransaction {
  id: string
  type: 'receita' | 'despesa'
  description: string | null
  category: string | null
  amount: number
  dueDate: string | null
  paidDate: string | null
  status: string
  source: any
  createdAt: string
  entityName: string
  meioPagamento?: string | null
  antecipado?: boolean | null
  comprovanteUrl?: string | null
  notaFiscalId?: string | null
  grupoId?: string | null
  observacoes?: string | null
  contaBancariaId?: string | null
}

function StatusBadge({ status }: { status: string }) {
  const s = (status || '').toLowerCase()
  if (s === 'pago')
    return (
      <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-400 dark:border-emerald-800">
        Pago
      </Badge>
    )
  if (s === 'aguardando')
    return (
      <Badge className="bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-950 dark:text-amber-400 dark:border-amber-800">
        Aguardando
      </Badge>
    )
  if (s === 'a_classificar')
    return (
      <Badge className="bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-950 dark:text-orange-400 dark:border-orange-800">
        A Classificar
      </Badge>
    )
  if (s === 'agrupado')
    return (
      <Badge
        variant="outline"
        className="text-blue-600 border-blue-300 dark:text-blue-400 dark:border-blue-800"
      >
        Agrupado
      </Badge>
    )
  return <Badge variant="secondary">{status || '-'}</Badge>
}

function fmtDate(d: string | null) {
  return d ? new Date(d).toLocaleDateString('pt-BR') : '-'
}

interface Props {
  transactions: ExtendedTransaction[]
  onRefresh: () => void
}

export function FinanceiroMovimentacoes({ transactions, onRefresh }: Props) {
  const [selPagar, setSelPagar] = useState<string[]>([])
  const [selReceber, setSelReceber] = useState<string[]>([])
  const [showAgrupar, setShowAgrupar] = useState(false)
  const [marcarPagoOpen, setMarcarPagoOpen] = useState(false)
  const [marcarPagoTipo, setMarcarPagoTipo] = useState<'pagar' | 'receber'>('pagar')
  const [editOpen, setEditOpen] = useState(false)
  const [editTipo, setEditTipo] = useState<'pagar' | 'receber'>('pagar')
  const [editConta, setEditConta] = useState<any>(null)
  const [detalhesOpen, setDetalhesOpen] = useState(false)
  const [detalhesConta, setDetalhesConta] = useState<any>(null)
  const [detalhesTipo, setDetalhesTipo] = useState<'pagar' | 'receber'>('pagar')
  const { toast } = useToast()

  const pagar = useMemo(
    () =>
      transactions.filter(
        (t) => t.type === 'despesa' && (t.status || '').toLowerCase() !== 'a_classificar',
      ),
    [transactions],
  )
  const receber = useMemo(() => transactions.filter((t) => t.type === 'receita'), [transactions])
  const selPagarTx = useMemo(() => pagar.filter((t) => selPagar.includes(t.id)), [pagar, selPagar])
  const selReceberTx = useMemo(
    () => receber.filter((t) => selReceber.includes(t.id)),
    [receber, selReceber],
  )

  const toggle = (id: string, sel: string[], set: (v: string[]) => void) =>
    set(sel.includes(id) ? sel.filter((i) => i !== id) : [...sel, id])

  const toggleAll = (
    items: ExtendedTransaction[],
    sel: string[],
    set: (v: string[]) => void,
    canSel: (t: ExtendedTransaction) => boolean,
  ) => {
    const selectable = items.filter(canSel)
    set(
      sel.length === selectable.length && selectable.length > 0 ? [] : selectable.map((t) => t.id),
    )
  }

  const canSelPagar = (t: ExtendedTransaction) =>
    !['pago', 'agrupado'].includes((t.status || '').toLowerCase())
  const canSelReceber = (t: ExtendedTransaction) => (t.status || '').toLowerCase() !== 'pago'

  function openEdit(tipo: 'pagar' | 'receber', conta: any) {
    // Trava anti-empilhamento: fecha os outros modais
    setDetalhesOpen(false)
    setMarcarPagoOpen(false)
    setShowAgrupar(false)

    setEditTipo(tipo)
    setEditConta(conta)
    setEditOpen(true)
  }

  function openDetails(tipo: 'pagar' | 'receber', conta: any) {
    // Trava anti-empilhamento: fecha os outros modais
    setEditOpen(false)
    setMarcarPagoOpen(false)
    setShowAgrupar(false)

    setDetalhesTipo(tipo)
    setDetalhesConta(conta)
    setDetalhesOpen(true)
  }

  function handleOpenMarcarPago(tipo: 'pagar' | 'receber') {
    // Trava anti-empilhamento: fecha os outros modais
    setDetalhesOpen(false)
    setEditOpen(false)
    setShowAgrupar(false)

    setMarcarPagoTipo(tipo)
    setMarcarPagoOpen(true)
  }

  async function viewComp(url: string) {
    const { url: signed, error } = await getInvoiceSignedUrl(url)
    if (error || !signed) {
      toast({ title: 'Erro ao acessar arquivo', variant: 'destructive' })
      return
    }
    window.open(signed, '_blank')
  }

  function handleGrouped() {
    setShowAgrupar(false)
    setSelPagar([])
    onRefresh()
    toast({ title: 'Contas agrupadas com sucesso!' })
  }

  function renderTable(
    items: ExtendedTransaction[],
    sel: string[],
    setSel: (v: string[]) => void,
    canSel: (t: ExtendedTransaction) => boolean,
    isPagar: boolean,
  ) {
    if (items.length === 0)
      return <p className="text-center py-8 text-sm text-gray-500">Nenhum lançamento encontrado.</p>
    const selectable = items.filter(canSel)
    const allSel = selectable.length > 0 && sel.length === selectable.length
    return (
      <div className="rounded-md border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10">
                <Checkbox
                  checked={allSel}
                  onCheckedChange={() => toggleAll(items, sel, setSel, canSel)}
                />
              </TableHead>
              <TableHead>{isPagar ? 'Fornecedor' : 'Cliente'}</TableHead>
              <TableHead className="max-w-[180px]">Descrição</TableHead>
              {isPagar ? <TableHead>Categoria</TableHead> : <TableHead>Parcela</TableHead>}
              <TableHead className="text-right">Valor</TableHead>
              <TableHead>Vencimento</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-10">Anexo</TableHead>
              <TableHead className="w-10">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((t) => (
              <TableRow
                key={t.id}
                className="cursor-pointer hover:bg-muted/50 transition-colors"
                onClick={(e) => {
                  const target = e.target as HTMLElement
                  if (
                    target.closest('button') ||
                    target.closest('input') ||
                    target.closest('[role="checkbox"]') ||
                    target.closest('[role="menu"]') ||
                    target.closest('[role="menuitem"]') ||
                    target.closest('[data-radix-dropdown-menu-content]') ||
                    target.closest('[data-action-cell]')
                  )
                    return
                  openDetails(isPagar ? 'pagar' : 'receber', t.source)
                }}
                data-state={sel.includes(t.id) ? 'selected' : undefined}
              >
                <TableCell onClick={(e) => e.stopPropagation()}>
                  {canSel(t) && (
                    <Checkbox
                      checked={sel.includes(t.id)}
                      onCheckedChange={() => toggle(t.id, sel, setSel)}
                    />
                  )}
                </TableCell>
                <TableCell className="font-medium text-sm">{t.entityName || '-'}</TableCell>
                <TableCell className="text-sm text-gray-500 max-w-[180px] truncate">
                  {t.description || '-'}
                </TableCell>
                {isPagar ? (
                  <TableCell className="text-sm">{t.category || '-'}</TableCell>
                ) : (
                  <TableCell className="text-sm">{t.source?.numero_parcela || '-'}</TableCell>
                )}
                <TableCell className="text-right font-bold text-sm">
                  {formatCurrency(Number(t.amount) || 0)}
                </TableCell>
                <TableCell className="text-sm">{fmtDate(t.dueDate)}</TableCell>
                <TableCell>
                  <StatusBadge status={t.status} />
                </TableCell>
                <TableCell onClick={(e) => e.stopPropagation()}>
                  {t.comprovanteUrl && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0"
                      onClick={(e) => {
                        e.stopPropagation()
                        viewComp(t.comprovanteUrl!)
                      }}
                    >
                      <Paperclip className="w-4 h-4" />
                    </Button>
                  )}
                </TableCell>
                <TableCell data-action-cell="true" onClick={(e) => e.stopPropagation()}>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <MoreVertical className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                      <DropdownMenuItem
                        onClick={(e) => {
                          e.stopPropagation()
                          openDetails(isPagar ? 'pagar' : 'receber', t.source)
                        }}
                      >
                        <Eye className="w-4 h-4 mr-2" /> Ver Detalhes
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={(e) => {
                          e.stopPropagation()
                          openEdit(isPagar ? 'pagar' : 'receber', t.source)
                        }}
                      >
                        <Pencil className="w-4 h-4 mr-2" /> Editar
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <Tabs defaultValue="pagar">
        <TabsList>
          <TabsTrigger value="pagar">Contas a Pagar ({pagar.length})</TabsTrigger>
          <TabsTrigger value="receber">Contas a Receber ({receber.length})</TabsTrigger>
        </TabsList>
        <TabsContent value="pagar">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Contas a Pagar</CardTitle>
              <div className="flex gap-2">
                {selPagar.length > 0 && (
                  <Button variant="outline" size="sm" onClick={() => handleOpenMarcarPago('pagar')}>
                    <CheckCircle2 className="w-4 h-4 mr-1" /> Marcar Pago ({selPagar.length})
                  </Button>
                )}
                {selPagar.length >= 2 && (
                  <Button variant="outline" size="sm" onClick={() => setShowAgrupar(true)}>
                    <Group className="w-4 h-4 mr-1" /> Agrupar ({selPagar.length})
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {renderTable(pagar, selPagar, setSelPagar, canSelPagar, true)}
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="receber">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Contas a Receber</CardTitle>
              {selReceber.length > 0 && (
                <Button variant="outline" size="sm" onClick={() => handleOpenMarcarPago('receber')}>
                  <CheckCircle2 className="w-4 h-4 mr-1" /> Marcar Pago ({selReceber.length})
                </Button>
              )}
            </CardHeader>
            <CardContent>
              {renderTable(receber, selReceber, setSelReceber, canSelReceber, false)}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      <AgruparContasDialog
        open={showAgrupar}
        onOpenChange={setShowAgrupar}
        selectedTransactions={selPagarTx}
        onSuccess={handleGrouped}
      />
      <EditarContaDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        tipo={editTipo}
        conta={editConta}
        onSuccess={onRefresh}
      />
      <DetalhesContaDialog
        open={detalhesOpen}
        onOpenChange={setDetalhesOpen}
        tipo={detalhesTipo}
        conta={detalhesConta}
        onSuccess={onRefresh}
        onEdit={(t, c) => openEdit(t, c)}
      />
      <MarcarPagoDialog
        open={marcarPagoOpen}
        onOpenChange={setMarcarPagoOpen}
        tipo={marcarPagoTipo}
        selectedTransactions={marcarPagoTipo === 'pagar' ? selPagarTx : selReceberTx}
        onSuccess={() => {
          if (marcarPagoTipo === 'pagar') {
            setSelPagar([])
          } else {
            setSelReceber([])
          }
          onRefresh()
        }}
      />
    </div>
  )
}
