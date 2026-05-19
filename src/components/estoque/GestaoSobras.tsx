import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Scissors, Trash2, Search, Check, Printer, Edit } from 'lucide-react'
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
import { RegistrarRetalhoModal } from './RegistrarRetalhoModal'
import { printScrapLabel } from '@/lib/print-label'

export function GestaoSobras() {
  const [sobras, setSobras] = useState<any[]>([])
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [search, setSearch] = useState('')

  const [sobraEditando, setSobraEditando] = useState<any>(null)

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

  function openEditModal(sobra: any) {
    setSobraEditando(sobra)
    setIsModalOpen(true)
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
          <p className="text-gray-500">Gerencie e imprima etiquetas térmicas de sobras.</p>
        </div>
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
                  <TableHead>Cliente</TableHead>
                  <TableHead>Nome do MDF</TableHead>
                  <TableHead>Marca</TableHead>
                  <TableHead className="text-center">Alt x Lar (mm)</TableHead>
                  <TableHead className="text-center">Espess. (mm)</TableHead>
                  <TableHead className="text-center">Área (m²)</TableHead>
                  <TableHead className="text-center">Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredSobras.map((sobra) => (
                  <TableRow key={sobra.id}>
                    <TableCell className="font-medium">{sobra.cliente_nome || '-'}</TableCell>
                    <TableCell>{sobra.nome}</TableCell>
                    <TableCell>{sobra.marca || '-'}</TableCell>
                    <TableCell className="text-center">
                      {sobra.altura} x {sobra.largura}
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
                    <TableCell className="text-right whitespace-nowrap">
                      {sobra.status === 'disponivel' && (
                        <>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-blue-600 hover:bg-blue-50 mr-1"
                            onClick={() => printScrapLabel(sobra)}
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
                    <TableCell colSpan={8} className="text-center py-8 text-gray-500">
                      Nenhum retalho encontrado.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <RegistrarRetalhoModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        sobraParaEditar={sobraEditando}
        onSave={fetchSobras}
      />
    </div>
  )
}
