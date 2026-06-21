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
import { Printer, AlertTriangle, Box, Tags } from 'lucide-react'
import { supabase } from '@/lib/supabase/client'
import { useToast } from '@/hooks/use-toast'
import { printAllocationLabels } from '@/lib/print-label'

export function GerarEtiquetaModal({
  isOpen,
  onClose,
  item,
  totalAllocated,
  onSave,
}: {
  isOpen: boolean
  onClose: () => void
  item: any
  totalAllocated: number
  onSave: () => void
}) {
  const { toast } = useToast()
  const [clienteNome, setClienteNome] = useState('')
  const [quantidade, setQuantidade] = useState(1)
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    if (isOpen) {
      setClienteNome('')
      setQuantidade(1)
    }
  }, [isOpen])

  if (!item) return null

  const availableQuantity = item.quantidade - totalAllocated
  const isOverAllocated = quantidade > availableQuantity
  const isValid = clienteNome.trim().length > 0 && quantidade > 0 && !isOverAllocated

  const handleAllocate = async () => {
    if (!isValid) return
    setIsSubmitting(true)
    try {
      const { data, error } = await supabase
        .from('estoque_alocacoes' as any)
        .insert({
          item_id: item.id,
          cliente_nome: clienteNome,
          quantidade,
        })
        .select()
        .single()

      if (error) throw error

      toast({ title: 'Alocação salva e etiquetas geradas!' })

      printAllocationLabels({
        itemName: item.nome,
        clienteNome: clienteNome,
        marca: item.marca,
        cor: item.cor,
        espessura: item.espessura_mm,
        largura: item.largura_mm,
        comprimento: item.comprimento_m,
        quantidade: quantidade,
        alocacaoId: data.id,
      })

      onSave()
      onClose()
    } catch (e: any) {
      toast({ title: 'Erro', description: e.message, variant: 'destructive' })
    } finally {
      setIsSubmitting(false)
    }
  }

  const dim = []
  if (item.espessura_mm) dim.push(`${item.espessura_mm}mm E`)
  if (item.largura_mm) dim.push(`${item.largura_mm}mm L`)
  if (item.comprimento_m) dim.push(`${item.comprimento_m}m C`)
  const dimText = dim.join(' x ') || 'N/A'

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Tags className="w-5 h-5 text-blue-500" />
            Alocação e Etiquetagem
          </DialogTitle>
          <DialogDescription>
            Aloque itens para clientes específicos e gere etiquetas em lote. A quantidade física do
            estoque não será alterada, mas o sistema registrará a reserva.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col md:flex-row gap-6 py-4">
          <div className="flex-1 space-y-4">
            <div className="bg-gray-50 dark:bg-slate-900/50 border dark:border-slate-800 p-4 rounded-lg space-y-3">
              <div className="space-y-1">
                <Label className="text-gray-500 text-xs uppercase tracking-wider">Item</Label>
                <p className="font-semibold text-sm leading-tight text-slate-800 dark:text-slate-200">
                  {item.nome}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label className="text-gray-500 text-xs uppercase tracking-wider">Marca</Label>
                  <p className="text-sm text-slate-700 dark:text-slate-300">{item.marca || '-'}</p>
                </div>
                <div className="space-y-1">
                  <Label className="text-gray-500 text-xs uppercase tracking-wider">Cor</Label>
                  <p className="text-sm text-slate-700 dark:text-slate-300">{item.cor || '-'}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 pt-2 border-t dark:border-slate-800">
                <div className="space-y-1">
                  <Label className="text-gray-500 text-xs uppercase tracking-wider">
                    Dimensões
                  </Label>
                  <p className="text-sm font-mono text-slate-700 dark:text-slate-300">{dimText}</p>
                </div>
                <div className="space-y-1">
                  <Label className="text-gray-500 text-xs uppercase tracking-wider">
                    Disponível p/ Alocação
                  </Label>
                  <p
                    className={`text-sm font-semibold flex items-center gap-1 ${availableQuantity > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500'}`}
                  >
                    <Box className="w-4 h-4" />
                    {availableQuantity} {item.unidade}
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-2 pt-2">
              <Label htmlFor="clienteNome">Nome do Cliente *</Label>
              <Input
                id="clienteNome"
                placeholder="Ex: João da Silva / Projeto X"
                value={clienteNome}
                onChange={(e) => setClienteNome(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="quantidade">Quantidade a alocar *</Label>
              <Input
                id="quantidade"
                type="number"
                min="1"
                max={availableQuantity}
                value={quantidade || ''}
                onChange={(e) => setQuantidade(Number(e.target.value))}
              />
              {isOverAllocated && (
                <div className="flex items-center gap-1.5 mt-1.5 text-red-500 text-xs font-medium">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  <span>Quantidade superior ao disponível ({availableQuantity})</span>
                </div>
              )}
            </div>
          </div>

          <div className="w-full md:w-[320px] flex flex-col items-center justify-start space-y-2 pt-6 md:pt-0 border-t md:border-t-0 md:border-l border-gray-200 dark:border-slate-800 md:pl-6">
            <Label className="text-gray-500 font-semibold uppercase text-xs tracking-wider">
              Prévia da Etiqueta (Lote)
            </Label>

            <div
              className="w-full aspect-[10/6] bg-white border-2 border-dashed border-gray-300 p-3 flex flex-row items-center justify-between text-black shadow-sm"
              style={{
                fontFamily: 'Arial, sans-serif',
              }}
            >
              <div className="w-[65%] flex flex-col justify-center h-full pr-2 overflow-hidden">
                <h1 className="text-[13px] font-bold uppercase leading-tight line-clamp-2 m-0 mb-1">
                  {item.nome}
                </h1>
                <p className="text-[10px] m-0 mb-0.5 truncate leading-tight w-full">
                  <strong>Cliente:</strong> {clienteNome || 'Nome do Cliente'}
                </p>
                {item.marca && (
                  <p className="text-[10px] m-0 mb-0.5 truncate leading-tight w-full">
                    <strong>Marca:</strong> {item.marca}
                  </p>
                )}
                <div className="mt-1 pt-1 border-t-2 border-black text-[11px] font-bold w-full whitespace-nowrap">
                  {dimText}
                </div>
                <div className="text-[8px] text-gray-500 mt-1">
                  Alocado em: {new Date().toLocaleDateString('pt-BR')}
                </div>
              </div>

              <div className="w-[32%] flex flex-col items-center justify-center shrink-0 h-full">
                <div className="w-[85%] aspect-square bg-gray-100 flex items-center justify-center text-gray-400 border border-gray-200">
                  QR
                </div>
                <span className="text-[7px] font-bold uppercase text-center mt-1 leading-[1.1]">
                  Unid. 1/{quantidade || 1}
                </span>
              </div>
            </div>
            <p className="text-[11px] text-gray-400 text-center px-4 pt-2">
              Serão impressas <strong>{quantidade > 0 && !isOverAllocated ? quantidade : 1}</strong>{' '}
              etiquetas, uma para cada unidade.
            </p>
          </div>
        </div>

        <DialogFooter className="w-full sm:justify-end gap-2 mt-4 sm:mt-0">
          <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
            Cancelar
          </Button>
          <Button
            onClick={handleAllocate}
            className="bg-blue-600 hover:bg-blue-700 text-white"
            disabled={!isValid || isSubmitting}
          >
            <Printer className="w-4 h-4 mr-2" />
            {isSubmitting ? 'Gerando...' : 'Salvar e Gerar Etiquetas'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
