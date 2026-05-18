import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase/client'
import { Badge } from '@/components/ui/badge'
import { ShoppingCart, RefreshCcw } from 'lucide-react'
import { Button } from '@/components/ui/button'

export function ComprasTab({ orcamentoId }: { orcamentoId: string }) {
  const [lista, setLista] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const load = async () => {
    setLoading(true)
    const { data: ambientes } = await supabase
      .from('orcamentos_ambientes')
      .select('id')
      .eq('orcamento_id', orcamentoId)

    if (!ambientes || ambientes.length === 0) {
      setLista([])
      setLoading(false)
      return
    }

    const ambIds = ambientes.map((a) => a.id)
    const { data: itens } = await supabase
      .from('orcamentos_itens')
      .select('*, estoque_itens(quantidade)')
      .in('ambiente_id', ambIds)

    if (itens) {
      const map = new Map()
      for (const item of itens) {
        const key = item.item_estoque_id || item.nome_item
        if (!map.has(key)) {
          map.set(key, {
            id: item.item_estoque_id,
            nome: item.nome_item,
            unidade: item.unidade_medida,
            qtdNecessaria: 0,
            qtdEstoque: item.estoque_itens?.quantidade || 0,
            isAvulso: !item.item_estoque_id,
          })
        }
        map.get(key).qtdNecessaria += item.quantidade
      }
      setLista(
        Array.from(map.values()).sort((a, b) => {
          if (a.isAvulso === b.isAvulso) return a.nome.localeCompare(b.nome)
          return a.isAvulso ? 1 : -1
        }),
      )
    }
    setLoading(false)
  }

  useEffect(() => {
    load()

    // Configura realtime para se manter sincronizado com edições no orçamento em background
    const channel = supabase
      .channel('compras_sync')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orcamentos_itens' }, () => {
        load()
      })
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'orcamentos_ambientes' },
        () => {
          load()
        },
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [orcamentoId])

  return (
    <div className="space-y-6 max-w-5xl mx-auto h-full p-2">
      <div className="bg-background p-6 border rounded-xl shadow-sm flex flex-col">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <ShoppingCart className="w-5 h-5" /> Lista de Materiais Consolidados
          </h2>
          <Button variant="outline" size="sm" onClick={load} disabled={loading}>
            <RefreshCcw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Sincronizar
          </Button>
        </div>

        <div className="overflow-x-auto border rounded-lg">
          <table className="w-full text-sm text-left">
            <thead className="bg-muted/50 border-b">
              <tr>
                <th className="p-4 font-semibold">Código Estoque</th>
                <th className="p-4 font-semibold">Descrição do Insumo</th>
                <th className="p-4 w-32 font-semibold text-center">Qtd Total Necessária</th>
                <th className="p-4 w-24 font-semibold text-center">Unidade</th>
                <th className="p-4 w-52 text-right font-semibold">Status do Estoque</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {lista.map((item, idx) => {
                let badge = null
                if (item.isAvulso) {
                  badge = (
                    <Badge
                      variant="destructive"
                      className="bg-red-500/10 text-red-600 border-red-500/20 hover:bg-red-500/20 whitespace-nowrap"
                    >
                      Item Avulso (Requer Cotação)
                    </Badge>
                  )
                } else if (item.qtdNecessaria > item.qtdEstoque) {
                  badge = (
                    <Badge
                      variant="outline"
                      className="bg-amber-500/10 text-amber-600 border-amber-500/20 hover:bg-amber-500/20 whitespace-nowrap"
                    >
                      Comprar Saldo (Faltam {item.qtdNecessaria - item.qtdEstoque})
                    </Badge>
                  )
                } else {
                  badge = (
                    <Badge
                      variant="outline"
                      className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 hover:bg-emerald-500/20 whitespace-nowrap"
                    >
                      Disponível
                    </Badge>
                  )
                }

                return (
                  <tr key={idx} className="hover:bg-accent/30 transition-colors">
                    <td className="p-4 text-muted-foreground font-mono text-xs uppercase">
                      {item.isAvulso ? '-' : item.id.substring(0, 8)}
                    </td>
                    <td className="p-4 font-medium">{item.nome}</td>
                    <td className="p-4 text-center font-bold text-base">{item.qtdNecessaria}</td>
                    <td className="p-4 text-center text-muted-foreground">{item.unidade}</td>
                    <td className="p-4 text-right">{badge}</td>
                  </tr>
                )
              })}
              {lista.length === 0 && !loading && (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-muted-foreground">
                    Nenhum material listado neste projeto ainda.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
