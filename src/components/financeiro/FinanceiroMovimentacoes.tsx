import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Group, Plus } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { AgruparContasDialog } from '@/components/financeiro/AgruparContasDialog'
import { ContasPagarTable } from '@/components/financeiro/ContasPagarTable'
import { NovaContaPagarSheet } from '@/components/financeiro/NovaContaPagarSheet'
import { NovaContaReceberSheet } from '@/components/financeiro/NovaContaReceberSheet'
import { supabase } from '@/lib/supabase/client'
import { formatCurrency } from '@/lib/utils'

export interface ExtendedTransaction {
  id: string
  tipo: 'pagar' | 'receber'
  fornecedor?: string
  descricao: string | null
  categoria: string | null
  valor: number
  data_vencimento: string | null
  data_pagamento: string | null
  status_pagamento: string
  comprovante_url: string | null
  nota_fiscal_id: string | null
}

export function FinanceiroMovimentacoes() {
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [showAgrupar, setShowAgrupar] = useState(false)
  const [showNovaPagar, setShowNovaPagar] = useState(false)
  const [showNovaReceber, setShowNovaReceber] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)
  const { toast } = useToast()

  function handleGrouped() {
    setShowAgrupar(false)
    setSelectedIds([])
    setRefreshKey((prev) => prev + 1)
    toast({ title: 'Contas agrupadas com sucesso!' })
  }

  return (
    <div className="space-y-4">
      <Tabs defaultValue="pagar">
        <TabsList>
          <TabsTrigger value="pagar">Contas a Pagar</TabsTrigger>
          <TabsTrigger value="receber">Contas a Receber</TabsTrigger>
        </TabsList>
        <TabsContent value="pagar">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Contas a Pagar</CardTitle>
              <div className="flex gap-2">
                {selectedIds.length >= 2 && (
                  <Button variant="outline" size="sm" onClick={() => setShowAgrupar(true)}>
                    <Group className="w-4 h-4 mr-1" /> Agrupar ({selectedIds.length})
                  </Button>
                )}
                <Button size="sm" onClick={() => setShowNovaPagar(true)}>
                  <Plus className="w-4 h-4 mr-1" /> Nova Conta
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <ContasPagarTable
                selectedIds={selectedIds}
                onSelectionChange={setSelectedIds}
                refreshKey={refreshKey}
              />
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="receber">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Contas a Receber</CardTitle>
              <Button size="sm" onClick={() => setShowNovaReceber(true)}>
                <Plus className="w-4 h-4 mr-1" /> Nova Conta
              </Button>
            </CardHeader>
            <CardContent>
              <ContasReceberList />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      <AgruparContasDialog
        open={showAgrupar}
        onOpenChange={setShowAgrupar}
        selectedIds={selectedIds}
        onGrouped={handleGrouped}
      />
      <NovaContaPagarSheet open={showNovaPagar} onOpenChange={setShowNovaPagar} />
      <NovaContaReceberSheet open={showNovaReceber} onOpenChange={setShowNovaReceber} />
    </div>
  )
}

function ContasReceberList() {
  const [contas, setContas] = useState<any[]>([])

  useEffect(() => {
    supabase
      .from('contas_receber')
      .select('*')
      .order('criado_em', { ascending: false })
      .then(({ data }) => setContas(data || []))
  }, [])

  if (contas.length === 0) {
    return <p className="text-center py-4 text-sm text-gray-500">Nenhuma conta a receber.</p>
  }

  return (
    <div className="space-y-2">
      {contas.map((conta) => (
        <div key={conta.id} className="border rounded-lg p-3 flex items-center justify-between">
          <div>
            <p className="font-medium text-sm">{conta.descricao || 'Conta a Receber'}</p>
            <p className="text-xs text-gray-500">
              {conta.numero_parcela} • Venc:{' '}
              {conta.data_vencimento
                ? new Date(conta.data_vencimento).toLocaleDateString('pt-BR')
                : '-'}
            </p>
          </div>
          <div className="text-right">
            <p className="font-bold text-sm">{formatCurrency(conta.valor)}</p>
            <span className="text-xs text-gray-500">{conta.status_pagamento}</span>
          </div>
        </div>
      ))}
    </div>
  )
}
