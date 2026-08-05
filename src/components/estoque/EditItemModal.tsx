import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Loader2 } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { supabase } from '@/lib/supabase/client'

export interface EditItemData {
  id: string
  nome: string
  marca: string
  cor: string
  espessura_mm: string
  largura_mm: string
  comprimento_m: string
  fornecedor: string
  unidade: string
  valor_unitario: number
  estoque_minimo: number
  quantidade: number
  categoria: string
  classe: string
  grupo: string
  terceirizado: boolean
}

interface EditItemModalProps {
  isOpen: boolean
  onClose: () => void
  item: any
  onSaved: () => void
}

export function EditItemModal({ isOpen, onClose, item, onSaved }: EditItemModalProps) {
  const { toast } = useToast()
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState<EditItemData | null>(null)

  useEffect(() => {
    if (!isOpen || !item) return
    setForm({
      id: item.id,
      nome: item.nome || '',
      marca: item.marca || '',
      cor: item.cor || '',
      espessura_mm: item.espessura_mm?.toString() || '',
      largura_mm: item.largura_mm?.toString() || '',
      comprimento_m: item.comprimento_m?.toString() || '',
      fornecedor: item.fornecedor || '',
      unidade: item.unidade || 'un',
      valor_unitario: Number(item.valor_unitario) || 0,
      estoque_minimo: Number(item.estoque_minimo) || 0,
      quantidade: Number(item.quantidade) || 0,
      categoria: item.categoria || '',
      classe: item.classe || '',
      grupo: item.grupo || '',
      terceirizado: !!item.terceirizado,
    })
  }, [isOpen, item])

  const setField = (key: keyof EditItemData, value: any) =>
    setForm((prev) => (prev ? { ...prev, [key]: value } : prev))

  const handleSave = async () => {
    if (!form) return
    if (!form.nome.trim()) {
      toast({ title: 'Nome do item é obrigatório', variant: 'destructive' })
      return
    }
    if (!form.unidade.trim()) {
      toast({ title: 'Unidade é obrigatória', variant: 'destructive' })
      return
    }

    setSaving(true)
    try {
      const { error } = await supabase
        .from('estoque_itens')
        .update({
          nome: form.nome.trim(),
          marca: form.marca || null,
          cor: form.cor || null,
          espessura_mm: form.espessura_mm ? Number(form.espessura_mm) : null,
          largura_mm: form.largura_mm ? Number(form.largura_mm) : null,
          comprimento_m: form.comprimento_m ? Number(form.comprimento_m) : null,
          fornecedor: form.fornecedor || null,
          unidade: form.unidade,
          valor_unitario: Number(form.valor_unitario),
          estoque_minimo: Number(form.estoque_minimo),
          quantidade: Number(form.quantidade),
          categoria: form.categoria || null,
          classe: form.classe || null,
          grupo: form.grupo || null,
          terceirizado: form.terceirizado,
          atualizado_em: new Date().toISOString(),
        })
        .eq('id', form.id)

      if (error) throw new Error(error.message)

      toast({
        title: 'Item atualizado!',
        description: 'As alterações foram salvas no estoque.',
      })
      onSaved()
    } catch (e: any) {
      toast({ title: 'Erro', description: e.message, variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  if (!form) return null

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[560px]">
        <DialogHeader>
          <DialogTitle>Editar Item</DialogTitle>
          <DialogDescription>
            Altere os dados do item de estoque. As mudanças serão salvas no banco de dados.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 max-h-[55vh] overflow-y-auto pr-1">
          <div className="space-y-1">
            <Label>Nome do Item *</Label>
            <Input value={form.nome} onChange={(e) => setField('nome', e.target.value)} autoFocus />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Marca</Label>
              <Input value={form.marca} onChange={(e) => setField('marca', e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>Cor</Label>
              <Input value={form.cor} onChange={(e) => setField('cor', e.target.value)} />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1">
              <Label>Espessura (mm)</Label>
              <Input
                type="number"
                value={form.espessura_mm}
                onChange={(e) => setField('espessura_mm', e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label>Largura (mm)</Label>
              <Input
                type="number"
                value={form.largura_mm}
                onChange={(e) => setField('largura_mm', e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label>Comprimento (m)</Label>
              <Input
                type="number"
                value={form.comprimento_m}
                onChange={(e) => setField('comprimento_m', e.target.value)}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Fornecedor</Label>
              <Input
                value={form.fornecedor}
                onChange={(e) => setField('fornecedor', e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label>Unidade *</Label>
              <Input
                value={form.unidade}
                onChange={(e) => setField('unidade', e.target.value)}
                placeholder="un, chapa, rolo..."
              />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1">
              <Label>Quantidade</Label>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={form.quantidade}
                onChange={(e) => setField('quantidade', Number(e.target.value))}
              />
            </div>
            <div className="space-y-1">
              <Label>Valor Unit. (R$) *</Label>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={form.valor_unitario}
                onChange={(e) => setField('valor_unitario', Number(e.target.value))}
              />
            </div>
            <div className="space-y-1">
              <Label>Estoque Mínimo</Label>
              <Input
                type="number"
                min="0"
                value={form.estoque_minimo}
                onChange={(e) => setField('estoque_minimo', Number(e.target.value))}
              />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1">
              <Label>Categoria</Label>
              <Input
                value={form.categoria}
                onChange={(e) => setField('categoria', e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label>Classe</Label>
              <Input value={form.classe} onChange={(e) => setField('classe', e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>Grupo</Label>
              <Input value={form.grupo} onChange={(e) => setField('grupo', e.target.value)} />
            </div>
          </div>
          <div className="flex items-center space-x-2 pt-2">
            <Switch
              id="edit-terceirizado"
              checked={form.terceirizado}
              onCheckedChange={(c) => setField('terceirizado', !!c)}
            />
            <Label
              htmlFor="edit-terceirizado"
              className="cursor-pointer text-purple-700 font-medium"
            >
              Item terceirizado (Ex: Vidros, Pedras)
            </Label>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Cancelar
          </Button>
          <Button
            onClick={handleSave}
            disabled={saving}
            className="bg-emerald-600 hover:bg-emerald-700 text-white"
          >
            {saving && <Loader2 className="w-4 h-4 mr-1 animate-spin" />}
            Salvar Alterações
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
