import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useToast } from '@/hooks/use-toast'
import { Check, X, Clock, ExternalLink, RefreshCw, Trash2 } from 'lucide-react'

type Solicitacao = {
  id: string
  usuario_id: string
  nome_item: string
  quantidade: number
  unidade: string
  link: string | null
  cor: string | null
  tamanho: string | null
  modelo: string | null
  motivo: string | null
  urgencia: string
  status: string
  criado_em: string
  usuario?: { nome: string }
}

export function SolicitacoesCompra() {
  const [solicitacoes, setSolicitacoes] = useState<Solicitacao[]>([])
  const [loading, setLoading] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)
  const { toast } = useToast()

  const fetchSolicitacoes = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('solicitacoes_compra' as any)
      .select(`
        *,
        usuario:users(nome)
      `)
      .order('criado_em', { ascending: false })

    if (error) {
      console.error(error)
      toast({
        title: 'Erro ao carregar',
        description: 'Houve um erro ao buscar as solicitações.',
        variant: 'destructive',
      })
    } else if (data) {
      setSolicitacoes(data as Solicitacao[])
    }
    setLoading(false)
  }

  useEffect(() => {
    fetchSolicitacoes()
    checkAdmin()
  }, [])

  async function checkAdmin() {
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (user) {
      const { data } = await supabase.rpc('is_admin', { user_id: user.id })
      setIsAdmin(!!data)
    }
  }

  const handleDelete = async (id: string) => {
    if (!window.confirm('Tem certeza que deseja apagar esta solicitação?')) return
    await supabase.from('solicitacoes_compra').delete().eq('id', id)
    fetchSolicitacoes()
    toast({ title: 'Solicitação apagada' })
  }

  const handleUpdateStatus = async (id: string, newStatus: string) => {
    const { error } = await supabase
      .from('solicitacoes_compra' as any)
      .update({ status: newStatus })
      .eq('id', id)

    if (error) {
      toast({
        title: 'Erro',
        description: 'Não foi possível atualizar o status.',
        variant: 'destructive',
      })
    } else {
      toast({
        title: 'Status atualizado',
        description: `Solicitação marcada como ${newStatus}.`,
      })
      fetchSolicitacoes()
    }
  }

  return (
    <Card className="animate-in fade-in duration-300">
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Solicitações de Compra</CardTitle>
          <CardDescription>Gerencie os pedidos de materiais feitos pela equipe</CardDescription>
        </div>
        <Button
          variant="outline"
          size="icon"
          onClick={fetchSolicitacoes}
          disabled={loading}
          title="Atualizar"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
        </Button>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data</TableHead>
                <TableHead>Solicitante</TableHead>
                <TableHead>Item / Detalhes</TableHead>
                <TableHead>Qtd</TableHead>
                <TableHead>Urgência</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {solicitacoes.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    Nenhuma solicitação encontrada.
                  </TableCell>
                </TableRow>
              ) : (
                solicitacoes.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell className="whitespace-nowrap">
                      {new Date(s.criado_em).toLocaleDateString('pt-BR')}
                    </TableCell>
                    <TableCell>{s.usuario?.nome || 'Usuário Desconhecido'}</TableCell>
                    <TableCell>
                      <p className="font-medium">{s.nome_item}</p>
                      <div className="text-xs text-muted-foreground mt-1 flex flex-wrap gap-2">
                        {s.modelo && <span>Mod: {s.modelo}</span>}
                        {s.cor && <span>Cor: {s.cor}</span>}
                        {s.tamanho && <span>Tam: {s.tamanho}</span>}
                      </div>
                      {s.motivo && (
                        <p className="text-xs text-muted-foreground mt-1 italic">"{s.motivo}"</p>
                      )}
                      {s.link && (
                        <a
                          href={s.link}
                          target="_blank"
                          rel="noreferrer"
                          className="text-xs text-primary hover:underline flex items-center mt-1"
                        >
                          <ExternalLink className="h-3 w-3 mr-1" />
                          Acessar Link
                        </a>
                      )}
                    </TableCell>
                    <TableCell className="whitespace-nowrap">
                      {s.quantidade} {s.unidade}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          s.urgencia === 'Alta' ||
                          s.urgencia === 'Urgente' ||
                          s.urgencia === 'Crítica'
                            ? 'destructive'
                            : 'secondary'
                        }
                      >
                        {s.urgencia}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          s.status === 'Pendente'
                            ? 'outline'
                            : s.status === 'Aprovado'
                              ? 'default'
                              : s.status === 'Comprado'
                                ? 'secondary'
                                : 'destructive'
                        }
                      >
                        {s.status === 'Pendente' && <Clock className="w-3 h-3 mr-1" />}
                        {s.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right whitespace-nowrap">
                      {s.status === 'Pendente' && (
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleUpdateStatus(s.id, 'Rejeitado')}
                            title="Recusar"
                          >
                            <X className="h-4 w-4 text-destructive" />
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => handleUpdateStatus(s.id, 'Aprovado')}
                            title="Aprovar"
                          >
                            <Check className="h-4 w-4" />
                          </Button>
                        </div>
                      )}
                      {s.status === 'Aprovado' && (
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => handleUpdateStatus(s.id, 'Comprado')}
                        >
                          Marcar Comprado
                        </Button>
                      )}
                      {isAdmin && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(s.id)}
                          className="ml-2 text-red-500 hover:bg-red-50 h-8 w-8 inline-flex align-middle"
                          title="Apagar"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  )
}
