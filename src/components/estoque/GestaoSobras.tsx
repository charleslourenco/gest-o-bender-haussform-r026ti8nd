import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Scissors, Trash2, AlertTriangle, Search, Check } from 'lucide-react'
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

  const [novaSobra, setNovaSobra] = useState({ nome: '', largura: 0, altura: 0 })
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
      const area = novaSobra.largura * novaSobra.altura
      setDescarteSugerido(area < 1)
    } else {
      setDescarteSugerido(false)
    }
  }, [novaSobra.largura, novaSobra.altura])

  async function handleSalvarSobra() {
    if (!novaSobra.nome || novaSobra.largura <= 0 || novaSobra.altura <= 0) {
      return toast({ title: 'Preencha todos os campos', variant: 'destructive' })
    }

    const area = novaSobra.largura * novaSobra.altura
    if (area < 1) {
      toast({
        title: 'Peça muito pequena!',
        description: 'Peças menores que 1m² devem ser descartadas.',
        variant: 'destructive',
      })
      return
    }

    const { error } = await supabase.from('estoque_sobras' as any).insert({
      nome: novaSobra.nome,
      largura: novaSobra.largura,
      altura: novaSobra.altura,
      area: area,
      status: 'disponivel',
    })

    if (error) {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' })
    } else {
      toast({ title: 'Sobra registrada com sucesso!' })
      setIsModalOpen(false)
      setNovaSobra({ nome: '', largura: 0, altura: 0 })
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
      .update({ status: 'usado' })
      .eq('id', id)
    fetchSobras()
    toast({ title: 'Retalho marcado como usado' })
  }

  const filteredSobras = sobras.filter((s) => s.nome.toLowerCase().includes(search.toLowerCase()))

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-midnight-navy">Banco de Retalhos (MDF)</h2>
          <p className="text-gray-500">Registre e aproveite sobras com mais de 1m².</p>
        </div>
        <Button
          onClick={() => setIsModalOpen(true)}
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
                  <TableHead className="text-center">Largura (m)</TableHead>
                  <TableHead className="text-center">Altura (m)</TableHead>
                  <TableHead className="text-center">Área (m²)</TableHead>
                  <TableHead className="text-center">Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredSobras.map((sobra) => (
                  <TableRow key={sobra.id}>
                    <TableCell className="font-medium">{sobra.nome}</TableCell>
                    <TableCell className="text-center">{sobra.largura}</TableCell>
                    <TableCell className="text-center">{sobra.altura}</TableCell>
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
                    <TableCell className="text-right">
                      {sobra.status === 'disponivel' && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-emerald-600 hover:bg-emerald-50 mr-2"
                          onClick={() => handleUsar(sobra.id)}
                        >
                          Marcar Uso
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-red-500 hover:bg-red-50 h-8 w-8"
                        onClick={() => handleDeletar(sobra.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {filteredSobras.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-gray-500">
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
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Registrar Novo Retalho</DialogTitle>
            <DialogDescription>
              Insira as medidas em metros. Peças menores que 1m² não são aceitas.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Nome do Material / Cor</Label>
              <Input
                placeholder="Ex: MDF Branco TX 15mm"
                value={novaSobra.nome}
                onChange={(e) => setNovaSobra({ ...novaSobra, nome: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Largura (metros)</Label>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="Ex: 1.5"
                  value={novaSobra.largura || ''}
                  onChange={(e) => setNovaSobra({ ...novaSobra, largura: Number(e.target.value) })}
                />
              </div>
              <div className="space-y-2">
                <Label>Altura (metros)</Label>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="Ex: 1.2"
                  value={novaSobra.altura || ''}
                  onChange={(e) => setNovaSobra({ ...novaSobra, altura: Number(e.target.value) })}
                />
              </div>
            </div>

            {descarteSugerido && novaSobra.largura > 0 && novaSobra.altura > 0 && (
              <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-md flex items-start gap-2">
                <AlertTriangle className="w-5 h-5 shrink-0" />
                <p className="text-sm font-medium">
                  Área total: {(novaSobra.largura * novaSobra.altura).toFixed(2)}m².
                  <br />
                  Peça muito pequena. Sugerimos o descarte direto.
                </p>
              </div>
            )}
            {!descarteSugerido && novaSobra.largura > 0 && novaSobra.altura > 0 && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-md flex items-center gap-2">
                <Check className="w-5 h-5 shrink-0" />
                <p className="text-sm font-medium">
                  Área total: {(novaSobra.largura * novaSobra.altura).toFixed(2)}m². Peça válida
                  para o estoque!
                </p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsModalOpen(false)}>
              Cancelar
            </Button>
            <Button
              onClick={handleSalvarSobra}
              className="bg-amber-500 hover:bg-amber-600 text-white"
              disabled={descarteSugerido}
            >
              Salvar Retalho
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
