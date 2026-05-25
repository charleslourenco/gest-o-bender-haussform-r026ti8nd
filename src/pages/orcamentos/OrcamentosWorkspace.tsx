import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { supabase } from '@/lib/supabase/client'
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@/components/ui/resizable'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Plus, Search, Calculator, Trash2, FolderKanban } from 'lucide-react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { UploadTab } from './tabs/UploadTab'
import { OrcamentoInterno } from './tabs/OrcamentoInterno'
import { ListaMateriaisTab } from './tabs/ListaMateriaisTab'
import { format } from 'date-fns'
import { useToast } from '@/hooks/use-toast'
import { cn } from '@/lib/utils'

export default function OrcamentosWorkspace() {
  const [searchParams, setSearchParams] = useSearchParams()
  const selectedId = searchParams.get('id')

  const [orcamentos, setOrcamentos] = useState<any[]>([])
  const [search, setSearch] = useState('')
  const { toast } = useToast()

  const loadOrcamentos = async () => {
    const { data } = await supabase
      .from('orcamentos_engenharia')
      .select('*, clientes(nome)')
      .order('criado_em', { ascending: false })
    if (data) setOrcamentos(data)
  }

  useEffect(() => {
    loadOrcamentos()
  }, [])

  const handleNew = async () => {
    const { data, error } = await supabase
      .from('orcamentos_engenharia')
      .insert({ nome: 'Novo Projeto', cliente_nome_manual: '' })
      .select()
      .single()

    if (error) {
      toast({ title: 'Erro ao criar', description: error.message, variant: 'destructive' })
    } else if (data) {
      setOrcamentos([data, ...orcamentos])
      setSearchParams({ id: data.id })
    }
  }

  const handleDelete = async (id: string) => {
    if (
      !window.confirm(
        'Tem certeza que deseja excluir este orçamento? Todos os ambientes e listas vinculados serão apagados.',
      )
    )
      return
    const { error } = await supabase.from('orcamentos_engenharia').delete().eq('id', id)
    if (error) {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' })
    } else {
      toast({ title: 'Orçamento excluído' })
      if (selectedId === id) setSearchParams({})
      loadOrcamentos()
    }
  }

  const filtered = orcamentos.filter(
    (o) =>
      o.nome?.toLowerCase().includes(search.toLowerCase()) ||
      (o.clientes?.nome && o.clientes.nome.toLowerCase().includes(search.toLowerCase())) ||
      (o.cliente_nome_manual && o.cliente_nome_manual.toLowerCase().includes(search.toLowerCase())),
  )

  const selectedProject = orcamentos.find((o) => o.id === selectedId)

  const updateLocalProject = (updated: any) => {
    setOrcamentos((prev) => prev.map((o) => (o.id === updated.id ? { ...o, ...updated } : o)))
  }

  return (
    <div className="h-[calc(100vh-2rem)] flex flex-col p-4 space-y-4">
      <div className="bg-slate-900 rounded-xl p-4 shadow-sm flex-shrink-0">
        <h1 className="text-2xl font-bold text-white flex items-center gap-3">
          <FolderKanban className="w-7 h-7 text-blue-400" /> Workspace de Orçamentos e Materiais
        </h1>
      </div>

      <ResizablePanelGroup
        direction="horizontal"
        className="flex-1 rounded-xl overflow-hidden border bg-background shadow-sm"
      >
        <ResizablePanel
          defaultSize={25}
          minSize={20}
          maxSize={40}
          className="flex flex-col bg-muted/10"
        >
          <div className="p-4 border-b space-y-4 bg-background">
            <Button onClick={handleNew} className="w-full bg-blue-600 hover:bg-blue-700 text-white">
              <Plus className="w-4 h-4 mr-2" /> Novo Projeto
            </Button>
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-3 text-muted-foreground" />
              <Input
                placeholder="Buscar projetos..."
                className="pl-9 bg-background"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {filtered.map((o) => (
              <div
                key={o.id}
                onClick={() => setSearchParams({ id: o.id })}
                className={cn(
                  'flex items-center justify-between p-3 rounded-lg cursor-pointer transition-colors border',
                  selectedId === o.id
                    ? 'bg-blue-50 border-blue-200 shadow-sm'
                    : 'bg-background border-transparent hover:border-border hover:bg-accent/50',
                )}
              >
                <div className="overflow-hidden flex-1 pr-2">
                  <p
                    className={cn(
                      'font-medium truncate',
                      selectedId === o.id ? 'text-blue-900' : 'text-foreground',
                    )}
                  >
                    {o.nome}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">
                    {o.cliente_nome_manual || o.clientes?.nome || 'Sem cliente'} •{' '}
                    {format(new Date(o.criado_em), 'dd/MM/yy')}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-destructive opacity-0 hover:opacity-100 focus:opacity-100 group-hover:opacity-100"
                  onClick={(e) => {
                    e.stopPropagation()
                    handleDelete(o.id)
                  }}
                  style={{ opacity: selectedId === o.id ? 1 : undefined }}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            ))}
            {filtered.length === 0 && (
              <p className="text-sm text-center text-muted-foreground p-8">
                Nenhum projeto encontrado.
              </p>
            )}
          </div>
        </ResizablePanel>

        <ResizableHandle withHandle />

        <ResizablePanel defaultSize={75} className="flex flex-col bg-background relative">
          {!selectedProject ? (
            <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground space-y-4">
              <Calculator className="w-16 h-16 opacity-20" />
              <p className="text-lg font-medium">Selecione um projeto na lista lateral</p>
              <p className="text-sm">ou crie um novo para começar.</p>
            </div>
          ) : (
            <div className="flex flex-col h-full overflow-hidden">
              <div className="p-6 border-b bg-card flex items-center justify-between gap-4 shrink-0">
                <div className="flex-1 space-y-2">
                  <Input
                    className="text-2xl font-bold h-auto py-1 px-2 border-transparent hover:border-input focus:border-input bg-transparent -ml-2"
                    value={selectedProject.nome}
                    onChange={(e) =>
                      updateLocalProject({ id: selectedProject.id, nome: e.target.value })
                    }
                    onBlur={async (e) => {
                      await supabase
                        .from('orcamentos_engenharia')
                        .update({ nome: e.target.value })
                        .eq('id', selectedProject.id)
                    }}
                    placeholder="Nome do Projeto"
                  />
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground font-medium">Cliente:</span>
                    <Input
                      className="h-7 px-2 text-sm max-w-sm border-transparent hover:border-input focus:border-input bg-transparent -ml-2"
                      value={selectedProject.cliente_nome_manual || ''}
                      onChange={(e) =>
                        updateLocalProject({
                          id: selectedProject.id,
                          cliente_nome_manual: e.target.value,
                        })
                      }
                      onBlur={async (e) => {
                        await supabase
                          .from('orcamentos_engenharia')
                          .update({ cliente_nome_manual: e.target.value })
                          .eq('id', selectedProject.id)
                      }}
                      placeholder="Nome do cliente (opcional)"
                    />
                  </div>
                </div>
              </div>

              <Tabs defaultValue="upload" className="flex-1 flex flex-col min-h-0">
                <div className="bg-muted/30 px-6 pt-4 border-b shrink-0">
                  <TabsList className="bg-transparent h-auto p-0 gap-6">
                    <TabsTrigger
                      value="upload"
                      className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none pb-3 px-1 font-medium"
                    >
                      1. Upload Inteligente
                    </TabsTrigger>
                    <TabsTrigger
                      value="orcamento"
                      className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none pb-3 px-1 font-medium"
                    >
                      2. Orçamento Comercial
                    </TabsTrigger>
                    <TabsTrigger
                      value="lista"
                      className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none pb-3 px-1 font-medium"
                    >
                      3. Lista Técnica (Materiais)
                    </TabsTrigger>
                  </TabsList>
                </div>

                <div className="flex-1 overflow-auto bg-background p-6">
                  <TabsContent value="upload" className="h-full m-0">
                    <UploadTab
                      orcamentoId={selectedProject.id}
                      clienteId={selectedProject.cliente_id}
                    />
                  </TabsContent>
                  <TabsContent value="orcamento" className="h-full m-0">
                    <OrcamentoInterno orcamento={selectedProject} onUpdate={updateLocalProject} />
                  </TabsContent>
                  <TabsContent value="lista" className="h-full m-0">
                    <ListaMateriaisTab orcamento={selectedProject} />
                  </TabsContent>
                </div>
              </Tabs>
            </div>
          )}
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  )
}
