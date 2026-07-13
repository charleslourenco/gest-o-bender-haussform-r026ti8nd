import { useState, useEffect } from 'react'
import { Search, FolderOpen, Users, ChevronRight, UserPlus, Loader2 } from 'lucide-react'
import { supabase } from '@/lib/supabase/client'
import { useAuth } from '@/hooks/use-auth'
import { createNewClientFlow } from '@/services/cliente-form'
import { toast } from 'sonner'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { ClienteDeleteDialog } from './cliente-delete-dialog'

interface Cliente {
  id: string
  nome: string
  email: string
  telefone: string
}

interface Dossie {
  id: string
  cliente_id: string
  status: string
  criado_em: string
  cliente?: Cliente
}

interface ClientesListProps {
  onSelect: (dossieId: string) => void
}

export function ClientesList({ onSelect }: ClientesListProps) {
  const { user } = useAuth()
  const [dossies, setDossies] = useState<Dossie[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)

  const handleNewClient = async () => {
    setCreating(true)
    try {
      const dossieId = await createNewClientFlow(user?.id || '')
      toast.success('Cliente criado! Preencha o formulário comercial.')
      onSelect(dossieId)
    } catch (e: any) {
      toast.error('Erro ao criar cliente: ' + e.message)
    } finally {
      setCreating(false)
    }
  }

  useEffect(() => {
    fetchDossies()
  }, [])

  const fetchDossies = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('dossies')
      .select(`
        id,
        cliente_id,
        status,
        criado_em,
        cliente:clientes(id, nome, email, telefone)
      `)
      .order('criado_em', { ascending: false })

    if (data && !error) {
      setDossies(data as any[])
    }
    setLoading(false)
  }

  const filtered = dossies.filter((d) => {
    const term = searchTerm.toLowerCase()
    return (
      d.cliente?.nome?.toLowerCase().includes(term) ||
      d.cliente?.email?.toLowerCase().includes(term) ||
      d.cliente?.telefone?.toLowerCase().includes(term)
    )
  })

  return (
    <div className="flex flex-col h-full bg-background/50">
      <div className="bg-card border border-border rounded-xl m-6 p-6 flex flex-col md:flex-row items-start md:items-center gap-4 text-card-foreground shadow-sm shrink-0">
        <div className="bg-primary/20 p-3 rounded-lg">
          <Users className="w-6 h-6 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Clientes</h1>
          <p className="text-muted-foreground">Gerencie o histórico e dossiês dos clientes</p>
        </div>
      </div>

      <div className="px-6 pb-6 flex-1 flex flex-col gap-6 min-h-0">
        <div className="flex items-center justify-between gap-4 shrink-0">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Buscar cliente por nome, email ou telefone..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 bg-background border-border"
            />
          </div>
          <Button onClick={handleNewClient} disabled={creating} className="shrink-0">
            {creating ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <UserPlus className="w-4 h-4 mr-2" />
            )}
            Novo Cliente
          </Button>
        </div>

        <div className="flex-1 overflow-auto bg-card rounded-xl border border-border shadow-sm">
          <Table>
            <TableHeader className="bg-muted/50 sticky top-0 z-10 shadow-sm border-b border-border">
              <TableRow>
                <TableHead>Cliente</TableHead>
                <TableHead>Contato</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Data de Criação</TableHead>
                <TableHead className="w-[100px] text-right">Ação</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-32 text-center text-muted-foreground">
                    Carregando dossiês...
                  </TableCell>
                </TableRow>
              ) : filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-40 text-center">
                    <div className="flex flex-col items-center justify-center text-muted-foreground">
                      <FolderOpen className="w-8 h-8 mb-2 opacity-20" />
                      <p>Nenhum cliente ou dossiê encontrado.</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((dossie) => (
                  <TableRow
                    key={dossie.id}
                    className="cursor-pointer hover:bg-muted/50 transition-colors group"
                    onClick={() => onSelect(dossie.id)}
                  >
                    <TableCell className="font-medium group-hover:text-primary transition-colors">
                      {dossie.cliente?.nome || 'Sem nome'}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="text-sm text-foreground">
                          {dossie.cliente?.email || '-'}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {dossie.cliente?.telefone || '-'}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-secondary text-secondary-foreground capitalize">
                        {dossie.status.replace(/_/g, ' ')}
                      </span>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {format(new Date(dossie.criado_em), "dd 'de' MMM, yyyy", { locale: ptBR })}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <ClienteDeleteDialog
                          clienteId={dossie.cliente_id}
                          clienteNome={dossie.cliente?.nome}
                          onDeleted={() => {
                            toast.success('Cliente excluído com sucesso.')
                            fetchDossies()
                          }}
                          triggerClassName="inline-flex items-center justify-center h-8 w-8 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                        />
                        <Button
                          variant="ghost"
                          size="icon"
                          className="group-hover:text-primary group-hover:bg-primary/10"
                          onClick={(e) => {
                            e.stopPropagation()
                            onSelect(dossie.id)
                          }}
                        >
                          <ChevronRight className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  )
}
