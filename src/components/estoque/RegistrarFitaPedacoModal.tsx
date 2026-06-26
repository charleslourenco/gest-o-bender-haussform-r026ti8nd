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
import { Printer, Check, ChevronsUpDown } from 'lucide-react'
import { supabase } from '@/lib/supabase/client'
import { useToast } from '@/hooks/use-toast'
import { printScrapLabel } from '@/lib/print-label'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import { cn } from '@/lib/utils'

export function RegistrarFitaPedacoModal({
  isOpen,
  onClose,
  sobraParaEditar = null,
  onSave,
}: {
  isOpen: boolean
  onClose: () => void
  sobraParaEditar?: any
  onSave?: () => void
}) {
  const [uuid, setUuid] = useState(() => {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID()
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0,
        v = c === 'x' ? r : (r & 0x3) | 0x8
      return v.toString(16)
    })
  })

  const [itens, setItens] = useState<any[]>([])
  const [openCombobox, setOpenCombobox] = useState(false)

  const [novaSobra, setNovaSobra] = useState({
    item_id: '',
    nome: '',
    marca: '',
    cliente_nome: '',
    largura: 0,
    comprimento: 0,
  })

  const { toast } = useToast()

  useEffect(() => {
    if (isOpen) {
      fetchItens()
      if (sobraParaEditar) {
        setNovaSobra({
          item_id: sobraParaEditar.item_id || '',
          nome: sobraParaEditar.nome || '',
          marca: sobraParaEditar.marca || '',
          cliente_nome: sobraParaEditar.cliente_nome || '',
          largura: sobraParaEditar.largura || 0,
          comprimento: sobraParaEditar.comprimento || 0,
        })
      } else {
        setNovaSobra({
          item_id: '',
          nome: '',
          marca: '',
          cliente_nome: '',
          largura: 0,
          comprimento: 0,
        })
        setUuid(() => {
          if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID()
          return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
            const r = (Math.random() * 16) | 0,
              v = c === 'x' ? r : (r & 0x3) | 0x8
            return v.toString(16)
          })
        })
      }
    }
  }, [isOpen, sobraParaEditar])

  async function fetchItens() {
    const { data } = await supabase
      .from('estoque_itens' as any)
      .select('id, nome, marca, largura_mm')
      .order('nome')
    if (data) setItens(data)
  }

  const currentId = sobraParaEditar?.id || uuid
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(
    `${window.location.origin}/baixa-retalho/${currentId}`,
  )}`

  const isFormInvalid =
    !novaSobra.item_id ||
    !novaSobra.cliente_nome ||
    novaSobra.largura <= 0 ||
    novaSobra.comprimento <= 0

  function handleSelectItem(item: any) {
    setNovaSobra((prev) => ({
      ...prev,
      item_id: item.id,
      nome: item.nome,
      marca: item.marca || '',
      largura: item.largura_mm || prev.largura,
    }))
    setOpenCombobox(false)
  }

  async function handleSalvar(imprimir = false) {
    if (isFormInvalid) {
      return toast({
        title: 'Preencha todos os campos obrigatórios corretamente',
        variant: 'destructive',
      })
    }

    let error

    if (sobraParaEditar) {
      const { error: updateError } = await supabase
        .from('estoque_sobras' as any)
        .update({
          item_id: novaSobra.item_id,
          nome: novaSobra.nome,
          marca: novaSobra.marca,
          cliente_nome: novaSobra.cliente_nome,
          largura: novaSobra.largura,
          comprimento: novaSobra.comprimento,
        })
        .eq('id', sobraParaEditar.id)
      error = updateError
    } else {
      const { error: insertError } = await supabase.from('estoque_sobras' as any).insert({
        id: uuid,
        item_id: novaSobra.item_id,
        nome: novaSobra.nome,
        marca: novaSobra.marca,
        cliente_nome: novaSobra.cliente_nome,
        largura: novaSobra.largura,
        comprimento: novaSobra.comprimento,
        altura: 0,
        area: 0,
        status: 'disponivel',
        tipo: 'Fita de Bordas (Pedaço)',
      })
      error = insertError
    }

    if (error) {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' })
    } else {
      toast({
        title: sobraParaEditar
          ? 'Pedaço atualizado com sucesso!'
          : 'Pedaço registrado com sucesso!',
      })

      if (imprimir) {
        printScrapLabel({
          ...novaSobra,
          id: currentId,
          altura: 0,
          espessura: 0,
          tipo: 'Fita de Bordas (Pedaço)',
        })
      }

      onClose()
      if (onSave) onSave()
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {sobraParaEditar ? 'Editar Fita (Pedaço)' : 'Registrar Fita (Pedaço)'}
          </DialogTitle>
          <DialogDescription>
            Registre pedaços de fita de borda para uso futuro. Pedaços muito pequenos devem ser
            descartados.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col md:flex-row gap-6 py-4">
          <div className="flex-1 space-y-4">
            <div className="space-y-2">
              <Label>Item do Estoque *</Label>
              <Popover open={openCombobox} onOpenChange={setOpenCombobox}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={openCombobox}
                    className="w-full justify-between font-normal"
                  >
                    {novaSobra.nome ? novaSobra.nome : 'Selecione a fita...'}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[320px] p-0" align="start">
                  <Command>
                    <CommandInput placeholder="Buscar item..." />
                    <CommandList>
                      <CommandEmpty>Nenhum item encontrado.</CommandEmpty>
                      <CommandGroup>
                        {itens.map((item) => (
                          <CommandItem
                            key={item.id}
                            value={item.nome}
                            onSelect={() => handleSelectItem(item)}
                          >
                            <Check
                              className={cn(
                                'mr-2 h-4 w-4',
                                novaSobra.item_id === item.id ? 'opacity-100' : 'opacity-0',
                              )}
                            />
                            {item.nome}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label>Nome do Cliente *</Label>
              <Input
                placeholder="Ex: Projeto Cozinha - Sr. João"
                value={novaSobra.cliente_nome}
                onChange={(e) => setNovaSobra({ ...novaSobra, cliente_nome: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Largura (mm) *</Label>
                <Input
                  type="number"
                  placeholder="Ex: 22"
                  value={novaSobra.largura || ''}
                  onChange={(e) => setNovaSobra({ ...novaSobra, largura: Number(e.target.value) })}
                />
              </div>
              <div className="space-y-2">
                <Label>Comprimento (m) *</Label>
                <Input
                  type="number"
                  placeholder="Ex: 15.5"
                  value={novaSobra.comprimento || ''}
                  onChange={(e) =>
                    setNovaSobra({ ...novaSobra, comprimento: Number(e.target.value) })
                  }
                />
              </div>
            </div>
          </div>

          <div className="w-full md:w-[320px] flex flex-col items-center justify-start space-y-2 pt-6 md:pt-0 border-t md:border-t-0 md:border-l border-gray-200 md:pl-6">
            <Label className="text-gray-500 font-semibold uppercase text-xs tracking-wider">
              Prévia da Etiqueta
            </Label>
            <div
              className="w-full aspect-[10/6] bg-white border-2 border-dashed border-gray-300 p-3 flex flex-row items-center justify-between text-black shadow-sm"
              style={{ fontFamily: 'Arial, sans-serif' }}
            >
              <div className="w-[65%] flex flex-col justify-center h-full pr-2 overflow-hidden">
                <h1 className="text-[13px] font-bold uppercase leading-tight line-clamp-2 m-0 mb-1">
                  {novaSobra.nome || 'NOME DA FITA'}
                </h1>
                <p className="text-[10px] m-0 mb-0.5 truncate leading-tight w-full">
                  <strong>Cliente:</strong> {novaSobra.cliente_nome || 'Nome do Cliente'}
                </p>
                <div className="mt-1 pt-1 border-t-2 border-black text-[11px] font-bold w-full whitespace-nowrap">
                  PEDAÇO FITA - {novaSobra.largura || 0}mm L x {novaSobra.comprimento || 0}m C
                </div>
              </div>
              <div className="w-[32%] flex flex-col items-center justify-center shrink-0 h-full">
                <img src={qrUrl} alt="QR" className="w-[85%] aspect-square object-contain" />
                <span className="text-[7px] font-bold uppercase text-center mt-1 leading-[1.1]">
                  Escaneie para
                  <br />
                  baixa
                </span>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="sm:justify-between w-full">
          <Button
            variant="outline"
            onClick={() => handleSalvar(true)}
            className="text-blue-600 border-blue-200 hover:bg-blue-50 mt-2 sm:mt-0"
            disabled={isFormInvalid}
          >
            <Printer className="w-4 h-4 mr-2" />
            {sobraParaEditar ? 'Salvar e Imprimir' : 'Criar e Imprimir'}
          </Button>
          <div className="flex flex-col-reverse sm:flex-row sm:space-x-2 mt-4 sm:mt-0">
            <Button variant="outline" className="mt-2 sm:mt-0" onClick={onClose}>
              Cancelar
            </Button>
            <Button
              onClick={() => handleSalvar(false)}
              className="bg-amber-500 hover:bg-amber-600 text-white"
              disabled={isFormInvalid}
            >
              {sobraParaEditar ? 'Salvar Alterações' : 'Salvar Fita'}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
