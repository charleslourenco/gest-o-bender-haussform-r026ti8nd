import { useState, useEffect } from 'react'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { supabase } from '@/lib/supabase/client'
import { useToast } from '@/hooks/use-toast'

export function AddItemSheet({ ambienteId, markupGlobal, onClose, onSuccess }: any) {
  const [estoque, setEstoque] = useState<any[]>([])
  const [search, setSearch] = useState('')
  const [avulso, setAvulso] = useState({ nome: '', qtd: 1, un: 'un', custo: 0 })
  const { toast } = useToast()

  useEffect(() => {
    if (ambienteId) {
      supabase
        .from('estoque_itens')
        .select('id, nome, valor_unitario, unidade')
        .then(({ data }) => {
          if (data) setEstoque(data)
        })
      setSearch('')
      setAvulso({ nome: '', qtd: 1, un: 'un', custo: 0 })
    }
  }, [ambienteId])

  const filtered = estoque
    .filter((e) => e.nome.toLowerCase().includes(search.toLowerCase()))
    .slice(0, 15)

  const handleAddEstoque = async (item: any) => {
    await supabase.from('orcamentos_itens').insert({
      ambiente_id: ambienteId,
      item_estoque_id: item.id,
      nome_item: item.nome,
      quantidade: 1,
      unidade_medida: item.unidade,
      custo_unitario: item.valor_unitario,
      markup: markupGlobal,
    })
    toast({ title: 'Item do estoque adicionado' })
    onSuccess()
    onClose()
  }

  const handleAddAvulso = async () => {
    await supabase.from('orcamentos_itens').insert({
      ambiente_id: ambienteId,
      nome_item: avulso.nome,
      quantidade: avulso.qtd,
      unidade_medida: avulso.un,
      custo_unitario: avulso.custo,
      markup: markupGlobal,
    })
    toast({ title: 'Item avulso adicionado' })
    onSuccess()
    onClose()
  }

  return (
    <Sheet open={!!ambienteId} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-[400px] sm:w-[540px] flex flex-col p-6">
        <SheetHeader>
          <SheetTitle className="text-xl font-serif">Adicionar Item Manual</SheetTitle>
        </SheetHeader>
        <Tabs defaultValue="estoque" className="mt-6 flex-1 flex flex-col min-h-0">
          <TabsList className="w-full">
            <TabsTrigger value="estoque" className="flex-1">
              Buscar no Estoque
            </TabsTrigger>
            <TabsTrigger value="avulso" className="flex-1">
              Item Avulso / Fora do Estoque
            </TabsTrigger>
          </TabsList>

          <TabsContent value="estoque" className="flex-1 flex flex-col space-y-4 pt-4 min-h-0">
            <Input
              placeholder="Pesquisar nome do produto no estoque..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="bg-accent/30"
              autoFocus
            />
            <div className="flex-1 overflow-auto space-y-2 pr-2 pb-4">
              {filtered.map((e) => (
                <div
                  key={e.id}
                  className="flex justify-between items-center p-3 border rounded-lg hover:bg-accent/50 transition-colors"
                >
                  <div className="flex flex-col">
                    <span className="font-medium text-sm text-foreground">{e.nome}</span>
                    <span className="text-xs text-muted-foreground mt-0.5">
                      Unidade: {e.unidade} | Custo: R$ {e.valor_unitario}
                    </span>
                  </div>
                  <Button size="sm" variant="secondary" onClick={() => handleAddEstoque(e)}>
                    Adicionar
                  </Button>
                </div>
              ))}
              {filtered.length === 0 && search && (
                <p className="text-sm text-center text-muted-foreground pt-8">
                  Nenhum item encontrado no estoque com este nome.
                </p>
              )}
            </div>
          </TabsContent>

          <TabsContent value="avulso" className="space-y-4 pt-4">
            <div className="space-y-4 bg-muted/20 p-5 rounded-xl border">
              <div>
                <label className="text-sm font-medium mb-1.5 block">Nome do Item</label>
                <Input
                  placeholder="Ex: Vidro Reflecta Bronze"
                  value={avulso.nome}
                  onChange={(e) => setAvulso({ ...avulso, nome: e.target.value })}
                />
              </div>
              <div className="flex gap-4">
                <div className="flex-1">
                  <label className="text-sm font-medium mb-1.5 block">Quantidade</label>
                  <Input
                    type="number"
                    value={avulso.qtd}
                    onChange={(e) => setAvulso({ ...avulso, qtd: Number(e.target.value) })}
                  />
                </div>
                <div className="flex-1">
                  <label className="text-sm font-medium mb-1.5 block">Un. Medida</label>
                  <Input
                    placeholder="Ex: m2"
                    value={avulso.un}
                    onChange={(e) => setAvulso({ ...avulso, un: e.target.value })}
                  />
                </div>
              </div>
              <div>
                <label className="text-sm font-medium mb-1.5 block">Custo Unitário (R$)</label>
                <Input
                  type="number"
                  step="0.01"
                  value={avulso.custo}
                  onChange={(e) => setAvulso({ ...avulso, custo: Number(e.target.value) })}
                />
              </div>
              <Button
                className="w-full mt-4 h-11"
                onClick={handleAddAvulso}
                disabled={!avulso.nome || avulso.nome.trim() === ''}
              >
                Adicionar Item ao Orçamento
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </SheetContent>
    </Sheet>
  )
}
