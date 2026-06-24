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
import { supabase } from '@/lib/supabase/client'
import { useToast } from '@/hooks/use-toast'

export function RegistrarChapaModal({
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
  const [itens, setItems] = useState<any[]>([])
  const [novaSobra, setNovaSobra] = useState({
    item_id: '',
    nome: '',
    marca: '',
    cliente_nome: '',
    espessura: 0,
  })
  const { toast } = useToast()

  useEffect(() => {
    async function fetchItens() {
      const { data } = await supabase
        .from('estoque_itens')
        .select('id, nome, marca, espessura_mm')
        .order('nome')
      if (data) setItems(data)
    }
    fetchItens()
  }, [])

  useEffect(() => {
    if (isOpen) {
      if (sobraParaEditar) {
        setNovaSobra({
          item_id: sobraParaEditar.item_id || '',
          nome: sobraParaEditar.nome || '',
          marca: sobraParaEditar.marca || '',
          cliente_nome: sobraParaEditar.cliente_nome || '',
          espessura: sobraParaEditar.espessura || 0,
        })
      } else {
        setNovaSobra({ item_id: '', nome: '', marca: '', cliente_nome: '', espessura: 0 })
      }
    }
  }, [isOpen, sobraParaEditar])

  const handleItemSelect = (id: string) => {
    const selectedItem = itens.find((i) => i.id === id)
    if (selectedItem) {
      setNovaSobra({
        ...novaSobra,
        item_id: id,
        nome: selectedItem.nome,
        marca: selectedItem.marca || '',
        espessura: selectedItem.espessura_mm || 0,
      })
    }
  }

  const isFormInvalid = !novaSobra.item_id || !novaSobra.nome || novaSobra.espessura <= 0

  async function handleSalvar() {
    if (isFormInvalid) {
      return toast({
        title: 'Preencha os campos obrigatórios',
        variant: 'destructive',
      })
    }

    const payload = {
      tipo: 'chapa_inteira',
      item_id: novaSobra.item_id,
      nome: novaSobra.nome,
      marca: novaSobra.marca,
      cliente_nome: novaSobra.cliente_nome,
      espessura: novaSobra.espessura,
      largura: 0,
      altura: 0,
      area: 0,
    }

    let error

    if (sobraParaEditar) {
      const { error: updateError } = await supabase
        .from('estoque_sobras' as any)
        .update(payload)
        .eq('id', sobraParaEditar.id)
      error = updateError
    } else {
      const { error: insertError } = await supabase.from('estoque_sobras' as any).insert({
        ...payload,
        status: 'disponivel',
      })
      error = insertError
    }

    if (error) {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' })
    } else {
      toast({
        title: sobraParaEditar ? 'Chapa atualizada com sucesso!' : 'Chapa registrada com sucesso!',
      })
      onClose()
      if (onSave) onSave()
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>
            {sobraParaEditar ? 'Editar Chapa Inteira' : 'Registrar Chapa Inteira'}
          </DialogTitle>
          <DialogDescription>
            Registre uma chapa inteira excedente de projeto que retornou ao estoque.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Item do Estoque *</Label>
            <Select value={novaSobra.item_id} onValueChange={handleItemSelect}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione o MDF..." />
              </SelectTrigger>
              <SelectContent>
                {itens.map((item) => (
                  <SelectItem key={item.id} value={item.id}>
                    {item.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Nome do MDF *</Label>
            <Input
              value={novaSobra.nome}
              onChange={(e) => setNovaSobra({ ...novaSobra, nome: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Marca</Label>
              <Input
                value={novaSobra.marca}
                onChange={(e) => setNovaSobra({ ...novaSobra, marca: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Espessura (mm) *</Label>
              <Input
                type="number"
                value={novaSobra.espessura || ''}
                onChange={(e) => setNovaSobra({ ...novaSobra, espessura: Number(e.target.value) })}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Cliente / Projeto de Origem</Label>
            <Input
              placeholder="Ex: João da Silva"
              value={novaSobra.cliente_nome}
              onChange={(e) => setNovaSobra({ ...novaSobra, cliente_nome: e.target.value })}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            onClick={handleSalvar}
            disabled={isFormInvalid}
            className="bg-steel-blue hover:bg-dark-denim text-white"
          >
            {sobraParaEditar ? 'Salvar Alterações' : 'Registrar Chapa'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
