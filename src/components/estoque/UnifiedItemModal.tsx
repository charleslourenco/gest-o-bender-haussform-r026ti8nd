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
import { Checkbox } from '@/components/ui/checkbox'
import { Loader2 } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { supabase } from '@/lib/supabase/client'
import { saveUnifiedItem, UnifiedItemData } from '@/services/unified-item'
import { MatchedItem } from '@/services/estoque-matching'

interface UnifiedItemModalProps {
  isOpen: boolean
  onClose: () => void
  mode: 'create' | 'edit'
  notaId: string
  notaFornecedor?: string
  ocrItem?: MatchedItem | null
  realIdx?: number
  onSaved: () => void
}

const EMPTY_FORM: UnifiedItemData = {
  nome: '',
  marca: '',
  cor: '',
  espessura_mm: '',
  largura_mm: '',
  comprimento_m: '',
  fornecedor: '',
  unidade: 'un',
  valor_unitario: 0,
  quantidade: 1,
  categoria: '',
  classe: '',
  grupo: '',
}

export function UnifiedItemModal({
  isOpen,
  onClose,
  mode,
  notaId,
  notaFornecedor,
  ocrItem,
  realIdx,
  onSaved,
}: UnifiedItemModalProps) {
  const { toast } = useToast()
  const [saving, setSaving] = useState(false)
  const [lembrar, setLembrar] = useState(true)
  const [form, setForm] = useState<UnifiedItemData>(EMPTY_FORM)

  useEffect(() => {
    if (!isOpen) return
    if (mode === 'edit' && ocrItem) {
      const meta = ocrItem.metadados_normalizados || {}
      setForm({
        nome: ocrItem.produto || '',
        marca: meta.marca || '',
        cor: meta.cor || '',
        espessura_mm: meta.espessura_mm?.toString() || '',
        largura_mm: meta.largura_mm?.toString() || '',
        comprimento_m: meta.comprimento_m?.toString() || '',
        fornecedor: notaFornecedor || '',
        unidade: meta.unidade || 'un',
        valor_unitario: ocrItem.preco_unitario || 0,
        quantidade: ocrItem.quantidade || 1,
        categoria: meta.categoria || '',
        classe: meta.classe || '',
        grupo: meta.grupo || '',
      })
    } else {
      setForm({ ...EMPTY_FORM, fornecedor: notaFornecedor || '' })
    }
  }, [isOpen, mode, ocrItem, notaFornecedor])

  const setField = (key: keyof UnifiedItemData, value: any) =>
    setForm((prev) => ({ ...prev, [key]: value }))

  const handleSave = async () => {
    if (!form.nome.trim()) {
      toast({ title: 'Nome do item é obrigatório', variant: 'destructive' })
      return
    }
    if (!form.unidade.trim()) {
      toast({ title: 'Unidade é obrigatória', variant: 'destructive' })
      return
    }
    if (isNaN(Number(form.valor_unitario)) || Number(form.valor_unitario) < 0) {
      toast({ title: 'Valor unitário inválido', variant: 'destructive' })
      return
    }

    setSaving(true)
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      const { error } = await saveUnifiedItem({
        data: form,
        notaId,
        mode,
        realIdx,
        ocrProduto: ocrItem?.produto,
        lembrar,
        userId: user?.id,
      })

      if (error) throw new Error(error)

      toast({
        title: mode === 'edit' ? 'Item cadastrado e associado!' : 'Item adicionado com sucesso!',
        description: 'Estoque e nota fiscal atualizados.',
      })
      onSaved()
    } catch (e: any) {
      toast({ title: 'Erro', description: e.message, variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[560px]">
        <DialogHeader>
          <DialogTitle>
            {mode === 'edit' ? 'Cadastrar Novo Item' : 'Adicionar Item Manualmente'}
          </DialogTitle>
          <DialogDescription>
            {mode === 'edit'
              ? 'Cadastre um novo produto no estoque com os dados extraídos da nota fiscal.'
              : 'Adicione um item manualmente à nota fiscal e ao estoque.'}
          </DialogDescription>
        </DialogHeader>

        {mode === 'edit' && ocrItem?.produto && (
          <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900/50 rounded-lg p-3">
            <p className="text-xs font-semibold text-blue-800 dark:text-blue-300 mb-1">
              Texto lido pela OCR:
            </p>
            <p className="text-sm text-blue-900 dark:text-blue-200 font-mono break-words">
              {ocrItem.produto}
            </p>
          </div>
        )}

        <div className="space-y-3 max-h-[50vh] overflow-y-auto">
          <div className="space-y-1">
            <Label>Nome do Item *</Label>
            <Input
              value={form.nome}
              onChange={(e) => setField('nome', e.target.value)}
              autoFocus
              className="border-slate-400 dark:border-slate-500 focus-visible:ring-2 focus-visible:ring-emerald-500"
            />
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
          <div className="grid grid-cols-2 gap-3">
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
              <Label>Quantidade</Label>
              <Input
                type="number"
                min="1"
                value={form.quantidade}
                onChange={(e) => setField('quantidade', Number(e.target.value))}
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
          {mode === 'edit' && (
            <label className="flex items-center gap-2 cursor-pointer">
              <Checkbox checked={lembrar} onCheckedChange={(c) => setLembrar(!!c)} />
              <span className="text-xs text-slate-600 dark:text-slate-400">
                Lembrar desta associação para futuras notas
              </span>
            </label>
          )}
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
            Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
