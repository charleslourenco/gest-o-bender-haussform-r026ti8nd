import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Plus, Search, FileText } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'

type Orcamento = {
  id: string
  nome: string
  status: string
  criado_em: string
  cliente: { nome: string } | null
}

export default function OrcamentosEngenhariaList() {
  const [orcamentos, setOrcamentos] = useState<Orcamento[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  useEffect(() => {
    fetchOrcamentos()
  }, [])

  const fetchOrcamentos = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('orcamentos_engenharia')
        .select(`
          id,
          nome,
          status,
          criado_em,
          cliente:clientes(nome)
        `)
        .order('criado_em', { ascending: false })

      if (error) throw error

      const formattedData = (data || []).map((item: any) => ({
        ...item,
        cliente: Array.isArray(item.cliente) ? item.cliente[0] : item.cliente,
      }))

      setOrcamentos(formattedData as Orcamento[])
    } catch (error) {
      console.error('Error fetching orcamentos:', error)
    } finally {
      setLoading(false)
    }
  }

  const filteredOrcamentos = orcamentos.filter(
    (o) =>
      o.nome.toLowerCase().includes(search.toLowerCase()) ||
      o.cliente?.nome?.toLowerCase().includes(search.toLowerCase()),
  )

  const getStatusBadgeVariant = (status: string) => {
    const s = status.toLowerCase()
    if (s.includes('rascunho')) return 'secondary'
    if (s.includes('aprovado')) return 'default'
    if (s.includes('reprovado') || s.includes('cancelado')) return 'destructive'
    return 'outline'
  }

  return (
    <div className="container mx-auto py-8 max-w-6xl space-y-6 animate-fade-in-up">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Orçamentos de Engenharia</h1>
          <p className="text-muted-foreground mt-1">
            Gerencie os orçamentos técnicos e propostas comerciais.
          </p>
        </div>
        <Button asChild>
          <Link to="/orcamentos/novo">
            <Plus className="w-4 h-4 mr-2" />
            Novo Orçamento
          </Link>
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center space-x-2">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome ou cliente..."
                className="pl-9"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="space-y-3 w-full max-w-md">
                    <Skeleton className="h-5 w-48" />
                    <Skeleton className="h-4 w-32" />
                  </div>
                  <Skeleton className="h-8 w-24 hidden sm:block" />
                </div>
              ))}
            </div>
          ) : filteredOrcamentos.length === 0 ? (
            <div className="text-center py-16 px-4">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-muted/50 mb-4 ring-1 ring-border/50">
                <FileText className="w-6 h-6 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-medium">Nenhum orçamento encontrado</h3>
              <p className="text-muted-foreground max-w-sm mx-auto mt-2 text-sm">
                {search
                  ? 'Tente buscar com outros termos.'
                  : 'Crie seu primeiro orçamento de engenharia para começar.'}
              </p>
            </div>
          ) : (
            <div className="rounded-md border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/30">
                    <TableHead>Nome / Título</TableHead>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Data de Criação</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredOrcamentos.map((orcamento) => (
                    <TableRow key={orcamento.id} className="group">
                      <TableCell className="font-medium">{orcamento.nome}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {orcamento.cliente?.nome || 'Não vinculado'}
                      </TableCell>
                      <TableCell>
                        <Badge variant={getStatusBadgeVariant(orcamento.status)}>
                          {orcamento.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {new Date(orcamento.criado_em).toLocaleDateString('pt-BR')}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="opacity-0 group-hover:opacity-100 transition-opacity"
                          asChild
                        >
                          <Link to={`/orcamentos/${orcamento.id}`}>Ver detalhes</Link>
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
