import { useState, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Calendar,
  Layers,
  Paperclip,
  MoreVertical,
  Pencil,
  Eye,
  FileSpreadsheet,
  AlertCircle,
  Loader2,
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { supabase } from '@/lib/supabase/client'
import { getInvoiceSignedUrl } from '@/services/notas-fiscais-storage'
import { updateDataVencimento } from '@/services/contas-pagar'
import { AgruparContasDialog } from '@/components/financeiro/AgruparContasDialog'
import { EditarContaDialog } from '@/components/financeiro/EditarContaDialog'
import { DetalhesContaDialog } from '@/components/financeiro/DetalhesContaDialog'
import { formatCurrency } from '@/lib/utils'
import type { ExtendedTransaction } from '@/components/financeiro/FinanceiroMovimentacoes'

interface NotasAClassificarTabProps {
  transactions: ExtendedTransaction[]
  onRefresh: () => void
}

export function NotasAClassificarTab({ transactions, onRefresh }: NotasAClassificarTabProps) {
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [showAgrupar, setShowAgrupar] = useState(false)
  const [definirDialogConta, setDefinirDialogConta] = useState<ExtendedTransaction | null>(null)
  const [dataVencimento, setDataVencimento] = useState('')
  const [savingVencimento, setSavingVencimento] = useState(false)

  const [editOpen, setEditOpen] = useState(false)
  const [editConta, setEditConta] = useState<any>(null)
  const [detalhesOpen, setDetalhesOpen] = useState(false)
  const [detalhesConta, setDetalhesConta] = useState<any>(null)

  const { toast } = useToast()

  const contasAClassificar = useMemo(() => {
    return transactions.filter((t) => (t.status || '').toLowerCase() === 'a_classificar')
  }, [transactions])

  const selectedTransactions = useMemo(() => {
    return contasAClassificar.filter((t) => selectedIds.includes(t.id))
  }, [contasAClassificar, selectedIds])

  const totalValor = useMemo(() => {
    return contasAClassificar.reduce((sum, t) => sum + (Number(t.amount) || 0), 0)
  }, [contasAClassificar])

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]))
  }

  const toggleSelectAll = () => {
    if (selectedIds.length === contasAClassificar.length && contasAClassificar.length > 0) {
      setSelectedIds([])
    } else {
      setSelectedIds(contasAClassificar.map((t) => t.id))
    }
  }

  const handleOpenDefinirVencimento = (conta: ExtendedTransaction) => {
    setDefinirDialogConta(conta)
    setDataVencimento(conta.dueDate || '')
  }

  const handleSalvarVencimento = async () => {
    if (!definirDialogConta) return
    if (!dataVencimento) {
      toast({
        title: 'Data obrigatória',
        description: 'Por favor, selecione uma data de vencimento.',
        variant: 'destructive',
      })
      return
    }

    setSavingVencimento(true)
    try {
      const { error } = await updateDataVencimento(
        definirDialogConta.id,
        dataVencimento,
        'aguardando',
      )
      if (error) throw new Error(error)

      toast({
        title: 'Vencimento definido com sucesso!',
        description: 'A conta foi classificada e movida para Contas a Pagar (Aguardando).',
      })
      setDefinirDialogConta(null)
      setDataVencimento('')
      setSelectedIds((prev) => prev.filter((id) => id !== definirDialogConta.id))
      onRefresh()
    } catch (err: any) {
      toast({
        title: 'Erro ao definir vencimento',
        description: err.message || 'Falha ao atualizar o lançamento.',
        variant: 'destructive',
      })
    } finally {
      setSavingVencimento(false)
    }
  }

  const handleViewComprovante = async (url: string) => {
    const { url: signed, error } = await getInvoiceSignedUrl(url)
    if (error || !signed) {
      toast({ title: 'Erro ao acessar arquivo da nota', variant: 'destructive' })
      return
    }
    window.open(signed, '_blank')
  }

  const handleAgrupamentoSucesso = () => {
    setShowAgrupar(false)
    setSelectedIds([])
    onRefresh()
    toast({
      title: 'Contas agrupadas com sucesso!',
      description: 'As novas parcelas foram geradas em Contas a Pagar.',
    })
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <CardTitle className="text-lg font-bold">Notas a Classificar</CardTitle>
              <Badge className="bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-950 dark:text-orange-400 dark:border-orange-800">
                {contasAClassificar.length} pendente(s)
              </Badge>
            </div>
            <CardDescription className="mt-1">
              Contas a pagar geradas automaticamente a partir de notas fiscais do Estoque que
              aguardam definição de vencimento ou agrupamento.
            </CardDescription>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {selectedIds.length >= 2 && (
              <Button
                variant="default"
                size="sm"
                className="bg-blue-600 hover:bg-blue-700 text-white"
                onClick={() => setShowAgrupar(true)}
              >
                <Layers className="w-4 h-4 mr-1.5" />
                Agrupar Selecionadas ({selectedIds.length})
              </Button>
            )}
            <div className="text-right pl-2 border-l">
              <span className="text-xs text-muted-foreground block">Total a Classificar</span>
              <span className="text-base font-bold text-foreground">
                {formatCurrency(totalValor)}
              </span>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          {contasAClassificar.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground flex flex-col items-center justify-center">
              <FileSpreadsheet className="w-12 h-12 text-muted-foreground/40 mb-3" />
              <p className="font-medium text-base text-foreground">
                Nenhuma nota pendente de classificação.
              </p>
              <p className="text-xs text-muted-foreground mt-1 max-w-sm">
                Todas as contas a pagar vindas de notas fiscais já possuem data de vencimento
                definida ou foram agrupadas.
              </p>
            </div>
          ) : (
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10">
                      <Checkbox
                        checked={
                          selectedIds.length === contasAClassificar.length &&
                          contasAClassificar.length > 0
                        }
                        onCheckedChange={toggleSelectAll}
                      />
                    </TableHead>
                    <TableHead>Fornecedor</TableHead>
                    <TableHead className="max-w-[220px]">Descrição / NF</TableHead>
                    <TableHead>Categoria</TableHead>
                    <TableHead className="text-right">Valor</TableHead>
                    <TableHead>Data de Entrada</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-12 text-center">NF</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {contasAClassificar.map((conta) => {
                    const isSelected = selectedIds.includes(conta.id)
                    return (
                      <TableRow
                        key={conta.id}
                        className="cursor-pointer hover:bg-muted/50 transition-colors"
                        data-state={isSelected ? 'selected' : undefined}
                        onClick={(e) => {
                          const target = e.target as HTMLElement
                          if (
                            target.closest('button') ||
                            target.closest('input') ||
                            target.closest('[role="checkbox"]')
                          ) {
                            return
                          }
                          setDetalhesConta(conta.source)
                          setDetalhesOpen(true)
                        }}
                      >
                        <TableCell>
                          <Checkbox
                            checked={isSelected}
                            onCheckedChange={() => toggleSelect(conta.id)}
                          />
                        </TableCell>
                        <TableCell className="font-medium text-sm">
                          {conta.entityName || '-'}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground max-w-[220px] truncate">
                          {conta.description || '-'}
                        </TableCell>
                        <TableCell className="text-sm">
                          <Badge variant="outline" className="text-xs font-normal">
                            {conta.category || 'Insumos/Estoque'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right font-bold text-sm text-foreground">
                          {formatCurrency(Number(conta.amount) || 0)}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {conta.createdAt
                            ? new Date(conta.createdAt).toLocaleDateString('pt-BR')
                            : '-'}
                        </TableCell>
                        <TableCell>
                          <Badge className="bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-950 dark:text-orange-400 dark:border-orange-800 text-xs">
                            A Classificar
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          {conta.comprovanteUrl ? (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0"
                              onClick={() => handleViewComprovante(conta.comprovanteUrl!)}
                              title="Ver arquivo da Nota Fiscal"
                            >
                              <Paperclip className="w-4 h-4 text-blue-600" />
                            </Button>
                          ) : (
                            <span className="text-muted-foreground text-xs">-</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-8 px-2.5 text-xs text-primary border-primary/30 hover:bg-primary/10"
                              onClick={() => handleOpenDefinirVencimento(conta)}
                            >
                              <Calendar className="w-3.5 h-3.5 mr-1" />
                              Definir Vencimento
                            </Button>

                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                  <MoreVertical className="w-4 h-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem
                                  onClick={() => {
                                    setDetalhesConta(conta.source)
                                    setDetalhesOpen(true)
                                  }}
                                >
                                  <Eye className="w-4 h-4 mr-2" /> Ver Detalhes
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => {
                                    setEditConta(conta.source)
                                    setEditOpen(true)
                                  }}
                                >
                                  <Pencil className="w-4 h-4 mr-2" /> Editar
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialog para Definir Vencimento */}
      <Dialog
        open={!!definirDialogConta}
        onOpenChange={(open) => !open && setDefinirDialogConta(null)}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-primary" />
              Definir Data de Vencimento
            </DialogTitle>
            <DialogDescription>
              Ao definir o vencimento, esta conta será classificada com status{' '}
              <strong>Aguardando</strong> e passará a constar normalmente no fluxo de Contas a
              Pagar.
            </DialogDescription>
          </DialogHeader>

          {definirDialogConta && (
            <div className="space-y-4 py-2">
              <div className="bg-muted rounded-lg p-3 space-y-1.5 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Fornecedor:</span>
                  <span className="font-semibold">{definirDialogConta.entityName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Descrição:</span>
                  <span className="truncate max-w-[200px]">{definirDialogConta.description}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Valor:</span>
                  <span className="font-bold text-rose-600">
                    {formatCurrency(Number(definirDialogConta.amount) || 0)}
                  </span>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="data-vencimento-input">Data de Vencimento</Label>
                <Input
                  id="data-vencimento-input"
                  type="date"
                  value={dataVencimento}
                  onChange={(e) => setDataVencimento(e.target.value)}
                  className="w-full"
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDefinirDialogConta(null)}
              disabled={savingVencimento}
            >
              Cancelar
            </Button>
            <Button onClick={handleSalvarVencimento} disabled={savingVencimento}>
              {savingVencimento && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Salvar e Classificar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog para Agrupar Contas a Pagar */}
      <AgruparContasDialog
        open={showAgrupar}
        onOpenChange={setShowAgrupar}
        selectedTransactions={selectedTransactions}
        onSuccess={handleAgrupamentoSucesso}
      />

      {/* Dialogs de Edição e Detalhes */}
      <EditarContaDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        tipo="pagar"
        conta={editConta}
        onSuccess={onRefresh}
      />

      <DetalhesContaDialog
        open={detalhesOpen}
        onOpenChange={setDetalhesOpen}
        tipo="pagar"
        conta={detalhesConta}
        onSuccess={onRefresh}
      />
    </div>
  )
}
