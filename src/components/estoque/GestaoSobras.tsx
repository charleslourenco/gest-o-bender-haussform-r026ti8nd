import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Scissors,
  Trash2,
  Search,
  Check,
  Printer,
  Edit,
  LayoutTemplate,
  ScissorsLineDashed,
  Tape,
  Ruler,
} from 'lucide-react'
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
import { RegistrarChapaModal } from './RegistrarChapaModal'
import { RegistrarFitaRoloModal } from './RegistrarFitaRoloModal'
import { RegistrarFitaPedacoModal } from './RegistrarFitaPedacoModal'
import { printScrapLabel } from '@/lib/print-label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'

export function GestaoSobras() {
  const [sobras, setSobras] = useState<any[]>([])
  const [search, setSearch] = useState('')

  const [isTypeSelectionOpen, setIsTypeSelectionOpen] = useState(false)
  const [isRetalhoModalOpen, setIsRetalhoModalOpen] = useState(false)
  const [isChapaModalOpen, setIsChapaModalOpen] = useState(false)
  const [isFitaRoloModalOpen, setIsFitaRoloModalOpen] = useState(false)
  const [isFitaPedacoModalOpen, setIsFitaPedacoModalOpen] = useState(false)

  const [sobraEditando, setSobraEditando] = useState<any>(null)
  const [chapaEditando, setChapaEditando] = useState<any>(null)
  const [fitaEditando, setFitaEditando] = useState<any>(null)

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
    if (sobra.tipo === 'chapa_inteira') {
      setChapaEditando(sobra)
      setIsChapaModalOpen(true)
    } else if (sobra.tipo === 'fita_rolo') {
      setFitaEditando(sobra)
      setIsFitaRoloModalOpen(true)
    } else if (sobra.tipo === 'fita_pedaco') {
      setFitaEditando(sobra)
      setIsFitaPedacoModalOpen(true)
    } else {
      setSobraEditando(sobra)
      setIsRetalhoModalOpen(true)
    }
  }

  async function handleDeletar(id: string) {
    if (!confirm('Deseja realmente apagar este registro?')) return
    await supabase
      .from('estoque_sobras' as any)
      .delete()
      .eq('id', id)
    fetchSobras()
    toast({ title: 'Registro removido' })
  }

  async function handleUsar(id: string) {
    if (!confirm('Marcar esta sobra como utilizada?')) return
    await supabase
      .from('estoque_sobras' as any)
      .update({ status: 'usado', usado_em: new Date().toISOString() })
      .eq('id', id)
    fetchSobras()
    toast({ title: 'Sobra marcada como usada' })
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
          <h2 className="text-2xl font-bold text-midnight-navy dark:text-slate-100">
            Gestão de Sobras (MDF)
          </h2>
          <p className="text-gray-500 dark:text-slate-400">
            Gerencie retalhos e chapas inteiras excedentes.
          </p>
        </div>
        <Button
          className="bg-steel-blue hover:bg-dark-denim text-white"
          onClick={() => setIsTypeSelectionOpen(true)}
        >
          Registrar Sobra
        </Button>
      </div>

      <Tabs defaultValue="retalhos">
        <TabsList className="mb-4">
          <TabsTrigger value="retalhos">Retalhos</TabsTrigger>
          <TabsTrigger value="chapas">Chapas Inteiras</TabsTrigger>
          <TabsTrigger value="fitas">Fitas de Borda</TabsTrigger>
        </TabsList>

        <TabsContent value="retalhos">
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
              <div className="overflow-auto max-h-[calc(100vh-300px)] rounded-b-lg">
                <Table className="min-w-[1000px]">
                  <TableHeader className="bg-gray-50 dark:bg-slate-900 sticky top-0 z-10 shadow-sm">
                    <TableRow>
                      <TableHead className="whitespace-nowrap">Cliente/Projeto</TableHead>
                      <TableHead className="whitespace-nowrap">Nome do MDF</TableHead>
                      <TableHead className="whitespace-nowrap">Marca</TableHead>
                      <TableHead className="text-center whitespace-nowrap">
                        Alt x Lar (mm)
                      </TableHead>
                      <TableHead className="text-center whitespace-nowrap">Espess. (mm)</TableHead>
                      <TableHead className="text-center whitespace-nowrap">Área (m²)</TableHead>
                      <TableHead className="text-center whitespace-nowrap">Status</TableHead>
                      <TableHead className="text-right whitespace-nowrap">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredSobras
                      .filter((s) => !s.tipo || s.tipo === 'retalho')
                      .map((sobra) => (
                        <TableRow key={sobra.id}>
                          <TableCell className="font-medium">{sobra.cliente_nome || '-'}</TableCell>
                          <TableCell>{sobra.nome}</TableCell>
                          <TableCell>{sobra.marca || '-'}</TableCell>
                          <TableCell className="text-center">
                            {sobra.altura} x {sobra.largura}
                          </TableCell>
                          <TableCell className="text-center">{sobra.espessura}</TableCell>
                          <TableCell className="text-center font-bold text-steel-blue dark:text-blue-400">
                            {sobra.area.toFixed(2)} m²
                          </TableCell>
                          <TableCell className="text-center">
                            {sobra.status === 'disponivel' ? (
                              <Badge
                                variant="outline"
                                className="bg-emerald-50 text-emerald-600 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-400 dark:border-emerald-900"
                              >
                                Disponível
                              </Badge>
                            ) : (
                              <Badge
                                variant="secondary"
                                className="bg-gray-100 text-gray-500 dark:bg-slate-800 dark:text-slate-400"
                              >
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
                                  className="text-blue-600 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-950/50 mr-1"
                                  onClick={() => printScrapLabel(sobra)}
                                  title="Imprimir Etiqueta"
                                >
                                  <Printer className="w-4 h-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="text-emerald-600 hover:bg-emerald-50 dark:text-emerald-400 dark:hover:bg-emerald-950/50 mr-1"
                                  onClick={() => handleUsar(sobra.id)}
                                  title="Marcar Uso"
                                >
                                  <Check className="w-4 h-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="text-amber-500 hover:bg-amber-50 dark:text-amber-400 dark:hover:bg-amber-950/50 h-8 w-8 mr-1"
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
                              className="text-red-500 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/50 h-8 w-8"
                              onClick={() => handleDeletar(sobra.id)}
                              title="Deletar"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    {filteredSobras.filter((s) => !s.tipo || s.tipo === 'retalho').length === 0 && (
                      <TableRow>
                        <TableCell
                          colSpan={8}
                          className="text-center py-8 text-gray-500 dark:text-slate-400"
                        >
                          Nenhum retalho encontrado.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="chapas">
          <Card>
            <CardHeader className="pb-3 border-b">
              <div className="relative max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Buscar chapa..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-auto max-h-[calc(100vh-300px)] rounded-b-lg">
                <Table className="min-w-[800px]">
                  <TableHeader className="bg-gray-50 dark:bg-slate-900 sticky top-0 z-10 shadow-sm">
                    <TableRow>
                      <TableHead className="whitespace-nowrap">Cliente/Projeto</TableHead>
                      <TableHead className="whitespace-nowrap">Nome do MDF</TableHead>
                      <TableHead className="whitespace-nowrap">Marca</TableHead>
                      <TableHead className="text-center whitespace-nowrap">Espess. (mm)</TableHead>
                      <TableHead className="text-center whitespace-nowrap">Status</TableHead>
                      <TableHead className="text-right whitespace-nowrap">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredSobras
                      .filter((s) => s.tipo === 'chapa_inteira')
                      .map((sobra) => (
                        <TableRow key={sobra.id}>
                          <TableCell className="font-medium">{sobra.cliente_nome || '-'}</TableCell>
                          <TableCell>{sobra.nome}</TableCell>
                          <TableCell>{sobra.marca || '-'}</TableCell>
                          <TableCell className="text-center">{sobra.espessura}</TableCell>
                          <TableCell className="text-center">
                            {sobra.status === 'disponivel' ? (
                              <Badge
                                variant="outline"
                                className="bg-emerald-50 text-emerald-600 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-400 dark:border-emerald-900"
                              >
                                Disponível
                              </Badge>
                            ) : (
                              <Badge
                                variant="secondary"
                                className="bg-gray-100 text-gray-500 dark:bg-slate-800 dark:text-slate-400"
                              >
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
                                  className="text-emerald-600 hover:bg-emerald-50 dark:text-emerald-400 dark:hover:bg-emerald-950/50 mr-1"
                                  onClick={() => handleUsar(sobra.id)}
                                  title="Marcar Uso"
                                >
                                  <Check className="w-4 h-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="text-amber-500 hover:bg-amber-50 dark:text-amber-400 dark:hover:bg-amber-950/50 h-8 w-8 mr-1"
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
                              className="text-red-500 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/50 h-8 w-8"
                              onClick={() => handleDeletar(sobra.id)}
                              title="Deletar"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    {filteredSobras.filter((s) => s.tipo === 'chapa_inteira').length === 0 && (
                      <TableRow>
                        <TableCell
                          colSpan={6}
                          className="text-center py-8 text-gray-500 dark:text-slate-400"
                        >
                          Nenhuma chapa inteira encontrada.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="fitas">
          <Card>
            <CardHeader className="pb-3 border-b">
              <div className="relative max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Buscar fita..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-auto max-h-[calc(100vh-300px)] rounded-b-lg">
                <Table className="min-w-[800px]">
                  <TableHeader className="bg-gray-50 dark:bg-slate-900 sticky top-0 z-10 shadow-sm">
                    <TableRow>
                      <TableHead className="whitespace-nowrap">Cliente/Projeto</TableHead>
                      <TableHead className="whitespace-nowrap">Item</TableHead>
                      <TableHead className="whitespace-nowrap">Tipo</TableHead>
                      <TableHead className="text-center whitespace-nowrap">Largura (mm)</TableHead>
                      <TableHead className="text-center whitespace-nowrap">
                        Comprimento (m)
                      </TableHead>
                      <TableHead className="text-center whitespace-nowrap">Status</TableHead>
                      <TableHead className="text-right whitespace-nowrap">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredSobras
                      .filter((s) => s.tipo === 'fita_rolo' || s.tipo === 'fita_pedaco')
                      .map((sobra) => (
                        <TableRow key={sobra.id}>
                          <TableCell className="font-medium">{sobra.cliente_nome || '-'}</TableCell>
                          <TableCell>{sobra.nome}</TableCell>
                          <TableCell>{sobra.tipo === 'fita_rolo' ? 'Rolo' : 'Pedaço'}</TableCell>
                          <TableCell className="text-center">{sobra.largura || '-'}</TableCell>
                          <TableCell className="text-center">
                            {sobra.tipo === 'fita_pedaco' ? sobra.comprimento : '-'}
                          </TableCell>
                          <TableCell className="text-center">
                            {sobra.status === 'disponivel' ? (
                              <Badge
                                variant="outline"
                                className="bg-emerald-50 text-emerald-600 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-400 dark:border-emerald-900"
                              >
                                Disponível
                              </Badge>
                            ) : (
                              <Badge
                                variant="secondary"
                                className="bg-gray-100 text-gray-500 dark:bg-slate-800 dark:text-slate-400"
                              >
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
                                  className="text-blue-600 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-950/50 mr-1"
                                  onClick={() => printScrapLabel(sobra)}
                                  title="Imprimir Etiqueta"
                                >
                                  <Printer className="w-4 h-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="text-emerald-600 hover:bg-emerald-50 dark:text-emerald-400 dark:hover:bg-emerald-950/50 mr-1"
                                  onClick={() => handleUsar(sobra.id)}
                                  title="Marcar Uso"
                                >
                                  <Check className="w-4 h-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="text-amber-500 hover:bg-amber-50 dark:text-amber-400 dark:hover:bg-amber-950/50 h-8 w-8 mr-1"
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
                              className="text-red-500 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/50 h-8 w-8"
                              onClick={() => handleDeletar(sobra.id)}
                              title="Deletar"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    {filteredSobras.filter(
                      (s) => s.tipo === 'fita_rolo' || s.tipo === 'fita_pedaco',
                    ).length === 0 && (
                      <TableRow>
                        <TableCell
                          colSpan={7}
                          className="text-center py-8 text-gray-500 dark:text-slate-400"
                        >
                          Nenhuma fita encontrada.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={isTypeSelectionOpen} onOpenChange={setIsTypeSelectionOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Tipo de Sobra</DialogTitle>
            <DialogDescription>
              Selecione o tipo de sobra de projeto que deseja registrar no sistema.
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 py-4">
            <Button
              variant="outline"
              className="h-32 flex flex-col items-center justify-center gap-4 hover:border-steel-blue hover:text-steel-blue transition-colors"
              onClick={() => {
                setIsTypeSelectionOpen(false)
                setSobraEditando(null)
                setIsRetalhoModalOpen(true)
              }}
            >
              <ScissorsLineDashed className="w-8 h-8" />
              <div className="text-center">
                <div className="font-semibold">Retalho</div>
                <div className="text-xs text-muted-foreground mt-1">
                  Pedaço com dimensões customizadas
                </div>
              </div>
            </Button>
            <Button
              variant="outline"
              className="h-32 flex flex-col items-center justify-center gap-4 hover:border-emerald-600 hover:text-emerald-600 transition-colors"
              onClick={() => {
                setIsTypeSelectionOpen(false)
                setChapaEditando(null)
                setIsChapaModalOpen(true)
              }}
            >
              <LayoutTemplate className="w-8 h-8" />
              <div className="text-center">
                <div className="font-semibold">Chapa Inteira</div>
                <div className="text-xs text-muted-foreground mt-1">
                  Chapa completa não utilizada
                </div>
              </div>
            </Button>
            <Button
              variant="outline"
              className="h-32 flex flex-col items-center justify-center gap-4 hover:border-amber-600 hover:text-amber-600 transition-colors"
              onClick={() => {
                setIsTypeSelectionOpen(false)
                setFitaEditando(null)
                setIsFitaRoloModalOpen(true)
              }}
            >
              <Tape className="w-8 h-8" />
              <div className="text-center">
                <div className="font-semibold">Fita (Rolo)</div>
                <div className="text-xs text-muted-foreground mt-1">Rolo de fita de borda</div>
              </div>
            </Button>
            <Button
              variant="outline"
              className="h-32 flex flex-col items-center justify-center gap-4 hover:border-purple-600 hover:text-purple-600 transition-colors"
              onClick={() => {
                setIsTypeSelectionOpen(false)
                setFitaEditando(null)
                setIsFitaPedacoModalOpen(true)
              }}
            >
              <Ruler className="w-8 h-8" />
              <div className="text-center">
                <div className="font-semibold">Fita (Pedaço)</div>
                <div className="text-xs text-muted-foreground mt-1">Pedaço de fita de borda</div>
              </div>
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <RegistrarRetalhoModal
        isOpen={isRetalhoModalOpen}
        onClose={() => setIsRetalhoModalOpen(false)}
        sobraParaEditar={sobraEditando}
        onSave={fetchSobras}
      />

      <RegistrarChapaModal
        isOpen={isChapaModalOpen}
        onClose={() => setIsChapaModalOpen(false)}
        sobraParaEditar={chapaEditando}
        onSave={fetchSobras}
      />

      <RegistrarFitaRoloModal
        isOpen={isFitaRoloModalOpen}
        onClose={() => setIsFitaRoloModalOpen(false)}
        sobraParaEditar={fitaEditando}
        onSave={fetchSobras}
      />

      <RegistrarFitaPedacoModal
        isOpen={isFitaPedacoModalOpen}
        onClose={() => setIsFitaPedacoModalOpen(false)}
        sobraParaEditar={fitaEditando}
        onSave={fetchSobras}
      />
    </div>
  )
}
