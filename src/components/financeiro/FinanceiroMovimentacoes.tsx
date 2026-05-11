import React, { useState } from 'react'
import { Transaction } from '@/types'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Sparkles, Upload, CheckCircle2, Circle, Search } from 'lucide-react'
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

export function FinanceiroMovimentacoes({
  transactions,
  onRefresh,
}: {
  transactions: Transaction[]
  onRefresh: () => void
}) {
  const [isProcessing, setIsProcessing] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const { toast } = useToast()
  const { user } = useAuth()

  React.useEffect(() => {
    const handleRefresh = () => onRefresh()
    window.addEventListener('financeiro-refresh', handleRefresh)
    return () => window.removeEventListener('financeiro-refresh', handleRefresh)
  }, [onRefresh])

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setIsProcessing(true)
    const reader = new FileReader()
    reader.onload = async (ev) => {
      const base64 = ev.target?.result
      if (typeof base64 !== 'string') return
      try {
        toast({ title: 'Analisando...', description: 'Edith está extraindo dados do boleto...' })
        const { data, error } = await supabase.functions.invoke('financeiro-ai', {
          body: { action: 'ocr', payload: { imageBase64: base64 } },
        })
        if (error) throw error
        await supabase.from('contas_pagar' as any).insert({
          user_id: user?.id,
          fornecedor: data.fornecedor || 'Extração IA',
          valor: data.valor || 0,
          data_vencimento: data.data_vencimento || new Date().toISOString().split('T')[0],
          categoria: data.categoria || 'Geral',
          codigo_barras: data.codigo_barras,
          meio_pagamento: data.meio_pagamento || 'Boleto',
        })
        toast({ title: 'Sucesso', description: `Conta de ${data.fornecedor} registrada!` })
        onRefresh()
      } catch (err: any) {
        toast({ title: 'Erro', description: err.message, variant: 'destructive' })
      } finally {
        setIsProcessing(false)
      }
    }
    reader.readAsDataURL(file)
  }

  const togglePayment = async (t: Transaction) => {
    const newStatus = t.status === 'pago' ? 'aguardando' : 'pago'
    const newDate = newStatus === 'pago' ? new Date().toISOString().split('T')[0] : null
    if (t.type === 'receita') {
      await supabase
        .from('contas_receber')
        .update({ status_pagamento: newStatus, data_pagamento: newDate })
        .eq('id', t.id)
    } else {
      await supabase
        .from('contas_pagar' as any)
        .update({ status_pagamento: newStatus, data_pagamento: newDate })
        .eq('id', t.id)
    }
    onRefresh()
  }

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val)
  const filtered = transactions.filter((t) =>
    t.description.toLowerCase().includes(searchTerm.toLowerCase()),
  )

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-emerald-500/10 to-teal-500/10 p-4 rounded-xl border border-emerald-500/20 flex flex-col sm:flex-row justify-between items-center gap-4">
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-emerald-600" />
          <div>
            <h3 className="font-semibold text-emerald-900">Leitura Inteligente</h3>
            <p className="text-sm text-emerald-700/80">
              Anexe um boleto para a Edith lançar automaticamente
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
              <Upload className="h-4 w-4 mr-2" /> {isProcessing ? 'Lendo...' : 'Ler Boleto (OCR)'}
            </label>
          </Button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border p-4">
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-semibold text-lg">Lançamentos</h3>
          <div className="relative w-64">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Buscar..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Data Inserção</TableHead>
              <TableHead>Vencimento</TableHead>
              <TableHead>Credor / Devedor</TableHead>
              <TableHead>Referência</TableHead>
              <TableHead>Categoria</TableHead>
              <TableHead>Meio Pgto</TableHead>
              <TableHead>Antecipado</TableHead>
              <TableHead>Valor</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-[80px]">Ação</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((t) => (
              <TableRow key={t.id}>
                <TableCell className="text-gray-500">
                  {format(parseISO(t.createdAt), 'dd/MM/yyyy')}
                </TableCell>
                <TableCell className="font-medium">
                  {format(parseISO(t.dueDate), 'dd/MM/yyyy')}
                </TableCell>
                <TableCell className="font-medium text-gray-900">{t.entityName}</TableCell>
                <TableCell className="text-gray-600 max-w-[200px] truncate" title={t.description}>
                  {t.description}
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className="font-normal text-xs">
                    {t.category}
                  </Badge>
                </TableCell>
                <TableCell>{t.meioPagamento || '-'}</TableCell>
                <TableCell>
                  {t.antecipado ? (
                    <Badge
                      variant="secondary"
                      className="bg-amber-100 text-amber-800 border-amber-200"
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
                      ? 'text-emerald-600 font-semibold'
                      : 'text-rose-600 font-semibold'
                  }
                >
                  {t.type === 'receita' ? '+' : '-'} {formatCurrency(t.amount)}
                </TableCell>
                <TableCell>
                  <Badge
                    variant={t.status === 'pago' ? 'default' : 'secondary'}
                    className={t.status === 'pago' ? 'bg-emerald-500' : ''}
                  >
                    {t.status}
                  </Badge>
                </TableCell>
                <TableCell>
                  <button
                    onClick={() => togglePayment(t)}
                    className="text-gray-400 hover:text-emerald-600 transition-colors"
                  >
                    {t.status === 'pago' ? (
                      <CheckCircle2 className="h-6 w-6 text-emerald-500" />
                    ) : (
                      <Circle className="h-6 w-6" />
                    )}
                  </button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
