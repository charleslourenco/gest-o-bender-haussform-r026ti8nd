import { useEffect, useState, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Building2, Plus, ArrowLeftRight, Pencil, Trash2, Landmark } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { format, parseISO } from 'date-fns'
import {
  ContaBancaria,
  TransferenciaBancaria,
  fetchContasBancarias,
  fetchTransferencias,
  deleteContaBancaria,
} from '@/services/contas-bancarias'
import { ContaBancariaFormDialog } from '@/components/financeiro/ContaBancariaFormDialog'
import { TransferenciaDialog } from '@/components/financeiro/TransferenciaDialog'

const formatCurrency = (val: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(val) || 0)

function formatSafeDate(d: string | null | undefined): string {
  if (!d) return '—'
  try {
    const parsed = parseISO(d)
    return isNaN(parsed.getTime()) ? String(d).substring(0, 10) : format(parsed, 'dd/MM/yyyy')
  } catch {
    return String(d).substring(0, 10)
  }
}

export function ContasBancariasTab() {
  const [contas, setContas] = useState<ContaBancaria[]>([])
  const [transferencias, setTransferencias] = useState<TransferenciaBancaria[]>([])
  const [loading, setLoading] = useState(true)
  const [formOpen, setFormOpen] = useState(false)
  const [transferOpen, setTransferOpen] = useState(false)
  const [editing, setEditing] = useState<ContaBancaria | null>(null)
  const { toast } = useToast()

  const load = useCallback(async () => {
    try {
      setLoading(true)
      const [c, t] = await Promise.all([fetchContasBancarias(), fetchTransferencias()])
      setContas(c)
      setTransferencias(t)
    } catch (err: any) {
      toast({ title: 'Erro', description: err.message, variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }, [toast])

  useEffect(() => {
    load()
  }, [load])

  const handleEdit = (conta: ContaBancaria) => {
    setEditing(conta)
    setFormOpen(true)
  }

  const handleNew = () => {
    setEditing(null)
    setFormOpen(true)
  }

  const handleDelete = async (conta: ContaBancaria) => {
    if (!confirm(`Excluir a conta "${conta.nome_exibicao}"?`)) return
    try {
      await deleteContaBancaria(conta.id)
      toast({ title: 'Sucesso', description: 'Conta excluída.' })
      load()
    } catch (err: any) {
      toast({ title: 'Erro', description: err.message, variant: 'destructive' })
    }
  }

  const totalGeral = contas.reduce((sum, c) => sum + (Number(c.saldo_atual) || 0), 0)
  const contaNome = (id: string) => contas.find((c) => c.id === id)?.nome_exibicao || '—'

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Landmark className="h-5 w-5 text-blue-600" /> Contas Bancárias
          </h3>
          <p className="text-sm text-gray-500">
            Saldo total consolidado:{' '}
            <strong className="text-gray-900">{formatCurrency(totalGeral)}</strong>
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setTransferOpen(true)}>
            <ArrowLeftRight className="h-4 w-4 mr-2" /> Nova Transferência
          </Button>
          <Button onClick={handleNew} className="bg-blue-600 hover:bg-blue-700 text-white">
            <Plus className="h-4 w-4 mr-2" /> Nova Conta
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="text-gray-500 animate-pulse">Carregando contas...</div>
      ) : contas.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-gray-500">
            Nenhuma conta bancária cadastrada.
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {contas.map((c) => (
            <Card key={c.id} className={c.status ? '' : 'opacity-60'}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-gray-500 flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-blue-500" />
                  {c.nome_exibicao}
                </CardTitle>
                <div className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => handleEdit(c)}
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 hover:bg-red-50"
                    onClick={() => handleDelete(c)}
                  >
                    <Trash2 className="h-3.5 w-3.5 text-red-500" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-gray-900">
                  {formatCurrency(Number(c.saldo_atual))}
                </div>
                <div className="text-xs text-gray-500 mt-2 space-y-0.5">
                  <div>Banco: {c.banco || '—'}</div>
                  <div>
                    Agência: {c.agencia || '—'} · Conta: {c.numero_conta || '—'}
                  </div>
                  <div>Saldo inicial: {formatCurrency(Number(c.saldo_inicial))}</div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {transferencias.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Transferências Recentes</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {transferencias.slice(0, 10).map((t) => (
              <div
                key={t.id}
                className="flex justify-between items-center text-sm border-b pb-2 last:border-0"
              >
                <div>
                  <span className="font-medium">{contaNome(t.conta_origem_id)}</span>
                  <span className="text-gray-400 mx-2">→</span>
                  <span className="font-medium">{contaNome(t.conta_destino_id)}</span>
                  {t.descricao && <div className="text-xs text-gray-500">{t.descricao}</div>}
                </div>
                <div className="text-right">
                  <div className="font-bold text-blue-600">{formatCurrency(Number(t.valor))}</div>
                  <div className="text-xs text-gray-500">
                    {formatSafeDate(t.data_transferencia)}
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <ContaBancariaFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        conta={editing}
        onSuccess={load}
      />
      <TransferenciaDialog
        open={transferOpen}
        onOpenChange={setTransferOpen}
        contas={contas}
        onSuccess={load}
      />
    </div>
  )
}
