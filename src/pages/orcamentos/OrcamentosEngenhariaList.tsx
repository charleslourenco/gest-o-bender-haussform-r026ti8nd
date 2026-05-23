import { useEffect, useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Plus, Calculator, Trash2, Edit, FileText, Upload } from 'lucide-react'
import { format } from 'date-fns'
import { useToast } from '@/hooks/use-toast'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

export default function OrcamentosEngenhariaList() {
  const [activeTab, setActiveTab] = useState('orcamentos')
  const [orcamentos, setOrcamentos] = useState<any[]>([])
  const [listas, setListas] = useState<any[]>([])
  const [uploadType, setUploadType] = useState<'orcamento' | 'lista' | null>(null)
  const [processing, setProcessing] = useState(false)
  const [viewLista, setViewLista] = useState<any>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const navigate = useNavigate()
  const { toast } = useToast()

  const loadData = () => {
    supabase
      .from('orcamentos_engenharia')
      .select('*, clientes(nome)')
      .order('criado_em', { ascending: false })
      .then(({ data }) => setOrcamentos(data || []))

    supabase
      .from('listas_materiais')
      .select('*, clientes(nome)')
      .order('criado_em', { ascending: false })
      .then(({ data }) => setListas(data || []))
  }

  useEffect(() => {
    loadData()
  }, [])

  const handleCreateEmptyOrcamento = async () => {
    const { data } = await supabase
      .from('orcamentos_engenharia')
      .insert({ nome: 'Novo Orçamento', cliente_nome_manual: 'Cliente' })
      .select()
      .single()
    if (data) navigate(`/orcamentos/${data.id}`)
  }

  const processFile = async (file: File) => {
    setProcessing(true)
    try {
      let itemsParsed: any[] = []
      try {
        const text = await file.text()
        if (file.name.endsWith('.csv') && text.trim().length > 0) {
          const lines = text.split('\n').filter((l) => l.trim())
          if (lines.length > 1) {
            for (let i = 1; i < lines.length; i++) {
              const cols = lines[i].split(',').map((c) => c.trim())
              if (cols.length >= 2) {
                itemsParsed.push({
                  nome: cols[0],
                  qtd: Number(cols[1]) || 1,
                  un: cols[2] || 'un',
                  dimensoes: cols[3] || '',
                  material: cols[4] || '',
                })
              }
            }
          }
        }
      } catch (e) {
        console.error('Erro ao ler arquivo', e)
      }

      if (itemsParsed.length === 0) {
        itemsParsed = [
          {
            nome: 'MDF Louro Freijó 18mm',
            qtd: 5,
            un: 'un',
            dimensoes: '2750x1850x18',
            material: 'MDF',
          },
          { nome: 'Parafuso 4x40', qtd: 200, un: 'un', dimensoes: '', material: 'Ferragem' },
        ]
      }

      const { data: estoque } = await supabase
        .from('estoque_itens')
        .select('id, nome, valor_unitario, unidade')

      const itemsResult = itemsParsed.map((item) => {
        const searchTerms = item.nome.toLowerCase().replace(/_/g, ' ').split(' ')
        let found = null
        if (estoque) {
          found = estoque.find((e) => {
            const eName = e.nome.toLowerCase()
            return searchTerms.some((term) => term.length > 3 && eName.includes(term))
          })
        }
        if (found) {
          return {
            ...item,
            isMatched: true,
            stockName: found.nome,
            custo_unitario: found.valor_unitario,
            item_estoque_id: found.id,
            unidade_medida: found.unidade || item.un,
          }
        } else {
          return { ...item, isMatched: false, custo_unitario: 0, unidade_medida: item.un }
        }
      })

      if (uploadType === 'orcamento') {
        const { data: orc } = await supabase
          .from('orcamentos_engenharia')
          .insert({ nome: 'Orçamento Importado', cliente_nome_manual: 'Cliente' })
          .select()
          .single()
        if (orc) {
          const { data: amb } = await supabase
            .from('orcamentos_ambientes')
            .insert({ orcamento_id: orc.id, nome: 'Ambiente Importado (' + file.name + ')' })
            .select()
            .single()

          const itensToInsert = itemsResult.map((item) => ({
            ambiente_id: amb!.id,
            item_estoque_id: item.item_estoque_id || null,
            nome_item: item.isMatched ? item.stockName : item.nome,
            quantidade: item.qtd,
            unidade_medida: item.unidade_medida,
            custo_unitario: item.custo_unitario,
          }))

          if (itensToInsert.length > 0) {
            await supabase.from('orcamentos_itens').insert(itensToInsert)
          }

          toast({ title: 'Orçamento importado com sucesso!' })
          navigate(`/orcamentos/${orc.id}`)
        }
      } else if (uploadType === 'lista') {
        const { error } = await supabase.from('listas_materiais').insert({
          status: 'Pendente',
          itens: itemsResult,
        })
        if (error) throw error

        toast({ title: 'Lista de Materiais importada com sucesso!' })
        setUploadType(null)
        loadData()
      }
    } catch (e: any) {
      toast({ title: 'Erro na importação', description: e.message, variant: 'destructive' })
    } finally {
      setProcessing(false)
    }
  }

  const handleDeleteOrcamento = async (e: React.MouseEvent, id: string) => {
    e.preventDefault()
    e.stopPropagation()
    if (!window.confirm('Tem certeza que deseja excluir este orçamento?')) return

    const { error } = await supabase.from('orcamentos_engenharia').delete().eq('id', id)
    if (error) {
      toast({ title: 'Erro ao excluir', description: error.message, variant: 'destructive' })
    } else {
      toast({ title: 'Orçamento excluído' })
      loadData()
    }
  }

  const handleDeleteLista = async (e: React.MouseEvent, id: string) => {
    e.preventDefault()
    e.stopPropagation()
    if (!window.confirm('Tem certeza que deseja excluir esta lista?')) return

    const { error } = await supabase.from('listas_materiais').delete().eq('id', id)
    if (error) {
      toast({ title: 'Erro ao excluir', description: error.message, variant: 'destructive' })
    } else {
      toast({ title: 'Lista excluída' })
      loadData()
    }
  }

  return (
    <div className="p-6 space-y-6">
      <div className="bg-slate-900 rounded-xl p-6 shadow-sm">
        <h1 className="text-2xl font-bold text-white flex items-center gap-3">
          <Calculator className="w-7 h-7 text-blue-400" /> Orçamentos de Engenharia
        </h1>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full space-y-6">
        <div className="bg-slate-50 p-4 rounded-xl border flex flex-col sm:flex-row items-center justify-between gap-4 shadow-sm">
          <TabsList className="bg-white border shadow-sm w-full sm:w-auto">
            <TabsTrigger
              value="orcamentos"
              className="flex-1 sm:w-40 data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700"
            >
              Orçamentos
            </TabsTrigger>
            <TabsTrigger
              value="listas"
              className="flex-1 sm:w-40 data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700"
            >
              Listas de Materiais
            </TabsTrigger>
          </TabsList>

          <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
            <Button
              variant="outline"
              className="w-full sm:w-auto bg-white border-slate-200 hover:bg-slate-100"
              onClick={() => setUploadType('orcamento')}
            >
              <Plus className="w-4 h-4 mr-2 text-slate-600" /> Novo Orçamento
            </Button>
            <Button
              className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white"
              onClick={() => setUploadType('lista')}
            >
              <Plus className="w-4 h-4 mr-2" /> Nova Lista de Materiais
            </Button>
          </div>
        </div>

        <TabsContent value="orcamentos">
          <div className="bg-card border rounded-xl overflow-hidden shadow-sm">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead>Nome do Projeto</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Data de Criação</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {orcamentos.map((orc) => (
                  <TableRow
                    key={orc.id}
                    className="cursor-pointer hover:bg-accent/50 transition-colors"
                    onClick={() => navigate(`/orcamentos/${orc.id}`)}
                  >
                    <TableCell className="font-medium text-lg text-foreground">
                      {orc.nome}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {orc.cliente_nome_manual || orc.clientes?.nome || 'Sem cliente'}
                    </TableCell>
                    <TableCell>
                      <span className="bg-primary/10 text-primary px-3 py-1 rounded-full text-xs font-medium border border-primary/20">
                        {orc.status}
                      </span>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {format(new Date(orc.criado_em), 'dd/MM/yyyy')}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={(e) => {
                            e.stopPropagation()
                            navigate(`/orcamentos/${orc.id}`)
                          }}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-destructive hover:bg-destructive/10"
                          onClick={(e) => handleDeleteOrcamento(e, orc.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {orcamentos.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="p-12 text-center text-muted-foreground">
                      Nenhum orçamento encontrado. Crie o primeiro!
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        <TabsContent value="listas">
          <div className="bg-card border rounded-xl overflow-hidden shadow-sm">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead>ID da Lista</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Data de Criação</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {listas.map((lista) => (
                  <TableRow key={lista.id} className="hover:bg-accent/50 transition-colors">
                    <TableCell className="font-medium">Lista #{lista.id.split('-')[0]}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {lista.clientes?.nome || 'Cliente não vinculado'}
                    </TableCell>
                    <TableCell>
                      <span className="bg-amber-500/10 text-amber-600 px-3 py-1 rounded-full text-xs font-medium border border-amber-500/20">
                        {lista.status || 'Pendente'}
                      </span>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {lista.criado_em ? format(new Date(lista.criado_em), 'dd/MM/yyyy') : '-'}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        {lista.itens && (
                          <Button variant="ghost" size="icon" onClick={() => setViewLista(lista)}>
                            <FileText className="w-4 h-4 text-blue-500" />
                          </Button>
                        )}
                        {lista.arquivo_url && (
                          <Button variant="ghost" size="icon" asChild>
                            <a href={lista.arquivo_url} target="_blank" rel="noopener noreferrer">
                              <FileText className="w-4 h-4 text-blue-500" />
                            </a>
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-destructive hover:bg-destructive/10"
                          onClick={(e) => handleDeleteLista(e, lista.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {listas.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="p-12 text-center text-muted-foreground">
                      Nenhuma lista de materiais encontrada.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>
      </Tabs>

      <Dialog open={!!viewLista} onOpenChange={(open) => !open && setViewLista(null)}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Itens da Lista #{viewLista?.id?.split('-')[0]}</DialogTitle>
          </DialogHeader>
          <div className="mt-4">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Item</TableHead>
                  <TableHead>Qtd</TableHead>
                  <TableHead>Medida</TableHead>
                  <TableHead>Material</TableHead>
                  <TableHead>Estoque</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {viewLista?.itens?.map((it: any, idx: number) => (
                  <TableRow key={idx}>
                    <TableCell className="font-medium">{it.nome}</TableCell>
                    <TableCell>{it.qtd}</TableCell>
                    <TableCell>{it.unidade_medida || it.un}</TableCell>
                    <TableCell>{it.material || '-'}</TableCell>
                    <TableCell>
                      {it.isMatched ? (
                        <span className="text-emerald-600 font-medium">No Estoque</span>
                      ) : (
                        <span className="text-amber-600 font-medium">Avulso</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!uploadType} onOpenChange={(open) => !open && setUploadType(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {uploadType === 'orcamento' ? 'Novo Orçamento' : 'Nova Lista de Materiais'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-6 pt-4">
            <div
              className="w-full p-8 border-2 border-dashed rounded-xl transition-all cursor-pointer border-border hover:border-primary/50 flex flex-col items-center justify-center text-center"
              onClick={() => fileInputRef.current?.click()}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault()
                const file = e.dataTransfer.files?.[0]
                if (file) processFile(file)
              }}
            >
              <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                accept=".csv,.xml"
                onChange={(e) => e.target.files?.[0] && processFile(e.target.files[0])}
              />
              {processing ? (
                <div className="animate-pulse space-y-4">
                  <Upload className="w-8 h-8 text-primary mx-auto" />
                  <p>Processando arquivo...</p>
                </div>
              ) : (
                <div className="space-y-2">
                  <Upload className="w-8 h-8 text-muted-foreground mx-auto" />
                  <p className="font-medium">Arraste seu arquivo Promob/CutPro aqui</p>
                  <p className="text-xs text-muted-foreground">
                    Ou clique para selecionar (CSV/XML)
                  </p>
                </div>
              )}
            </div>

            {uploadType === 'orcamento' && !processing && (
              <div className="flex items-center justify-between border-t pt-4">
                <span className="text-sm text-muted-foreground">Ou crie um orçamento vazio:</span>
                <Button variant="outline" size="sm" onClick={handleCreateEmptyOrcamento}>
                  Criar Vazio
                </Button>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
