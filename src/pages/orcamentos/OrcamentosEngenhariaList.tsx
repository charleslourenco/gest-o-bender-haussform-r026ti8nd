import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Plus, Calculator, Trash2, Edit, FileText } from 'lucide-react'
import { format } from 'date-fns'
import { useToast } from '@/hooks/use-toast'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
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

  const handleCreate = async () => {
    const { data } = await supabase
      .from('orcamentos_engenharia')
      .insert({ nome: 'Novo Orçamento', cliente_nome_manual: 'Cliente' })
      .select()
      .single()
    if (data) navigate(`/orcamentos/${data.id}`)
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
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Calculator className="w-6 h-6 text-primary" /> Painel de Projetos
        </h1>
        {activeTab === 'orcamentos' && (
          <Button onClick={handleCreate}>
            <Plus className="w-4 h-4 mr-2" /> Novo Orçamento
          </Button>
        )}
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="orcamentos" className="w-40">
            Orçamentos
          </TabsTrigger>
          <TabsTrigger value="listas" className="w-40">
            Listas de Materiais
          </TabsTrigger>
        </TabsList>

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
    </div>
  )
}
