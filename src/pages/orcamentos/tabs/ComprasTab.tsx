import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase/client'
import { Badge } from '@/components/ui/badge'
import { ShoppingCart } from 'lucide-react'

export function ComprasTab({ orcamentoId }: { orcamentoId: string }) {
  const [lista, setLista] = useState<any[]>([])

  useEffect(() => {
    async function load() {
      const { data: ambientes } = await supabase
        .from('orcamentos_ambientes')
        .select('id')
        .eq('orcamento_id', orcamentoId)
      if (!ambientes || ambientes.length === 0) return

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
        setLista(Array.from(map.values()))
      }
    }
    load()
  }, [orcamentoId])

  return (
    <div className="space-y-6 max-w-5xl mx-auto h-full p-2">
      <div className="bg-background p-6 border rounded-xl shadow-sm">
        <h2 className="text-xl font-bold flex items-center gap-2 mb-6">
          <ShoppingCart className="w-5 h-5" /> Lista de Materiais Consolidados
        </h2>
        <div className="overflow-x-auto border rounded-lg">
          <table className="w-full text-sm text-left">
            <thead className="bg-muted/50 border-b">
              <tr>
                <th className="p-4 font-semibold">Item / Insumo</th>
                <th className="p-4 w-32 font-semibold text-center">Qtd Necessária</th>
                <th className="p-4 w-32 font-semibold text-center">Saldo Estoque</th>
                <th className="p-4 w-24 font-semibold text-center">Unidade</th>
                <th className="p-4 w-48 text-right font-semibold">Status da Compra</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {lista.map((item, idx) => {
                let badge = null
                if (item.isAvulso) {
                  badge = (
                    <Badge
                      variant="destructive"
                      className="bg-red-500/10 text-red-600 border-red-500/20 hover:bg-red-500/20"
                    >
                      Item Avulso (Cotar)
                    </Badge>
                  )
                } else if (item.qtdNecessaria > item.qtdEstoque) {
                  badge = (
                    <Badge
                      variant="outline"
                      className="bg-amber-500/10 text-amber-600 border-amber-500/20 hover:bg-amber-500/20"
                    >
                      Comprar Saldo (Faltam {item.qtdNecessaria - item.qtdEstoque})
                    </Badge>
                  )
                } else {
                  badge = (
                    <Badge
                      variant="outline"
                      className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 hover:bg-emerald-500/20"
                    >
                      Disponível no Estoque
                    </Badge>
                  )
                }

                return (
                  <tr key={idx} className="hover:bg-accent/30 transition-colors">
                    <td className="p-4">
                      <span className="font-medium block">{item.nome}</span>
                      {!item.isAvulso && (
                        <span className="text-xs text-muted-foreground">
                          ID: {item.id.substring(0, 8)}
                        </span>
                      )}
                    </td>
                    <td className="p-4 text-center font-bold">{item.qtdNecessaria}</td>
                    <td className="p-4 text-center text-muted-foreground">
                      {item.isAvulso ? '-' : item.qtdEstoque}
                    </td>
                    <td className="p-4 text-center text-muted-foreground">{item.unidade}</td>
                    <td className="p-4 text-right">{badge}</td>
                  </tr>
                )
              })}
              {lista.length === 0 && (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-muted-foreground">
                    Nenhum material listado neste projeto.
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
