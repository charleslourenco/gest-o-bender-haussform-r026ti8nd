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
import { Checkbox } from '@/components/ui/checkbox'
import { Loader2 } from 'lucide-react'
import { supabase } from '@/lib/supabase/client'
import { useToast } from '@/hooks/use-toast'
import { saveAlias } from '@/services/estoque-aliases'
import { MatchedItem } from '@/services/estoque-matching'

interface QuickRegisterItemModalProps {
  isOpen: boolean
  onClose: () => void
  item: MatchedItem
  realIdx: number
  notaId: string
  notaFornecedor: string
  onSaved: () => void
}

export function QuickRegisterItemModal({
  isOpen,
  onClose,
  item,
  realIdx,
  notaId,
  notaFornecedor,
  onSaved,
}: QuickRegisterItemModalProps) {
  const { toast } = useToast()
  const [saving, setSaving] = useState(false)
  const [lembrar, setLembrar] = useState(true)
  const meta = item.metadados_normalizados || {}
  const [form, setForm] = useState({
    nome: item.produto || '',
    marca: meta.marca || '',
    cor: meta.cor || '',
    espessura_mm: meta.espessura_mm?.toString() || '',
    largura_mm: meta.largura_mm?.toString() || '',
    quantidade: item.quantidade || 1,
    valor_unitario: item.preco_unitario || 0,
    unidade: meta.unidade || 'un',
    categoria: meta.categoria || '',
  })

  const setField = (key: string, value: any) => setForm((prev) => ({ ...prev, [key]: value }))

  const handleSave = async () => {
    if (!form.nome.trim()) {
      toast({ title: 'Nome obrigatório', variant: 'destructive' })
      return
    }
    setSaving(true)
    try {
      const normalize = (s: string) =>
        s
          .toLowerCase()
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .trim()
      const { data: existing } = await supabase.from('estoque_itens').select('id, nome, quantidade')
      const exactMatch = (existing || []).find((i) => normalize(i.nome) === normalize(form.nome))

      let itemId: string

      if (exactMatch) {
        await supabase
          .from('estoque_itens')
          .update({
            quantidade: Number(exactMatch.quantidade) + Number(form.quantidade),
            atualizado_em: new Date().toISOString(),
          })
          .eq('id', exactMatch.id)
        itemId = exactMatch.id
        toast({
          title: 'Item existente atualizado',
          description: 'A quantidade foi somada ao item já cadastrado.',
        })
      } else {
        const { data: inserted, error } = await supabase
          .from('estoque_itens')
          .insert({
            nome: form.nome,
            marca: form.marca || undefined,
            cor: form.cor || undefined,
            espessura_mm: form.espessura_mm ? Number(form.espessura_mm) : undefined,
            largura_mm: form.largura_mm ? Number(form.largura_mm) : undefined,
            quantidade: Number(form.quantidade),
            valor_unitario: Number(form.valor_unitario),
            unidade: form.unidade,
            fornecedor: notaFornecedor || undefined,
            categoria: form.categoria || undefined,
            metadados_normalizados: meta,
          })
          .select('id')
          .single()
        if (error) throw error
        itemId = inserted.id
      }

      await supabase.from('estoque_movimentacoes').insert({
        item_id: itemId,
        nota_fiscal_id: notaId,
        tipo: 'entrada',
        quantidade: Number(form.quantidade),
      })

      if (lembrar) {
        const { data: userData } = await supabase.auth.getUser()
        await saveAlias(item.produto, itemId, userData.user?.id)
      }

      const { data: notaData } = await supabase
        .from('notas_fiscais')
        .select('dados_ocr')
        .eq('id', notaId)
        .single()
      if (notaData?.dados_ocr) {
        const itens = [...(notaData.dados_ocr.itens || [])]
        if (realIdx >= 0 && realIdx < itens.length) {
          itens[realIdx] = {
            ...itens[realIdx],
            status: 'matched',
            item_id: itemId,
            source: 'manual',
          }
        }
        const stillPending = itens.filter(
          (i: MatchedItem) => i.status === 'pendente_revisao',
        ).length
        const novoStatus = stillPending === 0 ? 'conciliado' : 'pendente_revisao'
        await supabase
          .from('notas_fiscais')
          .update({ dados_ocr: { ...notaData.dados_ocr, itens }, status_reconciliacao: novoStatus })
          .eq('id', notaId)
      }

      toast({ title: 'Novo item cadastrado!', description: 'Estoque atualizado com sucesso.' })
      onSaved()
    } catch (e: any) {
      toast({ title: 'Erro', description: e.message, variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Cadastrar Novo Item</DialogTitle>
          <DialogDescription>
            Cadastre um novo produto no estoque com os dados extraídos da nota fiscal.
          </DialogDescription>
        </DialogHeader>

        <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900/50 rounded-lg p-3 mb-4">
          <p className="text-xs font-semibold text-blue-800 dark:text-blue-300 mb-1">
            Texto lido pela OCR:
          </p>
          <p className="text-sm text-blue-900 dark:text-blue-200 font-mono break-words">
            {item.produto}
          </p>
        </div>

        <div className="space-y-3 max-h-[50vh] overflow-y-auto">
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
              <Label>Quantidade</Label>
              <Input
                type="number"
                value={form.quantidade}
                onChange={(e) => setField('quantidade', Number(e.target.value))}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Unidade</Label>
              <Input value={form.unidade} onChange={(e) => setField('unidade', e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>Valor Unit. (R$)</Label>
              <Input
                type="number"
                value={form.valor_unitario}
                onChange={(e) => setField('valor_unitario', Number(e.target.value))}
              />
            </div>
          </div>
          <label className="flex items-center gap-2 cursor-pointer">
            <Checkbox checked={lembrar} onCheckedChange={(c) => setLembrar(!!c)} />
            <span className="text-xs text-slate-600 dark:text-slate-400">
              Lembrar desta associação para futuras notas
            </span>
          </label>
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
            Cadastrar e Associar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
