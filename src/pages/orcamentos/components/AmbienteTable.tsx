import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Trash2, Plus } from 'lucide-react'

const formatCurrency = (val: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val)

export function AmbienteTable({ amb, onUpdateItem, onDeleteItem, onAddItem }: any) {
  const subCusto = amb.itens.reduce(
    (acc: number, i: any) => acc + i.quantidade * i.custo_unitario,
    0,
  )
  const subFinal = amb.itens.reduce(
    (acc: number, i: any) => acc + i.quantidade * i.custo_unitario * i.markup,
    0,
  )

  return (
    <div className="bg-background border rounded-xl overflow-hidden shadow-sm">
      <div className="p-4 bg-accent/30 border-b flex justify-between items-center">
        <h3 className="font-bold text-lg font-serif">{amb.nome}</h3>
        <Button size="sm" variant="outline" onClick={() => onAddItem(amb.id)}>
          <Plus className="w-4 h-4 mr-2" /> Adicionar Item Manual
        </Button>
      </div>
      <div className="p-0 overflow-x-auto">
        <table className="w-full text-sm text-left">
          <thead className="bg-muted/50">
            <tr>
              <th className="p-3 w-20 text-center">Qtd</th>
              <th className="p-3 w-16 text-center">Un.</th>
              <th className="p-3">Item</th>
              <th className="p-3 w-32 text-center">Valor Unitário</th>
              <th className="p-3 w-32 text-center">Valor Total (Custo)</th>
              <th className="p-3 w-28 text-center">Markup</th>
              <th className="p-3 w-40 text-right">Valor Cliente Final</th>
              <th className="p-3 w-12"></th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {amb.itens.map((i: any) => (
              <tr key={i.id} className="hover:bg-accent/10 transition-colors group">
                <td className="p-2">
                  <Input
                    type="number"
                    value={i.quantidade}
                    onChange={(e) => onUpdateItem(i.id, 'quantidade', Number(e.target.value))}
                    className="h-9 w-16 px-2 text-center mx-auto bg-transparent border-transparent hover:border-input focus:border-input"
                  />
                </td>
                <td className="p-2 text-center text-muted-foreground">{i.unidade_medida}</td>
                <td className="p-2">
                  <Input
                    value={i.nome_item}
                    onChange={(e) => onUpdateItem(i.id, 'nome_item', e.target.value)}
                    className="h-9 border-transparent hover:border-input focus:border-input bg-transparent px-2 w-full"
                  />
                </td>
                <td className="p-2">
                  <Input
                    type="number"
                    step="0.01"
                    value={i.custo_unitario}
                    onChange={(e) => onUpdateItem(i.id, 'custo_unitario', Number(e.target.value))}
                    className="h-9 px-2 text-center bg-transparent border-transparent hover:border-input focus:border-input"
                  />
                </td>
                <td className="p-3 text-center font-medium text-muted-foreground">
                  {formatCurrency(i.quantidade * i.custo_unitario)}
                </td>
                <td className="p-2">
                  <Input
                    type="number"
                    step="0.01"
                    value={i.markup}
                    onChange={(e) => onUpdateItem(i.id, 'markup', Number(e.target.value))}
                    className={`h-9 px-2 text-center mx-auto w-20 transition-colors ${
                      i.markup_manual
                        ? 'border-amber-500/50 bg-amber-500/10 focus-visible:ring-amber-500 text-amber-700 dark:text-amber-400 font-bold'
                        : 'bg-transparent border-transparent hover:border-input focus:border-input'
                    }`}
                    title={i.markup_manual ? 'Markup alterado manualmente' : ''}
                  />
                </td>
                <td className="p-3 text-right font-bold text-primary">
                  {formatCurrency(i.quantidade * i.custo_unitario * i.markup)}
                </td>
                <td className="p-2 text-center">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={() => onDeleteItem(i.id)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </td>
              </tr>
            ))}
            {amb.itens.length === 0 && (
              <tr>
                <td colSpan={8} className="p-8 text-center text-muted-foreground">
                  Nenhum item adicionado a este ambiente ainda.
                </td>
              </tr>
            )}
          </tbody>
          <tfoot className="bg-muted/30 font-medium border-t">
            <tr>
              <td colSpan={4} className="p-4 text-right text-xs text-muted-foreground">
                SUBTOTAL CUSTO BRUTO:
              </td>
              <td className="p-4 text-sm text-center">{formatCurrency(subCusto)}</td>
              <td className="p-4 text-right text-xs font-bold uppercase tracking-wider text-primary">
                Subtotal Valor Final Cliente:
              </td>
              <td className="p-4 text-primary text-lg font-bold text-right" colSpan={2}>
                {formatCurrency(subFinal)}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  )
}
