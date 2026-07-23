import { useState } from 'react'
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
import { Loader2, Plus } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { supabase } from '@/lib/supabase/client'
import { insertItemNotaFiscal } from '@/services/itens-nota-fiscal'
import { MatchedItem } from '@/services/estoque-matching'

interface AdicionarItemManualModalProps {
  isOpen: boolean
  onClose: () => void
  notaId: string
  onSaved: () => void
}

export function AdicionarItemManualModal({
  isOpen,
  onClose,
  notaId,
  onSaved,
}: AdicionarItemManualModalProps) {
  const { toast } = useToast()
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    nome: '',
    quantidade: 1,
    unidade: 'UN',
    valor_unitario: 0,
  })

  const setField = (key: string, value: any) => setForm((prev) => ({ ...prev, [key]: value }))

  const handleSave = async () => {
    if (!form.nome.trim()) {
      toast({ title: 'Nome do produto é obrigatório', variant: 'destructive' })
      return
    }
    if (Number(form.quantidade) <= 0) {
      toast({ title: 'Quantidade deve ser maior que zero', variant: 'destructive' })
      return
    }
    setSaving(true)
    try {
      const { error } = await insertItemNotaFiscal({
        nota_fiscal_id: notaId,
        nome_produto: form.nome.trim(),
        quantidade: Number(form.quantidade),
        unidade: form.unidade || 'UN',
        valor_unitario: Number(form.valor_unitario),
      })
      if (error) throw new Error(error)

      const { data: notaData } = await supabase
        .from('notas_fiscais')
        .select('dados_ocr')
        .eq('id', notaId)
        .single()

      if (notaData?.dados_ocr) {
        const itens = [...(notaData.dados_ocr.itens || [])]
        const newItem: MatchedItem = {
          produto: form.nome.trim(),
          quantidade: Number(form.quantidade),
          preco_unitario: Number(form.valor_unitario),
          metadados_normalizados: {},
          status: 'pendente_revisao',
          item_id: null,
          source: 'none',
          confianca: 'BAIXA',
          score: 0,
        }
        itens.push(newItem)

        const stillPending = itens.filter(
          (i: MatchedItem) => i.status === 'pendente_revisao',
        ).length
        const novoStatus = stillPending === 0 ? 'conciliado' : 'pendente_revisao'

        await supabase
          .from('notas_fiscais')
          .update({
            dados_ocr: { ...notaData.dados_ocr, itens },
            status_reconciliacao: novoStatus,
          })
          .eq('id', notaId)
      }

      toast({ title: 'Item adicionado!', description: 'O item foi incluído na nota fiscal.' })
      setForm({ nome: '', quantidade: 1, unidade: 'UN', valor_unitario: 0 })
      onSaved()
    } catch (e: any) {
      toast({ title: 'Erro', description: e.message, variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  const handleClose = () => {
    setForm({ nome: '', quantidade: 1, unidade: 'UN', valor_unitario: 0 })
    onClose()
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="sm:max-w-[450px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plus className="w-5 h-5 text-emerald-600" />
            Adicionar Item Manualmente
          </DialogTitle>
          <DialogDescription>
            Adicione um item que a OCR não conseguiu ler. Ele será incluído na lista de revisão
            desta nota fiscal.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="space-y-1">
            <Label>Nome do Produto *</Label>
            <Input
              value={form.nome}
              onChange={(e) => setField('nome', e.target.value)}
              placeholder="Digite o nome do produto"
              autoFocus
              className="border-slate-400 dark:border-slate-500 focus-visible:ring-2 focus-visible:ring-emerald-500"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Quantidade *</Label>
              <Input
                type="number"
                min="1"
                step="1"
                value={form.quantidade}
                onChange={(e) => setField('quantidade', Number(e.target.value))}
                className="border-slate-300 dark:border-slate-600"
              />
            </div>
            <div className="space-y-1">
              <Label>Unidade</Label>
              <Input
                value={form.unidade}
                onChange={(e) => setField('unidade', e.target.value)}
                placeholder="UN"
                className="border-slate-300 dark:border-slate-600"
              />
            </div>
          </div>
          <div className="space-y-1">
            <Label>Valor Unitário (R$) *</Label>
            <Input
              type="number"
              min="0"
              step="0.01"
              value={form.valor_unitario}
              onChange={(e) => setField('valor_unitario', Number(e.target.value))}
              className="border-slate-300 dark:border-slate-600"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={saving}>
            Cancelar
          </Button>
          <Button
            onClick={handleSave}
            disabled={saving}
            className="bg-emerald-600 hover:bg-emerald-700 text-white"
          >
            {saving && <Loader2 className="w-4 h-4 mr-1 animate-spin" />}
            Adicionar Item
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
