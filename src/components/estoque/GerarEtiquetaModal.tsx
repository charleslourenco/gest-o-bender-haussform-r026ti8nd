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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
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
  const [clientesDisponiveis, setClientesDisponiveis] = useState<
    Array<{ id: string; nome: string }>
  >([])
  const [selectedClienteId, setSelectedClienteId] = useState<string>('none')
  const [destino, setDestino] = useState<'cliente' | 'consumo_interno'>('cliente')

  useEffect(() => {
    if (isOpen) {
      setClienteNome('')
      setQuantidade(1)
      setSelectedClienteId('none')
      setDestino('cliente')
      supabase
        .from('clientes')
        .select('id, nome')
        .order('nome')
        .then(({ data }) => {
          if (data) setClientesDisponiveis(data.filter((c: any) => c && c.id))
        })
    }
  }, [isOpen])

  if (!item) return null

  const availableQuantity = item.quantidade - totalAllocated
  const isOverAllocated = quantidade > availableQuantity
  const isConsumoInterno = destino === 'consumo_interno'
  const isClienteDestino = destino === 'cliente'
  const hasCliente = clienteNome.trim().length > 0 || selectedClienteId !== 'none'
  const hasValidDestino = isConsumoInterno || (isClienteDestino && hasCliente)
  const isValid = hasValidDestino && quantidade > 0 && !isOverAllocated

  const handleAllocate = async () => {
    if (!hasValidDestino) {
      toast({
        title: 'Destino obrigatório',
        description:
          'Selecione um cliente para o material ou marque "Consumo interno (uso da fábrica)" antes de prosseguir.',
        variant: 'destructive',
      })
      return
    }
    if (quantidade <= 0) {
      toast({
        title: 'Quantidade inválida',
        description: 'Informe uma quantidade maior que zero.',
        variant: 'destructive',
      })
      return
    }
    if (isOverAllocated) {
      toast({
        title: 'Quantidade indisponível',
        description: `Quantidade superior ao disponível (${availableQuantity} ${item.unidade || 'un'}).`,
        variant: 'destructive',
      })
      return
    }
    if (!isValid) return
    setIsSubmitting(true)
    try {
      const valorUnitario = Number(item.valor_unitario) || 0
      const valorTotalUnitario = Math.round(valorUnitario * 1 * 100) / 100

      let finalClienteNome = clienteNome
      let matchedClienteId: string | null = null

      if (isConsumoInterno) {
        finalClienteNome = 'Consumo Interno'
        matchedClienteId = null
      } else {
        matchedClienteId = selectedClienteId !== 'none' ? selectedClienteId : null
        if (!matchedClienteId && clienteNome) {
          const found = clientesDisponiveis.find(
            (c) => c.nome.trim().toLowerCase() === clienteNome.trim().toLowerCase(),
          )
          if (found) matchedClienteId = found.id
        }
      }

      // Cria N alocações individuais (cada uma com quantidade: 1) para que
      // cada etiqueta tenha seu próprio QR Code e a baixa seja por unidade.
      const rows = Array.from({ length: quantidade }, () => ({
        item_id: item.id,
        cliente_nome: finalClienteNome,
        cliente_id: matchedClienteId,
        quantidade: 1,
        destino,
        valor_unitario_congelado: valorUnitario,
        valor_total_congelado: valorTotalUnitario,
      }))

      const { data, error } = await supabase
        .from('estoque_alocacoes' as any)
        .insert(rows)
        .select('id')

      if (error) throw error

      const alocacaoIds = (data || []).map((d: any) => d.id)

      toast({ title: 'Alocação salva e etiquetas geradas!' })

      printAllocationLabels({
        itemName: item.nome,
        clienteNome: clienteNome,
        marca: item.marca,
        cor: item.cor,
        espessura: item.espessura_mm,
        largura: item.largura_mm,
        comprimento: item.comprimento_m,
        alocacaoIds,
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
            <div className="bg-muted/50 border border-border p-4 rounded-lg space-y-3">
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

            {/* Toggle Destino: Cliente / Projeto vs Consumo Interno */}
            <div className="space-y-1.5 pt-1">
              <Label className="text-xs uppercase tracking-wider text-gray-500 font-semibold">
                Destino do Material
              </Label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <Button
                  type="button"
                  variant={destino === 'cliente' ? 'default' : 'outline'}
                  size="sm"
                  className={`h-auto min-h-[38px] py-2 px-3 whitespace-normal text-xs leading-snug text-center ${
                    destino === 'cliente' ? 'bg-blue-600 hover:bg-blue-700 text-white' : ''
                  }`}
                  onClick={() => setDestino('cliente')}
                >
                  Cliente / Projeto
                </Button>
                <Button
                  type="button"
                  variant={destino === 'consumo_interno' ? 'default' : 'outline'}
                  size="sm"
                  className={`h-auto min-h-[38px] py-2 px-3 whitespace-normal text-xs leading-snug text-center ${
                    destino === 'consumo_interno'
                      ? 'bg-amber-600 hover:bg-amber-700 text-white'
                      : ''
                  }`}
                  onClick={() => {
                    setDestino('consumo_interno')
                    setClienteNome('Consumo Interno')
                    setSelectedClienteId('none')
                  }}
                >
                  Consumo interno (uso da fábrica)
                </Button>
              </div>
              <p className="text-[11px] text-muted-foreground">
                {isConsumoInterno
                  ? 'Use quando o material não se destina a um cliente — não entra no DRE de projeto'
                  : 'O material será vinculado a um cliente/projeto e somará no DRE do projeto correspondente.'}
              </p>
            </div>

            <div className="space-y-2 pt-1">
              <Label htmlFor="clienteNome">
                {isConsumoInterno ? 'Destino' : 'Nome do Cliente *'}
              </Label>
              <Input
                id="clienteNome"
                placeholder={isConsumoInterno ? 'Consumo Interno' : 'Ex: João da Silva / Projeto X'}
                value={isConsumoInterno ? 'Consumo Interno' : clienteNome}
                disabled={isConsumoInterno}
                onChange={(e) => {
                  if (isConsumoInterno) return
                  setClienteNome(e.target.value)
                  const match = clientesDisponiveis.find(
                    (c) => c.nome.trim().toLowerCase() === e.target.value.trim().toLowerCase(),
                  )
                  if (match) setSelectedClienteId(match.id)
                }}
              />
              {!isConsumoInterno && !hasCliente && (
                <p className="text-[11px] text-amber-600 dark:text-amber-400">
                  Informe o nome do cliente ou selecione um cliente cadastrado abaixo para liberar a
                  geração.
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="clienteSelect" className="text-xs text-muted-foreground">
                Vincular a Cliente Cadastrado (Opcional)
              </Label>
              <Select
                value={selectedClienteId}
                disabled={isConsumoInterno}
                onValueChange={(val) => {
                  if (isConsumoInterno) return
                  setSelectedClienteId(val)
                  if (val !== 'none') {
                    const sel = clientesDisponiveis.find((c) => c.id === val)
                    if (sel && (!clienteNome || clienteNome.trim() === '')) {
                      setClienteNome(sel.nome)
                    }
                  }
                }}
              >
                <SelectTrigger id="clienteSelect" className="h-9 text-xs">
                  <SelectValue
                    placeholder={
                      isConsumoInterno
                        ? 'Desabilitado para consumo interno'
                        : 'Selecione um cliente (opcional)...'
                    }
                  />
                </SelectTrigger>
                <SelectContent className="max-h-56">
                  <SelectItem value="none">Nenhum vínculo direto</SelectItem>
                  {!isConsumoInterno &&
                    clientesDisponiveis
                      .filter((c) => c && c.id && String(c.id).trim() !== '')
                      .map((c) => (
                        <SelectItem key={c.id} value={String(c.id)}>
                          {c.nome || 'Cliente sem nome'}
                        </SelectItem>
                      ))}
                </SelectContent>
              </Select>
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

          <div className="w-full md:w-[320px] flex flex-col items-center justify-start space-y-2 pt-6 md:pt-0 border-t md:border-t-0 md:border-l border-border md:pl-6">
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
                  <strong>{isConsumoInterno ? 'Destino:' : 'Cliente:'}</strong>{' '}
                  {isConsumoInterno ? 'Consumo Interno' : clienteNome || 'Nome do Cliente'}
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
