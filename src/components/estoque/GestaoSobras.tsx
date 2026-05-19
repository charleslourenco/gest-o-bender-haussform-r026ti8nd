import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Scissors, Trash2, AlertTriangle, Search, Check, Printer, Edit } from 'lucide-react'
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
import { useToast } from '@/hooks/use-toast'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

export function GestaoSobras() {
  const [sobras, setSobras] = useState<any[]>([])
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [search, setSearch] = useState('')

  const [novaSobra, setNovaSobra] = useState({
    nome: '',
    marca: '',
    cliente_nome: '',
    largura: 0,
    altura: 0,
    espessura: 0,
  })
  const [editingId, setEditingId] = useState<string | null>(null)
  const [descarteSugerido, setDescarteSugerido] = useState(false)

  const { toast } = useToast()

  useEffect(() => {
    fetchSobras()
  }, [])

  async function fetchSobras() {
    const { data } = await supabase
      .from('estoque_sobras' as any)
      .select('*')
      .order('criado_em', { ascending: false })
    if (data) setSobras(data)
  }

  useEffect(() => {
    if (novaSobra.largura > 0 && novaSobra.altura > 0) {
      const area = (novaSobra.largura * novaSobra.altura) / 1000000 // Convert from mm2 to m2
      setDescarteSugerido(area < 1)
    } else {
      setDescarteSugerido(false)
    }
  }, [novaSobra.largura, novaSobra.altura])

  function openNewModal() {
    setEditingId(null)
    setNovaSobra({ nome: '', marca: '', cliente_nome: '', largura: 0, altura: 0, espessura: 0 })
    setIsModalOpen(true)
  }

  function openEditModal(sobra: any) {
    setEditingId(sobra.id)
    setNovaSobra({
      nome: sobra.nome,
      marca: sobra.marca || '',
      cliente_nome: sobra.cliente_nome || '',
      largura: sobra.largura,
      altura: sobra.altura,
      espessura: sobra.espessura || 0,
    })
    setIsModalOpen(true)
  }

  async function handleSalvarSobra() {
    if (
      !novaSobra.nome ||
      novaSobra.largura <= 0 ||
      novaSobra.altura <= 0 ||
      novaSobra.espessura <= 0
    ) {
      return toast({ title: 'Preencha os campos obrigatórios', variant: 'destructive' })
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

    if (editingId) {
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
        .eq('id', editingId)
      error = updateError
    } else {
      const { error: insertError } = await supabase.from('estoque_sobras' as any).insert({
        nome: novaSobra.nome,
        marca: novaSobra.marca,
        cliente_nome: novaSobra.cliente_nome,
        largura: novaSobra.largura,
        altura: novaSobra.altura,
        espessura: novaSobra.espessura,
        area: area,
        status: 'disponivel',
      })
      error = insertError
    }

    if (error) {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' })
    } else {
      toast({
        title: editingId ? 'Retalho atualizado com sucesso!' : 'Sobra registrada com sucesso!',
      })
      setIsModalOpen(false)
      setEditingId(null)
      setNovaSobra({ nome: '', marca: '', cliente_nome: '', largura: 0, altura: 0, espessura: 0 })
      fetchSobras()
    }
  }

  async function handleDeletar(id: string) {
    if (!confirm('Deseja realmente apagar este retalho?')) return
    await supabase
      .from('estoque_sobras' as any)
      .delete()
      .eq('id', id)
    fetchSobras()
    toast({ title: 'Retalho removido' })
  }

  async function handleUsar(id: string) {
    if (!confirm('Marcar este retalho como utilizado?')) return
    await supabase
      .from('estoque_sobras' as any)
      .update({ status: 'usado', usado_em: new Date().toISOString() })
      .eq('id', id)
    fetchSobras()
    toast({ title: 'Retalho marcado como usado' })
  }

  function handlePrint(sobra: any) {
    const printWindow = window.open('', '_blank')
    if (!printWindow) return

    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(
      'https://gestao-fabrica-moveis-75a68.goskip.app/baixa-retalho/' + sobra.id,
    )}`

    const html = `
      <html>
        <head>
          <title>Etiqueta - ${sobra.nome}</title>
          <style>
            body { font-family: sans-serif; padding: 20px; text-align: center; }
            .label { border: 2px solid #000; padding: 20px; width: 320px; margin: 0 auto; box-sizing: border-box; }
            h2 { margin: 0 0 10px 0; font-size: 18px; text-transform: uppercase; }
            p { margin: 5px 0; font-size: 14px; }
            .medidas { font-weight: bold; font-size: 16px; margin: 15px 0; padding: 10px; border-top: 1px dashed #ccc; border-bottom: 1px dashed #ccc; }
            img { margin-top: 15px; width: 150px; height: 150px; }
            @media print {
              body { padding: 0; margin: 0; }
              .label { width: 100%; border: none; }
            }
          </style>
        </head>
        <body>
          <div class="label">
            <h2>${sobra.nome}</h2>
            <p><strong>Marca:</strong> ${sobra.marca || '-'}</p>
            <p><strong>Cliente:</strong> ${sobra.cliente_nome || '-'}</p>
            <div class="medidas">
              ${sobra.largura}mm L x ${sobra.altura}mm A x ${sobra.espessura}mm E
            </div>
            <img src="${qrUrl}" alt="QR Code" />
            <p style="font-size: 11px; margin-top: 10px; color: #555;">Escaneie para dar baixa</p>
          </div>
          <script>
            window.onload = () => {
              setTimeout(() => {
                window.print();
                window.close();
              }, 500);
            }
          </script>
        </body>
      </html>
    `

    printWindow.document.open()
    printWindow.document.write(html)
    printWindow.document.close()
  }

  const filteredSobras = sobras.filter(
    (s) =>
      s.nome.toLowerCase().includes(search.toLowerCase()) ||
      (s.marca && s.marca.toLowerCase().includes(search.toLowerCase())) ||
      (s.cliente_nome && s.cliente_nome.toLowerCase().includes(search.toLowerCase())),
  )

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-midnight-navy">Banco de Retalhos (MDF)</h2>
          <p className="text-gray-500">Registre e aproveite sobras com mais de 1m².</p>
        </div>
        <Button
          onClick={openNewModal}
          className="bg-amber-500 hover:bg-amber-600 text-white w-full sm:w-auto"
        >
          <Scissors className="w-4 h-4 mr-2" />
          Registrar Retalho
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-3 border-b">
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Buscar retalho..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-gray-50">
                <TableRow>
                  <TableHead>Material / Cor</TableHead>
                  <TableHead>Marca</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead className="text-center">Larg x Alt (mm)</TableHead>
                  <TableHead className="text-center">Espess. (mm)</TableHead>
                  <TableHead className="text-center">Área (m²)</TableHead>
                  <TableHead className="text-center">Status</TableHead>
                  <TableHead className="text-center">Data de Uso</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredSobras.map((sobra) => (
                  <TableRow key={sobra.id}>
                    <TableCell className="font-medium">{sobra.nome}</TableCell>
                    <TableCell>{sobra.marca || '-'}</TableCell>
                    <TableCell>{sobra.cliente_nome || '-'}</TableCell>
                    <TableCell className="text-center">
                      {sobra.largura} x {sobra.altura}
                    </TableCell>
                    <TableCell className="text-center">{sobra.espessura}</TableCell>
                    <TableCell className="text-center font-bold text-steel-blue">
                      {sobra.area.toFixed(2)} m²
                    </TableCell>
                    <TableCell className="text-center">
                      {sobra.status === 'disponivel' ? (
                        <Badge
                          variant="outline"
                          className="bg-emerald-50 text-emerald-600 border-emerald-200"
                        >
                          Disponível
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="bg-gray-100 text-gray-500">
                          Usado
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-center text-sm text-gray-500">
                      {sobra.status === 'usado' && sobra.usado_em
                        ? new Date(sobra.usado_em).toLocaleString('pt-BR')
                        : '-'}
                    </TableCell>
                    <TableCell className="text-right whitespace-nowrap">
                      {sobra.status === 'disponivel' && (
                        <>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-blue-600 hover:bg-blue-50 mr-1"
                            onClick={() => handlePrint(sobra)}
                            title="Imprimir Etiqueta"
                          >
                            <Printer className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-emerald-600 hover:bg-emerald-50 mr-1"
                            onClick={() => handleUsar(sobra.id)}
                            title="Marcar Uso"
                          >
                            <Check className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-amber-500 hover:bg-amber-50 h-8 w-8 mr-1"
                            onClick={() => openEditModal(sobra)}
                            title="Editar"
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                        </>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-red-500 hover:bg-red-50 h-8 w-8"
                        onClick={() => handleDeletar(sobra.id)}
                        title="Deletar"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {filteredSobras.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-8 text-gray-500">
                      Nenhum retalho encontrado.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>{editingId ? 'Editar Retalho' : 'Registrar Novo Retalho'}</DialogTitle>
            <DialogDescription>
              Insira as medidas em milímetros. Peças menores que 1m² não são aceitas.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Nome do Material / Cor *</Label>
              <Input
                placeholder="Ex: MDF Branco TX"
                value={novaSobra.nome}
                onChange={(e) => setNovaSobra({ ...novaSobra, nome: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Marca</Label>
                <Input
                  placeholder="Ex: Arauco"
                  value={novaSobra.marca}
                  onChange={(e) => setNovaSobra({ ...novaSobra, marca: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Cliente</Label>
                <Input
                  placeholder="Opcional"
                  value={novaSobra.cliente_nome}
                  onChange={(e) => setNovaSobra({ ...novaSobra, cliente_nome: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
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
                <Label>Altura (mm) *</Label>
                <Input
                  type="number"
                  placeholder="Ex: 1200"
                  value={novaSobra.altura || ''}
                  onChange={(e) => setNovaSobra({ ...novaSobra, altura: Number(e.target.value) })}
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
          <DialogFooter className="sm:justify-between w-full">
            {editingId ? (
              <Button
                variant="outline"
                onClick={() => handlePrint({ ...novaSobra, id: editingId })}
                className="text-blue-600 border-blue-200 hover:bg-blue-50 mt-2 sm:mt-0"
              >
                <Printer className="w-4 h-4 mr-2" />
                Imprimir Etiqueta
              </Button>
            ) : (
              <div />
            )}
            <div className="flex flex-col-reverse sm:flex-row sm:space-x-2 mt-4 sm:mt-0">
              <Button
                variant="outline"
                className="mt-2 sm:mt-0"
                onClick={() => setIsModalOpen(false)}
              >
                Cancelar
              </Button>
              <Button
                onClick={handleSalvarSobra}
                className="bg-amber-500 hover:bg-amber-600 text-white"
                disabled={
                  descarteSugerido ||
                  !novaSobra.nome ||
                  novaSobra.largura <= 0 ||
                  novaSobra.altura <= 0 ||
                  novaSobra.espessura <= 0
                }
              >
                {editingId ? 'Salvar Alterações' : 'Salvar Retalho'}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
