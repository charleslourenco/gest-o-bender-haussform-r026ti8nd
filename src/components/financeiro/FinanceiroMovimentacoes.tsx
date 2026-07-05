import React, { useState, useMemo } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Sparkles,
  Upload,
  CheckCircle2,
  Circle,
  Paperclip,
  Eye,
  Trash2,
  X,
  Layers,
} from 'lucide-react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/hooks/use-toast'
import { supabase } from '@/lib/supabase/client'
import { useAuth } from '@/hooks/use-auth'
import { format, parseISO } from 'date-fns'
import { AgruparContasDialog } from '@/components/financeiro/AgruparContasDialog'

export interface ExtendedTransaction {
  id: string
  type: 'receita' | 'despesa'
  description: string
  category: string
  amount: number
  dueDate: string
  paidDate: string | null
  status: string
  source: any
  createdAt: string
  entityName: string
  meioPagamento?: string
  antecipado?: boolean
  comprovanteUrl?: string
}

const isEligibleForGrouping = (t: ExtendedTransaction): boolean => {
  if (t.type !== 'despesa') return false
  const s = (t.status || '').toLowerCase()
  return s === 'pendente' || s === 'aguardando'
}

export function FinanceiroMovimentacoes({
  transactions,
  onRefresh,
}: {
  transactions: ExtendedTransaction[]
  onRefresh: () => void
}) {
  const [isProcessing, setIsProcessing] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [agruparOpen, setAgruparOpen] = useState(false)
  const { toast } = useToast()
  const { user } = useAuth()

  React.useEffect(() => {
    const handleRefresh = () => onRefresh()
    window.addEventListener('financeiro-refresh', handleRefresh)
    return () => window.removeEventListener('financeiro-refresh', handleRefresh)
  }, [onRefresh])

  const eligibleTransactions = useMemo(
    () => transactions.filter(isEligibleForGrouping),
    [transactions],
  )

  const selectedTransactions = useMemo(
    () => eligibleTransactions.filter((t) => selectedIds.has(t.id)),
    [eligibleTransactions, selectedIds],
  )

  const selectedFornecedores = useMemo(
    () => new Set(selectedTransactions.map((t) => t.entityName)),
    [selectedTransactions],
  )

  const canGroup = selectedTransactions.length >= 2 && selectedFornecedores.size === 1

  const toggleSelection = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const toggleSelectAll = () => {
    if (selectedIds.size === eligibleTransactions.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(eligibleTransactions.map((t) => t.id)))
    }
  }

  const handleGroupSuccess = () => {
    setSelectedIds(new Set())
    onRefresh()
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setIsProcessing(true)
    const reader = new FileReader()
    reader.onload = async (ev) => {
      const base64 = ev.target?.result
      if (typeof base64 !== 'string') return
      try {
        toast({
          title: 'Analisando...',
          description: 'Edith está extraindo dados do comprovante...',
        })
        const { data, error } = await supabase.functions.invoke('financeiro-ai', {
          body: {
            action: 'ocr',
            payload: { imageBase64: base64, isPdf: file.type === 'application/pdf' },
          },
        })
        if (error) throw error

        const fileExt = file.name.split('.').pop()
        const filePath = `comprovantes/${Date.now()}.${fileExt}`
        await supabase.storage.from('financeiro').upload(filePath, file)

        const numParcelas = parseInt(data.parcelas) || 1
        let baseValor = data.valor_parcela ? parseFloat(data.valor_parcela) : parseFloat(data.valor)
        if (!data.valor_parcela && numParcelas > 1) {
          baseValor = baseValor / numParcelas
        }

        const dueDate = data.data_vencimento ? new Date(data.data_vencimento) : new Date()
        const isReceita = data.tipo === 'receita'
        const table = isReceita ? 'contas_receber' : 'contas_pagar'

        let clienteId = null
        if (isReceita && data.fornecedor) {
          const { data: clientes } = await supabase
            .from('clientes')
            .select('id')
            .ilike('nome', `%${data.fornecedor}%`)
            .limit(1)
            .maybeSingle()
          if (clientes) clienteId = clientes.id
        }

        const inserts: any[] = []
        const hasItens =
          data.itens && Array.isArray(data.itens) && data.itens.length > 0 && !isReceita

        let launchItems = false
        if (hasItens) {
          launchItems = window.confirm(
            `A Edith encontrou ${data.itens.length} itens detalhados nesta fatura. Deseja lançar item por item no lugar do valor total?`,
          )
        }

        if (launchItems) {
          data.itens.forEach((item: any, i: number) => {
            let itemDueDate = new Date(dueDate)
            if (item.data && typeof item.data === 'string' && item.data.includes('/')) {
              const [d, m] = item.data.split('/')
              itemDueDate.setMonth(parseInt(m, 10) - 1)
              itemDueDate.setDate(parseInt(d, 10))
            }
            inserts.push({
              user_id: user?.id,
              fornecedor: data.fornecedor || 'Cartão de Crédito',
              valor: parseFloat(item.valor) || 0,
              data_vencimento: itemDueDate.toISOString().split('T')[0],
              descricao: item.descricao || `Item da fatura`,
              categoria: data.categoria || 'Despesa Variável',
              meio_pagamento: 'Cartão',
              comprovante_url: i === 0 ? filePath : null,
            })
          })
        } else {
          for (let i = 0; i < numParcelas; i++) {
            const currentDueDate = new Date(dueDate)
            currentDueDate.setMonth(currentDueDate.getMonth() + i)

            if (isReceita) {
              inserts.push({
                user_id: user?.id,
                cliente_id: clienteId,
                descricao:
                  (numParcelas > 1 ? `Parcela ${i + 1}/${numParcelas}` : data.descricao) ||
                  `Recebimento de ${data.fornecedor || 'Cliente'}`,
                valor: baseValor || 0,
                data_vencimento: currentDueDate.toISOString().split('T')[0],
                categoria: data.categoria || 'Geral',
                meio_pagamento: data.meio_pagamento || 'Transferência',
                comprovante_url: i === 0 ? filePath : null,
                numero_parcela: `${i + 1}/${numParcelas}`,
              })
            } else {
              inserts.push({
                user_id: user?.id,
                fornecedor: data.fornecedor || 'Fornecedor',
                valor: baseValor || 0,
                data_vencimento: currentDueDate.toISOString().split('T')[0],
                descricao:
                  (numParcelas > 1 ? `Parcela ${i + 1}/${numParcelas}` : data.descricao) || '',
                categoria: data.categoria || 'Geral',
                codigo_barras: data.codigo_barras,
                meio_pagamento: data.meio_pagamento || 'Boleto',
                comprovante_url: i === 0 ? filePath : null,
              })
            }
          }
        }

        await supabase.from(table as any).insert(inserts)

        toast({
          title: 'Sucesso',
          description: `Registro(s) de ${data.fornecedor || 'Transação'} inserido(s) com sucesso!`,
        })
        onRefresh()
      } catch (err: any) {
        toast({ title: 'Erro', description: err.message, variant: 'destructive' })
      } finally {
        setIsProcessing(false)
        if (e.target) e.target.value = ''
      }
    }
    reader.readAsDataURL(file)
  }

  const togglePayment = async (t: ExtendedTransaction) => {
    const newStatus = t.status === 'pago' ? 'aguardando' : 'pago'
    const newDate = newStatus === 'pago' ? new Date().toISOString().split('T')[0] : null
    const table = t.type === 'receita' ? 'contas_receber' : 'contas_pagar'
    await supabase
      .from(table)
      .update({ status_pagamento: newStatus, data_pagamento: newDate })
      .eq('id', t.id)
    onRefresh()
  }

  const handleDelete = async (t: ExtendedTransaction) => {
    if (!confirm('Deseja realmente excluir este lançamento financeiro?')) return
    const table = t.type === 'receita' ? 'contas_receber' : 'contas_pagar'

    if (t.comprovanteUrl) {
      await supabase.storage.from('financeiro').remove([t.comprovanteUrl])
    }

    await supabase.from(table).delete().eq('id', t.id)
    toast({ title: 'Excluído', description: 'Lançamento removido com sucesso.' })
    onRefresh()
  }

  const handleUploadComprovante = async (
    t: ExtendedTransaction,
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      const fileExt = file.name.split('.').pop()
      const filePath = `comprovantes/${t.id}_${Date.now()}.${fileExt}`
      const { error: uploadError } = await supabase.storage
        .from('financeiro')
        .upload(filePath, file)
      if (uploadError) throw uploadError

      const table = t.type === 'receita' ? 'contas_receber' : 'contas_pagar'
      await supabase.from(table).update({ comprovante_url: filePath }).eq('id', t.id)

      toast({ title: 'Sucesso', description: 'Comprovante anexado!' })
      onRefresh()
    } catch (error: any) {
      toast({ title: 'Erro ao anexar', description: error.message, variant: 'destructive' })
    } finally {
      if (e.target) e.target.value = ''
    }
  }

  const handleRemoveComprovante = async (t: ExtendedTransaction) => {
    if (!t.comprovanteUrl) return
    if (!confirm('Deseja remover o comprovante deste lançamento?')) return
    try {
      await supabase.storage.from('financeiro').remove([t.comprovanteUrl])
      const table = t.type === 'receita' ? 'contas_receber' : 'contas_pagar'
      await supabase.from(table).update({ comprovante_url: null }).eq('id', t.id)
      toast({ title: 'Removido', description: 'Comprovante removido do registro.' })
      onRefresh()
    } catch (error: any) {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' })
    }
  }

  const getPublicUrl = (path: string) => {
    return supabase.storage.from('financeiro').getPublicUrl(path).data.publicUrl
  }

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val)

  const allEligibleSelected =
    eligibleTransactions.length > 0 && selectedIds.size === eligibleTransactions.length

  return (
    <div className="space-y-6">
      <AgruparContasDialog
        open={agruparOpen}
        onOpenChange={setAgruparOpen}
        selectedTransactions={selectedTransactions}
        onSuccess={handleGroupSuccess}
      />

      <div className="bg-gradient-to-r from-emerald-500/10 to-teal-500/10 p-4 rounded-xl border border-emerald-500/20 flex flex-col sm:flex-row justify-between items-center gap-4">
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-emerald-600" />
          <div>
            <h3 className="font-semibold text-emerald-900">Edith Leitura Inteligente</h3>
            <p className="text-sm text-emerald-700/80">
              Anexe um boleto ou nota fiscal para a Edith extrair os dados e lançar automaticamente.
            </p>
          </div>
        </div>
        <div className="relative shrink-0">
          <Input
            type="file"
            id="ocr-upload"
            className="hidden"
            accept="image/*,application/pdf"
            onChange={handleFileUpload}
          />
          <Button
            asChild
            variant="outline"
            className="cursor-pointer bg-white"
            disabled={isProcessing}
          >
            <label htmlFor="ocr-upload">
              <Upload className="h-4 w-4 mr-2" />{' '}
              {isProcessing ? 'Lendo...' : 'Ler Documento (OCR)'}
            </label>
          </Button>
        </div>
      </div>

      {selectedIds.size > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 flex flex-col sm:flex-row items-center justify-between gap-3 animate-fade-in">
          <div className="text-sm text-blue-800">
            <strong>{selectedIds.size}</strong> conta(s) selecionada(s)
            {!canGroup && selectedIds.size >= 2 && (
              <span className="ml-2 text-amber-600 font-medium">
                ⚠ Selecione contas do mesmo fornecedor para agrupar
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setSelectedIds(new Set())}>
              Limpar seleção
            </Button>
            <Button
              size="sm"
              className="bg-blue-600 hover:bg-blue-700 text-white"
              disabled={!canGroup}
              onClick={() => setAgruparOpen(true)}
            >
              <Layers className="h-4 w-4 mr-2" />
              Agrupar para Pagamento
            </Button>
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border p-4">
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-semibold text-lg">Lançamentos Financeiros</h3>
        </div>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[40px]">
                  <Checkbox
                    checked={allEligibleSelected}
                    onCheckedChange={toggleSelectAll}
                    aria-label="Selecionar todas elegíveis"
                  />
                </TableHead>
                <TableHead>Data Inserção</TableHead>
                <TableHead>Vencimento</TableHead>
                <TableHead>Recebimento/Pgto</TableHead>
                <TableHead>Credor / Devedor</TableHead>
                <TableHead>Referência</TableHead>
                <TableHead>Categoria</TableHead>
                <TableHead>Meio Pgto</TableHead>
                <TableHead>Antecipado</TableHead>
                <TableHead>Valor</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-[110px]">Anexo</TableHead>
                <TableHead className="w-[100px]">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {transactions.map((t) => {
                const eligible = isEligibleForGrouping(t)
                return (
                  <TableRow key={t.id}>
                    <TableCell>
                      {eligible && (
                        <Checkbox
                          checked={selectedIds.has(t.id)}
                          onCheckedChange={() => toggleSelection(t.id)}
                          aria-label={`Selecionar ${t.entityName}`}
                        />
                      )}
                    </TableCell>
                    <TableCell className="text-gray-500 text-xs">
                      {format(parseISO(t.createdAt), 'dd/MM/yyyy')}
                    </TableCell>
                    <TableCell className="font-medium whitespace-nowrap">
                      {format(parseISO(t.dueDate), 'dd/MM/yyyy')}
                    </TableCell>
                    <TableCell className="font-medium text-gray-600 whitespace-nowrap">
                      {t.paidDate ? format(parseISO(t.paidDate), 'dd/MM/yyyy') : '-'}
                    </TableCell>
                    <TableCell className="font-medium text-gray-900">{t.entityName}</TableCell>
                    <TableCell
                      className="text-gray-600 max-w-[150px] truncate"
                      title={t.description}
                    >
                      {t.description}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="font-normal text-[10px]">
                        {t.category || '-'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-gray-600">
                      {t.meioPagamento || '-'}
                    </TableCell>
                    <TableCell>
                      {t.antecipado ? (
                        <Badge
                          variant="secondary"
                          className="bg-amber-100 text-amber-800 border-amber-200 text-[10px]"
                        >
                          Sim
                        </Badge>
                      ) : (
                        '-'
                      )}
                    </TableCell>
                    <TableCell
                      className={
                        t.type === 'receita'
                          ? 'text-emerald-600 font-bold whitespace-nowrap'
                          : 'text-rose-600 font-bold whitespace-nowrap'
                      }
                    >
                      {t.type === 'receita' ? '+' : '-'} {formatCurrency(t.amount)}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={t.status === 'pago' ? 'default' : 'secondary'}
                        className={t.status === 'pago' ? 'bg-emerald-500 text-white' : ''}
                      >
                        {t.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {t.comprovanteUrl ? (
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 hover:bg-blue-50"
                            asChild
                          >
                            <a
                              href={getPublicUrl(t.comprovanteUrl)}
                              target="_blank"
                              rel="noreferrer"
                              title="Ver Anexo"
                            >
                              <Eye className="h-4 w-4 text-blue-600" />
                            </a>
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 hover:bg-red-50"
                            onClick={() => handleRemoveComprovante(t)}
                            title="Remover Anexo"
                          >
                            <X className="h-4 w-4 text-red-500" />
                          </Button>
                        </div>
                      ) : (
                        <label className="cursor-pointer text-blue-500 hover:text-blue-700 flex items-center gap-1 text-xs px-2 py-1 rounded hover:bg-blue-50 transition-colors">
                          <Paperclip className="h-3 w-3" /> Anexar
                          <input
                            type="file"
                            className="hidden"
                            accept="image/*,application/pdf"
                            onChange={(e) => handleUploadComprovante(t, e)}
                          />
                        </label>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => togglePayment(t)}
                          className="text-gray-400 hover:text-emerald-600 transition-colors p-1"
                          title={t.status === 'pago' ? 'Desfazer Pagamento' : 'Confirmar Pagamento'}
                        >
                          {t.status === 'pago' ? (
                            <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                          ) : (
                            <Circle className="h-5 w-5" />
                          )}
                        </button>
                        <button
                          onClick={() => handleDelete(t)}
                          className="text-gray-400 hover:text-red-600 transition-colors p-1"
                          title="Excluir Lançamento"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  )
}
