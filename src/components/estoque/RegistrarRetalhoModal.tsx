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
import { AlertTriangle, Check, Printer } from 'lucide-react'
import { supabase } from '@/lib/supabase/client'
import { useToast } from '@/hooks/use-toast'
import { printScrapLabel } from '@/lib/print-label'

export function RegistrarRetalhoModal({
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
  const [novaSobra, setNovaSobra] = useState({
    nome: '',
    marca: '',
    cliente_nome: '',
    largura: 0,
    altura: 0,
    espessura: 0,
  })
  const [descarteSugerido, setDescarteSugerido] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    if (isOpen) {
      if (sobraParaEditar) {
        setNovaSobra({
          nome: sobraParaEditar.nome,
          marca: sobraParaEditar.marca || '',
          cliente_nome: sobraParaEditar.cliente_nome || '',
          largura: sobraParaEditar.largura,
          altura: sobraParaEditar.altura,
          espessura: sobraParaEditar.espessura || 0,
        })
      } else {
        setNovaSobra({ nome: '', marca: '', cliente_nome: '', largura: 0, altura: 0, espessura: 0 })
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

  useEffect(() => {
    if (novaSobra.largura > 0 && novaSobra.altura > 0) {
      const area = (novaSobra.largura * novaSobra.altura) / 1000000
      setDescarteSugerido(area < 1)
    } else {
      setDescarteSugerido(false)
    }
  }, [novaSobra.largura, novaSobra.altura])

  const currentId = sobraParaEditar?.id || uuid
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(
    `${window.location.origin}/baixa-retalho/${currentId}`,
  )}`

  const isFormInvalid =
    !novaSobra.nome ||
    !novaSobra.marca ||
    !novaSobra.cliente_nome ||
    novaSobra.largura <= 0 ||
    novaSobra.altura <= 0 ||
    novaSobra.espessura <= 0 ||
    descarteSugerido

  async function handleSalvarSobra(imprimir = false) {
    if (isFormInvalid) {
      return toast({
        title: 'Preencha todos os campos obrigatórios corretamente',
        variant: 'destructive',
      })
    }

    const area = (novaSobra.largura * novaSobra.altura) / 1000000
    if (area < 1) {
      toast({
        title: 'Peça muito pequena!',
        description: 'Peças menores que 1m² devem ser descartadas.',
        variant: 'destructive',
      })
      return
    }

    let error

    if (sobraParaEditar) {
      const { error: updateError } = await supabase
        .from('estoque_sobras' as any)
        .update({
          nome: novaSobra.nome,
          marca: novaSobra.marca,
          cliente_nome: novaSobra.cliente_nome,
          largura: novaSobra.largura,
          altura: novaSobra.altura,
          espessura: novaSobra.espessura,
          area: area,
        })
        .eq('id', sobraParaEditar.id)
      error = updateError
    } else {
      const { error: insertError } = await supabase.from('estoque_sobras' as any).insert({
        id: uuid,
        nome: novaSobra.nome,
        marca: novaSobra.marca,
        cliente_nome: novaSobra.cliente_nome,
        largura: novaSobra.largura,
        altura: novaSobra.altura,
        espessura: novaSobra.espessura,
        area: area,
        status: 'disponivel',
        tipo: 'Retalho MDF',
      })

      error = insertError
    }

    if (error) {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' })
    } else {
      toast({
        title: sobraParaEditar
          ? 'Retalho atualizado com sucesso!'
          : 'Sobra registrada com sucesso!',
      })

      if (imprimir) {
        printScrapLabel({ ...novaSobra, id: currentId, tipo: 'Retalho MDF' })
      }

      onClose()
      if (onSave) onSave()
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{sobraParaEditar ? 'Editar Retalho' : 'Registrar Novo Retalho'}</DialogTitle>
          <DialogDescription>
            Preencha os dados e veja a prévia da etiqueta térmica (100x60mm). O sistema não aceita
            peças menores que 1m².
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col md:flex-row gap-6 py-4">
          <div className="flex-1 space-y-4">
            <div className="space-y-2">
              <Label>Nome do Cliente *</Label>
              <Input
                placeholder="Ex: João da Silva"
                value={novaSobra.cliente_nome}
                onChange={(e) => setNovaSobra({ ...novaSobra, cliente_nome: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Nome do MDF *</Label>
                <Input
                  placeholder="Ex: Branco TX"
                  value={novaSobra.nome}
                  onChange={(e) => setNovaSobra({ ...novaSobra, nome: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Marca *</Label>
                <Input
                  placeholder="Ex: Arauco"
                  value={novaSobra.marca}
                  onChange={(e) => setNovaSobra({ ...novaSobra, marca: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Altura (mm) *</Label>
                <Input
                  type="number"
                  placeholder="Ex: 1200"
                  value={novaSobra.altura || ''}
                  onChange={(e) => setNovaSobra({ ...novaSobra, altura: Number(e.target.value) })}
                />
              </div>
              <div className="space-y-2">
                <Label>Largura (mm) *</Label>
                <Input
                  type="number"
                  placeholder="Ex: 1500"
                  value={novaSobra.largura || ''}
                  onChange={(e) => setNovaSobra({ ...novaSobra, largura: Number(e.target.value) })}
                />
              </div>
              <div className="space-y-2">
                <Label>Espessura (mm) *</Label>
                <Input
                  type="number"
                  placeholder="Ex: 15"
                  value={novaSobra.espessura || ''}
                  onChange={(e) =>
                    setNovaSobra({ ...novaSobra, espessura: Number(e.target.value) })
                  }
                />
              </div>
            </div>

            {descarteSugerido && novaSobra.largura > 0 && novaSobra.altura > 0 && (
              <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-md flex items-start gap-2">
                <AlertTriangle className="w-5 h-5 shrink-0" />
                <p className="text-sm font-medium">
                  Área total: {((novaSobra.largura * novaSobra.altura) / 1000000).toFixed(2)}m².
                  <br />
                  Peça muito pequena. Sugerimos o descarte direto.
                </p>
              </div>
            )}
            {!descarteSugerido && novaSobra.largura > 0 && novaSobra.altura > 0 && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-md flex items-center gap-2">
                <Check className="w-5 h-5 shrink-0" />
                <p className="text-sm font-medium">
                  Área total: {((novaSobra.largura * novaSobra.altura) / 1000000).toFixed(2)}m².
                  Peça válida para o estoque!
                </p>
              </div>
            )}
          </div>

          <div className="w-full md:w-[320px] flex flex-col items-center justify-start space-y-2 pt-6 md:pt-0 border-t md:border-t-0 md:border-l border-gray-200 md:pl-6">
            <Label className="text-gray-500 font-semibold uppercase text-xs tracking-wider">
              Prévia da Etiqueta
            </Label>

            <div
              className="w-full aspect-[10/6] bg-white border-2 border-dashed border-gray-300 p-3 flex flex-row items-center justify-between text-black shadow-sm"
              style={{
                fontFamily: 'Arial, sans-serif',
              }}
            >
              <div className="w-[65%] flex flex-col justify-center h-full pr-2 overflow-hidden">
                <h1 className="text-[13px] font-bold uppercase leading-tight line-clamp-2 m-0 mb-1">
                  {novaSobra.nome || 'NOME DO MDF'}
                </h1>
                <p className="text-[10px] m-0 mb-0.5 truncate leading-tight w-full">
                  <strong>Cliente:</strong> {novaSobra.cliente_nome || 'Nome do Cliente'}
                </p>
                <p className="text-[10px] m-0 mb-0.5 truncate leading-tight w-full">
                  <strong>Marca:</strong> {novaSobra.marca || 'Marca'}
                </p>
                <div className="mt-1 pt-1 border-t-2 border-black text-[11px] font-bold w-full whitespace-nowrap">
                  {novaSobra.altura || 0}A x {novaSobra.largura || 0}L x {novaSobra.espessura || 0}E
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
            <p className="text-[11px] text-gray-400 text-center px-4">
              A etiqueta será impressa com 100mm de largura por 60mm de altura.
            </p>
          </div>
        </div>

        <DialogFooter className="sm:justify-between w-full">
          <Button
            variant="outline"
            onClick={() => handleSalvarSobra(true)}
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
              onClick={() => handleSalvarSobra(false)}
              className="bg-amber-500 hover:bg-amber-600 text-white"
              disabled={isFormInvalid}
            >
              {sobraParaEditar ? 'Salvar Alterações' : 'Salvar Retalho'}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
