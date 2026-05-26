import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Plus, Upload, Edit, Search, Settings } from 'lucide-react'
import { supabase } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/hooks/use-toast'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'

export default function OrcamentosEngenhariaList() {
  const [isAdmin, setIsAdmin] = useState(false)
  const [orcamentos, setOrcamentos] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  useEffect(() => {
    checkAdmin()
    fetchOrcamentos()
  }, [])

  const checkAdmin = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (user) {
      const { data } = await supabase.rpc('is_admin', { user_id: user.id })
      setIsAdmin(!!data)
    }
  }

  const fetchOrcamentos = async () => {
    setLoading(true)
    const { data } = await supabase
      .from('orcamentos_engenharia')
      .select('*')
      .order('criado_em', { ascending: false })

    if (data) setOrcamentos(data)
    setLoading(false)
  }

  const filteredOrcamentos = orcamentos.filter((orc) =>
    orc.nome.toLowerCase().includes(search.toLowerCase()),
  )

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Orçamentos de Engenharia</h1>
        <p className="text-muted-foreground mt-1">
          Gerencie orçamentos, precificação e configurações de markup.
        </p>
      </div>

      <Tabs defaultValue="lista" className="w-full">
        <TabsList className="mb-4 bg-muted/50 border">
          <TabsTrigger value="lista">Lista de Orçamentos</TabsTrigger>
          {isAdmin && (
            <TabsTrigger
              value="config"
              className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
            >
              <Settings className="w-4 h-4 mr-2" />
              Configurar Markup
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="lista" className="space-y-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-card p-4 rounded-lg border shadow-sm">
            <div className="relative w-full sm:w-80">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar orçamentos..."
                className="pl-9 bg-muted/50"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <Link to="/orcamentos/upload" className="w-full sm:w-auto">
                <Button variant="outline" className="w-full">
                  <Upload className="w-4 h-4 mr-2" /> Upload Planilha
                </Button>
              </Link>
              <Link to="/orcamentos/novo" className="w-full sm:w-auto">
                <Button className="w-full">
                  <Plus className="w-4 h-4 mr-2" /> Novo Orçamento
                </Button>
              </Link>
            </div>
          </div>

          <Card className="shadow-sm">
            <Table>
              <TableHeader className="bg-muted/50">
                <TableRow>
                  <TableHead>Nome do Projeto</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Data de Criação</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell
                      colSpan={4}
                      className="text-center py-8 text-muted-foreground animate-pulse"
                    >
                      Carregando orçamentos...
                    </TableCell>
                  </TableRow>
                ) : filteredOrcamentos.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                      Nenhum orçamento encontrado.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredOrcamentos.map((orc) => (
                    <TableRow key={orc.id} className="hover:bg-muted/30 transition-colors">
                      <TableCell className="font-medium">{orc.nome}</TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="font-normal">
                          {orc.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {new Date(orc.criado_em).toLocaleDateString('pt-BR')}
                      </TableCell>
                      <TableCell className="text-right">
                        <Link to={`/orcamentos/${orc.id}`}>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="hover:bg-primary/10 hover:text-primary"
                          >
                            <Edit className="w-4 h-4 mr-2" /> Editar
                          </Button>
                        </Link>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        {isAdmin && (
          <TabsContent value="config">
            <ConfigMarkup />
          </TabsContent>
        )}
      </Tabs>
    </div>
  )
}

function ConfigMarkup() {
  const [loading, setLoading] = useState(false)
  const [vista, setVista] = useState('0.40000')
  const [prazo, setPrazo] = useState('0.35000')
  const { toast } = useToast()

  useEffect(() => {
    supabase
      .from('configuracoes_sistema')
      .select('*')
      .single()
      .then(({ data }) => {
        if (data) {
          setVista(Number(data.markup_vista).toFixed(5))
          setPrazo(Number(data.markup_prazo).toFixed(5))
        }
      })
  }, [])

  const handleSave = async () => {
    const numVista = parseFloat(vista)
    const numPrazo = parseFloat(prazo)

    if (isNaN(numVista) || isNaN(numPrazo)) {
      toast({
        title: 'Valores inválidos',
        description: 'Por favor, insira números válidos.',
        variant: 'destructive',
      })
      return
    }

    setLoading(true)
    const { error } = await supabase
      .from('configuracoes_sistema')
      .update({ markup_vista: numVista, markup_prazo: numPrazo })
      .eq('id', '00000000-0000-0000-0000-000000000001')

    setLoading(false)
    if (error) {
      toast({ title: 'Erro ao salvar', description: error.message, variant: 'destructive' })
    } else {
      toast({ title: 'Configurações salvas com sucesso!' })
    }
  }

  return (
    <Card className="max-w-2xl shadow-sm border-t-4 border-t-primary">
      <CardHeader>
        <CardTitle>Markup Global</CardTitle>
        <CardDescription>
          Defina os divisores de markup padrão (precisão de até 5 casas decimais). Estes valores
          serão aplicados aos novos orçamentos conforme a modalidade escolhida.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <Label className="text-sm font-semibold">Divisor - Pagamento À Vista</Label>
            <Input
              type="number"
              step="0.00001"
              value={vista}
              onChange={(e) => setVista(e.target.value)}
              className="font-mono text-lg"
            />
            <p className="text-xs text-muted-foreground">Recomendado: 0.40000</p>
          </div>
          <div className="space-y-2">
            <Label className="text-sm font-semibold">Divisor - Pagamento A Prazo</Label>
            <Input
              type="number"
              step="0.00001"
              value={prazo}
              onChange={(e) => setPrazo(e.target.value)}
              className="font-mono text-lg"
            />
            <p className="text-xs text-muted-foreground">Recomendado: 0.35000</p>
          </div>
        </div>
        <div className="flex justify-end pt-4 border-t">
          <Button onClick={handleSave} disabled={loading} size="lg">
            {loading ? 'Salvando...' : 'Salvar Configurações'}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
